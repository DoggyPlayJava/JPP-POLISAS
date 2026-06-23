# BRIEFING — 2026-06-17T11:53:23Z

## Mission
Scan the frontend codebase under `src/` to identify all Supabase client queries, mutations, RPC calls, tables/columns, roles, hierarchies, and storage buckets.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Teamwork explorer, Read-only investigator
- Working directory: c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_3
- Original parent: d9ddbf70-14ed-4f76-8cb1-14104a7ff90f
- Milestone: exploration_3

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze problems, synthesize findings, produce structured reports
- Follow JPP-POLISAS project rules (AGENTS.md, DEV_GUIDELINE.md, JPP_RBAC_SYSTEM.md, ROUTES.md)

## Current Parent
- Conversation ID: d9ddbf70-14ed-4f76-8cb1-14104a7ff90f
- Updated: 2026-06-17T11:53:23Z

## Investigation State
- **Explored paths**:
  - `src/types/index.ts`
  - `src/lib/supabase.ts`
  - `src/contexts/AuthContext.tsx`
  - `src/contexts/SupsasContext.tsx`
  - `src/contexts/KarnivalContext.tsx`
  - `src/pages/jpp/`
  - `src/pages/akademik/`
  - `src/pages/karnival/`
  - `src/pages/kebajikan/`
  - `src/pages/keusahawanan/`
  - `src/pages/polymart/`
  - `src/pages/polyrent/`
  - `src/pages/polyrider/`
  - `src/pages/polyservices/`
  - `src/pages/polytask/`
  - `src/pages/supsas/`
- **Key findings**:
  - Found 11 storage buckets: `reports`, `avatars`, `club-logos`, `announcements`, `karnival-booths`, `kebajikan-images`, `keusahawanan-products`, `polymart-ads`, `polymart-receipts`, `polysuara_attachments`, and `keusahawanan`.
  - Found over 45 database tables accessed by the frontend via `supabase.from()`.
  - Identified 33 unique RPC functions invoked via `supabase.rpc()`.
  - Analyzed the multi-role RBAC hierarchy based on the primary and selected club contexts in `AuthContext.tsx`.
- **Unexplored areas**: None. The frontend codebase under `src/` has been scanned comprehensively.

## Key Decisions Made
- Performed target-specific ripgrep searches after the general `node` scanning script timed out on user permission. This succeeded in locating all queries, mutations, tables, and RPCs.

## Artifact Index
- `.agents/teamwork_preview_explorer_exploration_3/handoff.md` — Final structured analysis report
