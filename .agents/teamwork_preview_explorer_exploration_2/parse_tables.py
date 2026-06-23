import re

grouped_md_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\grouped_ddl.md'
output_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\parsed_tables.md'

with open(grouped_md_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the Create / Alter Tables section
tables_section = content.split('## 3. Create / Alter Tables')[1].split('## 4. Custom')[0]

# Split by "### Source:"
blocks = tables_section.split('### Source:')

tables = {} # table_name -> { 'create': [], 'alters': [], 'file': '' }

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
        
        # Check if it's CREATE TABLE
        create_match = re.search(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?("?\w+"?)', sql, re.IGNORECASE)
        if create_match:
            tname = create_match.group(1).replace('"', '')
            if tname not in tables:
                tables[tname] = {'create': [], 'alters': [], 'files': set()}
            tables[tname]['create'].append(sql)
            tables[tname]['files'].add(fname)
            continue
            
        # Check if it's ALTER TABLE
        alter_match = re.search(r'ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?("?\w+"?)', sql, re.IGNORECASE)
        if alter_match:
            tname = alter_match.group(1).replace('"', '')
            if tname not in tables:
                tables[tname] = {'create': [], 'alters': [], 'files': set()}
            tables[tname]['alters'].append(sql)
            tables[tname]['files'].add(fname)

with open(output_path, 'w', encoding='utf-8') as out:
    out.write("# Database Tables Defined or Modified\n\n")
    
    # Sort tables alphabetically
    for tname in sorted(tables.keys()):
        out.write(f"## Table: `{tname}`\n")
        out.write(f"- **Migrations involved**: {', '.join(sorted(list(tables[tname]['files'])))}\n\n")
        
        if tables[tname]['create']:
            out.write("### Creation DDL\n")
            for c in tables[tname]['create']:
                out.write(f"```sql\n{c}\n```\n\n")
                
        if tables[tname]['alters']:
            out.write("### Alteration DDL\n")
            for a in tables[tname]['alters']:
                out.write(f"```sql\n{a}\n```\n\n")
                
        out.write("---\n\n")

print("Parsing of tables complete.")
