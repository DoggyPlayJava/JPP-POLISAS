import re
import json

filepath = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Decode JSON if stringified
if content.strip().startswith('"'):
    try:
        content = json.loads(content)
    except Exception as e:
        print("Failed to decode JSON:", e)

# Find correct Tables block under the public schema (using word boundary)
public_match = list(re.finditer(r'\bpublic:\s*\{\s*Tables:\s*\{', content))
if not public_match:
    print("Could not find public Tables block")
    exit(1)

start_pos = public_match[0].end()
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

# Parse tables from the extracted block.
table_definitions = {}

# Split table names using word boundary regex
table_matches = list(re.finditer(r'\b([a-zA-Z0-9_]+)\s*:\s*\{\s*Row:\s*\{', tables_content))

for idx, tm in enumerate(table_matches):
    tname = tm.group(1)
    start_idx = tm.start()
    
    # Find the table block brace indices using brace tracking
    # We find the open brace of the table, i.e., tname: {
    # Since tm matches up to Row: {, the open brace of tname is before Row: {
    # It is the open brace right after tname
    open_brace_idx = tables_content.find("{", start_idx)
    if open_brace_idx == -1:
        continue
    
    # Track braces to extract the whole table block
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
        
    # Parse columns in Row
    row_match = re.search(r'Row:\s*\{([^\}]+)\}', table_block)
    columns = {}
    if row_match:
        row_block = row_match.group(1)
        col_matches = re.finditer(r'\b([a-zA-Z0-9_]+)\s*:\s*([^;\n\r]+)', row_block)
        for cm in col_matches:
            col_name = cm.group(1)
            col_type = cm.group(2).strip()
            columns[col_name] = col_type
            
    # Parse relationships
    relationships = []
    rel_match = re.search(r'Relationships:\s*\[(.*?)\]', table_block, re.DOTALL)
    if rel_match:
        rel_block = rel_match.group(1)
        rel_objs = re.finditer(r'\{\s*foreignKeyName:\s*"([^"]+)"\s*columns:\s*\["([^"]+)"\]\s*referencedRelation:\s*"([^"]+)"\s*referencedColumns:\s*\["([^"]+)"\]\s*\}', rel_block, re.DOTALL)
        for ro in rel_objs:
            relationships.append({
                'fk_name': ro.group(1),
                'col': ro.group(2),
                'ref_table': ro.group(3),
                'ref_col': ro.group(4)
            })
            
    table_definitions[tname] = {
        'columns': columns,
        'relationships': relationships
    }

output_path = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\.agents\\teamwork_preview_worker_generation_replacement\\parsed_ts_tables_correct.json'
with open(output_path, 'w') as out:
    json.dump(table_definitions, out, indent=2)

print(f"Parsed {len(table_definitions)} tables from database.types.ts correctly.")
