import os
import re
import json

migrations_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\supabase\\migrations'
sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

enums = []
tables = {}
functions = {}
triggers = {}
policies = {}
indexes = {}

def read_file(filepath):
    # Read UTF-16 or UTF-8
    try:
        with open(filepath, 'r', encoding='utf-16') as f:
            return f.read()
    except Exception:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()

# Helper to normalize schema prefix public.
def clean_name(name):
    name = name.strip().lower()
    if name.startswith('public.'):
        name = name[7:]
    return name

for filename in sql_files:
    filepath = os.path.join(migrations_dir, filename)
    content = read_file(filepath)
    
    # 1. Parse CREATE TYPE (Enums)
    # e.g., CREATE TYPE polyrent_status AS ENUM ('OPEN', 'CLOSED', 'HIDDEN');
    type_matches = re.finditer(r'CREATE\s+TYPE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\((.*?)\);', content, re.I | re.DOTALL)
    for m in type_matches:
        tname = clean_name(m.group(1))
        values = m.group(2).strip()
        enums.append({
            'name': tname,
            'values': values,
            'file': filename,
            'sql': m.group(0).strip()
        })
        
    # Also handle ALTER TYPE ... ADD VALUE
    alter_type_matches = re.finditer(r'ALTER\s+TYPE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+ADD\s+VALUE\s+[^;]+;', content, re.I)
    for m in alter_type_matches:
        tname = clean_name(m.group(1))
        enums.append({
            'name': tname,
            'alter': True,
            'file': filename,
            'sql': m.group(0).strip()
        })

    # 2. Parse CREATE TABLE
    # Find positions where CREATE TABLE starts
    ct_matches = re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(', content, re.I)
    for m in ct_matches:
        tname = clean_name(m.group(1))
        start_idx = m.start()
        # Find open parenthesis of columns block
        open_paren_idx = content.find('(', start_idx)
        if open_paren_idx == -1:
            continue
        
        # Track parentheses to extract table body
        paren_cnt = 1
        pos = open_paren_idx + 1
        table_body = "("
        while pos < len(content) and paren_cnt > 0:
            char = content[pos]
            if char == '(':
                paren_cnt += 1
            elif char == ')':
                paren_cnt -= 1
                table_body += char
                if paren_cnt == 0:
                    break
                pos += 1
                continue
            table_body += char
            pos += 1
            
        # Find the ending semicolon
        semi_idx = content.find(';', pos)
        full_sql = content[start_idx:semi_idx+1].strip() if semi_idx != -1 else content[start_idx:pos].strip()
        
        if tname not in tables:
            tables[tname] = []
        tables[tname].append({
            'type': 'create',
            'file': filename,
            'sql': full_sql
        })

    # Also extract ALTER TABLE modifications (especially ADD COLUMN or ADD CONSTRAINT)
    alter_table_matches = re.finditer(r'ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+([^;]+);', content, re.I | re.DOTALL)
    for m in alter_table_matches:
        tname = clean_name(m.group(1))
        body = m.group(2).strip()
        if tname not in tables:
            tables[tname] = []
        tables[tname].append({
            'type': 'alter',
            'file': filename,
            'sql': m.group(0).strip()
        })

    # 3. Parse FUNCTIONS
    # Capturing multiline function definitions properly.
    # A function definition starts with CREATE [OR REPLACE] FUNCTION ... and ends with LANGUAGE plpgsql/sql (possibly with trigger modifiers) or $$; or $body$;
    func_starts = list(re.finditer(r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)', content, re.I))
    for idx, fs in enumerate(func_starts):
        fname = clean_name(fs.group(1))
        start_pos = fs.start()
        
        # Scan forward to find the end of the function.
        # We search for LANGUAGE plpgsql or LANGUAGE sql, followed by the end of body.
        # Or more robustly: look for the closing dollar-quote ($$...$$ or $body$...$body$ or $func$...$func$) and then semicolon.
        # Let's scan for the next CREATE OR REPLACE FUNCTION, or end of file, or check for dollar-quotes.
        # Actually, let's find the matching dollar quotes inside the function body.
        # First, find where dollar quote starts (e.g. $$ or $body$ or $function$)
        dq_match = re.search(r'\$[a-zA-Z0-9_]*\$', content[start_pos:])
        if dq_match:
            dq_str = dq_match.group(0)
            # Find the closing dollar quote of the same type
            first_dq_idx = start_pos + dq_match.end()
            second_dq_idx = content.find(dq_str, first_dq_idx)
            if second_dq_idx != -1:
                # Read until the next semicolon after second dollar quote
                end_idx = content.find(';', second_dq_idx + len(dq_str))
                if end_idx != -1:
                    full_func_sql = content[start_pos:end_idx+1].strip()
                    functions[fname] = {
                        'file': filename,
                        'sql': full_func_sql
                    }
                    continue
        
        # Fallback: find until semicolon if no dollar quotes (rare for function body)
        end_idx = content.find(';', start_pos)
        if end_idx != -1:
            full_func_sql = content[start_pos:end_idx+1].strip()
            functions[fname] = {
                'file': filename,
                'sql': full_func_sql
            }

    # 4. Parse TRIGGERS
    # e.g., CREATE TRIGGER name BEFORE/AFTER ON table FOR EACH ROW EXECUTE FUNCTION fn();
    trigger_matches = re.finditer(r'CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([a-zA-Z0-9_]+)\s+[^;]+;', content, re.I | re.DOTALL)
    for m in trigger_matches:
        trig_name = clean_name(m.group(1))
        # Find the table name: ON table_name
        tbl_match = re.search(r'\bON\s+(?:public\.)?([a-zA-Z0-9_]+)', m.group(0), re.I)
        tbl_name = clean_name(tbl_match.group(1)) if tbl_match else 'unknown'
        
        key = f"{tbl_name}.{trig_name}"
        triggers[key] = {
            'name': trig_name,
            'table': tbl_name,
            'file': filename,
            'sql': m.group(0).strip()
        }

    # 5. Parse POLICIES
    # e.g., CREATE POLICY "name" ON table ... ;
    # To handle quote marks correctly
    policy_matches = re.finditer(r'CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)\s+[^;]+;', content, re.I | re.DOTALL)
    for m in policy_matches:
        pol_name = m.group(1)
        tbl_name = clean_name(m.group(2))
        
        if tbl_name not in policies:
            policies[tbl_name] = []
        policies[tbl_name].append({
            'name': pol_name,
            'file': filename,
            'sql': m.group(0).strip()
        })

    # Also handle DROP POLICY statements so we don't include dropped policies
    drop_policy_matches = re.finditer(r'DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+);', content, re.I)
    for m in drop_policy_matches:
        pol_name = m.group(1)
        tbl_name = clean_name(m.group(2))
        if tbl_name in policies:
            # Filter out the dropped policy
            policies[tbl_name] = [p for p in policies[tbl_name] if p['name'] != pol_name]

    # 6. Parse INDEXES
    # e.g., CREATE [UNIQUE] INDEX [IF NOT EXISTS] name ON table (cols);
    index_matches = re.finditer(r'CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\((.*?)\)\s*(?:WHERE\s+[^;]+)?;', content, re.I | re.DOTALL)
    for m in index_matches:
        idx_name = clean_name(m.group(1))
        tbl_name = clean_name(m.group(2))
        indexes[idx_name] = {
            'table': tbl_name,
            'file': filename,
            'sql': m.group(0).strip()
        }

output_data = {
    'enums': enums,
    'tables': tables,
    'functions': functions,
    'triggers': triggers,
    'policies': policies,
    'indexes': indexes
}

output_path = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\.agents\\teamwork_preview_worker_generation_replacement\\extracted_sql_components.json'
with open(output_path, 'w') as out:
    json.dump(output_data, out, indent=2)

print(f"Extraction complete.")
print(f"Enums extracted: {len(enums)}")
print(f"Tables referenced in creations/alterations: {len(tables)}")
print(f"Functions extracted (final versions): {len(functions)}")
print(f"Triggers extracted: {len(triggers)}")
print(f"Policies extracted (active): {sum(len(pols) for pols in policies.values())}")
print(f"Indexes extracted: {len(indexes)}")
