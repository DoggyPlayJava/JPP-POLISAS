import json
import re

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if content.strip().startswith('"'):
    content = json.loads(content)

idx = content.find("akademik_files: {")
if idx != -1:
    rel_idx = content.find("Relationships:", idx)
    if rel_idx != -1:
        print(repr(content[rel_idx:rel_idx+1000]))
    else:
        print("Relationships not found for akademik_files")
else:
    print("akademik_files not found")
