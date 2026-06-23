import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\.agents\\teamwork_preview_worker_generation\\extracted_tables.json', 'r') as f:
    tables = json.load(f)

print("Tables found:")
for t in sorted(tables.keys()):
    print(f"- {t}")
