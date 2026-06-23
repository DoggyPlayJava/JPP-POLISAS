import json

with open('parsed_ts_tables.json', 'r') as f:
    ts_data = json.load(f)

with open('extracted_tables.json', 'r') as f:
    ex_data = json.load(f)

ts_keys = set(ts_data.keys())
ex_keys = set(ex_data.keys())

print(f"TS Keys count: {len(ts_keys)}")
print(f"EX Keys count: {len(ex_keys)}")

print("\nKeys in TS but not EX:")
for k in sorted(ts_keys - ex_keys):
    print(f"- {k}")

print("\nKeys in EX but not TS:")
for k in sorted(ex_keys - ts_keys):
    print(f"- {k}")
