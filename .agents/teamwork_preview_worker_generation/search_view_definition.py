import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\postgrest_info.json', 'r', encoding='utf-16') as f:
    data = json.load(f)

definitions = data.get('definitions', {})
if 'v_takwim_global' in definitions:
    print("Found v_takwim_global:")
    print(json.dumps(definitions['v_takwim_global'], indent=2))
else:
    print("v_takwim_global not found")
