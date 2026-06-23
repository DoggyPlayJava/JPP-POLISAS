import os
import re

migrations_dir = 'supabase/migrations'
files = sorted(os.listdir(migrations_dir))

selected_files = []
for f in files:
    if f.startswith('2026') or f >= '26_pembubaran_kohort.sql':
        selected_files.append(f)

# Output detailed extraction
detailed_md_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\extracted_detailed_ddl.md'

with open(detailed_md_path, 'w', encoding='utf-8') as out:
    out.write("# Detailed DDL Extraction from Migrations\n\n")
    
    for f_idx, filename in enumerate(selected_files, 1):
        filepath = os.path.join(migrations_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f_in:
            content = f_in.read()
            
        out.write(f"## File {f_idx}: `{filename}`\n\n")
        
        # Helper to find code blocks
        # Let's search for CREATE TABLE/ALTER TABLE/CREATE TYPE/CREATE DOMAIN/CREATE FUNCTION/CREATE TRIGGER/storage.buckets/CREATE POLICY
        # We'll extract each match and print it as a SQL code block.
        
        # 1. Custom Types / Enums / Domains
        types = re.findall(r'(CREATE\s+TYPE\s+[\s\S]*?;|CREATE\s+DOMAIN\s+[\s\S]*?;|ALTER\s+TYPE\s+[\s\S]*?;)', content, re.IGNORECASE)
        if types:
            out.write("### Custom Types / Enums / Domains\n")
            for t in types:
                out.write(f"```sql\n{t.strip()}\n```\n\n")
                
        # 2. Storage Buckets
        buckets = re.findall(r"(insert\s+into\s+storage\.buckets[\s\S]*?;)", content, re.IGNORECASE)
        if buckets:
            out.write("### Storage Buckets\n")
            for b in buckets:
                out.write(f"```sql\n{b.strip()}\n```\n\n")
                
        # 3. Create/Alter Tables
        # We'll split the file by semicolon and find statements containing CREATE TABLE or ALTER TABLE
        statements = re.split(r';', content)
        tables_statements = []
        for s in statements:
            s_strip = s.strip()
            if not s_strip:
                continue
            # Check if it has CREATE TABLE or ALTER TABLE
            if re.match(r'^\s*(CREATE\s+TABLE|ALTER\s+TABLE)\b', s_strip, re.IGNORECASE):
                tables_statements.append(s_strip)
                
        if tables_statements:
            out.write("### Create / Alter Tables\n")
            for ts in tables_statements:
                out.write(f"```sql\n{ts.strip()};\n```\n\n")
                
        # 4. Functions / Triggers
        # For functions, they can contain semicolons, so splitting by semicolon doesn't work.
        # Let's find using regex.
        funcs = re.findall(r'(CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+[\s\S]*?LANGUAGE\s+\w+;|CREATE\s+TRIGGER\s+[\s\S]*?;)', content, re.IGNORECASE)
        if funcs:
            out.write("### Functions & Triggers\n")
            for fn in funcs:
                out.write(f"```sql\n{fn.strip()}\n```\n\n")
                
        # 5. Policies
        policies = re.findall(r'(CREATE\s+POLICY\s+[\s\S]*?;|ALTER\s+TABLE\s+[\s\S]*?ENABLE\s+ROW\s+LEVEL\s+SECURITY;)', content, re.IGNORECASE)
        # also find drop policy
        drop_policies = re.findall(r'(DROP\s+POLICY\s+[\s\S]*?;)', content, re.IGNORECASE)
        if policies or drop_policies:
            out.write("### RLS Policies\n")
            for dp in drop_policies:
                out.write(f"```sql\n{dp.strip()}\n```\n\n")
            for p in policies:
                out.write(f"```sql\n{p.strip()}\n```\n\n")
                
        out.write("---\n\n")

print("Detailed extraction complete.")
