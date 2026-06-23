import re
import os

grouped_md_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\grouped_ddl.md'
output_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\parsed_functions.md'

with open(grouped_md_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract Functions & Triggers section
section = content.split('## 4. Custom PostgreSQL Functions (RPCs) & Triggers')[1].split('## 5. Row-Level Security (RLS) Policies')[0]

# Split by "### Source:"
blocks = section.split('### Source:')

functions = {} # func_name -> { 'definition': sql, 'files': set() }
triggers = {}  # trig_name -> { 'definition': sql, 'files': set() }

for b in blocks:
    if not b.strip():
        continue
    
    lines = b.strip().split('\n')
    fname = lines[0].strip(' `')
    sql_content = '\n'.join(lines[1:])
    
    # Find code blocks
    code_blocks = re.findall(r'```sql([\s\S]*?)```', sql_content)
    for sql in code_blocks:
        sql = sql.strip()
        if not sql:
            continue
        
        # Check if it is a TRIGGER
        trigger_match = re.search(r'CREATE\s+TRIGGER\s+(\w+)', sql, re.IGNORECASE)
        if trigger_match:
            trig_name = trigger_match.group(1)
            if trig_name not in triggers:
                triggers[trig_name] = {'definitions': [], 'files': set()}
            triggers[trig_name]['definitions'].append(sql)
            triggers[trig_name]['files'].add(fname)
            continue
            
        # Check if it is a FUNCTION
        func_match = re.search(r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)', sql, re.IGNORECASE)
        if func_match:
            func_name = func_match.group(1)
            if func_name not in functions:
                functions[func_name] = {'definitions': [], 'files': set()}
            functions[func_name]['definitions'].append(sql)
            functions[func_name]['files'].add(fname)

with open(output_path, 'w', encoding='utf-8') as out:
    out.write("# Custom PostgreSQL Functions & Triggers\n\n")
    
    out.write("## Functions (RPCs)\n\n")
    for fname in sorted(functions.keys()):
        out.write(f"### Function: `{fname}`\n")
        out.write(f"- **Migrations involved**: {', '.join(sorted(list(functions[fname]['files'])))}\n\n")
        # Let's write the latest definition (which would be in the last file chronologically)
        # We can write all definitions if there are multiple, or just write them out.
        # Often a function is modified/replaced. Let's write each unique definition.
        unique_defs = list(dict.fromkeys(functions[fname]['definitions']))
        for i, d in enumerate(unique_defs, 1):
            if len(unique_defs) > 1:
                out.write(f"#### Version {i}\n")
            out.write(f"```sql\n{d}\n```\n\n")
        out.write("---\n\n")
        
    out.write("## Triggers\n\n")
    for tname in sorted(triggers.keys()):
        out.write(f"### Trigger: `{tname}`\n")
        out.write(f"- **Migrations involved**: {', '.join(sorted(list(triggers[tname]['files'])))}\n\n")
        unique_defs = list(dict.fromkeys(triggers[tname]['definitions']))
        for i, d in enumerate(unique_defs, 1):
            if len(unique_defs) > 1:
                out.write(f"#### Version {i}\n")
            out.write(f"```sql\n{d}\n```\n\n")
        out.write("---\n\n")

print("Parsing of functions and triggers complete.")
