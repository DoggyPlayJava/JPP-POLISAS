import os
import re

migrations_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\supabase\\migrations'
sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

enum_creates = []
for filename in sql_files:
    filepath = os.path.join(migrations_dir, filename)
    content = ""
    try:
        with open(filepath, 'r', encoding='utf-16') as f:
            content = f.read()
    except Exception:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception:
            continue
            
    matches = re.finditer(r'CREATE\s+TYPE\s+([a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\(([^)]+)\);', content, re.IGNORECASE)
    for m in matches:
        enum_creates.append((filename, m.group(0)))
        
    # Also search for ALTER TYPE ... ADD VALUE
    alter_matches = re.finditer(r'ALTER\s+TYPE\s+([a-zA-Z0-9_]+)\s+ADD\s+VALUE[^;]+;', content, re.IGNORECASE)
    for m in alter_matches:
        enum_creates.append((filename, m.group(0)))

print(f"Found {len(enum_creates)} enum definitions/alterations:")
for fn, sql in enum_creates:
    print(f"File: {fn} -> {sql.strip()}")
