import os

migrations_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\supabase\\migrations'
tables = [
    'kamsis_applications',
    'kamsis_dynamic_fields',
    'klk_form_fields',
    'klk_kawasan',
    'klk_settings',
    'klk_student_residency',
    'klk_sync_log'
]

sql_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

found = {}
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
            
    for t in tables:
        if t in content:
            if t not in found:
                found[t] = []
            found[t].append(filename)

for t, files in found.items():
    print(f"Table {t} referenced in: {', '.join(files)}")
