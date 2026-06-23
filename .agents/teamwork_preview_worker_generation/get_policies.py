import os
import re
import json

migrations_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\supabase\\migrations'
sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

policies_by_table = {}

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
            
    # Find policies
    matches = re.finditer(r'CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)(.*?)(?:WITH\s+CHECK|USING|FOR\s+|$)(.*?);', content, re.DOTALL | re.IGNORECASE)
    # A simpler and more robust regex to extract the entire CREATE POLICY statement:
    # Match from CREATE POLICY to the first semicolon, keeping in mind dollar quotes or parentheses.
    # Actually, we can search for CREATE POLICY and match up to the end of statement (semicolon).
    policy_matches = re.finditer(r'(CREATE\s+POLICY\s+"[^"]+"\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)[^;]+;)', content, re.IGNORECASE)
    for pm in policy_matches:
        full_sql = pm.group(1).strip()
        table_name = pm.group(2).lower()
        if table_name not in policies_by_table:
            policies_by_table[table_name] = []
        policies_by_table[table_name].append({
            'file': filename,
            'sql': full_sql
        })

# Save to JSON
with open('extracted_policies.json', 'w') as out:
    json.dump(policies_by_table, out, indent=2)

print(f"Extracted policies for {len(policies_by_table)} tables.")
for t in sorted(policies_by_table.keys()):
    print(f"- {t}: {len(policies_by_table[t])} policies")
