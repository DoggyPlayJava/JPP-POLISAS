const fs = require('fs');

const filePath = 'C:\\Users\\Cyborg 15\\Desktop\\JPP-POLISAS-main\\src\\pages\\LaunchVideo.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Update E-Akademik color
content = content.replace("nc:'text-blue-400', gc:'#2563eb'", "nc:'text-blue-400', gc:'#3b82f6'");

// 2. Replace KeusahawananScene
const keusahawananPattern = /function KeusahawananScene\(\{ mod \}: SceneProps\) \{[\s\S]*?\n\}\n\/\/ ─── Scene 03/;
const newKeusahawanan = `function KeusahawananScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [revenue, setRevenue] = useState(0);
  
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 300),   // Terminal boots
      setTimeout(() => setAct(2), 1500),  // Order incoming
      setTimeout(() => setAct(3), 3000),  // Payment processing
      setTimeout(() => setAct(4), 4500),  // Payment SUCCESS & Receipt
      setTimeout(() => setAct(5), 7000),  // Scanlines / transition out
      setTimeout(() => setAct(6), 9000),  // Module overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (act >= 4) {
      const iv = setInterval(() => setRevenue(prev => {
        const next = prev + Math.floor(Math.random() * 50 + 10);
        return next > 4500 ? 4500 : next;
      }), 30);
      return () => clearInterval(iv);
    }
  }, [act]);

  const gc = mod.gc;

  return (
    <CinematicEnvelope gc={gc}>
      <div className="absolute inset-0 flex items-center justify-center" style={{perspective: '2000px'}}>
        
        {/* Ambient background glow */}
        <motion.div animate={act>=4 ? {opacity:0.4, scale:1.2} : {opacity:0.1, scale:1}} transition={{duration:1}} className="absolute inset-0 z-0 mix-blend-screen pointer-events-none" style={{background:\`radial-gradient(circle at 50% 50%, \${gc} 0%, transparent 60%)\`}} />

        {/* 3D POS Terminal */}
        <motion.div 
          initial={{rotateX: 20, rotateY: -20, scale: 0.8, z: -500, opacity:0}}
          animate={
             act>=4 ? {rotateX: 5, rotateY: -5, scale: 1.1, z: 100, opacity:1} : 
             act>=2 ? {rotateX: 10, rotateY: -10, scale: 1, z: 0, opacity:1} : 
             {rotateX: 15, rotateY: -15, scale: 0.9, z: -200, opacity:1}
          }
          transition={{duration: 2, ease: [0.25, 1, 0.5, 1]}}
          className="relative w-[50vw] h-[30vw] bg-zinc-950 rounded-[1.5vw] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex overflow-hidden z-10"
          style={{transformStyle:'preserve-3d'}}
        >
          {/* Sidebar */}
          <div className="w-[12vw] bg-zinc-900 border-r border-white/5 p-[1.5vw] flex flex-col gap-[1vw]">
            <div className="w-[3vw] h-[3vw] rounded-full flex items-center justify-center bg-green-500/20 text-green-400 font-bold text-[1.2vw]">POS</div>
            <div className="flex-1 mt-[2vw] flex flex-col gap-[0.5vw]">
               {[1,2,3,4].map(i => <div key={i} className="h-[2vw] rounded-md bg-white/5 w-full" />)}
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col relative overflow-hidden bg-[#050505]">
            {/* Topbar */}
            <div className="h-[4vw] border-b border-white/5 flex items-center justify-between px-[2vw] shrink-0">
               <span className="text-[1.2vw] font-bold text-white">PolyMart Checkout</span>
               <span className="text-[0.8vw] text-zinc-500 font-mono">Terminal #04</span>
            </div>

            {/* Content */}
            <div className="flex-1 flex p-[2vw] gap-[2vw]">
              
              {/* Items List */}
              <div className="flex-1 flex flex-col gap-[1vw]">
                <AnimatePresence>
                  {act >= 2 && (
                    <motion.div initial={{x:-50, opacity:0}} animate={{x:0, opacity:1}} className="p-[1.2vw] bg-white/5 rounded-[1vw] border border-white/10 flex justify-between items-center">
                       <div className="flex items-center gap-[1vw]">
                         <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] bg-zinc-800 flex items-center justify-center text-[1.5vw]">🍛</div>
                         <div>
                           <p className="text-[1.1vw] font-bold text-white">Nasi Lemak Ayam</p>
                           <p className="text-[0.8vw] text-zinc-400">Vendor: Restu Cafe</p>
                         </div>
                       </div>
                       <p className="text-[1.2vw] font-bold text-white">RM 6.50</p>
                    </motion.div>
                  )}
                  {act >= 2 && (
                    <motion.div initial={{x:-50, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.2}} className="p-[1.2vw] bg-white/5 rounded-[1vw] border border-white/10 flex justify-between items-center">
                       <div className="flex items-center gap-[1vw]">
                         <div className="w-[3.5vw] h-[3.5vw] rounded-[0.8vw] bg-zinc-800 flex items-center justify-center text-[1.5vw]">🥤</div>
                         <div>
                           <p className="text-[1.1vw] font-bold text-white">Teh Ais Cincau</p>
                           <p className="text-[0.8vw] text-zinc-400">Vendor: Koperasi</p>
                         </div>
                       </div>
                       <p className="text-[1.2vw] font-bold text-white">RM 3.50</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Payment Panel */}
              <div className="w-[14vw] flex flex-col justify-end">
                <div className="bg-zinc-900 rounded-[1vw] border border-white/10 p-[1.5vw] flex flex-col gap-[1vw]">
                   <div className="flex justify-between text-[0.9vw] text-zinc-400"><span>Subtotal</span><span>RM 10.00</span></div>
                   <div className="flex justify-between text-[0.9vw] text-zinc-400"><span>Tax</span><span>RM 0.00</span></div>
                   <div className="h-px bg-white/10 w-full" />
                   <div className="flex justify-between text-[1.4vw] font-black text-white"><span>Total</span><span>RM 10.00</span></div>
                   
                   <motion.div 
                     animate={act>=4 ? {backgroundColor: gc, color: '#fff', scale:[1,1.05,1]} : act>=3 ? {backgroundColor: '#eab308', color: '#fff'} : {backgroundColor: '#27272a', color: '#a1a1aa'}}
                     transition={{duration:0.3}}
                     className="mt-[1vw] w-full py-[1vw] rounded-[0.5vw] flex items-center justify-center text-[1vw] font-bold transition-colors"
                   >
                     {act>=4 ? 'APPROVED' : act>=3 ? 'PROCESSING...' : 'AWAITING PAYMENT'}
                   </motion.div>
                </div>
              </div>

            </div>

            {/* Success Overlay Flash */}
            <AnimatePresence>
              {act === 4 && (
                <motion.div initial={{opacity:0}} animate={{opacity:[0, 1, 0]}} transition={{duration:0.6}} className="absolute inset-0 bg-green-500/20 mix-blend-screen pointer-events-none" />
              )}
            </AnimatePresence>

          </div>
        </motion.div>

        {/* Floating Success Receipt */}
        <AnimatePresence>
          {act >= 4 && (
            <motion.div 
              initial={{y: 50, rotateZ: -10, opacity:0, scale:0.5}}
              animate={{y: -80, rotateZ: 5, opacity:1, scale:1.2}}
              transition={{type: 'spring', stiffness: 200, damping: 20}}
              className="absolute z-20 w-[12vw] bg-white text-black p-[1.5vw] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center"
              style={{clipPath: 'polygon(0 0, 100% 0, 100% 100%, 95% 98%, 90% 100%, 85% 98%, 80% 100%, 75% 98%, 70% 100%, 65% 98%, 60% 100%, 55% 98%, 50% 100%, 45% 98%, 40% 100%, 35% 98%, 30% 100%, 25% 98%, 20% 100%, 15% 98%, 10% 100%, 5% 98%, 0 100%)'}}
            >
              <div className="w-[3vw] h-[3vw] rounded-full bg-green-500 text-white flex items-center justify-center mb-[1vw] text-[1.5vw] font-bold">✓</div>
              <p className="text-[1vw] font-black tracking-tight mb-[0.2vw]">RM 10.00</p>
              <p className="text-[0.6vw] text-zinc-500 uppercase tracking-widest mb-[1vw]">Payment Success</p>
              <div className="w-full border-t border-dashed border-zinc-300 my-[0.5vw]" />
              <div className="w-full flex justify-between text-[0.6vw] font-mono text-zinc-600 mb-[0.2vw]"><span>TRX_ID</span><span>#9A4F2B</span></div>
              <div className="w-full flex justify-between text-[0.6vw] font-mono text-zinc-600"><span>TIME</span><span>14:32:05</span></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Revenue Ticker Background */}
        <AnimatePresence>
           {act >= 4 && (
             <motion.div initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{duration:1}} className="absolute bottom-[5vw] right-[5vw] flex flex-col items-end z-0 pointer-events-none">
               <p className="text-[1.2vw] font-bold text-green-400/80 uppercase tracking-widest">Global Revenue</p>
               <div className="text-[6vw] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-green-600 drop-shadow-[0_0_20px_rgba(74,222,128,0.3)]">
                 +RM {revenue.toLocaleString()}
               </div>
             </motion.div>
           )}
        </AnimatePresence>

        <ModuleOverlay show={act>=6} num="Modul 02" name="E-Keusahawanan" tagline={mod.tagline} gc={gc} pos="bottom-[6%] left-[2%]" />
      </div>
    </CinematicEnvelope>
  );
}
// ─── Scene 03`;

content = content.replace(keusahawananPattern, newKeusahawanan);

// 3. Replace FloatingMockup
const floatingPattern = /function FloatingMockup\(\{ flyAway \}: \{ flyAway: boolean \}\) \{[\s\S]*?\n\}\n\n\/\/ ─── Scene 06/;
const newFloating = `function FloatingMockup({ flyAway }: { flyAway: boolean }) {
  const ctrl = useAnimation();
  const flew = useRef(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Reveal layers
    const t = setTimeout(() => setStep(1), 1000); 
    const t2 = setTimeout(() => setStep(2), 5000); // Snaps into singular core
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  const mods = [
    { name:'E-Kebajikan',    gc:'#14b8a6', stat:'12',     sub:'Tiket Aktif',    icon:'🎫', offset: 0 },
    { name:'E-Keusahawanan', gc:'#22c55e', stat:'RM 2.8k', sub:'Jualan Hari Ini', icon:'💰', offset: 1 },
    { name:'E-Akademik',     gc:'#3b82f6', stat:'3.72',   sub:'CGPA Purata',    icon:'📊', offset: 2 },
    { name:'PolyMart',       gc:'#f97316', stat:'23',     sub:'Pesanan Aktif',  icon:'🛒', offset: 3 },
    { name:'Sistem Kelab',   gc:'#ef4444', stat:'127',    sub:'Ahli Aktif',     icon:'🏛️', offset: 4 },
  ];

  useEffect(()=>{
    if(flyAway){ 
       flew.current=true; ctrl.stop(); 
       ctrl.start({x:'100vw',opacity:0,scale:0.3,rotateY:80,rotateZ:15,filter:'blur(30px)',transition:{duration:1.2,ease:[0.25,1,0.5,1]}}); 
    } else { 
       ctrl.start({x:'4vw',rotateY:0,rotateX:0,opacity:1,scale:1,transition:{duration:2,ease:[0.25,1,0.5,1]}}).then(()=>{ 
         if(!flew.current) ctrl.start({y:[0,-10,0],transition:{duration:6,repeat:Infinity,ease:'easeInOut'}}); 
       }); 
    }
  },[flyAway,ctrl]);

  return (
    <motion.div animate={ctrl} initial={{x:'0vw',y:0,opacity:0,scale:5}} className="absolute right-[5vw] w-[45vw] h-[45vw] flex items-center justify-center z-20 pointer-events-none" style={{perspective:'2000px'}}>
      
      {/* 3D Stacked Isometric Architecture */}
      <motion.div 
         animate={
            step === 2 ? { rotateX: 20, rotateY: -15, rotateZ: 0, scale: 0.9 } : 
            { rotateX: 60, rotateY: 0, rotateZ: -45, scale: 0.85 }
         } 
         transition={{duration:2.5, ease:[0.76, 0, 0.24, 1]}}
         className="relative w-full h-full flex items-center justify-center"
         style={{transformStyle:'preserve-3d'}}
      >
        {mods.map((m, i) => (
          <motion.div 
             key={m.name}
             initial={{ z: 0, opacity: 0 }}
             animate={
               step === 2 ? { z: i * 20 - 40, opacity: 1, y: i * 30 - 60 } : // Stack tight or list view
               step >= 1 ? { z: i * 80 - 160, opacity: 1, y: 0 } : // Exploded isometric layers
               { z: 0, opacity: 0 }
             }
             transition={{duration:2, delay: i*0.1, ease:[0.25,1,0.5,1]}}
             className="absolute w-[24vw] h-[16vw] rounded-[1.5vw] border flex items-center justify-between p-[2vw] backdrop-blur-md"
             style={{
               background: \`linear-gradient(135deg, \${m.gc}15 0%, rgba(0,0,0,0.8) 100%)\`, 
               borderColor: m.gc + '50',
               boxShadow: \`0 20px 50px rgba(0,0,0,0.5), inset 0 0 20px \${m.gc}20\`
             }}
          >
             {/* Left Info */}
             <div className="flex flex-col gap-[0.5vw]">
                <div className="flex items-center gap-[1vw]">
                   <div className="w-[3vw] h-[3vw] rounded-[0.8vw] flex items-center justify-center text-[1.5vw] bg-black/50 border border-white/10" style={{boxShadow:\`0 0 15px \${m.gc}40\`}}>
                     {m.icon}
                   </div>
                   <p className="text-[1.5vw] font-bold text-white tracking-wide">{m.name}</p>
                </div>
                <div className="mt-[1vw]">
                   <p className="text-[2.5vw] font-black leading-none" style={{color:m.gc, textShadow:\`0 0 20px \${m.gc}80\`}}>{m.stat}</p>
                   <p className="text-[0.9vw] text-white/50 tracking-widest uppercase">{m.sub}</p>
                </div>
             </div>
             
             {/* Glowing Data Lines on Right */}
             <div className="flex flex-col gap-[0.6vw] w-[6vw]">
                {[1,2,3,4].map(line => (
                   <div key={line} className="w-full h-[0.4vw] rounded-full overflow-hidden bg-black/50">
                      <motion.div animate={{x:['-100%', '200%']}} transition={{duration:1.5 + Math.random(), repeat:Infinity, ease:'linear'}} className="w-1/2 h-full" style={{backgroundColor:m.gc}} />
                   </div>
                ))}
             </div>
             
          </motion.div>
        ))}

        {/* Central unifying pillar / beam when compressed */}
        <AnimatePresence>
           {step === 2 && (
             <motion.div initial={{opacity:0, scaleY:0}} animate={{opacity:1, scaleY:1}} exit={{opacity:0}} transition={{duration:1.5}} className="absolute w-[2vw] h-[20vw] bg-white mix-blend-overlay blur-[2px]" style={{boxShadow:'0 0 50px #fff'}} />
           )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
}

// ─── Scene 06`;

content = content.replace(floatingPattern, newFloating);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Scenes replaced successfully!');
{ z: 0, opacity: 0 }
             }
transition = {{ duration: 2, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
className = "absolute w-[24vw] h-[16vw] rounded-[1.5vw] border flex items-center justify-between p-[2vw] backdrop-blur-md"
style = {{
  background: \`linear-gradient(135deg, \${m.gc}15 0%, rgba(0,0,0,0.8) 100%)\`, 
               borderColor: m.gc + '50',
               boxShadow: \`0 20px 50px rgba(0,0,0,0.5), inset 0 0 20px \${m.gc}20\`
             }}
          >
             {/* Left Info */}
             <div className="flex flex-col gap-[0.5vw]">
                <div className="flex items-center gap-[1vw]">
                   <div className="w-[3vw] h-[3vw] rounded-[0.8vw] flex items-center justify-center text-[1.5vw] bg-black/50 border border-white/10" style={{boxShadow:\`0 0 15px \${m.gc}40\`}}>
                     {m.icon}
                   </div>
                   <p className="text-[1.5vw] font-bold text-white tracking-wide">{m.name}</p>
                </div>
                <div className="mt-[1vw]">
                   <p className="text-[2.5vw] font-black leading-none" style={{color:m.gc, textShadow:\`0 0 20px \${m.gc}80\`}}>{m.stat}</p>
                   <p className="text-[0.9vw] text-white/50 tracking-widest uppercase">{m.sub}</p>
                </div>
             </div>
             
             {/* Glowing Data Lines on Right */}
             <div className="flex flex-col gap-[0.6vw] w-[6vw]">
                {[1,2,3,4].map(line => (
                   <div key={line} className="w-full h-[0.4vw] rounded-full overflow-hidden bg-black/50">
                      <motion.div animate={{x:['-100%', '200%']}} transition={{duration:1.5 + Math.random(), repeat:Infinity, ease:'linear'}} className="w-1/2 h-full" style={{backgroundColor:m.gc}} />
                   </div>
                ))}
             </div>
             
          </motion.div>
        ))}

        {/* Central unifying pillar / beam when compressed */}
        <AnimatePresence>
           {step === 2 && (
             <motion.div initial={{opacity:0, scaleY:0}} animate={{opacity:1, scaleY:1}} exit={{opacity:0}} transition={{duration:1.5}} className="absolute w-[2vw] h-[20vw] bg-white mix-blend-overlay blur-[2px]" style={{boxShadow:'0 0 50px #fff'}} />
           )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
}

// ─── Scene 06`;

  content = content.replace(floatingPattern, newFloating);

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Scenes replaced successfully!');
