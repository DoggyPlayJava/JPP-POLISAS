import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if content.strip().startswith('"'):
    content = json.loads(content)

m = list(re := __import__('re').finditer(r'public:\s*\{\s*Tables:\s*\{', content))[1]
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

iterations = []
while pos < len(tables_content) and brace_cnt > 0:
    char = tables_content[pos]
    iterations.append((pos, char, brace_cnt))
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

print("Loop terminated.")
print("Last 30 iterations:")
for p, c, b in iterations[-30:]:
    print(f"pos: {p}, char: {repr(c)}, brace_cnt before: {b}")
print("Final brace_cnt:", brace_cnt)
print("pos vs len:", pos, len(tables_content))
