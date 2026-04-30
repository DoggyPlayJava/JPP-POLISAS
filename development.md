# JPP-POLISAS System Architecture & Development Guidelines

Welcome to the JPP-POLISAS project! This document tells AI agents and human developers about the core technical architectural decisions made to keep this system blazing fast and reliable.

> **For AI Agents:** Read ALL sections before making any changes. The rules here are non-negotiable and exist to prevent database failures during peak load (1,500 concurrent users during Orientation Season).

---

## 1. Global State Management (Zustand)

We have migrated heavy, universally-used states (like Notifications) away from standard React `Context API` to **Zustand**. This completely eliminates unnecessary deep component tree re-renders.

**How to use Zustand properly here:**
- The store is defined in `src/store/useNotificationStore.ts`.
- `NotificationContext.tsx` is now just a **headless component**. It lives in `App.tsx` solely to subscribe to Supabase Realtime and push payload data into the Zustand store. It no longer wraps Context Providers.
- **CRITICAL OBLIGATION FOR AI AGENTS:** When reading from Zustand, you MUST use atomic selectors to preserve performance. 
  - ❌ **DO NOT DO THIS:** `const { unreadCount } = useNotificationStore();` (This subscribes the component to ALL state changes).
  - ✅ **DO THIS:** `const unreadCount = useNotificationStore(state => state.unreadCount);` (This subscribes only to `unreadCount`, ensuring the component only re-renders when this specific primitive changes).

---

## 2. End-to-End (E2E) Testing (Playwright)

We use **Playwright**—not Cypress—to conduct end-to-end testing as it natively supports modern Vite projects and executes extraordinarily fast.

**How to use Playwright here:**
- The configuration is at `/playwright.config.ts`. It is configured to automatically launch the vite dev server (`npm run dev`) at `localhost:3000` when running tests.
- All test scripts are located inside the `/e2e/` folder.
- **CRITICAL OBLIGATION FOR AI AGENTS:** Before suggesting a massive UI or routing refactor is "safe", you are encouraged to write a playwright spec and execute it via the terminal.
  - Run the tests using: `npm run test:e2e`
  - Playwright is fully configured for headless CI execution environment.

---

## 3. Data Integrity & Types

- Supabase Database types are auto-generated.
- Avoid using `any` or `Record<string, unknown>`. Always import the canonical typescript interfaces from `src/types/database.types.ts` when making Supabase queries.

---

## 4. Database-Friendly Development — MANDATORY RULES FOR AI AGENTS

> These rules were established after an April 2026 performance audit for Orientation Season (1,500 concurrent users). **Breaking any of these rules risks database instability at scale.**

### 4.1 RLS Policy Rules

#### RULE: Always use `(SELECT auth.uid())` — NEVER bare `auth.uid()`

```sql
-- ❌ FORBIDDEN — PostgreSQL re-evaluates auth.uid() for EVERY ROW scanned
CREATE POLICY "bad" ON public.my_table FOR SELECT USING (user_id = auth.uid());

-- ✅ REQUIRED — PostgreSQL evaluates auth.uid() ONCE per query (init-plan optimization)
CREATE POLICY "good" ON public.my_table FOR SELECT USING (user_id = (SELECT auth.uid()));
```

This applies to ALL auth functions: `auth.uid()`, `auth.role()`, `auth.jwt()`.

#### RULE: One policy per operation per table — NO duplicates

PostgreSQL evaluates ALL permissive policies and ORs them together. Two policies for the same operation = 2x the work per query. Always merge into one using OR:

```sql
-- ❌ FORBIDDEN — two UPDATE policies on same table
CREATE POLICY "update_own" ON profiles FOR UPDATE USING (id = (SELECT auth.uid()));
CREATE POLICY "admin_update" ON profiles FOR UPDATE USING (is_admin((SELECT auth.uid())));

-- ✅ REQUIRED — one merged policy
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING ((id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())))
  WITH CHECK ((id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));
```

#### RULE: Every new table MUST have RLS enabled + at least one policy

```sql
ALTER TABLE public.my_new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "my_new_table_select" ON public.my_new_table
  FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE INDEX idx_my_new_table_user_id ON public.my_new_table(user_id); -- FK index required
```

### 4.2 Frontend Query Rules

#### RULE: Always fetch in parallel with `Promise.all` — never sequential awaits

```typescript
// ❌ FORBIDDEN — waterfall/sequential (wastes connections, slow)
const a = await supabase.from('profiles').select('*').single();
const b = await supabase.from('memberships').select('*');

// ✅ REQUIRED — parallel fetch
const [a, b] = await Promise.all([
  supabase.from('profiles').select('*').single(),
  supabase.from('memberships').select('*'),
]);
```

#### RULE: No N+1 queries

```typescript
// ❌ FORBIDDEN — query inside a loop
for (const club of clubs) {
  const members = await supabase.from('memberships').select('*').eq('club_id', club.id);
}

// ✅ REQUIRED — batch with .in()
const members = await supabase.from('memberships').select('*').in('club_id', clubs.map(c => c.id));
```

#### RULE: Cache semi-static data with QueryCache

```typescript
import { queryCache } from '@/lib/cache';

// TTL guide:
// portal_settings:      10 min  (rarely changes)
// clubs/exco list:      30 min  (static reference data)
// dashboard stats:      2-3 min (semi-static)
// notifications:        DO NOT cache (must be fresh)
// user profile:         1 min

const cached = queryCache.get(`key_${userId}`);
if (cached) return cached;
const data = await fetchData();
queryCache.set(`key_${userId}`, data, 2 * 60 * 1000);
```

#### RULE: Only select columns you need

```typescript
// ❌ FORBIDDEN on large tables
supabase.from('profiles').select('*')

// ✅ REQUIRED
supabase.from('profiles').select('id, full_name, email, role, club_id')
```

### 4.3 Realtime / WebSocket Rules

#### RULE: No Realtime subscriptions in global/layout components

Each Realtime subscription holds a persistent WebSocket connection. With 1,500 users, that's 1,500 open sockets consuming server resources.

- **FORBIDDEN:** `supabase.channel().on('postgres_changes', ...)` in Layout, Sidebar, or any provider that wraps the whole app
- **REQUIRED pattern:** Use `visibilitychange` polling instead (see `NotificationContext.tsx` for the established pattern)

**Allowed exception:** Realtime subscriptions are allowed ONLY for dedicated real-time features (e.g., live chat, live voting) and MUST be cleaned up on unmount:
```typescript
return () => channel.unsubscribe(); // MANDATORY cleanup
```

### 4.4 Migration Rules

- **NEVER edit existing migration files** — always create a new migration
- **Always use descriptive names:** `add_orientation_table` not `fix` or `update`
- **Check for advisor warnings** after any DDL change: run the Supabase performance advisor

### 4.5 Notification INSERT Rules

The `notifications` table RLS policy allows:

| Who | Can insert for |
|---|---|
| Any `authenticated` user | **Themselves only** (`user_id = auth.uid()`) |
| `JPP`, `SUPER_ADMIN_JPP`, `CLUB_PRESIDENT`, `CLUB_MT` | Other users |
| Any `authenticated` user | Role-broadcast (`user_id = NULL`, `target_role` set) |

Student-level code must NEVER insert a notification with `user_id` set to another user's ID — it will be blocked by RLS and cause a silent failure.

### 4.6 Pre-Deploy Checklist

Before deploying any new feature:

```
Database:
  [ ] All RLS policies use (SELECT auth.uid()), not bare auth.uid()
  [ ] No duplicate/overlapping permissive policies for same operation on same table
  [ ] Every FK column has an index
  [ ] Every new table has RLS enabled with at least one policy
  [ ] Migration file has a descriptive name

Frontend Queries:
  [ ] Parallel fetches use Promise.all
  [ ] No N+1 query patterns (no queries inside loops)
  [ ] select() specifies only needed columns
  [ ] Semi-static data is cached with appropriate TTL

Realtime:
  [ ] No new Realtime subscriptions in global/layout components
  [ ] All subscriptions have cleanup (return () => channel.unsubscribe())

Notifications:
  [ ] Student-level code only inserts notifications for auth.uid() (self)
  [ ] Cross-user notifications only in JPP/admin components
```
