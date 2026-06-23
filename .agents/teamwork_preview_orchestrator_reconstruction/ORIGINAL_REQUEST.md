# Original User Request

## 2026-06-17T19:49:38Z

The project is to reverse-engineer the existing codebase (including 124 migration files in `supabase/migrations/` and frontend queries in `src/`) to reconstruct a consolidated, optimized, and ready-to-restore database schema. The target outputs are a comprehensive Markdown database blueprint and a single, ready-to-run PostgreSQL SQL file (`final_schema.sql`) to completely rebuild the database structure, RLS policies, RBAC roles, RPC functions, triggers, and storage buckets.

Working directory: c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main
Integrity mode: development

## Requirements

### R1. Analyze migrations and frontend code
- Parse all 124 migration files in `supabase/migrations/` to reconstruct the final state of all tables, columns, data types, constraints, functions, triggers, and custom types.
- Cross-reference with frontend files under `src/` to verify that all queries and mutations align with the reconstructed database schema. Identify and report any mismatches or fields used in the frontend but missing from the migrations.

### R2. Consolidate RLS, RBAC, and Buckets
- Reconstruct the complete list of Row-Level Security (RLS) policies for all tables.
- Document and consolidate the Role-Based Access Control (RBAC) role hierarchy (global roles like `SUPER_ADMIN_JPP`, `JPP` and club-specific roles like `CLUB_PRESIDENT`, `CLUB_MT`, `CLUB_MEMBER`, `CLUB_ADVISOR`).
- Document all Supabase storage buckets and their corresponding security/access policies.

### R3. Performance Optimization & Rule Compliance
- Audit the schema and apply database optimizations to handle up to 1,500 concurrent users.
- Add indexes to every single foreign key column (as required by project rules).
- Optimize RLS policies to prevent slow queries or timeouts.
- Ensure all RLS policies follow the project rule: use `(SELECT auth.uid())` instead of bare `auth.uid()`.
- Ensure there is at most one policy per operation (INSERT/SELECT/UPDATE/DELETE) per table, merging overlapping policies using `OR`.

### R4. Reconstructed Deliverables
- Generate a comprehensive markdown blueprint detailing the database architecture.
- Generate a single, consolidated, optimized, and clean SQL file (`final_schema.sql`) containing all DDL statements (tables, types, indexes, functions, triggers, RLS policies, and bucket configurations) to rebuild the entire database from scratch.

## Acceptance Criteria

### Consolidated SQL Schema (`final_schema.sql`)
- [ ] Must execute cleanly on a blank PostgreSQL/Supabase database without DDL syntax errors or missing reference/constraint issues.
- [ ] Must create all tables, fields, enums, and foreign keys.
- [ ] Must enable Row-Level Security (RLS) on every table and define policies.
- [ ] Must define indexes for every foreign key column.
- [ ] Must use the `(SELECT auth.uid())` pattern for auth checks in all RLS policies.
- [ ] Must implement all custom database functions (RPCs) and triggers found in migrations.
- [ ] Must create the required Supabase storage buckets and insert/declare their security policies.

### Database Blueprint Document
- [ ] Must be a clean markdown file summarizing all tables, fields, relationships, and RLS rules.
- [ ] Must detail the RBAC system, roles, and how they map to permissions.
- [ ] Must detail the storage buckets and their access rules.
- [ ] Must explain any database optimizations applied (such as indexes and RLS optimizations).
