import os

views = ['v_hpnm_by_jabatan', 'v_merit_by_jabatan', 'v_takwim_global']
root_dir = 'c:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main'

for root, dirs, files in os.walk(root_dir):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    if '.git' in dirs:
        dirs.remove('.git')
    for file in files:
        filepath = os.path.join(root, file)
        # Read the file with fallback encoding
        content = b""
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
        except Exception:
            continue
            
        for v in views:
            v_bytes = v.encode('utf-8')
            v_utf16le = v.encode('utf-16le')
            v_utf16be = v.encode('utf-16be')
            if v_bytes in content or v_utf16le in content or v_utf16be in content:
                print(f"Found {v} in file: {filepath}")
