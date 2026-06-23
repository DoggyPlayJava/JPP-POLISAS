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

brace_cnt = 0
pos = start_idx + len(tname)
print(f"Starting trace at pos {pos}, char is: {repr(tables_content[pos:pos+10])}")

while pos < len(tables_content):
    char = tables_content[pos]
    if char == '{':
        brace_cnt += 1
        print(f"Increment to {brace_cnt} at char '{char}' (pos {pos}) context: {repr(tables_content[pos-10:pos+10])}")
    elif char == '}':
        print(f"Seen '}}' at pos {pos}, brace_cnt before check: {brace_cnt} context: {repr(tables_content[pos-10:pos+10])}")
        if brace_cnt == 0:
            print(f"BREAK at pos {pos}")
            break
        brace_cnt -= 1
        print(f"Decrement to {brace_cnt}")
    pos += 1
