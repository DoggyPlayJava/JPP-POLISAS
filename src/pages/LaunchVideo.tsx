import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

const SE = [0.16, 1, 0.3, 1] as const; // Keynote-grade custom cubic bezier ease
const INTER = { fontFamily: "'Inter','SF Pro Display',system-ui,-apple-system,sans-serif" };

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface SceneProps {
  mod: typeof MODULES[0];
}

// ─── Cinematic Camera Rig & Parallax ─────────────────────────────────────────
function CinematicCameraRig({ children, active = true }: { children: React.ReactNode; active?: boolean }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [active]);

  return (
    <motion.div
      style={{
        rotateY: mouse.x * 8, // Interactive cursor tilt
        rotateX: -mouse.y * 8,
        transformStyle: 'preserve-3d',
      }}
      animate={{
        // Continuous slow spatial drift
        y: [0, -6, 0],
        z: [0, 15, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="w-full h-full relative flex items-center justify-center"
    >
      {children}
    </motion.div>
  );
}

// ─── Specular Glare / Light Sweep ───────────────────────────────────────────
function SpecularGlare() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[2vw] z-30">
      <motion.div
        animate={{
          x: ['-150%', '200%'],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          repeatDelay: 5,
          ease: 'easeInOut',
        }}
        className="w-[50%] h-[200%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] absolute -top-[50%]"
      />
    </div>
  );
}

// ─── Kinetic Typography Reveal ─────────────────────────────────────────────
function KineticText({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className={`inline-flex flex-wrap ${className}`}>
      {words.map((word, wi) => (
        <span key={wi} className="mr-[0.3em] overflow-hidden inline-flex py-[0.05em]">
          <motion.span
            initial={{ y: '100%', opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            transition={{
              duration: 0.8,
              delay: delay + wi * 0.06,
              ease: SE,
            }}
            className="inline-block"
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// ─── Film Grain Overlay ─────────────────────────────────────────────────────
function FilmGrain() {
  return (
    <>
      <style>{`@keyframes fg{0%{transform:translate(0,0)}10%{transform:translate(-5px,-10px)}20%{transform:translate(-15px,5px)}30%{transform:translate(7px,-25px)}40%{transform:translate(-5px,25px)}50%{transform:translate(-15px,10px)}60%{transform:translate(15px,0)}70%{transform:translate(0,15px)}80%{transform:translate(3px,35px)}90%{transform:translate(-10px,10px)}}`}</style>
      <div className="fixed inset-0 z-[95] pointer-events-none overflow-hidden" style={{mixBlendMode:'overlay',opacity:0.035}}>
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
          transition={{duration:1.5,delay:p.d,times:[0,0.15,0.8,1],ease:SE}}
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
          transition={{duration:3,delay:c.d,ease:SE}}
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
  { name: 'PolyMaps',        tagline: 'Navigasi kampus dalam poket anda.',          features: ['Carian bilik & kelas masa nyata','Sistem navigasi GPS berjalan kaki','Status cuaca & laluan berciri'],     nc:'text-sky-400',     gc:'#0ea5e9', dc:'bg-sky-400',     bg:'bg-sky-600' },
  { name: 'PolySuara',       tagline: 'Luahkan pendapat, undi bersama.',            features: ['Confession tanpa nama (anonymous)','Sistem undian (poll) interaktif','Eksport perkongsian IG Story'],    nc:'text-fuchsia-400', gc:'#d946ef', dc:'bg-fuchsia-400', bg:'bg-fuchsia-600' },
  { name: 'PolyRent',        tagline: 'Penginapan pelajar, mudah & selamat.',       features: ['Cari rumah & bilik sewa disahkan','Kira bil & sewa berkongsi','Hubungi pemilik terus via WhatsApp'],   nc:'text-cyan-400',    gc:'#06b6d4', dc:'bg-cyan-400',    bg:'bg-cyan-600' },
  { name: 'E-Kebajikan',     tagline: 'Suara anda, keutamaan kami.',               features: ['Aduan diselesaikan dalam 24 jam','Tracking status masa nyata','Sokongan kecemasan pelajar'],   nc:'text-teal-400',   gc:'#14b8a6', dc:'bg-teal-400',   bg:'bg-teal-600' },
  { name: 'E-Keusahawanan',  tagline: 'Niaga dengan lebih bijak.',                 features: ['Sistem POS yang canggih','Laporan jualan masa nyata','Integrasi PolyMart'],                      nc:'text-green-400',  gc:'#22c55e', dc:'bg-green-400',  bg:'bg-green-600' },
  { name: 'E-Akademik',      tagline: 'Ilmu teratur, masa depan cerah.',           features: ['Pemantauan CGPA & pencapaian','Sistem mata merit digital','Folder dokumen peribadi'],            nc:'text-emerald-400', gc:'#10b981', dc:'bg-emerald-400', bg:'bg-emerald-600' },
  { name: 'PolyMart',        tagline: 'Kedai pelajar, dalam genggaman.',           features: ['Jual & beli antara pelajar','Pengesahan produk oleh JPP','Pengurusan pesanan digital'],           nc:'text-orange-400',  gc:'#f97316', dc:'bg-orange-400',  bg:'bg-orange-600' },
  { name: 'Sistem Kelab',    tagline: 'Kelab bersatu, kenangan abadi.',             features: ['Pengurusan ahli & kelab','Rekod aktiviti & laporan','Papan pemuka Exco digital'],               nc:'text-red-400',     gc:'#ef4444', dc:'bg-red-400',     bg:'bg-red-600' },
  { name: 'Karnival JPP',    tagline: 'Kemeriahan kampus, kini digital.',           features: ['E-Tiket & tempahan tapak','Peta karnival interaktif','Live update aktiviti'],                   nc:'text-pink-400',    gc:'#ec4899', dc:'bg-pink-400',    bg:'bg-pink-600' },
  { name: 'JPP HQ Portal',   tagline: 'Dashboard eksklusif anda.',                  features: ['Analisis data berpusat','AI Assistant untuk laporan','Tetapan sistem global'],                  nc:'text-purple-400',  gc:'#a855f7', dc:'bg-purple-400',  bg:'bg-purple-600' },
];

const LABELS = [
  'Intro', 'Nebula Reveal', 
  'PolyMaps', 'PolySuara', 'PolyRent',
  'E-Kebajikan', 'E-Keusahawanan', 'E-Akademik', 'PolyMart', 'Sistem Kelab', 'Karnival JPP', 'JPP HQ Portal',
  'Product Reveal', 'Modul Text', 'Fly Away', 'The Numbers', 'Final Logo', 'Outro'
];

// ─── Main Component ─────────────────────────────────────────────────────────
export function LaunchVideo() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  const [showHUD, setShowHUD] = useState(false);
  const [moduleIdx, setModuleIdx] = useState(-1);
  const [wipeColor, setWipeColor] = useState('#6366f1');
  const [wiping, setWiping] = useState(false);
  const [shake, setShake] = useState(false);
  const [ripples, setRipples] = useState<{id:number;x:number;y:number}[]>([]);
  const rippleId = useRef(0);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 200);
  };

  useEffect(() => {
    const doWipe = (idx: number) => {
      setWipeColor(MODULES[idx].gc);
      setWiping(true);
      setTimeout(() => {
        setModuleIdx(idx);
        setTimeout(() => setWiping(false), 40);
      }, 380);
    };

    const tl = [
      setTimeout(() => { setPhase(1); triggerShake(); }, 8000),       // Supernova Warp Reveal
      setTimeout(() => { setPhase(10); setModuleIdx(0); }, 12000),   // PolyMaps
      setTimeout(() => doWipe(1), 24000),                            // PolySuara
      setTimeout(() => doWipe(2), 36000),                            // PolyRent
      setTimeout(() => doWipe(3), 48000),                            // E-Kebajikan
      setTimeout(() => doWipe(4), 60000),                            // E-Keusahawanan
      setTimeout(() => doWipe(5), 72000),                            // E-Akademik
      setTimeout(() => doWipe(6), 84000),                            // PolyMart
      setTimeout(() => doWipe(7), 96000),                            // Sistem Kelab
      setTimeout(() => doWipe(8), 108000),                           // Karnival JPP
      setTimeout(() => doWipe(9), 120000),                           // JPP HQ Portal
      setTimeout(() => { setPhase(17); triggerShake(); }, 132000),   // Product Reveal
      setTimeout(() => setPhase(18), 136000),                        // Modul Text
      setTimeout(() => setPhase(19), 140000),                        // Fly Away
      setTimeout(() => setPhase(20), 142000),                        // The Numbers
      setTimeout(() => { setPhase(21); triggerShake(); }, 148000),   // Final Logo
      setTimeout(() => setPhase(22), 154000),                        // Outro
    ];
    return () => tl.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const show = () => { setShowHUD(true); clearTimeout(t); t = setTimeout(() => setShowHUD(false), 2000); };
    window.addEventListener('mousemove', show);
    return () => { window.removeEventListener('mousemove', show); clearTimeout(t); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const id = ++rippleId.current;
      setRipples(r => [...r, {id, x:e.clientX, y:e.clientY}]);
      setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 700);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const currentLabelIndex = useMemo(() => {
    if (phase === 0) return 0;
    if (phase === 1) return 1;
    if (phase >= 10 && phase < 17) return 2 + moduleIdx;
    if (phase === 17) return 12;
    if (phase === 18) return 13;
    if (phase === 19) return 14;
    if (phase === 20) return 15;
    if (phase === 21) return 16;
    return 17;
  }, [phase, moduleIdx]);

  return (
    <motion.div 
      animate={shake ? {
        x: [-4, 4, -4, 3, -3, 1, -1, 0],
        y: [3, -3, 2, -2, 1, -1, 0],
        rotate: [-0.3, 0.3, -0.1, 0]
      } : { x: 0, y: 0, rotate: 0 }}
      transition={{ duration: 0.2, ease: 'linear' }}
      className="h-screen w-screen bg-[#030014] text-white overflow-hidden relative select-none" 
      style={{ perspective:'2000px', ...INTER }}
    >
      <AnimatePresence mode="wait">
        
        {/* Dynamic Phone Intro */}
        {phase === 0 && <PhoneMockupIntro key="intro" />}

        {/* JPP DIGITAL PORTAL Supernova Warp Reveal */}
        {phase === 1 && <JppPortalSupernova key="p1" />}

        {/* Modules Slider */}
        {phase >= 10 && phase < 17 && moduleIdx >= 0 && (
          <ModuleSlide key={`mod${moduleIdx}`} mod={MODULES[moduleIdx]} idx={moduleIdx} onActionTrigger={triggerShake} />
        )}

        {/* The Numbers */}
        {phase === 20 && <TheNumbers key="nums" onTick={triggerShake} />}

        {/* Final Logo */}
        {phase === 21 && (
          <motion.div key="p21" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,scale:0.95}} transition={{duration:2}} className="absolute inset-0 flex flex-col items-center justify-center gap-[2vw]">
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

      {/* Product Reveal */}
      {phase >= 17 && phase < 20 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{transformStyle:'preserve-3d'}}>
          <AtmosphereDots />
          <motion.div initial={{opacity:0}} animate={{opacity:0.35}} transition={{duration:3}} className="absolute w-[60vw] h-[60vw] bg-indigo-600 rounded-full blur-[150px]" />
          <div className="absolute left-[8vw] w-[38vw] flex flex-col justify-center h-full gap-[1.5vw] z-10">
            <Mask show={phase>=18} delay={0.5} text="Satu Ekosistem." cls="text-[4vw] font-black tracking-tight text-white" />
            <Mask show={phase>=18} delay={0.9} text="10 Modul Bersepadu. Tanpa Kompromi." cls="text-[1.5vw] font-light tracking-widest text-white/50" />
          </div>
          <FloatingMockup flyAway={phase===19} />
        </div>
      )}

      {/* Outro */}
      <AnimatePresence>
        {phase >= 22 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:2}} className="absolute inset-0 flex flex-col items-center justify-center bg-[#030014] overflow-hidden" style={{perspective:'2000px'}}>
            
            {/* Swirling Background */}
            <motion.div 
              animate={{rotate:360}} transition={{duration:60, repeat:Infinity, ease:'linear'}} 
              className="absolute inset-0 w-[200vw] h-[200vw] -left-[50vw] -top-[50vw] pointer-events-none opacity-50 mix-blend-screen"
              style={{background:'conic-gradient(from 0deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.3) 25%, transparent 50%, rgba(99,102,241,0.3) 75%, rgba(139,92,246,0.1) 100%)'}}
            />
            
            {/* Ambient Particles */}
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

            {/* Title */}
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
              
              {/* Pedestal Vault */}
              <div className="relative flex justify-center items-center" style={{transformStyle:'preserve-3d'}}>
                <motion.div animate={{rotateZ:360}} transition={{duration:20, repeat:Infinity, ease:'linear'}} className="absolute w-[22vw] h-[22vw] rounded-full border-[2px] border-indigo-500/50" style={{transform:'translateZ(-50px) rotateX(75deg)', boxShadow:'0 0 60px rgba(99,102,241,0.4), inset 0 0 30px rgba(99,102,241,0.2)'}} />
                <motion.div animate={{z:[-50, 20, -50], opacity:[0.2, 0.8, 0.2]}} transition={{duration:4, repeat:Infinity, ease:'easeInOut'}} className="absolute w-[20vw] h-[20vw] rounded-full border-[3px] border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,1)]" style={{transform:'rotateX(75deg)'}} />
                <motion.div animate={{rotateZ:-360}} transition={{duration:15, repeat:Infinity, ease:'linear'}} className="absolute w-[16vw] h-[16vw] rounded-full border border-dashed border-purple-500/80" style={{transform:'translateZ(-30px) rotateX(75deg)'}} />
                
                {/* QR Code Container */}
                <motion.div 
                  animate={{rotateY:[-5, 5, -5], y:[0, -10, 0]}} 
                  transition={{duration:6, repeat:Infinity, ease:'easeInOut'}}
                  className="bg-white/95 p-[1vw] rounded-[1vw] shadow-[0_30px_60px_rgba(99,102,241,0.6),_0_0_120px_rgba(139,92,246,0.4)] border border-white relative z-10 overflow-hidden"
                >
                  <motion.div animate={{y:['-20%', '120%']}} transition={{duration:2, repeat:Infinity, ease:'linear'}} className="absolute inset-0 w-full h-[15%] bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent pointer-events-none z-20" />
                  <QRCode value="https://jpp.cipher-node.org" size={Math.round(window.innerWidth * 0.12)} fgColor="#0f172a" />
                </motion.div>
              </div>

              <motion.p animate={{y:[0, -5, 0]}} transition={{duration:4, repeat:Infinity, ease:'easeInOut'}} className="text-[1.5vw] font-black tracking-widest mt-[5vw] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">Sedia Untuk Diakses.</motion.p>
              <p className="text-[1.2vw] font-light tracking-[0.4em] text-white/60 mt-[0.5vw]">jpp.cipher-node.org</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:50}} animate={{opacity:1, y:0}} transition={{delay:2, duration:1.5, type:'spring'}} className="absolute bottom-[3vw] w-full flex flex-col items-center gap-[1.5vw] z-30">
              
              <div className="relative flex items-center justify-center group">
                <motion.div animate={{scale:[1, 1.1, 1], opacity:[0.5, 0.8, 0.5]}} transition={{duration:3, repeat:Infinity, ease:'easeInOut'}} className="absolute inset-[-1vw] rounded-full bg-indigo-500/20 blur-[20px] pointer-events-none" />
                <button onClick={()=>navigate('/login')} className="relative overflow-hidden px-[5vw] py-[1.2vw] rounded-full text-white font-black text-[1.2vw] hover:scale-105 transition-all tracking-[0.2em] uppercase cursor-pointer border border-white/20 bg-black/40 backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  <motion.div className="absolute inset-0 pointer-events-none mix-blend-overlay" animate={{x:['-100%', '200%']}} transition={{duration:3, repeat:Infinity, repeatDelay:2, ease:'easeInOut'}} style={{background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', width:'50%', transform:'skewX(-20deg)'}} />
                  MASUK KE PORTAL
                </button>
              </div>

              <p className="text-[0.65vw] tracking-[0.3em] text-white/30 uppercase font-light drop-shadow-md">
                Dibangunkan oleh Majlis Perwakilan Pelajar POLISAS &copy; 2026.
              </p>
            </motion.div>

            {/* Flash */}
            <motion.div initial={{opacity:1}} animate={{opacity:0}} transition={{duration:1.5, ease:'easeOut'}} className="absolute inset-0 bg-white pointer-events-none z-[100]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOUBLE-LAYER KEYNOTE WIPE TRANSITION */}
      <AnimatePresence>
        {wiping && (
          <>
            {/* Carbon lagging panel */}
            <motion.div
              key="wipe-bg"
              className="fixed inset-0 z-[59] pointer-events-none"
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.42, ease: SE }}
              style={{ background: '#07070a' }}
            />
            {/* Accent leading panel */}
            <motion.div
              key="wipe-fg"
              className="fixed inset-0 z-[60] pointer-events-none"
              initial={{ x: '-105%' }}
              animate={{ x: '0%' }}
              exit={{ x: '105%' }}
              transition={{ duration: 0.38, delay: 0.02, ease: SE }}
              style={{
                background: `linear-gradient(90deg, ${wipeColor}dd, ${wipeColor})`,
                boxShadow: `0 0 100px ${wipeColor}90, inset -5px 0 0 rgba(255,255,255,0.3)`
              }}
            >
              {/* Shimmer Skew Line */}
              <div className="absolute right-0 top-0 bottom-0 w-[8vw] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-15deg] translate-x-[4vw]" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* HUD Tracker */}
      <AnimatePresence>
        {showHUD && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}} className="fixed bottom-3 left-3 z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">
              {currentLabelIndex+1}/15 — {LABELS[currentLabelIndex]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <FilmGrain />

      {/* Ripple */}
      {ripples.map(r => (
        <motion.div key={r.id}
          className="fixed pointer-events-none z-[98] rounded-full border border-white/50"
          style={{left: r.x - 20, top: r.y - 20, width:40, height:40}}
          initial={{scale:0.5, opacity:0.8}}
          animate={{scale:4, opacity:0}}
          transition={{duration:0.65, ease:[0.2,0,0,1]}} />
      ))}

      {/* Chapter Indicator */}
      <AnimatePresence>
        {phase >= 10 && phase < 17 && moduleIdx >= 0 && (
          <motion.div key={`cs${moduleIdx}`}
            initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:20}}
            transition={{duration:0.6, ease:SE}}
            className="fixed bottom-[4.5%] right-[3%] z-[97] text-right pointer-events-none">
            <p className="text-[0.5vw] font-mono tracking-[0.3em] uppercase" style={{color: MODULES[moduleIdx].gc + '90'}}>Modul</p>
            <p className="text-[1.4vw] font-black leading-none" style={{color: MODULES[moduleIdx].gc}}>
              {String(moduleIdx+1).padStart(2,'0')} <span className="text-white/20 font-light">/ 10</span>
            </p>
            <p className="text-[0.45vw] font-light tracking-[0.2em] text-white/30 uppercase mt-[0.2vw]">
              {MODULES[moduleIdx].name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <motion.div className="fixed bottom-0 left-0 h-[2px] z-[99] pointer-events-none"
        style={{ originX: 0, background: moduleIdx >= 0 ? MODULES[moduleIdx].gc : '#6366f1' }}
        animate={{ scaleX: currentLabelIndex / 17 }}
        transition={{ duration: 1, ease: SE }} />
    </motion.div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────
// ─── PhoneMockupIntro ────────────────────────────────────────────────────────
function PhoneMockupIntro() {
  const [act, setAct] = useState(0);

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 5500), // touch
      setTimeout(() => setAct(2), 7000), // slide away
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#020204] overflow-hidden" style={{perspective: '2000px'}}>
      
      {/* Glow */}
      <motion.div animate={act >= 2 ? {opacity: 0} : {rotate:360, scale:[1, 1.1, 1], opacity:[0.1, 0.2, 0.1]}} transition={act >= 2 ? {duration: 1.5} : {duration:20, repeat:Infinity, ease:'linear'}} className="absolute w-[60vw] h-[60vw] bg-indigo-900 rounded-full blur-[150px]" />
      <motion.div animate={act >= 2 ? {opacity: 0} : {rotate:-360, scale:[1, 1.2, 1], opacity:[0.05, 0.15, 0.05]}} transition={act >= 2 ? {duration: 1.5} : {duration:25, repeat:Infinity, ease:'linear'}} className="absolute w-[50vw] h-[50vw] bg-purple-900 rounded-full blur-[120px] mix-blend-screen" />

      {/* Glass Phone */}
      <motion.div 
        initial={{y:'100vh', rotateX:40, rotateY:-20, rotateZ:10, scale:0.7, opacity: 0, filter: 'blur(20px)'}}
        animate={
          act >= 2
            ? { y: '20vh', rotateX: 45, rotateY: 0, rotateZ: 0, scale: 0.85, opacity: 0, filter: 'blur(20px)' } 
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
            ? { duration: 1.2, ease: SE } 
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
        className="relative w-[24vw] h-[48vw] rounded-[3vw] bg-[#050508] border-[0.4vw] border-[#3a3a46] flex flex-col overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.9),_inset_0_0_20px_rgba(255,255,255,0.05)]"
        style={{ transformStyle:'preserve-3d' }}
      >
        <div className="absolute top-[1.2vw] left-1/2 -translate-x-1/2 w-[7vw] h-[2vw] bg-black rounded-[1vw] z-50 flex items-center justify-end px-[0.5vw]">
          <div className="w-[0.6vw] h-[0.6vw] bg-indigo-500/50 rounded-full" />
        </div>

        <SpecularGlare />

        <div className="w-full h-full bg-[#030014] relative z-10 flex flex-col">
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
              <motion.div 
                animate={act >= 1 ? { scale: 0.95, backgroundColor: "#e2e8f0" } : { scale: 1, backgroundColor: "#ffffff" }}
                transition={{ duration: 0.2 }}
                className="relative w-full py-[1vw] rounded-full flex items-center justify-center text-black font-bold text-[0.7vw] shadow-[0_0_20px_rgba(255,255,255,0.3)] overflow-hidden cursor-pointer"
              >
                LOG MASUK PORTAL
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

          <div className="absolute bottom-[-5vw] left-0 right-0 flex justify-center gap-[1vw] opacity-40">
             <div className="w-[10vw] h-[15vw] bg-white/5 rounded-[1vw] border border-white/10" />
             <div className="w-[10vw] h-[15vw] bg-white/5 rounded-[1vw] border border-white/10 mt-[2vw]" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── JppPortalSupernova ──────────────────────────────────────────────────────
function JppPortalSupernova() {
  const [fade, setFade] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setFade(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020205] overflow-hidden" style={{perspective: '1000px'}}>
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 mix-blend-screen pointer-events-none">
        <motion.div animate={{rotate:360, scale:[1,1.2,1]}} transition={{duration:40, repeat:Infinity, ease:'linear'}} className="absolute w-[100vw] h-[100vw] bg-indigo-900/30 rounded-full blur-[150px] mix-blend-screen" />
        <motion.div animate={{rotate:-360, scale:[1,1.5,1]}} transition={{duration:50, repeat:Infinity, ease:'linear'}} className="absolute w-[80vw] h-[80vw] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <motion.div 
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.8, y: 40 }}
        animate={fade 
          ? { opacity: 0, scale: 1.4, filter: 'blur(20px)' } 
          : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
        }
        transition={fade 
          ? { duration: 0.8, ease: 'easeIn' } 
          : { duration: 2.5, ease: SE }
        }
      >
        <h1 className="text-[8vw] font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-500 drop-shadow-[0_20px_40px_rgba(99,102,241,0.5)] text-center">
          JPP DIGITAL<br/>PORTAL
        </h1>
        
        <motion.h2 
          initial={{ opacity: 0, letterSpacing: '0.1em' }}
          animate={fade ? { opacity: 0 } : { opacity: 0.6, letterSpacing: '0.6em' }}
          transition={{ delay: 1.2, duration: 1.8, ease: 'easeOut' }}
          className="text-[1vw] mt-[2.5vw] font-light text-white uppercase text-center drop-shadow-md"
        >
          Mengangkat Potensi, Mencorak Transformasi
        </motion.h2>

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

      <AnimatePresence>
        {fade && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.8 }} 
            className="absolute inset-0 bg-[#030014] z-50 pointer-events-none" 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── ModuleSlide ─────────────────────────────────────────────────────────────
function ModuleSlide({ mod, idx, onActionTrigger }: { mod: typeof MODULES[0]; idx: number; onActionTrigger: () => void }) {
  const [slam, setSlam] = useState(true);
  const Scenes = [
    PolyMapsScene,
    PolySuaraScene,
    PolyRentScene,
    KebajikanScene, 
    KeusahawananScene, 
    AkademikScene, 
    PolyMartScene, 
    KelabScene, 
    KarnivalScene,
    JppHqScene
  ];
  const Scene = Scenes[idx];

  useEffect(() => {
    const t = setTimeout(() => {
      setSlam(false);
      onActionTrigger(); // Trigger shockwave shake on scene drop
    }, 1100);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <motion.div 
      initial={{ scale: 1.15, opacity: 0, filter: 'blur(10px)' }}
      animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
      exit={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: SE }}
      className="absolute inset-0"
    >
      <AnimatePresence mode="wait">
        {slam ? (
          /* SLAM TITLE CARD */
          <motion.div key="slam" className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden"
            exit={{opacity:0, scale:1.1}}
            transition={{duration:0.4, ease:SE}}>
            <motion.div className="absolute inset-0" initial={{opacity:0}} animate={{opacity:0.15}} transition={{duration:0.4}} style={{background: mod.gc}} />
            
            <div className="text-center z-10 px-[4vw]">
              <motion.p
                initial={{opacity:0, y:15}} animate={{opacity:1, y:0}}
                transition={{duration:0.4, ease:SE}}
                className="text-[1.2vw] font-medium tracking-[0.5em] uppercase mb-[1.5vw]"
                style={{color: mod.gc}}>
                {String(idx+1).padStart(2,'0')} &mdash; 07
              </motion.p>
              
              <h1 className="font-black text-white leading-[0.88] tracking-tight relative" style={{fontSize:'10vw'}}>
                <KineticText text={mod.name} delay={0.1} />
                <motion.div 
                  initial={{ opacity:0, scale:0.5 }} animate={{ opacity:0.15, scale:1 }}
                  style={{ color: mod.gc, textShadow: `0 0 80px ${mod.gc}` }}
                  className="absolute inset-0 -z-10 pointer-events-none select-none blur-[10px]"
                >
                  {mod.name}
                </motion.div>
              </h1>
              
              <motion.div
                initial={{scaleX:0, originX:0}} animate={{scaleX:1}}
                transition={{duration:0.7, ease:SE, delay:0.3}}
                className="h-[2px] mt-[2vw] mx-auto w-[25vw]"
                style={{background:`linear-gradient(to right, transparent, ${mod.gc}, transparent)`}} />
            </div>
            
            {[...Array(6)].map((_,i) => (
              <div key={i} className="absolute top-0 bottom-0 pointer-events-none"
                style={{left:`${10+i*16}%`, width:'1px', background:`${mod.gc}15`, transform:'skewX(-18deg)'}} />
            ))}
          </motion.div>
        ) : (
          /* ACTUAL SCENE wrapped in interactive Camera Parallax Rig */
          <motion.div key="scene" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.3}} className="absolute inset-0">
            <CinematicCameraRig>
              <Scene mod={mod} />
            </CinematicCameraRig>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const CE = [0.16, 1, 0.3, 1] as const;
const RE = [0.16, 1, 0.3, 1] as const;

// Easing presets matching Remotion physics principles
const spS = (d=0) => ({ type:'spring' as const, stiffness:120, damping:18, delay:d });
const spB = (d=0) => ({ type:'spring' as const, stiffness:220, damping:14, delay:d });
const sp  = (d=0) => ({ type:'spring' as const, stiffness:300, damping:18, delay:d });

// ─── TextReveal ──────────────────────────────────────────────────────────────
function TextReveal({ text, delay=0, className='', style={} }: {
  text:string; delay?:number; className?:string; style?:React.CSSProperties;
}) {
  return (
    <div style={{overflow:'hidden', display:'block'}} className={className}>
      <motion.div
        initial={{y:'110%'}} animate={{y:'0%'}}
        transition={{duration:0.8, ease:SE, delay}}
        style={style}
      >{text}</motion.div>
    </div>
  );
}

// ─── ModuleOverlay ───────────────────────────────────────────────────────────
function ModuleOverlay({ show, num, name, tagline, gc, pos='bottom-[6%] left-[5%]' }: {
  show:boolean; num:string; name:string; tagline:string; gc:string; pos?:string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="ov"
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          transition={{duration:0.4, ease:SE}}
          className={`absolute z-30 ${pos} pointer-events-none`}
        >
          <TextReveal text={num}     delay={0}    className="text-[0.8vw] font-medium tracking-[0.5em] uppercase mb-[0.3vw]" style={{color:gc}} />
          <TextReveal text={name}    delay={0.1}  className="text-[4.5vw] font-black text-white leading-[0.9] tracking-tight" />
          <TextReveal text={tagline} delay={0.2}  className="text-[0.95vw] font-light text-white/45 mt-[0.4vw]" />
          <motion.div
            initial={{scaleX:0,originX:0}} animate={{scaleX:1}} exit={{scaleX:0,originX:0}}
            transition={{duration:0.9, ease:SE, delay:0.3}}
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
          borderTop:c.bt?`1px solid ${gc}44`:undefined, borderBottom:c.bb?`1px solid ${gc}44`:undefined,
          borderLeft:c.bl?`1px solid ${gc}44`:undefined, borderRight:c.br?`1px solid ${gc}44`:undefined}}
        initial={{opacity:0,scale:0.5}} animate={{opacity:0.6,scale:1}}
        transition={{duration:0.8, ease:SE, delay:0.1+i*0.06}}/>
    ))}</>
  );
}

// ─── Cinematic Envelope ───────────────────────────────────────────────────────
function CinematicEnvelope({ gc, children }: { gc:string; children:React.ReactNode }) {
  return (
    <div className="absolute inset-0 bg-[#020406] overflow-hidden" style={{filter:'contrast(1.05) saturate(1.05)'}}>
      {/* Breathing gradient auroras */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            x: ['-15%', '20%', '-15%'],
            y: ['-15%', '15%', '-15%'],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[55vw] h-[55vw] rounded-full blur-[140px] opacity-[0.14]"
          style={{ background: `radial-gradient(circle, ${gc} 0%, transparent 70%)`, left: '8%', top: '5%' }}
        />
        <motion.div
          animate={{
            x: ['15%', '-20%', '15%'],
            y: ['15%', '-15%', '15%'],
            scale: [1.15, 1, 1.15],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
          className="absolute w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-[0.1]"
          style={{ background: `radial-gradient(circle, #6366f1 0%, transparent 70%)`, right: '12%', bottom: '8%' }}
        />
      </div>

      <ParticleField gc={gc} />
      <div className="relative z-10 w-full h-full">{children}</div>
      <div className="absolute inset-0 pointer-events-none z-20"
        style={{background:'radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.85) 100%)'}}/>
      <div className="absolute inset-0 pointer-events-none z-20"
        style={{backgroundImage:'repeating-linear-gradient(0deg,rgba(0,0,0,0.04) 0,rgba(0,0,0,0.04) 1px,transparent 1px,transparent 4px)'}}/>
      <motion.div className="absolute top-0 left-0 right-0 h-[1.5px] z-30"
        initial={{scaleX:0,originX:0}} animate={{scaleX:1}}
        transition={{duration:1.2, ease:SE, delay:0.1}}
        style={{background:`linear-gradient(to right, transparent 0%, ${gc} 30%, ${gc} 70%, transparent 100%)`}}/>
      <HudCorners gc={gc} />
    </div>
  );
}

// ─── Scene: PolyMaps ──────────────────────────────────────────────────────────
function PolyMapsScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [typedText, setTypedText] = useState("");
  
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Glass card reveals
      setTimeout(() => setAct(2), 2000),  // 3D Isometric Map Grid
      setTimeout(() => setAct(3), 3500),  // Search typing simulation begins
      setTimeout(() => setAct(4), 5500),  // Pin drops & path route starts drawing
      setTimeout(() => setAct(5), 7500),  // Weather warning chip slides in
      setTimeout(() => setAct(6), 9000),  // AI chip & overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (act < 3) return;
    const searchStr = "Bilik Kuliah A301 (Blok C)";
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(searchStr.substring(0, i));
      i++;
      if (i > searchStr.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [act]);

  const gc = mod.gc;

  return (
    <CinematicEnvelope gc={gc}>
      <AnimatePresence>
        {act >= 1 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, type: 'spring', bounce: 0.15 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Glassmorphic card */}
            <div className="relative w-[75vw] h-[40vw] bg-black/35 backdrop-blur-2xl border border-white/10 rounded-[2vw] shadow-[0_50px_100px_rgba(0,0,0,0.85),inset_0_0_40px_rgba(255,255,255,0.03)] flex flex-col p-[2vw] overflow-hidden">
              <SpecularGlare />

              {/* Header */}
              <div className="flex justify-between items-center mb-[1.5vw] border-b border-white/10 pb-[1vw]">
                <div className="flex items-center gap-[1vw]">
                  <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-gradient-to-br from-sky-500/80 to-blue-600/80 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                    <span className="text-[1.5vw]">🗺️</span>
                  </div>
                  <div>
                    <h2 className="text-[1.8vw] font-black tracking-tight text-white leading-none">PolyMaps POLISAS</h2>
                    <p className="text-[0.8vw] text-sky-400/60 tracking-widest font-mono uppercase mt-[0.2vw]">Sistem Navigasi & Carian Laluan Kampus</p>
                  </div>
                </div>
                {/* Weather widget */}
                <AnimatePresence>
                  {act >= 5 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-[0.5vw] px-[1vw] py-[0.5vw] bg-sky-500/10 rounded-full border border-sky-500/20"
                    >
                      <span className="text-[1vw] animate-bounce">⛈️</span>
                      <span className="text-[0.6vw] text-sky-300 font-bold tracking-widest uppercase font-mono">Cuaca Kuantan: Hujan Lebat</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Two Column Layout */}
              <div className="flex flex-1 gap-[1.5vw] overflow-hidden">
                {/* Search & Navigation Info Panel */}
                <div className="w-[22vw] flex flex-col gap-[1vw] z-10">
                  {/* Search Box simulation */}
                  <div className="bg-white/5 border border-white/10 rounded-[1vw] p-[1vw] flex flex-col gap-[0.5vw]">
                    <span className="text-[0.6vw] text-white/40 uppercase tracking-wider font-bold">Cari Destinasi</span>
                    <div className="h-[2.5vw] bg-black/40 border border-sky-500/30 rounded-[0.5vw] flex items-center px-[0.8vw] gap-[0.5vw] relative overflow-hidden">
                      <span className="text-[0.8vw]">🔍</span>
                      <span className="text-[0.8vw] text-white font-bold font-mono whitespace-nowrap">{typedText}</span>
                      {act >= 3 && typedText.length < 26 && (
                        <span className="w-[2px] h-[1.2vw] bg-sky-400 animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Route Steps instructions */}
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-[1vw] p-[1vw] flex flex-col gap-[0.8vw]">
                    <span className="text-[0.6vw] text-white/40 uppercase tracking-wider font-bold">Arahan Laluan</span>
                    <div className="flex flex-col gap-[0.6vw] overflow-y-auto pr-[0.2vw] scrollbar-thin">
                      <AnimatePresence>
                        {act >= 4 && (
                          <>
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-[0.5vw] items-start p-[0.5vw] bg-sky-500/10 rounded-[0.5vw] border border-sky-500/20">
                              <span className="text-[1vw]">🚶‍♂️</span>
                              <div>
                                <p className="text-[0.75vw] text-white font-bold">Mula Berjalan Kaki</p>
                                <p className="text-[0.6vw] text-white/50">Halakan langkah ke arah Blok C (120m)</p>
                              </div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex gap-[0.5vw] items-start p-[0.5vw] bg-white/5 rounded-[0.5vw]">
                              <span className="text-[1vw]">☂️</span>
                              <div>
                                <p className="text-[0.75vw] text-white font-bold">Laluan Hujan (Berbumbung)</p>
                                <p className="text-[0.6vw] text-sky-300">Cuaca hujan dikesan: Sila gunakan laluan jejantas Blok A-B</p>
                              </div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }} className="flex gap-[0.5vw] items-start p-[0.5vw] bg-white/5 rounded-[0.5vw]">
                              <span className="text-[1vw]">📍</span>
                              <div>
                                <p className="text-[0.75vw] text-white font-bold">Destinasi Akhir</p>
                                <p className="text-[0.6vw] text-white/50">Naik ke Tingkat 3, Bilik A301 berada di sebelah kanan</p>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* 3D Map Grid Visualizer */}
                <div className="flex-1 relative bg-black/40 border border-white/10 rounded-[1.5vw] flex items-center justify-center overflow-hidden" style={{ transformStyle: 'preserve-3d', perspective: '1200px' }}>
                  <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at center, ${gc}0f 0%, transparent 80%)` }} />
                  
                  {/* Grid Lines */}
                  {act >= 2 && (
                    <motion.div 
                      initial={{ opacity: 0, rotateX: 60, rotateZ: 35, scale: 0.7 }}
                      animate={act >= 4 ? { opacity: 1, rotateX: 52, rotateZ: 25, scale: 1.1 } : { opacity: 1, rotateX: 60, rotateZ: 35, scale: 0.9 }}
                      transition={{ duration: 1.5, ease: SE }}
                      className="absolute w-[35vw] h-[35vw] border border-white/10 relative"
                      style={{ 
                        transformStyle: 'preserve-3d',
                        backgroundImage: `linear-gradient(${gc}15 1px, transparent 1px), linear-gradient(90deg, ${gc}15 1px, transparent 1px)`,
                        backgroundSize: '2.5vw 2.5vw',
                        boxShadow: `inset 0 0 50px rgba(0,0,0,0.8), 0 0 30px ${gc}15`
                      }}
                    >
                      {/* Isometric styled campus buildings */}
                      <div className="absolute top-[5vw] left-[4vw] w-[8vw] h-[6vw] bg-sky-500/10 border border-sky-500/30 rounded-[0.8vw]" style={{ transform: 'translateZ(1.5vw)' }}>
                        <span className="absolute inset-0 flex items-center justify-center text-[0.65vw] text-sky-300/60 font-black tracking-widest uppercase">Blok A</span>
                      </div>

                      <div className="absolute top-[6vw] left-[18vw] w-[7vw] h-[7vw] bg-sky-500/10 border border-sky-500/30 rounded-[0.8vw]" style={{ transform: 'translateZ(1.5vw)' }}>
                        <span className="absolute inset-0 flex items-center justify-center text-[0.65vw] text-sky-300/60 font-black tracking-widest uppercase">Blok B</span>
                      </div>

                      <div className="absolute top-[18vw] left-[10vw] w-[10vw] h-[8vw] bg-sky-500/15 border border-sky-500/40 rounded-[0.8vw]" style={{ transform: 'translateZ(2.5vw)', transformStyle: 'preserve-3d' }}>
                        <span className="absolute inset-0 flex items-center justify-center text-[0.7vw] text-sky-400 font-black tracking-widest uppercase">Blok C (A301)</span>
                      </div>

                      {/* Route Path (animated drawing line) */}
                      {act >= 4 && (
                        <svg className="absolute inset-0 w-full h-full overflow-visible z-10 pointer-events-none" viewBox="0 0 500 500">
                          <motion.path 
                            d="M80,100 L220,120 L180,320 L230,320" 
                            fill="none" 
                            stroke={gc} 
                            strokeWidth="4" 
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }} 
                            animate={{ pathLength: 1 }} 
                            transition={{ duration: 2, ease: "easeInOut" }}
                          />
                          <motion.circle
                            cx="80"
                            cy="100"
                            r="6"
                            fill="#38bdf8"
                            initial={{ scale: 0 }}
                            animate={{ scale: [1, 1.8, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          />
                        </svg>
                      )}

                      {/* GPS User Indicator */}
                      <div className="absolute top-[7.2vw] left-[5.6vw] w-[1.5vw] h-[1.5vw] flex items-center justify-center" style={{ transform: 'translateZ(2vw)' }}>
                        <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute w-full h-full bg-sky-400 rounded-full" />
                        <div className="w-[0.6vw] h-[0.6vw] bg-white rounded-full border border-sky-500 shadow-[0_0_10px_sky]" />
                      </div>

                      {/* Destination Target Drop Pin */}
                      {act >= 4 && (
                        <motion.div 
                          initial={{ y: -100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ type: 'spring', bounce: 0.4 }}
                          className="absolute top-[16.5vw] left-[10.5vw]"
                          style={{ transform: 'translateZ(3.2vw) rotateX(-50deg)' }}
                        >
                          <span className="text-[2.2vw] filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">📍</span>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=6} num="Modul 01" name="PolyMaps" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=6} message="Kombinasi API cuaca langsung dan pemetaan kelas mempercepatkan langkah pelajar ke destinasi." />
    </CinematicEnvelope>
  );
}

// ─── Scene: PolySuara ─────────────────────────────────────────────────────────
function PolySuaraScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [upvotes, setUpvotes] = useState(24);
  const [downvotes, setDownvotes] = useState(2);
  
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Glass dashboard reveals
      setTimeout(() => setAct(2), 2000),  // Upvotes ticks
      setTimeout(() => setAct(3), 4200),  // Downvotes & community hide
      setTimeout(() => setAct(4), 6500),  // Center card expands to IG Story style
      setTimeout(() => setAct(5), 9000),  // AI chip & overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (act < 2) return;
    let val = 24;
    const interval = setInterval(() => {
      val += 3;
      if (val >= 89) {
        setUpvotes(89);
        clearInterval(interval);
      } else {
        setUpvotes(val);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [act]);

  const gc = mod.gc;

  return (
    <CinematicEnvelope gc={gc}>
      <AnimatePresence>
        {act >= 1 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, type: 'spring', bounce: 0.15 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Main glass frame */}
            <div className="relative w-[75vw] h-[40vw] bg-black/35 backdrop-blur-2xl border border-white/10 rounded-[2vw] shadow-[0_50px_100px_rgba(0,0,0,0.85),inset_0_0_40px_rgba(255,255,255,0.03)] flex p-[2vw] overflow-hidden gap-[2vw]">
              <SpecularGlare />

              {/* Left Column: Feed simulation */}
              <motion.div 
                animate={act >= 4 ? { scale: 0.9, opacity: 0.4, x: '-5vw', filter: 'blur(3px)' } : { scale: 1, opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: SE }}
                className="flex-1 flex flex-col gap-[1.2vw]"
              >
                {/* Header */}
                <div className="border-b border-white/10 pb-[0.8vw]">
                  <div className="flex items-center gap-[0.8vw]">
                    <span className="text-[1.8vw]">📣</span>
                    <div>
                      <h2 className="text-[1.8vw] font-black tracking-tight text-white leading-none">PolySuara Feed</h2>
                      <p className="text-[0.75vw] text-fuchsia-400 font-mono tracking-wider mt-[0.2vw]">Luahan Tanpa Nama & Undian Kampus</p>
                    </div>
                  </div>
                </div>

                {/* Confession Cards list */}
                <div className="flex-1 flex flex-col gap-[1vw] overflow-hidden">
                  {/* Card 1 (Active) */}
                  <div className="bg-white/5 border border-white/10 rounded-[1.2vw] p-[1.2vw] relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-[0.6vw]">
                        <span className="px-[0.6vw] py-[0.2vw] rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[0.6vw] font-bold uppercase tracking-wider"># Akademik</span>
                        <span className="text-[0.6vw] text-white/40 font-mono font-bold">Kucing Misteri · 5m lepas</span>
                      </div>
                      <p className="text-[0.9vw] text-white/80 leading-relaxed font-semibold">
                        "Agak-agak result exam kalini keluar bila eh? Nervous gila nak tunggu pointer keluar. Wish me luck guys! 😭🤞"
                      </p>
                    </div>

                    <div className="flex gap-[1vw] mt-[1vw] border-t border-white/5 pt-[0.8vw]">
                      <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-fuchsia-400 font-black">
                        <motion.span animate={act >= 2 ? { scale: [1, 1.4, 1] } : {}} className="text-[1vw]">👍</motion.span>
                        <span>{upvotes}</span>
                      </div>
                      <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-white/40">
                        <span>👎</span>
                        <span>{downvotes}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white/5 border border-white/5 opacity-60 rounded-[1.2vw] p-[1vw]">
                    <div className="flex justify-between items-center mb-[0.4vw]">
                      <span className="px-[0.6vw] py-[0.1vw] rounded-full bg-white/5 text-white/60 text-[0.55vw] font-bold uppercase"># Kemudahan</span>
                      <span className="text-[0.55vw] text-white/30 font-mono">Harimau Berani · 1j lepas</span>
                    </div>
                    <p className="text-[0.8vw] text-white/60 leading-relaxed">
                      "Makanan dekat kiosk Blok B sedap betul harini! Terbaiklah abang niaga."
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Dynamic IG Export focus */}
              <div className="w-[28vw] relative flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
                <AnimatePresence>
                  {act >= 4 && (
                    <motion.div 
                      initial={{ scale: 0.6, rotateY: 50, rotateX: 20, opacity: 0, z: 200 }}
                      animate={{ scale: 1, rotateY: -12, rotateX: 8, opacity: 1, z: 0 }}
                      exit={{ scale: 0.6, rotateY: 50, opacity: 0 }}
                      transition={{ duration: 1.2, type: 'spring', bounce: 0.2 }}
                      className="absolute w-[20vw] h-[34vw] bg-gradient-to-br from-fuchsia-950/60 to-purple-900/60 border border-fuchsia-400/40 rounded-[1.8vw] shadow-[0_30px_60px_rgba(217,70,239,0.25)] flex flex-col p-[1.5vw] justify-between overflow-hidden"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <SpecularGlare />
                      <div className="absolute top-0 inset-x-0 h-[0.3vw] bg-gradient-to-r from-fuchsia-400 to-purple-400 animate-pulse" />

                      {/* IG Story Style frame */}
                      <div className="flex flex-col gap-[1vw]">
                        <div className="flex items-center gap-[0.5vw] border-b border-white/10 pb-[0.8vw]">
                          <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-600 flex items-center justify-center text-[1vw]">✦</div>
                          <div>
                            <p className="text-[0.75vw] text-white font-bold leading-none">PolySuara</p>
                            <p className="text-[0.55vw] text-fuchsia-300 font-mono tracking-widest uppercase">IG STORY EXPORT</p>
                          </div>
                        </div>

                        {/* Centered card mockup */}
                        <div className="bg-black/40 border border-white/15 p-[1.2vw] rounded-[1vw] backdrop-blur-md">
                          <p className="text-[0.85vw] font-semibold text-white/90 leading-relaxed">
                            "Agak-agak result exam kalini keluar bila eh? Nervous gila nak tunggu pointer keluar. Wish me luck guys! 😭🤞"
                          </p>
                          <div className="flex justify-between items-center mt-[1vw] border-t border-white/5 pt-[0.6vw]">
                            <span className="text-[0.55vw] text-fuchsia-400 font-bold uppercase">@jpp_polisas</span>
                            <div className="flex gap-[0.5vw] text-[0.6vw] font-bold text-white/60">
                              <span>👍 89 upvotes</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Badge */}
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-[0.8vw] text-white/40 tracking-[0.3em] font-light uppercase">jpp.polisas.edu</span>
                        <div className="px-[0.8vw] py-[0.3vw] rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 text-[0.55vw] font-bold uppercase mt-[0.5vw] tracking-wider">
                          Kongsi ke IG Story
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=5} num="Modul 02" name="PolySuara" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=5} message="Sistem Tapisan dan Karma Komuniti menyembunyikan luahan negatif secara automasi demi keselamatan ekosistem." />
    </CinematicEnvelope>
  );
}

// ─── Scene: PolyRent ─────────────────────────────────────────────────────────
function PolyRentScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [heartBurst, setHeartBurst] = useState(false);
  const [calcProgress, setCalcProgress] = useState(0);

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Glass panels reveal
      setTimeout(() => setAct(2), 2200),  // verified badge sweeps
      setTimeout(() => setAct(3), 4200),  // Calculator widget triggers & calculates
      setTimeout(() => { setAct(4); setHeartBurst(true); }, 7000),  // Heart tap wish burst
      setTimeout(() => setAct(5), 9000),  // AI chip & overlays
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (act < 3) return;
    let val = 0;
    const interval = setInterval(() => {
      val += 5;
      if (val >= 100) {
        setCalcProgress(100);
        clearInterval(interval);
      } else {
        setCalcProgress(val);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [act]);

  const gc = mod.gc;

  return (
    <CinematicEnvelope gc={gc}>
      <ExplodingParticles active={heartBurst} emoji="❤️" count={30} />

      <AnimatePresence>
        {act >= 1 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, type: 'spring', bounce: 0.15 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Main glass workspace */}
            <div className="relative w-[75vw] h-[40vw] bg-black/35 backdrop-blur-2xl border border-white/10 rounded-[2vw] shadow-[0_50px_100px_rgba(0,0,0,0.85),inset_0_0_40px_rgba(255,255,255,0.03)] flex p-[2vw] overflow-hidden gap-[2vw]">
              <SpecularGlare />

              {/* Left Column: Airbnb style listing cards */}
              <motion.div 
                animate={act >= 3 ? { scale: 0.95, x: '-2vw', rotateY: 15 } : { scale: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 1, ease: SE }}
                className="flex-1 flex flex-col gap-[1vw] relative"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="border-b border-white/10 pb-[0.8vw]">
                  <div className="flex items-center gap-[0.8vw]">
                    <span className="text-[1.8vw]">🏠</span>
                    <div>
                      <h2 className="text-[1.8vw] font-black tracking-tight text-white leading-none">PolyRent Kediaman</h2>
                      <p className="text-[0.75vw] text-cyan-400 font-mono tracking-wider mt-[0.2vw]">Bilik Sewa & Perkongsian Bil Pintar</p>
                    </div>
                  </div>
                </div>

                {/* Listing Card */}
                <div className="bg-white/5 border border-white/10 rounded-[1.5vw] p-[1vw] flex flex-col justify-between h-[22vw] relative overflow-hidden">
                  <SpecularGlare />
                  
                  {/* Image container representation */}
                  <div className="h-[12vw] bg-[#141d24] rounded-[1vw] overflow-hidden relative flex items-center justify-center">
                    <span className="text-[4vw]">🏢</span>
                    
                    {/* Verified Badge */}
                    <AnimatePresence>
                      {act >= 2 && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute top-[0.8vw] left-[0.8vw] px-[0.8vw] py-[0.3vw] bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-[0.6vw] tracking-wider uppercase rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-[0.2vw]"
                        >
                          <span>🛡️</span> Disahkan KLK
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Wishlist Heart */}
                    <div className="absolute top-[0.8vw] right-[0.8vw] w-[2vw] h-[2vw] rounded-full bg-black/40 flex items-center justify-center">
                      <motion.span 
                        animate={heartBurst ? { scale: [1, 1.6, 1], color: '#ef4444' } : {}}
                        className="text-[1.1vw] text-white"
                      >
                        ❤️
                      </motion.span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-[0.8vw]">
                    <div>
                      <h3 className="text-[1.1vw] font-bold text-white leading-none">Taman Semambu Jaya</h3>
                      <p className="text-[0.7vw] text-white/50 mt-[0.2vw]">Kekosongan: 2 Lelaki · Bilik Tengah</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[1.2vw] font-black text-cyan-400 leading-none">RM 180</p>
                      <p className="text-[0.55vw] text-white/30 uppercase mt-[0.1vw]">Bulanan per Kepala</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Smart Calculator break down */}
              <div className="w-[28vw] flex flex-col justify-center gap-[1vw]" style={{ transformStyle: 'preserve-3d' }}>
                <AnimatePresence>
                  {act >= 3 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 50, rotateX: -20 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      className="bg-black/45 border border-white/10 rounded-[1.8vw] p-[1.5vw] shadow-[0_30px_60px_rgba(6,182,212,0.15)] backdrop-blur-md flex flex-col gap-[1vw]"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-[0.8vw]">
                        <span className="text-[0.8vw] font-bold text-white flex items-center gap-[0.4vw]">🧮 Pembahagi Bil Pintar</span>
                        <span className="text-[0.6vw] text-cyan-400 font-mono font-bold uppercase">Proses: {calcProgress}%</span>
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-[0.6vw]">
                        {[
                          { name: 'Sewa Bulanan (Rumah)', total: 540, share: 180, c: '#06b6d4' },
                          { name: 'Internet (500Mbps)', total: 60, share: 20, c: '#3b82f6' },
                          { name: 'Utiliti (Elektrik & Air)', total: 45, share: 15, c: '#10b981' }
                        ].map((bill, i) => (
                          <div key={i} className="flex justify-between items-center p-[0.6vw] bg-white/5 rounded-[0.8vw] border border-white/5">
                            <div>
                              <p className="text-[0.75vw] text-white/80 font-semibold">{bill.name}</p>
                              <p className="text-[0.55vw] text-white/30 font-mono">Jumlah Bil: RM {bill.total}</p>
                            </div>
                            <div className="text-right">
                              <motion.p 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                transition={{ delay: 0.5 + i*0.2 }}
                                className="text-[0.9vw] font-bold"
                                style={{ color: bill.c }}
                              >
                                RM {bill.share}
                              </motion.p>
                              <p className="text-[0.5vw] text-white/40">Kongsi 3 Pelajar</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center mt-[0.5vw] pt-[0.8vw] border-t border-white/10">
                        <span className="text-[0.8vw] text-white font-bold">Anggaran Bulanan</span>
                        <motion.span 
                          initial={{ scale: 0.8 }} 
                          animate={{ scale: 1 }} 
                          className="text-[1.4vw] font-black text-cyan-400"
                        >
                          RM 215 / Pelajar
                        </motion.span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=5} num="Modul 03" name="PolyRent" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=5} message="Fungsi pembahagian bil dan pengesahan kualiti sewaan mengurangkan kos dan risiko penipuan kediaman." />
    </CinematicEnvelope>
  );
}

// ─── Scene 04: E-Kebajikan ───────────────────────────────────────────────────
function KebajikanScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Dashboard init
      setTimeout(() => setAct(2), 2000),  // Radar
      setTimeout(() => setAct(3), 3500),  // Zoom Target
      setTimeout(() => setAct(4), 4500),  // Comms 1
      setTimeout(() => setAct(5), 6000),  // Comms 2
      setTimeout(() => setAct(6), 7500),  // Comms 3
      setTimeout(() => setAct(7), 8500),  // Overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  
  const gc = mod.gc;
  
  return (
    <CinematicEnvelope gc={gc}>
      <AnimatePresence>
        {act >= 1 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, type: 'spring', bounce: 0.15 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ transformStyle: 'preserve-3d' }}
          >
             {/* Glassmorphic card */}
             <div className="relative w-[75vw] h-[40vw] bg-black/35 backdrop-blur-2xl border border-white/10 rounded-[2vw] shadow-[0_50px_100px_rgba(0,0,0,0.85),inset_0_0_40px_rgba(255,255,255,0.03)] flex flex-col p-[2vw] overflow-hidden">
               
               <SpecularGlare />

               {/* Terminal Header */}
               <div className="flex justify-between items-center mb-[1.5vw] border-b border-white/10 pb-[1vw]">
                 <div className="flex items-center gap-[1vw]">
                   <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-gradient-to-br from-teal-500/80 to-emerald-600/80 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                     <span className="text-[1.5vw]">🛡️</span>
                   </div>
                   <div>
                     <h2 className="text-[1.8vw] font-black tracking-tight text-white leading-none">Pusat Komando Kebajikan</h2>
                     <p className="text-[0.8vw] text-teal-400/60 tracking-widest font-mono uppercase mt-[0.2vw]">JPP Command / Fasiliti Kampus</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-[1vw]">
                   <div className="flex items-center gap-[0.5vw] px-[1vw] py-[0.5vw] bg-teal-500/10 rounded-full border border-teal-500/20">
                     <div className="w-[0.5vw] h-[0.5vw] bg-teal-400 rounded-full animate-pulse shadow-[0_0_10px_#2dd4bf]" />
                     <span className="text-[0.6vw] text-teal-300 font-bold tracking-widest uppercase">Live System</span>
                   </div>
                 </div>
               </div>
               
               {/* 3-Column Layout */}
               <div className="flex flex-1 gap-[1.5vw]">
                 
                 {/* Stats */}
                 <div className="flex flex-col gap-[1vw] w-[15vw]">
                    <div className="bg-white/5 border border-white/5 rounded-[1vw] p-[1.5vw]">
                      <p className="text-[0.8vw] text-white/50 uppercase tracking-wider mb-[0.2vw]">Aduan Aktif</p>
                      <p className="text-[3vw] font-black text-white leading-none">12</p>
                    </div>
                    <div className="bg-teal-500/10 border border-teal-500/10 rounded-[1vw] p-[1.5vw]">
                      <p className="text-[0.8vw] text-teal-300/70 uppercase tracking-wider mb-[0.2vw]">Selesai Harini</p>
                      <p className="text-[3vw] font-black text-teal-400 leading-none drop-shadow-[0_0_10px_rgba(45,212,191,0.4)]">45</p>
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/5 rounded-[1vw] p-[1.5vw] flex flex-col items-center justify-center">
                       <div className="text-[0.7vw] text-white/50 uppercase tracking-wider mb-[1vw]">Kadar Respon</div>
                       <div className="relative w-[7vw] h-[7vw] flex items-center justify-center">
                         <svg className="absolute inset-0 w-full h-full -rotate-90">
                           <circle cx="3.5vw" cy="3.5vw" r="3vw" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5vw" />
                           <motion.circle cx="3.5vw" cy="3.5vw" r="3vw" fill="none" stroke="#2dd4bf" strokeWidth="0.5vw" strokeDasharray="18.84vw" strokeDashoffset={act >=2 ? 0 : "18.84vw"} transition={{duration: 2, ease: "easeInOut"}} strokeLinecap="round" />
                         </svg>
                         <span className="text-[1.8vw] font-bold text-white">98%</span>
                       </div>
                    </div>
                 </div>

                 {/* Holographic Map */}
                 <div className="flex-1 relative bg-black/40 border border-white/10 rounded-[1vw] flex items-center justify-center overflow-hidden" style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}>
                    <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at center, ${gc}0d 0%, transparent 70%)` }} />
                    <div className="absolute bottom-[-5vw] w-[30vw] h-[10vw] rounded-full bg-teal-500/10 blur-[40px]" />

                    <motion.div 
                       animate={{ top: ['-10%', '110%'] }} 
                       transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                       className="absolute left-0 right-0 h-[1.5px] bg-teal-400/70 shadow-[0_0_15px_#2dd4bf] z-10"
                    />

                    {/* 3D Map Grid */}
                    <AnimatePresence>
                      {act >= 2 && (
                        <motion.div 
                          initial={{ opacity: 0, rotateX: 60, rotateZ: 45, scale: 0.6, y: '5vw' }}
                          animate={act >= 4 
                            ? { opacity: 1, rotateX: 52, rotateZ: 22, scale: 1.3, y: '2vw', x: '0vw' } 
                            : { opacity: 1, rotateX: 60, rotateZ: 45, scale: 0.9, y: 0 }
                          }
                          transition={{ duration: 1.5, type: 'spring', bounce: 0.1 }}
                          className="absolute w-[25vw] h-[25vw] border border-white/10"
                          style={{ 
                            transformStyle: 'preserve-3d',
                            backgroundImage: `linear-gradient(${gc}20 1px, transparent 1px), linear-gradient(90deg, ${gc}20 1px, transparent 1px)`, 
                            backgroundSize: '2.5vw 2.5vw',
                            boxShadow: act >= 4 ? `inset 0 0 50px rgba(239,68,68,0.2), 0 0 30px rgba(239,68,68,0.1)` : `inset 0 0 50px rgba(0,0,0,0.8), 0 0 30px ${gc}10`,
                            transition: 'box-shadow 0.5s'
                          }}
                        >
                           <div className="absolute top-[3vw] left-[14vw] w-[6vw] h-[8vw] border border-white/10 bg-white/5 flex items-center justify-center rounded-[0.5vw]">
                             <span className="text-[0.6vw] text-white/50 font-mono font-bold" style={{ transform: 'rotateZ(-45deg)' }}>BLOK A</span>
                           </div>
                           <div className="absolute top-[15vw] left-[4vw] w-[8vw] h-[6vw] border border-white/10 bg-white/5 flex items-center justify-center rounded-[0.5vw]">
                             <span className="text-[0.6vw] text-white/50 font-mono font-bold" style={{ transform: 'rotateZ(-45deg)' }}>BLOK B</span>
                           </div>
                           
                           {/* Target Pin */}
                           <div className={`absolute top-[10vw] left-[10vw] w-[5vw] h-[5vw] flex items-center justify-center rounded-[0.5vw] ${act >= 4 ? 'border border-red-500/40 bg-red-950/20' : 'border border-white/10 bg-white/5'}`} style={{ transition: 'all 0.5s', transformStyle: 'preserve-3d' }}>
                              {act >= 4 && (
                                <>
                                  <motion.div 
                                    initial={{ scale: 0, opacity: 1 }}
                                    animate={{ scale: [0, 4.5], opacity: [1, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                                    className="absolute w-[2vw] h-[2vw] rounded-full border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                  />
                                  <div className="w-[0.8vw] h-[0.8vw] bg-red-500 rounded-full shadow-[0_0_15px_red]" />
                                  
                                  <motion.div
                                    initial={{ z: 200, opacity: 0 }}
                                    animate={{ z: 0, opacity: 1 }}
                                    transition={{ type: 'spring', bounce: 0.5, duration: 1 }}
                                    className="absolute flex flex-col items-center"
                                    style={{ transform: 'translateZ(2vw) rotateX(-90deg) rotateY(-22deg)', transformOrigin: 'bottom center' }}
                                  >
                                    <div className="bg-red-950/80 text-red-300 font-bold px-[1vw] py-[0.4vw] rounded-[0.5vw] border border-red-500/50 shadow-[0_15px_30px_rgba(239,68,68,0.5)] backdrop-blur-md whitespace-nowrap text-[0.8vw] flex items-center gap-[0.4vw]">
                                      <span className="animate-pulse">🚨</span> ADUAN BARU
                                    </div>
                                    <div className="w-[1.5px] h-[4vw] bg-gradient-to-b from-red-500 to-transparent" />
                                  </motion.div>
                                </>
                              )}
                              {act < 4 && <span className="text-[0.6vw] text-white/40 font-mono font-bold" style={{ transform: 'rotateZ(-45deg)' }}>BLOK C</span>}
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>

                 {/* Comms Feed */}
                 <div className="w-[20vw] bg-white/5 border border-white/10 rounded-[1vw] p-[1.5vw] flex flex-col relative overflow-hidden">
                   <div className="flex items-center gap-[0.5vw] mb-[1.5vw] border-b border-white/10 pb-[1vw]">
                     <div className="w-[1vw] h-[1vw] rounded-full bg-teal-500/20 flex items-center justify-center"><div className="w-[0.4vw] h-[0.4vw] bg-teal-400 rounded-full animate-pulse" /></div>
                     <span className="text-[0.8vw] font-bold text-white tracking-widest uppercase">Live Comms Feed</span>
                   </div>

                   <div className="flex flex-col gap-[1vw] flex-1">
                     <AnimatePresence>
                       {act >= 4 && (
                         <motion.div initial={{ opacity:0, x: 20 }} animate={{ opacity:1, x: 0 }} transition={spS(0)} className="bg-white/5 border border-white/10 rounded-[0.8vw] p-[1vw]">
                           <div className="flex items-center gap-[0.5vw] mb-[0.4vw]">
                             <span className="text-[0.6vw] font-bold text-red-400 uppercase tracking-wider">Pelajar (Blok C)</span>
                           </div>
                           <p className="text-[0.75vw] text-white/80">Bumbung bocor teruk di Bilik 204! Air menitis laju ke atas katil. Mohon bantuan segera! 😭</p>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     <AnimatePresence>
                       {act >= 5 && (
                         <motion.div initial={{ opacity:0, x: -20 }} animate={{ opacity:1, x: 0 }} transition={spS(0)} className="bg-teal-500/10 border border-teal-500/20 rounded-[0.8vw] p-[1vw] self-end w-[90%]">
                           <div className="flex items-center justify-end gap-[0.5vw] mb-[0.4vw]">
                             <span className="text-[0.6vw] font-bold text-teal-400 uppercase tracking-wider">Resolusi Exco</span>
                           </div>
                           <p className="text-[0.75vw] text-teal-100 text-right">Makluman diterima. Penyelenggaraan dlm perjalanan ke lokasi. 🛠️⚡</p>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     <AnimatePresence>
                       {act >= 6 && (
                         <motion.div initial={{ opacity:0, x: 20 }} animate={{ opacity:1, x: 0 }} transition={spS(0)} className="bg-emerald-500/10 border border-emerald-500/20 rounded-[0.8vw] p-[1vw]">
                           <p className="text-[0.75vw] text-emerald-100 font-medium">Terima kasih atas respon aduan pantas JPP! Terbaik! 🔥</p>
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

      <ModuleOverlay show={act>=7} num="Modul 04" name="E-Kebajikan" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=6} message="Sistem Pemetaan Resolusi Aduan mempercepatkan tindakan penyelesaian fasiliti." />
    </CinematicEnvelope>
  );
}

// ─── Scene 02: E-Keusahawanan ────────────────────────────────────────────────
function KeusahawananScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),
      setTimeout(() => setAct(2), 2000),
      setTimeout(() => setAct(3), 3500),
      setTimeout(() => setAct(4), 5000),
      setTimeout(() => setAct(5), 7000),
      setTimeout(() => setAct(6), 8500),
      setTimeout(() => setAct(7), 9500),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (act < 3) return;
    let cur = 0; const target = 18450;
    const iv = setInterval(() => { 
      cur += 750; setRev(Math.min(cur, target)); 
      if (cur >= target) clearInterval(iv); 
    }, 40);
    return () => clearInterval(iv);
  }, [act]);

  const gc = mod.gc;
  
  return (
    <CinematicEnvelope gc={gc}>
      <AnimatePresence>
        {act >= 1 && (
          <motion.div 
            initial={{ scale: 0.85, opacity: 0, rotateX: 20, y: 50 }}
            animate={
              act >= 2 
                ? { scale: 1, opacity: 1, rotateX: 6, rotateY: -8, y: 0 } 
                : { scale: 0.95, opacity: 1, rotateX: 0, rotateY: 0, y: 0 }
            }
            transition={{ type: 'spring', bounce: 0.15, duration: 1.5 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ perspective: '2000px', transformStyle: 'preserve-3d' }}
          >
            <div className="w-[75vw] h-[42vw] relative flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
              
              {/* Peripheral Panels (Left) */}
              <div className="absolute left-0 top-[2vw] bottom-[2vw] w-[22vw] flex flex-col justify-between" style={{ transformStyle: 'preserve-3d' }}>
                 
                 {/* Top Left */}
                 <AnimatePresence>
                   {act >= 2 && (
                     <motion.div
                       initial={{ opacity: 0, x: -50, rotateY: 20 }}
                       animate={{ opacity: 1, x: 0, rotateY: 10, y: ['-0.5vw', '0.5vw'] }}
                       transition={{ opacity: { duration: 0.8 }, x: { type: 'spring', bounce: 0.3 }, y: { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } }}
                       className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-[1.5vw] p-[1.5vw] shadow-[0_20px_40px_rgba(34,197,94,0.1)] relative"
                     >
                       <SpecularGlare />
                       <p className="text-[0.7vw] text-green-400/80 tracking-widest uppercase mb-[1vw] font-bold">Produk Terlaris Hari Ini</p>
                       <div className="flex gap-[1vw] items-center">
                         <div className="w-[4.5vw] h-[4.5vw] bg-white/5 border border-white/10 rounded-[0.8vw] flex items-center justify-center">
                           <span className="text-[2vw]">👕</span>
                         </div>
                         <div>
                           <p className="text-[0.9vw] font-bold text-white leading-tight">Kemeja Korporat JPP</p>
                           <p className="text-[1.3vw] font-black text-green-400 mt-[0.2vw]">245 Unit</p>
                         </div>
                       </div>
                       <div className="absolute top-1/2 -right-[15vw] w-[15vw] h-[1px] bg-gradient-to-r from-green-500/40 to-transparent" />
                     </motion.div>
                   )}
                 </AnimatePresence>

                 {/* Bottom Left */}
                 <AnimatePresence>
                   {act >= 3 && (
                     <motion.div
                       initial={{ opacity: 0, x: -50, rotateY: 20 }}
                       animate={{ opacity: 1, x: 0, rotateY: 10, y: ['0.5vw', '-0.5vw'] }}
                       transition={{ opacity: { duration: 0.8 }, x: { type: 'spring', bounce: 0.3 }, y: { duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } }}
                       className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-[1.5vw] p-[1.5vw] shadow-[0_20px_40px_rgba(34,197,94,0.1)] overflow-hidden relative"
                     >
                       <SpecularGlare />
                       <p className="text-[0.7vw] text-green-400/80 tracking-widest uppercase mb-[1vw] font-bold">Feed Aliran Tunai</p>
                       <div className="flex flex-col gap-[0.6vw]">
                         {[
                           { k: 'Kiosk Siswa A', v: '+RM 12.50' },
                           { k: 'Kiosk Siswa C', v: '+RM 4.00' },
                           { k: 'Kiosk Siswa B', v: '+RM 25.00' }
                         ].map((item, i)=>(
                           <motion.div key={i} initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: i * 0.15}} className="flex justify-between items-center bg-white/5 p-[0.6vw] rounded-[0.5vw] border border-white/5">
                             <span className="text-[0.8vw] text-white/70">{item.k}</span><span className="text-[0.9vw] font-bold text-green-400">{item.v}</span>
                           </motion.div>
                         ))}
                       </div>
                       <div className="absolute top-1/2 -right-[15vw] w-[15vw] h-[1px] bg-gradient-to-r from-green-500/40 to-transparent" />
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>

              {/* Main Dashboard (Right) */}
              <motion.div
                animate={
                  act >= 2 
                    ? { z: 120, x: '8vw', rotateX: 3, rotateY: -3 } 
                    : { z: 0, x: '8vw', rotateX: 0, rotateY: 0 }
                }
                transition={{ type: 'spring', bounce: 0.2, duration: 2 }}
                className="absolute top-[2vw] right-0 w-[45vw] h-[39vw] bg-black/35 backdrop-blur-2xl border border-white/10 rounded-[2vw] shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(255,255,255,0.02)] p-[2.5vw] flex flex-col"
              >
                <SpecularGlare />
                <div className="flex justify-between items-start mb-[1.5vw]">
                  <div>
                    <h2 className="text-[2vw] font-black text-white tracking-widest uppercase leading-tight drop-shadow-[0_0_10px_rgba(34,197,94,0.2)]">E-Keusahawanan</h2>
                    <p className="text-[0.8vw] text-green-400 tracking-[0.3em] uppercase mt-[0.3vw]">Hab Data Jualan & Unjuran</p>
                  </div>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="w-[3.5vw] h-[3.5vw] rounded-full border border-green-500/30 flex items-center justify-center bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.25)]">
                    <span className="text-[1.4vw]">📈</span>
                  </motion.div>
                </div>
                
                <div className="flex gap-[2vw] mb-[1.5vw]">
                  <div className="bg-white/5 p-[1.2vw] rounded-[1vw] border border-white/5 flex-1">
                    <p className="text-[0.8vw] text-green-400/60 uppercase tracking-wider mb-[0.3vw]">Kutipan Kasar</p>
                    <p className="text-[2.6vw] font-black text-white leading-none font-mono">RM {rev.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 p-[1.2vw] rounded-[1vw] border border-white/5 flex-1">
                    <p className="text-[0.8vw] text-green-400/60 uppercase tracking-wider mb-[0.3vw]">Transaksi Aktif</p>
                    <p className="text-[2.6vw] font-black text-white leading-none font-mono">1,204</p>
                  </div>
                </div>

                {/* SVG Graph */}
                <div className="flex-1 bg-black/40 border border-white/10 rounded-[1.5vw] p-[1.8vw] relative overflow-hidden flex flex-col">
                  <p className="text-[0.9vw] text-white/60 tracking-widest uppercase mb-[1vw] flex items-center justify-between">
                    <span>Graf Unjuran Kewangan</span>
                    <span className="flex gap-2 items-center">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[0.6vw] text-green-500 font-bold">LIVE</span>
                    </span>
                  </p>
                  <div className="flex-1 relative border-l border-b border-white/10">
                    {act >= 3 && (
                      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full overflow-visible drop-shadow-[0_10px_10px_rgba(34,197,94,0.3)] z-10 relative">
                        <defs>
                          <linearGradient id="chartGrad1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={gc} stopOpacity="0.5" />
                            <stop offset="100%" stopColor={gc} stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        
                        <motion.path 
                          d="M0,50 L0,35 Q20,40 40,25 T80,20 L100,15 L100,50 Z" 
                          fill="url(#chartGrad2)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1.5 }}
                        />
                        <motion.path 
                          d="M0,35 Q20,40 40,25 T80,20 L100,15" 
                          fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 2"
                          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2 }}
                        />

                        <motion.path 
                          d="M0,50 L0,45 Q20,40 40,30 T80,10 L100,5 L100,50 Z" 
                          fill="url(#chartGrad1)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
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
                        <motion.circle 
                          cx="100" cy="5" r="1.5" fill="#fff" 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 2, duration: 0.5 }}
                        />
                      </svg>
                    )}

                    <motion.div 
                      initial={{x: '-100%'}}
                      animate={{x: '200%'}}
                      transition={{duration: 4, repeat: Infinity, ease: 'linear'}}
                      className="absolute inset-y-0 w-[4vw] bg-gradient-to-r from-transparent via-green-400/10 to-transparent skew-x-[-20deg]"
                    />

                    <div className="absolute inset-0 flex flex-col justify-between opacity-5 pointer-events-none">
                      <div className="w-full border-t border-white" /><div className="w-full border-t border-white" /><div className="w-full border-t border-white" /><div className="w-full border-t border-white" />
                    </div>

                    <AnimatePresence>
                      {act >= 4 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ type: "spring", bounce: 0.4 }}
                          className="absolute top-[10%] right-[15%] bg-green-500/10 backdrop-blur-xl border border-green-500/30 p-[1vw] rounded-[1vw] shadow-[0_20px_40px_rgba(34,197,94,0.2)] z-20"
                        >
                          <p className="text-[0.7vw] text-green-300 uppercase tracking-widest font-bold mb-[0.2vw]">Margin Untung Kasar</p>
                          <div className="flex items-center gap-[0.5vw]">
                            <p className="text-[2.2vw] font-black text-white leading-none font-mono">+24%</p>
                            <span className="text-[1.5vw] animate-bounce">🚀</span>
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

      <AnimatePresence>
        {act === 6 && (
          <motion.div key="res-flash" initial={{opacity:0, scale:0}} animate={{opacity:[0,0.8,0], scale:[0.5, 3, 5]}} exit={{opacity:0}}
            transition={{duration:1, ease:"easeOut"}} className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="w-[20vw] h-[20vw] bg-green-400 rounded-full blur-[100px] mix-blend-screen" />
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=7} num="Modul 05" name="E-Keusahawanan" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=6} message="Sistem POS Digital merekod setiap transaksi masa nyata untuk analisis JPP." />
    </CinematicEnvelope>
  );
}

// ─── Scene 03: E-Akademik ────────────────────────────────────────────────────
function AkademikScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [merit, setMerit] = useState(40);
  const [cgpa, setCgpa] = useState(0);
  const gc = mod.gc;
  const gold = '#fbbf24';

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // QR code
      setTimeout(() => setAct(2), 1800),  // Phone scanner
      setTimeout(() => setAct(3), 3000),  // Laser sweep
      setTimeout(() => setAct(4), 4500),  // Scan success
      setTimeout(() => setAct(5), 5200),  // Merit tick
      setTimeout(() => setAct(6), 7200),  // Zoom out, dashboard
      setTimeout(() => setAct(7), 8800),  // Resolution flash
      setTimeout(() => setAct(8), 9800),  // Module overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (act < 5) return;
    let cur = 40; const target = 45;
    const iv = setInterval(() => { 
      cur += 1; setMerit(cur); 
      if (cur >= target) clearInterval(iv); 
    }, 120);
    return () => clearInterval(iv);
  }, [act]);

  useEffect(() => {
    if (act < 6) return;
    let cur = 0; const target = 3.84;
    const iv = setInterval(() => { 
      cur = Math.min(cur + 0.16, target); setCgpa(parseFloat(cur.toFixed(2))); 
      if (cur >= target) clearInterval(iv); 
    }, 40);
    return () => clearInterval(iv);
  }, [act]);

  const qrGrid = useMemo(() => Array.from({ length: 49 }, () => Math.random() > 0.45), []);

  return (
    <CinematicEnvelope gc={gc}>
      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none" style={{ perspective: '2000px', transformStyle: 'preserve-3d' }}>
        
        <motion.div
          animate={
            act >= 6 
              ? { scale: 0.85, rotateY: 12, rotateX: 6, x: '-2vw', y: '1vw' } 
              : act >= 4
              ? { scale: 1.05, rotateY: -10, rotateX: -5, x: '-8vw' } 
              : { scale: 1, rotateY: 0, rotateX: 0, x: 0 } 
          }
          transition={{ duration: 2.2, ease: SE }}
          className="relative flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >

          {/* QR Code */}
          <AnimatePresence>
            {act >= 1 && (
              <motion.div 
                initial={{ scale: 0, opacity: 0, rotateY: 90 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 1.8 }}
                className="relative w-[18vw] h-[18vw] bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_80px_rgba(59,130,246,0.2)] rounded-[1.2vw] overflow-hidden flex items-center justify-center p-[1.8vw]"
                style={{ 
                  borderColor: act >= 4 ? gold : `${gc}44`,
                  boxShadow: act >= 4 ? `0 0 80px ${gold}40` : `0 0 60px ${gc}20`,
                  transformStyle: 'preserve-3d',
                  transition: 'border-color 0.5s, box-shadow 0.5s'
                }}
              >
                <div className="grid grid-cols-7 grid-rows-7 gap-[0.2vw] w-full h-full">
                  {qrGrid.map((isActive, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0.08, scale: 0.5 }}
                      transition={{ delay: 0.8 + Math.random() * 0.4, duration: 0.4 }}
                      className={`rounded-[0.1vw] ${act >= 4 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                      style={{ transition: 'background-color 0.5s' }}
                    />
                  ))}
                </div>

                <div className={`absolute top-[1vw] left-[1vw] w-[1.5vw] h-[1.5vw] border-t-2 border-l-2 rounded-tl-[0.3vw] ${act >= 4 ? 'border-yellow-400' : 'border-emerald-400'}`} style={{ transition: 'border-color 0.5s' }} />
                <div className={`absolute top-[1vw] right-[1vw] w-[1.5vw] h-[1.5vw] border-t-2 border-r-2 rounded-tr-[0.3vw] ${act >= 4 ? 'border-yellow-400' : 'border-emerald-400'}`} style={{ transition: 'border-color 0.5s' }} />
                <div className={`absolute bottom-[1vw] left-[1vw] w-[1.5vw] h-[1.5vw] border-b-2 border-l-2 rounded-bl-[0.3vw] ${act >= 4 ? 'border-yellow-400' : 'border-emerald-400'}`} style={{ transition: 'border-color 0.5s' }} />
                <div className={`absolute bottom-[1vw] right-[1vw] w-[1.5vw] h-[1.5vw] border-b-2 border-r-2 rounded-br-[0.3vw] ${act >= 4 ? 'border-yellow-400' : 'border-emerald-400'}`} style={{ transition: 'border-color 0.5s' }} />

                {act >= 3 && act < 5 && (
                  <motion.div 
                    initial={{ top: '-10%', opacity: 0 }}
                    animate={{ top: '110%', opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.2, ease: 'linear' }}
                    className="absolute left-0 right-0 h-[0.8vw] bg-white mix-blend-screen shadow-[0_0_20px_#fff,0_0_40px_#10b981]"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanner Phone */}
          <AnimatePresence>
            {act >= 2 && act < 6 && (
              <motion.div
                initial={{ x: '25vw', y: '8vw', z: 120, rotateY: -45, rotateZ: -15, opacity: 0 }}
                animate={
                  act >= 4 
                    ? { x: '3vw', y: '12vw', z: 120, rotateY: -20, rotateZ: -5, opacity: 0 } 
                    : { x: '8vw', y: '4vw', z: 120, rotateY: -25, rotateZ: -10, opacity: 1 }
                }
                transition={{ duration: 1.2, type: 'spring' }}
                className="absolute w-[11vw] h-[22vw] rounded-[1.8vw] border-2 border-white/20 bg-black/85 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-40 overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="absolute inset-0 flex flex-col items-center p-[0.8vw]">
                  <div className="w-[3.5vw] h-[0.4vw] bg-white/20 rounded-full mt-[0.3vw] mb-[1.5vw]" />
                  <div className="w-[7vw] h-[7vw] border border-white/20 rounded-[0.8vw] flex items-center justify-center relative">
                    <div className="w-[0.8vw] h-[0.8vw] border-t border-l border-emerald-400 absolute top-[0.4vw] left-[0.4vw]" />
                    <div className="w-[0.8vw] h-[0.8vw] border-b border-r border-emerald-400 absolute bottom-[0.4vw] right-[0.4vw]" />
                    <p className="text-[0.6vw] text-emerald-400 font-mono animate-pulse">
                      {act >= 3 ? 'SCANNING...' : 'CAMERA'}
                    </p>
                  </div>
                  <p className="text-[0.7vw] font-bold text-white mt-[1vw]">PolyScan AR</p>
                  <p className="text-[0.55vw] text-white/40 text-center mt-[0.2vw]">Halakan kamera ke QR kod merit</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Merit Wallet */}
          <AnimatePresence>
            {act >= 4 && act < 6 && (
              <motion.div
                initial={{ x: '20vw', y: '5vw', opacity: 0, scale: 0.8 }}
                animate={{ x: '16vw', y: 0, opacity: 1, scale: 1 }}
                exit={{ x: '10vw', opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="absolute w-[15vw] bg-gradient-to-br from-yellow-500/10 to-amber-500/25 border border-yellow-500/30 p-[1.5vw] rounded-[1vw] shadow-[0_30px_60px_rgba(251,191,36,0.15)] z-40 backdrop-blur-2xl flex flex-col items-center"
              >
                <motion.span animate={{ scale: [1, 1.2, 1] }} className="text-[3vw] mb-[0.5vw]">💳</motion.span>
                <p className="text-[0.75vw] text-yellow-300 uppercase tracking-widest font-bold">Merit Terkumpul</p>
                <motion.p key={merit} initial={{ scale: 1.3, color: '#f59e0b' }} animate={{ scale: 1, color: '#fff' }} className="text-[3.5vw] font-black leading-none font-mono mt-[0.5vw]">
                  {merit}
                </motion.p>
                <p className="text-[0.55vw] text-white/50 mt-[0.5vw] uppercase tracking-wider">Mata Merit Digital</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Particles */}
          <AnimatePresence>
            {act === 5 && (
              <motion.div className="absolute left-[16vw] top-[-5vw] z-[45] pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div key={i} className="absolute text-[1.5vw]"
                    initial={{ x: 0, y: 50, scale: 0, opacity: 1 }}
                    animate={{ x: (Math.random() - 0.5) * 80, y: -100 - Math.random() * 50, scale: Math.random() * 0.8 + 0.5, opacity: 0 }}
                    transition={{ duration: 1.2, delay: i * 0.08 }}
                  >⭐</motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full Dashboard */}
          <AnimatePresence>
            {act >= 6 && (
              <>
                {/* CGPA circular progress */}
                <motion.div
                  initial={{ opacity: 0, x: '-10vw', y: '10vw', rotateY: 45, scale: 0.5 }}
                  animate={{ opacity: 1, x: '-22vw', y: '-2vw', rotateY: 10, scale: 1.1 }}
                  transition={{ type: 'spring', bounce: 0.35, delay: 0.1 }}
                  className="absolute bg-black/35 backdrop-blur-xl border border-white/10 rounded-[1.5vw] p-[2vw] flex flex-col items-center z-20 shadow-[0_20px_50px_rgba(59,130,246,0.15)]"
                >
                  <SpecularGlare />
                  <p className="text-[1vw] text-blue-300 uppercase tracking-widest font-bold mb-[1.5vw]">Tracker HPNM</p>
                  
                  <div className="relative w-[11vw] h-[11vw] flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="50%" cy="50%" r="44%" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8vw" fill="none" />
                      <motion.circle 
                        cx="50%" cy="50%" r="44%" 
                        stroke="#3b82f6" strokeWidth="0.8vw" fill="none" 
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "0 1000" }}
                        animate={{ strokeDasharray: `${(cgpa / 4.0) * 280} 1000` }}
                        transition={{ duration: 1.8, ease: "easeOut" }}
                        style={{ filter: 'drop-shadow(0 0 10px rgba(59,130,246,0.5))' }}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <p className="text-[2.6vw] font-black text-white leading-none font-mono">{cgpa.toFixed(2)}</p>
                      <p className="text-[0.75vw] text-blue-200 mt-[0.2vw]">/ 4.00</p>
                    </div>
                  </div>
                </motion.div>

                {/* Vault */}
                <motion.div
                  initial={{ opacity: 0, x: '30vw', y: '0vw', rotateY: 30, scale: 0.5 }}
                  animate={{ opacity: 1, x: '24vw', y: '10vw', rotateY: -10, scale: 1.1 }}
                  transition={{ type: 'spring', bounce: 0.35, delay: 0.2 }}
                  className="absolute bg-black/35 backdrop-blur-xl border border-white/10 rounded-[1.5vw] p-[1.5vw] flex flex-col w-[20vw] z-20 shadow-[0_20px_50px_rgba(99,102,241,0.15)]"
                >
                  <SpecularGlare />
                  <div className="flex items-center gap-[1vw] mb-[1.2vw] border-b border-white/10 pb-[0.8vw]">
                    <div className="w-[2.5vw] h-[2.5vw] bg-indigo-500/10 rounded-[0.5vw] flex items-center justify-center border border-indigo-400/30">
                      <span className="text-[1.2vw]">🔐</span>
                    </div>
                    <div>
                      <p className="text-[0.9vw] text-white font-bold leading-tight">Private Vault</p>
                      <p className="text-[0.65vw] text-indigo-300 font-mono">End-to-End Encrypted</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-[0.6vw]">
                    {['Slip Peperiksaan S4', 'Transkrip S3', 'Surat Tawaran'].map((doc, i) => (
                      <div key={i} className="flex items-center gap-[0.8vw] p-[0.6vw] bg-white/5 rounded-[0.5vw] border border-white/5">
                        <div className="w-[1.5vw] h-[1.5vw] bg-indigo-500/20 border border-indigo-500/30 rounded-sm flex items-center justify-center"><span className="text-[0.8vw] text-white">📄</span></div>
                        <p className="text-[0.75vw] text-white/80 font-mono">{doc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Log */}
                <motion.div
                  initial={{ opacity: 0, x: '-10vw', y: '15vw', rotateY: 30, scale: 0.5 }}
                  animate={{ opacity: 1, x: '-16vw', y: '16vw', rotateY: 8, scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.35, delay: 0.3 }}
                  className="absolute bg-black/50 backdrop-blur-xl border border-white/10 rounded-[1vw] p-[1.5vw] flex flex-col w-[21vw] z-20"
                >
                  <p className="text-[0.8vw] text-white/50 uppercase tracking-widest font-bold mb-[0.8vw]">Log Sistem</p>
                  <div className="flex flex-col gap-[0.6vw]">
                    {[
                      { t: '10:42 AM', m: 'Merit ditambah (+5)', c: 'text-yellow-400' },
                      { t: '09:15 AM', m: 'Kehadiran K-KEM 101 Direkod', c: 'text-green-400' },
                      { t: 'Semalam', m: 'Transkrip S3 dimuat turun', c: 'text-blue-400' },
                    ].map((log, i) => (
                      <div key={i} className="flex items-center gap-[0.8vw] border-b border-white/5 pb-[0.4vw] last:border-0">
                        <p className="text-[0.7vw] text-white/30 font-mono">{log.t}</p>
                        <div className={`w-[0.35vw] h-[0.35vw] rounded-full ${log.c.replace('text-', 'bg-')}`} />
                        <p className={`text-[0.75vw] ${log.c} font-mono flex-1`}>{log.m}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </motion.div>
      </div>

      <ModuleOverlay show={act>=8} num="Modul 06" name="E-Akademik" tagline={mod.tagline} gc={gc} pos="bottom-[8%] left-[4%]" />
      <FloatAiChip show={act>=8} message="Sistem E-Akademik menawarkan integrasi rekod holistik dan bilik kebal peribadi pelajar." />
    </CinematicEnvelope>
  );
}

// ─── Scene 04: PolyMart ──────────────────────────────────────────────────────
function PolyMartScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [cart, setCart] = useState(0);

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),
      setTimeout(() => setAct(2), 1500),
      setTimeout(() => setAct(3), 2500),
      setTimeout(() => setAct(4), 3500),
      setTimeout(() => { setAct(5); setCart(1); }, 5000),
      setTimeout(() => setAct(6), 7500),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  const gc = mod.gc;
  
  const cats = [
    { name: 'Semua', emoji: '📄' }, { name: 'Makanan', emoji: '🍔' }, 
    { name: 'Minuman', emoji: '🥤' }, { name: 'Aksesori', emoji: '💎' }, 
    { name: 'Pakaian', emoji: '👕' }, { name: 'Elektronik', emoji: '📱' }
  ];

  return (
    <CinematicEnvelope gc={gc}>
      <ExplodingParticles active={cart>0} emoji="🛒" count={40} />

      <motion.div 
        className="absolute inset-[3%] rounded-[1.8vw] overflow-hidden border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.95)]" 
        style={{background:'#0a0a0a', transformStyle:'preserve-3d'}}
        initial={{ scale: 2.2, filter: 'blur(20px)', opacity: 0, rotateY: 15, y: -50 }} 
        animate={
          act >= 1 
            ? { scale: 1, filter: 'blur(0px)', opacity: 1, rotateY: act>=5 ? [0,1,-1,0] : [-1,1,-1], rotateX: act>=5 ? 0 : [1,0,1], y: 0 } 
            : {}
        } 
        transition={
          act === 1 
            ? { scale: { type: 'spring', stiffness: 220, damping: 18 }, opacity: { duration: 0.2 }, y: { type: 'spring', stiffness: 220, damping: 18 } }
            : { rotateY: { duration: 10, repeat: Infinity, ease: 'easeInOut' }, rotateX: { duration: 8, repeat: Infinity, ease: 'easeInOut' } }
        }
      >
        <SpecularGlare />

        {/* Navbar */}
        <div className="flex items-center gap-[2vw] px-[2vw] py-[1.2vw] border-b border-white/5 bg-[#0d0d0d] relative z-20">
          <div className="flex items-center gap-[0.8vw]">
            <span className="text-white/40">←</span>
            <motion.div 
              animate={{ rotateZ: act >= 5 ? [0, 360] : 0 }} 
              transition={{ duration: 0.5 }}
              className="w-[2.2vw] h-[2.2vw] rounded-[0.5vw] flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
              style={{background:gc}}
            >
              <span className="text-[1vw]">🛍️</span>
            </motion.div>
            <div>
              <p className="text-[0.9vw] font-black text-white leading-none tracking-tighter">POLYMART</p>
              <p className="text-[0.55vw] text-amber-500 tracking-[0.2em] font-bold">MARKETPLACE</p>
            </div>
          </div>

          <div className="flex-1 h-[2.2vw] rounded-[0.5vw] flex items-center px-[1vw] gap-[0.5vw] bg-[#141414] border border-white/5">
            <span className="text-[0.8vw] text-white/30">🔍</span>
            <span className="text-[0.75vw] text-white/30">Cari barangan kampus...</span>
          </div>

          <div className="flex items-center gap-[1vw] text-white/40 text-[1.1vw]">
            <span>📦</span>
            <span>⊞</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-[0.6vw] px-[2vw] py-[0.8vw] bg-[#0d0d0d] overflow-hidden relative z-10">
          {cats.map((c, i) => (
            <motion.div 
              key={c.name} 
              initial={{ x: 80, opacity: 0 }} 
              animate={act >= 2 ? { x: 0, opacity: 1 } : {}} 
              transition={{ delay: i * 0.05, type: 'spring', bounce: 0.3 }}
              className={`flex items-center gap-[0.4vw] px-[1vw] py-[0.45vw] rounded-[0.5vw] text-[0.75vw] whitespace-nowrap cursor-pointer transition-colors duration-300 ${i===0 ? 'bg-[#f59e0b20] border border-[#f59e0b40] text-[#f59e0b]' : 'bg-[#141414] border border-white/5 text-white/60'}`}
            >
              <span>{c.emoji}</span> <span className="font-bold uppercase tracking-wider">{c.name}</span>
            </motion.div>
          ))}
        </div>

        <div className="px-[2vw] py-[1vw] overflow-y-auto h-[calc(100%-7vw)] hide-scrollbar pb-[10vw]">
          
          {/* Banner */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateX: 10 }} 
            animate={act >= 2 ? { opacity: 1, scale: 1, rotateX: 0 } : {}} 
            transition={{ type: 'spring', bounce: 0.4, delay: 0.2 }}
            className="w-full rounded-[1vw] p-[2.5vw] relative overflow-hidden flex justify-between items-center bg-[#111] border border-amber-500/25"
          >
            {/* Background Marquee */}
            <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none flex flex-col justify-center rotate-[-4deg] scale-110">
              <motion.div animate={{ x: ['0%', '-50%'] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} className="whitespace-nowrap">
                {Array(6).fill('🔥 LIMITED DROP 🔥 NEW ARRIVALS 🔥 ').map((t, i) => (
                  <span key={i} className="text-[4vw] font-black text-amber-500 uppercase tracking-tighter px-[1vw]">{t}</span>
                ))}
              </motion.div>
            </div>

            <div className="relative z-10 w-[55%]">
              <div className="flex items-center gap-[0.5vw] mb-[0.6vw]">
                <div className="px-[0.6vw] py-[0.2vw] bg-amber-500 text-black font-black text-[0.6vw] uppercase tracking-widest rounded-sm">HYPE DROP</div>
                <p className="text-[0.6vw] font-bold text-white uppercase tracking-widest">POLYMART BETA</p>
              </div>
              <h1 className="text-[3vw] font-black text-white leading-[0.95] tracking-tighter uppercase">Jelajah</h1>
              <h1 className="text-[3vw] font-black text-amber-500 leading-[0.95] tracking-tighter uppercase mb-[0.6vw]" style={{ textShadow: `0 0 30px ${gc}30` }}>Kampus</h1>
              <p className="text-[0.8vw] text-white/70 mb-[1.5vw] border-l-2 border-amber-500 pl-[0.8vw]">Tempah produk eksklusif dari peniaga berdaftar JPP. Siapa cepat dia dapat.</p>

              <div className="flex gap-[0.8vw]">
                <div className="px-[1.2vw] py-[0.6vw] bg-white text-black font-black text-[0.8vw] uppercase tracking-wider rounded-sm cursor-pointer hover:bg-amber-500 transition-colors">Beli Sekarang</div>
                <div className="px-[1.2vw] py-[0.6vw] border border-white text-white font-black text-[0.8vw] uppercase tracking-wider rounded-sm cursor-pointer hover:bg-white hover:text-black transition-colors">Koleksi</div>
              </div>
            </div>

            {/* Sneaker */}
            <motion.div 
              animate={{ y: [-10, 10, -10], rotateZ: [-5, 5, -5] }} 
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10 w-[16vw] h-[16vw] flex items-center justify-center filter drop-shadow-[0_20px_30px_rgba(245,158,11,0.4)]"
            >
              <span className="text-[10vw] leading-none">👟</span>
            </motion.div>
          </motion.div>

          {/* Vendors */}
          <div className="mt-[2vw]">
            <h2 className="text-[1.2vw] font-black text-white uppercase tracking-tighter mb-[1vw]">Peniaga Pilihan 🔥</h2>
            <div className="flex gap-[1.5vw]">
              {['SUPREME BITE', 'AGROSEA HYPE'].map((name, i) => (
                <motion.div 
                  key={name}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={act >= 3 ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: 'spring', bounce: 0.4, delay: 0.4 + i*0.1 }}
                  className="flex items-center gap-[0.6vw] bg-white/5 border border-white/5 px-[1vw] py-[0.5vw] rounded-[1vw] cursor-pointer"
                >
                  <div className="w-[3vw] h-[3vw] rounded-[0.6vw] bg-amber-500/10 flex items-center justify-center text-[1.5vw]">🏪</div>
                  <p className="text-[0.75vw] font-bold text-white tracking-wider">{name}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="mt-[2.5vw]">
            <h2 className="text-[1.2vw] font-black text-white uppercase tracking-tighter mb-[1.2vw]">Drops Terkini</h2>
            <div className="grid grid-cols-4 gap-[1.2vw]">
              {[1, 2, 3, 4].map((p, i) => (
                <motion.div 
                  key={i}
                  initial={{ scale: 1.5, opacity: 0, filter: 'blur(15px)' }}
                  animate={act >= 4 ? { scale: 1, opacity: 1, filter: 'blur(0px)' } : {}}
                  transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.5 + i*0.1 }}
                  className="bg-[#111] border border-white/10 rounded-[1.2vw] aspect-[3/4] p-[1.2vw] relative flex flex-col justify-between overflow-hidden cursor-pointer hover:border-amber-500 transition-colors"
                >
                  <div className="flex justify-between items-start z-10">
                    {i === 0 ? <span className="bg-red-600 text-white text-[0.55vw] font-bold uppercase tracking-widest px-[0.6vw] py-[0.2vw] rounded-sm animate-pulse">Hampir Habis</span> : <span/>}
                    <span className="text-white text-[0.6vw] font-bold uppercase tracking-widest bg-white/15 px-[0.5vw] py-[0.15vw] rounded-sm backdrop-blur-md">Pakaian</span>
                  </div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.25, rotate: -8 }}
                    className="absolute inset-0 flex items-center justify-center text-[5.5vw] drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)]"
                  >
                    👕
                  </motion.div>
                  
                  <div className="relative z-10 flex flex-col items-center mt-auto">
                     <p className="text-[0.9vw] font-black text-white uppercase tracking-tighter mb-[0.1vw]">Hoodie JPP V2</p>
                     <p className="text-[0.85vw] font-bold text-amber-500">RM 85</p>
                  </div>

                  {i === 0 && act >= 5 && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }} 
                      animate={{ scale: [0, 1.8, 1], opacity: [0, 1, 0] }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 flex items-center justify-center bg-amber-500/40 z-20 backdrop-blur-sm"
                    >
                      <span className="text-[4vw]">🛒🔥</span>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </motion.div>

      <ModuleOverlay show={act>=6} num="Modul 07" name="PolyMart" tagline={mod.tagline} gc={gc} pos="bottom-[8%] right-[4%]" />
      <FloatAiChip show={act>=5} message="Sistem pasaran kampus berprestasi tinggi. Terus beli tanpa tunggu!" pos="top-[10%] right-[4%]" />
    </CinematicEnvelope>
  );
}

// ─── Scene 05: Sistem Kelab ──────────────────────────────────────────────────
function KelabScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const fire = '#dc2626';

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),
      setTimeout(() => setAct(2), 2200),
      setTimeout(() => setAct(3), 4200),
      setTimeout(() => setAct(4), 5800),
      setTimeout(() => setAct(5), 7200),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  const nodes = [
    { x: '9vw', y: '4vw', z: '6vw', label: 'Kelab Kembara', stat: 'A+' },
    { x: '-7vw', y: '-9vw', z: '4vw', label: 'E-Sports', stat: 'Elit' },
    { x: '10vw', y: '-10vw', z: '-8vw', label: 'Seni Silat', stat: 'Aktif' },
    { x: '-13vw', y: '6vw', z: '-4vw', label: 'Inovasi', stat: 'Pro' },
  ];

  return (
    <CinematicEnvelope gc={fire}>
      <motion.div 
        animate={act >= 4 ? { scale: 0.9, rotateY: -15, rotateX: 4, y: 0, x: '4vw' } : { scale: 1.05, rotateY: 0, rotateX: 0, y: 0 }}
        transition={{ duration: 2.2, ease: SE }}
        className="absolute inset-0 flex items-center justify-center overflow-hidden" 
        style={{ perspective: '2000px', transformStyle: 'preserve-3d' }}
      >
        
        {/* Globe Core */}
        <AnimatePresence>
          {act >= 1 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0, rotateY: 90 }} 
              animate={{ opacity: 1, scale: 1, rotateY: [-15, 15, -15], rotateX: [8, -8, 8] }} 
              transition={{ opacity: { duration: 1 }, scale: { type: 'spring', duration: 1.6 }, rotateY: { duration: 20, repeat: Infinity, ease: 'easeInOut' }, rotateX: { duration: 25, repeat: Infinity, ease: 'easeInOut' } }}
              className="relative w-[28vw] h-[28vw] flex items-center justify-center z-10"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div key={`lat-${i}`} className="absolute inset-0 rounded-full border border-red-500/20" style={{ transform: `rotateX(${i * 36}deg)`, transformStyle: 'preserve-3d' }} />
              ))}
              {[...Array(5)].map((_, i) => (
                <motion.div key={`lon-${i}`} className="absolute inset-0 rounded-full border border-red-500/15" style={{ transform: `rotateY(${i * 36}deg)`, transformStyle: 'preserve-3d' }} />
              ))}

              <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} className="absolute w-[9vw] h-[9vw] bg-gradient-to-r from-red-600/80 to-yellow-500/80 rounded-full blur-[35px] mix-blend-screen" />

              {act >= 2 && nodes.map((n, i) => (
                <motion.div key={i} 
                  initial={{ opacity: 0, scale: 0 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: i * 0.2, type: 'spring' }}
                  className="absolute flex items-center justify-center" 
                  style={{ x: n.x, y: n.y, translateZ: n.z, transformStyle: 'preserve-3d' }}
                >
                  <motion.div animate={{scale:[1, 1.4, 1], opacity:[0.4, 0.8, 0.4]}} transition={{duration:1.5, repeat:Infinity, delay:i*0.3}} className="absolute w-[1.5vw] h-[1.5vw] bg-yellow-400 rounded-full blur-[8px]" />
                  <div className="w-[0.6vw] h-[0.6vw] bg-white rounded-full z-10 relative" />
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: '1.2vw' }} transition={{ delay: i * 0.2 + 0.4 }} className="absolute whitespace-nowrap bg-black/60 border border-white/10 px-[0.8vw] py-[0.4vw] rounded-[0.6vw] backdrop-blur-md z-20">
                    <p className="text-[0.6vw] font-bold text-yellow-400 tracking-widest uppercase">{n.label}</p>
                    <p className="text-[0.5vw] text-white/50 font-mono mt-[0.1vw]">Status: <span className="text-white font-bold">{n.stat}</span></p>
                  </motion.div>
                </motion.div>
              ))}

              {act >= 3 && (
                <motion.div 
                  initial={{ y: '-13vw', opacity: 0 }} 
                  animate={{ y: ['-13vw', '13vw', '-13vw'], opacity: [0, 0.8, 0.8, 0] }} 
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute w-[32vw] h-[0.8vw] bg-red-500/30 blur-[4px] rounded-full mix-blend-screen"
                  style={{ transform: 'rotateX(90deg)' }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebars */}
        <AnimatePresence>
          {act >= 2 && (
            <>
              <motion.div 
                initial={{ x: '-10vw', opacity: 0 }} 
                animate={{ x: '-24vw', opacity: 1 }} 
                transition={{ type: 'spring', delay: 0.1 }}
                className="absolute w-[17vw] h-[28vw] flex flex-col gap-[1vw] z-20"
              >
                <div className="p-[1.2vw] bg-black/35 border border-white/10 rounded-[1vw] backdrop-blur-xl shadow-[0_0_50px_rgba(220,38,38,0.15)] relative">
                  <SpecularGlare />
                  <h3 className="text-[0.75vw] text-red-500 font-bold uppercase tracking-widest mb-[0.8vw] flex items-center gap-[0.4vw]"><div className="w-[0.4vw] h-[0.4vw] bg-red-500 rounded-full animate-pulse" /> Rangkaian Kelab</h3>
                  <div className="flex flex-col gap-[0.7vw]">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-full h-[0.25vw] bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-red-500 to-yellow-500" initial={{ width: 0 }} animate={{ width: `${45 + Math.random() * 50}%` }} transition={{ duration: 1.2, delay: 0.4 + i*0.1 }} />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex-1 bg-black/35 border border-white/10 rounded-[1vw] backdrop-blur-xl p-[1.2vw] overflow-hidden flex flex-col relative">
                  <SpecularGlare />
                  <h3 className="text-[0.6vw] text-white/50 font-bold uppercase tracking-widest mb-[0.8vw]">Log Aktiviti Langsung</h3>
                  <div className="absolute inset-x-0 top-[2.8vw] bottom-[1vw] overflow-hidden px-[1.2vw]">
                    <motion.div animate={{ y: [0, -120] }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} className="flex flex-col gap-[0.6vw]">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center gap-[0.4vw]">
                          <div className="w-[0.3vw] h-[0.3vw] rounded-full bg-green-400" />
                          <p className="text-[0.6vw] text-white/60 font-mono">SYS: Ahli #{1020 + i} disahkan.</p>
                        </div>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ x: '10vw', opacity: 0 }} 
                animate={{ x: '24vw', opacity: 1 }} 
                transition={{ type: 'spring', delay: 0.2 }}
                className="absolute w-[15vw] h-[15vw] bg-gradient-to-br from-yellow-500/10 to-red-600/20 border border-yellow-500/20 rounded-[1vw] backdrop-blur-xl flex items-center justify-center flex-col z-20 shadow-[0_0_40px_rgba(251,191,36,0.1)] relative"
              >
                <SpecularGlare />
                <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }} className="text-[6.5vw] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-[0_0_15px_rgba(255,255,255,0.45)] font-mono">27</motion.p>
                <p className="text-[0.75vw] font-bold text-yellow-400 tracking-[0.4em] uppercase mt-[0.5vw]">Sistem Aktif</p>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {act === 4 && (
            <motion.div key="core-flash" initial={{opacity:0}} animate={{opacity:[0, 0.7, 0]}} exit={{opacity:0}}
              transition={{duration:0.6}} className="absolute inset-0 z-50 pointer-events-none mix-blend-screen"
              style={{background:`radial-gradient(circle at 50% 50%, #fbbf2430 0%, #dc262620 50%, transparent 80%)`}} 
            />
          )}
        </AnimatePresence>

        <ModuleOverlay show={act >= 5} num="Modul 08" name="Sistem Kelab" tagline={mod.tagline} gc="#fbbf24" pos="bottom-[8%] left-[4%]" />
      </motion.div>
    </CinematicEnvelope>
  );
}

// ─── Scene 06: Karnival & SUPSAS (Merged Ultimate Scene) ───────────────────────
function KarnivalScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const gc = mod.gc;

  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Shield
      setTimeout(() => setAct(2), 3500),  // Strobe
      setTimeout(() => setAct(3), 3700),  // Ticket scanning loads
      setTimeout(() => setAct(4), 5800),  // Scan success, Map zoom loads
      setTimeout(() => setAct(5), 7500),  // Heatmap blips / Live feeds
      setTimeout(() => setAct(6), 9500),  // Overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  const foodZones = [
    { name: 'Food Truck', x: '12%', y: '15%', w: '26%', h: '38%', c: '#f59e0b' },
    { name: 'Pentas Utama', x: '52%', y: '10%', w: '38%', h: '32%', c: gc },
    { name: 'Zon Permainan', x: '15%', y: '62%', w: '70%', h: '26%', c: '#3b82f6' }
  ];

  return (
    <CinematicEnvelope gc={gc}>
      <motion.div 
        animate={act===2 ? { x:[-12,12,-12,12,0], y:[-12,12,-12,12,0] } : { x:0, y:0 }}
        transition={{ duration:0.25, ease:'linear' }}
        className="absolute inset-0 flex items-center justify-center overflow-hidden" 
        style={{ perspective:'1500px', transformStyle: 'preserve-3d' }}
      >
        
        {/* Phase 1: Majestic Shield */}
        <AnimatePresence>
          {act === 1 && (
            <motion.div key="shield" exit={{ scale:1.3, opacity:0, filter:'blur(20px)' }} transition={{ duration:0.6 }}>
              <MajesticShield active={act === 1} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 3: Ticket Scanning Entrance */}
        <AnimatePresence>
          {act === 3 && (
            <motion.div 
              key="ticket" 
              initial={{ opacity:0, y:80, rotate:-6 }} 
              animate={{ opacity:1, y:0, rotate:0 }} 
              exit={{ opacity:0, scale:2, filter:'blur(15px)' }} 
              transition={{ duration:0.6, ease:SE }} 
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-[28vw] h-[13vw] rounded-[1.2vw] flex overflow-hidden border bg-[#110814]/85 backdrop-blur-2xl" style={{borderColor:gc+'44'}}>
                <div className="w-[30%] flex flex-col justify-center items-center border-r border-dashed" style={{borderColor:gc+'30', background:gc+'10'}}>
                  <span className="text-[3.5vw]">🎟️</span>
                  <p className="text-[0.65vw] tracking-widest mt-[0.5vw] font-bold" style={{color:gc}}>VIP PASS</p>
                </div>
                <div className="flex-1 p-[1.5vw] flex flex-col justify-center relative">
                  <SpecularGlare />
                  <p className="text-[1.8vw] font-black leading-none text-white">Malam Gala JPP</p>
                  <p className="text-[0.75vw] text-white/50 mt-[0.4vw]">Dewan Jubli Perak · 8:00 PM</p>
                  <motion.div initial={{width:0}} animate={{width:'100%'}} transition={{duration:1, ease:'easeOut', delay:0.3}} className="h-[0.3vw] mt-[1.2vw] rounded-full" style={{background:gc}} />
                </div>
              </div>
              <motion.div initial={{x:'-18vw'}} animate={{x:'18vw'}} transition={{duration:0.8, delay:0.4}} className="absolute w-[2px] h-[25vw] rotate-12" style={{background:gc, boxShadow:`0 0 25px 4px ${gc}`}} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 4+: Live Map Dashboard */}
        <AnimatePresence>
          {act >= 4 && (
            <motion.div 
              key="map-dashboard" 
              initial={{ opacity:0, scale:1.15, filter:'blur(15px)' }} 
              animate={{ opacity:1, scale:1, filter:'blur(0px)' }} 
              transition={spB(0)} 
              className="absolute inset-[5%] rounded-[1.5vw] border flex bg-[#0c0409]/80 backdrop-blur-2xl" 
              style={{ borderColor:gc+'30' }}
            >
              <SpecularGlare />
              {/* Left Panel */}
              <div className="w-[22%] border-r p-[1vw] flex flex-col gap-[0.5vw] bg-[#070105]/70" style={{borderColor:gc+'15'}}>
                <div className="flex items-center gap-[0.5vw] mb-[0.8vw]">
                  <div className="w-[1.8vw] h-[1.8vw] rounded-md flex items-center justify-center bg-pink-500/10 border border-pink-500/30"><span className="text-[0.9vw]">🎪</span></div>
                  <div><p className="text-[0.75vw] font-bold text-pink-400">Karnival JPP</p><p className="text-[0.5vw] text-white/40 font-mono">Event Console</p></div>
                </div>
                {['Dashboard','Tiket & Pass','Peta Tapak','Vendor Makanan','Persembahan'].map((item,i)=>(
                  <div key={item} className={`text-[0.7vw] px-[0.6vw] py-[0.45vw] rounded-md ${i===0?'font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20':'text-white/40'}`}>{item}</div>
                ))}
              </div>
              
              {/* Main Panel */}
              <div className="flex-1 p-[1.5vw] flex flex-col gap-[1vw]">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-[1.5vw] font-black text-white">Peta Karnival Live</h3>
                    <p className="text-[0.7vw] text-white/50 mt-[0.1vw]">Kemas kini masa nyata kehadiran pengunjung</p>
                  </div>
                  <div className="px-[0.8vw] py-[0.3vw] rounded-full text-[0.6vw] font-bold border flex items-center gap-[0.4vw]" style={{borderColor:gc, color:gc, background:gc+'10'}}>
                    <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-current animate-pulse" /> LIVE
                  </div>
                </div>
                
                <div className="flex-1 flex gap-[1vw]">
                  {/* Grid Map */}
                  <div className="flex-[2] rounded-[1vw] border relative overflow-hidden bg-[#10030c]" style={{borderColor:gc+'15'}}>
                    <div className="absolute inset-0 opacity-[0.08]" style={{backgroundImage:`linear-gradient(${gc} 1px, transparent 1px), linear-gradient(90deg, ${gc} 1px, transparent 1px)`, backgroundSize:'1.8vw 1.8vw'}} />
                    {foodZones.map((z,i)=>(
                      <motion.div key={z.name} initial={{scale:0, opacity:0}} animate={act>=4?{scale:1, opacity:1}:{}} transition={spB(i*0.12)} className="absolute border flex items-center justify-center text-[0.7vw] font-bold text-white/70 rounded-[0.5vw]" style={{left:z.x, top:z.y, width:z.w, height:z.h, background:z.c+'10', borderColor:z.c+'30'}}>
                        {z.name}
                      </motion.div>
                    ))}
                    {act >= 5 && Array.from({length:6}).map((_,i)=>(
                      <motion.div key={i} className="absolute w-[1.5vw] h-[1.5vw] rounded-full mix-blend-screen" 
                        style={{left:`${20+Math.random()*60}%`, top:`${20+Math.random()*60}%`, background:`radial-gradient(circle, ${gc}bb 0%, transparent 70%)`}} 
                        animate={{scale:[1,2.2,1], opacity:[0,0.7,0]}} 
                        transition={{duration:2+Math.random()*1.5, repeat:Infinity, delay:i*0.3}} 
                      />
                    ))}
                  </div>
                  {/* Stats */}
                  <div className="flex-1 flex flex-col gap-[0.5vw]">
                    {[
                      {label:'Kehadiran Terkini', val:'1,482', sub:'+120 jam lepas', icon:'👥'},
                      {label:'Kapasiti Dewan', val:'85%', sub:'Kepadatan tinggi', icon:'📊'},
                      {label:'Jualan Tiket', val:'RM 12,500', sub:'Telah disahkan', icon:'🎟️'}
                    ].map((s,i)=>(
                      <motion.div key={s.label} initial={{x:25, opacity:0}} animate={act>=4?{x:0, opacity:1}:{}} transition={{delay:0.3+i*0.1}} className="p-[0.8vw] rounded-[0.8vw] border bg-[#0d0309] flex flex-col" style={{borderColor:gc+'15'}}>
                        <p className="text-[0.6vw] text-white/40 uppercase tracking-wider mb-[0.3vw] flex items-center gap-[0.3vw]"><span className="text-[0.7vw]">{s.icon}</span> {s.label}</p>
                        <p className="text-[1.5vw] font-black text-white font-mono leading-none">{s.val}</p>
                        <p className="text-[0.55vw] mt-[0.2vw]" style={{color:gc}}>{s.sub}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {act >= 3 && <FireworksEffect active={act>=3} />}
        {act >= 3 && <ConfettiCannon active={act>=3} />}
        {act >= 4 && <GrandSearchlights />}

        <ModuleOverlay show={act>=5} num="Modul 09" name="Karnival JPP" tagline={mod.tagline} gc={gc} pos="bottom-[8%] right-[8%]" />
      </motion.div>
    </CinematicEnvelope>
  );
}

// ─── Scene 07: JPP HQ Portal ─────────────────────────────────────────────────
function JppHqScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 500),   // Waveform
      setTimeout(() => setAct(2), 2200),  // Wave form expands
      setTimeout(() => setAct(3), 3200),  // Dashboard lines
      setTimeout(() => setAct(4), 4200),  // Items fly in
      setTimeout(() => setAct(5), 5800),  // AI Assistant popover
      setTimeout(() => setAct(6), 8500),  // Overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  const gc = mod.gc;
  return (
    <CinematicEnvelope gc={gc}>
      {/* Waveform */}
      <AnimatePresence>
        {act >= 1 && act < 3 && (
          <motion.div key="ai-wave" initial={{opacity:0, scale:0.7}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:2.2, filter:'blur(15px)'}} transition={{duration:0.6}} className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-[0.4vw] h-[8vw]">
              {Array.from({length:15}).map((_,i)=>(
                <motion.div key={i} className="w-[0.6vw] rounded-full" style={{background:gc}} animate={{height:['20%','100%','20%']}} transition={{duration:0.4+Math.random()*0.4, repeat:Infinity, delay:Math.random()}} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Sweep */}
      <AnimatePresence>
        {act === 3 && (
          <motion.div key="grid-sweep" initial={{opacity:0, y:'60%'}} animate={{opacity:0.25, y:'0%'}} exit={{opacity:0}} transition={{duration:0.8}} className="absolute inset-0 z-0" style={{backgroundImage:`linear-gradient(${gc} 1px, transparent 1px), linear-gradient(90deg, ${gc} 1px, transparent 1px)`, backgroundSize:'4vw 4vw', perspective:'500px', transform:'rotateX(55deg)'}} />
        )}
      </AnimatePresence>

      {/* Executive Dashboard */}
      <AnimatePresence>
        {act >= 4 && (
          <motion.div key="hq-dash" initial={{opacity:0, y:50, rotateX:8}} animate={{opacity:1, y:0, rotateX:0}} transition={spB(0)} className="absolute inset-[5%] rounded-[1.5vw] border flex flex-col overflow-hidden bg-[#07020a]/85 backdrop-blur-2xl" style={{borderColor:gc+'40'}}>
            <SpecularGlare />
            {/* Header */}
            <div className="px-[1.5vw] py-[0.9vw] border-b flex justify-between items-center bg-[#09030e]/70" style={{borderColor:gc+'15'}}>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[2vw] h-[2vw] rounded-md border flex items-center justify-center" style={{borderColor:gc, background:gc+'15'}}><span className="text-[1vw]">🧠</span></div>
                <div><p className="text-[0.95vw] font-black text-white leading-none">JPP HQ PORTAL</p><p className="text-[0.55vw] tracking-[0.2em] uppercase mt-[0.2vw]" style={{color:gc}}>Eksekutif Dashboard</p></div>
              </div>
              <div className="text-right">
                <p className="text-[0.5vw] text-white/40">Status Sistem Global</p>
                <p className="text-[0.75vw] font-bold text-green-400 font-mono">Normal — 99.9% Uptime</p>
              </div>
            </div>
            {/* Grid */}
            <div className="flex-1 p-[1.5vw] grid grid-cols-3 gap-[1.2vw]">
              
              <div className="flex flex-col gap-[0.8vw]">
                <motion.div initial={{x:-20, opacity:0}} animate={{x:0, opacity:1}} transition={sp(0.1)} className="p-[1vw] rounded-[1vw] border bg-[#0d0413]/70" style={{borderColor:gc+'15'}}>
                  <p className="text-[0.75vw] text-white/50 mb-[0.8vw] font-bold uppercase tracking-wider">Penggunaan Modul</p>
                  <div className="flex flex-col gap-[0.5vw]">
                    {[{n:'E-Kebajikan',p:85},{n:'PolyMart',p:65},{n:'E-Akademik',p:45}].map(m=>(
                      <div key={m.n}>
                        <div className="flex justify-between text-[0.6vw] text-white/60 mb-[0.15vw]"><span>{m.n}</span><span className="font-mono">{m.p}%</span></div>
                        <div className="h-[0.3vw] bg-white/5 rounded-full"><motion.div initial={{width:0}} animate={{width:`${m.p}%`}} transition={{duration:1, delay:0.4}} className="h-full rounded-full" style={{background:gc}} /></div>
                      </div>
                    ))}
                  </div>
                </motion.div>
                <motion.div initial={{x:-20, opacity:0}} animate={{x:0, opacity:1}} transition={sp(0.2)} className="p-[1vw] rounded-[1vw] border flex-1 bg-[#0d0413]/70 flex flex-col" style={{borderColor:gc+'15'}}>
                   <p className="text-[0.7vw] text-white/50 mb-[0.5vw] font-bold uppercase tracking-wider">Notifikasi Sistem</p>
                   <div className="flex-1 flex flex-col justify-between text-[0.65vw] text-white/70">
                     {['Pangkalan data disandarkan (2:00 AM)','Kemas kini modul E-Kebajikan v1.2','Laporan kewangan JPP dijana'].map((n,i)=>(
                       <div key={i} className="py-[0.35vw] border-b border-white/5 last:border-0 font-mono">{n}</div>
                     ))}
                   </div>
                </motion.div>
              </div>

              <div className="col-span-2 flex flex-col gap-[0.8vw]">
                <motion.div initial={{scale:0.96, opacity:0}} animate={{scale:1, opacity:1}} transition={sp(0.3)} className="p-[1vw] rounded-[1vw] border flex-[1.8] relative overflow-hidden bg-[#0d0413]/70" style={{borderColor:gc+'15'}}>
                  <p className="text-[0.75vw] text-white/50 mb-[0.8vw] font-bold uppercase tracking-wider">Analitik Keseluruhan</p>
                  <div className="absolute inset-x-0 bottom-0 h-[50%] flex items-end px-[1vw] gap-[0.4vw]">
                    {Array.from({length:15}).map((_,i)=>(
                      <motion.div key={i} initial={{height:0}} animate={{height:`${30 + Math.random()*60}%`}} transition={{duration:0.8, delay:0.4+i*0.03}} className="flex-1 rounded-t-sm" style={{background:gc+'25'}} />
                    ))}
                  </div>
                  <div className="relative z-10 flex gap-[2vw]">
                    <div><p className="text-[0.65vw] text-white/40 uppercase font-bold">Total User</p><p className="text-[2.2vw] font-black text-white font-mono leading-none">4,892</p></div>
                    <div><p className="text-[0.65vw] text-white/40 uppercase font-bold">Data Terkumpul</p><p className="text-[2.2vw] font-black font-mono leading-none" style={{color:gc}}>1.2 TB</p></div>
                  </div>
                </motion.div>
                
                {/* AI Assistant */}
                <AnimatePresence>
                  {act >= 5 && (
                    <motion.div initial={{y:25, opacity:0}} animate={{y:0, opacity:1}} transition={spB(0.1)} className="p-[1vw] rounded-[1vw] border flex-1 flex items-center gap-[1vw]" style={{borderColor:gc+'44', background:gc+'10'}}>
                      <motion.div animate={{rotate:360}} transition={{duration:8, repeat:Infinity, ease:'linear'}} className="text-[2vw]">✨</motion.div>
                      <div className="flex-1">
                        <p className="text-[0.8vw] font-bold text-white mb-[0.15vw]">JPP AI — Laporan Mingguan Siap!</p>
                        <p className="text-[0.65vw] text-white/70">Sistem mengesan aduan fasiliti meningkat 12% minggu ini. Sediakan draf aduan automasi?</p>
                        <div className="flex gap-[0.5vw] mt-[0.4vw]">
                          <div className="px-[0.6vw] py-[0.2vw] text-[0.55vw] rounded bg-white text-black font-bold cursor-pointer">Jana Draf</div>
                          <div className="px-[0.6vw] py-[0.2vw] text-[0.55vw] rounded border border-white/20 text-white/70 cursor-pointer">Tutup</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=6} num="Modul 10" name="JPP HQ Portal" tagline={mod.tagline} gc={gc} />
    </CinematicEnvelope>
  );
}

// ─── FloatingMockup ─────────────────────────────────────────────────────────
function FloatingMockup({ flyAway }: { flyAway:boolean }) {
  const ctrl = useAnimation();

  useEffect(() => {
    if (flyAway) {
      ctrl.start({
        z: 800,
        rotateY: 45,
        rotateX: -45,
        opacity: 0,
        transition: { duration: 1.5, ease: [0.76, 0, 0.24, 1] }
      });
    } else {
      ctrl.start({
        x: '15vw',
        y: 0,
        rotateY: -22,
        rotateX: 12,
        scale: 0.9,
        opacity: 1,
        z: 0,
        transition: { 
          x: { type: 'spring', stiffness: 60, damping: 20 },
          scale: { duration: 1 },
          opacity: { duration: 1 }
        }
      }).then(() => {
        if (!flyAway) {
          ctrl.start({
            y: [-10, 10, -10],
            rotateY: [-22, -18, -22],
            transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
          });
        }
      });
    }
  }, [flyAway, ctrl]);

  return (
    <motion.div animate={ctrl} initial={{x:'0vw', y:0, rotateY:-10, rotateX:0, opacity:0, scale:4}}
      className="absolute right-[-2vw] w-[60vw] h-[37vw] rounded-[1.5vw] flex z-20"
      style={{transformStyle:'preserve-3d'}}>
      
      <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-full mix-blend-screen" style={{transform:'translateZ(-80px)'}} />

      {/* Main Glass Screen */}
      <div className="absolute inset-0 rounded-[1.5vw] border border-white/20 bg-black/40 backdrop-blur-xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex">
        <SpecularGlare />
        {/* Sidebar */}
        <div className="w-[20%] h-full flex flex-col bg-white/5 border-r border-white/10 p-[1vw]">
          <div className="flex items-center gap-[0.5vw] mb-[2vw]">
            <div className="w-[1.8vw] h-[1.8vw] rounded-md bg-gradient-to-br from-indigo-500 to-purple-600" />
            <div className="flex flex-col">
              <span className="text-[0.6vw] font-black leading-none tracking-widest text-white">JPP</span>
              <span className="text-[0.4vw] font-bold leading-none tracking-widest text-white/50">POLISAS</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-[0.5vw]">
            <div className="w-full h-[1.5vw] bg-indigo-500/10 rounded-md border border-indigo-500/20" />
            <div className="w-full h-[1.5vw] bg-white/5 rounded-md" />
            <div className="w-full h-[1.5vw] bg-white/5 rounded-md" />
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 p-[2vw] flex flex-col">
          <div className="w-[12vw] h-[1.8vw] bg-white/10 rounded-full mb-[2vw]" />
          <div className="flex-1 bg-white/5 rounded-[1vw] border border-white/10 p-[1vw] flex items-end gap-[0.5vw]">
            {[40, 65, 30, 80, 50, 95, 70, 100].map((h, i) => (
              <motion.div key={i} className="flex-1 bg-indigo-500/20 border border-indigo-500/30 rounded-t-md" initial={{height:0}} animate={{height:`${h}%`}} transition={{duration:1, delay:1.2 + i*0.1}} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── AtmosphereDots ──────────────────────────────────────────────────────────
function AtmosphereDots() {
  const dots = useMemo(()=>Array.from({length:30},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,s:Math.random()*2+1,dur:Math.random()*10+8,del:Math.random()*5,dr:(Math.random()-0.5)*4})),[]);
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
      <motion.div initial={{y:'110%'}} animate={show?{y:'0%'}:{y:'110%'}} transition={{delay,duration:1.2,ease:SE}} className={cls}>{text}</motion.div>
    </div>
  );
}

// ─── MajesticShield ──────────────────────────────────────────────────────────
function MajesticShield({ active }: { active:boolean }) {
  if (!active) return null;
  const gold = '#fbbf24';
  const sports = ['⚽', '🏀', '🏸', '🏃‍♂️', '🏆', '🎯', '🥇'];
  return (
    <motion.div 
      initial={{scale:0.8, opacity:0}} 
      animate={{scale:1, opacity:1}} 
      exit={{scale:1.4, opacity:0, filter:'blur(30px)'}}
      transition={{duration:1}} 
      className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{transformStyle:'preserve-3d'}}>
      
      {[...Array(3)].map((_, i) => (
        <motion.div key={`sw${i}`}
          initial={{scale:0, opacity:0.8}}
          animate={{scale:[0, 2.2, 4], opacity:[0.8, 0.3, 0]}}
          transition={{duration:3, repeat:Infinity, delay:i*1, ease:'easeOut'}}
          className="absolute w-[25vw] h-[25vw] rounded-full border"
          style={{borderColor:gold, boxShadow:`0 0 30px ${gold}, inset 0 0 15px ${gold}`}}
        />
      ))}

      <motion.div animate={{rotate:360}} transition={{duration:25, repeat:Infinity, ease:'linear'}} className="absolute w-[70vw] h-[70vw] opacity-15 pointer-events-none" style={{background:`repeating-conic-gradient(from 0deg, ${gold} 0deg 10deg, transparent 10deg 20deg)`}} />

      <motion.div animate={{rotateZ:360}} transition={{duration:25, repeat:Infinity, ease:'linear'}} className="absolute w-[35vw] h-[35vw] flex items-center justify-center pointer-events-none">
        {sports.map((sp, i) => {
          const angle = (i / sports.length) * 360;
          return (
            <div key={i} className="absolute" style={{transform:`rotate(${angle}deg) translateY(-17vw)`}}>
              <motion.div animate={{rotateZ:-360}} transition={{duration:25, repeat:Infinity, ease:'linear'}} className="text-[2.5vw] drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]">
                {sp}
              </motion.div>
            </div>
          )
        })}
      </motion.div>

      <motion.div 
        initial={{y:40, opacity:0, rotateY:-90}} 
        animate={{y:[0,-8,0], opacity:1, rotateY:[-8,8,-8]}} 
        transition={{y:{duration:4, repeat:Infinity, ease:'easeInOut'}, rotateY:{duration:6, repeat:Infinity, ease:'easeInOut'}, opacity:{duration:1}}}
        className="relative flex flex-col items-center justify-center z-20">
        
        <svg viewBox="0 0 200 200" className="absolute w-[24vw] h-[24vw] drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] z-0" style={{fill:'none', stroke:gold, strokeWidth:2.5}}>
          <motion.path initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:2}} d="M100,180 C40,180 20,120 30,60 C35,40 50,20 70,10" />
          <motion.path initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:2}} d="M100,180 C160,180 180,120 170,60 C165,40 150,20 130,10" />
          <motion.g initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.5, duration:1}} style={{fill:gold+'60', stroke:'none'}}>
            <path d="M30,60 C40,50 50,60 40,70 Z" /><path d="M40,90 C55,80 60,95 45,105 Z" /><path d="M60,130 C75,120 80,140 65,150 Z" />
            <path d="M170,60 C160,50 150,60 160,70 Z" /><path d="M160,90 C145,80 140,95 155,105 Z" /><path d="M140,130 C125,120 120,140 135,150 Z" />
          </motion.g>
        </svg>

        <motion.div animate={{scale:[1, 1.04, 1]}} transition={{duration:2, repeat:Infinity}} className="text-[10vw] z-10 drop-shadow-[0_0_35px_rgba(251,191,36,0.8)] leading-none mb-[1vw]">
          🏆
        </motion.div>

        <div className="flex flex-col items-center mt-[0.5vw] z-20">
          <motion.span initial={{letterSpacing:'0em', opacity:0}} animate={{letterSpacing:'0.3em', opacity:1}} transition={{duration:1.5, delay:0.5}} className="text-[1vw] font-bold text-white/90 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] uppercase">
            Sukan Tahunan Polisas
          </motion.span>
          <motion.span 
            initial={{scale:2.5, opacity:0}} animate={{scale:1, opacity:1}} transition={{duration:0.5, delay:1, type:'spring'}} 
            className="text-[4.5vw] font-black leading-none tracking-tighter" style={{color:gold, textShadow:`0 0 30px ${gold}80`}}>
            SUPSAS 2026
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── GrandSearchlights ────────────────────────────────────────────────────────
function GrandSearchlights() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-50">
      <motion.div
        animate={{ rotate: [-20, 35, -20] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-10vw] left-[-10vw] w-[45vw] h-[110vh]"
        style={{ background: 'conic-gradient(from 180deg at 50% 100%, transparent 0deg, rgba(255,255,255,0.08) 10deg, transparent 20deg)', transformOrigin: 'bottom center' }}
      />
      <motion.div
        animate={{ rotate: [20, -35, 20] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-[-10vw] right-[-10vw] w-[45vw] h-[110vh]"
        style={{ background: 'conic-gradient(from 180deg at 50% 100%, transparent 0deg, rgba(255,255,255,0.08) 10deg, transparent 20deg)', transformOrigin: 'bottom center' }}
      />
    </div>
  );
}

// ─── FireworksEffect ─────────────────────────────────────────────────────────
function FireworksEffect({ active }: { active:boolean }) {
  if (!active) return null;
  const colors = ['#f97316', '#d946ef', '#14b8a6', '#eab308'];
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(5)].map((_, i) => {
        const c = colors[i % colors.length];
        return (
          <motion.div key={`fw${i}`}
            initial={{x:`${15 + i*18}vw`, y:`80vh`, scale:0}}
            animate={{scale:[0, 1.3, 1.3], opacity:[1, 1, 0], y: [`80vh`, `${15 + (i%2)*12}vh`, `${20 + (i%2)*12}vh`]}}
            transition={{duration:2.6, repeat:Infinity, delay:i*0.4, ease:'easeOut'}}
            className="absolute flex items-center justify-center"
          >
            {[...Array(10)].map((_, j) => (
              <motion.div key={j}
                initial={{x:0, y:0, opacity:1}}
                animate={{
                  x: Math.cos((j * 36) * Math.PI / 180) * 12 + 'vw',
                  y: Math.sin((j * 36) * Math.PI / 180) * 12 + 'vw',
                  opacity: 0
                }}
                transition={{duration:1.2, delay:1.1 + i*0.4, ease:'easeOut', repeat:Infinity, repeatDelay:1.4}}
                className="absolute rounded-full"
                style={{width:'0.4vw', height:'0.4vw', background:c, boxShadow:`0 0 10px ${c}`}}
              />
            ))}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── InfiniteMarquee ──────────────────────────────────────────────────────────
function InfiniteMarquee() {
  return (
    <div className="absolute top-[25%] left-0 right-0 w-full overflow-hidden pointer-events-none z-0 opacity-10 flex">
      <motion.div animate={{x: ['0%', '-50%']}} transition={{duration: 20, repeat: Infinity, ease: 'linear'}} className="flex whitespace-nowrap">
        <h1 className="text-[12vw] font-black italic tracking-tighter text-white leading-none px-[2vw]">
          SUPSAS TAHUNAN DAN FESTIVAL KAMPUS
        </h1>
        <h1 className="text-[12vw] font-black italic tracking-tighter text-white leading-none px-[2vw]">
          SUPSAS TAHUNAN DAN FESTIVAL KAMPUS
        </h1>
      </motion.div>
    </div>
  );
}

// ─── FloatAiChip ─────────────────────────────────────────────────────────────
function FloatAiChip({ show, message, pos="bottom-[14%] right-[4%]" }: { show:boolean; message:string; pos?:string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="ai"
          initial={{opacity:0, x:30, filter:'blur(5px)'}}
          animate={{opacity:1, x:0, filter:'blur(0px)'}}
          exit={{opacity:0, x:15, filter:'blur(4px)'}}
          transition={{duration:0.6, ease:SE}}
          className={`absolute ${pos} z-40 flex items-end gap-[0.5vw]`}>
          <motion.div
            initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}
            transition={{delay:0.1, duration:0.5, ease:SE}}
            className="px-[0.8vw] py-[0.5vw] rounded-[0.8vw] border border-white/10 shadow-2xl max-w-[18vw]"
            style={{background:'rgba(15,10,40,0.9)', backdropFilter:'blur(10px)', boxShadow:'0 8px 32px rgba(124,58,237,0.2)'}}>
            <p className="text-[0.6vw] text-white/40 uppercase tracking-widest mb-[0.1vw] font-bold">JPP AI Assistant</p>
            <p className="text-[0.7vw] text-white/80 leading-relaxed">{message}</p>
          </motion.div>
          <motion.div
            animate={{scale:[1,1.08,1], boxShadow:['0 0 10px #7c3aed40','0 0 25px #7c3aed60','0 0 10px #7c3aed40']}}
            transition={{duration:2.5, repeat:Infinity, ease:'easeInOut'}}
            className="w-[2.8vw] h-[2.8vw] rounded-full flex items-center justify-center flex-shrink-0 border border-white/15"
            style={{background:'linear-gradient(135deg,#6d28d9,#7c3aed,#5b21b6)'}}>
            <span className="text-[1.1vw]">✦</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── TheNumbers ──────────────────────────────────────────────────────────────
function TheNumbers({ onTick }: { onTick: () => void }) {
  const nums = [['10','Modul Bersepadu'],['1','Platform Tunggal'],['∞','Kemungkinan']];
  const [val, setVal] = useState(0);

  useEffect(() => {
    let cur = 0;
    const iv = setInterval(() => {
      cur += 1;
      setVal(cur);
      onTick(); // Trigger shake feedback on counting ticks
      if (cur >= 10) clearInterval(iv);
    }, 400);
    return () => clearInterval(iv);
  }, []);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.6}} className="absolute inset-0 flex items-center justify-center bg-[#020205] overflow-hidden">
      <div className="flex gap-[6vw] items-center z-10">
        {nums.map((n, i) => (
          <div key={i} className="flex flex-col items-center">
            <h1 className="text-[10vw] font-black leading-none font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              {i === 0 ? val : n[0]}
            </h1>
            <p className="text-[1.5vw] font-light text-white/50 tracking-widest uppercase mt-[1vw]">{n[1]}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
