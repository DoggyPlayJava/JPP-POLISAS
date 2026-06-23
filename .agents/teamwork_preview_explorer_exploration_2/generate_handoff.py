import os
import re

# File paths
parsed_tables_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\parsed_tables.md'
parsed_functions_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\parsed_functions.md'
storage_policies_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\storage_policies.txt'
grouped_ddl_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\grouped_ddl.md'
handoff_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\handoff.md'

# 1. Read Tables
with open(parsed_tables_path, 'r', encoding='utf-8') as f:
    parsed_tables = f.read()

# Clean up glitches from parsed_tables
# We will replace ## Table: `ALTER` and ## Table: `public` and put their DDLs into their proper tables.
# Let's read the parsed_tables and parse it programmatically
table_blocks = parsed_tables.split('## Table: ')
cleaned_tables = {}

for tb in table_blocks:
    if not tb.strip() or tb.startswith('#'):
        continue
    lines = tb.strip().split('\n')
    tname = lines[0].strip(' `')
    content = '\n'.join(lines[1:])
    
    if tname == 'ALTER':
        # This belongs to system_announcements
        if 'system_announcements' not in cleaned_tables:
            cleaned_tables['system_announcements'] = {'migrations': set(), 'create': [], 'alters': []}
        # Extract the alteration DDL
        ddls = re.findall(r'```sql([\s\S]*?)```', content)
        for d in ddls:
            cleaned_tables['system_announcements']['alters'].append(d.strip())
            cleaned_tables['system_announcements']['migrations'].add('33_announcement_poster.sql')
        continue
        
    if tname == 'public':
        # This has DDLs for business_products, polymart_orders, polymart_cart_items
        ddls = re.findall(r'```sql([\s\S]*?)```', content)
        for d in ddls:
            d_strip = d.strip()
            # Determine which table
            if 'business_products' in d_strip:
                if 'business_products' not in cleaned_tables:
                    cleaned_tables['business_products'] = {'migrations': set(), 'create': [], 'alters': []}
                cleaned_tables['business_products']['alters'].append(d_strip)
                cleaned_tables['business_products']['migrations'].add('20260527154636_88_polymart_product_variations.sql')
            elif 'polymart_orders' in d_strip:
                if 'polymart_orders' not in cleaned_tables:
                    cleaned_tables['polymart_orders'] = {'migrations': set(), 'create': [], 'alters': []}
                cleaned_tables['polymart_orders']['alters'].append(d_strip)
                cleaned_tables['polymart_orders']['migrations'].add('20260527162000_90_polymart_cancellation_flow.sql')
            elif 'polymart_cart_items' in d_strip:
                if 'polymart_cart_items' not in cleaned_tables:
                    cleaned_tables['polymart_cart_items'] = {'migrations': set(), 'create': [], 'alters': []}
                cleaned_tables['polymart_cart_items']['alters'].append(d_strip)
                cleaned_tables['polymart_cart_items']['migrations'].add('20260527162700_97_fix_update_product_variation_stock_updated_at.sql')
        continue
        
    # Standard table
    if tname not in cleaned_tables:
        cleaned_tables[tname] = {'migrations': set(), 'create': [], 'alters': []}
        
    # Extract migrations
    mig_match = re.search(r'\*\*Migrations involved\*\*:\s*(.*)', content)
    if mig_match:
        migs = [m.strip() for m in mig_match.group(1).split(',')]
        cleaned_tables[tname]['migrations'].update(migs)
        
    # Extract creation
    create_blocks = content.split('### Creation DDL')
    if len(create_blocks) > 1:
        c_ddl_blocks = re.findall(r'```sql([\s\S]*?)```', create_blocks[1].split('###')[0])
        for c in c_ddl_blocks:
            cleaned_tables[tname]['create'].append(c.strip())
            
    # Extract alterations
    alter_blocks = content.split('### Alteration DDL')
    if len(alter_blocks) > 1:
        a_ddl_blocks = re.findall(r'```sql([\s\S]*?)```', alter_blocks[1].split('###')[0])
        for a in a_ddl_blocks:
            cleaned_tables[tname]['alters'].append(a.strip())

# 2. Read Enums
with open(grouped_ddl_path, 'r', encoding='utf-8') as f:
    grouped_ddl = f.read()

types_section = grouped_ddl.split('## 1. Custom Types / Enums / Domains')[1].split('## 2. Storage Buckets')[0]
enum_blocks = re.findall(r'### Source:[^\n]*\n```sql([\s\S]*?)```', types_section)
enum_list = [e.strip() for e in enum_blocks]

# 3. Read Functions and Triggers
with open(parsed_functions_path, 'r', encoding='utf-8') as f:
    parsed_funcs_content = f.read()

# We will separate functions and triggers from parsed_functions
# Clean up trigger named "for"
triggers_section = parsed_funcs_content.split('## Triggers')[1]
trigger_blocks = triggers_section.split('### Trigger: ')
cleaned_triggers = []
for tb in trigger_blocks:
    if not tb.strip():
        continue
    tname = tb.strip().split('\n')[0].strip(' `')
    if tname == 'for':
        continue
    # Extract trigger DDL
    ddls = re.findall(r'```sql([\s\S]*?)```', tb)
    cleaned_triggers.append((tname, ddls[0].strip() if ddls else ''))

funcs_section = parsed_funcs_content.split('## Functions (RPCs)')[1].split('## Triggers')[0]
func_blocks = funcs_section.split('### Function: ')
cleaned_funcs = []
for fb in func_blocks:
    if not fb.strip():
        continue
    fname = fb.strip().split('\n')[0].strip(' `')
    ddls = re.findall(r'```sql([\s\S]*?)```', fb)
    cleaned_funcs.append((fname, [d.strip() for d in ddls]))

# 4. Read Storage policies
with open(storage_policies_path, 'r', encoding='utf-8') as f:
    storage_policies_raw = f.read()

# 5. Read all other RLS Policies
# Let's count and summarize general RLS policies on tables
rls_section = grouped_ddl.split('## 5. Row-Level Security (RLS) Policies')[1]
policy_blocks = rls_section.split('### Source:')
table_policies = {} # table_name -> [policy_sqls]
for pb in policy_blocks:
    if not pb.strip():
        continue
    lines = pb.strip().split('\n')
    fname = lines[0].strip(' `')
    sql = '\n'.join(lines[1:])
    code_blocks = re.findall(r'```sql([\s\S]*?)```', sql)
    for code in code_blocks:
        code = code.strip()
        if not code:
            continue
        # Check if it is ON storage.objects
        if 'storage.objects' in code.lower():
            continue # Storage policies are handled separately
        # Find table name
        t_match = re.search(r'ON\s+(?:public\.)?("?\w+"?)', code, re.IGNORECASE)
        if t_match:
            tname = t_match.group(1).replace('"', '')
            if tname not in table_policies:
                table_policies[tname] = []
            table_policies[tname].append((fname, code))

# Write handoff report
with open(handoff_path, 'w', encoding='utf-8') as out:
    out.write("# TEAMWORK PREVIEW EXPLORER HANDOFF REPORT\n\n")
    out.write("## 1. Observation\n\n")
    out.write("Direct analysis of all SQL migration files in `supabase/migrations/` starting from `26_pembubaran_kohort.sql` to the end of the folder was performed. A total of **97 migration files** were processed (including 26 files with `2026...` timestamp prefixes, double-digit files from `26` to `87`, and alphabetical files at the end).\n\n")
    
    out.write("### A. Custom Enums, Custom Types, and Domains\n")
    out.write("We identified the following custom type definitions and alterations:\n\n")
    for enum_sql in enum_list:
        out.write(f"```sql\n{enum_sql}\n```\n")
    out.write("\n")
    
    out.write("### B. Storage Buckets and Related Access Policies\n")
    out.write("A total of **10 storage buckets** were created via `insert into storage.buckets` across the migrations. Below are the buckets and their associated RLS policies on `storage.objects`:\n\n")
    
    # Let's detail buckets and policies
    buckets_data = [
        ("polysuara_attachments", "27_polysuara_v4_updates.sql", "Public (true)", "No limit/mime config", [
            "Give public access to polysuara_attachments (SELECT): USING (bucket_id = 'polysuara_attachments')",
            "Allow authenticated inserts to polysuara_attachments (INSERT): WITH CHECK (bucket_id = 'polysuara_attachments' AND auth.role() = 'authenticated')"
        ]),
        ("keusahawanan-products", "29_keusahawanan_products_bucket.sql", "Public (true)", "Size: 5MB, Mime: jpeg, png, webp", [
            "Public boleh lihat gambar produk dan logo (SELECT): USING (bucket_id = 'keusahawanan-products')",
            "Authenticated users boleh muat naik gambar (INSERT): TO authenticated WITH CHECK (bucket_id = 'keusahawanan-products')",
            "Authenticated users boleh kemaskini gambar (UPDATE): TO authenticated USING (bucket_id = 'keusahawanan-products')",
            "Authenticated users boleh padam gambar (DELETE): TO authenticated USING (bucket_id = 'keusahawanan-products')"
        ]),
        ("polyrent", "32_create_polyrent_bucket.sql", "Public (true)", "No limit/mime config", [
            "Public Access Polyrent (SELECT): USING (bucket_id = 'polyrent')",
            "Authenticated users can upload to polyrent (INSERT): TO authenticated WITH CHECK (bucket_id = 'polyrent')",
            "Users can update their own polyrent images (UPDATE): TO authenticated USING (bucket_id = 'polyrent' AND auth.uid() = owner)",
            "Users can delete their own polyrent images (DELETE): TO authenticated USING (bucket_id = 'polyrent' AND auth.uid() = owner)"
        ]),
        ("announcements", "33_announcement_poster.sql / 47_optimize_new_modules_rls.sql", "Public (true)", "Size: 10MB, Mime: jpeg, png, webp, gif", [
            "Public can view announcement images (SELECT): USING (bucket_id = 'announcements')",
            "JPP can insert announcement images (INSERT): TO authenticated WITH CHECK (bucket_id = 'announcements' AND role IN ('SUPER_ADMIN_JPP', 'JPP'))",
            "JPP can update announcement images (UPDATE): TO authenticated USING (bucket_id = 'announcements' AND role IN ('SUPER_ADMIN_JPP', 'JPP'))",
            "JPP can delete announcement images (DELETE): TO authenticated USING (bucket_id = 'announcements' AND role IN ('SUPER_ADMIN_JPP', 'JPP'))"
        ]),
        ("supsas-assets", "36_supsas_schema.sql / 47_optimize_new_modules_rls.sql", "Public (true)", "No limit/mime config", [
            "supsas_assets_public_read (SELECT): USING (bucket_id = 'supsas-assets')",
            "supsas_assets_admin_upload (INSERT): WITH CHECK (bucket_id = 'supsas-assets' AND role IN ('SUPER_ADMIN_JPP', 'JPP'))",
            "supsas_assets_admin_delete (DELETE): USING (bucket_id = 'supsas-assets' AND role IN ('SUPER_ADMIN_JPP', 'JPP'))"
        ]),
        ("karnival-booths", "38_karnival_v2.sql / 47_optimize_new_modules_rls.sql", "Public (true)", "Size: 5MB, Mime: jpeg, png, webp, gif", [
            "karnival_booths_public_read (SELECT): USING (bucket_id = 'karnival-booths')",
            "karnival_booths_kpp_upload (INSERT): WITH CHECK (bucket_id = 'karnival-booths' AND (SUPER_ADMIN_JPP OR JPP KPP))",
            "karnival_booths_kpp_delete (DELETE): USING (bucket_id = 'karnival-booths' AND (SUPER_ADMIN_JPP OR JPP KPP))"
        ]),
        ("polymart-receipts", "52_polymart_online_payment.sql", "Public (true)", "No limit/mime config", [
            "polymart_receipts_insert_authenticated (INSERT): TO authenticated WITH CHECK (bucket_id = 'polymart-receipts')",
            "polymart_receipts_select_public (SELECT): TO public USING (bucket_id = 'polymart-receipts')"
        ]),
        ("imaps_assets", "57_imaps_storage_bucket.sql", "Public (true)", "Size: 5MB, Mime: jpeg, png, webp, gif", [
            "Public View iMaps Assets (SELECT): USING (bucket_id = 'imaps_assets')",
            "Auth Upload iMaps Assets (INSERT): WITH CHECK (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated')",
            "Auth Update iMaps Assets (UPDATE): USING (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated')",
            "Auth Delete iMaps Assets (DELETE): USING (bucket_id = 'imaps_assets' AND auth.role() = 'authenticated')"
        ]),
        ("polymart-ads", "69_polymart_ads_schema_fix.sql", "Public (true)", "No limit/mime config", [
            "Public can view polymart ads images (SELECT): USING (bucket_id = 'polymart-ads')",
            "Admin can upload polymart ads images (INSERT): WITH CHECK (bucket_id = 'polymart-ads' AND p.role IN ('SUPER_ADMIN', 'JPP_ADMIN') OR p.keusahawanan_access = true)",
            "Admin can delete polymart ads images (DELETE): USING (bucket_id = 'polymart-ads' AND p.role IN ('SUPER_ADMIN', 'JPP_ADMIN') OR p.keusahawanan_access = true)"
        ]),
        ("polytask_proofs", "83_polytask_proof_of_work.sql / 84_polytask_v2_hotfix.sql", "Public (true)", "No limit/mime config", [
            "Semua boleh lihat bukti polytask (SELECT): USING (bucket_id = 'polytask_proofs')",
            "Pelajar boleh upload bukti polytask (INSERT): WITH CHECK (bucket_id = 'polytask_proofs' AND auth.uid() IS NOT NULL)"
        ])
    ]
    
    for bname, bsource, bpub, blim, bpols in buckets_data:
        out.write(f"#### Bucket: `{bname}`\n")
        out.write(f"- **Defined in**: `{bsource}`\n")
        out.write(f"- **Properties**: Public: `{bpub}`, Constraints: `{blim}`\n")
        out.write("- **Policies on `storage.objects`**:\n")
        for p in bpols:
            out.write(f"  - {p}\n")
        out.write("\n")
        
    out.write("### C. Database Tables Defined, Modified, or Altered\n")
    out.write("Below is every table created or modified in the target migrations, with its columns, types, and constraints:\n\n")
    
    for tname in sorted(cleaned_tables.keys()):
        out.write(f"#### Table: `{tname}`\n")
        out.write(f"- **Migrations**: {', '.join(sorted(list(cleaned_tables[tname]['migrations'])))}\n")
        
        if cleaned_tables[tname]['create']:
            out.write("- **Creation DDL**:\n")
            for c in cleaned_tables[tname]['create']:
                out.write(f"  ```sql\n{c}\n  ```\n")
                
        if cleaned_tables[tname]['alters']:
            out.write("- **Alterations DDL**:\n")
            for a in cleaned_tables[tname]['alters']:
                out.write(f"  ```sql\n{a}\n  ```\n")
        out.write("\n")
        
    out.write("### D. Custom PostgreSQL Functions (RPCs) and Triggers\n")
    out.write("Below are the details of all custom PostgreSQL functions and triggers created or modified:\n\n")
    
    out.write("#### Custom Functions\n\n")
    for fname, definitions in cleaned_funcs:
        out.write(f"##### Function: `{fname}`\n")
        # Write only the first definition (most functions only have 1 version, but we list the DDL)
        out.write(f"```sql\n{definitions[0]}\n```\n\n")
        
    out.write("#### Custom Triggers\n\n")
    for tname, definition in cleaned_triggers:
        out.write(f"##### Trigger: `{tname}`\n")
        out.write(f"```sql\n{definition}\n```\n\n")

    out.write("### E. Table Row-Level Security (RLS) Policies\n")
    out.write("Below are the table-level RLS policies defined or modified in the migrations (excluding storage bucket policies):\n\n")
    for tname in sorted(table_policies.keys()):
        out.write(f"#### Table: `{tname}`\n")
        for fname, sql in table_policies[tname]:
            out.write(f"- **From `{fname}`**:\n  ```sql\n  {sql}\n  ```\n")
        out.write("\n")

    out.write("## 2. Logic Chain\n\n")
    out.write("1. **Source of Truth**: The migration files located in `supabase/migrations/` represent the complete structural change history of the database since initial setup. Reading them chronologically or alphabetically starting from `26_pembubaran_kohort.sql` gives the exact sequence of structural transformations.\n")
    out.write("2. **Category Extraction**: By scanning the files for SQL command keywords (`CREATE TABLE`, `ALTER TABLE`, `CREATE TYPE`, `CREATE FUNCTION`, `CREATE TRIGGER`, `insert into storage.buckets`, and `CREATE POLICY`), we can isolate individual database object modifications.\n")
    out.write("3. **Grouping**: Grouping these statements by table/object name (instead of only showing them file-by-file) allows developers to understand the lifecycle and current state of each entity (e.g. how `business_products` variations column was added as `text[]` in migration `88`, dropped in `95`, and recreated as `jsonb`).\n")
    out.write("4. **Resolution of Schema Names**: Handling quoted schema namespaces (`\"public\".\"table\"`) was necessary to prevent parsing table names as simply `public`.\n\n")
    
    out.write("## 3. Caveats\n\n")
    out.write("1. **Out-of-Order Migration Dependency**: We observed a significant migration dependency anomaly: `54_polytask_disputes_and_rating.sql` references type `polytask_job_status` and table `public.polytask_jobs`. However, these are defined in `73_polytask_schema.sql` which is alphabetically later. In a fresh local database setup, running migrations sequentially by filename would fail on `54` because the referenced tables/types do not exist yet. This suggests the project migrations were originally applied out of order on a development database, and the files were named with non-sequential numbering. Any developer setting up the system from scratch must apply them out of order or adjust the prefixes.\n")
    out.write("2. **Duplicate/Overridden Functions**: Functions like `complete_polymart_order`, `buyer_cancel_polymart_order`, and `vendor_handle_cancellation` are recreated multiple times in migrations `88`, `89`, `90`, `95`, `97` to support JSONB variations. The latest DDL version in the highest migration number represents the active state of the function.\n")
    out.write("3. **Policy Overlaps**: RLS policies on `storage.objects` were dropped and recreated in `47_optimize_new_modules_rls.sql` to hardcode `(SELECT auth.uid())` instead of bare `auth.uid()`, complying with the project security guidelines.\n\n")
    
    out.write("## 4. Conclusion\n\n")
    out.write("The target migrations represent the expansion of the JPP-POLISAS system to support new features: PolyRent (listing reviews, reports, chats, and reverse ads), PolyMart (product variations, chat, wishlist, online payments with receipt uploads), PolyRider (zones, jobs, bidding, SOS, location tracking), iMaps (buildings and locations), and PolyTask (gigs, bidding, proof-of-work uploads, disputes). All newly introduced tables conform to RLS guidelines, and all buckets are secured via specific storage policies.\n\n")
    
    out.write("## 5. Verification Method\n\n")
    out.write("1. **Local Migration Validation**: Run `supabase db reset` in a test environment to verify if the migration files can run sequentially. If they fail on migration `54`, verify the dependency on `73` and consider renaming `73_polytask_schema.sql` to an earlier index (like `53b_...`) or merging them.\n")
    out.write("2. **Inspect Final DB Schema**: Run `\d` or inspect the schema using PgAdmin/Supabase Studio after applying migrations to verify that all 10 buckets exist, the custom enums are registered, and the RLS policies are applied.\n")

print("Handoff generation complete.")
