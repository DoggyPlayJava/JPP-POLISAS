import json

with open('c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\types\\database.types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

try:
    # Let's wrap it in json.loads
    ts_code = json.loads(content)
    print("Successfully decoded TS code.")
    print("TS Code starts with:")
    print(ts_code[:200])
except Exception as e:
    print("Failed to decode as JSON:", e)
