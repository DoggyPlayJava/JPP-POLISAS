with open(r'.agents/teamwork_preview_explorer_exploration_2/grouped_ddl.md', 'r', encoding='utf-8') as f:
    content = f.read()

tables_section = content.split('## 3. Create / Alter Tables')[1].split('## 4. Custom')[0]

with open(r'.agents/teamwork_preview_explorer_exploration_2/table_details.txt', 'w', encoding='utf-8') as out:
    out.write(tables_section)

print("Tables written.")
