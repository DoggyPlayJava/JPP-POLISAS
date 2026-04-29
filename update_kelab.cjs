const fs = require('fs');
let code = fs.readFileSync('c:/Users/Cyborg 15/Desktop/JPP-POLISAS-main/src/pages/LaunchVideo.tsx', 'utf8');

const slotMachineCode = `
// ─── Slot Machine Text ────────────────────────────────────────────────────────
function SlotMachineNumber({ target, active, gc, size='35vw' }: { target:string; active:boolean; gc:string; size?:string }) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if(!active) return;
    let t = 0;
    const end = parseInt(target) || 83;
    const interval = setInterval(() => {
      t++;
      if (t > 20) {
        setVal(end);
        clearInterval(interval);
      } else {
        setVal(Math.floor(Math.random() * 99));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [active, target]);
  return (
    <motion.p className="font-black leading-none" style={{fontSize:size,color:gc,lineHeight:1}}
      animate={active?{textShadow:[\`0 0 80px \${gc}60\`,\`0 0 150px \${gc}\`,\`0 0 80px \${gc}60\`,\`0 0 40px \${gc}30\`,\`0 0 80px \${gc}60\`]}:{textShadow:\`0 0 80px \${gc}60\`}}
      transition={{duration:0.5,repeat:active?2:0}}>{val}</motion.p>
  );
}
`;

if (!code.includes('function SlotMachineNumber')) {
  code = code.replace('// ─── Module Data ────────────────────────────────────────────────────────────', slotMachineCode + '\n// ─── Module Data ────────────────────────────────────────────────────────────');
}

// KelabScene update
code = code.replace(
  /<motion\.p className="font-black leading-none"[^>]+>83<\/motion\.p>/,
  '<SlotMachineNumber target="83" active={act>=2} gc={gc} />'
);

fs.writeFileSync('c:/Users/Cyborg 15/Desktop/JPP-POLISAS-main/src/pages/LaunchVideo.tsx', code, 'utf8');
console.log('Update complete');
