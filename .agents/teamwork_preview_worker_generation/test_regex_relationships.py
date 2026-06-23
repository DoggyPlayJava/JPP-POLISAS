import re

rel_block = """          {
            foreignKeyName: "akademik_files_folder_id_fkey"
            columns: ["folder_id"]
            referencedRelation: "akademik_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_files_owner_user_id_fkey"
            columns: ["owner_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },"""

# Test regex
pattern = r'\{\s*foreignKeyName:\s*"([^"]+)"\s*columns:\s*\["([^"]+)"\]\s*referencedRelation:\s*"([^"]+)"\s*referencedColumns:\s*\["([^"]+)"\]\s*\}'
matches = list(re.finditer(pattern, rel_block, re.DOTALL))
print("Matches found:", len(matches))
for m in matches:
    print(m.groups())
