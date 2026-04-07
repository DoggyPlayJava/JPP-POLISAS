import mammoth from 'mammoth';
import fs from 'fs';

async function readDocument(filePath, outPath) {
    try {
        const result = await mammoth.extractRawText({path: filePath});
        fs.writeFileSync(outPath, result.value, "utf8");
    } catch (e) {
        console.error("Error reading file", filePath, e);
    }
}

async function main() {
    await readDocument('src/components/ai/FORMAT KERTAS KERJA (1).docx', "kertas_kerja_format.txt");
    await readDocument('src/components/ai/KERTAS KERJA BPO.docx', "kertas_kerja_bpo.txt");
}

main();
