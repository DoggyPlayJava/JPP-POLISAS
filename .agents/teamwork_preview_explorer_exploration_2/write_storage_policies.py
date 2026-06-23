import os

grouped_md_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\grouped_ddl.md'
out_path = r'c:\Users\Cyborg 15\Desktop\JPP-POLISAS-main\.agents\teamwork_preview_explorer_exploration_2\storage_policies.txt'

with open(grouped_md_path, 'r', encoding='utf-8') as f:
    content = f.read()

rls_section = content.split('## 5. Row-Level Security (RLS) Policies')[1]
blocks = rls_section.split('### Source:')

with open(out_path, 'w', encoding='utf-8') as out:
    for b in blocks:
        if 'storage.objects' in b.lower() or 'bucket_id' in b.lower():
            out.write(f"### Source: {b.strip()}\n")
            out.write("="*60 + "\n\n")

print("Storage policies written.")
