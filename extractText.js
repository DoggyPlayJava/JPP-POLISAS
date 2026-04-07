import fs from 'fs';
import unzipper from 'unzipper';

async function extractText(docPath, outPath) {
  try {
    const directory = await unzipper.Open.file(docPath);
    const documentXml = directory.files.find(d => d.path === 'word/document.xml');
    if (documentXml) {
      const buffer = await documentXml.buffer();
      const content = buffer.toString('utf8');
      const matches = content.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (matches) {
        const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
        fs.writeFileSync(outPath, text, 'utf8');
        console.log(`Successfully extracted ${docPath} to ${outPath}`);
      } else {
        console.log(`No text found in ${docPath}`);
      }
    } else {
      console.log(`word/document.xml not found in ${docPath}`);
    }
  } catch (e) {
    console.error(`Error reading ${docPath}:`, e.message);
  }
}

async function run() {
  await extractText('src/components/ai/FORMAT KERTAS KERJA (1).docx', 'format_kk.txt');
  await extractText('src/components/ai/KERTAS KERJA BPO.docx', 'bpo_kk.txt');
}

run();
