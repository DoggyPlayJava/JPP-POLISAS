import json
import codecs

# Read UTF-16LE postgrest_info.json
with codecs.open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\postgrest_info.json', 'r', 'utf-16') as f:
    data = json.load(f)

definitions = data.get('definitions', {})
print(f"Found {len(definitions)} definitions.")

tables = {}
for name, definition in definitions.items():
    properties = definition.get('properties', {})
    required = definition.get('required', [])
    columns = {}
    for col_name, prop in properties.items():
        columns[col_name] = {
            'type': prop.get('type'),
            'format': prop.get('format'),
            'description': prop.get('description'),
            'required': col_name in required
        }
    tables[name] = columns

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\.agents\\teamwork_preview_worker_generation\\extracted_tables.json', 'w') as out:
    json.dump(tables, out, indent=2)

print("Extraction complete. Saved to extracted_tables.json")
