import json

with open('extracted_policies.json', 'r') as f:
    policies = json.load(f)

for t in ['profiles', 'kamsis_applications', 'demerit_appeals', 'student_club_memberships']:
    if t in policies:
        print(f"\nTable: {t}")
        for p in policies[t]:
            print(f"  File: {p['file']}")
            print(f"    SQL: {p['sql']}")
