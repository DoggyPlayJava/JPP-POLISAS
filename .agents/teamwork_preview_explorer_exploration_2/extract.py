import os
import re

migrations_dir = 'supabase/migrations'
files = sorted(os.listdir(migrations_dir))

selected_files = []
for f in files:
    if f.startswith('2026') or f >= '26_pembubaran_kohort.sql':
        selected_files.append(f)

print(f"Total files selected: {len(selected_files)}")

output_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\extracted_raw.txt'

with open(output_path, 'w', encoding='utf-8') as out:
    for idx, filename in enumerate(selected_files, 1):
        filepath = os.path.join(migrations_dir, filename)
        out.write(f"\n{'='*80}\n")
        out.write(f"FILE {idx}/{len(selected_files)}: {filename}\n")
        out.write(f"{'='*80}\n\n")
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f_in:
                lines = f_in.readlines()
        except Exception as e:
            out.write(f"Error reading file: {e}\n")
            continue
            
        content = "".join(lines)
        
        # 1. Custom Types / Enums / Domains
        out.write("--- CUSTOM TYPES / ENUMS / DOMAINS ---\n")
        type_matches = re.finditer(r'(CREATE\s+TYPE\s+[\s\S]*?;|CREATE\s+DOMAIN\s+[\s\S]*?;|ALTER\s+TYPE\s+[\s\S]*?;)', content, re.IGNORECASE)
        for m in type_matches:
            out.write(f"[Match]:\n{m.group(0)}\n\n")
            
        # 2. Storage Buckets
        out.write("--- STORAGE BUCKETS ---\n")
        bucket_matches = re.finditer(r"(insert\s+into\s+storage\.buckets[\s\S]*?;)", content, re.IGNORECASE)
        for m in bucket_matches:
            out.write(f"[Match]:\n{m.group(0)}\n\n")
            
        # 3. Tables defined/modified
        out.write("--- CREATE / ALTER TABLES ---\n")
        # Let's find CREATE TABLE and ALTER TABLE blocks
        # Usually CREATE TABLE starts with CREATE TABLE and ends with );
        # ALTER TABLE starts with ALTER TABLE and ends with ;
        table_matches = re.finditer(r'(CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s*\([\s\S]*?\);|ALTER\s+TABLE\s+[\s\S]*?;)', content, re.IGNORECASE)
        for m in table_matches:
            out.write(f"[Match]:\n{m.group(0)}\n\n")
            
        # 4. Functions / Triggers
        out.write("--- FUNCTIONS / TRIGGERS ---\n")
        # Functions are usually larger, let's extract CREATE FUNCTION / CREATE TRIGGER
        func_matches = re.finditer(r'(CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+[\s\S]*?LANGUAGE\s+\w+;|CREATE\s+TRIGGER\s+[\s\S]*?;)', content, re.IGNORECASE)
        for m in func_matches:
            out.write(f"[Match]:\n{m.group(0)}\n\n")
            
        # 5. Policies (RLS)
        out.write("--- RLS POLICIES ---\n")
        policy_matches = re.finditer(r'(CREATE\s+POLICY\s+[\s\S]*?;|ALTER\s+TABLE\s+[\s\S]*?ENABLE\s+ROW\s+LEVEL\s+SECURITY;)', content, re.IGNORECASE)
        for m in policy_matches:
            out.write(f"[Match]:\n{m.group(0)}\n\n")

print("Parsing complete.")
