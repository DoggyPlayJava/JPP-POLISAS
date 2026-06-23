import os
import re

migrations_dir = 'supabase/migrations'
files = sorted(os.listdir(migrations_dir))

selected_files = []
for f in files:
    if f.startswith('2026') or f >= '26_pembubaran_kohort.sql':
        selected_files.append(f)

summary_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\ddl_summary.txt'

with open(summary_path, 'w', encoding='utf-8') as out:
    for idx, filename in enumerate(selected_files, 1):
        filepath = os.path.join(migrations_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f_in:
                content = f_in.read()
        except Exception as e:
            continue

        # Regexes
        created_tables = re.findall(r'create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)', content, re.IGNORECASE)
        altered_tables = re.findall(r'alter\s+table\s+(?:only\s+)?(?:public\.)?(\w+)', content, re.IGNORECASE)
        # Remove duplicates while preserving order
        altered_tables = list(dict.fromkeys(altered_tables))
        
        created_types = re.findall(r'create\s+type\s+(?:public\.)?(\w+)', content, re.IGNORECASE)
        created_domains = re.findall(r'create\s+domain\s+(?:public\.)?(\w+)', content, re.IGNORECASE)
        
        created_funcs = re.findall(r'create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)', content, re.IGNORECASE)
        created_triggers = re.findall(r'create\s+trigger\s+(\w+)', content, re.IGNORECASE)
        
        # storage buckets insert
        buckets = re.findall(r"insert\s+into\s+storage\.buckets\s*\([^)]*\)\s*values\s*\(\s*'([^']+)'", content, re.IGNORECASE)
        
        # policies
        policies = re.findall(r'create\s+policy\s+"?([^"]+)"?\s+on\s+(?:public\.)?(\w+)', content, re.IGNORECASE)
        
        if any([created_tables, altered_tables, created_types, created_domains, created_funcs, created_triggers, buckets, policies]):
            out.write(f"FILE: {filename}\n")
            if created_tables:
                out.write(f"  CREATE TABLEs: {', '.join(created_tables)}\n")
            if altered_tables:
                out.write(f"  ALTER TABLEs: {', '.join(altered_tables)}\n")
            if created_types:
                out.write(f"  CREATE TYPEs: {', '.join(created_types)}\n")
            if created_domains:
                out.write(f"  CREATE DOMAINs: {', '.join(created_domains)}\n")
            if created_funcs:
                out.write(f"  CREATE FUNCTIONs: {', '.join(created_funcs)}\n")
            if created_triggers:
                out.write(f"  CREATE TRIGGERs: {', '.join(created_triggers)}\n")
            if buckets:
                out.write(f"  STORAGE BUCKETs: {', '.join(buckets)}\n")
            if policies:
                policy_desc = [f"'{p[0]}' on {p[1]}" for p in policies]
                out.write(f"  RLS POLICIEs: {', '.join(policy_desc)}\n")
            out.write("\n")

print("Summary complete.")
