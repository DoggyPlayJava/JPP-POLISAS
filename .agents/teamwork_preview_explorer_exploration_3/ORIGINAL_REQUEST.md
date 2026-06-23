## 2026-06-17T11:50:12Z
Scan the frontend codebase under `src/` to identify all Supabase client queries, mutations, and RPC calls.
Specifically:
1. Identify all Supabase client queries, mutations, and invocations (e.g., `supabase.from('...')`, `.select('...')`, `.insert('...')`, `.rpc('...')`, etc.).
2. Map out the expected tables, columns, and RPC functions invoked by the frontend.
3. Identify all RBAC roles, permission hierarchies, and storage buckets referenced in the frontend code.
Write your detailed findings to your handoff report in `.agents/teamwork_preview_explorer_exploration_3/handoff.md`.
