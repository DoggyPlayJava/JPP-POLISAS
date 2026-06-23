import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\.agents\\teamwork_preview_worker_generation\\parsed_ts_tables.json', 'r') as f:
    data = json.load(f)

print(f"Number of tables in parsed_ts_tables.json: {len(data)}")
for k in list(data.keys())[:10]:
    print(f"- {k} has {len(data[k]['columns'])} columns, {len(data[k]['relationships'])} foreign keys")
