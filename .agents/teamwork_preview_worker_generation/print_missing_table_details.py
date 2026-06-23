import json

with open('parsed_ts_tables.json', 'r') as f:
    ts_data = json.load(f)

tables = [
    'kamsis_applications',
    'kamsis_dynamic_fields',
    'klk_form_fields',
    'klk_kawasan',
    'klk_settings',
    'klk_student_residency',
    'klk_sync_log'
]

for t in tables:
    if t in ts_data:
        print(f"\nTable: {t}")
        print("  Columns:")
        for col, typ in ts_data[t]['columns'].items():
            print(f"    - {col}: {typ}")
        print("  Relationships:")
        for rel in ts_data[t]['relationships']:
            print(f"    - {rel['col']} -> {rel['ref_table']}.{rel['ref_col']} ({rel['fk_name']})")
    else:
        print(f"\nTable: {t} NOT FOUND in TS data")
