import json
import codecs

with codecs.open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\postgrest_info.json', 'r', 'utf-16') as f:
    data = json.load(f)

definitions = data.get('definitions', {})
if 'profiles' in definitions:
    print(json.dumps(definitions['profiles'], indent=2)[:2000])
else:
    print("profiles not found in definitions")
