import json
import re

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\.agents\\teamwork_preview_worker_generation\\parsed_ts_tables.json', 'r') as f:
    data = json.load(f)

# Let's read database.types.ts and print the akademik_files block we parsed
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
open_brace_idx = tables_content.find("{", start_idx + len(tname))
brace_cnt = 1
pos = open_brace_idx + 1
table_block = "{"
while pos < len(tables_content) and brace_cnt > 0:
    char = tables_content[pos]
    if char == '{':
        brace_cnt += 1
    elif char == '}':
        brace_cnt -= 1
        table_block += char
        if brace_cnt == 0:
            break
        pos += 1
        continue
    table_block += char
    pos += 1

print("table_block length:", len(table_block))
rel_match = re.search(r'Relationships:\s*\[(.*?)\]', table_block, re.DOTALL)
if rel_match:
    rel_block = rel_match.group(1)
    print("rel_block found:")
    print(repr(rel_block))
    # Test regex
    pattern = r'\{\s*foreignKeyName:\s*"([^"]+)"\s*columns:\s*\["([^"]+)"\]\s*referencedRelation:\s*"([^"]+)"\s*referencedColumns:\s*\["([^"]+)"\]\s*\}'
    matches = list(re.finditer(pattern, rel_block, re.DOTALL))
    print("Matches found in rel_block:", len(matches))
else:
    print("Relationships block NOT found in table_block")
