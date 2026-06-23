import os
import re

migrations_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\supabase\\migrations'
sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

created_tables = set()

def strip_comments(sql):
    sql = re.sub(r'--.*', '', sql)
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    return sql

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
            
    clean = strip_comments(content)
    matches = re.findall(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)', clean, re.IGNORECASE)
    for m in matches:
        created_tables.add(m.lower())

print(f"Found {len(created_tables)} tables created in migrations:")
for t in sorted(created_tables):
    print(f"- {t}")
