const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI("AIzaSyCRqLiYJjvdRedcRhmhro6wH8fFFARxc60");

function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

async function run() {
  // Using flash version
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const dir = path.join(__dirname, "src", "components", "ai", "Contoh Kertas Kerja");
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpeg'));
  
  const imageParts = files.map(f => fileToGenerativePart(path.join(dir, f), "image/jpeg"));
  
  const prompt = "Please look closely at these pages of a completed 'Kertas Kerja'. Extract the complete format and layout of this document. List every section number, the exact title of the section, what typically goes in it, the exact layout of any tables (columns, headers), and the exact format of the signature blocks or approval boxes down to the precise label texts. Output an extensive structural guide focusing strictly on replicating this exact format. Give it in Malay.";

  try {
    console.log("Generating analysis...");
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    fs.writeFileSync("kertas_kerja_analysis.txt", text);
    console.log("Analysis saved to kertas_kerja_analysis.txt");
  } catch (e) {
    console.error(e);
  }
}

run();
