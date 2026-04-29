const fs = require('fs');
const file = 'src/pages/LaunchVideo.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Rename SupsasScene -> KelabScene and SupsasPanel -> KelabPanel
content = content.replace(/function SupsasScene/g, 'function KelabScene');
content = content.replace(/function SupsasPanel/g, 'function KelabPanel');
content = content.replace(/<SupsasScene /g, '<KelabScene ');
content = content.replace(/<SupsasPanel /g, '<KelabPanel ');

// 2. Add 6th Module to MODULES
const modulesIdx = content.indexOf('const MODULES = [');
if (modulesIdx > -1) {
  const endModulesIdx = content.indexOf('];', modulesIdx);
  const modulesText = content.slice(modulesIdx, endModulesIdx);
  if (!modulesText.includes('SUPSAS & Karnival')) {
    const newModule = `  { name: 'SUPSAS & Karnival',   tagline: 'Karnival paling havoc tahun ini.',           features: ['Sukaneka & E-Sports','Konsert Malam Kebudayaan','Gerai jualan & food truck'],               nc:'text-fuchsia-400', gc:'#d946ef', dc:'bg-fuchsia-400',  bg:'bg-fuchsia-600' },\n`;
    content = content.slice(0, endModulesIdx) + newModule + content.slice(endModulesIdx);
  }
}

// 3. Update LaunchVideo timeline - CORRECTLY with the comma!
content = content.replace('setTimeout(() => setPhase(15), 81000)', 'setTimeout(() => doWipe(5), 81000)');
content = content.replace('setTimeout(() => setPhase(16), 85000)', 'setTimeout(() => setPhase(15), 93000),\n      setTimeout(() => setPhase(16), 97000)');
content = content.replace('setTimeout(() => setPhase(17), 89000)', 'setTimeout(() => setPhase(17), 101000)');
content = content.replace('setTimeout(() => setPhase(18), 91000)', 'setTimeout(() => setPhase(18), 103000)');
content = content.replace('setTimeout(() => setPhase(19), 97000)', 'setTimeout(() => setPhase(19), 109000)');
content = content.replace('setTimeout(() => setPhase(20), 102000)', 'setTimeout(() => setPhase(20), 114000)');

// 4. Update moduleIdx render mapping
const renderBlock = `{moduleIdx === 4 && <KelabScene mod={MODULES[4]} />}`;
if (content.includes(renderBlock) && !content.includes('<KarnivalScene')) {
  content = content.replace(renderBlock, renderBlock + `\n            {moduleIdx === 5 && <KarnivalScene mod={MODULES[5]} />}`);
}

// 5. Inject KarnivalScene function right after KelabPanel (formerly SupsasPanel)
const karnivalSceneCode = `
// ——— Scene 06: Karnival & SUPSAS — "Havoc Festival" ——————————————————————————
function KarnivalScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const gc = mod.gc;

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Strobe lights & background
      setTimeout(() => setAct(2), 1500),  // Giant SUPSAS glitch
      setTimeout(() => setAct(3), 3000),  // Cards explode in
      setTimeout(() => setAct(4), 4500),  // Continuous bouncing / confetti
      setTimeout(() => setAct(5), 6500),  // Module overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  const cards = [
    { label: 'Gerai Makanan', icon: '🍔', delay: 0, x: -15, y: -10, r: -6 },
    { label: 'Sukan E-Sports', icon: '🎮', delay: 0.1, x: 15, y: -15, r: 8 },
    { label: 'Malam Kebudayaan', icon: '🎸', delay: 0.2, x: -20, y: 15, r: -12 },
    { label: 'Sukaneka', icon: '🎯', delay: 0.3, x: 18, y: 18, r: 10 },
  ];

  return (
    <CinematicEnvelope gc={gc}>
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{perspective:'1500px'}}>
        
        {/* Phase 1+: Strobe lights & Particles */}
        <AnimatePresence>
          {act >= 1 && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 pointer-events-none">
              {/* Aggressive strobe */}
              <motion.div animate={{opacity:[0.1, 0.4, 0.05, 0.5, 0.1]}} transition={{duration:0.4, repeat:Infinity, ease:'linear'}} className="absolute inset-0" style={{background:\`radial-gradient(ellipse at 50% 50%, \${gc}60 0%, transparent 70%)\`}} />
              <ParticleField gc={gc} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2+: Giant SUPSAS Glitch */}
        <AnimatePresence>
          {act >= 2 && act < 4 && (
            <motion.div 
              initial={{scale:2, opacity:0, filter:'blur(40px)'}} 
              animate={{scale:1, opacity:1, filter:'blur(0px)', x:[0,-20,20,-10,10,0], y:[0,10,-10,5,-5,0]}} 
              exit={{scale:0.5, opacity:0, filter:'blur(20px)'}}
              transition={{duration:1, x:{duration:0.4, repeat:3}, y:{duration:0.3, repeat:4}}} 
              className="absolute z-10">
              <h1 className="font-black italic text-center leading-none tracking-tighter" style={{fontSize:'18vw', color:'#fff', textShadow:\`0 0 80px \${gc}, -10px 0 0 #0ff, 10px 0 0 #f0f\`}}>
                HAVOC
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 3+: Festival Cards Explode In */}
        <AnimatePresence>
          {act >= 3 && (
            <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} transition={{duration:1, ease:CE}} className="absolute inset-0 flex items-center justify-center">
              
              <motion.div
                animate={{y:[0, -20, 0], rotateX:[0, 5, 0]}}
                transition={{duration:4, repeat:Infinity, ease:'easeInOut'}}
                className="relative z-20 text-center">
                <p className="text-[2vw] font-black uppercase tracking-[0.5em] mb-[1vw]" style={{color:gc, textShadow:\`0 0 30px \${gc}\`}}>SUPSAS & KARNIVAL 2026</p>
                <h2 className="text-[6vw] font-black leading-none text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">FESTIVAL<br/>KAMPUS</h2>
              </motion.div>

              {cards.map((c, i) => (
                <motion.div key={c.label}
                  initial={{x:0, y:0, scale:0, opacity:0, rotateZ:0}}
                  animate={{x:\`\${c.x}vw\`, y:\`\${c.y}vw\`, scale:1, opacity:1, rotateZ:c.r}}
                  transition={{delay:c.delay, type:'spring', stiffness:200, damping:12, mass:0.8}}
                  className="absolute z-30 p-[1.5vw] rounded-[1.5vw] border-2 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center"
                  style={{background:'rgba(20,5,20,0.8)', borderColor:gc+'80', backdropFilter:'blur(10px)'}}>
                  
                  {/* Bouncing Icon */}
                  <motion.div animate={{y:[0, -10, 0], scale:[1, 1.1, 1]}} transition={{duration:0.6, delay:i*0.1, repeat:Infinity, ease:'easeInOut'}} className="text-[4vw] mb-[0.5vw]">
                    {c.icon}
                  </motion.div>
                  <p className="text-[0.9vw] font-bold text-white text-center">{c.label}</p>

                </motion.div>
              ))}

            </motion.div>
          )}
        </AnimatePresence>

        <ModuleOverlay show={act>=5} num="Modul 06" name="SUPSAS & Karnival" tagline={mod.tagline} gc={gc} pos="bottom-[8%] right-[8%]" />
      </div>
    </CinematicEnvelope>
  );
}

function KarnivalPanel({ step, gc, dc, clicking }: { step:number; gc:string; dc:string; clicking:boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-[1vw] text-center gap-[0.5vw]">
      <motion.div animate={{rotate:[0,10,-10,0], scale:[1,1.2,1]}} transition={{duration:0.5, repeat:Infinity}} className="text-[3vw]">🎉</motion.div>
      <p className="text-[1.2vw] font-black" style={{color:gc}}>KARNIVAL HAVOC</p>
      <p className="text-[0.6vw] text-white/50">Bersedia untuk acara tahunan paling meriah!</p>
    </div>
  );
}
`;

const kelabPanelEnd = content.indexOf('function AtmosphereDots');
if (kelabPanelEnd > -1 && !content.includes('function KarnivalScene')) {
  content = content.slice(0, kelabPanelEnd) + karnivalSceneCode + content.slice(kelabPanelEnd);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Done modifying LaunchVideo.tsx for Supsas and Karnival');
