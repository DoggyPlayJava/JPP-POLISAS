const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/LaunchVideo.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix corrupted multi-byte sequences → correct UTF-8 emoji/chars
const fixes = [
  // Corrupted emojis from PowerShell Set-Content
  ['\u00f0\u009f\u008e\u0093', '\uD83C\uDF93'],  // 🎓 graduation cap
  ['\u00f0\u009f\u008e\u009f', '\uD83C\uDF9F'],  // 🎟 ticket
  ['\u00f0\u009f\u008e\u00ac', '\uD83C\uDFAC'],  // 🎬 clapboard
  ['\u00f0\u009f\u0087\u00b7', '\uD83C\uDDF7'],  // 🏷
  ['\u00f0\u009f\u009b\u0082', '\uD83C\uDFE2'],  // 🏢 office building
  ['\u00f0\u009f\u0094\u0094', '\uD83D\uDD14'],  // 🔔 bell
  ['\u00f0\u009f\u008c\u0090', '\uD83C\uDF10'],  // 🌐 globe
  // En-dash and quotes
  ['\u00e2\u0080\u0094', '\u2014'],   // em dash —
  ['\u00e2\u0080\u0098', '\u2018'],   // ' left single quote
  ['\u00e2\u0080\u0099', '\u2019'],   // ' right single quote
  ['\u00e2\u0080\u009c', '\u201c'],   // " left double quote
  ['\u00e2\u0080\u009d', '\u201d'],   // " right double quote
  // Middle dot
  ['\u00c2\u00b7', '\u00b7'],         // ·
  ['\u00c2\u00b0', '\u00b0'],         // °
  // Arrows
  ['\u00e2\u0086\u0092', '\u2192'],   // →
  ['\u00e2\u0086\u0090', '\u2190'],   // ←
  // Checkmark
  ['\u00e2\u009c\u0085', '\u2705'],   // ✅
  ['\u00e2\u009c\u0094', '\u2714'],   // ✔
  // Box drawing corrupted to garbled (in comments – safe to clean)
  ['\u00e2\u0094\u0080', '\u2500'],   // ─
  ['\u00e2\u0080\u0093', '\u2013'],   // – en dash
  // Specific corrupted avatar emoji seen in screenshot
  ['\u00c3\u00b0\u00c5\u00b8\u00cb\u0086\u00c5\u00bd\u00e2\u0080\u009c', '\uD83E\uDD87'],  // 🦇 (fallback)
];

let count = 0;
for (const [bad, good] of fixes) {
  if (content.includes(bad)) {
    content = content.split(bad).join(good);
    count++;
    console.log(`Fixed: ${JSON.stringify(bad)} → ${good}`);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log(`\nDone. Fixed ${count} patterns.`);
