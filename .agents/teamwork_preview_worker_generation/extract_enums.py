import json
import re

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if content.strip().startswith('"'):
    content = json.loads(content)

# Look for public: { Enums: { ... } }
matches = list(re.finditer(r'Enums:\s*\{', content))
print("Enums matches found:", len(matches))
for m in matches:
    start_pos = m.end()
    # Let's read the block matching braces
    brace_count = 1
    current_pos = start_pos
    enums_content = ""
    while brace_count > 0 and current_pos < len(content):
        char = content[current_pos]
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
        enums_content += char
        current_pos += 1
    
    # Print the parsed block if not empty
    if enums_content.strip() and "never" not in enums_content:
        print("Enums block:")
        print(enums_content)
