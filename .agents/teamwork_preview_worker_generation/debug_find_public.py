import json
import re

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if content.strip().startswith('"'):
    content = json.loads(content)

# Search for public: or "public":
matches = [m.start() for m in re.finditer(r'public\s*:', content)]
print("Matches for public:", matches)
for m in matches:
    print(repr(content[m:m+200]))
