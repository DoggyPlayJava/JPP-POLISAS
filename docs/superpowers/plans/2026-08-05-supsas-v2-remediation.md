# SUPSAS 2.0 Full Remediation & Feature Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 21 database, security, and UI/UX vulnerabilities identified in the audit, while introducing support for set-based sports, group stage tie-breakers, auto-advancing knockout brackets, and outdoor field ergonomics.

**Architecture:** Database updates handled via a new migration (`20260805_supsas_v2_remediation.sql`) with security-definer RPCs, atomic updates, and strict JSON validation. Frontend state updated via `useRef`-backed debounced updates, `Date.now()` precise timing, and offline-first fallback.

**Tech Stack:** React, TypeScript, TailwindCSS, Supabase (PostgreSQL, Realtime, RLS), Framer Motion, Lucide Icons, React Hot Toast.

## Global Constraints

- RLS Policies: Always use `(SELECT auth.uid())` — never bare `auth.uid()`.
- One policy per operation per table.
- Every new table must have RLS enabled.
- Database FK columns must have corresponding indexes.
- Async queries: ALWAYS use `Promise.all([...])` for multiple fetches.
- Do NOT edit existing migration files in `supabase/migrations/`.

---

## Component Map & File Structure

```
supabase/migrations/
  └── 20260805_supsas_v2_remediation.sql           [NEW] Migration fixing winner_team_id, 6-digit PIN, RPC security, tie-breaker view

src/
  ├── types/
  │   └── index.ts                                 [MODIFY] Add SetScore, ScoreType, AuditLog interfaces
  ├── contexts/
  │   └── SupsasContext.tsx                        [MODIFY] Update Fixture interfaces & realtime channel management
  ├── lib/
  │   └── dateUtils.ts                             [NEW] Standardized MYT (UTC+8) date/time helpers
  └── pages/supsas/
      ├── SupsasScorekeeperPage.tsx                [MODIFY] Scorekeeper UI (touch targets, sun-glare, offline, player dropdown, timer fix)
      ├── SupsasSchedulePage.tsx                   [MODIFY] Live-ticking timer, null elapsed handling, MYT timezone fix
      ├── SupsasScoreboardPage.tsx                 [MODIFY] Tie-breaker order display, total_points consistency
      └── admin/
          ├── AdminFixturesPage.tsx                [MODIFY] Bulk PIN WhatsApp share, printable match sheets
          ├── AdminTetapanPage.tsx                 [MODIFY] Form input validations, cleanup unused imports
          └── components/
              └── AdminMatchScoreModal.tsx          [MODIFY] Fix score type coercion, winner determination logic
```

---

### Task 1: Database & RPC Security Remediation (Blockers & Security)

**Files:**
- Create: `supabase/migrations/20260805_supsas_v2_remediation.sql`

**Interfaces:**
- Produces: `update_supsas_fixture_via_pin(p_fixture_id, p_pin, ...)` RPC function with atomic update & `SET search_path = public`.

- [ ] **Step 1: Write SQL migration file to add missing columns, index, and 6-digit alphanumeric PIN generator**

```sql
-- 1. Add missing columns and index
ALTER TABLE supsas_fixtures 
ADD COLUMN IF NOT EXISTS winner_team_id UUID REFERENCES supsas_teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS score_type VARCHAR(20) DEFAULT 'points', -- 'points' | 'sets' | 'time'
ADD COLUMN IF NOT EXISTS sets_detail JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_supsas_fixtures_referee_pin ON supsas_fixtures(referee_pin);

-- 2. Upgrade PIN generator to 6-digit Alphanumeric (e.g., A8F92K)
CREATE OR REPLACE FUNCTION generate_supsas_referee_pin()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result TEXT := '';
  i INT;
BEGIN
  IF NEW.referee_pin IS NULL OR NEW.referee_pin = '' THEN
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    NEW.referee_pin := result;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Rewrite RPC with SECURITY DEFINER + SET search_path = public + Atomic UPDATE
CREATE OR REPLACE FUNCTION update_supsas_fixture_via_pin(
  p_fixture_id UUID,
  p_pin TEXT,
  p_score_a TEXT DEFAULT NULL,
  p_score_b TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_elapsed_seconds INT DEFAULT NULL,
  p_timer_status TEXT DEFAULT NULL,
  p_events JSONB DEFAULT NULL,
  p_winner_id UUID DEFAULT NULL,
  p_winner_team_id UUID DEFAULT NULL,
  p_sets_detail JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_updated INT;
  v_next_match_id UUID;
  v_round TEXT;
BEGIN
  -- Perform atomic update verifying fixture ID + PIN in single query (prevents TOCTOU)
  UPDATE supsas_fixtures
  SET
    score_a = COALESCE(p_score_a, score_a),
    score_b = COALESCE(p_score_b, score_b),
    status = COALESCE(p_status, status),
    elapsed_seconds = COALESCE(p_elapsed_seconds, elapsed_seconds),
    timer_status = COALESCE(p_timer_status, timer_status),
    timeline_events = CASE 
      WHEN p_events IS NOT NULL AND jsonb_typeof(p_events) = 'array' THEN p_events 
      ELSE timeline_events 
    END,
    sets_detail = COALESCE(p_sets_detail, sets_detail),
    winner_id = CASE WHEN p_status = 'completed' THEN p_winner_id ELSE winner_id END,
    winner_team_id = CASE WHEN p_status = 'completed' THEN p_winner_team_id ELSE winner_team_id END,
    updated_at = NOW()
  WHERE id = p_fixture_id AND referee_pin = p_pin;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kod PIN tidak sah atau perlawanan tidak wujud!');
  END IF;

  -- Auto-advance winner to next match if completed
  IF p_status = 'completed' THEN
    SELECT next_match_id, round INTO v_next_match_id, v_round FROM supsas_fixtures WHERE id = p_fixture_id;
    IF v_next_match_id IS NOT NULL AND p_winner_id IS NOT NULL THEN
      UPDATE supsas_fixtures
      SET kontingen_a_id = CASE WHEN kontingen_a_id IS NULL THEN p_winner_id ELSE kontingen_a_id END,
          kontingen_b_id = CASE WHEN kontingen_a_id IS NOT NULL AND kontingen_b_id IS NULL THEN p_winner_id ELSE kontingen_b_id END
      WHERE id = v_next_match_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

- [ ] **Step 2: Apply migration to Supabase local database**

Run: `npx supabase db push` or execute migration script against the target Postgres instance.

---

### Task 2: Refactoring Scorekeeper Page State & Race Condition Fixes

**Files:**
- Modify: `src/pages/supsas/SupsasScorekeeperPage.tsx`

**Interfaces:**
- Consumes: `update_supsas_fixture_via_pin` RPC

- [ ] **Step 1: Replace raw `setTimeout` sync with `useRef` score state tracker**

Use `useRef` to hold the latest `scoreA`, `scoreB`, `events`, and `elapsedSeconds` so background sync operations never read stale React state closures.

```tsx
const scoreARef = useRef(0);
const scoreBRef = useRef(0);
const eventsRef = useRef<MatchEvent[]>([]);

const modifyScore = (team: 'A' | 'B', delta: number) => {
  if (team === 'A') {
    const next = Math.max(0, scoreARef.current + delta);
    scoreARef.current = next;
    setScoreA(next);
  } else {
    const next = Math.max(0, scoreBRef.current + delta);
    scoreBRef.current = next;
    setScoreB(next);
  }
  debouncedSync();
};
```

- [ ] **Step 2: Fix `p_events` parameter passing (remove `JSON.stringify`)**

```tsx
// Pass raw Javascript object/array — Supabase client serializes JSONB automatically
p_events: eventsRef.current,
```

- [ ] **Step 3: Fix Timer Drift using Timestamp Delta**

```tsx
const startTimeRef = useRef<number | null>(null);

useEffect(() => {
  let interval: NodeJS.Timeout | null = null;
  if (isTimerRunning) {
    startTimeRef.current = Date.now() - elapsedSeconds * 1000;
    interval = setInterval(() => {
      if (startTimeRef.current) {
        const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(seconds);
      }
    }, 1000);
  }
  return () => { if (interval) clearInterval(interval); };
}, [isTimerRunning]);
```

- [ ] **Step 4: Clear Session on Match Completion & Unmount**

```tsx
const handleFinishMatch = async () => {
  if (!confirm('Adakah anda pasti untuk TAMATKAN perlawanan ini?')) return;
  setIsTimerRunning(false);
  await syncToDatabase('completed');
  localStorage.removeItem('supsas_referee_pin');
  localStorage.removeItem('supsas_fixture_id');
  setFixture(null);
  toast.success('Perlawanan telah ditamatkan secara rasmi!');
};
```

---

### Task 3: Scorekeeper Mobile Field Ergonomics & Outdoor Mode

**Files:**
- Modify: `src/pages/supsas/SupsasScorekeeperPage.tsx`

- [ ] **Step 1: Enlarge Touch Target Buttons to 44px+ minimum**

Update score buttons from `py-1.5` (~22px) to `py-3 sm:py-4` (~48px) to satisfy Apple HIG & Android touch accessibility guidelines.

- [ ] **Step 2: Add High-Contrast Outdoor Sun-Glare Mode Toggle**

Add state `isSunGlareMode` to switch background from dark `#060D17` to ultra-high-contrast white/yellow for outdoor daytime refereeing.

```tsx
const [isSunGlareMode, setIsSunGlareMode] = useState(false);
// Container class toggle:
<div className={cn(
  "min-h-screen transition-colors duration-300 font-sans pb-12",
  isSunGlareMode ? "bg-white text-black font-bold" : "bg-[#060D17] text-white"
)}>
```

- [ ] **Step 3: Add Offline Connectivity Indicator**

```tsx
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

- [ ] **Step 4: Add Player Name Quick-Chips in Event Recorder Modal & 'foul' button**

Replace plain text input with quick-selection chips based on selected team roster, and add the missing 🤼 `foul` event button.

---

### Task 4: Multi-Sport Support (Sets Format) & Group Tie-Breakers

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/pages/supsas/SupsasScoreboardPage.tsx`
- Modify: `src/pages/supsas/admin/AdminTetapanPage.tsx`

- [ ] **Step 1: Add SetScore Interface and update SupsasFixture**

```typescript
export interface SetDetail {
  setNumber: number;
  scoreA: number;
  scoreB: number;
}
```

- [ ] **Step 2: Add Group Stage Tie-Breaker Logic to Medal Tally & Standings**

Update standings logic to sort tied points by:
1. Total Points / Total Wins
2. Head-to-Head result
3. Goal / Points Difference (Jaringan Bersih)

---

### Task 5: Verification & End-to-End Audit Check

**Files:**
- Test: All SUPSAS pages (`/supsas`, `/supsas/jadual`, `/supsas/scorekeeper`, `/supsas/admin`)

- [ ] **Step 1: Verify TypeScript compilation**

Run: `npm run build` or `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Manual Verification of Scorekeeper Flow**

1. Login via 6-digit PIN.
2. Verify touch targets are large (>44px).
3. Test High-Contrast Outdoor Mode toggle.
4. Add goal event with quick player chip selection.
5. Finish match -> verify localStorage cleared and PIN logged out.
6. Check auto-advancing bracket logic for Knockout matches.
