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
      setTimeout(() => setPhase(1),  2000),
      setTimeout(() => setPhase(2),  4000),
      setTimeout(() => setPhase(3),  6000),
      setTimeout(() => setPhase(4),  6200),
      setTimeout(() => setPhase(5),  7000),
      setTimeout(() => setPhase(6),  10000),
      setTimeout(() => setPhase(7),  13000),
      setTimeout(() => setPhase(8),  16000),
      setTimeout(() => setPhase(9),  18000),
      setTimeout(() => { setPhase(10); doWipe(0); }, 21000),
      setTimeout(() => doWipe(1), 33000),
      setTimeout(() => doWipe(2), 45000),
      setTimeout(() => doWipe(3), 57000),
      setTimeout(() => doWipe(4), 69000),
      setTimeout(() => doWipe(5), 81000),
      setTimeout(() => setPhase(15), 93000),
      setTimeout(() => setPhase(16), 97000),
      setTimeout(() => setPhase(17), 101000),
      setTimeout(() => setPhase(18), 103000),
      setTimeout(() => setPhase(19), 109000),
      setTimeout(() => setPhase(20), 114000),
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
        {/* Pain Points — Glitch text with chromatic aberration */}
        {phase === 0 && <GlitchText key="p0" text="Sistem Tradisional." />}
        {phase === 1 && <GlitchText key="p1" text="Menunggu Tanpa Jawapan." />}
        {phase === 2 && <GlitchText key="p2" text="Kertas Kerja Terabai." />}

        {/* Flashbang */}
        {phase === 3 && <motion.div key="p3" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.08}} className="absolute inset-0 z-50 bg-white" />}

        {/* Black Silence */}
        {phase === 4 && <motion.div key="p4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}} className="absolute inset-0 bg-black" />}

        {/* Sudah Tamat — typewriter reveal: types red, resolves white */}
        {phase === 5 && (
          <motion.div key="p5" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.5}} className="absolute inset-0 flex items-center justify-center">
            <SudahTamatText />
          </motion.div>
        )}

        {/* Vision — warm ambient bloom + mask-lift */}
        {phase === 6 && <VisionText key="p6" text="Bayangkan sebuah sistem..." />}
        {phase === 7 && <VisionText key="p7" text="...yang sentiasa ada untuk anda." />}

        {/* Memperkenalkan — expanding rings + dramatic mask-lift */}
        {phase === 8 && (
          <motion.div key="p8" className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden" exit={{opacity:0,scale:1.06,filter:'blur(10px)'}} transition={{duration:1.2}}>
            {/* 3 expanding concentric rings */}
            {[0, 0.4, 0.8].map((d, i) => (
              <motion.div key={i}
                initial={{scale:0,opacity:0.7}} animate={{scale:4,opacity:0}}
                transition={{duration:2.8,delay:d,ease:'easeOut',repeat:Infinity,repeatDelay:0.8}}
                className="absolute w-[12vw] h-[12vw] rounded-full"
                style={{border:'1px solid rgba(99,102,241,0.5)'}} />
            ))}
            {/* Top line */}
            <motion.div initial={{width:'0vw'}} animate={{width:'55vw'}} transition={{duration:1.3,ease:SE}} className="h-px bg-gradient-to-r from-transparent via-white/50 to-transparent mb-[2.8vw]" />
            {/* Mask-lift text */}
            <div style={{overflow:'hidden',paddingBottom:'0.15em'}}>
              <motion.h2
                initial={{y:'110%'}} animate={{y:'0%'}}
                transition={{delay:0.35,duration:1.3,ease:[0.25,1,0.5,1]}}
                className="text-[2.8vw] font-light tracking-[0.65em] text-white/85 uppercase">
                Memperkenalkan
              </motion.h2>
            </div>
            {/* Bottom line */}
            <motion.div initial={{width:'0vw'}} animate={{width:'55vw'}} transition={{delay:0.3,duration:1.3,ease:SE}} className="h-px bg-gradient-to-r from-transparent via-white/25 to-transparent mt-[2.8vw]" />
          </motion.div>
        )}

        {/* JPP DIGITAL with Lens Flare */}
        {phase === 9 && (
          <motion.div key="p9" className="absolute inset-0 flex items-center justify-center" exit={{opacity:0,scale:1.5,filter:'blur(20px)'}} transition={{duration:2}}>
            <motion.h1 initial={{letterSpacing:'1em',opacity:0}} animate={{letterSpacing:'-0.05em',opacity:1}} transition={{duration:2,ease:SE}} className="text-[12vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-300 to-white">
              JPP DIGITAL
            </motion.h1>
            {/* Lens flare sweep — fires once */}
            <motion.div className="absolute inset-0 pointer-events-none"
              initial={{x:'-100%'}} animate={{x:'120%'}}
              transition={{duration:1.4, ease:[0.4,0,0.2,1], delay:0.6}}
              style={{background:'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 45%, rgba(200,200,255,0.3) 50%, rgba(255,255,255,0.12) 55%, transparent 65%)'}} />
          </motion.div>
        )}

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
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:2}} className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:0.5,duration:1.5,ease:SE}} className="flex flex-col items-center mt-[-5vw]">
              <h1 className="text-[4vw] font-black tracking-tighter">JPP POLISAS</h1>
              <p className="text-[1vw] font-light tracking-[0.5em] text-indigo-400 uppercase mt-2">Revolusi Ekosistem Digital</p>
            </motion.div>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:1.5,duration:1.5,ease:SE}} className="mt-[4vw] flex flex-col items-center">
              <div className="relative">
                <motion.div animate={{scale:[1,1.12,1],opacity:[0.4,0.1,0.4]}} transition={{duration:3,repeat:Infinity,ease:'easeInOut'}} className="absolute inset-[-0.8vw] rounded-[1.5vw] border-[0.2vw] border-indigo-400 pointer-events-none" />
                <motion.div animate={{scale:[1,1.22,1],opacity:[0.2,0,0.2]}} transition={{duration:3,repeat:Infinity,ease:'easeInOut',delay:0.5}} className="absolute inset-[-1.6vw] rounded-[2vw] border-[0.15vw] border-indigo-500 pointer-events-none" />
                <div className="bg-white p-[1vw] rounded-[1vw] relative z-10 shadow-[0_0_50px_rgba(99,102,241,0.25)]">
                  <QRCode value="https://jpp.cipher-node.org" size={Math.round(window.innerWidth * 0.12)} />
                </div>
              </div>
              <p className="text-[1.2vw] font-medium tracking-widest mt-[2.5vw]">Sedia Untuk Diakses.</p>
              <p className="text-[1vw] font-light tracking-widest text-white/40 mt-[0.5vw]">jpp.cipher-node.org</p>
            </motion.div>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2.5,duration:2}} className="absolute bottom-[2vw] w-full flex flex-col items-center gap-[1.2vw]">
              {/* Urgency copy */}
              <motion.p initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:3,duration:1.2}}
                className="text-[0.62vw] tracking-[0.35em] text-white/40 uppercase">
                Sedia Untuk Anda — Mulai Hari Ini.
              </motion.p>
              {/* CTA button with pulse rings + shimmer */}
              <div className="relative flex items-center justify-center">
                {[0, 0.6].map((d, i) => (
                  <motion.div key={i}
                    animate={{scale:[1,1.55,2.1],opacity:[0.45,0.2,0]}}
                    transition={{duration:2.2,delay:d,repeat:Infinity,ease:'easeOut'}}
                    className="absolute w-full h-full rounded-full"
                    style={{border:'1px solid rgba(99,102,241,0.6)'}} />
                ))}
                <button onClick={()=>navigate('/login')}
                  className="relative overflow-hidden px-[3vw] py-[0.9vw] border border-white/25 bg-white/5 backdrop-blur-md rounded-full text-white/90 text-[0.8vw] hover:bg-white hover:text-black transition-all tracking-widest uppercase cursor-pointer">
                  {/* Shimmer sweep */}
                  <motion.div className="absolute inset-0 pointer-events-none"
                    animate={{x:['-120%','220%']}}
                    transition={{duration:2.8,repeat:Infinity,repeatDelay:1.8,ease:'easeInOut'}}
                    style={{background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',width:'35%'}} />
                  Masuk Ke Portal &nbsp;›
                </button>
              </div>
              <p className="text-[0.55vw] tracking-[0.2em] text-white/18 uppercase font-light">
                Dibangunkan oleh Majlis Perwakilan Pelajar POLISAS &copy; 2026.
              </p>
            </motion.div>
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
function GlitchText({ text }: { text: string }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const fire = () => { setGlitch(true); setTimeout(() => setGlitch(false), 140); };
    const iv = setInterval(() => fire(), 1800 + Math.random() * 1200);
    const t = setTimeout(() => fire(), 600); // First glitch fires early for impact
    return () => { clearInterval(iv); clearTimeout(t); };
  }, []);
  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0, filter:'blur(8px)'}}
      transition={{duration:0.9}}
      className="absolute inset-0 flex items-center justify-center">
      <motion.h1
        animate={glitch ? {x:[-3,4,-2,0], y:[0,1,-1,0]} : {x:0, y:0}}
        transition={{duration:0.12, ease:'linear'}}
        className="text-[3.2vw] font-light tracking-[0.08em]"
        style={{
          color: glitch ? 'rgba(255,80,80,0.9)' : 'rgba(255,255,255,0.72)',
          textShadow: glitch
            ? '-4px 0 rgba(255,20,20,0.7), 4px 0 rgba(30,100,255,0.6), 0 0 20px rgba(255,50,50,0.3)'
            : 'none',
          filter: glitch ? 'contrast(1.3) brightness(1.1)' : 'none',
        }}>
        {text}
      </motion.h1>
    </motion.div>
  );
}

// ─── SudahTamatText — typewriter red→white resolution ────────────────────────
function SudahTamatText() {
  const text = 'Sudah Tamat.';
  const [chars, setChars] = useState(0);
  const done = chars >= text.length;
  useEffect(() => {
    const iv = setInterval(() => {
      setChars(c => { if (c >= text.length) { clearInterval(iv); return c; } return c + 1; });
    }, 75);
    return () => clearInterval(iv);
  }, []);
  return (
    <h1 className="text-[6vw] font-black tracking-tighter"
      style={{
        color: done ? '#ffffff' : '#ff3333',
        textShadow: done ? 'none' : '-3px 0 rgba(255,0,0,0.4), 3px 0 rgba(0,100,255,0.3), 0 0 60px rgba(255,30,30,0.5)',
        transition: 'color 1s ease, text-shadow 1s ease',
      }}>
      {text.slice(0, chars)}
      {!done && (
        <motion.span animate={{opacity:[1,0,1]}} transition={{duration:0.55,repeat:Infinity}}
          className="inline-block bg-red-400 ml-[0.15em] align-middle"
          style={{width:'0.45em',height:'0.85em'}} />
      )}
    </h1>
  );
}

// ─── VisionText — warm ambient bloom + mask-lift reveal ─────────────────────────────────────────
function VisionText({ text }: { text: string }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,filter:'blur(12px)'}}
      transition={{duration:1}} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Warm indigo ambient bloom */}
      <motion.div className="absolute inset-0 pointer-events-none"
        initial={{opacity:0}} animate={{opacity:1}} transition={{duration:3}}
        style={{background:'radial-gradient(ellipse at 50% 55%, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)'}} />
      {/* Horizontal accent lines */}
      <motion.div initial={{width:'0%'}} animate={{width:'35%'}} transition={{duration:1.4,ease:SE}}
        className="absolute top-[44%] left-[50%] h-px"
        style={{background:'linear-gradient(to right,rgba(99,102,241,0.5),transparent)',transform:'translateX(-100%)'}} />
      <motion.div initial={{width:'0%'}} animate={{width:'35%'}} transition={{duration:1.4,ease:SE}}
        className="absolute top-[44%] left-[50%] h-px"
        style={{background:'linear-gradient(to left,rgba(99,102,241,0.5),transparent) '}} />
      {/* Mask-lift text */}
      <div style={{overflow:'hidden',paddingBottom:'0.12em'}}>
        <motion.h1
          initial={{y:'110%'}} animate={{y:'0%'}}
          transition={{duration:1.3,ease:[0.25,1,0.5,1],delay:0.15}}
          className="text-[3.5vw] font-light tracking-[0.06em]"
          style={{color:'rgba(255,255,255,0.82)'}}>
          {text}
        </motion.h1>
      </div>
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
            exit={{opacity:0, scale:1.12, filter:'blur(22px)'}}
            transition={{duration:0.3, ease:[0.76,0,0.24,1]}}>
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

// ─── Scene 01: E-Kebajikan — "Dual Perspective Split" ────────────────────────
// Camera: static diagonal split | Student left vs Exco right
function KebajikanScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 400),
      setTimeout(() => setAct(2), 2800),
      setTimeout(() => setAct(3), 4000),
      setTimeout(() => setAct(4), 5200),
      setTimeout(() => setAct(5), 7500),
      setTimeout(() => setAct(6), 9500),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  const gc = mod.gc;
  return (
    <CinematicEnvelope gc={gc}>
      <RadarScan active={act>=1} gc={gc} />
      <motion.div initial={{opacity:0,scaleY:0,originY:'50%'}} animate={act>=1?{opacity:1,scaleY:1}:{}} transition={{duration:1.1, ease:CE, delay:0.3}} className="absolute inset-y-0 z-20 pointer-events-none" style={{left:'49.5%',width:'1.5px',background:`linear-gradient(to bottom,transparent,${gc},${gc},transparent)`,boxShadow:`0 0 20px ${gc}80`,transform:'skewX(-5deg)'}}/>
      
      {/* LEFT — Student view */}
      <motion.div initial={{x:'-100%',filter:'blur(20px)',opacity:0}} animate={act>=1?{x:'0%',filter:'blur(0px)',opacity:1,y:act>=1?[0,-12,0]:0}:{}} transition={{duration:0.9, ease:CE, y:{duration:8,repeat:Infinity,ease:'easeInOut',delay:0.5}}} className="absolute inset-y-0 left-0 flex" style={{width:'49.5%',background:'#040908',clipPath:'polygon(0 0,107% 0,100% 100%,0 100%)', perspective: '800px'}}>  
        <div className="w-[38%] h-full flex flex-col gap-[0.5vw] p-[0.8vw] border-r border-white/5" style={{background:'#040908', transform: 'rotateY(5deg)'}}>
          <div className="flex items-center gap-[0.5vw] mb-[0.8vw] mt-[0.3vw]">
            <motion.div animate={{scale:[1, 1.1, 1], boxShadow:[`0 0 0 ${gc}00`,`0 0 10px ${gc}40`,`0 0 0 ${gc}00`]}} transition={{duration:3, repeat:Infinity}} className="w-[1.5vw] h-[1.5vw] rounded-full flex items-center justify-center" style={{background:gc+'30'}}><span className="text-[0.8vw]">🫀</span></motion.div>
            <div><p className="text-[0.55vw] font-bold" style={{color:gc}}>E-Kebajikan</p><p className="text-[0.42vw] text-white/30">SISTEM ADUAN PELAJAR</p></div>
          </div>
          {['Dashboard','Senarai Tiket','Laporan','Unit Kebajikan','Tetapan'].map((item,i)=>(
            <motion.div key={item} initial={{x:-30,opacity:0,filter:'blur(10px)'}} animate={act>=1?{x:0,opacity:1,filter:'blur(0px)'}:{}} transition={{duration:0.6, ease:CE, delay:0.5+i*0.07}} className={`flex items-center gap-[0.4vw] px-[0.4vw] py-[0.35vw] rounded-[0.3vw] ${i===0?'bg-teal-500/15':''}`}>
              <div className="w-[0.5vw] h-[0.5vw] rounded-sm" style={{background:i===0?gc:'#ffffff20'}}/>
              <span className={`text-[0.55vw] ${i===0?'text-teal-300':'text-white/35'}`}>{item}</span>
            </motion.div>
          ))}
          <div className="mt-auto p-[0.4vw] rounded-[0.3vw] text-[0.45vw] text-white/20" style={{background:'#0d1410'}}>GLOBAL JPP DASHBOARD</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-[0.8vw] p-[1vw] relative" style={{transform: 'rotateY(2deg)'}}>
          <motion.div initial={{scale:0,filter:'blur(20px)'}} animate={act>=1?{scale:[1,1.06,1],filter:'blur(0px)'}:{}} transition={{scale:{duration:4,repeat:Infinity,ease:'easeInOut'},filter:{duration:0.6},delay:0.3}} className="w-[4vw] h-[4vw] rounded-full flex items-center justify-center" style={{background:gc+'20'}}><span className="text-[1.8vw]">🫀</span></motion.div>
          <motion.p initial={{y:20,opacity:0,filter:'blur(10px)'}} animate={act>=1?{y:0,opacity:1,filter:'blur(0px)'}:{}} transition={{delay:0.4,duration:0.6,ease:CE}} className="text-[1.1vw] font-bold text-white text-center">Sistem Aduan Pelajar</motion.p>
          <motion.p initial={{opacity:0}} animate={act>=1?{opacity:1}:{}} transition={{delay:0.5}} className="text-[0.6vw] text-white/40 text-center">Aduan anda akan diproses oleh Exco Kebajikan JPP</motion.p>
          <motion.div initial={{y:25,opacity:0,filter:'blur(15px)'}} animate={act>=1?{y:[0,-4,0],opacity:1,filter:'blur(0px)'}:{}} transition={{delay:0.6,y:{duration:5,repeat:Infinity,ease:'easeInOut'},opacity:{duration:0.6},filter:{duration:0.6}}} className="grid grid-cols-4 gap-[0.4vw] w-full p-[0.5vw] rounded-[0.4vw]" style={{background:'#0d1410'}}>
            {[['3','Kes Selesai'],['100%','Kadar'],['43.6j','Purata'],['0','Aktif']].map(([v,l])=>(
              <div key={l} className="text-center"><p className="text-[0.8vw] font-black text-white">{v}</p><p className="text-[0.42vw] text-white/30 uppercase">{l}</p></div>
            ))}
          </motion.div>
          <motion.div animate={act>=2&&act<3?{boxShadow:[`0 0 0px ${gc}00`,`0 0 25px ${gc}aa`,`0 0 0px ${gc}00`],scale:[1,1.04,1]}:{}} transition={{duration:1.5,repeat:Infinity,ease:'easeInOut'}} className="w-full py-[0.7vw] rounded-[0.4vw] text-center cursor-pointer relative overflow-hidden" style={{background:gc}}>
            <motion.div className="absolute inset-0 bg-white/20" animate={{x:['-100%','200%']}} transition={{duration:2,repeat:Infinity,ease:'linear',delay:1}} />
            <span className="text-[0.75vw] font-bold text-black relative z-10">BUAT ADUAN BARU ›</span>
          </motion.div>
          <AnimatePresence>{act>=3&&(<motion.div key="s" initial={{opacity:0,scale:1.2,filter:'blur(10px)'}} animate={{opacity:[0,1,1,0],scale:1,filter:['blur(10px)','blur(0px)','blur(0px)','blur(10px)']}} transition={{duration:1.5,times:[0,0.1,0.8,1]}} className="absolute inset-0 flex items-center justify-center rounded" style={{background:gc+'35',backdropFilter:'blur(5px)'}}><motion.div initial={{scale:0}} animate={{scale:[0,1.2,1]}} transition={{duration:0.4,ease:[0.34,1.56,0.64,1]}} className="text-center"><p className="text-[2.5vw]">✓</p><p className="text-[0.7vw] font-bold" style={{color:gc}}>Aduan Dihantar!</p></motion.div></motion.div>)}</AnimatePresence>
        </div>
      </motion.div>
      {/* RIGHT — Exco view */}
      <motion.div initial={{x:'100%',filter:'blur(20px)',opacity:0}} animate={act>=1?{x:'0%',filter:'blur(0px)',opacity:1,y:act>=1?[0,12,0]:0}:{}} transition={{duration:1.0, ease:CE, delay:0.15, y:{duration:8,repeat:Infinity,ease:'easeInOut',delay:1}}} className="absolute inset-y-0 right-0 flex flex-col p-[1.2vw] gap-[0.7vw]" style={{left:'50.5%',background:'#040908',clipPath:'polygon(3% 0,100% 0,100% 100%,0 100%)', perspective: '800px'}}>  
        <motion.div initial={{opacity:0,y:-20}} animate={act>=1?{opacity:1,y:0}:{}} transition={{duration:0.6, ease:CE, delay:0.7}} style={{transform: 'rotateY(-5deg)'}}><p className="text-[0.55vw] text-white/30 uppercase tracking-widest">Papan Pemuka Exco</p><p className="text-[1.3vw] font-black text-white">E-Kebajikan</p></motion.div>
        <div className="flex flex-col gap-[0.4vw]" style={{transform: 'rotateY(-5deg)'}}>
          {[{id:'ADU-2024-087',desc:'Bilik rosak — Blok C',s:'Diselesaikan',c:gc},{id:'ADU-2024-086',desc:'Masalah yuran semester',s:'Diproses',c:'#6366f1'},{id:'ADU-2024-085',desc:'Permohonan buku teks',s:'Menunggu',c:'#f59e0b'}].map((t,i)=>(
            <motion.div key={t.id} initial={{x:45,opacity:0,filter:'blur(10px)'}} animate={act>=1?{x:0,opacity:1,filter:'blur(0px)',y:[0,-2,0]}:{}} transition={{x:{duration:0.65, ease:CE, delay:0.8+i*0.09},opacity:{delay:0.8+i*0.09},filter:{delay:0.8+i*0.09},y:{duration:4,repeat:Infinity,ease:'easeInOut',delay:1+i*0.2}}} className="flex items-center gap-[0.5vw] p-[0.5vw] rounded-[0.4vw] border border-white/5" style={{background:'#0a100e'}}>
              <div className="w-[0.35vw] h-[2.5vw] rounded-full flex-shrink-0" style={{background:t.c}}/>
              <div className="flex-1"><p className="text-[0.5vw] font-mono" style={{color:t.c}}>{t.id}</p><p className="text-[0.65vw] text-white/65">{t.desc}</p></div>
              <span className="text-[0.5vw] px-[0.35vw] py-[0.12vw] rounded-full" style={{background:t.c+'20',color:t.c}}>{t.s}</span>
            </motion.div>
          ))}
        </div>
        <AnimatePresence>{act>=4&&(<motion.div key="notif" initial={{x:80,opacity:0,scale:0.85,filter:'blur(12px)'}} animate={{x:0,opacity:1,scale:1,filter:'blur(0px)',y:[0,-4,0]}} transition={{x:{duration:0.7, ease:PE},scale:{duration:0.7,ease:PE},y:{duration:3,repeat:Infinity,ease:'easeInOut',delay:0.5}}} className="flex items-center gap-[0.5vw] p-[0.6vw] rounded-[0.4vw] border mt-auto shadow-[0_10px_30px_rgba(20,184,166,0.15)]" style={{background:gc+'12',borderColor:gc+'40',transform: 'rotateY(-5deg)'}}>
          <motion.span animate={{scale:[1,1.5,1], rotate:[0,-10,10,0]}} transition={{duration:0.6, ease:PE, repeat:Infinity, repeatDelay:2}} className="text-[1.1vw]">🔔</motion.span>
          <div className="flex-1"><p className="text-[0.6vw] font-bold" style={{color:gc}}>Aduan Baharu Diterima!</p><p className="text-[0.5vw] text-white/45">ADU-2024-088 · Bilik air rosak · Blok A</p></div>
          <motion.div animate={{opacity:[1,0.2,1], scale:[1,1.3,1]}} transition={{duration:1.2,repeat:Infinity}} className="w-[0.6vw] h-[0.6vw] rounded-full" style={{background:gc}}/>
        </motion.div>)}</AnimatePresence>
      </motion.div>

      {/* Impact Flash — ticket submitted */}
      <AnimatePresence>
        {act === 3 && (
          <motion.div key="keb-flash" initial={{opacity:0}} animate={{opacity:[0,0.6,0]}} exit={{opacity:0}}
            transition={{duration:0.55, times:[0,0.1,1]}} className="absolute inset-0 z-50 pointer-events-none"
            style={{background:`radial-gradient(ellipse at 25% 60%, ${gc}cc 0%, transparent 75%)`}} />
        )}
      </AnimatePresence>
      {/* Impact Flash — notification received */}
      <AnimatePresence>
        {act === 4 && (
          <motion.div key="notif-flash" initial={{opacity:0}} animate={{opacity:[0,0.5,0]}} exit={{opacity:0}}
            transition={{duration:0.6, times:[0,0.1,1]}} className="absolute inset-0 z-50 pointer-events-none"
            style={{background:`radial-gradient(ellipse at 75% 60%, ${gc}cc 0%, transparent 75%)`}} />
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=6} num="Modul 01" name="E-Kebajikan" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=5} message="Tiket ADU-2024-088 sedang diproses oleh Exco Kebajikan." />
    </CinematicEnvelope>
  );
}

// ─── Scene 02: E-Keusahawanan — "Dutch Tilt + POS Receipt" ───────────────────
// Camera: 8° dutch tilt, extreme close-up POS → receipt prints → tilt corrects
function KeusahawananScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [items, setItems] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 300),
      setTimeout(() => setAct(2), 2000),
      setTimeout(() => { setAct(3); setItems([0]); }, 3000),
      setTimeout(() => setItems([0,1]), 3800),
      setTimeout(() => setItems([0,1,2]), 4600),
      setTimeout(() => { setAct(4); setTotal(100); }, 5400),
      setTimeout(() => setAct(5), 6200),
      setTimeout(() => setAct(6), 8000),
      setTimeout(() => setAct(7), 10000),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  const gc = mod.gc;
  const posItems = [['Produk Premium A','RM 20.00'],['Produk Premium B','RM 45.00'],['Produk Premium C','RM 35.00']];
  return (
    <CinematicEnvelope gc={gc}>
      {/* Dutch-tilted container — continuous subtle tilt adjustment */}
      <div className="absolute inset-0 flex items-center justify-center" style={{perspective: '1200px'}}>
      <motion.div className="relative w-[85vw]"
        initial={{rotate:-9,rotateY:15,rotateX:10,scale:0.88,filter:'blur(20px)',opacity:0}}
        animate={act>=1?{rotate:act>=6?[0,-1,1,0]:[-5,-4,-6,-5], rotateY:act>=6?[0,2,-2,0]:[10,8,12,10], rotateX:act>=6?[0,1,-1,0]:[5,3,7,5], scale:1, filter:'blur(0px)', opacity:1}:{}}
        transition={act>=6
          ? {duration:10, ease:'easeInOut', repeat:Infinity}
          : {rotate:{duration:8,repeat:Infinity,ease:'easeInOut'},rotateY:{duration:6,repeat:Infinity,ease:'easeInOut'},rotateX:{duration:7,repeat:Infinity,ease:'easeInOut'}, scale:{duration:1.1, ease:CE, delay:0.1}, filter:{duration:0.8, delay:0.1}, opacity:{duration:0.6, delay:0.1}}
        }>
        {/* Browser chrome */}
        <ExplodingParticles active={act>=2} emoji="💵" count={25} />
        <div className="rounded-[1.2vw] overflow-hidden shadow-[0_50px_120px_rgba(0,0,0,0.95)] border border-white/10 relative z-10" style={{background:'#0d1117', backdropFilter:'blur(20px)'}}>
          <div className="flex items-center gap-[0.4vw] px-[1.2vw] py-[0.6vw] border-b border-white/5" style={{background:'#161b22'}}>
            <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-red-500/70"/><div className="w-[0.7vw] h-[0.7vw] rounded-full bg-yellow-500/70"/><div className="w-[0.7vw] h-[0.7vw] rounded-full bg-green-500/70"/>
            <div className="ml-[1vw] flex items-center gap-[0.6vw]">
              <motion.div animate={{scale:[1,1.1,1], rotate:[0,5,-5,0]}} transition={{duration:3, repeat:Infinity, ease:'easeInOut'}} className="w-[1.5vw] h-[1.5vw] rounded-full flex items-center justify-center text-[0.7vw]" style={{background:gc+'30', boxShadow:`0 0 10px ${gc}40`}}>💡</motion.div>
              <div><p className="text-[0.6vw] font-bold" style={{color:gc}}>e-Keusahawanan — JPP POLISAS</p></div>
            </div>
          </div>
          <div className="flex" style={{minHeight:'30vw',background:'#070d0b'}}>
            {/* Sidebar */}
            <div className="w-[18%] border-r border-white/5 p-[0.8vw] flex flex-col gap-[0.4vw]" style={{background:'#040909'}}>
              <p className="text-[0.45vw] text-white/30 uppercase tracking-widest mb-[0.5vw]">SISTEM POS</p>
              {['Papan Pemuka','Kedai POS','Katalog Produk','Statistik','Program'].map((item,i)=>(
                <motion.div key={item} initial={{opacity:0,x:-15,filter:'blur(5px)'}} animate={act>=1?{opacity:1,x:0,filter:'blur(0px)'}:{}} transition={{delay:0.3+i*0.08,duration:0.6,ease:CE}} className={`text-[0.6vw] py-[0.4vw] px-[0.5vw] rounded-[0.3vw] ${i===1?'font-bold':'text-white/40'}`} style={i===1?{color:gc,background:gc+'15'}:{}}>
                  {item}
                </motion.div>
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 p-[1.2vw] flex flex-col gap-[0.8vw] relative">
              {/* Stats row */}
              <div className="grid grid-cols-5 gap-[0.5vw]">
                {[['Jualan Bersih','RM 100.00',gc],['Transaksi','12','#fff'],['Unit Terjual','12','#fff'],['Purata AOV','RM 8.33','#fff'],['Untung Bersih','RM 60.00',gc]].map(([l,v,c],i)=>(
                  <motion.div key={l} initial={{y:-30,opacity:0,filter:'blur(10px)'}} animate={act>=1?{y:[0,-3,0],opacity:1,filter:'blur(0px)'}:{}} transition={{y:{duration:4,repeat:Infinity,ease:'easeInOut',delay:1+i*0.1}, opacity:{duration:0.6,delay:0.4+i*0.08}, filter:{duration:0.6,delay:0.4+i*0.08}}} className="p-[0.6vw] rounded-[0.5vw] border border-white/5 relative overflow-hidden" style={{background:'#0d1410'}}>
                    <div className="absolute top-0 right-0 w-[2vw] h-[2vw] blur-[10px] opacity-20" style={{background:c}} />
                    <p className="text-[0.5vw] text-white/40 uppercase mb-[0.2vw]">{l}</p>
                    <p className="text-[1.1vw] font-black" style={{color:c}}>{v}</p>
                  </motion.div>
                ))}
              </div>
              {/* POS receipt area */}
              <div className="flex-1 flex gap-[0.8vw]">
                <motion.div initial={{y:30,opacity:0,filter:'blur(15px)'}} animate={act>=1?{y:0,opacity:1,filter:'blur(0px)'}:{}} transition={{delay:0.6, duration:0.8, ease:CE}} className="flex-1 rounded-[0.6vw] p-[0.8vw] border relative overflow-hidden" style={{background:'#0a100e', borderColor: gc+'20'}}>
                  <motion.div animate={{opacity:[0.05,0.15,0.05]}} transition={{duration:3,repeat:Infinity,ease:'easeInOut'}} className="absolute inset-0 pointer-events-none" style={{background:`radial-gradient(circle at top right, ${gc}40, transparent 40%)`}} />
                  <p className="text-[0.65vw] font-bold text-white/60 mb-[0.6vw]">Kedai POS — Agrosea Academy</p>
                  {/* Receipt items */}
                  <div className="font-mono text-[0.65vw] flex flex-col gap-[0.3vw] relative z-10">
                    {posItems.map(([name,price],i)=>(
                      <AnimatePresence key={name}>{items.includes(i)&&(<motion.div initial={{opacity:0,y:-10,filter:'blur(8px)',scale:0.95}} animate={{opacity:1,y:0,filter:'blur(0px)',scale:1}} transition={{duration:0.4,ease:PE}} className="flex justify-between text-white/80 p-[0.3vw] rounded bg-white/5">
                        <span className="text-green-400">✓</span><span className="flex-1 mx-[0.5vw]">{name}</span><span style={{color:gc}}>{price}</span>
                      </motion.div>)}</AnimatePresence>
                    ))}
                    {items.length > 0 && <div className="border-t border-white/10 mt-[0.3vw] pt-[0.3vw] text-white/30">{'─'.repeat(30)}</div>}
                    {total > 0 && (
                      <div className="flex justify-between pt-[0.2vw]">
                        <span className="text-white/60">JUMLAH</span><span style={{color:gc}}>RM {total}.00</span>
                      </div>
                    )}
                  </div>
                  {/* BAYARAN BERJAYA flash */}
                  <AnimatePresence>{act>=5&&(<motion.div key="pay" initial={{opacity:0,scale:1.1}} animate={{opacity:[0,1,1,0],scale:1}} transition={{duration:2,times:[0,0.1,0.8,1]}} className="absolute inset-0 flex items-center justify-center rounded-[0.6vw]" style={{background:'#22c55e25'}}>
                    <motion.div initial={{scale:0}} animate={{scale:[0,1.2,1]}} transition={{duration:0.5,ease:[0.34,1.56,0.64,1]}} className="text-center">
                      <p className="text-[2vw] font-black" style={{color:gc}}>BAYARAN BERJAYA ✓</p>
                      <p className="text-[0.7vw] text-white/60">RM 100.00 diterima</p>
                    </motion.div>
                  </motion.div>)}</AnimatePresence>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
        <ModuleOverlay show={act>=7} num="Modul 02" name="E-Keusahawanan" tagline={mod.tagline} gc={gc} pos="bottom-[6%] left-[2%]" />
      </motion.div>
      </div>

      {/* Impact Flash — payment success */}
      <AnimatePresence>
        {act === 5 && (
          <motion.div key="pay-flash" initial={{opacity:0}} animate={{opacity:[0,0.65,0]}} exit={{opacity:0}}
            transition={{duration:0.6, times:[0,0.08,1]}} className="absolute inset-0 z-50 pointer-events-none"
            style={{background:`radial-gradient(ellipse at 60% 55%, ${gc}bb 0%, ${gc}33 45%, transparent 70%)`}} />
        )}
      </AnimatePresence>
    </CinematicEnvelope>
  );
}

// ─── Scene 03: E-Akademik — "QR Macro Reveal" ────────────────────────────────
// Camera: extreme macro on QR → scanline sweeps → pull-back reveals full dashboard
function AkademikScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [cgpa, setCgpa] = useState(0);
  const [rank, setRank] = useState(3);
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 300),   // QR appears
      setTimeout(() => setAct(2), 1500),  // scan line
      setTimeout(() => setAct(3), 2500),  // +MERIT burst
      setTimeout(() => setAct(4), 3500),  // reveal dashboard
      setTimeout(() => setAct(5), 5000),  // CGPA fills
      setTimeout(() => setRank(2), 7000), // rank up
      setTimeout(() => setRank(1), 8500), // #1
      setTimeout(() => setAct(6), 9500),  // module overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (act < 5) return;
    let cur = 0; const target = 3.72;
    const iv = setInterval(() => { cur = Math.min(cur + 0.06, target); setCgpa(parseFloat(cur.toFixed(2))); if (cur >= target) clearInterval(iv); }, 50);
    return () => clearInterval(iv);
  }, [act]);
  const gc = mod.gc;
  return (
    <CinematicEnvelope gc={gc}>
      {/* Phase 1-3: QR full-screen macro */}
      <AnimatePresence>
        {act >= 1 && act < 4 && (
          <motion.div key="qr-macro" initial={{opacity:0,scale:1.5,filter:'blur(20px)'}} animate={{opacity:1,scale:1,filter:'blur(0px)'}} exit={{opacity:0,scale:0.6,filter:'blur(15px)'}} transition={spB(0)} className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-[40vw] h-[40vw] rounded-[2vw] p-[2vw] border-2 relative overflow-hidden" style={{background:'#0a1a12',borderColor:gc+'60'}}>
                <motion.div animate={{opacity:[0.1, 0.3, 0.1]}} transition={{duration:2, repeat:Infinity, ease:'easeInOut'}} className="absolute inset-0" style={{background:`radial-gradient(circle at center, ${gc}40, transparent 60%)`}} />
                <div className="w-full h-full grid relative z-10" style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'0.3vw'}}>
                  {Array.from({length:49}).map((_,i)=>{
                    const pattern=[1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1];
                    const isOn = pattern[i] === 1;
                    return <motion.div key={i} initial={{opacity:0,scale:0}} animate={{opacity:1,scale:1}} transition={{delay:i*0.008,type:'spring',stiffness:500,damping:20}} className="rounded-[0.15vw]" style={{background: isOn ? gc : gc+'15', aspectRatio:'1'}}/>;
                  })}
                </div>
              </div>
              {act >= 2 && (
                <motion.div initial={{top:'0%'}} animate={{top:'100%'}} transition={{duration:0.6,ease:'linear'}} className="absolute left-0 right-0 h-[0.8vw] z-10 pointer-events-none" style={{background:`linear-gradient(to bottom,transparent,${gc},${gc},transparent)`,boxShadow:`0 0 40px ${gc},0 0 80px ${gc}60`}}/>
              )}
              <AnimatePresence>
                {act >= 3 && (
                  <motion.div key="merit" initial={{scale:0,filter:'blur(20px)'}} animate={{scale:[0,1.5,1],filter:['blur(20px)','blur(0px)','blur(0px)']}} exit={{opacity:0,scale:2,filter:'blur(30px)'}} transition={{duration:0.5,ease:[0.34,1.56,0.64,1]}} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div animate={{y:[0,-10,0]}} transition={{duration:2, repeat:Infinity, ease:'easeInOut'}} className="text-center">
                      <motion.p animate={{textShadow:[`0 0 40px ${gc}`,`0 0 100px ${gc}`,`0 0 40px ${gc}`]}} transition={{duration:0.8,repeat:Infinity}} className="font-black" style={{fontSize:'6vw',color:gc}}>+5</motion.p>
                      <p className="text-[1.5vw] font-bold text-white/80" style={{textShadow:'0 0 10px rgba(0,0,0,0.8)'}}>★ MERIT DIKUMPUL!</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Impact Flash Frame — fires on merit collect (act 3) */}
      <AnimatePresence>
        {act === 3 && (
          <motion.div key="merit-flash"
            initial={{opacity:0}} animate={{opacity:[0,0.8,0]}} exit={{opacity:0}}
            transition={{duration:0.55, times:[0, 0.12, 1]}}
            className="absolute inset-0 z-50 pointer-events-none"
            style={{background:`radial-gradient(ellipse at center, ${gc}cc 0%, ${gc}55 40%, transparent 75%)`}} />
        )}
      </AnimatePresence>

      {/* Phase 4+: Full dashboard reveal */}
      <AnimatePresence>
        {act >= 4 && (
          <div className="absolute inset-0 flex items-center justify-center" style={{perspective:'1000px'}}>
            <HoloRings active={act>=4} gc={gc} />
            <ExplodingParticles active={act>=5} emoji="A+" count={20} />
            <motion.div key="dashboard" initial={{opacity:0,scale:1.08,filter:'blur(10px)',rotateX:-10,rotateY:10}} animate={{opacity:1,scale:1,filter:'blur(0px)',rotateX:act>=6?[0,1,-1,0]:[-2,-1,-3,-2],rotateY:act>=6?[0,-1,1,0]:[2,1,3,2]}} transition={act>=6?{duration:8,repeat:Infinity,ease:'easeInOut'}:{rotateX:{duration:6,repeat:Infinity,ease:'easeInOut'},rotateY:{duration:7,repeat:Infinity,ease:'easeInOut'}, opacity:{duration:0.8},scale:{duration:0.8},filter:{duration:0.8}}} className="w-[92vw] h-[92vh] rounded-[1.2vw] overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.9)]" style={{background:'#0d1117', transformStyle:'preserve-3d'}}>
              <div className="flex items-center gap-[0.4vw] px-[1.2vw] py-[0.6vw] border-b border-white/5" style={{background:'#161b22'}}>
                <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-red-500/70"/><div className="w-[0.7vw] h-[0.7vw] rounded-full bg-yellow-500/70"/><div className="w-[0.7vw] h-[0.7vw] rounded-full bg-green-500/70"/>
                <div className="ml-[1vw] flex gap-[0.5vw] items-center">
                  <motion.div animate={{scale:[1,1.1,1],boxShadow:[`0 0 0 ${gc}00`,`0 0 10px ${gc}80`,`0 0 0 ${gc}00`]}} transition={{duration:2,repeat:Infinity}} className="w-[1vw] h-[1vw] rounded-full" style={{background:gc}} />
                  <p className="text-[0.6vw] font-bold" style={{color:gc}}>E-Akademik — JPP POLISAS</p>
                </div>
              </div>
              <div className="flex h-full">
                <div className="w-[20%] border-r border-white/5 p-[0.8vw] flex flex-col gap-[0.5vw]" style={{background:'#040909'}}>
                  <div className="mb-[0.5vw]"><p className="text-[0.55vw] font-bold" style={{color:gc}}>e-Akademik</p><p className="text-[0.42vw] text-white/30">EXCO AKADEMIK</p></div>
                  {['Dashboard','Pencapaian','HPNM / CGPA','Merit Saya','Dokumen','Leaderboard','Scan QR'].map((item,i)=>(
                    <motion.div key={item} initial={{x:-20,opacity:0}} animate={{x:0,opacity:1}} transition={sp(i*0.04)}
                      className="text-[0.55vw] py-[0.35vw] px-[0.4vw] rounded-[0.3vw] text-white/35"
                      style={i===0 ? {background:gc+'20', color:gc} : i===6 ? {color:gc, background:gc+'25', fontWeight:'700'} : {}}>{item}</motion.div>
                  ))}
                </div>
                <div className="flex-1 p-[1.2vw] flex gap-[1.5vw] items-start">
                  <div className="flex flex-col items-center gap-[0.8vw] w-[35%] relative" style={{transform:'translateZ(30px)'}}>
                    <motion.div initial={{scale:0,filter:'blur(20px)'}} animate={{scale:1,filter:'blur(0px)'}} transition={{duration:0.8,delay:0.3}} className="relative w-[12vw] h-[12vw]">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff10" strokeWidth="8"/>
                        <motion.circle cx="50" cy="50" r="42" fill="none" stroke={gc} strokeWidth="8" strokeLinecap="round" strokeDasharray="264" initial={{strokeDashoffset:264}} animate={act>=5?{strokeDashoffset:264-(264*(cgpa/4.0))}:{strokeDashoffset:264}} transition={{duration:2}}/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                          animate={act>=5 ? {scale:[1,1.04,1,1.04,1], textShadow:[`0 0 10px ${gc}00`,`0 0 20px ${gc}80`,`0 0 10px ${gc}00`,`0 0 20px ${gc}80`,`0 0 10px ${gc}00`]} : {}}
                          transition={{duration:3, repeat:Infinity, ease:'easeInOut', delay:2}}
                          className="text-[2.5vw] font-black text-white">{cgpa.toFixed(2)}</motion.span>
                        <span className="text-[0.6vw] text-white/40">CGPA</span>
                      </div>
                    </motion.div>
                    <div className="text-center"><p className="text-[0.65vw] text-white/50 bg-white/5 px-[0.6vw] py-[0.2vw] rounded-full mt-[0.5vw]">Semester 4 · Elektrik</p></div>
                  </div>
                  <div className="flex-1 flex flex-col gap-[0.5vw]">
                    <p className="text-[0.7vw] text-white/40 uppercase tracking-widest font-bold">Leaderboard Merit</p>
                    {[{name:'Ahmad Hafiz',merit:98},{name:'Nur Aisyah',merit:87},{name:'Muhammad Haziq',merit:76}].map((s,i)=>(
                      <motion.div key={s.name} initial={{x:40,opacity:0,filter:'blur(10px)'}} animate={act>=4?{x:0,opacity:1,filter:'blur(0px)',y:[0,-2,0]}:{}} transition={{x:{type:'spring',stiffness:300,damping:20,delay:i*0.08},opacity:{duration:0.5,delay:i*0.08},filter:{duration:0.5,delay:i*0.08},y:{duration:4,repeat:Infinity,ease:'easeInOut',delay:1+i*0.15}}} className="flex items-center gap-[0.6vw] p-[0.6vw] rounded-[0.4vw] border border-white/5 relative overflow-hidden" style={{background: rank===i+1&&i<2?gc+'20':'#0a100e', borderColor:rank===i+1&&i<2?gc+'50':'#ffffff0d'}}>
                        {rank===i+1&&i<2 && <motion.div animate={{x:['-100%','200%']}} transition={{duration:1.5,repeat:Infinity,repeatDelay:2,ease:'easeInOut'}} className="absolute inset-0 w-[50%] bg-white/10 skew-x-[-20deg]" />}
                        <motion.span animate={rank===i+1&&i<1?{scale:[1,1.4,1],color:[gc,'#ffffff',gc]}:{}} transition={{duration:0.4,repeat:rank===i+1&&i<1?3:0}} className="text-[1.2vw] font-black w-[1.5vw] text-center relative z-10" style={{color:i<2?gc:'#ffffff40'}}>#{i+1}</motion.span>
                        <div className="flex-1 relative z-10"><p className="text-[0.7vw] text-white/80 font-bold">{s.name}</p><p className="text-[0.5vw] text-white/50">{s.merit} merit</p></div>
                        {i===2&&rank===1&&<motion.span initial={{scale:0}} animate={{scale:[0,1.5,1]}} transition={spB(0)} className="text-[1vw] relative z-10">🏆</motion.span>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ModuleOverlay show={act>=6} num="Modul 03" name="E-Akademik" tagline={mod.tagline} gc={gc} />

      {/* Impact Flash — rank #1 achieved */}
      <AnimatePresence>
        {rank === 1 && act >= 6 && act < 7 && (
          <motion.div key="rank-flash" initial={{opacity:0}} animate={{opacity:[0,0.6,0]}} exit={{opacity:0}}
            transition={{duration:0.7, times:[0,0.08,1]}} className="absolute inset-0 z-50 pointer-events-none"
            style={{background:`radial-gradient(ellipse at 65% 35%, ${gc}cc 0%, ${gc}44 40%, transparent 70%)`}} />
        )}
      </AnimatePresence>
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

// ─── Scene 04: PolyMart — "Horizontal Dolly Shot + Card Flip" ────────────────
// Camera: wide dolly pan L→R | product cards flip 3D | FloatAI recommends
function PolyMartScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [cart, setCart] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 300),
      setTimeout(() => setAct(2), 1500),
      setTimeout(() => { setFlipped([0]); }, 2200),
      setTimeout(() => { setFlipped([0,1]); }, 2800),
      setTimeout(() => { setFlipped([0,1,2]); }, 3400),
      setTimeout(() => setAct(3), 4200),
      setTimeout(() => { setAct(4); setCart(1); }, 5000),
      setTimeout(() => setAct(5), 7000),
      setTimeout(() => setAct(6), 9500),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  const gc = mod.gc;
  const cats = ['Semua','Makanan','Minuman','Aksesori','Pakaian','Elektronik','Umum'];
  const products = [
    { name:'Buku Kalkulus', price:'RM 25', emoji:'📘', seller:'Danish Bo...', stars:4.2 },
    { name:'Earphone Sony', price:'RM 89', emoji:'🎧', seller:'Agrosea Ac...', stars:4.8 },
    { name:'Kasut Sukan', price:'RM 120', emoji:'👟', seller:'Danish Bo...', stars:4.5 },
  ];
  return (
    <CinematicEnvelope gc={gc}>
      {/* Browser frame — blur-rush entry then dramatic dolly pan + perspective tilt */}
      <ExplodingParticles active={cart>0} emoji="🪙" count={30} />
      <motion.div className="absolute inset-[3%] rounded-[1.2vw] overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.95)]" style={{background:'#0d0a07',transformStyle:'preserve-3d'}}
        initial={{scale:1.08,filter:'blur(20px)',opacity:0,rotateY:8,rotateX:5}} animate={act>=1?{scale:1,filter:'blur(0px)',opacity:1,rotateY:act>=5?[-1,1,-1]:[-1,3,-1],rotateX:act>=5?[0,1,0]:[2,0,2],x: act >= 2 ? [0, -35, 10, -20, 0] : 0}:{}} transition={act>=2?{scale:{duration:1,ease:CE},filter:{duration:0.6},rotateY:{duration:10,repeat:Infinity,ease:'easeInOut'},rotateX:{duration:8,repeat:Infinity,ease:'easeInOut'},x:{duration:15,ease:'easeInOut',repeat:Infinity}}:spS(0)}>
        {/* Navbar */}
        <div className="flex items-center gap-[0.8vw] px-[1.5vw] py-[0.8vw] border-b border-white/5 relative z-20" style={{background:'#100c07'}}>
          <div className="flex items-center gap-[0.5vw]">
            <motion.div animate={{scale:[1,1.1,1], rotate:[0,5,-5,0]}} transition={{duration:3, repeat:Infinity, ease:'easeInOut'}} className="w-[1.8vw] h-[1.8vw] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]" style={{background:gc}}><span className="text-[0.8vw]">🛍️</span></motion.div>
            <div><p className="text-[0.7vw] font-black" style={{color:gc}}>PolyMart</p><p className="text-[0.42vw] text-white/30">MARKETPLACE</p></div>
          </div>
          <div className="flex-1 mx-[1vw] h-[1.8vw] rounded-full border border-white/10 flex items-center px-[0.8vw] gap-[0.4vw]" style={{background:'#1a1208'}}>
            <span className="text-[0.6vw] text-white/20">🔍</span><span className="text-[0.6vw] text-white/20">Cari produk atau kedai...</span>
          </div>
          <div className="flex items-center gap-[0.5vw]">
            <div className="w-[1.5vw] h-[1.5vw] rounded-full border border-white/20 flex items-center justify-center text-[0.7vw] relative">🛒
              {cart>0 && <motion.div initial={{scale:0}} animate={{scale:1}} className="absolute -top-[20%] -right-[20%] w-[0.6vw] h-[0.6vw] rounded-full" style={{background:gc, boxShadow:`0 0 10px ${gc}`}}/>}
            </div>
            <AnimatePresence mode="wait"><motion.span key={cart} initial={{scale:1.5,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:0.3}} className="text-[0.65vw] font-bold" style={{color:gc}}>{cart}</motion.span></AnimatePresence>
          </div>
        </div>
        {/* Category pills — stagger in */}
        <motion.div className="flex gap-[0.5vw] px-[1.5vw] py-[0.7vw] border-b border-white/5 overflow-hidden relative z-10" style={{background:'#0d0a07'}}>
          {cats.map((c,i) => (
            <motion.div key={c} initial={{y:-20,opacity:0,filter:'blur(5px)'}} animate={act>=1?{y:0,opacity:1,filter:'blur(0px)'}:{}} transition={{delay:0.3+i*0.07,duration:0.6,ease:CE}} className={`px-[0.7vw] py-[0.3vw] rounded-full text-[0.6vw] font-medium whitespace-nowrap ${i===0?'text-black font-bold':'text-white/50 border border-white/10'}`} style={i===0?{background:gc}:{}}>
              {c}
            </motion.div>
          ))}
        </motion.div>
        {/* Hero banner */}
        <motion.div initial={{opacity:0,y:30,filter:'blur(10px)'}} animate={act>=1?{opacity:1,y:0,filter:'blur(0px)'}:{}} transition={{delay:0.5,duration:0.8,ease:CE}} className="mx-[1.5vw] mt-[1vw] p-[1vw] rounded-[0.8vw] flex justify-between items-center relative overflow-hidden" style={{background:`linear-gradient(135deg, #1a0e00, #2d1800)`, border:`1px solid ${gc}30`}}>
          <motion.div animate={{x:['-100%','200%']}} transition={{duration:3, repeat:Infinity, repeatDelay:2, ease:'easeInOut'}} className="absolute inset-0 bg-white/5 skew-x-[-30deg] w-[30%]" />
          <div className="relative z-10">
            <p className="text-[0.55vw] uppercase tracking-widest font-bold mb-[0.2vw]" style={{color:gc}}>POLYMART BETA</p>
            <p className="text-[1.3vw] font-black text-white leading-tight">Jelajah Kedai</p>
            <p className="text-[1.3vw] font-black leading-tight mb-[0.3vw]" style={{color:gc}}>Kampus Anda</p>
            <p className="text-[0.6vw] text-white/40 mt-[0.3vw]">Tempat produk dari peniaga berdaftar JPP.</p>
            <div className="flex gap-[0.8vw] mt-[0.5vw]">
            </div>
          </div>
          <motion.div animate={{y:[-3, 3, -3]}} transition={{duration:3, repeat:Infinity, ease:'easeInOut'}} className="text-[5vw] filter drop-shadow-[0_10px_20px_rgba(245,158,11,0.4)]">🛍️</motion.div>
        </motion.div>
        {/* Product cards — 3D flip in */}
        <div className="px-[1.5vw] mt-[1vw]">
          <motion.p initial={{opacity:0}} animate={act>=2?{opacity:1}:{}} className="text-[0.6vw] font-bold mb-[0.7vw]" style={{color:gc}}>⚡ Semua Produk (12)</motion.p>
          <div className="flex gap-[0.8vw]">
            {products.map((p,i) => (
              <div key={p.name} className="flex-1" style={{perspective:'600px'}}>
                <motion.div animate={flipped.includes(i)?{rotateY:0,opacity:1}:{rotateY:-90,opacity:0}} transition={{duration:0.5,ease:SE}} className="rounded-[0.6vw] overflow-hidden border border-white/5" style={{background:'#1a1208',backfaceVisibility:'hidden'}}>
                  <div className="h-[6vw] flex items-center justify-center" style={{background:'#231608'}}><span className="text-[3vw]">{p.emoji}</span></div>
                  <div className="p-[0.6vw]">
                    <p className="text-[0.6vw] text-white/50 text-center mb-[0.2vw]">Makanan</p>
                    <p className="text-[0.7vw] font-bold text-white text-center">{p.name}</p>
                    <p className="text-[0.65vw] font-black text-center mt-[0.3vw]" style={{color:gc}}>{p.price}</p>
                    <div className="flex items-center justify-between mt-[0.5vw]">
                      <span className="text-[0.5vw] text-white/30">⭐ {p.stars}</span>
                      <motion.button animate={act===3&&i===1?{scale:[1,0.85,1.15,1]}:{}} transition={{duration:0.4}} onClick={()=>setCart(c=>c+1)} className="px-[0.5vw] py-[0.2vw] rounded-[0.3vw] text-[0.55vw] font-bold text-black" style={{background: act>=2?gc:'#444'}}>+ Troli</motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      <ModuleOverlay show={act>=6} num="Modul 04" name="PolyMart" tagline={mod.tagline} gc={gc} />
      <FloatAiChip show={act>=5} message="Syor untuk anda: Earphone Sony — ⭐ 4.8 | Paling popular minggu ini!" />
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
// ─── Scene 05: SUPSAS — "Command Center Zoom Out" ────────────────────────────
// Camera: giant "83" fills screen → glitch → zoom out → 4 cards from corners → title slams
function KelabScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 300),   // "83" big number
      setTimeout(() => setAct(2), 1500),  // glitch shake
      setTimeout(() => setAct(3), 2800),  // zoom out + cards fly in
      setTimeout(() => setAct(4), 3800),  // PAPAN PEMUKA slams
      setTimeout(() => setAct(5), 5200),  // sidebar + full dashboard
      setTimeout(() => setAct(6), 7000),  // notification slides in
      setTimeout(() => setAct(7), 9500),  // module overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  const gc = mod.gc;
  const stats = [
    { label:'PERLU KELULUSAN', val:'0', corner:{ top:'5%', left:'5%' }, from:{ x:'-120%', y:'-120%' } },
    { label:'AHLI AKTIF',      val:'83', corner:{ top:'5%', right:'5%' }, from:{ x:'120%', y:'-120%' } },
    { label:'TUGASAN',         val:'0', corner:{ bottom:'30%', left:'5%' }, from:{ x:'-120%', y:'120%' } },
    { label:'AKTIVITI',        val:'0', corner:{ bottom:'30%', right:'5%' }, from:{ x:'120%', y:'120%' } },
  ];
  return (
    <CinematicEnvelope gc={gc}>
      {/* Phase 1-2: Giant "83" fills screen */}
      <AnimatePresence>
        {act >= 1 && act < 3 && (
          <motion.div key="bignum" initial={{opacity:0,scale:0.4,filter:'blur(30px)'}} animate={act>=2?{opacity:1,scale:1,filter:'blur(0px)',x:[0,-12,12,-6,6,-3,3,0]}:{opacity:1,scale:1,filter:'blur(0px)'}} exit={{opacity:0,scale:5,filter:'blur(40px)'}} transition={act>=2?{duration:0.5,x:{duration:0.5}}:spB(0)} className="absolute inset-0 flex flex-col items-center justify-center">
            <SlotMachineNumber target="83" active={act>=1} gc={gc} size="35vw" />
            <motion.p initial={{clipPath:'inset(0 100% 0 0)'}} animate={{clipPath:'inset(0 0% 0 0)'}} transition={sp(0.3)} className="text-[2vw] font-bold tracking-[0.5em] uppercase text-white/50">AHLI AKTIF</motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Phase 3+: Zoom out — full dashboard */}
      <AnimatePresence>
        {act >= 3 && (
          <motion.div key="dashboard" 
            initial={{opacity:0,scale:1.1,filter:'blur(15px)',rotateY:8,rotateX:5}} 
            animate={act>=3?{opacity:1,scale:1,filter:'blur(0px)',rotateY:[-1,1,-1],rotateX:[1,0,1],y:[0,-10,0]}:{}} 
            transition={act>=3?{scale:{duration:1,ease:CE},filter:{duration:0.6},rotateY:{duration:12,repeat:Infinity,ease:'easeInOut'},rotateX:{duration:9,repeat:Infinity,ease:'easeInOut'},y:{duration:6,repeat:Infinity,ease:'easeInOut'}}:spS(0)} 
            className="absolute inset-[3%] rounded-[1.2vw] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.95)] overflow-hidden" style={{background:'#0a0404',transformStyle:'preserve-3d'}}>
            {/* 4 stat cards fly in from corners with blur */}
            {stats.map((s,i) => (
              <motion.div key={s.label} initial={{x:s.from.x,y:s.from.y,opacity:0,filter:'blur(20px)'}} animate={{x:0,y:0,opacity:1,filter:'blur(0px)'}} transition={{...sp(i*0.06),stiffness:300,damping:20}} className="absolute w-[18%] p-[1vw] rounded-[0.8vw] border" style={{...s.corner,background:`${gc}12`,borderColor:`${gc}40`}}>
                <p className="text-[0.6vw] text-white/40 uppercase tracking-widest mb-[0.4vw]">{s.label}</p>
                <motion.p initial={{scale:0,filter:'blur(8px)'}} animate={{scale:1,filter:'blur(0px)'}} transition={spB(0.15+i*0.05)} className="text-[3vw] font-black" style={{color:gc}}>{s.val}</motion.p>
              </motion.div>
            ))}
            {/* PAPAN PEMUKA slams down */}
            <AnimatePresence>
              {act >= 4 && (
                <motion.div key="title" initial={{y:'-50%',opacity:0,filter:'blur(20px)',scale:0.8}} animate={{y:0,opacity:1,filter:'blur(0px)',scale:1}} transition={spB(0)} className="absolute top-[50%] left-[50%]" style={{transform:'translate(-50%,-50%)'}}>
                  <p className="text-[0.8vw] text-white/30 uppercase tracking-[0.5em] text-center mb-[0.5vw]">SUPER_ADMIN_JPP</p>
                  <p className="font-black text-white text-center" style={{fontSize:'5vw',textShadow:'0 0 40px rgba(255,255,255,0.2)'}}>Papan Pemuka</p>

                  <div className="flex justify-center gap-[0.8vw] mt-[0.8vw]">
                    {[['ANALISIS AI','#6366f1'],['LOG SISTEM','#64748b'],['+ TUGASAN BARU',gc]].map(([l,c])=>(
                      <div key={l} className="px-[0.8vw] py-[0.3vw] rounded-[0.4vw] text-[0.6vw] font-bold" style={{background:c+'20',color:c,border:`1px solid ${c}40`}}>{l}</div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Sidebar appears */}
            <AnimatePresence>
              {act >= 5 && (
                <motion.div key="sidebar" initial={{x:'-100%',opacity:0}} animate={{x:0,opacity:1}} transition={{duration:0.6,ease:SE}} className="absolute inset-y-0 left-0 w-[18%] border-r border-white/5 p-[0.8vw] flex flex-col gap-[0.5vw]" style={{background:'#0a0404'}}>
                  <div className="flex items-center gap-[0.4vw] mb-[0.5vw]">
                    <div className="w-[1.5vw] h-[1.5vw] rounded-lg flex items-center justify-center" style={{background:gc+'30'}}><span className="text-[0.7vw]">🏛</span></div>
                    <div><p className="text-[0.55vw] font-bold" style={{color:gc}}>Sistem Kelab</p><p className="text-[0.42vw] text-white/30">JPP POLISAS</p></div>
                  </div>
                  {['Papan Pemuka','Kelab & Persatuan','Aktiviti','Ahli Jawatankuasa','Laporan Kelab','Tetapan'].map((item,i)=>(
                    <div key={item} className={`text-[0.55vw] py-[0.4vw] px-[0.5vw] rounded-[0.3vw] ${i===0?'font-bold':'text-white/35'}`} style={i===0?{color:gc,background:gc+'15'}:{}}>{item}</div>
                  ))}
                  <div className="mt-auto text-[0.45vw] font-bold px-[0.5vw] py-[0.4vw] rounded-[0.3vw]" style={{background:gc+'20',color:gc}}>GLOBAL JPP DASHBOARD</div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* New member notification */}
            <AnimatePresence>
              {act >= 6 && (
                <motion.div key="notif" initial={{x:'100%',opacity:0}} animate={{x:0,opacity:1}} transition={{duration:0.6,ease:SE}} className="absolute top-[8%] right-[4%] flex items-center gap-[0.6vw] p-[0.7vw] rounded-[0.6vw] border w-[30%]" style={{background:'#1a0505',borderColor:gc+'50'}}>
                  <motion.div animate={{scale:[1,1.3,1]}} transition={{duration:0.5,repeat:2}} className="text-[1.5vw]">🔔</motion.div>
                  <div className="flex-1">
                    <p className="text-[0.65vw] font-bold" style={{color:gc}}>+1 Ahli Baharu Mendaftar!</p>
                    <p className="text-[0.55vw] text-white/50">Ahmad Hafiz · Kelab Elektron · 2 saat lalu</p>
                  </div>
                  <motion.div animate={{opacity:[1,0.2,1]}} transition={{duration:0.8,repeat:Infinity}} className="w-[0.7vw] h-[0.7vw] rounded-full flex-shrink-0" style={{background:gc}}/>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <ModuleOverlay show={act>=7} num="Modul 05" name="Sistem Kelab" tagline={mod.tagline} gc={gc} pos="bottom-[6%] left-[22%]" />

      {/* Impact Flash — new member notification */}
      <AnimatePresence>
        {act === 6 && (
          <motion.div key="kelab-flash" initial={{opacity:0}} animate={{opacity:[0,0.45,0]}} exit={{opacity:0}}
            transition={{duration:0.5, times:[0,0.1,1]}} className="absolute inset-0 z-50 pointer-events-none"
            style={{background:`radial-gradient(ellipse at 80% 15%, ${gc}99 0%, transparent 60%)`}} />
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

// ─── TheNumbers ──────────────────────────────────────────────────────────────
function TheNumbers() {
  const nums = [['5','Modul Bersepadu'],['1','Platform Tunggal'],['∞','Kemungkinan']];
  const [step, setStep] = useState(0);
  useEffect(()=>{
    const ts = [setTimeout(()=>setStep(1),2000), setTimeout(()=>setStep(2),4000)];
    return ()=>ts.forEach(clearTimeout);
  },[]);
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:1.5}} className="absolute inset-0 flex items-center justify-center gap-[8vw]">
      {nums.map(([n,l],i)=>(
        <motion.div key={i} initial={{scale:0,opacity:0}} animate={step>=i?{scale:1,opacity:1}:{scale:0,opacity:0}} transition={{duration:0.8,ease:[0.34,1.56,0.64,1]}} className="flex flex-col items-center gap-[1vw]">
          <span className="text-[15vw] font-black text-white leading-none">{n}</span>
          <span className="text-[1.2vw] font-light tracking-[0.3em] text-white/40 uppercase">{l}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── FloatingMockup ──────────────────────────────────────────────────────────
function FloatingMockup({ flyAway }: { flyAway: boolean }) {
  const ctrl = useAnimation();
  const flew = useRef(false);
  const mods = [
    { name:'E-Kebajikan',    gc:'#14b8a6', stat:'12',     sub:'Tiket Aktif',    icon:'\uD83C\uDF9F' },
    { name:'E-Keusahawanan', gc:'#22c55e', stat:'RM 2.8k', sub:'Jualan Hari Ini', icon:'\uD83D\uDCB0' },
    { name:'E-Akademik',     gc:'#10b981', stat:'3.72',   sub:'CGPA Purata',    icon:'\uD83D\uDCCA' },
    { name:'PolyMart',       gc:'#f97316', stat:'23',     sub:'Pesanan Aktif',  icon:'\uD83D\uDED2' },
    { name:'Sistem Kelab',   gc:'#ef4444', stat:'127',    sub:'Ahli Aktif',     icon:'\uD83C\uDFDB' },
  ];
  useEffect(()=>{
    if(flyAway){ flew.current=true; ctrl.stop(); ctrl.start({x:'100vw',opacity:0,scale:0.5,rotateY:45,filter:'blur(20px)',transition:{duration:1.5,ease:[0.25,1,0.5,1]}}); }
    else { ctrl.start({x:'4vw',rotateY:-18,rotateX:8,opacity:1,scale:1,transition:{duration:4,ease:[0.25,1,0.5,1]}}).then(()=>{ if(!flew.current) ctrl.start({y:[0,-14,0],transition:{duration:6,repeat:Infinity,ease:'easeInOut'}}); }); }
  },[flyAway,ctrl]);
  return (
    <motion.div animate={ctrl} initial={{x:'0vw',y:0,rotateY:-10,rotateX:0,opacity:0,scale:5}}
      className="absolute right-[1vw] w-[60vw] h-[40vw] rounded-[1.2vw] overflow-hidden flex z-20"
      style={{transformStyle:'preserve-3d',background:'#040408',boxShadow:'-60px 60px 120px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.07)'}}>
      {/* Gloss overlay */}
      <div className="absolute inset-0 pointer-events-none z-50" style={{background:'linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 50%)'}} />
      {/* Sidebar */}
      <div className="w-[18%] h-full flex flex-col" style={{background:'#06060e',borderRight:'1px solid rgba(255,255,255,0.05)'}}>
        <div className="px-[1vw] py-[0.85vw] flex items-center gap-[0.5vw]" style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
          <div className="w-[1.8vw] h-[1.8vw] rounded-[0.4vw] flex-shrink-0" style={{background:'linear-gradient(135deg,#6d28d9,#7c3aed)'}} />
          <div><p className="text-[0.55vw] font-black text-white leading-none">JPP</p><p className="text-[0.38vw] text-white/25 leading-none">POLISAS</p></div>
        </div>
        <div className="flex-1 px-[0.55vw] py-[0.7vw] flex flex-col gap-[0.2vw]">
          <motion.div initial={{x:-12,opacity:0}} animate={{x:0,opacity:1}} transition={{delay:0.8}}
            className="flex items-center gap-[0.45vw] px-[0.55vw] py-[0.4vw] rounded-[0.3vw]" style={{background:'#6366f118'}}>
            <div className="w-[0.45vw] h-[0.45vw] rounded-full" style={{background:'#6366f1'}} />
            <span className="text-[0.48vw] font-semibold" style={{color:'#6366f1'}}>Portal Utama</span>
          </motion.div>
          {mods.map((m,i)=>(
            <motion.div key={m.name} initial={{x:-12,opacity:0}} animate={{x:0,opacity:1}} transition={{delay:0.9+i*0.06}}
              className="flex items-center gap-[0.45vw] px-[0.55vw] py-[0.38vw] rounded-[0.3vw]">
              <div className="w-[0.38vw] h-[0.38vw] rounded-full flex-shrink-0" style={{background:m.gc+'70'}} />
              <span className="text-[0.45vw] text-white/30">{m.name}</span>
            </motion.div>
          ))}
        </div>
        <div className="px-[0.8vw] py-[0.7vw] flex items-center gap-[0.5vw]" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          <div className="w-[1.4vw] h-[1.4vw] rounded-full flex-shrink-0" style={{background:'linear-gradient(135deg,#14b8a6,#6366f1)'}} />
          <div><p className="text-[0.48vw] font-medium text-white/75 leading-none">Exco JPP</p><p className="text-[0.38vw] text-white/25 leading-none">Super Admin</p></div>
        </div>
      </div>
      {/* Main */}
      <div className="flex-1 flex flex-col" style={{background:'#050509'}}>
        {/* Topbar */}
        <div className="flex items-center justify-between px-[1.4vw] py-[0.65vw]" style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.2}}>
            <p className="text-[0.42vw] text-white/20 uppercase tracking-widest">Papan Pemuka</p>
            <p className="text-[0.72vw] font-bold text-white">Portal JPP POLISAS</p>
          </motion.div>
          <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{delay:1.3}} className="flex items-center gap-[0.7vw]">
            <div className="relative">
              <div className="w-[1.7vw] h-[1.7vw] rounded-full flex items-center justify-center" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <span className="text-[0.65vw]">&#x1F514;</span>
              </div>
              <div className="absolute -top-[0.1vw] -right-[0.1vw] w-[0.55vw] h-[0.55vw] rounded-full bg-red-500" style={{border:'1.5px solid #050509'}} />
            </div>
            <div className="w-[1.7vw] h-[1.7vw] rounded-full" style={{background:'linear-gradient(135deg,#6d28d9,#7c3aed)'}} />
          </motion.div>
        </div>
        {/* Module stat cards */}
        <div className="px-[1.1vw] pt-[0.75vw] grid grid-cols-5 gap-[0.6vw]">
          {mods.map((m,i)=>(
            <motion.div key={m.name} initial={{y:18,opacity:0,scale:0.95}} animate={{y:0,opacity:1,scale:1}}
              transition={{delay:1.4+i*0.09,duration:0.5,ease:[0.34,1.56,0.64,1]}}
              className="rounded-[0.65vw] p-[0.75vw] relative overflow-hidden"
              style={{background:'#0a0a16',border:`1px solid ${m.gc}28`}}>
              <div className="absolute bottom-0 right-0 w-[3.5vw] h-[3.5vw] blur-[18px] opacity-25 rounded-full" style={{background:m.gc}} />
              <div className="w-[1.4vw] h-[1.4vw] rounded-[0.3vw] flex items-center justify-center mb-[0.45vw]" style={{background:m.gc+'1a'}}>
                <span className="text-[0.6vw]">{m.icon}</span>
              </div>
              <p className="font-black leading-none mb-[0.2vw]" style={{fontSize:'1.5vw',color:m.gc}}>{m.stat}</p>
              <p className="text-[0.38vw] text-white/30 leading-tight">{m.sub}</p>
              <p className="text-[0.4vw] font-medium text-white/50 mt-[0.25vw]">{m.name}</p>
            </motion.div>
          ))}
        </div>
        {/* Activity + Chart */}
        <div className="px-[1.1vw] pt-[0.65vw] flex gap-[0.7vw] flex-1 min-h-0 pb-[0.7vw]">
          <div className="flex-1 rounded-[0.65vw] overflow-hidden flex flex-col" style={{background:'#070712',border:'1px solid rgba(255,255,255,0.04)'}}>
            <div className="px-[0.75vw] py-[0.5vw] flex items-center justify-between" style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <p className="text-[0.48vw] font-semibold text-white/60">Aktiviti Terkini</p>
              <span className="text-[0.38vw] text-white/20">Hari Ini</span>
            </div>
            <div className="px-[0.75vw] py-[0.35vw] flex flex-col gap-[0.28vw]">
              {[
                {t:'Tiket ADU-2024-088 dibuka',d:'2m',c:'#14b8a6'},
                {t:'RM 45.00 diterima — Agrosea',d:'8m',c:'#22c55e'},
                {t:'Ahmad Hafiz — Merit +5 dikumpul',d:'15m',c:'#10b981'},
                {t:'Pesanan POM-2024-041 baharu',d:'22m',c:'#f97316'},
                {t:'Kelab Komputer — 3 ahli baru',d:'31m',c:'#ef4444'},
              ].map((a,i)=>(
                <motion.div key={i} initial={{x:15,opacity:0}} animate={{x:0,opacity:1}} transition={{delay:1.85+i*0.09}}
                  className="flex items-center gap-[0.45vw] py-[0.28vw]" style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                  <div className="w-[0.38vw] h-[0.38vw] rounded-full flex-shrink-0" style={{background:a.c}} />
                  <p className="text-[0.43vw] text-white/50 flex-1 leading-none">{a.t}</p>
                  <p className="text-[0.36vw] text-white/18">{a.d} lalu</p>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="w-[33%] rounded-[0.65vw] flex flex-col overflow-hidden" style={{background:'#070712',border:'1px solid rgba(255,255,255,0.04)'}}>
            <div className="px-[0.75vw] py-[0.5vw]" style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <p className="text-[0.48vw] font-semibold text-white/60">Jualan Minggu Ini</p>
            </div>
            <div className="flex items-end gap-[0.3vw] px-[0.75vw] pb-[0.5vw] flex-1">
              {[55,72,40,88,65,92,70].map((h,i)=>(
                <motion.div key={i} style={{flex:1, background: i===5?'#22c55e':'#22c55e35', borderRadius:'0.15vw 0.15vw 0 0'}}
                  initial={{height:'0%'}} animate={{height:`${h}%`}} transition={{delay:2+i*0.07,duration:0.55}} />
              ))}
            </div>
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

