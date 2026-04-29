const fs = require('fs');
const b = fs.readFileSync('src/pages/LaunchVideo.tsx');
const s = b.toString('utf8');

// Find icon strings
const matches = [...s.matchAll(/icon:'([^']{1,12})'/g)];
for (const m of matches.slice(0, 15)) {
  const charCodes = [...m[1]].map(c => c.codePointAt(0).toString(16));
  console.log(`icon: ${JSON.stringify(m[1])} | codepoints: ${charCodes.join(' ')}`);
}

// Also find the specific Kebajikan chat avatar emoji
const idx2 = s.indexOf('🎫');
const idx3 = s.indexOf('\uD83C\uDFAB');
console.log('\n🎫 at index (utf-8 literal):', idx2);
console.log('\\uD83C\\uDFAB at index:', idx3);

// Check what's actually in the emoji slots for E-Kebajikan app header
const chatIdx = s.indexOf('Exco Kebajikan JPP');
if (chatIdx > 0) {
  const region = s.slice(chatIdx - 200, chatIdx + 10);
  // Find the emoji before this
  const emojiMatch = region.match(/>\s*(\S+)\s*<\/motion\.div/);
  if (emojiMatch) {
    const ch = emojiMatch[1];
    console.log('\nChat header icon:', JSON.stringify(ch), 'codepoint:', ch.codePointAt(0)?.toString(16));
  }
}
