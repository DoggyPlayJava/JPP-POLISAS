import os
import re

migrations_dir = 'supabase/migrations'
files = sorted(os.listdir(migrations_dir))

selected_files = []
for f in files:
    if f.startswith('2026') or f >= '26_pembubaran_kohort.sql':
        selected_files.append(f)

grouped = {
    'types': [],
    'buckets': [],
    'tables': [],
    'functions_triggers': [],
    'rls_policies': []
}

def strip_sql_comments(sql):
    # Remove single line comments
    sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE)
    # Remove block comments
    sql = re.sub(r'/\*[\s\S]*?\*/', '', sql)
    return sql

for filename in selected_files:
    filepath = os.path.join(migrations_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f_in:
        content = f_in.read()
        
    # We do NOT strip comments from the full content before regex since some function body might have comments
    # but for statement classification, we check stripped version.
    
    # 1. Custom Types / Enums / Domains
    # Find all CREATE TYPE or CREATE DOMAIN
    type_matches = re.finditer(r'(CREATE\s+TYPE\s+[\s\S]*?;|CREATE\s+DOMAIN\s+[\s\S]*?;|ALTER\s+TYPE\s+[\s\S]*?;)', content, re.IGNORECASE)
    for m in type_matches:
        grouped['types'].append((filename, m.group(0).strip()))
        
    # 2. Storage Buckets
    bucket_matches = re.finditer(r"(insert\s+into\s+storage\.buckets[\s\S]*?;)", content, re.IGNORECASE)
    for m in bucket_matches:
        grouped['buckets'].append((filename, m.group(0).strip()))
        
    # 3. Create / Alter Tables
    # Split by semicolon, but be careful not to split inside function blocks ($$ ... $$)
    # To split correctly, we can use a basic parser that respects $$ blocks, or we can use regex to find CREATE TABLE and ALTER TABLE blocks.
    # A CREATE TABLE block typically starts with CREATE TABLE [IF NOT EXISTS] public.tablename ( ... );
    # Let's find them using re.finditer with a regex that matches CREATE TABLE and ALTER TABLE
    # CREATE TABLE matches:
    create_table_matches = re.finditer(r'(CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w.]+\s*\([\s\S]*?\);)', content, re.IGNORECASE)
    for m in create_table_matches:
        grouped['tables'].append((filename, m.group(0).strip()))
        
    # ALTER TABLE matches:
    # ALTER TABLE matches are usually single lines ending in ;
    # Let's extract any line starting with ALTER TABLE (after stripping comments) up to the next semicolon
    alter_table_matches = re.finditer(r'(ALTER\s+TABLE\s+[\s\S]*?;)', content, re.IGNORECASE)
    for m in alter_table_matches:
        stmt = m.group(0).strip()
        # If it's enabling RLS only, we will keep it but filter out from tables list if needed, or group in RLS.
        # But wait, let's keep all table DDL here.
        grouped['tables'].append((filename, stmt))
            
    # 4. Functions & Triggers
    # Functions usually look like: CREATE [OR REPLACE] FUNCTION ... RETURNS ... AS $$ ... $$ LANGUAGE plpgsql ... ;
    # Triggers look like: CREATE TRIGGER ... AFTER/BEFORE ... ON ... FOR EACH ROW EXECUTE FUNCTION ...;
    func_matches = re.finditer(r'(CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+[\s\S]*?LANGUAGE\s+\w+[\s\S]*?;|CREATE\s+TRIGGER\s+[\s\S]*?;)', content, re.IGNORECASE)
    for m in func_matches:
        grouped['functions_triggers'].append((filename, m.group(0).strip()))
        
    # 5. Policies
    policy_matches = re.finditer(r'(CREATE\s+POLICY\s+[\s\S]*?;|ALTER\s+TABLE\s+[\s\S]*?ENABLE\s+ROW\s+LEVEL\s+SECURITY;)', content, re.IGNORECASE)
    drop_policies = re.findall(r'(DROP\s+POLICY\s+[\s\S]*?;)', content, re.IGNORECASE)
    for dp in drop_policies:
        grouped['rls_policies'].append((filename, dp.strip()))
    for p in policy_matches:
        grouped['rls_policies'].append((filename, p.group(0).strip()))

# Output grouped results
grouped_md_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\grouped_ddl.md'

with open(grouped_md_path, 'w', encoding='utf-8') as out:
    out.write("# Grouped Database DDL Changes\n\n")
    
    # 1. Types
    out.write("## 1. Custom Types / Enums / Domains\n\n")
    if not grouped['types']:
        out.write("No custom types, enums, or domains found.\n\n")
    for fname, sql in grouped['types']:
        out.write(f"### Source: `{fname}`\n```sql\n{sql}\n```\n\n")
        
    # 2. Buckets
    out.write("## 2. Storage Buckets & Policies\n\n")
    if not grouped['buckets']:
        out.write("No storage buckets created in these migrations.\n\n")
    for fname, sql in grouped['buckets']:
        out.write(f"### Source: `{fname}`\n```sql\n{sql}\n```\n\n")
        
    # 3. Tables
    out.write("## 3. Create / Alter Tables\n\n")
    if not grouped['tables']:
        out.write("No table creations or alterations found.\n\n")
    for fname, sql in grouped['tables']:
        # If it's just enabling RLS (e.g. ALTER TABLE ... ENABLE ROW LEVEL SECURITY), we skip it here to avoid duplication
        if "ENABLE ROW LEVEL SECURITY" in sql.upper() and len(sql) < 150:
            continue
        out.write(f"### Source: `{fname}`\n```sql\n{sql}\n```\n\n")
        
    # 4. Functions & Triggers
    out.write("## 4. Custom PostgreSQL Functions (RPCs) & Triggers\n\n")
    if not grouped['functions_triggers']:
        out.write("No custom functions or triggers found.\n\n")
    for fname, sql in grouped['functions_triggers']:
        out.write(f"### Source: `{fname}`\n```sql\n{sql}\n```\n\n")
        
    # 5. Policies
    out.write("## 5. Row-Level Security (RLS) Policies\n\n")
    if not grouped['rls_policies']:
        out.write("No RLS policies found.\n\n")
    for fname, sql in grouped['rls_policies']:
        out.write(f"### Source: `{fname}`\n```sql\n{sql}\n```\n\n")

print("Grouped generation complete with comment tolerance.")
