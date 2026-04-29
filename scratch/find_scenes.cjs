const fs=require('fs'); 
const lines=fs.readFileSync('src/pages/LaunchVideo.tsx','utf8').split('\n'); 
let s1 = lines.findIndex(l=>l.includes('function KebajikanScene')); 
let e1 = lines.findIndex((l,i)=>i>s1 && l.includes('function KebajikanPanel')); 
let s2 = lines.findIndex(l=>l.includes('function SupsasScene')); 
let e2 = lines.findIndex((l,i)=>i>s2 && l.includes('function AtmosphereDots')); 
console.log('Kebajikan:', s1, 'to', e1, '\nSupsas:', s2, 'to', e2);
