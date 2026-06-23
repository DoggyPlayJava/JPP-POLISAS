import json
import re

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if content.strip().startswith('"'):
    content = json.loads(content)

idx = content.find("akademik_files: {")
if idx != -1:
    # Print 1500 chars to cover the block
    print(repr(content[idx:idx+1500]))
else:
    print("akademik_files not found")
