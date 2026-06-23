import json
import re

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if content.strip().startswith('"'):
    content = json.loads(content)

m = list(re.finditer(r'public:\s*\{\s*Tables:\s*\{', content))[1]
start_pos = m.end()

brace_count = 1
current_pos = start_pos
tables_content = ""
while brace_count > 0 and current_pos < len(content):
    char = content[current_pos]
    if char == '{':
        brace_count += 1
    elif char == '}':
        brace_count -= 1
    tables_content += char
    current_pos += 1

table_names = re.findall(r'([a-zA-Z0-9_]+):\s*\{\s*Row:\s*\{', tables_content)
for tname in table_names[:5]:
    term = f"{tname}: {{"
    start_idx = tables_content.find(term)
    print(f"Table: {tname}, search for: repr({term}) -> found: {start_idx}")
