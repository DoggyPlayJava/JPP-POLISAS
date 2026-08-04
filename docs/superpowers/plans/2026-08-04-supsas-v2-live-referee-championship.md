# SUPSAS 2.0 — Live Referee Scorekeeper, Overall Championship Points & Matchmaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end upgrade for SUP/SAS including PIN-based Mobile Referee Scorekeeper UI via RPC, configurable Overall Championship points system via DB View, Live Match Event Ticker/Timer, and Contingent Sport Participation Management.

**Architecture:** 
1. Database Schema updates on `supsas_fixtures` (add `referee_pin`, `timeline_events`, `elapsed_seconds`, `timer_status`) and `supsas_editions` (add `gold_points`, `silver_points`, `bronze_points`).
2. Security Definer RPC `update_supsas_fixture_via_pin(...)` allowing external match referees to update score/events safely using 4-digit match PINs without bypassing RLS.
3. Dedicated Mobile Referee Route (`/supsas/scorekeeper`) with PIN authentication gate.
4. Updated DB View `supsas_medal_tally` for server-side dynamic point calculation.
5. Enhanced Realtime Broadcast & Scoreboard components for Live match timing, event ticker, and configurable Johan Keseluruhan standings.

**Tech Stack:** React, TypeScript, Supabase Realtime (Postgres Changes + Broadcast), Lucide React, Framer Motion, Tailwind CSS.

---

## Global Constraints

- RLS Policies: Must use `(SELECT auth.uid())` pattern for database mutations where required.
- Realtime subscriptions must include proper `unsubscribe()` cleanup in `useEffect`.
- Promise.all() for concurrent data fetching.
- Mobile-first responsive UI for `/supsas/scorekeeper`.

---

### Task 1: Database Migration for Referee PIN, Timeline Events & Championship Points

**Files:**
- Create: `supabase/migrations/20260804_supsas_v2_updates.sql`
- Modify: `src/contexts/SupsasContext.tsx`

- [ ] **Step 1: Create SQL migration for SUP/SAS v2 enhancements**

```sql
-- Migration: Add referee PIN, live match timer/events, and medal points
ALTER TABLE supsas_fixtures 
ADD COLUMN IF NOT EXISTS referee_pin VARCHAR(6),
ADD COLUMN IF NOT EXISTS timeline_events JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS elapsed_seconds INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS timer_status VARCHAR(20) DEFAULT 'stopped';

ALTER TABLE supsas_editions
ADD COLUMN IF NOT EXISTS gold_points INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS silver_points INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS bronze_points INT DEFAULT 1;

-- Function to auto-generate 4-digit PIN for new fixtures if null
CREATE OR REPLACE FUNCTION generate_supsas_referee_pin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referee_pin IS NULL THEN
    NEW.referee_pin := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_supsas_referee_pin ON supsas_fixtures;
CREATE TRIGGER trg_generate_supsas_referee_pin
BEFORE INSERT ON supsas_fixtures
FOR EACH ROW EXECUTE FUNCTION generate_supsas_referee_pin();

-- Update Medal Tally View to include total_points
CREATE OR REPLACE VIEW supsas_medal_tally AS
SELECT
  k.id             AS kontingen_id,
  k.edition_id,
  k.name,
  k.short_code,
  k.color,
  k.logo_url,
  COUNT(*) FILTER (WHERE r.medal = 'gold')   AS gold,
  COUNT(*) FILTER (WHERE r.medal = 'silver') AS silver,
  COUNT(*) FILTER (WHERE r.medal = 'bronze') AS bronze,
  COUNT(*) FILTER (WHERE r.medal IS NOT NULL) AS total_medals,
  (
    (COUNT(*) FILTER (WHERE r.medal = 'gold') * COALESCE(e.gold_points, 5)) +
    (COUNT(*) FILTER (WHERE r.medal = 'silver') * COALESCE(e.silver_points, 3)) +
    (COUNT(*) FILTER (WHERE r.medal = 'bronze') * COALESCE(e.bronze_points, 1))
  ) AS total_points
FROM supsas_kontingen k
JOIN supsas_editions e ON e.id = k.edition_id
LEFT JOIN supsas_results r ON r.kontingen_id = k.id AND r.edition_id = k.edition_id
GROUP BY k.id, k.edition_id, k.name, k.short_code, k.color, k.logo_url, e.gold_points, e.silver_points, e.bronze_points
ORDER BY gold DESC, total_points DESC, silver DESC, bronze DESC;

-- RPC for secure referee PIN update
CREATE OR REPLACE FUNCTION update_supsas_fixture_via_pin(
  p_fixture_id UUID,
  p_pin TEXT,
  p_score_a TEXT,
  p_score_b TEXT,
  p_status TEXT,
  p_elapsed_seconds INT DEFAULT NULL,
  p_events JSONB DEFAULT NULL,
  p_winner_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM supsas_fixtures
  WHERE id = p_fixture_id AND referee_pin = p_pin;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kod PIN tidak sah!');
  END IF;

  UPDATE supsas_fixtures
  SET
    score_a = COALESCE(p_score_a, score_a),
    score_b = COALESCE(p_score_b, score_b),
    status = COALESCE(p_status, status),
    elapsed_seconds = COALESCE(p_elapsed_seconds, elapsed_seconds),
    timeline_events = COALESCE(p_events, timeline_events),
    winner_id = CASE WHEN p_status = 'completed' THEN p_winner_id ELSE winner_id END,
    updated_at = NOW()
  WHERE id = p_fixture_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Task 2: Mobile Referee Scorekeeper Portal (`/supsas/scorekeeper`)

**Files:**
- Create: `src/pages/supsas/SupsasScorekeeperPage.tsx`
- Modify: `src/App.tsx` (Add `/supsas/scorekeeper` route)

- [ ] **Step 1: Build PIN Verification Gate Screen**
- [ ] **Step 2: Build Touch-Optimized Mobile Scorekeeper Control Panel with RPC integration**
- [ ] **Step 3: Add Route in `App.tsx`**

---

### Task 3: Configurable Championship Points & Overall Standings

**Files:**
- Modify: `src/contexts/SupsasContext.tsx`
- Modify: `src/pages/supsas/SupsasScoreboardPage.tsx`
- Modify: `src/pages/supsas/admin/AdminTetapanPage.tsx`

- [ ] **Step 1: Update Admin Settings UI (`AdminTetapanPage.tsx`)**
- [ ] **Step 2: Update Medal Tally calculation in `SupsasContext.tsx` & `SupsasScoreboardPage.tsx`**

---

### Task 4: Realtime Live Event Ticker & Match Timer on Scoreboard

**Files:**
- Modify: `src/pages/supsas/SupsasSchedulePage.tsx`
- Modify: `src/pages/supsas/SupsasScoreboardPage.tsx`
- Modify: `src/pages/supsas/admin/components/AdminMatchScoreModal.tsx`

- [ ] **Step 1: Add Referee PIN indicator in `AdminJadualPage.tsx` & `AdminMatchScoreModal.tsx`**
- [ ] **Step 2: Add Expandable Live Event Feed Drawer in `SupsasSchedulePage.tsx`**

---

## Verification Plan

### Automated Build Verification
- Execute `npm run build` to verify clean TypeScript compilation.

### Manual Verification
- Test PIN entry on `/supsas/scorekeeper` with RPC execution.
- Test score increment, live timer, and event logging.
- Verify real-time sync between scorekeeper updates and `/supsas/scoreboard`.
