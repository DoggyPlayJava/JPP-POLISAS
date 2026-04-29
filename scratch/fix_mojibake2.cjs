/**
 * Surgical replacement of mojibake emoji strings in LaunchVideo.tsx
 * Replaces the garbled multi-byte sequences with proper unicode escapes.
 */
const fs = require('fs');

const file = 'src/pages/LaunchVideo.tsx';
let content = fs.readFileSync(file, 'utf8');

// Map of mojibake string (as it appears when read as UTF-8) → correct replacement
// These were identified by checking codepoints of the garbled chars
const replacements = [
  // Kebajikan chat avatar: 🎟 → use \uD83C\uDF9F
  ['\u00f0\u0178\u017d\u00ab', '\uD83C\uDFAB'],   // 🎫 ticket
  // Keusahawanan: 💰
  ['\u00f0\u0178\u2019\u00b0', '\uD83D\uDCB0'],   // 💰 money
  // Akademik: 📊
  ['\u00f0\u0178\u201c\u0160', '\uD83D\uDCCA'],   // 📊 chart
  // PolyMart: 🛒
  ['\u00f0\u0178\u203a\u2019', '\uD83D\uDED2'],   // 🛒 cart
  // Sistem Kelab: 🏛
  ['\u00f0\u0178\u008f\u203a', '\uD83C\uDFDB'],   // 🏛 classical building
  // Chat header: 🎓
  ['\u00f0\u0178\u017e\u201d', '\uD83C\uDF93'],   // 🎓 graduation cap
  // ⚡ lightning
  ['\u00e2\u0161\u00a1', '\u26A1'],               // ⚡
  // ✅ check
  ['\u00e2\u0153\u2026', '\u2705'],               // ✅
  // → arrow
  ['\u00e2\u2020\u2019', '\u2192'],               // →
  // ← arrow
  ['\u00e2\u2020\u201d', '\u2190'],               // ←
  // 🔔 bell
  ['\u00f0\u0178\u201d\u201d', '\uD83D\uDD14'],   // 🔔
  // 🏢 office
  ['\u00f0\u0178\u008f\u00a2', '\uD83C\uDFE2'],   // 🏢
  // ✓ checkmark
  ['\u00e2\u0153\u201d', '\u2713'],               // ✓
  // GOL! ⚽
  ['\u00e2\u009a\u00bd', '\u26BD'],               // ⚽
  // 🌐 globe
  ['\u00f0\u0178\u008c\u0090', '\uD83C\uDF10'],   // 🌐
  // 💡 bulb
  ['\u00f0\u0178\u2019\u00a1', '\uD83D\uDCA1'],   // 💡
  // ✔ heavy check
  ['\u00e2\u009c\u201d', '\u2714'],               // ✔
  // 🟢 green circle 
  ['\u00f0\u0178\u009f\u00a2', '\uD83D\uDFE2'],   // 🟢
  // 🎤 microphone
  ['\u00f0\u0178\u017e\u00a4', '\uD83C\uDF64'],
  // 🏆 trophy
  ['\u00f0\u0178\u008f\u2020', '\uD83C\uDFC6'],
  // ⭐ star
  ['\u00e2\u00ad\u0090', '\u2B50'],
  // 🌟 glowing star
  ['\u00f0\u0178\u008c\u009f', '\uD83C\uDF1F'],
  // 📱 mobile phone
  ['\u00f0\u0178\u201c\u00b1', '\uD83D\uDCF1'],
  // 📲 phone with arrow
  ['\u00f0\u0178\u201c\u00b2', '\uD83D\uDCF2'],
  // 🎵 music note
  ['\u00f0\u0178\u017e\u00b5', '\uD83C\uDFB5'],
  // em dash —
  ['\u00e2\u0080\u0094', '\u2014'],
  // middle dot ·  
  ['\u00c2\u00b7', '\u00b7'],
  // degree °
  ['\u00c2\u00b0', '\u00b0'],
];

let count = 0;
for (const [bad, good] of replacements) {
  const before = content;
  content = content.split(bad).join(good);
  if (content !== before) {
    count++;
    console.log(`✓ Fixed: U+${bad.codePointAt(0).toString(16).toUpperCase()} → ${good}`);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log(`\nDone. Replaced ${count}/${replacements.length} patterns.`);
