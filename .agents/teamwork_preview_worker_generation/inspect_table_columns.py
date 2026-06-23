import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\postgrest_info.json', 'r', encoding='utf-16') as f:
    data = json.load(f)

definitions = data.get('definitions', {})

baseline = ['profiles', 'clubs', 'programs', 'club_reports', 'club_tasks', 'club_activities', 'club_announcements', 'club_committee', 'merit_transactions', 'club_logs']

for t in baseline:
    if t in definitions:
        print(f"\nTable: {t}")
        required = definitions[t].get('required', [])
        for col, p in definitions[t].get('properties', {}).items():
            req_str = "NOT NULL" if col in required else "NULL"
            default_str = f"DEFAULT {p['default']}" if 'default' in p else ""
            fmt = p.get('format', p.get('type'))
            print(f"  - {col} {fmt} {req_str} {default_str}")
    else:
        print(f"\nTable: {t} NOT FOUND")
