import os
import re

migrations_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\supabase\\migrations'
missing_tables = [
    'kamsis_applications',
    'kamsis_dynamic_fields',
    'klk_form_fields',
    'klk_kawasan',
    'klk_settings',
    'klk_student_residency',
    'klk_sync_log',
    'merit_program_applications',
    'merit_review_log',
    'polymart_cart_items',
    'program_attendees',
    'takwim_pusat'
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
            
    for t in missing_tables:
        # Match CREATE TABLE statement for the table name
        pattern = r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?' + t + r'\s*\((.*?)\);'
        matches = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)
        for m in matches:
            if t not in found:
                found[t] = []
            found[t].append((filename, m))

print(f"Found creations for {len(found)} of the 12 missing tables:")
for t, occurrences in found.items():
    print(f"\nTable: {t}")
    for fn, body in occurrences:
        print(f"  File: {fn}")
        # print first 3 lines of body
        lines = [l.strip() for l in body.split('\n') if l.strip()]
        for l in lines[:5]:
            print(f"    {l}")
        if len(lines) > 5:
            print("    ...")
