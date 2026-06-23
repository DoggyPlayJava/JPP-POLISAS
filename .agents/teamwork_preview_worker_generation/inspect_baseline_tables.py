import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\.agents\\teamwork_preview_worker_generation\\extracted_tables.json', 'r') as f:
    tables = json.load(f)

for t in ['profiles', 'clubs', 'programs', 'club_reports', 'club_tasks', 'club_activities', 'club_announcements', 'club_committee', 'merit_transactions', 'club_logs']:
    if t in tables:
        print(f"\nTable: {t}")
        for col, prop in tables[t].items():
            print(f"  - {col}: {prop['type']} (format: {prop['format']}, required: {prop['required']})")
    else:
        print(f"\nTable: {t} NOT FOUND")
