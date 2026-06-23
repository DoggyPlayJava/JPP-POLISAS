import os
import re

migrations_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\supabase\\migrations'
output_file = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\.agents\\teamwork_preview_worker_generation\\all_create_tables.txt'

sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

with open(output_file, 'w', encoding='utf-8') as out:
    for filename in sql_files:
        filepath = os.path.join(migrations_dir, filename)
        
        # Read the file with fallback encoding (some are UTF-16LE, some UTF-8)
        content = ""
        try:
            with open(filepath, 'r', encoding='utf-16') as f:
                content = f.read()
        except Exception:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                out.write(f"\n--- ERROR READING {filename}: {e} ---\n")
                continue
        
        out.write(f"\n============================================================\n")
        out.write(f"FILE: {filename}\n")
        out.write(f"============================================================\n")
        
        # Find all CREATE TABLE blocks
        # We can search for CREATE TABLE and capture until the matching parenthesis or next STATEMENT.
        # But a simple regex search or writing the whole file contents is also fine.
        # Let's extract blocks matching CREATE TABLE/TYPE/DOMAIN/POLICY/FUNCTION/TRIGGER
        matches = re.finditer(r'(CREATE\s+(?:TABLE|TYPE|DOMAIN|POLICY|OR\s+REPLACE\s+FUNCTION|TRIGGER|UNIQUE\s+INDEX|INDEX)\s+[^;]+;)', content, re.IGNORECASE)
        for m in matches:
            out.write(m.group(1) + "\n\n")

print("Created all_create_tables.txt")
