import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if content.strip().startswith('"'):
    content = json.loads(content)

idx = content.find("export type Database = {")
if idx != -1:
    print(repr(content[idx:idx+800]))
else:
    print("Database type not found")
