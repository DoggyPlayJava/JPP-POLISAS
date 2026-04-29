const fs = require('fs');
const file = 'src/pages/LaunchVideo.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the chat header emoji and check what codepoints it has
const match = content.match(/>\s*(\S+)\s*<\/motion\.div>\s*[\s\S]{0,10}Exco Kebajikan/);
if (match) {
  const ch = match[1];
  console.log('Chat header region:', JSON.stringify(ch));
  const cps = [...ch].map(c => c.codePointAt(0).toString(16));
  console.log('Codepoints:', cps);
}

// Also check the variation selector issue with 🏛
const kelab = content.match(/\uD83C\uDFDB([^\uD83C\uDFAB]{0,6})/);
if (kelab) {
  console.log('After 🏛:', JSON.stringify(kelab[0].slice(2)));
  const cps = [...kelab[0].slice(2)].map(c => c.codePointAt(0).toString(16));
  console.log('Codepoints after:', cps);
}

// Search for remaining mojibake emoji (anything starting with 0xF0 mojibake)
const badPatterns = [...content.matchAll(/[\u00f0][\u0100-\u02ff][\u00a0-\u02ff][\u0080-\u00ff]/g)];
console.log('\nRemaining mojibake-like sequences:', badPatterns.length);
for (const m of badPatterns.slice(0, 10)) {
  const cps = [...m[0]].map(c => c.codePointAt(0).toString(16));
  console.log(' ', JSON.stringify(m[0]), '->', cps.join(' '));
}
