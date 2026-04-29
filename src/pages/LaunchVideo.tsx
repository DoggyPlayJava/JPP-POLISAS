import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

const SE = [0.25, 1, 0.5, 1] as const;
const INTER = { fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif" };

// ─── Film Grain Overlay ─────────────────────────────────────────────────────────────
function FilmGrain() {
  return (
    <>
      <style>{`@keyframes fg{0%{transform:translate(0,0)}10%{transform:translate(-5px,-10px)}20%{transform:translate(-15px,5px)}30%{transform:translate(7px,-25px)}40%{transform:translate(-5px,25px)}50%{transform:translate(-15px,10px)}60%{transform:translate(15px,0)}70%{transform:translate(0,15px)}80%{transform:translate(3px,35px)}90%{transform:translate(-10px,10px)}}`}</style>
      <div className="fixed inset-0 z-[95] pointer-events-none overflow-hidden" style={{mixBlendMode:'overlay',opacity:0.045}}>
        <div style={{position:'absolute',inset:'-50%',backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,animation:'fg 0.25s steps(1) infinite'}}/>
      </div>
    </>
  );
}

// ─── Exploding Particles ───────────────────────────────────────────────────────
function ExplodingParticles({ active, emoji, count=12 }: { active:boolean; emoji:string; count?:number }) {
  if(!active) return null;
  const particles = useMemo(()=>Array.from({length:count},(_,i)=>({
    id:i, 
    x:(Math.random()-0.5)*600, 
    y:-150-(Math.random()*300), 
    r:(Math.random()-0.5)*720,
    s:Math.random()*0.8+0.5,
    d:Math.random()*0.15
  })), [count]);
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[100]">
      {particles.map(p=>(
        <motion.div key={p.id} initial={{x:0,y:0,scale:0,rotate:0,opacity:0}}
          animate={{x:p.x,y:[0,p.y,p.y+400],scale:p.s,rotate:p.r,opacity:[0,1,1,0]}}
          transition={{duration:1.5,delay:p.d,times:[0,0.15,0.8,1],ease:[0.25,1,0.5,1]}}
          className="absolute text-[4vw] filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]" style={{transformStyle:'preserve-3d'}}>{emoji}</motion.div>
      ))}
    </div>
  );
}

// ─── Confetti Cannon ──────────────────────────────────────────────────────────
function ConfettiCannon({ active }: { active:boolean }) {
  if(!active) return null;
  const colors = ['#f97316','#d946ef','#14b8a6','#3b82f6','#eab308'];
  const confetti = useMemo(()=>Array.from({length:80},(_,i)=>({
    id:i,
    x:(Math.random()-0.5)*1200,
    y:(Math.random()-0.5)*1000,
    r:Math.random()*360,
    s:Math.random()*1.5+0.5,
    c:colors[Math.floor(Math.random()*colors.length)],
    d:Math.random()*0.3
  })), []);
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[110]" style={{perspective:'1000px'}}>
      {confetti.map(c=>(
        <motion.div key={c.id} initial={{x:0,y:200,scale:0,rotate:0,opacity:0}}
          animate={{x:c.x,y:[200,c.y-400,c.y+800],scale:c.s,rotate:c.r+720,opacity:[0,1,1,0]}}
          transition={{duration:3,delay:c.d,ease:[0.25,1,0.5,1]}}
          className="absolute w-[1vw] h-[1vw] rounded-sm" style={{background:c.c, transformStyle:'preserve-3d', boxShadow:'0 5px 10px rgba(0,0,0,0.5)'}} />
      ))}
    </div>
  );
}

// ─── Holographic Data Rings ───────────────────────────────────────────────────
function HoloRings({ active, gc }: { active:boolean; gc:string }) {
  if(!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{perspective:'800px', zIndex:5}}>
      {[1, 2, 3].map((ring) => (
        <motion.div key={ring}
          initial={{opacity:0, scale:0.5, rotateX:80}}
          animate={{opacity:[0, 0.4, 0.1, 0.5], scale:ring*1.5, rotateZ:360, rotateX:75}}
          transition={{
            opacity: { duration: 2, ease:'easeInOut' },
            scale: { duration: 2, ease: 'easeOut' },
            rotateZ: { duration: 15 + ring*5, repeat:Infinity, ease:'linear' }
          }}
          className="absolute rounded-full border-2 border-dashed"
          style={{
            width:`${ring*15}vw`, height:`${ring*15}vw`,
            borderColor: gc,
            boxShadow: `0 0 15px ${gc}, inset 0 0 15px ${gc}`,
            transformStyle:'preserve-3d'
          }}
        />
      ))}
    </div>
  );
}

// ─── Radar Scan ───────────────────────────────────────────────────────────
function RadarScan({ active, gc }: { active:boolean; gc:string }) {
  if(!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
      <motion.div initial={{scale:0, opacity:0}} animate={{scale:1, opacity:0.15}} transition={{duration:1}} className="absolute rounded-full border" style={{width:'60vw', height:'60vw', borderColor:gc}} />
      <motion.div initial={{scale:0, opacity:0}} animate={{scale:1, opacity:0.3}} transition={{duration:1, delay:0.2}} className="absolute rounded-full border" style={{width:'30vw', height:'30vw', borderColor:gc}} />
      <motion.div
        initial={{opacity:0}} animate={{opacity:1, rotate: 360}}
        transition={{opacity:{duration:1}, rotate:{duration: 3, repeat: Infinity, ease: "linear"}}}
        className="absolute w-[60vw] h-[60vw] rounded-full"
        style={{ background: `conic-gradient(from 0deg, ${gc}00 0%, ${gc}10 70%, ${gc}80 100%)` }}
      />
    </div>
  );
}


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
      animate={active?{textShadow:[`0 0 80px ${gc}60`,`0 0 150px ${gc}`,`0 0 80px ${gc}60`,`0 0 40px ${gc}30`,`0 0 80px ${gc}60`]}:{textShadow:`0 0 80px ${gc}60`}}
      transition={{duration:0.5,repeat:active?2:0}}>{val}</motion.p>
  );
}

// ─── Module Data ────────────────────────────────────────────────────────────
const MODULES = [
  { name: 'E-Kebajikan',     tagline: 'Suara anda, keutamaan kami.',               features: ['Aduan diselesaikan dalam 24 jam','Tracking status masa nyata','Sokongan kecemasan pelajar'],   nc:'text-teal-400',   gc:'#14b8a6', dc:'bg-teal-400',   bg:'bg-teal-600' },
  { name: 'E-Keusahawanan',  tagline: 'Niaga dengan lebih bijak.',                 features: ['Sistem POS yang canggih','Laporan jualan masa nyata','Integrasi PolyMart'],                      nc:'text-green-400',  gc:'#22c55e', dc:'bg-green-400',  bg:'bg-green-600' },
  { name: 'E-Akademik',      tagline: 'Ilmu teratur, masa depan cerah.',           features: ['Pemantauan CGPA & pencapaian','Sistem mata merit digital','Folder dokumen peribadi'],            nc:'text-emerald-400', gc:'#10b981', dc:'bg-emerald-400', bg:'bg-emerald-600' },
  { name: 'PolyMart',        tagline: 'Kedai pelajar, dalam genggaman.',           features: ['Jual & beli antara pelajar','Pengesahan produk oleh JPP','Pengurusan pesanan digital'],           nc:'text-orange-400',  gc:'#f97316', dc:'bg-orange-400',  bg:'bg-orange-600' },
  { name: 'Sistem Kelab',    tagline: 'Kelab bersatu, kenangan abadi.',             features: ['Pengurusan ahli & kelab','Rekod aktiviti & laporan','Papan pemuka Exco digital'],               nc:'text-red-400',     gc:'#ef4444', dc:'bg-red-400',     bg:'bg-red-600' },
  { name: 'SUPSAS & Karnival',   tagline: 'Karnival paling havoc tahun ini.',           features: ['Sukaneka & E-Sports','Konsert Malam Kebudayaan','Gerai jualan & food truck'],               nc:'text-fuchsia-400', gc:'#d946ef', dc:'bg-fuchsia-400',  bg:'bg-fuchsia-600' },
];

// ─── Timeline ───────────────────────────────────────────────────────────────
const TL: [number, number][] = [
  [1,2000],[2,4000],[3,6000],[4,6200],[5,7000],
  [6,10000],[7,13000],[8,16000],[9,18000],
  [10,21000],[11,33000],[12,45000],[13,57000],[14,69000],
  [15,81000],[16,85000],[17,89000],[18,91000],[19,97000],[20,102000],
];

const LABELS = ['Pain 1','Pain 2','Pain 3','Flash','Silence','Sudah Tamat',
  'Vision 1','Vision 2','Memperkenalkan','JPP DIGITAL',
  'E-Kebajikan','E-Keusahawanan','E-Akademik','PolyMart','Sistem Kelab',
  'Product Reveal','Modul Text','Fly Away','The Numbers','Final Logo','Outro'];

// ─── Main ───────────────────────────────────────────────────────────────────
export function LaunchVideo() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  const [showHUD, setShowHUD] = useState(false);
  const [moduleIdx, setModuleIdx] = useState(-1);
  const [wipeColor, setWipeColor] = useState('#6366f1');
  const [wiping, setWiping] = useState(false);
  const [ripples, setRipples] = useState<{id:number;x:number;y:number}[]>([]);
  const rippleId = useRef(0);

  useEffect(() => {
    // Animate wipe across screen, swap module, then reveal
    const doWipe = (idx: number) => {
      setWipeColor(MODULES[idx].gc);
      setWiping(true);
      setTimeout(() => {
        setModuleIdx(idx);
        setTimeout(() => setWiping(false), 40);
      }, 380);
    };

    const tl = [
      setTimeout(() => setPhase(1),  8000),   // JPP DIGITAL Burst + Warp Sequence
      setTimeout(() => { setPhase(10); setModuleIdx(0); }, 12000), // E-Kebajikan starts directly from the warp flash
      setTimeout(() => doWipe(1), 24000),     // E-Keusahawanan
      setTimeout(() => doWipe(2), 36000),     // E-Akademik
      setTimeout(() => doWipe(3), 48000),     // PolyMart
      setTimeout(() => doWipe(4), 60000),     // Sistem Kelab
      setTimeout(() => doWipe(5), 72000),     // Karnival & SUPSAS
      setTimeout(() => setPhase(15), 84000),  // Product Reveal
      setTimeout(() => setPhase(16), 88000),  // Modul Text
      setTimeout(() => setPhase(17), 92000),  // Fly Away
      setTimeout(() => setPhase(18), 94000),  // The Numbers
      setTimeout(() => setPhase(19), 100000), // Final Logo
      setTimeout(() => setPhase(20), 105000), // Outro
    ];
    return () => tl.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const show = () => { setShowHUD(true); clearTimeout(t); t = setTimeout(() => setShowHUD(false), 2000); };
    window.addEventListener('mousemove', show);
    return () => { window.removeEventListener('mousemove', show); clearTimeout(t); };
  }, []);
  // Click ripple handler
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const id = ++rippleId.current;
      setRipples(r => [...r, {id, x:e.clientX, y:e.clientY}]);
      setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 700);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden relative select-none" style={{ perspective:'2000px', ...INTER }}>

      <AnimatePresence mode="wait">
        
        {/* New Cinematic 3D Phone Intro Sequence */}
        {phase === 0 && <PhoneMockupIntro key="intro" />}

        {/* JPP DIGITAL PORTAL Supernova Warp Reveal */}
        {phase === 1 && <JppPortalSupernova key="p1" />}

        {/* Module Deep-Dives — rendered by moduleIdx, transitions via wipe overlay */}
        {phase >= 10 && phase < 15 && moduleIdx >= 0 && (
          <ModuleSlide key={`mod${moduleIdx}`} mod={MODULES[moduleIdx]} idx={moduleIdx} />
        )}

        {/* The Numbers */}
        {phase === 18 && <TheNumbers key="nums" />}

        {/* Final Logo */}
        {phase === 19 && (
          <motion.div key="p19" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,scale:0.95}} transition={{duration:2}} className="absolute inset-0 flex flex-col items-center justify-center gap-[2vw]">
            <motion.div initial={{width:'0vw'}} animate={{width:'60vw'}} transition={{duration:2,ease:SE}} className="h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
            <motion.h1 initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:0.5,duration:2,ease:SE}} className="text-[8vw] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-300 to-white">
              JPP DIGITAL
            </motion.h1>
            <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.5,duration:2}} className="text-[1.5vw] font-light tracking-[0.5em] text-white/40 uppercase">
              Politeknik Sultan Haji Ahmad Shah
            </motion.p>
            <motion.div initial={{width:'0vw'}} animate={{width:'60vw'}} transition={{delay:0.5,duration:2,ease:SE}} className="h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Reveal (outside AnimatePresence to avoid float conflict) */}
      {phase >= 15 && phase < 18 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{transformStyle:'preserve-3d'}}>
          <AtmosphereDots />
          <motion.div initial={{opacity:0}} animate={{opacity:0.35}} transition={{duration:3}} className="absolute w-[60vw] h-[60vw] bg-indigo-600 rounded-full blur-[150px]" />
          <div className="absolute left-[8vw] w-[38vw] flex flex-col justify-center h-full gap-[1.5vw] z-10">
            <Mask show={phase>=16} delay={0.5} text="Satu Ekosistem." cls="text-[4vw] font-black tracking-tight text-white" />
            <Mask show={phase>=16} delay={0.9} text="5 Modul Bersepadu. Tanpa Kompromi." cls="text-[1.5vw] font-light tracking-widest text-white/50" />
          </div>
          <FloatingMockup flyAway={phase===17} />
        </div>
      )}

      {/* Outro */}
      <AnimatePresence>
        {phase >= 20 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:2}} className="absolute inset-0 flex flex-col items-center justify-center bg-[#030014] overflow-hidden" style={{perspective:'2000px'}}>
            
            {/* Swirling Vortex Background with Particles */}
            <motion.div 
              animate={{rotate:360}} transition={{duration:60, repeat:Infinity, ease:'linear'}} 
              className="absolute inset-0 w-[200vw] h-[200vw] -left-[50vw] -top-[50vw] pointer-events-none opacity-50 mix-blend-screen"
              style={{background:'conic-gradient(from 0deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.3) 25%, transparent 50%, rgba(99,102,241,0.3) 75%, rgba(139,92,246,0.1) 100%)'}}
            />
            
            {/* Upward drifting particles */}
            <div className="absolute inset-0 pointer-events-none z-0">
              {[...Array(30)].map((_, i) => (
                <motion.div key={i}
                  initial={{y:'100vh', opacity:0, scale:Math.random()*0.5+0.5}}
                  animate={{y:'-20vh', opacity:[0,0.6,0]}}
                  transition={{duration:Math.random()*5+5, repeat:Infinity, delay:Math.random()*5, ease:'linear'}}
                  className="absolute w-[4px] h-[4px] bg-indigo-300 rounded-full blur-[1px]"
                  style={{left:Math.random()*100+'vw'}}
                />
              ))}
            </div>

            {/* Floating Title Parallax */}
            <motion.div 
              initial={{y:-200, scale:5, opacity:0}} 
              animate={{y:[0, -10, 0], scale:1, opacity:1}} 
              transition={{y:{duration:6, repeat:Infinity, ease:'easeInOut'}, scale:{duration:1, type:'spring', bounce:0.4}, opacity:{duration:1}}} 
              className="flex flex-col items-center mt-[-8vw] z-20"
            >
              <h1 className="text-[7vw] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-300 drop-shadow-[0_0_40px_rgba(99,102,241,1)]">JPP POLISAS</h1>
              <p className="text-[1.2vw] font-light tracking-[0.8em] text-indigo-400 uppercase mt-[0.5vw]">Revolusi Ekosistem Digital</p>
            </motion.div>

            <motion.div initial={{scale:0.5, opacity:0, rotateX:60}} animate={{scale:1, opacity:1, rotateX:0}} transition={{delay:1, duration:1.5, type:'spring'}} className="mt-[4vw] flex flex-col items-center z-20 relative">
              
              {/* 3D Holographic Pedestal Vault */}
              <div className="relative flex justify-center items-center" style={{transformStyle:'preserve-3d'}}>
                {/* Pedestal Base with Laser Ring */}
                <motion.div animate={{rotateZ:360}} transition={{duration:20, repeat:Infinity, ease:'linear'}} className="absolute w-[22vw] h-[22vw] rounded-full border-[2px] border-indigo-500/50" style={{transform:'translateZ(-50px) rotateX(75deg)', boxShadow:'0 0 60px rgba(99,102,241,0.4), inset 0 0 30px rgba(99,102,241,0.2)'}} />
                
                {/* Laser Scanning Ring (Moves Up and Down) */}
                <motion.div animate={{z:[-50, 20, -50], opacity:[0.2, 0.8, 0.2]}} transition={{duration:4, repeat:Infinity, ease:'easeInOut'}} className="absolute w-[20vw] h-[20vw] rounded-full border-[3px] border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,1)]" style={{transform:'rotateX(75deg)'}} />
                
                <motion.div animate={{rotateZ:-360}} transition={{duration:15, repeat:Infinity, ease:'linear'}} className="absolute w-[16vw] h-[16vw] rounded-full border border-dashed border-purple-500/80" style={{transform:'translateZ(-30px) rotateX(75deg)'}} />
                
                {/* Hologram Glitch QR Code Block */}
                <motion.div 
                  animate={{rotateY:[-5, 5, -5], y:[0, -10, 0]}} 
                  transition={{duration:6, repeat:Infinity, ease:'easeInOut'}}
                  className="bg-white/95 p-[1vw] rounded-[1vw] shadow-[0_30px_60px_rgba(99,102,241,0.6),_0_0_120px_rgba(139,92,246,0.4)] border border-white relative z-10 overflow-hidden"
                >
                  {/* Scanline Overlay */}
                  <motion.div animate={{y:['-20%', '120%']}} transition={{duration:2, repeat:Infinity, ease:'linear'}} className="absolute inset-0 w-full h-[15%] bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent pointer-events-none z-20" />
                  <QRCode value="https://jpp.cipher-node.org" size={Math.round(window.innerWidth * 0.12)} fgColor="#0f172a" />
                </motion.div>
              </div>

              <motion.p animate={{y:[0, -5, 0]}} transition={{duration:4, repeat:Infinity, ease:'easeInOut'}} className="text-[1.5vw] font-black tracking-widest mt-[5vw] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">Sedia Untuk Diakses.</motion.p>
              <p className="text-[1.2vw] font-light tracking-[0.4em] text-white/60 mt-[0.5vw]">jpp.cipher-node.org</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:50}} animate={{opacity:1, y:0}} transition={{delay:2, duration:1.5, type:'spring'}} className="absolute bottom-[3vw] w-full flex flex-col items-center gap-[1.5vw] z-30">
              
              {/* Cinematic Premium Button */}
              <div className="relative flex items-center justify-center group">
                {/* Soft Glowing Outer Pulse */}
                <motion.div animate={{scale:[1, 1.1, 1], opacity:[0.5, 0.8, 0.5]}} transition={{duration:3, repeat:Infinity, ease:'easeInOut'}} className="absolute inset-[-1vw] rounded-full bg-indigo-500/20 blur-[20px] pointer-events-none" />
                
                <button onClick={()=>navigate('/login')} className="relative overflow-hidden px-[5vw] py-[1.2vw] rounded-full text-white font-black text-[1.2vw] hover:scale-105 transition-all tracking-[0.2em] uppercase cursor-pointer border border-white/20 bg-black/40 backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                  {/* Subtle inner gloss */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  
                  {/* Smooth sweep */}
                  <motion.div className="absolute inset-0 pointer-events-none mix-blend-overlay" animate={{x:['-100%', '200%']}} transition={{duration:3, repeat:Infinity, repeatDelay:2, ease:'easeInOut'}} style={{background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', width:'50%', transform:'skewX(-20deg)'}} />
                  
                  MASUK KE PORTAL
                </button>
              </div>

              <p className="text-[0.65vw] tracking-[0.3em] text-white/30 uppercase font-light drop-shadow-md">
                Dibangunkan oleh Majlis Perwakilan Pelajar POLISAS &copy; 2026.
              </p>
            </motion.div>

            {/* Supernova Slam Flash */}
            <motion.div initial={{opacity:1}} animate={{opacity:0}} transition={{duration:1.5, ease:'easeOut'}} className="absolute inset-0 bg-white pointer-events-none z-[100]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── AFTER EFFECTS WIPE TRANSITION OVERLAY ─────────────────────────
          A solid colored panel (matching outgoing module's brand color) slides
          in from the LEFT covering the screen. Module swaps underneath.
          The panel then slides OUT to the RIGHT, revealing the new module.
          A bright leading-edge "slash" streak gives the cinematic AE feel.
      ──────────────────────────────────────────────────────────────────── */}
      {/* ─── COLOR BAR WIPE — AE-style slash wipe between modules ─── */}
      <AnimatePresence>
        {wiping && (
          <motion.div key="wipe" className="absolute inset-0 z-[60] pointer-events-none overflow-hidden"
            initial={{ x: '-110%' }} animate={{ x: '0%' }} exit={{ x: '110%' }}
            transition={{ duration: 0.32, ease: [0.76, 0, 0.24, 1] }}
            style={{ background: wipeColor, boxShadow: `inset -4px 0 0 rgba(255,255,255,0.25), 0 0 80px 30px ${wipeColor}80` }}
          >
            {/* Leading slash streak */}
            <div className="absolute right-0 top-0 bottom-0 w-[6vw]"
              style={{ background: `linear-gradient(to right, transparent, rgba(255,255,255,0.55), rgba(255,255,255,0.15))`, transform:'skewX(-8deg) translateX(3vw)' }} />
            {/* Diagonal texture lines */}
            {[0,1,2,3,4].map(i => (
              <div key={i} className="absolute top-0 bottom-0" style={{ left:`${15+i*18}%`, width:'1px', background:'rgba(255,255,255,0.08)', transform:'skewX(-12deg)' }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Presenter HUD */}
      <AnimatePresence>
        {showHUD && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}} className="fixed bottom-3 left-3 z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">
              {phase+1}/21 — {LABELS[phase]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Film Grain ──────────────────────────────────────────────────────── */}
      <FilmGrain />

      {/* ── Click Ripples ───────────────────────────────────────────────── */}
      {ripples.map(r => (
        <motion.div key={r.id}
          className="fixed pointer-events-none z-[98] rounded-full border border-white/50"
          style={{left: r.x - 20, top: r.y - 20, width:40, height:40}}
          initial={{scale:0.5, opacity:0.8}}
          animate={{scale:4, opacity:0}}
          transition={{duration:0.65, ease:[0.2,0,0,1]}} />
      ))}

      {/* ── Chapter Slate — persistent module indicator bottom-right ───── */}
      <AnimatePresence>
        {phase >= 10 && phase < 15 && moduleIdx >= 0 && (
          <motion.div key={`cs${moduleIdx}`}
            initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:20}}
            transition={{duration:0.6, ease:[0.76,0,0.24,1]}}
            className="fixed bottom-[4.5%] right-[3%] z-[97] text-right pointer-events-none">
            <p className="text-[0.5vw] font-mono tracking-[0.3em] uppercase" style={{color: MODULES[moduleIdx].gc + '90'}}>Modul</p>
            <p className="text-[1.4vw] font-black leading-none" style={{color: MODULES[moduleIdx].gc}}>
              {String(moduleIdx+1).padStart(2,'0')} <span className="text-white/20 font-light">/ 05</span>
            </p>
            <p className="text-[0.45vw] font-light tracking-[0.2em] text-white/30 uppercase mt-[0.2vw]">
              {MODULES[moduleIdx].name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Progress Bar — 1px bottom timeline tracker ───────────────── */}
      <motion.div className="fixed bottom-0 left-0 h-[2px] z-[99] pointer-events-none"
        style={{ originX: 0, background: moduleIdx >= 0 ? MODULES[moduleIdx].gc : '#6366f1' }}
        animate={{ scaleX: phase / 20 }}
        transition={{ duration: 1, ease: [0.76,0,0.24,1] }} />
    </div>
  );
}

// ─── GlitchText — Pain point text with chromatic aberration + shake ────────────────────────────────
// ─── PhoneMockupIntro ────────────────────────────────────────────────────────
function PhoneMockupIntro() {
  const [act, setAct] = useState(0);

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 5500), // Phase 1: Touch Ripple on Button
      setTimeout(() => setAct(2), 6000), // Phase 2: Fade Out Drift
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#030303] overflow-hidden" style={{perspective: '2000px'}}>
      
      {/* Cinematic Aurora Glow */}
      <motion.div animate={act >= 2 ? {opacity: 0} : {rotate:360, scale:[1, 1.1, 1], opacity:[0.1, 0.2, 0.1]}} transition={act >= 2 ? {duration: 1.5} : {duration:20, repeat:Infinity, ease:'linear'}} className="absolute w-[60vw] h-[60vw] bg-indigo-900 rounded-full blur-[150px]" />
      <motion.div animate={act >= 2 ? {opacity: 0} : {rotate:-360, scale:[1, 1.2, 1], opacity:[0.05, 0.15, 0.05]}} transition={act >= 2 ? {duration: 1.5} : {duration:25, repeat:Infinity, ease:'linear'}} className="absolute w-[50vw] h-[50vw] bg-purple-900 rounded-full blur-[120px] mix-blend-screen" />

      {/* Premium Glass Phone Model */}
      <motion.div 
        initial={{y:'100vh', rotateX:40, rotateY:-20, rotateZ:10, scale:0.7, opacity: 0, filter: 'blur(20px)'}}
        animate={
          act >= 2
            ? { y: '20vh', rotateX: 45, rotateY: 0, rotateZ: 0, scale: 0.9, opacity: 0, filter: 'blur(20px)' } // Sleek fade drift
            : {
                y:[ '100vh', 0, 0, 0 ], 
                rotateX:[20, 15, 20], 
                rotateY:[-15, -5, -15], 
                rotateZ:[-5, 0, -5], 
                scale:[0.7, 1, 1, 1],
                opacity: 1,
                filter: 'blur(0px)'
              }
        }
        transition={
          act >= 2
            ? { duration: 1.5, ease: [0.25, 1, 0.5, 1] } // Smooth drift out
            : {
                y: {duration:8, times:[0, 0.25, 0.85, 1], ease:'easeInOut'},
                scale: {duration:8, times:[0, 0.25, 0.85, 1], ease:'easeInOut'},
                opacity: {duration:1},
                filter: {duration:1},
                rotateX: {duration:10, repeat:Infinity, ease:'easeInOut'},
                rotateY: {duration:15, repeat:Infinity, ease:'easeInOut'},
                rotateZ: {duration:12, repeat:Infinity, ease:'easeInOut'},
              }
        }
        className="relative w-[24vw] h-[48vw] rounded-[3.5vw] bg-[#050508] border-[0.4vw] border-[#3a3a46] flex flex-col overflow-hidden"
        style={{boxShadow:'0 50px 100px rgba(0,0,0,0.9), inset 0 0 20px rgba(255,255,255,0.1), inset 0 0 5px rgba(255,255,255,0.3)', transformStyle:'preserve-3d'}}
      >
        {/* Dynamic Island / Notch */}
        <div className="absolute top-[1.2vw] left-1/2 -translate-x-1/2 w-[7vw] h-[2vw] bg-black rounded-[1vw] z-50 flex items-center justify-end px-[0.5vw] shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
          <div className="w-[0.6vw] h-[0.6vw] bg-indigo-500/50 rounded-full" />
        </div>

        {/* Gloss Overlay for glass realism */}
        <div className="absolute inset-0 z-40 pointer-events-none rounded-[3vw]" style={{background:'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)'}} />

        {/* Simulated Landing Page Content */}
        <div className="w-full h-full bg-[#030014] relative z-10 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-[1.5vw] py-[4vw] border-b border-white/10 backdrop-blur-md bg-black/20">
            <div className="flex items-center gap-[0.5vw]">
              <div className="w-[1.5vw] h-[1.5vw] rounded-sm bg-gradient-to-br from-indigo-500 to-purple-600" />
              <div className="flex flex-col">
                <span className="text-[0.6vw] font-black leading-none text-white tracking-widest">JPP</span>
                <span className="text-[0.4vw] font-bold leading-none text-white/50 tracking-widest">POLISAS</span>
              </div>
            </div>
            <div className="w-[4vw] h-[1.2vw] bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-[0.4vw] font-bold text-white uppercase tracking-widest">Login</span>
            </div>
          </div>

          {/* Hero Section */}
          <div className="flex flex-col items-center text-center mt-[8vw] px-[2vw]">
            <span className="px-[1vw] py-[0.4vw] rounded-full border border-indigo-500/30 bg-indigo-500/10 text-[0.5vw] text-indigo-300 font-medium tracking-widest mb-[2vw]">
              PORTAL RASMI V2.0
            </span>
            <h1 className="text-[2.2vw] font-black leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 mb-[1.5vw]">
              Suara Pelajar,<br/>Pemangkin<br/>Politeknik.
            </h1>
            <p className="text-[0.8vw] leading-relaxed text-white/40 mb-[3vw]">
              Platform digital pintar untuk menyatukan ekosistem JPP POLISAS.
            </p>
            
            <div className="w-full flex flex-col gap-[1vw]">
              {/* Interactive Button */}
              <motion.div 
                animate={act >= 1 ? { scale: 0.95, backgroundColor: "#e2e8f0" } : { scale: 1, backgroundColor: "#ffffff" }}
                transition={{ duration: 0.2 }}
                className="relative w-full py-[1vw] rounded-full flex items-center justify-center text-black font-bold text-[0.7vw] shadow-[0_0_20px_rgba(255,255,255,0.3)] overflow-hidden"
              >
                LOG MASUK PORTAL
                {/* Touch Ripple */}
                <AnimatePresence>
                  {act >= 1 && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0.5 }}
                      animate={{ scale: 4, opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute w-[4vw] h-[4vw] bg-black/20 rounded-full"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
              <div className="w-full py-[1vw] border border-white/20 rounded-full flex items-center justify-center text-white font-bold text-[0.7vw]">
                KETAHUI LANJUT
              </div>
            </div>
          </div>

          {/* Cards floating in background */}
          <div className="absolute bottom-[-5vw] left-0 right-0 flex justify-center gap-[1vw] opacity-40">
             <div className="w-[10vw] h-[15vw] bg-white/5 rounded-[1vw] border border-white/10" />
             <div className="w-[10vw] h-[15vw] bg-white/5 rounded-[1vw] border border-white/10 mt-[2vw]" />
          </div>

        </div>
      </motion.div>
    </div>
  );
}

// ─── JppPortalSupernova — Cinematic warp and supernova text reveal ─────────
function JppPortalSupernova() {
  const [fade, setFade] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setFade(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020205] overflow-hidden" style={{perspective: '1000px'}}>
      
      {/* Cinematic Deep Space / Nebula */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 mix-blend-screen pointer-events-none">
        <motion.div animate={{rotate:360, scale:[1,1.2,1]}} transition={{duration:40, repeat:Infinity, ease:'linear'}} className="absolute w-[100vw] h-[100vw] bg-indigo-900/30 rounded-full blur-[150px] mix-blend-screen" />
        <motion.div animate={{rotate:-360, scale:[1,1.5,1]}} transition={{duration:50, repeat:Infinity, ease:'linear'}} className="absolute w-[80vw] h-[80vw] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <motion.div 
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={fade 
          ? { opacity: 0, scale: 1.5, filter: 'blur(20px)' } 
          : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
        }
        transition={fade 
          ? { duration: 0.8, ease: 'easeIn' } 
          : { duration: 3, ease: [0.25, 1, 0.5, 1] }
        }
      >
        <h1 className="text-[8vw] font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-500 drop-shadow-[0_20px_40px_rgba(99,102,241,0.5)] text-center">
          JPP DIGITAL<br/>PORTAL
        </h1>
        
        <motion.h2 
          initial={{ opacity: 0, letterSpacing: '0.1em' }}
          animate={fade ? { opacity: 0 } : { opacity: 0.6, letterSpacing: '0.6em' }}
          transition={{ delay: 1.5, duration: 2, ease: 'easeOut' }}
          className="text-[1vw] mt-[2.5vw] font-light text-white uppercase text-center drop-shadow-md"
        >
          Mengangkat Potensi, Mencorak Transformasi
        </motion.h2>

        {/* Elegant Cinematic Flare */}
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[1px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent mix-blend-screen"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={fade ? { opacity:0 } : { scaleX: 1, opacity: 0.5 }}
          transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
        />
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20vw] h-[20vw] bg-indigo-500 rounded-full blur-[100px] mix-blend-screen"
          initial={{ opacity: 0 }}
          animate={fade ? { opacity:0 } : { opacity: 0.4 }}
          transition={{ duration: 2, delay: 0.5 }}
        />
      </motion.div>

      {/* Cinematic Fade Out */}
      <AnimatePresence>
        {fade && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.8 }} 
            className="absolute inset-0 bg-[#050508] z-50 pointer-events-none" 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── BigText ────────────────────────────────────────────────────────────────
function BigText({ text, weight='light', opacity=60 }: { text:string; weight?:string; opacity?:number }) {
  return (
    <motion.div initial={{opacity:0,scale:0.98}} animate={{opacity:1,scale:1}} exit={{opacity:0,filter:'blur(10px)'}} transition={{duration:1.5}} className="absolute inset-0 flex items-center justify-center">
      <h1 className={`text-[3vw] font-${weight} tracking-[0.1em] text-white/${opacity}`}>{text}</h1>
    </motion.div>
  );
}

// ─── FloatAiChip ─────────────────────────────────────────────────────────────
function FloatAiChip({ show, message }: { show:boolean; message:string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="ai"
          initial={{opacity:0, x:40, filter:'blur(10px)'}}
          animate={{opacity:1, x:0, filter:'blur(0px)'}}
          exit={{opacity:0, x:20, filter:'blur(6px)'}}
          transition={{duration:0.6, ease:[0.34,1.56,0.64,1]}}
          className="absolute bottom-[14%] right-[4%] z-40 flex items-end gap-[0.6vw]">
          <motion.div
            initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}
            transition={{delay:0.15, duration:0.5, ease:[0.76,0,0.24,1]}}
            className="px-[0.9vw] py-[0.55vw] rounded-[0.6vw] border border-white/15 shadow-2xl max-w-[20vw]"
            style={{background:'rgba(15,10,40,0.92)', backdropFilter:'blur(12px)', boxShadow:'0 8px 32px rgba(124,58,237,0.3)'}}>
            <p className="text-[0.7vw] text-white/40 uppercase tracking-widest mb-[0.2vw] font-medium">JPP AI Assistant</p>
            <p className="text-[0.75vw] text-white/85 leading-relaxed">{message}</p>
          </motion.div>
          <motion.div
            animate={{scale:[1,1.1,1], boxShadow:['0 0 15px #7c3aed60','0 0 35px #7c3aed90','0 0 15px #7c3aed60']}}
            transition={{duration:2.5, repeat:Infinity, ease:'easeInOut'}}
            className="w-[3.2vw] h-[3.2vw] rounded-full flex items-center justify-center flex-shrink-0"
            style={{background:'linear-gradient(135deg,#6d28d9,#7c3aed,#5b21b6)'}}>
            <span className="text-[1.3vw]">✦</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── ModuleSlide — wraps each scene with an opening Title Slam card ─────────────────────────────
function ModuleSlide({ mod, idx }: { mod: typeof MODULES[0]; idx: number }) {
  const [slam, setSlam] = useState(true);
  const Scenes = [KebajikanScene, KeusahawananScene, AkademikScene, PolyMartScene, KelabScene, KarnivalScene];
  const Scene = Scenes[idx];

  useEffect(() => {
    // Show slam card for 1.2s, then crash-cut to the scene
    const t = setTimeout(() => setSlam(false), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute inset-0">
      <AnimatePresence mode="wait">
        {slam ? (
          /* ─── TITLE SLAM CARD ─── */
          <motion.div key="slam" className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden"
            exit={{opacity:0, scale:1.12}}
            transition={{duration:0.3, ease:[0.76,0,0.24,1]}}
            style={{ willChange: "transform, opacity" }}>
            {/* Background color wash */}
            <motion.div className="absolute inset-0"
              initial={{opacity:0}} animate={{opacity:0.12}}
              transition={{duration:0.4}}
              style={{background: mod.gc}} />
            {/* Module number */}
            <div className="text-center z-10 px-[4vw]">
              <motion.p
                initial={{opacity:0, y:15}} animate={{opacity:1, y:0}}
                transition={{duration:0.35, ease:[0.76,0,0.24,1]}}
                className="text-[1vw] font-light tracking-[0.6em] uppercase mb-[1.5vw]"
                style={{color: mod.gc}}>
                {String(idx+1).padStart(2,'0')} &mdash; 05
              </motion.p>
              <motion.h1
                initial={{y:80, opacity:0, scale:0.85}}
                animate={{y:0, opacity:1, scale:1}}
                transition={{duration:0.5, ease:[0.34,1.56,0.64,1], delay:0.08}}
                className="font-black text-white leading-[0.88] tracking-tight"
                style={{fontSize:'11vw', textShadow:`0 0 100px ${mod.gc}50`}}>
                {mod.name}
              </motion.h1>
              <motion.div
                initial={{scaleX:0, originX:0}} animate={{scaleX:1}}
                transition={{duration:0.6, ease:[0.76,0,0.24,1], delay:0.2}}
                className="h-[2px] mt-[1.5vw] mx-auto w-[20vw]"
                style={{background:`linear-gradient(to right, transparent, ${mod.gc}, transparent)`}} />
            </div>
            {/* Diagonal texture lines for AE feel */}
            {[...Array(6)].map((_,i) => (
              <div key={i} className="absolute top-0 bottom-0 pointer-events-none"
                style={{left:`${10+i*16}%`, width:'1px', background:`${mod.gc}15`, transform:'skewX(-18deg)'}} />
            ))}
          </motion.div>
        ) : (
          /* ─── ACTUAL SCENE ─── */
          <motion.div key="scene" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.25}} className="absolute inset-0">
            <Scene mod={mod} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Cinematic easing curves (AE-equivalent) ─────────────────────────────────
const CE = [0.76, 0, 0.24, 1] as const;    // Smooth cinematic ease (main containers)
const RE = [0.77, 0, 0.175, 1] as const;   // Reveal ease (mask lifts, wipes)
const PE = [0.34, 1.56, 0.64, 1] as const; // Punch/impact ease (hero moments)

// Spring presets (for interactive punchy elements only)
const sp  = (d=0) => ({ type:'spring' as const, stiffness:280, damping:28, delay:d });
const spB = (d=0) => ({ type:'spring' as const, stiffness:420, damping:22, delay:d });
const spS = (d=0) => ({ type:'spring' as const, stiffness:160, damping:32, delay:d });

// ─── TextReveal — THE signature AE mask-lift technique ────────────────────────
// Text rises from behind a bottom mask — exactly what Apple/Nothing use in launches
function TextReveal({ text, delay=0, className='', style={} }: {
  text:string; delay?:number; className?:string; style?:React.CSSProperties;
}) {
  return (
    <div style={{overflow:'hidden', display:'block'}}>
      <motion.div
        initial={{y:'110%'}} animate={{y:'0%'}}
        transition={{duration:0.75, ease:RE, delay}}
        className={className} style={style}
      >{text}</motion.div>
    </div>
  );
}

// ─── ModuleOverlay — shared bottom-left module title across all scenes ─────────
function ModuleOverlay({ show, num, name, tagline, gc, pos='bottom-[6%] left-[5%]' }: {
  show:boolean; num:string; name:string; tagline:string; gc:string; pos?:string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="ov"
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          transition={{duration:0.4, ease:CE}}
          className={`absolute z-30 ${pos}`}
        >
          <TextReveal text={num}     delay={0}    className="text-[0.8vw] font-medium tracking-[0.5em] uppercase mb-[0.3vw]" style={{color:gc}} />
          <TextReveal text={name}    delay={0.12} className="text-[4.5vw] font-black text-white leading-[0.9] tracking-tight" />
          <TextReveal text={tagline} delay={0.24} className="text-[0.95vw] font-light text-white/45 mt-[0.4vw]" />
          <motion.div
            initial={{scaleX:0,originX:0}} animate={{scaleX:1}} exit={{scaleX:0,originX:0}}
            transition={{duration:0.9, ease:RE, delay:0.36}}
            className="h-px mt-[0.7vw] w-[10vw]"
            style={{background:`linear-gradient(to right, ${gc}cc, transparent)`}}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Particle Field ───────────────────────────────────────────────────────────
const PTCLS = Array.from({length:16},(_,i)=>({ id:i, x:8+((i*19)%84), y:8+((i*23)%80), s:1+((i*5)%3), dur:8+((i*4)%10), dl:i*0.5 }));
function ParticleField({ gc }: { gc:string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {PTCLS.map(p=>(
        <motion.div key={p.id} className="absolute rounded-full"
          style={{left:`${p.x}%`,top:`${p.y}%`,width:p.s,height:p.s,background:gc+'80'}}
          animate={{y:[-20,20,-20],opacity:[0.04,0.35,0.04]}}
          transition={{duration:p.dur,repeat:Infinity,delay:p.dl,ease:'easeInOut'}}/>
      ))}
      {[0,1,2,3].map(i=>(
        <motion.div key={`ds${i}`} className="absolute h-px"
          style={{top:`${15+i*22}%`,width:'60px',background:`linear-gradient(to right,transparent,${gc}60,transparent)`}}
          animate={{x:['-10vw','110vw'],opacity:[0,0.8,0.8,0]}}
          transition={{duration:4+i*0.8,repeat:Infinity,delay:i*2+1,ease:'linear'}}/>
      ))}
    </div>
  );
}

// ─── HUD Corners ─────────────────────────────────────────────────────────────
function HudCorners({ gc }: { gc:string }) {
  const corners = [
    { style:{ top:'1vw',    left:'1vw'  }, bt:true,  bl:true  },
    { style:{ top:'1vw',    right:'1vw' }, bt:true,  br:true  },
    { style:{ bottom:'1vw', left:'1vw'  }, bb:true,  bl:true  },
    { style:{ bottom:'1vw', right:'1vw' }, bb:true,  br:true  },
  ];
  return (
    <>{corners.map((c,i)=>(
      <motion.div key={i} className="absolute w-[2.5vw] h-[2.5vw] pointer-events-none z-40"
        style={{...c.style,
          borderTop:c.bt?`1px solid ${gc}55`:undefined, borderBottom:c.bb?`1px solid ${gc}55`:undefined,
          borderLeft:c.bl?`1px solid ${gc}55`:undefined, borderRight:c.br?`1px solid ${gc}55`:undefined}}
        initial={{opacity:0,scale:0.5}} animate={{opacity:0.6,scale:1}}
        transition={{duration:0.8, ease:CE, delay:0.1+i*0.06}}/>
    ))}</>
  );
}

// ─── Cinematic Envelope ───────────────────────────────────────────────────────
function CinematicEnvelope({ gc, children }: { gc:string; children:React.ReactNode }) {
  return (
    <div className="absolute inset-0 bg-[#020406] overflow-hidden" style={{filter:'contrast(1.05) saturate(1.1)'}}>
      {/* Slow-breathing ambient gradient — drifts across screen every 12s */}
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{background:[
          `radial-gradient(ellipse at 20% 60%, ${gc}0f 0%, transparent 55%)`,
          `radial-gradient(ellipse at 75% 40%, ${gc}0f 0%, transparent 55%)`,
          `radial-gradient(ellipse at 50% 75%, ${gc}0f 0%, transparent 55%)`,
          `radial-gradient(ellipse at 20% 60%, ${gc}0f 0%, transparent 55%)`,
        ]}}
        transition={{duration:14, repeat:Infinity, ease:'linear'}}/>
      <ParticleField gc={gc} />
      <div className="relative z-10 w-full h-full">{children}</div>
      {/* Deep vignette */}
      <div className="absolute inset-0 pointer-events-none z-20"
        style={{background:'radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.88) 100%)'}}/>
      {/* Subtle scanlines */}
      <div className="absolute inset-0 pointer-events-none z-20"
        style={{backgroundImage:'repeating-linear-gradient(0deg,rgba(0,0,0,0.05) 0,rgba(0,0,0,0.05) 1px,transparent 1px,transparent 4px)'}}/>
      {/* Brand chrome line — top */}
      <motion.div className="absolute top-0 left-0 right-0 h-[1.5px] z-30"
        initial={{scaleX:0,originX:0}} animate={{scaleX:1}}
        transition={{duration:1.2, ease:RE, delay:0.1}}
        style={{background:`linear-gradient(to right, transparent 0%, ${gc} 30%, ${gc} 70%, transparent 100%)`}}/>
      <HudCorners gc={gc} />
    </div>
  );
}

// ─── Scene 01: E-Kebajikan — "3D Isometric Campus Radar" ───────────────────────
function KebajikanScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Phase 1: Dashboard Initialize
      setTimeout(() => setAct(2), 2000),  // Phase 2: Radar Ping
      setTimeout(() => setAct(3), 3500),  // Phase 3: Zoom / Target
      setTimeout(() => setAct(4), 4500),  // Phase 4: Comms 1 (Student)
      setTimeout(() => setAct(5), 6000),  // Phase 5: Comms 2 (Exco)
      setTimeout(() => setAct(6), 7500),  // Phase 6: Comms 3 (Thanks) & Resolve Flash
      setTimeout(() => setAct(7), 8500),  // Phase 7: Overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  
  const gc = mod.gc;
  
  return (
    <CinematicEnvelope gc={gc}>
      
      {/* ─── BACKGROUND VOID ─── */}
      <div className="absolute inset-0 bg-[#020405] overflow-hidden flex items-center justify-center pointer-events-none">
        <motion.div 
          animate={{ opacity:[0.3, 0.6, 0.3], scale:[1, 1.2, 1] }} 
          transition={{ duration:4, repeat:Infinity, ease:"easeInOut" }} 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[100px]"
          style={{ background: `radial-gradient(circle, ${gc}15 0%, transparent 70%)` }}
        />
      </div>

      <AnimatePresence>
        {act >= 1 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.5, type: 'spring', bounce: 0.15 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
             {/* Unified Glassmorphic Dashboard */}
             <div className="relative w-[75vw] h-[40vw] bg-black/40 backdrop-blur-2xl border border-teal-500/20 rounded-[2vw] shadow-[0_50px_100px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(20,184,166,0.1)] flex flex-col p-[2vw] overflow-hidden">
               
               {/* Terminal Header */}
               <div className="flex justify-between items-center mb-[1.5vw] border-b border-teal-500/20 pb-[1vw]">
                 <div className="flex items-center gap-[1vw]">
                   <div className="w-[3vw] h-[3vw] rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.4)]">
                     <span className="text-[1.5vw]">🛡️</span>
                   </div>
                   <div>
                     <h2 className="text-[1.8vw] font-black tracking-tight text-white leading-none">Pusat Komando Kebajikan</h2>
                     <p className="text-[0.8vw] text-teal-400/60 tracking-widest font-mono uppercase mt-[0.2vw]">JPP Command / Fasiliti Kampus</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-[1vw]">
                   <div className="flex items-center gap-[0.5vw] px-[1vw] py-[0.5vw] bg-teal-500/10 rounded-full border border-teal-500/30">
                     <div className="w-[0.5vw] h-[0.5vw] bg-teal-400 rounded-full animate-pulse shadow-[0_0_10px_#2dd4bf]" />
                     <span className="text-[0.6vw] text-teal-300 font-bold tracking-widest uppercase">Live System</span>
                   </div>
                 </div>
               </div>
               
               {/* Dashboard 3-Column Layout */}
               <div className="flex flex-1 gap-[1.5vw]">
                 
                 {/* Left Col: Stats */}
                 <div className="flex flex-col gap-[1vw] w-[15vw]">
                    <div className="bg-white/5 border border-white/10 rounded-[1vw] p-[1.5vw]">
                      <p className="text-[0.8vw] text-white/50 uppercase tracking-wider mb-[0.2vw]">Aduan Aktif</p>
                      <p className="text-[3vw] font-black text-white leading-none">12</p>
                    </div>
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-[1vw] p-[1.5vw]">
                      <p className="text-[0.8vw] text-teal-300/70 uppercase tracking-wider mb-[0.2vw]">Selesai Harini</p>
                      <p className="text-[3vw] font-black text-teal-400 leading-none drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">45</p>
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-[1vw] p-[1.5vw] flex flex-col items-center justify-center">
                       <div className="text-[0.7vw] text-white/50 uppercase tracking-wider mb-[1vw]">Kadar Respon</div>
                       <div className="relative w-[7vw] h-[7vw] flex items-center justify-center">
                         <motion.svg className="absolute inset-0 w-full h-full -rotate-90">
                           <circle cx="3.5vw" cy="3.5vw" r="3vw" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5vw" />
                           <motion.circle cx="3.5vw" cy="3.5vw" r="3vw" fill="none" stroke="#2dd4bf" strokeWidth="0.5vw" strokeDasharray="18.84vw" strokeDashoffset={act >=2 ? 0 : "18.84vw"} transition={{duration: 2, ease: "easeInOut"}} strokeLinecap="round" />
                         </motion.svg>
                         <span className="text-[1.8vw] font-bold text-white">98%</span>
                       </div>
                    </div>
                 </div>

                 {/* Center Col: Holographic Map */}
                 <div className="flex-1 relative bg-black/50 border border-teal-500/20 rounded-[1vw] flex items-center justify-center overflow-hidden" style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}>
                    <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at center, ${gc}10 0%, transparent 70%)` }} />
                    <div className="absolute bottom-[-5vw] w-[30vw] h-[10vw] rounded-full bg-teal-500/20 blur-[40px]" />

                    {/* 3D Map */}
                    <AnimatePresence>
                      {act >= 2 && (
                        <motion.div 
                          initial={{ opacity: 0, rotateX: 60, rotateZ: 45, scale: 0.6, y: '5vw' }}
                          animate={act >= 4 
                            ? { opacity: 1, rotateX: 65, rotateZ: 30, scale: 1.2, y: '2vw' }
                            : { opacity: 1, rotateX: 60, rotateZ: 45, scale: 0.9, y: 0 }
                          }
                          transition={{ duration: 1.5, type: 'spring', bounce: 0.1 }}
                          className="absolute w-[25vw] h-[25vw] border border-teal-500/30"
                          style={{ 
                            transformStyle: 'preserve-3d',
                            backgroundImage: `linear-gradient(${gc}40 1px, transparent 1px), linear-gradient(90deg, ${gc}40 1px, transparent 1px)`, 
                            backgroundSize: '2.5vw 2.5vw',
                            boxShadow: `inset 0 0 50px rgba(0,0,0,0.8), 0 0 30px ${gc}20`
                          }}
                        >
                           <div className="absolute top-[5vw] left-[5vw] w-[5vw] h-[8vw] border border-teal-400/50 bg-teal-900/40 shadow-[0_0_20px_rgba(20,184,166,0.2)]" />
                           <div className="absolute top-[15vw] left-[15vw] w-[8vw] h-[6vw] border border-teal-400/50 bg-teal-900/40 shadow-[0_0_20px_rgba(20,184,166,0.2)]" />
                           
                           {/* Target Area */}
                           <div className="absolute top-[18vw] left-[5vw] w-[5vw] h-[5vw] border border-red-500/60 bg-red-900/40 flex items-center justify-center">
                              {act >= 3 && (
                                <motion.div 
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: [0, 3], opacity: [1, 0] }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                                  className="absolute w-[2vw] h-[2vw] rounded-full border-[0.2vw] border-red-500"
                                />
                              )}
                              {act >= 3 && <div className="w-[0.8vw] h-[0.8vw] bg-red-500 rounded-full shadow-[0_0_15px_red]" />}
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>

                 {/* Right Col: Comms Feed */}
                 <div className="w-[20vw] bg-white/5 border border-white/10 rounded-[1vw] p-[1.5vw] flex flex-col relative overflow-hidden">
                   <div className="flex items-center gap-[0.5vw] mb-[1.5vw] border-b border-white/10 pb-[1vw]">
                     <div className="w-[1vw] h-[1vw] rounded-full bg-teal-500/50 flex items-center justify-center"><div className="w-[0.4vw] h-[0.4vw] bg-teal-300 rounded-full animate-pulse" /></div>
                     <span className="text-[0.8vw] font-bold text-white tracking-widest uppercase">Live Comms Feed</span>
                   </div>

                   <div className="flex flex-col gap-[1vw] flex-1">
                     {/* Chat 1 */}
                     <AnimatePresence>
                       {act >= 4 && (
                         <motion.div initial={{ opacity:0, x: 20 }} animate={{ opacity:1, x: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-[1vw] rounded-tr-sm p-[1vw]">
                           <div className="flex items-center gap-[0.5vw] mb-[0.5vw]">
                             <span className="text-[0.6vw] font-bold text-red-400 uppercase tracking-wider">Pelajar (Blok C)</span>
                           </div>
                           <p className="text-[0.7vw] text-white/90">Bumbung bocor teruk di Bilik 204! Air menitis laju ke atas katil. Mohon bantuan segera! 😭</p>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     {/* Chat 2 */}
                     <AnimatePresence>
                       {act >= 5 && (
                         <motion.div initial={{ opacity:0, x: -20 }} animate={{ opacity:1, x: 0 }} className="bg-teal-500/10 border border-teal-500/20 rounded-[1vw] rounded-tl-sm p-[1vw] self-end w-[90%]">
                           <div className="flex items-center justify-end gap-[0.5vw] mb-[0.5vw]">
                             <span className="text-[0.6vw] font-bold text-teal-400 uppercase tracking-wider">Resolusi Exco</span>
                           </div>
                           <p className="text-[0.7vw] text-white/90 text-right">Makluman diterima. Penyelenggaraan dlm perjalanan ke lokasi. 🛠️⚡</p>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     {/* Chat 3 */}
                     <AnimatePresence>
                       {act >= 6 && (
                         <motion.div initial={{ opacity:0, x: 20 }} animate={{ opacity:1, x: 0 }} className="bg-emerald-500/10 border border-emerald-500/20 rounded-[1vw] rounded-tr-sm p-[1vw]">
                           <p className="text-[0.7vw] text-emerald-100 font-medium">Terima kasih atas respon pantas JPP! Terbaik! 🔥</p>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                 </div>

               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── RESOLUTION FLASH ─── */}
      <AnimatePresence>
        {act === 6 && (
          <motion.div key="res-flash" initial={{opacity:0, scale:0}} animate={{opacity:[0,1,0], scale:[0.5, 3, 6]}} exit={{opacity:0}}
            transition={{duration:1.2, ease:"easeOut"}} className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="w-[20vw] h-[20vw] bg-teal-400 rounded-full blur-[100px] mix-blend-screen" />
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=7} num="Modul 01" name="E-Kebajikan" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=6} message="Sistem Pemetaan Resolusi Aduan mempercepatkan tindakan penyelesaian fasiliti." />
    </CinematicEnvelope>
  );
}

// ─── Scene 02: E-Keusahawanan — "Floating Bento Ecosystem" ──────────────────
// Camera: Fast drift into deep green void -> Flat Bento Grid -> Panels Detach in Z-Space -> Data Flows
function KeusahawananScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Phase 1: Flat Bento Grid Slides In
      setTimeout(() => setAct(2), 2000),  // Phase 2: Panels Detach & Float in Z-Space
      setTimeout(() => setAct(3), 3500),  // Phase 3: Chart Animates & Counters run
      setTimeout(() => setAct(4), 5000),  // Phase 4: Holographic Coin Pop
      setTimeout(() => setAct(5), 7000),  // Phase 5: Stats highlight
      setTimeout(() => setAct(6), 8500),  // Phase 6: Resolution Flash
      setTimeout(() => setAct(7), 9500),  // Phase 7: Overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (act < 3) return;
    let cur = 0; const target = 18450;
    const iv = setInterval(() => { 
      cur += 750; setRev(cur); 
      if (cur >= target) clearInterval(iv); 
    }, 40);
    return () => clearInterval(iv);
  }, [act]);

  const gc = mod.gc; // #22c55e (Green)
  
  return (
    <CinematicEnvelope gc={gc}>
      
      {/* ─── BACKGROUND: DEEP GREEN VOID ─── */}
      <div className="absolute inset-0 bg-[#020503] overflow-hidden flex items-center justify-center pointer-events-none">
        <motion.div 
          animate={{ opacity:[0.1, 0.3, 0.1], scale:[1, 1.1, 1] }} 
          transition={{ duration:4, repeat:Infinity, ease:"easeInOut" }} 
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px]"
          style={{ background: `radial-gradient(circle, ${gc}15 0%, transparent 60%)` }}
        />
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '3vw 3vw' }} />
      </div>

      {/* ─── PHASE 1 & 2: FLOATING BENTO ECOSYSTEM ─── */}
      <AnimatePresence>
        {act >= 1 && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, rotateX: 30, y: '20vh' }}
            animate={
              act >= 2 
                ? { scale: 1, opacity: 1, rotateX: 10, rotateY: -10, y: '0vh' } // Tilted perspective to see Z-depth
                : { scale: 0.9, opacity: 1, rotateX: 0, rotateY: 0, y: '0vh' } // Flat entry
            }
            transition={{ type: 'spring', bounce: 0.3, duration: 1.5 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ perspective: '2000px', transformStyle: 'preserve-3d' }}
          >
            {/* Parent Container Grid (Invisible) */}
            <div className="w-[75vw] h-[45vw] relative flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
              
              {/* ─── PERIPHERAL PANELS (Left Side) ─── */}
              <div className="absolute left-0 top-[2vw] bottom-[2vw] w-[22vw] flex flex-col justify-between" style={{ transformStyle: 'preserve-3d' }}>
                 
                 {/* Top Left: Produk Terlaris */}
                 <AnimatePresence>
                   {act >= 2 && (
                     <motion.div
                       initial={{ opacity: 0, x: -50, rotateY: 30 }}
                       animate={{ opacity: 1, x: 0, rotateY: 15, y: ['-1vw', '1vw'] }}
                       transition={{ opacity: { duration: 0.8 }, x: { type: 'spring', bounce: 0.4 }, y: { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } }}
                       className="bg-[#030d08]/80 backdrop-blur-xl border border-green-500/30 rounded-[1.5vw] p-[1.5vw] shadow-[0_20px_40px_rgba(34,197,94,0.15)]"
                     >
                       <p className="text-[0.7vw] text-green-400/70 tracking-widest uppercase mb-[1vw]">Produk Terlaris Hari Ini</p>
                       <div className="flex gap-[1vw] items-center">
                         <div className="w-[5vw] h-[5vw] bg-gradient-to-br from-green-400/20 to-black border border-green-500/40 rounded-[0.8vw] flex items-center justify-center shadow-[inset_0_0_15px_rgba(34,197,94,0.3)]">
                           <span className="text-[2vw]">👕</span>
                         </div>
                         <div>
                           <p className="text-[1vw] font-bold text-white leading-tight">Kemeja Korporat JPP</p>
                           <p className="text-[1.5vw] font-black text-green-400 mt-[0.2vw]">245 Unit</p>
                         </div>
                       </div>
                       {/* Data stream laser shooting right */}
                       <div className="absolute top-1/2 -right-[15vw] w-[15vw] h-[2px] bg-gradient-to-r from-green-500/80 to-transparent" />
                     </motion.div>
                   )}
                 </AnimatePresence>

                 {/* Bottom Left: Aliran Tunai (Cashflow Feed) */}
                 <AnimatePresence>
                   {act >= 3 && (
                     <motion.div
                       initial={{ opacity: 0, x: -50, rotateY: 30 }}
                       animate={{ opacity: 1, x: 0, rotateY: 15, y: ['1vw', '-1vw'] }}
                       transition={{ opacity: { duration: 0.8 }, x: { type: 'spring', bounce: 0.4 }, y: { duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } }}
                       className="bg-[#030d08]/80 backdrop-blur-xl border border-green-500/30 rounded-[1.5vw] p-[1.5vw] shadow-[0_20px_40px_rgba(34,197,94,0.15)] overflow-hidden relative"
                     >
                       <p className="text-[0.7vw] text-green-400/70 tracking-widest uppercase mb-[1vw]">Feed Aliran Tunai</p>
                       <div className="flex flex-col gap-[0.8vw]">
                         <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.2}} className="flex justify-between items-center bg-green-500/10 p-[0.6vw] rounded-[0.5vw]">
                           <span className="text-[0.8vw] text-white/80">Kiosk Siswa A</span><span className="text-[0.9vw] font-bold text-green-400">+RM 12.50</span>
                         </motion.div>
                         <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.4}} className="flex justify-between items-center bg-green-500/10 p-[0.6vw] rounded-[0.5vw]">
                           <span className="text-[0.8vw] text-white/80">Kiosk Siswa C</span><span className="text-[0.9vw] font-bold text-green-400">+RM 4.00</span>
                         </motion.div>
                         <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.6}} className="flex justify-between items-center bg-green-500/10 p-[0.6vw] rounded-[0.5vw]">
                           <span className="text-[0.8vw] text-white/80">Kiosk Siswa B</span><span className="text-[0.9vw] font-bold text-green-400">+RM 25.00</span>
                         </motion.div>
                       </div>
                       {/* Data stream laser shooting right */}
                       <div className="absolute top-1/2 -right-[15vw] w-[15vw] h-[2px] bg-gradient-to-r from-green-500/80 to-transparent" />
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>

              {/* ─── MAIN DASHBOARD (Right/Center Side) ─── */}
              <motion.div
                animate={
                  act >= 2 
                    ? { z: 100, x: '8vw', rotateX: 5, rotateY: -5 } // Floats up and shifts right
                    : { z: 0, x: '8vw', rotateX: 0, rotateY: 0 }
                }
                transition={{ type: 'spring', bounce: 0.4, duration: 2 }}
                className="absolute top-[2vw] right-0 w-[45vw] h-[41vw] bg-[#020a06]/80 backdrop-blur-2xl border border-green-500/20 rounded-[2vw] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(34,197,94,0.05)] p-[2.5vw] flex flex-col"
              >
                <div className="flex justify-between items-start mb-[2vw]">
                  <div>
                    <h2 className="text-[2vw] font-black text-white tracking-widest uppercase leading-tight drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">E-Keusahawanan</h2>
                    <p className="text-[0.8vw] text-green-400 tracking-[0.3em] uppercase mt-[0.5vw]">Hab Data Jualan & Unjuran</p>
                  </div>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="w-[4vw] h-[4vw] rounded-full border border-green-500/50 flex items-center justify-center bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                    <span className="text-[1.5vw]">📈</span>
                  </motion.div>
                </div>
                
                <div className="flex gap-[3vw] mb-[2vw]">
                  <div className="bg-green-950/40 p-[1.5vw] rounded-[1vw] border border-green-500/20 flex-1">
                    <p className="text-[0.8vw] text-green-400/60 uppercase tracking-wider mb-[0.5vw]">Unit Terjual Harini</p>
                    <p className="text-[3vw] font-black text-white leading-none">4,821</p>
                  </div>
                  <div className="bg-green-950/40 p-[1.5vw] rounded-[1vw] border border-green-500/20 flex-1">
                    <p className="text-[0.8vw] text-green-400/60 uppercase tracking-wider mb-[0.5vw]">Transaksi Aktif</p>
                    <p className="text-[3vw] font-black text-white leading-none">1,204</p>
                  </div>
                </div>

                {/* Right: Advanced Layered Chart */}
                <div className="flex-1 bg-black/50 border border-green-500/10 rounded-[1.5vw] p-[2vw] relative overflow-hidden flex flex-col">
                  <p className="text-[0.9vw] text-white/60 tracking-widest uppercase mb-[1vw] flex items-center justify-between">
                    <span>Graf Unjuran Kewangan</span>
                    <span className="flex gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[0.6vw] text-green-500">LIVE</span>
                    </span>
                  </p>
                  <div className="flex-1 relative border-l border-b border-green-500/30">
                    
                    {/* SVG Line Chart */}
                    {act >= 3 && (
                      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full overflow-visible drop-shadow-[0_10px_10px_rgba(34,197,94,0.5)] z-10 relative">
                        <defs>
                          <linearGradient id="chartGrad1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={gc} stopOpacity="0.6" />
                            <stop offset="100%" stopColor={gc} stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Area Fill 2 (Background Data) */}
                        <motion.path 
                          d="M0,50 L0,35 Q20,40 40,25 T80,20 L100,15 L100,50 Z" 
                          fill="url(#chartGrad2)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1.5 }}
                        />
                        <motion.path 
                          d="M0,35 Q20,40 40,25 T80,20 L100,15" 
                          fill="none" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="2 2"
                          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2 }}
                        />

                        {/* Area Fill 1 (Main Revenue) */}
                        <motion.path 
                          d="M0,50 L0,45 Q20,40 40,30 T80,10 L100,5 L100,50 Z" 
                          fill="url(#chartGrad1)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                        {/* Glowing Line */}
                        <motion.path 
                          d="M0,45 Q20,40 40,30 T80,10 L100,5" 
                          fill="none" 
                          stroke={gc} 
                          strokeWidth="2" 
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                        />
                        {/* Glowing Dot at end */}
                        <motion.circle 
                          cx="100" cy="5" r="2" fill="#fff" 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [0, 2, 1], opacity: 1, boxShadow: `0 0 30px ${gc}` }}
                          transition={{ delay: 2, duration: 0.5 }}
                        />
                      </svg>
                    )}

                    {/* Animated Scanning Grid */}
                    {act >= 3 && (
                      <motion.div 
                        initial={{x: '-100%'}}
                        animate={{x: '200%'}}
                        transition={{duration: 4, repeat: Infinity, ease: 'linear'}}
                        className="absolute inset-y-0 w-[2vw] bg-gradient-to-r from-transparent via-green-400/20 to-transparent skew-x-[-20deg]"
                      />
                    )}

                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                      <div className="w-full border-t border-green-200" /><div className="w-full border-t border-green-200" /><div className="w-full border-t border-green-200" /><div className="w-full border-t border-green-200" />
                    </div>

                    {/* ─── PHASE 4: PROFIT MARGIN OVERLAY ─── */}
                    <AnimatePresence>
                      {act >= 4 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ type: "spring", bounce: 0.5 }}
                          className="absolute top-[10%] right-[15%] bg-green-500/20 backdrop-blur-xl border border-green-400/60 p-[1.5vw] rounded-[1vw] shadow-[0_20px_40px_rgba(34,197,94,0.3)] z-20"
                        >
                          <p className="text-[0.7vw] text-green-300 uppercase tracking-widest font-bold mb-[0.5vw]">Margin Untung Kasar</p>
                          <div className="flex items-center gap-[1vw]">
                            <p className="text-[3vw] font-black text-white leading-none drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">+24%</p>
                            <span className="text-[2vw] animate-bounce">🚀</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ─── PHASE 6: RESOLUTION FLASH ─── */}
      <AnimatePresence>
        {act === 6 && (
          <motion.div key="res-flash" initial={{opacity:0, scale:0}} animate={{opacity:[0,1,0], scale:[0.5, 3, 6]}} exit={{opacity:0}}
            transition={{duration:1.2, ease:"easeOut"}} className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="w-[20vw] h-[20vw] bg-green-400 rounded-full blur-[100px] mix-blend-screen" />
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=7} num="Modul 02" name="E-Keusahawanan" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=6} message="Sistem POS Digital merekod setiap transaksi masa nyata untuk analisis JPP." />
    </CinematicEnvelope>
  );
}

// ─── Scene 03: E-Akademik — "3D Holographic Student ID & Merit Rings" ───────────────────────
function AkademikScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [cgpa, setCgpa] = useState(0);
  const [merit, setMerit] = useState(0);
  
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Phase 1: Holographic ID Card Drops In
      setTimeout(() => setAct(2), 2500),  // Phase 2: Rings Expand & CGPA Counter Starts
      setTimeout(() => setAct(3), 4000),  // Phase 3: Vertical Data Cascades
      setTimeout(() => setAct(4), 5500),  // Phase 4: Merit Value Spikes (+5)
      setTimeout(() => setAct(5), 7500),  // Phase 5: Resolution Flash
      setTimeout(() => setAct(6), 8500),  // Phase 6: Module Overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (act < 2) return;
    let cur = 0; const target = 3.84;
    const iv = setInterval(() => { 
      cur = Math.min(cur + 0.15, target);
      setCgpa(parseFloat(cur.toFixed(2))); 
      if (cur >= target) clearInterval(iv); 
    }, 40);
    return () => clearInterval(iv);
  }, [act]);

  useEffect(() => {
    if (act < 4) return;
    let cur = 40; const target = 45;
    const iv = setInterval(() => { 
      cur = Math.min(cur + 1, target);
      setMerit(cur); 
      if (cur >= target) clearInterval(iv); 
    }, 80);
    return () => clearInterval(iv);
  }, [act]);

  const gc = mod.gc; // #3b82f6 (Blue)

  return (
    <CinematicEnvelope gc={gc}>
      
      {/* ─── BACKGROUND: DEEP DATA VOID ─── */}
      <div className="absolute inset-0 bg-[#020306] overflow-hidden flex items-center justify-center pointer-events-none">
        <motion.div 
          animate={{ opacity:[0.2, 0.4, 0.2], scale:[1, 1.2, 1] }} 
          transition={{ duration:5, repeat:Infinity, ease:"easeInOut" }} 
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[150px]"
          style={{ background: `radial-gradient(circle, ${gc}15 0%, transparent 60%)` }}
        />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.85) 100%)` }} />
        {/* Subtle grid base */}
        <div className="absolute bottom-0 w-full h-[40vh]" style={{ backgroundImage: `linear-gradient(transparent 0%, ${gc}10 100%)`, transform: 'perspective(1000px) rotateX(60deg)' }}>
           <div className="w-full h-full border-t border-blue-500/20" style={{ backgroundImage: 'linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px)', backgroundSize: '4vw 4vw' }} />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none" style={{ perspective: '1500px' }}>
        
        {/* 1. HOLOGRAPHIC ID CARD (Center) */}
        <AnimatePresence>
          {act >= 1 && (
            <motion.div 
              initial={{ scale: 0, rotateY: 90, rotateX: 60, y: -200, opacity: 0 }}
              animate={ act >= 2 ? { scale: 1.1, rotateY: 0, rotateX: 10, y: '-2vw', opacity: 1 } : { scale: 0.8, rotateY: 20, rotateX: 45, y: 0, opacity: 1 } }
              transition={{ type: 'spring', bounce: 0.4, duration: 2 }}
              className="relative w-[18vw] h-[28vw] rounded-[1.5vw] overflow-hidden shadow-[0_0_80px_rgba(59,130,246,0.4)] flex flex-col p-[2vw] border-[0.2vw] border-blue-400/50 bg-black/40 backdrop-blur-md z-30"
              style={{ transformStyle: 'preserve-3d' }}
            >
               {/* Hologram sweep effect */}
               <motion.div animate={{ y: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 w-full h-[50%] bg-gradient-to-b from-transparent via-blue-400/20 to-transparent mix-blend-screen" />
               
               {/* ID Content */}
               <div className="w-[6vw] h-[6vw] rounded-full bg-blue-500/20 border border-blue-400/50 mb-[2vw] flex items-center justify-center">
                  <div className="w-[5vw] h-[5vw] rounded-full bg-blue-500/40 animate-pulse blur-sm" />
               </div>
               <div className="h-[1vw] w-3/4 bg-white/80 rounded-full mb-[0.8vw]" />
               <div className="h-[0.8vw] w-1/2 bg-blue-400/60 rounded-full mb-[2vw]" />

               <div className="flex-1 flex flex-col justify-end gap-[1vw]">
                 <div className="w-full bg-blue-900/40 rounded-[0.8vw] p-[1vw] border border-blue-500/30">
                    <p className="text-[0.7vw] text-blue-300 uppercase tracking-widest mb-[0.2vw]">CGPA Semasa</p>
                    <p className="text-[3vw] font-black text-white leading-none font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">{cgpa.toFixed(2)}</p>
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. MERIT RINGS (Expand outward) */}
        <AnimatePresence>
          {act >= 2 && (
            <>
              {/* Inner Ring (Semester) */}
              <motion.div 
                initial={{ scale: 0.5, opacity: 0, rotateX: 70 }}
                animate={{ scale: 1.5, opacity: 1, rotateX: 75, rotateZ: 360 }}
                transition={{ scale: { type: 'spring', bounce: 0.5, duration: 2 }, rotateZ: { duration: 20, repeat: Infinity, ease: 'linear' } }}
                className="absolute w-[30vw] h-[30vw] rounded-full border-[0.3vw] border-dashed border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] z-20"
              />
              
              {/* Outer Ring (Merit Focus) */}
              <motion.div 
                initial={{ scale: 0.5, opacity: 0, rotateX: 70 }}
                animate={{ scale: 2.5, opacity: 1, rotateX: 75, rotateZ: -360 }}
                transition={{ scale: { type: 'spring', bounce: 0.5, duration: 2, delay: 0.2 }, rotateZ: { duration: 30, repeat: Infinity, ease: 'linear' } }}
                className="absolute w-[30vw] h-[30vw] rounded-full border-[0.1vw] border-yellow-400/60 shadow-[0_0_40px_rgba(234,179,8,0.3),inset_0_0_20px_rgba(234,179,8,0.2)] z-10 flex items-center justify-center"
              >
                 {/* Orbiting Merit Node */}
                 <div className="absolute top-[-1vw] left-1/2 -translate-x-1/2 w-[2vw] h-[2vw] bg-yellow-400 rounded-full shadow-[0_0_20px_rgba(234,179,8,1)] flex items-center justify-center">
                    <div className="w-[1vw] h-[1vw] bg-white rounded-full animate-pulse" />
                 </div>
                 {/* Orbiting Label */}
                 <div className="absolute bottom-[-2vw] left-1/2 -translate-x-1/2 text-[1vw] font-bold text-yellow-400 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(234,179,8,1)]">
                   PENGESANAN MERIT
                 </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 3. DATA CASCADES (Vertical streams) */}
        <AnimatePresence>
          {act >= 3 && (
             <div className="absolute inset-0 flex justify-between px-[10vw] pointer-events-none z-10">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="relative w-[4vw] h-full overflow-hidden opacity-40">
                     <motion.div 
                       initial={{ y: '-100%' }} animate={{ y: '200%' }}
                       transition={{ duration: 2 + (i % 3), repeat: Infinity, ease: 'linear', delay: i * 0.4 }}
                       className="w-full text-blue-500 font-mono text-[0.6vw] leading-none text-center break-all"
                       style={{ textShadow: '0 0 10px rgba(59,130,246,0.8)' }}
                     >
                        101010010110<br/>010111001010<br/>ACT-LOG-094<br/>SYS-OK-200<br/>101010010110
                     </motion.div>
                  </div>
                ))}
             </div>
          )}
        </AnimatePresence>

        {/* 4. MERIT VALUE UPDATE UI */}
        <AnimatePresence>
          {act >= 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0, x: 200 }}
              animate={{ opacity: 1, scale: 1, x: '25vw', y: '-5vw' }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="absolute bg-yellow-500/10 backdrop-blur-xl border-[0.2vw] border-yellow-400/50 rounded-[1vw] p-[2vw] shadow-[0_30px_60px_rgba(234,179,8,0.3)] flex flex-col items-center justify-center z-40"
            >
               <p className="text-[0.9vw] text-yellow-300 tracking-[0.3em] uppercase font-black">Jumlah Merit</p>
               <p className="text-[5vw] font-black leading-none mt-[0.5vw] text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] font-mono">
                 {merit}
               </p>
               <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: [0, 1, 1, 0], y: [-10, -30, -35, -40], scale: [0.8, 1.2, 1, 0.8] }}
                 transition={{ duration: 2.5, ease: "easeOut" }}
                 className="absolute top-[-2vw] bg-white text-yellow-600 font-black px-[1vw] py-[0.4vw] rounded-full text-[1vw] shadow-[0_10px_20px_rgba(255,255,255,0.5)] border border-yellow-200"
               >
                 +5 DITAMBAH
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ─── PHASE 5: RESOLUTION FLASH ─── */}
      <AnimatePresence>
        {act === 5 && (
          <motion.div key="res-flash" initial={{opacity:0, scale:0}} animate={{opacity:[0,1,0], scale:[0.5, 3, 6]}} exit={{opacity:0}}
            transition={{duration:1.2, ease:"easeOut"}} className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="w-[20vw] h-[20vw] bg-blue-400 rounded-full blur-[100px] mix-blend-screen" />
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=6} num="Modul 03" name="E-Akademik" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=5} message="Aliran data merit direkod secara holistik untuk penilaian bersepadu." />
    </CinematicEnvelope>
  );
}

function KebajikanPanel({ step, gc, dc, clicking }: { step:number; gc:string; dc:string; clicking:boolean }) {

  const [status, setStatus] = useState(0); // 0=Menunggu 1=Sedang Diproses 2=Diselesaikan
  useEffect(()=>{
    if(!clicking) return;
    setStatus(1);
    const t=setTimeout(()=>setStatus(2), 1200);
    return()=>clearTimeout(t);
  },[clicking]);
  useEffect(()=>{
    const t1=setTimeout(()=>setStatus(1),4000);
    const t2=setTimeout(()=>setStatus(2),8000);
    return()=>{clearTimeout(t1);clearTimeout(t2)};
  },[]);
  const statuses=[['Menunggu','bg-yellow-500/20 text-yellow-400'],['Sedang Diproses','bg-blue-500/20 text-blue-400'],['Diselesaikan','bg-green-500/20 text-green-400']];
  return (
    <div className="flex flex-col gap-[1vw]">
      <div className="flex items-center justify-between mb-[0.5vw]">
        <p className="text-[0.9vw] font-semibold text-white/80">Aduan Aktif</p>
        <motion.span key={status} initial={{scale:1.2,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:0.4}} className={`text-[0.7vw] px-[0.6vw] py-[0.2vw] rounded-full font-medium ${statuses[status][1]}`}>{statuses[status][0]}</motion.span>
      </div>
      {[['ADU-2024-087','Bilik rosak — Blok C',gc],['ADU-2024-086','Masalah yuran semester','#6366f1'],['ADU-2024-085','Permohonan buku teks','#f59e0b']].map(([id,desc,c],i)=>(
        <motion.div key={id} initial={{x:40,opacity:0}} animate={step>=1?{x:0,opacity:1}:{}} transition={{delay:i*0.15,duration:0.6}} className="flex items-center gap-[0.8vw] p-[0.8vw] rounded-[0.6vw] border border-white/5" style={{background:'#161b22'}}>
          <div className="w-[0.5vw] h-[3vw] rounded-full flex-shrink-0" style={{background:c}} />
          <div className="flex-1">
            <p className="text-[0.7vw] font-mono" style={{color:c}}>{id}</p>
            <p className="text-[0.8vw] text-white/70">{desc}</p>
          </div>
          {i===0&&<motion.div key={status} initial={{scale:0}} animate={{scale:1}} className={`text-[0.65vw] px-[0.5vw] py-[0.15vw] rounded-full ${statuses[status][1]}`}>{statuses[status][0]}</motion.div>}
        </motion.div>
      ))}
      <motion.div initial={{opacity:0}} animate={step>=3?{opacity:1}:{}} className="mt-[0.5vw] p-[0.8vw] rounded-[0.6vw] border flex items-center gap-[0.8vw]" style={{borderColor:gc+'40',background:gc+'10'}}>
        <div className="w-[1.5vw] h-[1.5vw] rounded-full flex items-center justify-center text-[0.7vw]" style={{background:gc}}>✓</div>
        <p className="text-[0.75vw] text-white/60">Respons purata: <span className="font-bold" style={{color:gc}}>4.2 jam</span></p>
      </motion.div>
    </div>
  );
}

// ─── Keusahawanan Panel ───────────────────────────────────────────────────────
function KeusahawananPanel({ step, gc, clicking }: { step:number; gc:string; clicking:boolean }) {
  const [count, setCount] = useState(1240);
  const [popBars, setPopBars] = useState(false);
  useEffect(()=>{
    if(!clicking) return;
    setPopBars(true);
    const iv=setInterval(()=>setCount(c=>c+Math.floor(Math.random()*25+10)),100);
    const t=setTimeout(()=>clearInterval(iv),3000);
    return()=>{clearInterval(iv);clearTimeout(t)};
  },[clicking]);
  useEffect(()=>{
    if(step<2) return;
    const iv=setInterval(()=>setCount(c=>c+Math.floor(Math.random()*8+2)),300);
    return()=>clearInterval(iv);
  },[step]);
  const bars=[60,85,45,90,70,55,80];
  return (
    <div className="flex flex-col gap-[1vw]">
      <div className="flex gap-[1vw]">
        <motion.div initial={{scale:0.8,opacity:0}} animate={step>=1?{scale:1,opacity:1}:{}} transition={{duration:0.6}} className="flex-1 p-[0.8vw] rounded-[0.6vw]" style={{background:'#161b22',border:'1px solid '+gc+'30'}}>
          <p className="text-[0.7vw] text-white/40 mb-[0.3vw]">Jualan Hari Ini</p>
          <p className="text-[1.6vw] font-black" style={{color:gc}}>RM {count.toLocaleString()}</p>
          <p className="text-[0.65vw] text-green-400">↑ 12.4%</p>
        </motion.div>
        <motion.div initial={{scale:0.8,opacity:0}} animate={step>=1?{scale:1,opacity:1}:{}} transition={{duration:0.6,delay:0.1}} className="flex-1 p-[0.8vw] rounded-[0.6vw] bg-[#161b22] border border-white/5">
          <p className="text-[0.7vw] text-white/40 mb-[0.3vw]">Transaksi</p>
          <p className="text-[1.6vw] font-black text-white">47</p>
          <p className="text-[0.65vw] text-white/30">hari ini</p>
        </motion.div>
      </div>
      <div className="p-[0.8vw] rounded-[0.6vw] bg-[#161b22] border border-white/5">
        <p className="text-[0.7vw] text-white/40 mb-[0.8vw]">Jualan Mingguan</p>
        <div className="flex items-end gap-[0.4vw] h-[6vw]">
          {bars.map((h,i)=>(
            <motion.div key={i} initial={{height:0}} animate={step>=2||popBars?{height:`${popBars?100:h}%`,boxShadow:popBars?`0 0 20px ${gc}`:undefined}:{height:0}} transition={{delay:popBars?0:i*0.1,duration:popBars?0.3:0.8,ease:[0.25,1,0.5,1]}} className="flex-1 rounded-t" style={{background:i===3||popBars?gc:gc+'50'}} />
          ))}
        </div>
        <div className="flex justify-between mt-[0.3vw]">
          {['I','S','R','K','J','S','A'].map(d=><span key={d} className="text-[0.5vw] text-white/20 flex-1 text-center">{d}</span>)}
        </div>
      </div>
    </div>
  );
}

// ─── Akademik Panel ───────────────────────────────────────────────────────────
function AkademikPanel({ step, gc, clicking }: { step:number; gc:string; clicking:boolean }) {
  const [cgpa, setCgpa] = useState(0);
  const [showBadge, setShowBadge] = useState(false);
  useEffect(()=>{
    if(!clicking) return;
    // Fast fill when clicked
    let cur = cgpa;
    const iv=setInterval(()=>{ cur=Math.min(cur+0.15,3.72); setCgpa(parseFloat(cur.toFixed(2))); if(cur>=3.72){clearInterval(iv);setShowBadge(true);} },40);
    return()=>clearInterval(iv);
  },[clicking]);
  useEffect(()=>{
    if(step<1) return;
    const target=3.72; let cur=0;
    const iv=setInterval(()=>{ cur=Math.min(cur+0.05,target); setCgpa(parseFloat(cur.toFixed(2))); if(cur>=target) clearInterval(iv); },60);
    return()=>clearInterval(iv);
  },[step]);
  const mods=[['Matematik','A','4.0'],['Bahasa Inggeris','A-','3.7'],['Pengaturcaraan','A','4.0'],['Statistik','B+','3.3']];
  return (
    <div className="flex gap-[1.5vw]">
      <div className="flex flex-col items-center justify-center w-[35%] gap-[0.8vw]">
        <div className="relative w-[8vw] h-[8vw]">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff10" strokeWidth="8"/>
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke={gc} strokeWidth="8" strokeLinecap="round" strokeDasharray="264" initial={{strokeDashoffset:264}} animate={step>=1?{strokeDashoffset:264-(264*(cgpa/4.0))}:{strokeDashoffset:264}} transition={{duration:2}}/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[1.8vw] font-black text-white">{cgpa.toFixed(2)}</span>
            <span className="text-[0.6vw] text-white/40">CGPA</span>
          </div>
        </div>
        <motion.div initial={{opacity:0,scale:0}} animate={(step>=3||showBadge)?{opacity:1,scale:1}:{}} transition={{duration:0.5,ease:[0.34,1.56,0.64,1]}} className="px-[0.8vw] py-[0.3vw] rounded-full text-[0.7vw] font-bold" style={{background:gc+'30',color:gc}}>
          Kepujian ★
        </motion.div>
      </div>
      <div className="flex-1 flex flex-col gap-[0.6vw]">
        <p className="text-[0.7vw] text-white/40 mb-[0.3vw]">Subjek Semester Ini</p>
        {mods.map(([name,grade,gpa],i)=>(
          <motion.div key={name} initial={{x:30,opacity:0}} animate={step>=2?{x:0,opacity:1}:{}} transition={{delay:i*0.12,duration:0.6}} className="flex items-center gap-[0.5vw] p-[0.5vw] rounded-[0.5vw] bg-[#161b22]">
            <div className="flex-1 text-[0.75vw] text-white/70">{name}</div>
            <span className="text-[0.75vw] font-bold" style={{color:gc}}>{grade}</span>
            <span className="text-[0.65vw] text-white/30 w-[2.5vw] text-right">{gpa}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Scene 04: PolyMart — "Marketplace Sneaker Drop Layout" ──────────────────
// Camera: wide dolly pan | accurate layout matched to image | energetic loading
function PolyMartScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [cart, setCart] = useState(0);

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Phase 1: Dashboard Frame slam entry
      setTimeout(() => setAct(2), 1500),  // Phase 2: Stagger in categories & banner
      setTimeout(() => setAct(3), 2500),  // Phase 3: Peniaga Aktif load
      setTimeout(() => setAct(4), 3500),  // Phase 4: Products grid slam
      setTimeout(() => { setAct(5); setCart(1); }, 5000),  // Phase 5: Add to cart stomp!
      setTimeout(() => setAct(6), 7500),  // Phase 6: Resolution/Overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  const gc = mod.gc; // #f59e0b (Amber/Orange)
  
  const cats = [
    { name: 'Semua', emoji: '📄' }, { name: 'Makanan', emoji: '🍔' }, 
    { name: 'Minuman', emoji: '🥤' }, { name: 'Aksesori', emoji: '💎' }, 
    { name: 'Perkhidmatan', emoji: '🔧' }, { name: 'Pakaian', emoji: '👕' }, 
    { name: 'Elektronik', emoji: '📱' }, { name: 'Umum', emoji: '📦' }
  ];

  const products = [1, 2, 3, 4]; // Using 4 for a visually balanced grid in the short time

  return (
    <CinematicEnvelope gc={gc}>
      
      {/* ─── STROBE LIGHT EFFECT ON ENTRY ─── */}
      <AnimatePresence>
        {act === 1 && (
          <motion.div 
            initial={{ opacity: 1 }} 
            animate={{ opacity: [1, 0, 1, 0, 0.5, 0] }} 
            transition={{ duration: 0.8, ease: "linear" }}
            className="absolute inset-0 bg-amber-500 mix-blend-overlay z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* ─── PHASE 5: CART EXPLOSION ─── */}
      <ExplodingParticles active={cart>0} emoji="🛒" count={50} />

      <motion.div 
        className="absolute inset-[2%] rounded-[1.5vw] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.95)]" 
        style={{background:'#0a0a0a', transformStyle:'preserve-3d'}}
        // Aggressive Slam Entry
        initial={{ scale: 3, filter: 'blur(30px)', opacity: 0, rotateY: 15, rotateX: 10, y: '-20vh' }} 
        animate={
          act >= 1 
            ? { scale: 1, filter: 'blur(0px)', opacity: 1, rotateY: act>=5 ? [0,2,-2,0] : [-2,2,-2], rotateX: act>=5 ? 0 : [2,0,2], y: '0vh' } 
            : {}
        } 
        transition={
          act === 1 
            ? { scale: { type: 'spring', stiffness: 200, damping: 15 }, opacity: { duration: 0.2 }, y: { type: 'spring', stiffness: 200, damping: 15 } }
            : act >= 2 
            ? { rotateY: { duration: 8, repeat: Infinity, ease: 'easeInOut' }, rotateX: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }
            : spS(0)
        }
      >
        
        {/* Navbar (Top) */}
        <div className="flex items-center gap-[2vw] px-[2vw] py-[1.2vw] border-b border-white/5 bg-[#0d0d0d] relative z-20">
          {/* Logo */}
          <div className="flex items-center gap-[0.8vw]">
            <span className="text-white/60">←</span>
            <motion.div 
              animate={{ rotateZ: act >= 5 ? [0, 360] : 0 }} 
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-[2.5vw] h-[2.5vw] rounded-[0.5vw] flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]" 
              style={{background:gc}}
            >
              <span className="text-[1.2vw]">🛍️</span>
            </motion.div>
            <div>
              <p className="text-[1vw] font-black text-white leading-none tracking-tighter">POLYMART</p>
              <p className="text-[0.6vw] text-amber-500 tracking-[0.2em] font-bold">MARKETPLACE</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 h-[2.5vw] rounded-[0.5vw] flex items-center px-[1vw] gap-[0.5vw] bg-[#141414] border border-white/5">
            <span className="text-[1vw] text-white/30">🔍</span>
            <span className="text-[0.8vw] text-white/30">Cari sneakers, baju, makanan...</span>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-[1vw] text-white/40 text-[1.2vw]">
            <span>📦</span>
            <span>⊞</span>
          </div>
        </div>

        {/* Categories (Horizontal Scroll) */}
        <div className="flex gap-[0.8vw] px-[2vw] py-[1vw] bg-[#0d0d0d] overflow-hidden relative z-10">
          {cats.map((c, i) => (
            <motion.div 
              key={c.name} 
              initial={{ x: 100, opacity: 0, skewX: -20 }} 
              animate={act >= 2 ? { x: 0, opacity: 1, skewX: 0 } : {}} 
              transition={{ delay: i * 0.05, type: 'spring', bounce: 0.4 }}
              className={`flex items-center gap-[0.5vw] px-[1.2vw] py-[0.5vw] rounded-[0.5vw] text-[0.8vw] whitespace-nowrap cursor-pointer transition-colors duration-300 ${i===0 ? 'bg-[#f59e0b20] border border-[#f59e0b50] text-[#f59e0b]' : 'bg-[#141414] border border-white/5 text-white/60'}`}
            >
              <span>{c.emoji}</span> <span className="font-bold uppercase tracking-wider">{c.name}</span>
            </motion.div>
          ))}
        </div>

        <div className="px-[2vw] py-[1.5vw] overflow-y-auto h-[calc(100%-8vw)] hide-scrollbar pb-[10vw]">
          
          {/* Hero Banner: SNEAKER DROP / HYPEBEAST VIBE */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateX: 20 }} 
            animate={act >= 2 ? { opacity: 1, scale: 1, rotateX: 0 } : {}} 
            transition={{ type: 'spring', bounce: 0.6, delay: 0.3 }}
            className="w-full rounded-[1vw] p-[3vw] relative overflow-hidden flex justify-between items-center"
            style={{ background: '#111', border: `2px solid ${gc}40` }}
          >
            {/* Background Marquee Text */}
            <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none flex flex-col justify-center gap-[1vw] rotate-[-5deg] scale-110">
              <motion.div animate={{ x: ['0%', '-50%'] }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} className="whitespace-nowrap">
                {Array(10).fill('🔥 LIMITED DROP 🔥 NEW ARRIVALS 🔥 EXCLUSIVE ').map((t, i) => (
                  <span key={i} className="text-[5vw] font-black text-amber-500 uppercase tracking-tighter px-[1vw]">{t}</span>
                ))}
              </motion.div>
              <motion.div animate={{ x: ['-50%', '0%'] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} className="whitespace-nowrap">
                {Array(10).fill('STREETWEAR ✖ KAMPUS ✖ JPP POLISAS ✖ ').map((t, i) => (
                  <span key={i} className="text-[5vw] font-black text-transparent uppercase tracking-tighter px-[1vw]" style={{ WebkitTextStroke: '2px #f59e0b' }}>{t}</span>
                ))}
              </motion.div>
            </div>

            {/* Banner Content */}
            <div className="relative z-10 w-[50%]">
              <div className="flex items-center gap-[0.5vw] mb-[1vw]">
                <div className="px-[0.8vw] py-[0.3vw] bg-amber-500 text-black font-black text-[0.7vw] uppercase tracking-widest rounded-sm">HYPE DROP</div>
                <p className="text-[0.7vw] font-bold text-white uppercase tracking-widest">POLYMART BETA</p>
              </div>
              <h1 className="text-[4vw] font-black text-white leading-[0.9] tracking-tighter uppercase">Jelajah</h1>
              <h1 className="text-[4vw] font-black text-amber-500 leading-[0.9] tracking-tighter uppercase mb-[1vw]" style={{ textShadow: `0 0 40px ${gc}` }}>Kampus</h1>
              <p className="text-[0.9vw] text-white/80 mb-[2vw] font-medium border-l-4 border-amber-500 pl-[1vw]">Tempah produk eksklusif dari peniaga berdaftar JPP. Siapa cepat dia dapat.</p>

              <div className="flex gap-[1vw]">
                <div className="px-[1.5vw] py-[0.8vw] bg-white text-black font-black text-[0.9vw] uppercase tracking-wider rounded-sm cursor-pointer hover:bg-amber-500 transition-colors">Beli Sekarang</div>
                <div className="px-[1.5vw] py-[0.8vw] border-2 border-white text-white font-black text-[0.9vw] uppercase tracking-wider rounded-sm cursor-pointer hover:bg-white hover:text-black transition-colors">Lihat Koleksi</div>
              </div>
            </div>

            {/* 3D FLOATING SNEAKER (HYPE) */}
            <motion.div 
              animate={{ y: [-15, 15, -15], rotateZ: [-5, 5, -5], rotateY: [0, 10, -10, 0] }} 
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10 w-[20vw] h-[20vw] flex items-center justify-center filter drop-shadow-[0_40px_50px_rgba(245,158,11,0.5)]"
              style={{ perspective: '1000px' }}
            >
              <motion.div 
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-[15vw] leading-none"
              >
                👟
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Peniaga Aktif */}
          <div className="mt-[3vw]">
            <div className="flex justify-between items-center mb-[1.5vw]">
              <div className="flex items-center gap-[0.5vw]">
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-amber-500 text-[1.2vw]">●</motion.span>
                <h2 className="text-[1.5vw] font-black text-white uppercase tracking-tighter">Peniaga Hot 🔥</h2>
              </div>
            </div>
            
            <div className="flex gap-[1.5vw]">
              {['SUPREME BITE', 'AGROSEA HYPE'].map((name, i) => (
                <motion.div 
                  key={name}
                  initial={{ scale: 0, opacity: 0, rotate: -10 }}
                  animate={act >= 3 ? { scale: 1, opacity: 1, rotate: 0 } : {}}
                  transition={{ type: 'spring', bounce: 0.6, delay: 0.5 + i*0.1 }}
                  className="flex flex-col items-center gap-[0.8vw] group cursor-pointer"
                >
                  <div className="w-[6vw] h-[6vw] rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 border-2 border-white flex items-center justify-center text-[2.5vw] shadow-lg group-hover:scale-110 transition-transform">🏪</div>
                  <p className="text-[0.8vw] font-black text-white uppercase tracking-wider">{name}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Semua Produk */}
          <div className="mt-[4vw]">
            <div className="flex justify-between items-center mb-[2vw]">
              <h2 className="text-[1.5vw] font-black text-white uppercase tracking-tighter">Drops Terkini <span className="text-amber-500 font-normal ml-[0.5vw]">(12)</span></h2>
              <div className="px-[1vw] py-[0.5vw] rounded-sm bg-amber-500 text-black text-[0.8vw] font-black uppercase tracking-widest cursor-pointer hover:bg-white transition-colors">Tapis ⚡</div>
            </div>

            {/* Product Grid (Stomp Entry) */}
            <div className="grid grid-cols-4 gap-[1.5vw]">
              {products.map((p, i) => (
                <motion.div 
                  key={i}
                  initial={{ scale: 2, opacity: 0, filter: 'blur(20px)' }}
                  animate={act >= 4 ? { scale: 1, opacity: 1, filter: 'blur(0px)' } : {}}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.6 + i*0.1 }}
                  className="bg-[#111] border-2 border-white/10 rounded-xl aspect-[3/4] p-[1.5vw] relative flex flex-col justify-between overflow-hidden cursor-pointer group hover:border-amber-500 transition-colors"
                >
                  <div className="flex justify-between items-start relative z-10">
                    {i === 0 ? <span className="bg-red-600 text-white text-[0.6vw] font-black uppercase tracking-widest px-[0.8vw] py-[0.3vw] rounded-sm animate-pulse">Hampir Habis</span> : <span/>}
                    <span className="text-white text-[0.7vw] font-black uppercase tracking-widest bg-white/10 px-[0.6vw] py-[0.2vw] rounded-sm backdrop-blur-md">Pakaian</span>
                  </div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.3, rotate: -10 }}
                    className="absolute inset-0 flex items-center justify-center text-[6vw] drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)]"
                  >
                    👕
                  </motion.div>
                  
                  <div className="relative z-10 flex flex-col items-center mt-auto">
                     <p className="text-[1.2vw] font-black text-white uppercase tracking-tighter mb-[0.2vw]">Hoodie Rasmi</p>
                     <p className="text-[1vw] font-bold text-amber-500">RM 85</p>
                  </div>

                  {/* Add to Cart Interaction on first item */}
                  {i === 0 && act >= 5 && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }} 
                      animate={{ scale: [0, 2, 1], opacity: [0, 1, 0] }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 flex items-center justify-center bg-amber-500/50 z-20 backdrop-blur-sm"
                    >
                      <span className="text-[5vw] drop-shadow-lg">🛒🔥</span>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

        </div>

      </motion.div>

      <ModuleOverlay show={act>=6} num="Modul 04" name="PolyMart" tagline={mod.tagline} gc={gc} pos="bottom-[8%] right-[4%]" />
      <FloatAiChip show={act>=5} message="Sistem pasaran kampus berprestasi tinggi. Terus beli tanpa tunggu!" pos="top-[10%] right-[4%]" />
    </CinematicEnvelope>
  );
}

// ─── PolyMart Panel ───────────────────────────────────────────────────────────
function PolyMartPanel({ step, gc, clicking }: { step:number; gc:string; clicking:boolean }) {
  const [cart, setCart] = useState(0);
  const [clickedBtn, setClickedBtn] = useState<number|null>(null);
  useEffect(()=>{
    if(!clicking) return;
    setClickedBtn(0); setCart(1);
    setTimeout(()=>setClickedBtn(null), 500);
  },[clicking]);
  const products=[['Buku Kalkulus','RM 25','📘'],['Earphone Sony','RM 89','🎧'],['Kasut Sukan','RM 120','👟']];
  return (
    <div className="flex flex-col gap-[0.8vw]">
      <div className="flex items-center justify-between mb-[0.3vw]">
        <p className="text-[0.9vw] font-semibold text-white/80">PolyMart</p>
        <motion.div className="relative flex items-center gap-[0.3vw] text-[0.8vw] text-white/60">
          🛒 <AnimatePresence mode="wait"><motion.span key={cart} initial={{y:-10,opacity:0}} animate={{y:0,opacity:1}} exit={{y:10,opacity:0}} transition={{duration:0.3}} className="font-bold" style={{color:gc}}>{cart}</motion.span></AnimatePresence>
        </motion.div>
      </div>
      {products.map(([name,price,emoji],i)=>(
        <motion.div key={name} initial={{y:20,opacity:0}} animate={step>=1?{y:0,opacity:1}:{}} transition={{delay:i*0.2,duration:0.6}} className="flex items-center gap-[0.8vw] p-[0.8vw] rounded-[0.6vw] bg-[#161b22] border border-white/5">
          <div className="text-[1.8vw] leading-none">{emoji}</div>
          <div className="flex-1">
            <p className="text-[0.8vw] text-white/80">{name}</p>
            <p className="text-[0.75vw] font-bold" style={{color:gc}}>{price}</p>
          </div>
          <motion.button
            animate={clickedBtn===i?{scale:[1,0.85,1.15,1]}:{}}
            transition={{duration:0.35}}
            onClick={()=>{setClickedBtn(i);setCart(c=>c+1);}}
            className="px-[0.6vw] py-[0.3vw] rounded-[0.4vw] text-[0.65vw] font-bold text-black cursor-pointer"
            style={{background:step>=2||clicking?gc:'#333'}}
          >+ Troli</motion.button>
        </motion.div>
      ))}
      {cart>0&&<motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="text-center p-[0.5vw] rounded-[0.5vw] text-[0.7vw]" style={{background:gc+'20',color:gc}}>
        ✓ {cart} item dalam troli
      </motion.div>}
    </div>
  );
}
// ─── Scene 05: Sistem Kelab — "The Talent Constellation" ───────────────────────
function KelabScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [tickerIdx, setTickerIdx] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 300),   // "27" big number
      setTimeout(() => setAct(2), 1500),  // glitch shake & explode
      setTimeout(() => setAct(3), 2800),  // core appears + orbital cards
      setTimeout(() => setAct(4), 3800),  // data streams
      setTimeout(() => setAct(5), 5500),  // flash / module overlay
    ];
    const ticker = setInterval(() => {
      setTickerIdx(prev => (prev + 1) % 6);
    }, 400); // Very fast ticker
    return () => { ts.forEach(clearTimeout); clearInterval(ticker); };
  }, []);
  const gc = mod.gc;
  const gold = '#fbbf24';
  const fire = '#dc2626';

  const tickerNames = ["KELAB ORASAS", "KELAB KEBUDAYAAN", "KELAB E-SPORT", "KELAB SILAT OLAHRAGA", "RAKAN SISWA YADIM", "KELAB KEMBARA"];

  const clubs = [
    { icon: '🎭', act: 'Seni', d: 0, r: -40, pos: { top: '10%', left: '20%' } },
    { icon: '⚽', act: 'Sukan', d: 0.2, r: 35, pos: { top: '30%', right: '15%' } },
    { icon: '💻', act: 'Teknologi', d: 0.4, r: 25, pos: { bottom: '20%', left: '15%' } },
    { icon: '🏕️', act: 'Rekreasi', d: 0.6, r: -20, pos: { bottom: '25%', right: '20%' } },
  ];

  return (
    <CinematicEnvelope gc={fire}>
      {/* Phase 1-2: Giant "27" fills screen */}
      <AnimatePresence>
        {act >= 1 && act < 3 && (
          <motion.div key="bignum" 
            initial={{opacity:0, scale:0.4, filter:'blur(30px)'}} 
            animate={act>=2 ? {opacity:1, scale:1, filter:'blur(0px)', x:[0,-15,15,-10,10,-5,5,0], y:[0,10,-10,5,-5,0]} : {opacity:1, scale:1, filter:'blur(0px)'}} 
            exit={{opacity:0, scale:8, filter:'blur(40px)'}} 
            transition={act>=2 ? {duration:0.6, ease:'easeInOut'} : spB(0)} 
            className="absolute inset-0 flex flex-col items-center justify-center mix-blend-screen"
          >
            <SlotMachineNumber target="27" active={act>=1} gc={gold} size="35vw" />
            <motion.p initial={{clipPath:'inset(0 100% 0 0)'}} animate={{clipPath:'inset(0 0% 0 0)'}} transition={sp(0.3)} className="text-[2.5vw] font-black tracking-[0.5em] uppercase text-white drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">
              KELAB AKTIF
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 3+: Holographic Data Core & Orbital Cards */}
      <AnimatePresence>
        {act >= 3 && (
          <motion.div key="core-env" 
            initial={{opacity:0, scale:1.5, rotateY:45, rotateX:20}} 
            animate={{opacity:1, scale:1, rotateY:[-10,10,-10], rotateX:[5,-5,5]}} 
            transition={{scale:{duration:1.2, ease:CE}, rotateY:{duration:15, repeat:Infinity, ease:'easeInOut'}, rotateX:{duration:12, repeat:Infinity, ease:'easeInOut'}}} 
            className="absolute inset-0 flex items-center justify-center overflow-hidden" 
            style={{perspective:'1500px', transformStyle:'preserve-3d'}}
          >
            {/* The Central Network Constellation */}
            <div className="relative flex items-center justify-center z-10 w-[40vw] h-[40vw]" style={{transformStyle:'preserve-3d'}}>
              
              {/* Network Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                <motion.circle cx="50%" cy="50%" r="30%" fill="none" stroke={gold} strokeWidth="2" strokeDasharray="10 20" animate={{rotate:360}} transition={{duration:30, repeat:Infinity, ease:'linear'}} style={{transformOrigin:'50% 50%'}} />
                <motion.circle cx="50%" cy="50%" r="40%" fill="none" stroke={fire} strokeWidth="1" strokeDasharray="5 15" animate={{rotate:-360}} transition={{duration:40, repeat:Infinity, ease:'linear'}} style={{transformOrigin:'50% 50%'}} />
                {/* Connecting Arcs */}
                <path d="M 20% 20% Q 50% 50% 80% 80% M 20% 80% Q 50% 50% 80% 20%" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              </svg>

              {/* Center Node */}
              <motion.div 
                animate={{scale:[1, 1.1, 1], opacity:[0.8, 1, 0.8]}} 
                transition={{duration:0.8, repeat:Infinity, ease:'easeInOut'}} 
                className="absolute flex items-center justify-center w-[12vw] h-[12vw] rounded-full border border-white/20 bg-black/50 backdrop-blur-md shadow-[0_0_50px_rgba(220,38,38,0.6)]" 
                style={{transformStyle:'preserve-3d'}}
              >
                <p className="text-[1.5vw] font-black uppercase text-center tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-red-500 leading-tight">
                  <span className="text-[3vw]">27</span><br/>KELAB
                </p>
              </motion.div>
              
              {/* Spinning High-Speed Ticker */}
              <motion.div animate={{rotateZ:360}} transition={{duration:15, repeat:Infinity, ease:'linear'}} className="absolute w-[25vw] h-[25vw] rounded-full border border-dashed border-yellow-500/30" style={{transformStyle:'preserve-3d'}} />
              
              <div className="absolute top-[8%] flex justify-center w-full z-20">
                <motion.div 
                  key={tickerIdx} initial={{opacity:0, scale:0.5, filter:'blur(10px)'}} animate={{opacity:1, scale:1, filter:'blur(0px)'}} exit={{opacity:0, scale:1.5}}
                  className="px-[1.5vw] py-[0.5vw] rounded-full border border-white/20 bg-red-900/40 backdrop-blur-md"
                >
                  <p className="text-[1.2vw] font-black text-white tracking-[0.3em] uppercase drop-shadow-[0_0_10px_rgba(255,0,0,1)]">
                    {tickerNames[tickerIdx]}
                  </p>
                </motion.div>
              </div>

            </div>

            {/* Constellation Nodes (Icons) */}
            {clubs.map((c, i) => (
              <motion.div key={i} 
                initial={{opacity:0, scale:0, filter:'blur(20px)', rotateY:c.r, rotateX:c.r}}
                animate={{opacity:1, scale:1, filter:'blur(0px)', rotateY:0, rotateX:0, y:[0, 15, 0]}}
                transition={{delay:0.3 + c.d, scale:{type:'spring', stiffness:200}, y:{duration:3+i*0.5, repeat:Infinity, ease:'easeInOut'}}}
                className="absolute flex flex-col items-center gap-[0.5vw]"
                style={{...c.pos, transformStyle:'preserve-3d'}}
              >
                <div className="relative flex items-center justify-center w-[5vw] h-[5vw] rounded-full border border-white/20 bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(251,191,36,0.4)]">
                  <motion.div className="absolute inset-0 rounded-full border-[2px] border-dashed border-red-500" animate={{rotate:360}} transition={{duration:10+i, repeat:Infinity, ease:'linear'}} />
                  <p className="text-[2.5vw] filter drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">{c.icon}</p>
                </div>
                <div className="px-[0.8vw] py-[0.3vw] rounded-[0.5vw] bg-black/60 border border-white/10 backdrop-blur-sm">
                  <p className="text-[0.7vw] font-bold text-yellow-400 tracking-widest uppercase">{c.act}</p>
                </div>
              </motion.div>
            ))}

            {/* Phase 4: Data Constellation Flash */}
            <AnimatePresence>
              {act >= 4 && (
                <div className="absolute inset-0 pointer-events-none z-0 mix-blend-screen">
                  {[...Array(20)].map((_, i) => (
                    <motion.div key={i}
                      initial={{opacity:0, scale:0}}
                      animate={{opacity:[0, 0.8, 0], scale:[0, 2]}}
                      transition={{duration:Math.random()*0.5+0.2, repeat:Infinity, repeatDelay:Math.random()*1.5}}
                      className="absolute w-[1vw] h-[1vw] bg-white rounded-full blur-[2px]"
                      style={{top:Math.random()*100+'%', left:Math.random()*100+'%', boxShadow:'0 0 20px #fff'}}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=5} num="Modul 05" name="Sistem Kelab" tagline={mod.tagline} gc={gold} pos="bottom-[6%] left-[22%]" />

      {/* Screen Shake & Flash on Core Entry */}
      <AnimatePresence>
        {act === 3 && (
          <motion.div key="core-flash" initial={{opacity:0}} animate={{opacity:[0, 0.8, 0]}} exit={{opacity:0}}
            transition={{duration:0.6, times:[0, 0.1, 1]}} className="absolute inset-0 z-50 pointer-events-none mix-blend-screen"
            style={{background:`radial-gradient(circle at 50% 50%, ${gold} 0%, ${fire} 40%, transparent 80%)`}} 
          />
        )}
      </AnimatePresence>
    </CinematicEnvelope>
  );
}

// ─── SUPSAS Panel ─────────────────────────────────────────────────────────────
function KelabPanel({ step, gc, clicking }: { step:number; gc:string; clicking:boolean }) {
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [gol, setGol] = useState(false);
  useEffect(()=>{
    if(!clicking) return;
    setGol(true);
    setScore1(4);
    setTimeout(()=>setGol(false), 1200);
  },[clicking]);
  useEffect(()=>{
    if(step<2) return;
    const t1=setTimeout(()=>setScore1(3),1000);
    const t2=setTimeout(()=>setScore2(1),1500);
    const t3=setTimeout(()=>setScore1(4),4000);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3)};
  },[step]);
  const sports=[['Bola Sepak','Separuh Akhir',85],['Badminton','Pusingan Akhir',100],['Ping Pong','Kumpulan A',60]];
  return (
    <div className="flex flex-col gap-[1vw] relative">
      {/* GOL flash overlay */}
      <AnimatePresence>
        {gol && (
          <motion.div key="gol" initial={{opacity:0}} animate={{opacity:[0,1,1,0]}} transition={{duration:1.2,times:[0,0.1,0.7,1]}} className="absolute inset-0 z-30 flex items-center justify-center rounded-[0.8vw]" style={{background:gc+'CC'}}>
            <motion.p initial={{scale:0.4,rotate:-8}} animate={{scale:[0.4,1.3,1],rotate:[-8,4,0]}} transition={{duration:0.5,ease:[0.34,1.56,0.64,1]}} className="text-[4vw] font-black text-black tracking-tighter">GOL! ⚽</motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div initial={{opacity:0}} animate={step>=1?{opacity:1}:{}} className="p-[1vw] rounded-[0.8vw] border" style={{borderColor:gc+'40',background:gc+'08'}}>
        <p className="text-[0.7vw] text-white/40 mb-[0.8vw] text-center">🏆 SUPSAS 2024 — Separuh Akhir</p>
        <div className="flex items-center justify-between gap-[1vw]">
          <div className="flex-1 text-center">
            <p className="text-[0.8vw] text-white/70 mb-[0.5vw]">Kolej A</p>
            <motion.p key={score1} initial={{scale:1.5,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:0.4,ease:[0.34,1.56,0.64,1]}} className="text-[3vw] font-black" style={{color:gc}}>{score1}</motion.p>
          </div>
          <p className="text-[1vw] text-white/30 font-bold">VS</p>
          <div className="flex-1 text-center">
            <p className="text-[0.8vw] text-white/70 mb-[0.5vw]">Kolej B</p>
            <motion.p key={score2} initial={{scale:1.5,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:0.4,ease:[0.34,1.56,0.64,1]}} className="text-[3vw] font-black text-white">{score2}</motion.p>
          </div>
        </div>
      </motion.div>
      {sports.map(([sport,stage,pct],i)=>(
        <motion.div key={sport} initial={{x:30,opacity:0}} animate={step>=3?{x:0,opacity:1}:{}} transition={{delay:i*0.15,duration:0.6}} className="flex items-center gap-[0.8vw]">
          <p className="text-[0.75vw] text-white/60 w-[6vw]">{sport}</p>
          <div className="flex-1 h-[0.5vw] rounded-full bg-white/10 overflow-hidden">
            <motion.div initial={{width:0}} animate={step>=3?{width:`${pct}%`}:{width:0}} transition={{delay:0.5+i*0.1,duration:1,ease:[0.25,1,0.5,1]}} className="h-full rounded-full" style={{background:gc}} />
          </div>
          <p className="text-[0.65vw] text-white/30 w-[5vw] text-right">{stage}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Cinematic Typography Reveal (Conclusion) ──────────────────────────────────
function TheNumbers() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setStep(1), 1000), // Line 1
      setTimeout(() => setStep(2), 2500), // Line 2
      setTimeout(() => setStep(3), 4500), // Fade Out
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0, scale:0.95}} transition={{duration:1.5}} className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
      
      {/* Sweeping Light Flare */}
      <motion.div 
        initial={{x: '-100vw', opacity: 0}}
        animate={{x: '100vw', opacity: [0, 0.5, 0]}}
        transition={{duration: 4, ease: "easeInOut"}}
        className="absolute w-[20vw] h-[150vh] rotate-[25deg] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent blur-[30px] pointer-events-none"
      />

      <div className="flex flex-col items-center text-center z-10">
        <motion.h1 
          initial={{opacity: 0, y: 30, filter: 'blur(10px)'}}
          animate={step >= 3 ? {opacity: 0, y: -20, filter: 'blur(20px)'} : step >= 1 ? {opacity: 1, y: 0, filter: 'blur(0px)'} : {}}
          transition={{duration: 1.5, ease: [0.25, 1, 0.5, 1]}}
          className="text-[6vw] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 mb-[1vw]"
        >
          1 PLATFORM TUNGGAL.
        </motion.h1>

        <motion.h1 
          initial={{opacity: 0, y: 30, filter: 'blur(10px)'}}
          animate={step >= 3 ? {opacity: 0, y: -20, filter: 'blur(20px)'} : step >= 2 ? {opacity: 1, y: 0, filter: 'blur(0px)'} : {}}
          transition={{duration: 1.5, ease: [0.25, 1, 0.5, 1]}}
          className="text-[5vw] font-bold leading-none tracking-tighter text-indigo-500"
          style={{textShadow: '0 10px 30px rgba(99,102,241,0.3)'}}
        >
          5 MODUL BERSEPADU.
        </motion.h1>
      </div>

    </motion.div>
  );
}

// ─── FloatingMockup ──────────────────────────────────────────────────────────
function FloatingMockup({ flyAway }: { flyAway: boolean }) {
  const ctrl = useAnimation();
  
  useEffect(() => {
    if (flyAway) {
      ctrl.stop();
      ctrl.start({
        opacity: 0,
        scale: 0.9,
        filter: 'blur(20px)',
        transition: { duration: 1.5, ease: [0.25, 1, 0.5, 1] }
      });
    } else {
      ctrl.start({
        x: '2vw', rotateY: -25, rotateX: 10, opacity: 1, scale: 1,
        transition: { duration: 3, ease: [0.25, 1, 0.5, 1] }
      }).then(() => {
        if (!flyAway) {
          ctrl.start({
            y: [0, -15, 0],
            rotateY: [-25, -20, -25],
            transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' }
          });
        }
      });
    }
  }, [flyAway, ctrl]);

  return (
    <motion.div animate={ctrl} initial={{x:'0vw', y:0, rotateY:-10, rotateX:0, opacity:0, scale:4}}
      className="absolute right-[-2vw] w-[65vw] h-[40vw] rounded-[1.5vw] flex z-20"
      style={{transformStyle:'preserve-3d'}}>
      
      {/* Background Holographic Glow */}
      <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full mix-blend-screen" style={{transform:'translateZ(-100px)'}} />

      {/* Main Glass Screen */}
      <div className="absolute inset-0 rounded-[1.5vw] border border-white/20 bg-black/40 backdrop-blur-xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex">
        {/* Sidebar */}
        <div className="w-[20%] h-full flex flex-col bg-white/5 border-r border-white/10 p-[1vw]">
          <div className="flex items-center gap-[0.5vw] mb-[2vw]">
            <div className="w-[2vw] h-[2vw] rounded-md bg-gradient-to-br from-indigo-500 to-purple-600" />
            <div className="flex flex-col">
              <span className="text-[0.6vw] font-black leading-none tracking-widest text-white">JPP</span>
              <span className="text-[0.4vw] font-bold leading-none tracking-widest text-white/50">POLISAS</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-[0.5vw]">
            <div className="w-full h-[1.5vw] bg-indigo-500/20 rounded-md border border-indigo-500/30" />
            <div className="w-full h-[1.5vw] bg-white/5 rounded-md" />
            <div className="w-full h-[1.5vw] bg-white/5 rounded-md" />
            <div className="w-full h-[1.5vw] bg-white/5 rounded-md" />
          </div>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 p-[2vw] flex flex-col">
          <div className="w-[15vw] h-[2vw] bg-white/10 rounded-full mb-[2vw]" />
          {/* Chart Wireframe */}
          <div className="flex-1 bg-white/5 rounded-[1vw] border border-white/10 p-[1vw] flex items-end gap-[0.5vw]">
            {[40, 60, 30, 80, 50, 90, 70, 100].map((h, i) => (
              <motion.div key={i} className="flex-1 bg-indigo-500/30 rounded-t-md" initial={{height:0}} animate={{height:`${h}%`}} transition={{duration:1, delay:1.5 + i*0.1}} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── AtmosphereDots ──────────────────────────────────────────────────────────

// ─── MajesticShield ───────────────────────────────────────────────────────────
// ─── MajesticShield ───────────────────────────────────────────────────────────
function MajesticShield({ active }: { active:boolean }) {
  if (!active) return null;
  const gold = '#fbbf24'; // amber-400
  const sports = ['⚽', '🏀', '🏸', '🏃‍♂️', '🏐', '🏆', '🎯', '🥇'];
  return (
    <motion.div 
      initial={{scale:0.8, opacity:0}} 
      animate={{scale:1, opacity:1}} 
      exit={{scale:1.5, opacity:0, filter:'blur(40px)'}}
      transition={{duration:1, exit:{duration:0.8}}} 
      className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{transformStyle:'preserve-3d'}}>
      
      {/* Intense Golden Shockwaves */}
      {[...Array(3)].map((_, i) => (
        <motion.div key={`sw${i}`}
          initial={{scale:0, opacity:0.8}}
          animate={{scale:[0, 2, 4], opacity:[0.8, 0.4, 0]}}
          transition={{duration:3, repeat:Infinity, delay:i*1, ease:'easeOut'}}
          className="absolute w-[30vw] h-[30vw] rounded-full border-[2px]"
          style={{borderColor:gold, boxShadow:`0 0 40px ${gold}, inset 0 0 20px ${gold}`}}
        />
      ))}

      {/* Radial Golden Sunburst */}
      <motion.div animate={{rotate:360}} transition={{duration:20, repeat:Infinity, ease:'linear'}} className="absolute w-[80vw] h-[80vw] opacity-20 pointer-events-none" style={{background:`repeating-conic-gradient(from 0deg, ${gold} 0deg 10deg, transparent 10deg 20deg)`}} />

      {/* Floating Sports Orbit */}
      <motion.div animate={{rotateZ:360}} transition={{duration:20, repeat:Infinity, ease:'linear'}} className="absolute w-[40vw] h-[40vw] flex items-center justify-center pointer-events-none">
        {sports.map((sp, i) => {
          const angle = (i / sports.length) * 360;
          return (
            <div key={i} className="absolute" style={{transform:`rotate(${angle}deg) translateY(-20vw)`}}>
              <motion.div animate={{rotateZ:-360}} transition={{duration:20, repeat:Infinity, ease:'linear'}} className="text-[3vw] drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] filter grayscale sepia saturate-200 hue-rotate-30">
                {sp}
              </motion.div>
            </div>
          )
        })}
      </motion.div>

      {/* The Trophy & Wreath Center */}
      <motion.div 
        initial={{y:50, opacity:0, rotateY:-90}} 
        animate={{y:[0,-10,0], opacity:1, rotateY:[-10,10,-10]}} 
        transition={{y:{duration:4, repeat:Infinity, ease:'easeInOut'}, rotateY:{duration:6, repeat:Infinity, ease:'easeInOut'}, opacity:{duration:1}}}
        className="relative flex flex-col items-center justify-center z-20">
        
        {/* SVG Laurel Wreath */}
        <svg viewBox="0 0 200 200" className="absolute w-[28vw] h-[28vw] drop-shadow-[0_0_20px_rgba(251,191,36,1)] z-0" style={{fill:'none', stroke:gold, strokeWidth:3}}>
          {/* Left Branch */}
          <motion.path initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:2}} d="M100,180 C40,180 20,120 30,60 C35,40 50,20 70,10" />
          {/* Right Branch */}
          <motion.path initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:2}} d="M100,180 C160,180 180,120 170,60 C165,40 150,20 130,10" />
          {/* Leaves */}
          <motion.g initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.5, duration:1}} style={{fill:gold+'80', stroke:'none'}}>
            <path d="M30,60 C40,50 50,60 40,70 Z" /><path d="M40,90 C55,80 60,95 45,105 Z" /><path d="M60,130 C75,120 80,140 65,150 Z" />
            <path d="M170,60 C160,50 150,60 160,70 Z" /><path d="M160,90 C145,80 140,95 155,105 Z" /><path d="M140,130 C125,120 120,140 135,150 Z" />
          </motion.g>
        </svg>

        {/* Massive 3D Trophy / Emblem */}
        <motion.div animate={{scale:[1, 1.05, 1], filter:['brightness(1)', 'brightness(1.5)', 'brightness(1)']}} transition={{duration:2, repeat:Infinity}} className="text-[12vw] z-10 drop-shadow-[0_0_50px_rgba(251,191,36,1)] leading-none mb-[1vw]" style={{filter:'drop-shadow(0 20px 30px rgba(0,0,0,0.8))'}}>
          🏆
        </motion.div>

        {/* Majestic Typography */}
        <div className="flex flex-col items-center mt-[1vw] z-20">
          <motion.span initial={{letterSpacing:'0em', opacity:0}} animate={{letterSpacing:'0.4em', opacity:1}} transition={{duration:1.5, delay:0.5}} className="text-[1.2vw] font-bold text-white/90 drop-shadow-[0_0_10px_rgba(251,191,36,1)] uppercase">
            Sukan Tahunan Polisas
          </motion.span>
          <motion.span 
            initial={{scale:3, opacity:0}} animate={{scale:1, opacity:1}} transition={{duration:0.5, delay:1, type:'spring', stiffness:200}} 
            className="text-[5vw] font-black leading-none tracking-tighter drop-shadow-[0_0_40px_rgba(251,191,36,1)]" style={{color:gold}}>
            SUPSAS 2026
          </motion.span>
        </div>
      </motion.div>
      
      {/* Background Particles */}
      <ParticleField gc={gold} />
    </motion.div>
  );
}

// ─── Searchlights ─────────────────────────────────────────────────────────────
function GrandSearchlights() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-60">
      <motion.div
        animate={{ rotate: [-20, 40, -20] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-10vw] left-[-10vw] w-[50vw] h-[120vh]"
        style={{ background: 'conic-gradient(from 180deg at 50% 100%, transparent 0deg, rgba(255,255,255,0.1) 10deg, transparent 20deg)', transformOrigin: 'bottom center' }}
      />
      <motion.div
        animate={{ rotate: [20, -40, 20] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-[-10vw] right-[-10vw] w-[50vw] h-[120vh]"
        style={{ background: 'conic-gradient(from 180deg at 50% 100%, transparent 0deg, rgba(255,255,255,0.1) 10deg, transparent 20deg)', transformOrigin: 'bottom center' }}
      />
    </div>
  );
}

// ─── InfiniteMarquee ──────────────────────────────────────────────────────────
function InfiniteMarquee() {
  return (
    <div className="absolute top-[25%] left-0 right-0 w-full overflow-hidden pointer-events-none z-0 opacity-10 flex">
      <motion.div animate={{x: ['0%', '-50%']}} transition={{duration: 20, repeat: Infinity, ease: 'linear'}} className="flex whitespace-nowrap">
        <h1 className="text-[15vw] font-black italic tracking-tighter text-white leading-none px-[2vw]">
          ACARA TAHUNAN - SUPSAS DAN FESTIVAL
        </h1>
        <h1 className="text-[15vw] font-black italic tracking-tighter text-white leading-none px-[2vw]">
          ACARA TAHUNAN - SUPSAS DAN FESTIVAL
        </h1>
      </motion.div>
    </div>
  );
}

// ─── FireworksEffect ───────────────────────────────────────────────────────────
function FireworksEffect({ active }: { active:boolean }) {
  if (!active) return null;
  const colors = ['#f97316', '#d946ef', '#14b8a6', '#eab308'];
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(6)].map((_, i) => {
        const c = colors[i % colors.length];
        return (
          <motion.div key={`fw${i}`}
            initial={{x:`${10 + i*15}vw`, y:`80vh`, scale:0}}
            animate={{scale:[0, 1.5, 1.5], opacity:[1, 1, 0], y: [`80vh`, `${10 + (i%2)*15}vh`, `${15 + (i%2)*15}vh`]}}
            transition={{duration:2.5, repeat:Infinity, delay:i*0.4, ease:'easeOut'}}
            className="absolute flex items-center justify-center"
          >
            {[...Array(12)].map((_, j) => (
              <motion.div key={j}
                initial={{x:0, y:0, opacity:1}}
                animate={{
                  x: Math.cos((j * 30) * Math.PI / 180) * 15 + 'vw',
                  y: Math.sin((j * 30) * Math.PI / 180) * 15 + 'vw',
                  opacity: 0
                }}
                transition={{duration:1.2, delay:1 + i*0.4, ease:'easeOut', repeat:Infinity, repeatDelay:1.3}}
                className="absolute rounded-full"
                style={{width:'0.5vw', height:'0.5vw', background:c, boxShadow:`0 0 15px ${c}`}}
              />
            ))}
          </motion.div>
        );
      })}
    </div>
  );
}

// ——— Scene 06: Karnival & SUPSAS — "Festival Gemilang" ——————————————————————————
function KarnivalScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const gc = mod.gc;

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Phase 1: Keagungan SUPSAS (Shield)
      setTimeout(() => setAct(2), 4000),  // Phase 2: Screen Shake / Transition
      setTimeout(() => setAct(3), 4200),  // Phase 3: Festival Karnival Gemilang (Searchlights, Marquee, Fireworks & Cards)
      setTimeout(() => setAct(4), 5500),  // Text Karnival
      setTimeout(() => setAct(5), 7500),  // Module overlay
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
      <motion.div 
        animate={act===2 ? {x:[-15,15,-15,15,-5,5,0], y:[-15,15,-15,15,-5,5,0]} : {x:0, y:0}}
        transition={{duration:0.2, ease:'linear'}}
        className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{perspective:'1500px'}}>
        
        {/* Phase 1: Keagungan SUPSAS */}
        <AnimatePresence>
          {act === 1 && <MajesticShield active={act === 1} />}
        </AnimatePresence>

        {/* Phase 3+: Kemeriahan Karnival (Searchlights, Marquee, Fireworks, Strobe, Confetti) */}
        <AnimatePresence>
          {act >= 3 && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute inset-0 pointer-events-none">
              <GrandSearchlights />
              <InfiniteMarquee />
              
              {/* Joyful strobe */}
              <motion.div animate={{opacity:[0.1, 0.4, 0.1]}} transition={{duration:0.4, repeat:Infinity, ease:'linear'}} className="absolute inset-0" style={{background:`radial-gradient(ellipse at 50% 50%, ${gc}50 0%, transparent 70%)`}} />
              <FireworksEffect active={act>=3} />
              <ConfettiCannon active={act>=3} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 4+: Festival Cards Explode In & Dynamic Text */}
        <AnimatePresence>
          {act >= 3 && (
            <motion.div 
              initial={{opacity:0, scale:0.5, rotateY:15, rotateX:8}} 
              animate={{opacity:1, scale:1, rotateY:[-2,2,-2], rotateX:[1,-1,1]}} 
              transition={{scale:{duration:1.5,ease:CE}, rotateY:{duration:8,repeat:Infinity,ease:'easeInOut'}, rotateX:{duration:7,repeat:Infinity,ease:'easeInOut'}}} 
              className="absolute inset-0 flex items-center justify-center" style={{transformStyle:'preserve-3d'}}>
              
              {act >= 4 && (
                <motion.div
                  initial={{opacity:0, y:50, scale:0.5}}
                  animate={{opacity:1, y:[0, -10, 0], scale:1, rotateX:[0, 5, 0]}}
                  transition={{y:{duration:3, repeat:Infinity, ease:'easeInOut'}, scale:{duration:0.8, type:'spring'}, opacity:{duration:0.8}}}
                  className="relative z-20 text-center drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]">
                  <p className="text-[2.2vw] font-black uppercase tracking-[0.6em] mb-[1vw]" style={{color:gc, textShadow:`0 0 30px ${gc}`}}>KARNIVAL GEMILANG</p>
                  <h2 className="text-[7vw] font-black leading-none text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]">FESTIVAL<br/>KAMPUS</h2>
                </motion.div>
              )}

              {cards.map((c, i) => (
                <motion.div key={c.label}
                  initial={{x:0, y:0, scale:0, opacity:0, rotateZ:0}}
                  animate={{
                    x:`${c.x}vw`, 
                    y:[`${c.y}vw`, `${c.y - 2}vw`, `${c.y}vw`], 
                    scale:1, 
                    opacity:1, 
                    rotateZ:[c.r, c.r+3, c.r],
                    rotateY:[0, 15, -15, 0],
                    rotateX:[0, -10, 10, 0]
                  }}
                  transition={{
                    x:{delay:c.delay, type:'spring', stiffness:120, damping:12},
                    y:{duration:4+i, repeat:Infinity, ease:'easeInOut'},
                    rotateZ:{duration:5+i, repeat:Infinity, ease:'easeInOut'},
                    rotateY:{duration:6+i, repeat:Infinity, ease:'easeInOut'},
                    rotateX:{duration:7+i, repeat:Infinity, ease:'easeInOut'},
                    scale:{delay:c.delay, type:'spring', stiffness:150},
                    opacity:{delay:c.delay, duration:0.5}
                  }}
                  className="absolute z-30 p-[2vw] rounded-[2vw] flex flex-col items-center justify-center overflow-hidden"
                  style={{
                    background:'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))', 
                    border:`1px solid ${gc}80`, 
                    boxShadow:`0 20px 40px rgba(0,0,0,0.5), inset 0 0 20px ${gc}40`, 
                    backdropFilter:'blur(20px)', 
                    transformStyle:'preserve-3d'
                  }}>
                  
                  {/* Glass Shimmer / Flare */}
                  <motion.div 
                    animate={{x:['-150%', '250%']}} 
                    transition={{duration:2.5, repeat:Infinity, delay:i*0.5, repeatDelay:3}}
                    className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-45deg]" 
                  />

                  {/* Icon & Label */}
                  <div className="relative z-10 flex flex-col items-center" style={{transform:'translateZ(30px)'}}>
                    <motion.div animate={{scale:[1, 1.15, 1], rotateY:[-10,10,-10]}} transition={{duration:2, delay:i*0.1, repeat:Infinity, ease:'easeInOut'}} className="text-[5vw] mb-[0.8vw] drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" style={{filter:`drop-shadow(0 0 15px ${gc})`}}>
                      {c.icon}
                    </motion.div>
                    <p className="text-[1vw] font-black uppercase tracking-widest text-white text-center" style={{textShadow:`0 4px 10px rgba(0,0,0,0.8)`}}>{c.label}</p>
                    <div className="h-[3px] w-[60%] mt-[0.8vw] rounded-full" style={{background:gc, boxShadow:`0 0 15px ${gc}`}} />
                  </div>

                </motion.div>
              ))}

            </motion.div>
          )}
        </AnimatePresence>

        <ModuleOverlay show={act>=5} num="Modul 06" name="SUPSAS & Karnival" tagline={mod.tagline} gc={gc} pos="bottom-[8%] right-[8%]" />
      </motion.div>
    </CinematicEnvelope>
  );
}

function KarnivalPanel({ step, gc, dc, clicking }: { step:number; gc:string; dc:string; clicking:boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-[1vw] text-center gap-[0.5vw]">
      <motion.div animate={{rotate:[0,10,-10,0], scale:[1,1.2,1]}} transition={{duration:0.5, repeat:Infinity}} className="text-[3vw]">🎉</motion.div>
      <p className="text-[1.2vw] font-black" style={{color:gc}}>KARNIVAL GEMILANG</p>
      <p className="text-[0.6vw] text-white/50">Bersedia untuk acara tahunan paling meriah!</p>
    </div>
  );
}
function AtmosphereDots() {
  const dots = useMemo(()=>Array.from({length:40},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,s:Math.random()*2+1,dur:Math.random()*10+8,del:Math.random()*5,dr:(Math.random()-0.5)*4})),[]);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {dots.map(d=>(
        <motion.div key={d.id} className="absolute rounded-full bg-white" style={{left:`${d.x}%`,top:`${d.y}%`,width:d.s,height:d.s,opacity:0}} animate={{opacity:[0,0.25,0],y:[0,-30,-60],x:[0,d.dr,d.dr*2]}} transition={{duration:d.dur,delay:d.del,repeat:Infinity,ease:'linear'}} />
      ))}
    </div>
  );
}

// ─── Mask ────────────────────────────────────────────────────────────────────
function Mask({ text, show, delay, cls }: { text:string; show:boolean; delay:number; cls:string }) {
  return (
    <div className="overflow-hidden py-1">
      <motion.div initial={{y:'110%'}} animate={show?{y:'0%'}:{y:'110%'}} transition={{delay,duration:1.2,ease:[0.25,1,0.5,1]}} className={cls}>{text}</motion.div>
    </div>
  );
}

