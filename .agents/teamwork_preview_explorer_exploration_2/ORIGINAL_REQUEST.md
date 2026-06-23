## 2026-06-17T11:50:12Z

Analyze migration files in `supabase/migrations/` starting from `26_pembubaran_kohort.sql` to the end of the folder (including files with timestamp prefixes like `2026...`).
Specifically identify:
1. Every table defined, modified, or altered, its columns, data types, primary keys, foreign keys, and default values.
2. Custom enums, custom types, or domains created or modified.
3. All custom PostgreSQL functions (RPCs) and triggers created or altered.
4. All storage buckets created and their related access policies.
5. All Row-Level Security (RLS) policies defined or altered.
Write your detailed findings and structural DDL components to your handoff report in `.agents/teamwork_preview_explorer_exploration_2/handoff.md`.
