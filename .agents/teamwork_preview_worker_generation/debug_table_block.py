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

tname = "akademik_files"
start_idx = tables_content.find(f"{tname}: {{")
brace_cnt = 0
pos = start_idx + len(tname) + 2
table_block = ""
while pos < len(tables_content):
    char = tables_content[pos]
    if char == '{':
        brace_cnt += 1
    elif char == '}':
        if brace_cnt == 0:
            break
        brace_cnt -= 1
    table_block += char
    pos += 1

print("table_block length:", len(table_block))
print("Last 300 chars of table_block:")
print(repr(table_block[-300:]))
