import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import QRCode from 'react-qr-code'; // <-- Sebenar!

const appleEase = [0.16, 1, 0.3, 1];

export function PromoPage() {
  const navigate = useNavigate();
  const [currentScene, setCurrentScene] = useState(0);

  // 8 SCENES (Termasuk SUPSAS & Karnival)
  const sceneDurations = [
     3000, // 0: The Hook (Dikurangkan ke 3s untuk hilangkan skrin mati)
     4000, // 1: Kebajikan
     4000, // 2: PolyMart
     4000, // 3: Akademik
     4000, // 4: Kelab
     4000, // 5: SUPSAS
     8000, // 6: The Breathe & 3D Device
     7000  // 7: The Outro
  ];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const playNext = (index: number) => {
      timeoutId = setTimeout(() => {
        const nextIndex = (index + 1) % sceneDurations.length;
        setCurrentScene(nextIndex);
        playNext(nextIndex);
      }, sceneDurations[index]);
    };

    playNext(0);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="h-screen w-screen bg-[#000000] text-white overflow-hidden relative cursor-none select-none font-sans" style={{ perspective: "2000px", transformStyle: "preserve-3d" }}>
      
      {/* KESAN ZARAH DEBU SINEMATIK */}
      <AmbientDust />

      {/* Scene Container */}
      <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
         <AnimatePresence mode="wait">
            {currentScene === 0 && <Scene0Hook key="s0" />}
            {currentScene === 1 && <Scene1Kebajikan key="s1" />}
            {currentScene === 2 && <Scene2Polymart key="s2" />}
            {currentScene === 3 && <Scene3Akademik key="s3" />}
            {currentScene === 4 && <Scene4Kelab key="s4" />}
            {currentScene === 5 && <Scene5Supsas key="s5" />}
            {currentScene === 6 && <Scene6BreatheDevice key="s6" />}
            {currentScene === 7 && <Scene7Outro key="s7" navigate={navigate} />}
         </AnimatePresence>
      </div>

      {/* Hidden Dev Navigation */}
      <button 
        onClick={() => setCurrentScene((prev) => (prev + 1) % sceneDurations.length)}
        className="absolute bottom-[2vw] right-[2vw] w-[4vw] h-[4vw] rounded-full bg-white/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-50 cursor-pointer backdrop-blur-md"
      >
         <ChevronRight className="w-[2vw] h-[2vw] text-white/50" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------
// EFEK ZARAH (AMBIENT DUST)
// ---------------------------------------------------------
function AmbientDust() {
  const [particles, setParticles] = useState<{id:number, x:number, y:number, size:number, duration:number}[]>([]);
  
  useEffect(() => {
     // Generate random particles once on mount
     const p = Array.from({length: 40}).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        duration: Math.random() * 20 + 15
     }));
     setParticles(p);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute bg-white rounded-full opacity-20"
          style={{ width: `${p.size}px`, height: `${p.size}px`, left: `${p.x}vw`, top: `${p.y}vh` }}
          animate={{
             y: [null, `${(p.y - 10) % 100}vh`, `${(p.y + 10) % 100}vh`],
             x: [null, `${(p.x + 5) % 100}vw`, `${(p.x - 5) % 100}vw`],
             opacity: [0.1, 0.4, 0.1]
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------
// V-FINAL SCENES
// ---------------------------------------------------------

function Scene0Hook() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Dipadatkan kepada 3s supaya tiada dead space
    const t1 = setTimeout(() => setPhase(1), 500); // Wait 0.5s
    const t2 = setTimeout(() => setPhase(2), 700); // SYSTEM
    const t3 = setTimeout(() => setPhase(3), 900); // ONLINE
    const t4 = setTimeout(() => setPhase(4), 1100); // JPP
    const t5 = setTimeout(() => setPhase(5), 1300); // DIGITAL
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); }
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
       {phase === 0 && <motion.div animate={{ scaleX: [0, 1] }} transition={{ duration: 0.5, ease: appleEase }} className="w-[80vw] h-[2px] bg-white" />}
       {phase === 1 && <motion.div animate={{ scaleY: [1, 500], opacity: [1, 0] }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-[80vw] h-[2px] bg-white" />}
       
       <AnimatePresence>
          {phase === 2 && <motion.h1 key="1" className="text-[18vw] font-black absolute tracking-tighter text-white">SYSTEM</motion.h1>}
          {phase === 3 && <motion.h1 key="2" className="text-[18vw] font-black absolute tracking-tighter text-indigo-500">ONLINE</motion.h1>}
          {phase === 4 && <motion.h1 key="3" className="text-[18vw] font-black absolute tracking-tighter text-white">JPP</motion.h1>}
          {phase >= 5 && (
             <motion.h1 
                key="4"
                initial={{ scale: 1, opacity: 1, filter: "blur(0px)" }} 
                animate={{ scale: 6, opacity: 0, filter: "blur(40px)" }} 
                transition={{ duration: 1.7, ease: appleEase }} 
                className="text-[18vw] font-black absolute tracking-tighter text-transparent" 
                style={{ WebkitTextStroke: "4px white" }}
             >
                DIGITAL
             </motion.h1>
          )}
       </AnimatePresence>
    </div>
  );
}

function FastWipe({ problem, solutionMain, solutionSub, color, bgModel }: any) {
   const [phase, setPhase] = useState(0);

   useEffect(() => {
     // Problem holds for ONLY 0.8s (Lebih agresif)
     const t1 = setTimeout(() => setPhase(1), 800); 
     return () => clearTimeout(t1);
   }, []);

   return (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: "blur(20px)", scale: 1.2 }} transition={{ duration: 0.8 }} className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
        
        {/* Subtle Infinite Isometric Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4vw_4vw]" style={{ transform: "perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)", transformOrigin: "top center" }} />

        <AnimatePresence mode="wait">
            {phase === 0 && (
               <motion.div key="prob" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="text-[6vw] font-bold text-white/80 tracking-tight">
                  {problem}
               </motion.div>
            )}
            
            {phase === 1 && (
               <motion.div key="sol" className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                     initial={{ x: "-100%", skewX: -20 }} 
                     animate={{ x: ["-100%", "0%", "100%"] }} 
                     transition={{ duration: 0.8, times: [0, 0.3, 1], ease: appleEase }} 
                     className="absolute inset-0 z-50 w-[150%] h-[150%]" 
                     style={{ backgroundColor: color }} 
                  />
                  
                  {/* Floating Unique 3D BG Object */}
                  <motion.div 
                      initial={{ scale: 0, rotateY: 90, rotateX: -45 }} 
                      animate={{ scale: 1, rotateY: 0, rotateX: 0 }} 
                      transition={{ duration: 2.5, ease: "easeOut" }}
                      className="absolute z-0 opacity-50"
                      style={{ transformStyle: "preserve-3d" }}
                  >
                     {bgModel}
                  </motion.div>

                  <div className="relative z-10 flex flex-col items-center">
                      <motion.h1 
                         initial={{ letterSpacing: "0.2em", opacity: 0, y: 50 }} 
                         animate={{ letterSpacing: "-0.02em", opacity: 1, y: 0 }} 
                         transition={{ delay: 0.2, duration: 1.5, ease: appleEase }}
                         className="text-[18vw] font-black leading-none text-white drop-shadow-2xl whitespace-nowrap"
                      >
                         {solutionMain}
                      </motion.h1>
                      <motion.div 
                         initial={{ y: 20, opacity: 0 }} 
                         animate={{ y: 0, opacity: 1 }} 
                         transition={{ delay: 0.4, duration: 1.5, ease: appleEase }}
                         className="text-[3vw] font-bold uppercase tracking-[0.8em] mt-[1vw]"
                         style={{ color, textShadow: `0 0 30px ${color}` }}
                      >
                         {solutionSub}
                      </motion.div>
                  </div>
               </motion.div>
            )}
        </AnimatePresence>
     </motion.div>
   )
}

// ==========================================
// GEOMETRI 3D UNIK UNTUK SETIAP MODUL
// ==========================================

function WireframeCube({ color, rotate = false }: any) {
  return (
    <motion.div animate={rotate ? { rotateZ: 360 } : {}} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className={`w-[50vw] h-[50vw] border-[0.5vw] ${color} rounded-[5vw] flex items-center justify-center shadow-[0_0_100px_currentColor]`} style={{ transformStyle: "preserve-3d" }}>
       <div className={`w-[25vw] h-[25vw] border-[0.2vw] ${color} rounded-[2vw] rotate-45`} style={{ transform: "translateZ(100px)" }} />
    </motion.div>
  )
}

function WireframeSphere({ color, rotate=false }: any) {
  return (
    <motion.div animate={rotate ? { rotateY: 360, rotateZ: 360 } : {}} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="w-[50vw] h-[50vw] flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
       {Array.from({length: 6}).map((_, i) => (
          <div key={i} className={`absolute w-[40vw] h-[40vw] border-[0.2vw] rounded-full ${color}`} style={{ transform: `rotateY(${i * 30}deg)` }} />
       ))}
       {Array.from({length: 6}).map((_, i) => (
          <div key={i+10} className={`absolute w-[40vw] h-[40vw] border-[0.2vw] rounded-full ${color}`} style={{ transform: `rotateX(${i * 30}deg)` }} />
       ))}
    </motion.div>
  )
}

function WireframeCylinder({ color, rotate=false }: any) {
  return (
    <motion.div animate={rotate ? { rotateX: 360, rotateY: 360 } : {}} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="w-[50vw] h-[50vw] flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
       {Array.from({length: 12}).map((_, i) => (
          <div key={i} className={`absolute w-[30vw] h-[30vw] border-[0.2vw] rounded-full ${color}`} style={{ transform: `translateZ(${(i - 6) * 20}px)` }} />
       ))}
    </motion.div>
  )
}

function WireframeDiamond({ color, rotate=false }: any) {
  return (
    <motion.div animate={rotate ? { rotateZ: 360, rotateY: 360 } : {}} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="w-[50vw] h-[50vw] flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
       {Array.from({length: 6}).map((_, i) => (
          <div key={i} className={`absolute border-[0.2vw] ${color} rotate-45`} style={{ width: `${35 - i*4}vw`, height: `${35 - i*4}vw`, transform: `translateZ(${i * 30}px) rotateZ(45deg)` }} />
       ))}
       {Array.from({length: 6}).map((_, i) => (
          <div key={i+10} className={`absolute border-[0.2vw] ${color} rotate-45`} style={{ width: `${35 - i*4}vw`, height: `${35 - i*4}vw`, transform: `translateZ(${-i * 30}px) rotateZ(45deg)` }} />
       ))}
    </motion.div>
  )
}

function WireframeTorus({ color, rotate=false }: any) {
  return (
    <motion.div animate={rotate ? { rotateX: 360, rotateZ: 360 } : {}} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="w-[50vw] h-[50vw] flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
       {Array.from({length: 12}).map((_, i) => (
          <div key={i} className={`absolute w-[15vw] h-[15vw] border-[0.2vw] rounded-full ${color}`} style={{ transform: `rotateY(${i * 30}deg) translateX(15vw)` }} />
       ))}
    </motion.div>
  )
}

// Modul Scenes dengan Geometri Berbeza
function Scene1Kebajikan() {
   return <FastWipe problem="Menunggu Bantuan?" solutionMain="2 JAM" solutionSub="Dikuasakan AI" color="#2dd4bf" bgModel={<WireframeSphere color="border-teal-500/50" rotate={true} />} />;
}

function Scene2Polymart() {
   return <FastWipe problem="Harga Luar Mahal?" solutionMain="EKONOMI" solutionSub="Pasaran PolyMart" color="#4ade80" bgModel={<WireframeCylinder color="border-green-500/50" rotate={true} />} />;
}

function Scene3Akademik() {
   return <FastWipe problem="Pencapaian Diabai?" solutionMain="15,000" solutionSub="Mata Merit Digital" color="#818cf8" bgModel={<WireframeDiamond color="border-indigo-500/50" rotate={true} />} />;
}

function Scene4Kelab() {
   return <FastWipe problem="Guna Kertas Lagi?" solutionMain="PAPERLESS" solutionSub="Ekosistem Kelab" color="#f87171" bgModel={<WireframeCube color="border-red-500/50" rotate={true} />} />;
}

function Scene5Supsas() {
   return <FastWipe problem="Gaya Hidup Pasif?" solutionMain="KARNIVAL" solutionSub="Sukan & Perpaduan" color="#fbbf24" bgModel={<WireframeTorus color="border-amber-500/50" rotate={true} />} />;
}

// ---------------------------------------------------------
// SCENE 6: THE BREATHE & 3D DEVICE POP (8 SECONDS)
// ---------------------------------------------------------
function Scene6BreatheDevice() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2000); 
    const t2 = setTimeout(() => setPhase(2), 3500); 
    const t3 = setTimeout(() => setPhase(3), 6000); 
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
        
        <AnimatePresence>
            {phase < 1 && (
               <motion.div exit={{ opacity: 0, filter: "blur(10px)" }} className="absolute text-[4vw] font-light text-white/50 tracking-widest">
                  Satu Ekosistem.
               </motion.div>
            )}
        </AnimatePresence>

        <motion.div 
           initial={{ y: "-100vh", rotateX: 0, rotateZ: 0, scale: 0.8, opacity: 0 }}
           animate={{
              y: phase >= 3 ? "0vh" : phase >= 1 ? "0vh" : "-100vh",
              rotateX: phase >= 3 ? 0 : phase >= 2 ? 55 : 0,
              rotateZ: phase >= 3 ? 0 : phase >= 2 ? -30 : 0,
              scale: phase >= 3 ? 40 : 0.8,
              opacity: phase >= 3 ? 0 : phase >= 1 ? 1 : 0
           }}
           transition={{ duration: phase >= 3 ? 2 : 2.5, ease: appleEase }}
           className="relative w-[70vw] h-[45vw] max-w-[1400px] max-h-[900px] rounded-[3vw] border-[0.3vw] border-white/20 bg-black/60 backdrop-blur-3xl shadow-[0_0_150px_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden"
           style={{ transformStyle: "preserve-3d" }}
        >
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-white/10 to-transparent rotate-45 pointer-events-none" />

            <div className="absolute inset-0 flex p-[3vw] gap-[3vw]" style={{ transformStyle: "preserve-3d" }}>
               {/* Sidebar */}
               <motion.div 
                  animate={{ translateZ: phase >= 2 ? "50px" : "0px", boxShadow: phase >= 2 ? "-20px 20px 50px rgba(0,0,0,0.5)" : "none" }}
                  transition={{ duration: 2, ease: appleEase }}
                  className="w-[20%] h-full bg-white/5 rounded-[1.5vw] border border-white/10 p-[1.5vw] flex flex-col gap-[1.5vw]"
               >
                   <div className="w-full h-[3vw] bg-indigo-500/50 rounded-full mb-[2vw]" />
                   <div className="w-[80%] h-[1.5vw] bg-white/10 rounded-full" />
                   <div className="w-[60%] h-[1.5vw] bg-white/10 rounded-full" />
                   <div className="w-[90%] h-[1.5vw] bg-white/10 rounded-full" />
               </motion.div>
               
               {/* Main Canvas (Live Animated Fake Data) */}
               <div className="flex-1 flex flex-col gap-[3vw]" style={{ transformStyle: "preserve-3d" }}>
                  <motion.div 
                     animate={{ translateZ: phase >= 2 ? "100px" : "0px", boxShadow: phase >= 2 ? "-30px 30px 60px rgba(0,0,0,0.5)" : "none" }}
                     transition={{ duration: 2, delay: 0.1, ease: appleEase }}
                     className="w-full h-[15%] bg-white/10 rounded-[1.5vw] border border-white/20 flex items-center px-[2vw]"
                  >
                      {/* Fake live search bar */}
                      <motion.div initial={{ width: "20%" }} animate={{ width: phase >= 2 ? "80%" : "20%" }} transition={{ delay: 2.5, duration: 1.5, ease: appleEase }} className="h-[1.5vw] bg-white/20 rounded-full" />
                  </motion.div>

                  <div className="flex gap-[3vw] h-[30%]" style={{ transformStyle: "preserve-3d" }}>
                     {['bg-teal-500/20 border-teal-500/50', 'bg-green-500/20 border-green-500/50', 'bg-yellow-500/20 border-yellow-500/50'].map((col, i) => (
                         <motion.div 
                            key={i}
                            animate={{ translateZ: phase >= 2 ? `${150 - (i*20)}px` : "0px" }}
                            transition={{ duration: 2, delay: 0.2 + (i*0.05), ease: appleEase }}
                            className={`flex-1 rounded-[1.5vw] border ${col} p-[2vw] flex flex-col justify-center`}
                         >
                            <div className="w-[40%] h-[1.5vw] bg-white/30 rounded-full mb-[1.5vw]" />
                            {/* Live counter animation */}
                            <motion.div initial={{ width: "30%" }} animate={{ width: phase >= 2 ? "80%" : "30%" }} transition={{ delay: 2.8 + (i*0.2), duration: 1 }} className="h-[4vw] bg-white/70 rounded-full" />
                         </motion.div>
                     ))}
                  </div>

                  <motion.div 
                     animate={{ translateZ: phase >= 2 ? "80px" : "0px", boxShadow: phase >= 2 ? "-20px 20px 50px rgba(0,0,0,0.4)" : "none" }}
                     transition={{ duration: 2, delay: 0.4, ease: appleEase }}
                     className="flex-1 bg-white/5 rounded-[1.5vw] border border-white/10 flex items-end p-[3vw] gap-[2vw]"
                  >
                     {/* Animated Bar Chart */}
                     <motion.div initial={{ height: "10%" }} animate={{ height: phase >= 2 ? "40%" : "10%" }} transition={{ delay: 2.5, duration: 1, ease: appleEase }} className="flex-1 bg-indigo-500/40 rounded-t-md" />
                     <motion.div initial={{ height: "20%" }} animate={{ height: phase >= 2 ? "70%" : "20%" }} transition={{ delay: 2.7, duration: 1, ease: appleEase }} className="flex-1 bg-indigo-500/60 rounded-t-md" />
                     <motion.div initial={{ height: "15%" }} animate={{ height: phase >= 2 ? "100%" : "15%" }} transition={{ delay: 2.9, duration: 1, ease: appleEase }} className="flex-1 bg-indigo-500/90 rounded-t-md shadow-[0_0_30px_rgba(99,102,241,0.5)]" />
                     <motion.div initial={{ height: "30%" }} animate={{ height: phase >= 2 ? "60%" : "30%" }} transition={{ delay: 3.1, duration: 1, ease: appleEase }} className="flex-1 bg-indigo-500/60 rounded-t-md" />
                  </motion.div>
               </div>
            </div>
        </motion.div>

    </motion.div>
  )
}

// ---------------------------------------------------------
// SCENE 7: THE HYPNOTIC CTA (REAL QR CODE)
// ---------------------------------------------------------
function Scene7Outro({ navigate }: { navigate: (path: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2, ease: appleEase }} className="absolute inset-0 flex items-center justify-center w-full h-full bg-black">
       
       <div className="flex gap-[12vw] items-center p-[10vw] w-full max-w-[90vw]">
          <div className="flex flex-col items-start flex-1">
             <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex gap-[1vw] mb-[2vw]">
                 <span className="px-[1vw] py-[0.5vw] border border-white/20 rounded-full text-[1vw] text-white/50 tracking-widest">[ SYSTEM OPTIMIZED ]</span>
                 <span className="px-[1vw] py-[0.5vw] border border-green-500/30 rounded-full text-[1vw] text-green-400 tracking-widest">[ LATENCY: 1ms ]</span>
             </motion.div>

             <motion.h1 
                 initial={{ letterSpacing: "0.1em", opacity: 0 }}
                 animate={{ letterSpacing: "-0.02em", opacity: 1 }}
                 transition={{ duration: 2.5, ease: appleEase }}
                 className="text-[12vw] font-black text-white leading-[0.85] tracking-tighter"
             >
                 JPP DIGITAL
             </motion.h1>
             
             <motion.button 
                initial={{ opacity: 0, y: 50 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 1, duration: 1.5, ease: appleEase }}
                onClick={() => navigate('/login')}
                className="mt-[6vw] bg-white text-black font-black text-[2vw] px-[6vw] py-[3vw] rounded-[1vw] uppercase tracking-widest hover:scale-105 pointer-events-auto transition-transform"
             >
                 LOG MASUK
             </motion.button>
          </div>
          
          <motion.div 
             initial={{ opacity: 0, scale: 0.5, filter: "blur(20px)" }}
             animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
             transition={{ duration: 2, delay: 0.6, ease: appleEase }}
             className="bg-white p-[2vw] rounded-[2vw] flex flex-col items-center flex-shrink-0 relative shadow-[0_0_100px_rgba(255,255,255,0.2)]"
          >
             {/* HUD Targeting Brackets */}
             <div className="absolute top-[-1vw] left-[-1vw] w-[3vw] h-[3vw] border-t-[0.4vw] border-l-[0.4vw] border-indigo-500 rounded-tl-lg" />
             <div className="absolute top-[-1vw] right-[-1vw] w-[3vw] h-[3vw] border-t-[0.4vw] border-r-[0.4vw] border-indigo-500 rounded-tr-lg" />
             <div className="absolute bottom-[-1vw] left-[-1vw] w-[3vw] h-[3vw] border-b-[0.4vw] border-l-[0.4vw] border-indigo-500 rounded-bl-lg" />
             <div className="absolute bottom-[-1vw] right-[-1vw] w-[3vw] h-[3vw] border-b-[0.4vw] border-r-[0.4vw] border-indigo-500 rounded-br-lg" />

             {/* Laser Scanner Effect */}
             <motion.div animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-[0.5vw] bg-indigo-500/80 shadow-[0_0_20px_rgba(99,102,241,1)] z-50 rounded-full" />
             
             {/* REAL QR CODE */}
             <div className="p-[1vw] bg-white relative z-10 rounded-[1vw]">
               <QRCode value="https://jpp.cipher-node.url" size={256} className="w-[18vw] h-[18vw]" />
             </div>

             <div className="text-black font-black text-[1.5vw] mt-[1vw] tracking-[0.2em] uppercase relative z-10">Imbas Untuk Mula</div>
          </motion.div>
       </div>
    </motion.div>
  );
}
