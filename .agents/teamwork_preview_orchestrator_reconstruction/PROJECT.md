# Project: JPP-POLISAS Database Schema Reconstruction

## Architecture
The application is built on top of Supabase and React/Vite. The backend relies on PostgreSQL database structures, custom PL/pgSQL functions (RPCs), triggers, custom types, and Supabase Storage buckets, protected by Row-Level Security (RLS) policies and a custom Role-Based Access Control (RBAC) role hierarchy. The frontend interacts directly with Supabase via queries and mutations.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Parse 124 migrations in `supabase/migrations/` and scan `src/` for frontend queries to identify tables, columns, RPCs, buckets, RBAC, and check for schema mismatches. | None | DONE |
| 2 | Consolidated SQL & Blueprint Generation | Draft `final_schema.sql` incorporating all tables, enums, custom functions, triggers, storage buckets, optimized RLS policies using `(SELECT auth.uid())`, and indexes on all foreign key columns. Draft `DATABASE_BLUEPRINT.md`. | M1 | IN_PROGRESS |
| 3 | Verification & Review | Audit the generated `final_schema.sql` for Postgres compatibility, verify index and policy constraints, and run checks via review agents. | M2 | PLANNED |

## Interface Contracts
### Database ↔ Frontend API
- Data access is handled through the Supabase JS client.
- All RLS policies must evaluate based on authenticated session credentials using `(SELECT auth.uid())`.
- Storage uploads must route via DriveUpload or designated buckets, validated against bucket policies.
- RBAC permissions dictate page and operation access as defined in `JPP_RBAC_SYSTEM.md`.
