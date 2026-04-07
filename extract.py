import zipfile
import re

def extract(path, out):
    try:
        with zipfile.ZipFile(path, 'r') as z:
            xml = z.read('word/document.xml').decode('utf-8')
            text = re.sub(r'<[^>]*>', ' ', xml)
            text = re.sub(r'\s+', ' ', text)
            with open(out, 'w', encoding='utf-8') as f:
                f.write(text.strip())
            print(f"Extracted {path}")
    except Exception as e:
        print(f"Failed {path}: {e}")

extract(r'src/components/ai/FORMAT KERTAS KERJA (1).docx', 'format_kk.txt')
extract(r'src/components/ai/KERTAS KERJA BPO.docx', 'bpo_kk.txt')
