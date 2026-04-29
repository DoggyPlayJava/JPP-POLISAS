/**
 * Fixes mojibake (double-encoded UTF-8) in LaunchVideo.tsx.
 * PowerShell's Set-Content read the file as Windows-1252/Latin-1
 * and wrote it back as UTF-8, double-encoding all multi-byte chars.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/pages/LaunchVideo.tsx');

// Read the file as binary (Buffer)
const buf = fs.readFileSync(file);

// The mojibake pattern: UTF-8 bytes of a multi-byte char were
// interpreted as Latin-1 and re-encoded as UTF-8.
// To fix: decode the file as latin1, then re-encode each char
// that is >127 by treating 2-byte mojibake sequences as original UTF-8.
function fixMojibake(str) {
  // Strategy: for any sequence like Ã©, Â·, ð etc (mojibake),
  // re-interpret the UTF-16 code units as latin1 bytes, then decode as UTF-8
  const latin1Bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 0x00FF) {
      // True unicode char – keep as-is (push as UTF-8)
      const encoded = Buffer.from(str[i], 'utf8');
      for (const b of encoded) latin1Bytes.push(b);
    } else {
      latin1Bytes.push(code & 0xFF);
    }
  }
  // Now decode the raw bytes as UTF-8
  return Buffer.from(latin1Bytes).toString('utf8');
}

// Read as latin1 to get raw byte values as char codes
const latin1Content = buf.toString('latin1');
const fixed = fixMojibake(latin1Content);

// Verify the fix worked by checking for known good chars
const hasTick = fixed.includes('✅') || fixed.includes('🎫') || fixed.includes('→');
console.log('Contains expected unicode after fix:', hasTick);
console.log('File length before:', buf.length, 'after:', Buffer.byteLength(fixed, 'utf8'));

fs.writeFileSync(file, fixed, 'utf8');
console.log('Done — file written with correct UTF-8 encoding.');
