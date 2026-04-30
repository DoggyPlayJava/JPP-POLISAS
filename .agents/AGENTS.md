# JPP-POLISAS — AI Agent Instructions

> **YOU ARE AN AI AGENT WORKING ON JPP-POLISAS.**
> Read this file COMPLETELY before making any changes to this project.
> Then read `DEV_GUIDELINE.md` and `development.md` in the project root.

---

## 📋 Documentation Update Obligation

**After completing any task that involves the following, you MUST update `DEV_GUIDELINE.md`:**

| What you did | What to update |
|---|---|
| Added a new page/module | Add a new section with routes, tables, RBAC |
| Added a new database table | Add it to the relevant module's table list |
| Added a new Context or Hook | Update Section 2 (architecture) and Section 9 (contexts) |
| Changed how RLS policies work | Update Section 15 if a new pattern was used |
| Added a new route | Update the relevant module's route table |
| Added a new critical file | Add it to Section 11 (critical files) |

> **Do not skip this.** A guideline that is out of date is worse than no guideline — future agents will follow stale information and introduce bugs.

---
## ⚡ Quick Reference — Non-Negotiable Rules

These rules exist because this system handles **1,500 concurrent users** during Orientation Season. Breaking them risks database failure.

### 🔴 RLS Policies (Database)
- **ALWAYS** write `(SELECT auth.uid())` — NEVER bare `auth.uid()`
- **ONE policy per operation per table** — merge overlapping policies with OR, never create duplicates
- **Every new table** must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + at least one policy
- **Every FK column** must have a corresponding index

### 🔴 Frontend Queries
- **ALWAYS** use `Promise.all([...])` for multiple fetches — never sequential `await`
- **NEVER** put queries inside loops (N+1 anti-pattern)
- **Use `queryCache`** from `@/lib/cache` for data that doesn't change every second
- **Only select columns you need** — avoid `select('*')` on large tables

### 🔴 Realtime / WebSocket
- **NEVER** add `supabase.channel().on('postgres_changes', ...)` in Layout, Sidebar, or any global component
- If you add a Realtime subscription anywhere, it MUST have `return () => channel.unsubscribe()` cleanup

### 🔴 Migrations
- **NEVER edit existing migration files** in `supabase/migrations/`
- Always create a new migration with a descriptive name

---

## 📚 Full Documentation (Read These)

| File | What's In It |
|---|---|
| `DEV_GUIDELINE.md` | Full architecture, RBAC, storage, routing, coding conventions, database rules (Section 15) |
| `development.md` | AI-agent-specific rules: Zustand selectors, Playwright testing, database mandatory rules |
| `JPP_RBAC_SYSTEM.md` | Role hierarchy — WAJIB baca sebelum ubah apa-apa berkaitan auth/permissions |
| `ROUTES.md` | Route naming conventions — semak sebelum tambah route baru |

---

## 🏗️ Critical Files — Think Before Touching

| File | Why Critical |
|---|---|
| `src/contexts/AuthContext.tsx` | Entire RBAC system. Bug here = security hole for all users |
| `src/lib/supabase.ts` | Global singleton. Never create a new Supabase client instance |
| `src/lib/driveUpload.ts` | Hybrid storage routing. Wrong call = data saved to wrong platform |
| `src/types/index.ts` | ALL type contracts, role constants, club lists |
| `supabase/migrations/` | Database history. Never edit old files |

---

## 🛠️ Infrastructure Context

- **Self-hosted Supabase** on Coolify (not Supabase cloud)
- **Connection pooler:** Supavisor is active (port 6543 internally) — do NOT suggest raw pg connection changes
- **Max concurrent users:** Designed for 1,500 (Orientation Season load)
- **4-core container, 8GB RAM** — be mindful of memory in any server-side suggestions
- **Email:** Handled via Resend API through Express server (`server.js`) — not SMTP

---

*Last updated: April 2026 — Post Orientation Season Performance Audit*
