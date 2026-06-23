import os
import re
import json

migrations_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\supabase\\migrations'
sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

triggers = {}

def strip_comments(sql):
    # Strip single line comments
    sql = re.sub(r'--.*', '', sql)
    # Strip multi line comments
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
            
    clean_content = strip_comments(content)
    
    # Regex to match CREATE TRIGGER statement
    matches = re.finditer(r'(CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)\s+[^;]+;)', clean_content, re.IGNORECASE)
    for m in matches:
        trigger_sql = m.group(1).strip()
        trigger_name = m.group(2).lower()
        triggers[trigger_name] = {
            'file': filename,
            'sql': trigger_sql
        }

# Save results
with open('extracted_triggers.json', 'w') as out:
    json.dump(triggers, out, indent=2)

print(f"Extracted {len(triggers)} unique triggers:")
for name in sorted(triggers.keys()):
    print(f"- {name} (from {triggers[name]['file']})")
