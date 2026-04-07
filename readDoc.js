import mammoth from 'mammoth';
import fs from 'fs';

async function readDocument(filePath) {
    try {
        const result = await mammoth.extractRawText({path: filePath});
        return "\n=== FILE: " + filePath + " ===\n" + result.value;
    } catch (e) {
        console.error("Error reading file", filePath, e);
        return "";
    }
}

async function main() {
    let out = await readDocument('src/components/ai/TEMPLATE FORMAT MINIT MESYUARAT PROGRAM.docx');
    fs.writeFileSync("minit_out.txt", out, "utf8");
}

main();
