import json
import re

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if content.strip().startswith('"'):
    content = json.loads(content)

# Print 500 chars from 943
print("At 943:")
print(repr(content[943:943+200]))

# Test regex matching on content
pattern = r'public:\s*\{\s*Tables:\s*\{'
matches = list(re.finditer(pattern, content))
print("Matches found:", len(matches))
for m in matches:
    print("Match start:", m.start())
