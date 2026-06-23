import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if content.strip().startswith('"'):
    content = json.loads(content)

idx = content.find("ai_tier_requests")
if idx != -1:
    print(repr(content[idx:idx+400]))
else:
    print("ai_tier_requests not found in content.")
