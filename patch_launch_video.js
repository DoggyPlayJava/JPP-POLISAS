const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'LaunchVideo.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. MODULES
content = content.replace(
  `  { name: 'Sistem Kelab',    tagline: 'Kelab bersatu, kenangan abadi.',             features: ['Pengurusan ahli & kelab','Rekod aktiviti & laporan','Papan pemuka Exco digital'],               nc:'text-red-400',     gc:'#ef4444', dc:'bg-red-400',     bg:'bg-red-600' },`,
  `  { name: 'Sistem Kelab',    tagline: 'Kelab bersatu, kenangan abadi.',             features: ['Pengurusan ahli & kelab','Rekod aktiviti & laporan','Papan pemuka Exco digital'],               nc:'text-red-400',     gc:'#ef4444', dc:'bg-red-400',     bg:'bg-red-600' },
  { name: 'Karnival JPP',    tagline: 'Kemeriahan kampus, kini digital.',           features: ['E-Tiket & tempahan tapak','Peta karnival interaktif','Live update aktiviti'],                   nc:'text-pink-400',    gc:'#ec4899', dc:'bg-pink-400',    bg:'bg-pink-600' },
  { name: 'JPP HQ Portal',   tagline: 'Dashboard eksklusif anda.',                  features: ['Analisis data berpusat','AI Assistant untuk laporan','Tetapan sistem global'],                  nc:'text-purple-400',  gc:'#a855f7', dc:'bg-purple-400',  bg:'bg-purple-600' },`
);

// 2. Timeline
content = content.replace(
`const TL: [number, number][] = [
  [1,2000],[2,4000],[3,6000],[4,6200],[5,7000],
  [6,10000],[7,13000],[8,16000],[9,18000],
  [10,21000],[11,33000],[12,45000],[13,57000],[14,69000],
  [15,81000],[16,85000],[17,89000],[18,91000],[19,97000],[20,102000],
];`,
`const TL: [number, number][] = [
  [1,2000],[2,4000],[3,6000],[4,6200],[5,7000],
  [6,10000],[7,13000],[8,16000],[9,18000],
  [10,21000],[11,33000],[12,45000],[13,57000],[14,69000],
  [15,81000],[16,93000],[17,105000],[18,109000],[19,113000],[20,115000],[21,121000],[22,126000]
];`
);

// 3. LABELS
content = content.replace(
`  'E-Kebajikan','E-Keusahawanan','E-Akademik','PolyMart','Sistem Kelab',`,
`  'E-Kebajikan','E-Keusahawanan','E-Akademik','PolyMart','Sistem Kelab','Karnival JPP','JPP HQ Portal',`
);

// 4. useEffect Timing engine
content = content.replace(
`      setTimeout(() => { setPhase(10); doWipe(0); }, 21000),
      setTimeout(() => doWipe(1), 33000),
      setTimeout(() => doWipe(2), 45000),
      setTimeout(() => doWipe(3), 57000),
      setTimeout(() => doWipe(4), 69000),
      setTimeout(() => setPhase(15), 81000),
      setTimeout(() => setPhase(16), 85000),
      setTimeout(() => setPhase(17), 89000),
      setTimeout(() => setPhase(18), 91000),
      setTimeout(() => setPhase(19), 97000),
      setTimeout(() => setPhase(20), 102000),`,
`      setTimeout(() => { setPhase(10); doWipe(0); }, 21000),
      setTimeout(() => doWipe(1), 33000),
      setTimeout(() => doWipe(2), 45000),
      setTimeout(() => doWipe(3), 57000),
      setTimeout(() => doWipe(4), 69000),
      setTimeout(() => doWipe(5), 81000),
      setTimeout(() => doWipe(6), 93000),
      setTimeout(() => setPhase(17), 105000),
      setTimeout(() => setPhase(18), 109000),
      setTimeout(() => setPhase(19), 113000),
      setTimeout(() => setPhase(20), 115000),
      setTimeout(() => setPhase(21), 121000),
      setTimeout(() => setPhase(22), 126000),`
);

// 5. Phase conditionals
content = content.replace(
  `{phase >= 10 && phase < 15 && moduleIdx >= 0 && (`,
  `{phase >= 10 && phase < 17 && moduleIdx >= 0 && (`
);
content = content.replace(
  `{phase === 18 && <TheNumbers key="nums" />}`,
  `{phase === 20 && <TheNumbers key="nums" />}`
);
content = content.replace(
  `{phase === 19 && (`,
  `{phase === 21 && (`
);
content = content.replace(
  `{phase >= 15 && phase < 18 && (`,
  `{phase >= 17 && phase < 20 && (`
);
content = content.replace(
  `{phase >= 20 && (`,
  `{phase >= 22 && (`
);
content = content.replace(
  `{phase+1}/21 — {LABELS[phase]}`,
  `{phase+1}/23 — {LABELS[phase]}`
);
content = content.replace(
  `{String(moduleIdx+1).padStart(2,'0')} <span className="text-white/20 font-light">/ 05</span>`,
  `{String(moduleIdx+1).padStart(2,'0')} <span className="text-white/20 font-light">/ 07</span>`
);
content = content.replace(
  `animate={{ scaleX: phase / 20 }}`,
  `animate={{ scaleX: phase / 22 }}`
);
content = content.replace(
  `<Mask show={phase>=16} delay={0.5} text="Satu Ekosistem." cls="text-[4vw] font-black tracking-tight text-white" />`,
  `<Mask show={phase>=18} delay={0.5} text="Satu Ekosistem." cls="text-[4vw] font-black tracking-tight text-white" />`
);
content = content.replace(
  `<Mask show={phase>=16} delay={0.9} text="5 Modul Bersepadu. Tanpa Kompromi." cls="text-[1.5vw] font-light tracking-widest text-white/50" />`,
  `<Mask show={phase>=18} delay={0.9} text="7 Modul Bersepadu. Tanpa Kompromi." cls="text-[1.5vw] font-light tracking-widest text-white/50" />`
);
content = content.replace(
  `flyAway={phase===17}`,
  `flyAway={phase===19}`
);
content = content.replace(
  `const nums = [['5','Modul Bersepadu'],['1','Platform Tunggal'],['∞','Kemungkinan']];`,
  `const nums = [['7','Modul Bersepadu'],['1','Platform Tunggal'],['∞','Kemungkinan']];`
);

// 6. Scenes
content = content.replace(
  `const Scenes = [KebajikanScene, KeusahawananScene, AkademikScene, PolyMartScene, SupsasScene];`,
  `const Scenes = [KebajikanScene, KeusahawananScene, AkademikScene, PolyMartScene, SupsasScene, KarnivalScene, JppHqScene];`
);

// 7. Floating mockup stats
content = content.replace(
`  const mods = [
    { name:'E-Kebajikan',    gc:'#14b8a6', stat:'12',     sub:'Tiket Aktif',    icon:'\\uD83C\\uDF9F' },
    { name:'E-Keusahawanan', gc:'#22c55e', stat:'RM 2.8k', sub:'Jualan Hari Ini', icon:'\\uD83D\\uDCB0' },
    { name:'E-Akademik',     gc:'#10b981', stat:'3.72',   sub:'CGPA Purata',    icon:'\\uD83D\\uDCCA' },
    { name:'PolyMart',       gc:'#f97316', stat:'23',     sub:'Pesanan Aktif',  icon:'\\uD83D\\uDED2' },
    { name:'Sistem Kelab',   gc:'#ef4444', stat:'127',    sub:'Ahli Aktif',     icon:'\\uD83C\\uDFDB' },
  ];`,
`  const mods = [
    { name:'E-Kebajikan',    gc:'#14b8a6', stat:'12',     sub:'Tiket Aktif',    icon:'\\uD83C\\uDF9F' },
    { name:'E-Keusahawanan', gc:'#22c55e', stat:'RM 2.8k', sub:'Jualan Hari Ini', icon:'\\uD83D\\uDCB0' },
    { name:'E-Akademik',     gc:'#10b981', stat:'3.72',   sub:'CGPA Purata',    icon:'\\uD83D\\uDCCA' },
    { name:'PolyMart',       gc:'#f97316', stat:'23',     sub:'Pesanan Aktif',  icon:'\\uD83D\\uDED2' },
    { name:'Sistem Kelab',   gc:'#ef4444', stat:'127',    sub:'Ahli Aktif',     icon:'\\uD83C\\uDFDB' },
    { name:'Karnival JPP',   gc:'#ec4899', stat:'890',    sub:'Tiket Terjual',  icon:'\\uD83C\\uDFAA' },
    { name:'JPP HQ Portal',  gc:'#a855f7', stat:'98%',    sub:'Skor Prestasi',  icon:'\\uD83D\\uDD2E' },
  ];`
);

// 8. Missing Scenes string (append to end)
const newScenes = \`

// ─── Scene 06: Karnival JPP — "Festival Ticket Scan" ──────────────────────
// Camera: fast ticket scan → zooms into map → festival overview
function KarnivalScene({ mod }: { mod: typeof MODULES[0] }) {
  const [act, setAct] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 300),   // Ticket pop
      setTimeout(() => setAct(2), 1500),  // Scan line
      setTimeout(() => setAct(3), 2500),  // Map zoom out
      setTimeout(() => setAct(4), 4000),  // Dashboard interface
      setTimeout(() => setAct(5), 6000),  // Live activity update
      setTimeout(() => setAct(6), 9500),  // Module overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  const gc = mod.gc;
  return (
    <CinematicEnvelope gc={gc}>
      {/* Ticket Macro */}
      <AnimatePresence>
        {act >= 1 && act < 3 && (
          <motion.div key="ticket" initial={{opacity:0,y:100,rotate:-5}} animate={act>=2?{opacity:1,y:0,rotate:0,scale:1.1}:{opacity:1,y:0,rotate:0}} exit={{opacity:0,scale:3,filter:'blur(20px)'}} transition={{duration:0.6,ease:PE}} className="absolute inset-0 flex items-center justify-center">
            <div className="w-[30vw] h-[14vw] rounded-[1vw] flex overflow-hidden border" style={{background:'#110814',borderColor:gc+'50'}}>
              <div className="w-[30%] flex flex-col justify-center items-center border-r border-dashed" style={{borderColor:gc+'40',background:gc+'15'}}>
                <span className="text-[4vw] opacity-80">🎟</span>
                <p className="text-[0.6vw] tracking-widest mt-[1vw]" style={{color:gc}}>VIP PASS</p>
              </div>
              <div className="flex-1 p-[2vw] flex flex-col justify-center">
                <p className="text-[2vw] font-black leading-none text-white">Malam Gala JPP</p>
                <p className="text-[0.8vw] text-white/50 mt-[0.5vw]">Dewan Jubli Perak · 8:00 PM</p>
                {act >= 2 && (
                  <motion.div initial={{width:0}} animate={{width:'100%'}} transition={{duration:0.5,ease:'linear'}} className="h-[0.4vw] mt-[1.5vw] rounded-full" style={{background:gc}} />
                )}
              </div>
            </div>
            {/* Scanline */}
            {act >= 2 && (
              <motion.div initial={{x:'-20vw'}} animate={{x:'20vw'}} transition={{duration:0.6}} className="absolute w-[2px] h-[30vw] rotate-12" style={{background:gc,boxShadow:\`0 0 30px 5px \${gc}\`}} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Impact flash on scan */}
      <AnimatePresence>
        {act === 2 && (
          <motion.div key="scan-flash" initial={{opacity:0}} animate={{opacity:[0,0.8,0]}} exit={{opacity:0}} transition={{duration:0.5}} className="absolute inset-0 z-50 pointer-events-none" style={{background:\`radial-gradient(circle, \${gc}88 0%, transparent 60%)\`}} />
        )}
      </AnimatePresence>

      {/* Full Dashboard */}
      <AnimatePresence>
        {act >= 3 && (
          <motion.div key="dashboard" initial={{opacity:0,scale:1.2,filter:'blur(15px)'}} animate={{opacity:1,scale:1,filter:'blur(0px)'}} transition={spS(0)} className="absolute inset-[5%] rounded-[1vw] border flex" style={{borderColor:gc+'30',background:'#0d0408'}}>
            {/* Left sidebar */}
            <div className="w-[22%] border-r p-[1vw] flex flex-col gap-[0.5vw]" style={{borderColor:gc+'20',background:'#080205'}}>
              <div className="flex items-center gap-[0.5vw] mb-[1vw]">
                <div className="w-[1.5vw] h-[1.5vw] rounded flex items-center justify-center" style={{background:gc+'30'}}><span className="text-[0.8vw]">🎪</span></div>
                <div><p className="text-[0.6vw] font-bold" style={{color:gc}}>Karnival JPP</p><p className="text-[0.45vw] text-white/40">Event Management</p></div>
              </div>
              {['Dashboard','Tiket & Pass','Peta Tapak','Vendor Makanan','Persembahan'].map((item,i)=>(
                <div key={item} className={\`text-[0.6vw] px-[0.6vw] py-[0.4vw] rounded \${i===0?'font-bold':'text-white/40'}\`} style={i===0?{background:gc+'20',color:gc}:{}}>{item}</div>
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 p-[1.5vw] flex flex-col gap-[1vw] relative">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[1.5vw] font-black text-white">Peta Karnival Live</p>
                  <p className="text-[0.7vw] text-white/50">Kemas kini masa nyata kehadiran</p>
                </div>
                <div className="px-[0.8vw] py-[0.3vw] rounded-full text-[0.6vw] font-bold border flex items-center gap-[0.4vw]" style={{borderColor:gc,color:gc,background:gc+'10'}}>
                  <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-current animate-pulse" /> LIVE
                </div>
              </div>
              
              <div className="flex-1 flex gap-[1vw]">
                {/* Map placeholder */}
                <div className="flex-[2] rounded-[0.8vw] border relative overflow-hidden" style={{borderColor:gc+'20',background:'#11050a'}}>
                  {/* Grid lines */}
                  <div className="absolute inset-0" style={{backgroundImage:\`linear-gradient(\${gc}10 1px, transparent 1px), linear-gradient(90deg, \${gc}10 1px, transparent 1px)\`,backgroundSize:'2vw 2vw'}} />
                  {/* Zones */}
                  {[
                    {name:'Zon Makanan',x:'10%',y:'20%',w:'30%',h:'40%',c:'#f59e0b'},
                    {name:'Pentas Utama',x:'50%',y:'10%',w:'40%',h:'30%',c:gc},
                    {name:'Zon Permainan',x:'15%',y:'65%',w:'70%',h:'25%',c:'#3b82f6'},
                  ].map((z,i)=>(
                    <motion.div key={z.name} initial={{scale:0,opacity:0}} animate={act>=4?{scale:1,opacity:1}:{}} transition={spB(i*0.15)} className="absolute border flex items-center justify-center text-[0.7vw] font-bold text-white/80" style={{left:z.x,top:z.y,width:z.w,height:z.h,background:z.c+'20',borderColor:z.c+'50'}}>
                      {z.name}
                    </motion.div>
                  ))}
                  {/* Heatmap blips */}
                  {act >= 5 && Array.from({length:10}).map((_,i)=>(
                    <motion.div key={i} className="absolute w-[1.5vw] h-[1.5vw] rounded-full mix-blend-screen" style={{left:\`\${Math.random()*80+10}%\`,top:\`\${Math.random()*80+10}%\`,background:\`radial-gradient(circle, \${gc}99 0%, transparent 70%)\`}} animate={{scale:[1,2,1],opacity:[0,0.8,0]}} transition={{duration:2+Math.random()*2,repeat:Infinity,delay:Math.random()}} />
                  ))}
                </div>
                {/* Stats */}
                <div className="flex-1 flex flex-col gap-[0.5vw]">
                  {[
                    {label:'Kehadiran Terkini',val:'1,482',sub:'+120 jam lepas',icon:'👥'},
                    {label:'Kapasiti Dewan',val:'85%',sub:'Mendekati maks',icon:'📊'},
                    {label:'Jualan Tiket',val:'RM 12.5k',sub:'Telah disahkan',icon:'🎟'}
                  ].map((s,i)=>(
                    <motion.div key={s.label} initial={{x:30,opacity:0}} animate={act>=4?{x:0,opacity:1}:{}} transition={{delay:0.3+i*0.1}} className="p-[1vw] rounded-[0.6vw] border" style={{borderColor:gc+'20',background:'#0e0408'}}>
                      <p className="text-[0.6vw] text-white/50 uppercase tracking-wider mb-[0.5vw] flex items-center gap-[0.4vw]"><span className="text-[0.8vw]">{s.icon}</span> {s.label}</p>
                      <p className="text-[1.8vw] font-black text-white leading-none mb-[0.2vw]">{s.val}</p>
                      <p className="text-[0.55vw]" style={{color:gc}}>{s.sub}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModuleOverlay show={act>=6} num="Modul 06" name="Karnival JPP" tagline={mod.tagline} gc={gc} />
    </CinematicEnvelope>
  );
}

// ─── Scene 07: JPP HQ Portal — "AI Command Center" ────────────────────────
// Camera: AI waveform pulse → expands to sleek executive dashboard with metrics
function JppHqScene({ mod }: { mod: typeof MODULES[0] }) {
  const [act, setAct] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setAct(1), 300),   // AI voice wave
      setTimeout(() => setAct(2), 2000),  // Wave form expands
      setTimeout(() => setAct(3), 2800),  // Dashboard grid lines appear
      setTimeout(() => setAct(4), 3800),  // Components fly in
      setTimeout(() => setAct(5), 5500),  // AI Assistant popover
      setTimeout(() => setAct(6), 9500),  // Module overlay
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  const gc = mod.gc;
  return (
    <CinematicEnvelope gc={gc}>
      {/* AI Voice Waveform */}
      <AnimatePresence>
        {act >= 1 && act < 3 && (
          <motion.div key="ai-wave" initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:3,filter:'blur(20px)'}} transition={{duration:0.8}} className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-[0.5vw] h-[10vw]">
              {Array.from({length:15}).map((_,i)=>(
                <motion.div key={i} className="w-[0.8vw] rounded-full" style={{background:gc}} animate={{height:['20%','100%','20%']}} transition={{duration:0.5+Math.random()*0.5,repeat:Infinity,delay:Math.random()}} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid lines sweep */}
      <AnimatePresence>
        {act === 3 && (
          <motion.div key="grid-sweep" initial={{opacity:0,y:'100%'}} animate={{opacity:0.3,y:'0%'}} exit={{opacity:0}} transition={{duration:1}} className="absolute inset-0 z-0" style={{backgroundImage:\`linear-gradient(\${gc} 1px, transparent 1px), linear-gradient(90deg, \${gc} 1px, transparent 1px)\`,backgroundSize:'5vw 5vw',perspective:'500px',transform:'rotateX(60deg)'}} />
        )}
      </AnimatePresence>

      {/* HQ Dashboard */}
      <AnimatePresence>
        {act >= 4 && (
          <motion.div key="hq-dash" initial={{opacity:0,y:40,rotateX:10}} animate={{opacity:1,y:0,rotateX:0}} transition={spB(0)} className="absolute inset-[6%] rounded-[1vw] border flex flex-col overflow-hidden" style={{borderColor:gc+'40',background:'#07020a'}}>
            {/* Header */}
            <div className="px-[1.5vw] py-[1vw] border-b flex justify-between items-center" style={{borderColor:gc+'20',background:'#0a030f'}}>
              <div className="flex items-center gap-[0.8vw]">
                <div className="w-[2vw] h-[2vw] rounded border flex items-center justify-center" style={{borderColor:gc,background:gc+'20'}}><span className="text-[1vw]">🧠</span></div>
                <div><p className="text-[1vw] font-black text-white leading-none">JPP HQ PORTAL</p><p className="text-[0.6vw] tracking-[0.2em] uppercase mt-[0.2vw]" style={{color:gc}}>Eksekutif Dashboard</p></div>
              </div>
              <div className="flex gap-[1vw]">
                <div className="text-right">
                  <p className="text-[0.55vw] text-white/40">Status Sistem Global</p>
                  <p className="text-[0.8vw] font-bold text-green-400">Normal — 99.9% Uptime</p>
                </div>
              </div>
            </div>
            {/* Grid content */}
            <div className="flex-1 p-[1.5vw] grid grid-cols-3 gap-[1.5vw]">
              {/* Left col */}
              <div className="flex flex-col gap-[1vw]">
                <motion.div initial={{x:-20,opacity:0}} animate={{x:0,opacity:1}} transition={sp(0.2)} className="p-[1vw] rounded-[0.8vw] border" style={{borderColor:gc+'20',background:'#0e0414'}}>
                  <p className="text-[0.7vw] text-white/50 mb-[1vw]">Penggunaan Modul (7 Hari)</p>
                  <div className="flex flex-col gap-[0.6vw]">
                    {[{n:'E-Kebajikan',p:85},{n:'PolyMart',p:65},{n:'E-Akademik',p:45}].map(m=>(
                      <div key={m.n}>
                        <div className="flex justify-between text-[0.6vw] text-white/70 mb-[0.2vw]"><span>{m.n}</span><span>{m.p}%</span></div>
                        <div className="h-[0.4vw] bg-white/10 rounded-full"><motion.div initial={{width:0}} animate={{width:\`\${m.p}%\`}} transition={{duration:1,delay:0.5}} className="h-full rounded-full" style={{background:gc}} /></div>
                      </div>
                    ))}
                  </div>
                </motion.div>
                <motion.div initial={{x:-20,opacity:0}} animate={{x:0,opacity:1}} transition={sp(0.3)} className="p-[1vw] rounded-[0.8vw] border flex-1" style={{borderColor:gc+'20',background:'#0e0414'}}>
                   <p className="text-[0.7vw] text-white/50 mb-[0.5vw]">Notifikasi Sistem Terkini</p>
                   {['Backup pangkalan data berjaya (2am)','Kemas kini modul E-Kebajikan v1.2','Laporan kewangan JPP dijanakan'].map((n,i)=>(
                     <div key={i} className="py-[0.5vw] text-[0.65vw] text-white/70 border-b last:border-0" style={{borderColor:gc+'10'}}>{n}</div>
                   ))}
                </motion.div>
              </div>
              {/* Middle & Right cols -> combined graph & AI */}
              <div className="col-span-2 flex flex-col gap-[1vw]">
                <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} transition={sp(0.4)} className="p-[1vw] rounded-[0.8vw] border flex-[2] relative overflow-hidden" style={{borderColor:gc+'20',background:'#0e0414'}}>
                  <p className="text-[0.7vw] text-white/50 mb-[1vw]">Analitik Keseluruhan</p>
                  <div className="absolute inset-x-0 bottom-0 h-[60%] flex items-end px-[1vw] gap-[0.5vw]">
                    {Array.from({length:20}).map((_,i)=>(
                      <motion.div key={i} initial={{height:0}} animate={{height:\`\${Math.random()*80+20}%\`}} transition={{duration:0.8,delay:0.5+i*0.02}} className="flex-1 rounded-t-sm" style={{background:gc+'40'}} />
                    ))}
                  </div>
                  <div className="relative z-10 flex gap-[2vw]">
                    <div><p className="text-[0.6vw] text-white/40 uppercase">Total User</p><p className="text-[2.5vw] font-black text-white">4,892</p></div>
                    <div><p className="text-[0.6vw] text-white/40 uppercase">Data Terkumpul</p><p className="text-[2.5vw] font-black" style={{color:gc}}>1.2 TB</p></div>
                  </div>
                </motion.div>
                
                {/* AI Assistant Popover */}
                <AnimatePresence>
                  {act >= 5 && (
                    <motion.div initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={spB(0)} className="p-[1vw] rounded-[0.8vw] border flex-1 flex items-center gap-[1vw]" style={{borderColor:gc+'50',background:gc+'15'}}>
                      <motion.div animate={{rotate:360}} transition={{duration:8,repeat:Infinity,ease:'linear'}} className="text-[2.5vw]">✨</motion.div>
                      <div>
                        <p className="text-[0.8vw] font-bold text-white mb-[0.2vw]">JPP AI — Laporan Mingguan Siap!</p>
                        <p className="text-[0.65vw] text-white/60">Sistem mengesan peningkatan 12% dalam aduan asrama. Adakah anda mahu saya sediakan draf kertas kerja penyelenggaraan?</p>
                        <div className="flex gap-[0.5vw] mt-[0.5vw]">
                          <div className="px-[0.6vw] py-[0.2vw] text-[0.55vw] rounded bg-white text-black font-bold cursor-pointer">Ya, Jana Draf</div>
                          <div className="px-[0.6vw] py-[0.2vw] text-[0.55vw] rounded border text-white/70 cursor-pointer" style={{borderColor:gc}}>Bukan Sekarang</div>
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

      <ModuleOverlay show={act>=6} num="Modul 07" name="JPP HQ Portal" tagline={mod.tagline} gc={gc} />
    </CinematicEnvelope>
  );
}
\`

if (!content.includes('KarnivalScene')) {
  fs.writeFileSync(filePath, content + newScenes);
  console.log("Patched successfully!");
} else {
  console.log("Already patched.");
}
