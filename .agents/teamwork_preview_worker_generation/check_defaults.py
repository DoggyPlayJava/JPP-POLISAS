import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\postgrest_info.json', 'r', encoding='utf-16') as f:
    data = json.load(f)

definitions = data.get('definitions', {})
defaults = set()
for tname, defn in definitions.items():
    props = defn.get('properties', {})
    for col, p in props.items():
        if 'default' in p:
            defaults.add(str(p['default']))

print("Sample defaults from postgrest_info.json:")
for d in sorted(defaults)[:30]:
    print(f"  - {d}")
