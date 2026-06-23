import os
import re

migrations_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\supabase\\migrations'
sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

functions = {}

# Regex to match function creation.
# Matches CREATE OR REPLACE FUNCTION name(...)
# Followed by any content, then $$ or $tag$ body, then closing $$ or $tag$, and some trailing options.
# A robust approach: find 'CREATE OR REPLACE FUNCTION <name>' and then find the closing semicolon of the block.
# Usually, a function block is:
# CREATE OR REPLACE FUNCTION ...
# AS $$ or AS $body$
# ...
# $$ or $body$ LANGUAGE ...;
# Let's extract by scanning the text.

for filename in sql_files:
    filepath = os.path.join(migrations_dir, filename)
    content = ""
    try:
        with open(filepath, 'r', encoding='utf-16') as f:
            content = f.read()
    except Exception:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception:
            continue
            
    # Find all function starts
    # We can search for 'CREATE' followed by 'OR REPLACE' (optional) and 'FUNCTION'
    matches = re.finditer(r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(', content, re.IGNORECASE)
    for m in matches:
        func_name = m.group(1).lower()
        start_idx = m.start()
        
        # Now we search for the closing semicolon of the CREATE FUNCTION statement.
        # Since the body uses $$ or $tag$, a simple scan for semicolon is not enough because the body has semicolons.
        # We need to find the matching dollar quotes or find the semicolon after the closing dollar quote.
        # Let's search for dollar quotes in the function body.
        # Find the first AS or IS followed by $...$
        body_start_match = re.search(r'AS\s+(\$[a-zA-Z0-9_]*\$)', content[start_idx:], re.IGNORECASE)
        if not body_start_match:
            # Maybe it doesn't use AS $tag$, e.g. AS '...' or just $$
            body_start_match = re.search(r'AS\s+(\$\$\s*)', content[start_idx:], re.IGNORECASE)
            
        if body_start_match:
            tag = body_start_match.group(1).strip()
            tag_escaped = re.escape(tag)
            # Find the next occurrence of the tag in the text
            tag_start_pos = start_idx + body_start_match.end()
            tag_end_match = re.search(tag_escaped, content[tag_start_pos:])
            if tag_end_match:
                end_pos = tag_start_pos + tag_end_match.end()
                # Find the next semicolon after end_pos
                semicolon_idx = content.find(';', end_pos)
                if semicolon_idx != -1:
                    full_func_sql = content[start_idx:semicolon_idx + 1].strip()
                    # Store function, overwrite older files
                    functions[func_name] = {
                        'file': filename,
                        'sql': full_func_sql
                    }
                else:
                    # Fallback to end of file
                    full_func_sql = content[start_idx:end_pos + 100].strip()
                    functions[func_name] = {
                        'file': filename,
                        'sql': full_func_sql
                    }
        else:
            # Fallback if no dollar quotes (e.g. simple function returning table or expression)
            # Find next semicolon that is not in parentheses?
            # Let's search for next semicolon
            semicolon_idx = content.find(';', start_idx)
            if semicolon_idx != -1:
                full_func_sql = content[start_idx:semicolon_idx + 1].strip()
                functions[func_name] = {
                    'file': filename,
                    'sql': full_func_sql
                }

# Save results
with open('extracted_functions.json', 'w') as out:
    import json
    json.dump(functions, out, indent=2)

print(f"Extracted {len(functions)} unique functions.")
for name in sorted(functions.keys()):
    print(f"- {name} (from {functions[name]['file']})")
