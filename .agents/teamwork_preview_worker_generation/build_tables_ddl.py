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

# Find correct Tables block under the top-level public schema
matches = list(re.finditer(r'public:\s*\{\s*Tables:\s*\{', content))
target_match = None
for m in matches:
    start_pos = m.end()
    if "ai_tier_requests: {" in content[start_pos:start_pos+200]:
        target_match = m
        break

if not target_match:
    print("Could not find the correct public Tables block in database.types.ts")
    exit(1)

start_pos = target_match.end()

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

# Now we parse the tables from the extracted block.
table_definitions = {}

# Split tables_content by Row to get table names
table_names = re.findall(r'([a-zA-Z0-9_]+):\s*\{\s*Row:\s*\{', tables_content)

for tname in table_names:
    start_idx = tables_content.find(f"{tname}: {{")
    if start_idx == -1:
        continue
    
    # Locate the first open brace of the table block
    open_brace_idx = tables_content.find("{", start_idx + len(tname))
    if open_brace_idx == -1:
        continue
    
    # Initialize brace count to 1 for the table block open brace
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
        
    row_match = re.search(r'Row:\s*\{([^\}]+)\}', table_block)
    columns = {}
    if row_match:
        row_block = row_match.group(1)
        col_matches = re.finditer(r'([a-zA-Z0-9_]+):\s*([^;\n\r]+)', row_block)
        for cm in col_matches:
            col_name = cm.group(1)
            col_type = cm.group(2).strip()
            columns[col_name] = col_type
            
    relationships = []
    # Use greedy .* to match up to the last closing bracket of Relationships
    rel_match = re.search(r'Relationships:\s*\[(.*)\]', table_block, re.DOTALL)
    if rel_match:
        rel_block = rel_match.group(1)
        # Parse relation items
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

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\.agents\\teamwork_preview_worker_generation\\parsed_ts_tables.json', 'w') as out:
    json.dump(table_definitions, out, indent=2)

print(f"Parsed {len(table_definitions)} tables from database.types.ts")
for k in list(table_definitions.keys()):
    rels = table_definitions[k]['relationships']
    if rels:
        print(f"Table: {k} has {len(table_definitions[k]['columns'])} columns and {len(rels)} foreign keys:")
        for r in rels:
            print(f"  - {r['col']} -> {r['ref_table']}.{r['ref_col']} ({r['fk_name']})")
