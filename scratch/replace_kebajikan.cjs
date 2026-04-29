const fs = require('fs');
const file = 'src/pages/LaunchVideo.tsx';
const content = fs.readFileSync(file, 'utf8');

const sIdx = content.indexOf('function KebajikanScene');
const eIdx = content.indexOf('function KebajikanPanel');

if (sIdx > -1 && eIdx > -1) {
  const head = content.slice(0, sIdx);
  const tail = content.slice(eIdx);

  const newScene = `function KebajikanScene({ mod }: SceneProps) {
  const [act, setAct] = useState(0);
  const [msgs, setMsgs] = useState<number[]>([]);
  const [typing, setTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const gc = mod.gc;

  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    
    // Timeline
    ts.push(setTimeout(() => setAct(1), 300));   // Dashboard flies in
    ts.push(setTimeout(() => setAct(2), 2500));  // Click 'Aduan Baru'
    ts.push(setTimeout(() => setAct(3), 3200));  // Dashboard zoom out, Phone fly in
    
    const CHAT_START = 4200; // Chat begins after phone enters
    CHAT_MSGS.forEach((msg, i) => {
      if (msg.from === 'exco') {
        ts.push(setTimeout(() => setTyping(true), CHAT_START + msg.delay - 900));
      }
      ts.push(setTimeout(() => {
        setTyping(false);
        setMsgs(prev => [...prev, i]);
        setTimeout(() => chatRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
      }, CHAT_START + msg.delay));
    });
    ts.push(setTimeout(() => setAct(6), 10500)); // Module overlay
    return () => ts.forEach(clearTimeout);
  }, []);
  
  return (
    <CinematicEnvelope gc={gc}>

      <div className="absolute inset-0 flex items-center justify-center" style={{perspective:'1800px'}}>
        {/* Background ambient glow */}
        <motion.div className="absolute inset-0 pointer-events-none"
          animate={{opacity:[0.08,0.18,0.08]}} transition={{duration:4,repeat:Infinity,ease:'easeInOut'}}
          style={{background:\`radial-gradient(ellipse at 50% 40%, \${gc} 0%, transparent 65%)\`}} />

        {/* Phase 1 & 2: Dashboard */}
        <AnimatePresence>
          {act >= 1 && act < 3 && (
            <motion.div
              initial={{opacity:0, scale:0.85, rotateX:15, y:40}}
              animate={{opacity:1, scale:1, rotateX:0, y:0}}
              exit={{opacity:0, scale:1.3, filter:'blur(20px)', y:-30}}
              transition={{duration:1.2, ease:CE}}
              className="absolute w-[45vw] rounded-[1.2vw] p-[2vw] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
              style={{background:'rgba(10,12,18,0.9)', backdropFilter:'blur(20px)', transformStyle:'preserve-3d'}}>
                
                <div className="flex justify-between items-center mb-[2vw]">
                  <div>
                    <h2 className="text-[2vw] font-black tracking-tight" style={{color:gc}}>E-Kebajikan</h2>
                    <p className="text-[0.8vw] text-white/50">Sistem Pengurusan Aduan Pelajar</p>
                  </div>
                  {/* The CTA button */}
                  <motion.div
                    animate={act >= 2 ? {scale:0.95, filter:'brightness(1.5)'} : {}}
                    transition={{duration:0.2}}
                    className="px-[1.5vw] py-[0.8vw] rounded-full flex items-center gap-[0.5vw] shadow-lg cursor-pointer"
                    style={{background:gc, color:'#000'}}>
                    <span className="text-[1vw]">✏️</span>
                    <span className="text-[0.8vw] font-bold">+ Buat Aduan Baru</span>
                  </motion.div>
                </div>

                {/* Dashboard content blocks */}
                <div className="flex gap-[1vw]">
                  <div className="flex-1 rounded-[0.8vw] p-[1vw] border border-white/5 bg-[#12141a]">
                    <p className="text-[0.6vw] text-white/40 uppercase mb-[0.5vw]">Status Aduan Terkini</p>
                    <div className="flex items-center gap-[0.5vw] py-[0.5vw] border-b border-white/5">
                      <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-green-500"></div>
                      <p className="text-[0.7vw] flex-1">Aduan fasiliti bilik mandi</p>
                      <p className="text-[0.6vw] text-white/40">Selesai</p>
                    </div>
                    <div className="flex items-center gap-[0.5vw] py-[0.5vw]">
                      <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-yellow-500"></div>
                      <p className="text-[0.7vw] flex-1">Masalah Wi-Fi Kolej Kediaman</p>
                      <p className="text-[0.6vw] text-white/40">Dalam Tindakan</p>
                    </div>
                  </div>
                  <div className="w-[30%] rounded-[0.8vw] p-[1vw] border border-white/5 bg-[#12141a] flex flex-col items-center justify-center">
                    <p className="text-[2vw] font-black" style={{color:gc}}>98%</p>
                    <p className="text-[0.6vw] text-white/40 text-center">Kadar Selesai Kes<br/>Bulan Ini</p>
                  </div>
                </div>

                {/* Click Ripple Effect over the button */}
                <AnimatePresence>
                  {act >= 2 && (
                    <motion.div initial={{scale:0, opacity:0.8}} animate={{scale:3, opacity:0}} transition={{duration:0.6}}
                      className="absolute top-[3vw] right-[5vw] w-[4vw] h-[4vw] rounded-full bg-white pointer-events-none" />
                  )}
                </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 3+: 3D Phone mockup container (Chat) */}
        <AnimatePresence>
          {act >= 3 && (
            <motion.div
              key="phone"
              initial={{rotateY:25,rotateX:10,scale:0.6,opacity:0,y:100,filter:'blur(15px)'}}
              animate={{rotateY:-8,rotateX:4,scale:1,opacity:1,y:0,filter:'blur(0px)'}}
              transition={{duration:1.5,ease:CE}}
              className="absolute w-[22vw] h-[42vw] rounded-[2.5vw] overflow-hidden flex flex-col"
              style={{
                background:'linear-gradient(145deg,#111218,#08090e)',
                boxShadow:\`-30px 30px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 40px \${gc}15\`,
                transformStyle:'preserve-3d',
                zIndex: 10
              }}>
              {/* Status bar */}
              <div className="flex items-center justify-between px-[1.2vw] py-[0.5vw] flex-shrink-0" style={{background:'#0a0b10'}}>
                <span className="text-[0.45vw] text-white/40 font-mono">9:41</span>
                <div className="flex gap-[0.3vw] items-center">
                  <div className="w-[0.8vw] h-[0.4vw] rounded-sm bg-white/30"/>
                  <div className="text-[0.4vw] text-white/30">●●●</div>
                </div>
              </div>

              {/* App header */}
              <div className="flex items-center gap-[0.6vw] px-[1.2vw] py-[0.8vw] flex-shrink-0 border-b" style={{borderColor:gc+'20',background:'#0d0e14'}}>
                <motion.div animate={{boxShadow:[\`0 0 0 0 \${gc}60\`,\`0 0 0 6px \${gc}00\`]}} transition={{duration:1.5,repeat:Infinity,ease:'easeOut'}}
                  className="w-[2.2vw] h-[2.2vw] rounded-full flex items-center justify-center text-[0.9vw] flex-shrink-0"
                  style={{background:\`linear-gradient(135deg,\${gc}40,\${gc}20)\`}}>🎓</motion.div>
                <div className="flex-1">
                  <p className="text-[0.65vw] font-bold text-white">Exco Kebajikan JPP</p>
                  <div className="flex items-center gap-[0.3vw]">
                    <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-green-400" />
                    <p className="text-[0.4vw] text-green-400">Dalam talian</p>
                  </div>
                </div>
                <span className="text-[0.5vw] px-[0.5vw] py-[0.15vw] rounded-full font-medium" style={{background:gc+'25',color:gc}}>Kebajikan</span>
              </div>

              {/* Chat messages */}
              <div ref={chatRef} className="flex-1 flex flex-col gap-[0.7vw] p-[1vw] overflow-hidden" style={{background:'#08090d'}}>
                {/* Ticket creation notice */}
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.3}}
                  className="self-center px-[0.8vw] py-[0.3vw] rounded-full text-[0.42vw] text-white/30 flex items-center gap-[0.3vw]"
                  style={{background:'rgba(255,255,255,0.04)'}}>
                  <span style={{color:gc}}>●</span> Tiket ADU-2024-089 dibuka secara automatik
                </motion.div>

                {msgs.map(i => {
                  const msg = CHAT_MSGS[i];
                  const isStudent = msg.from === 'student';
                  return (
                    <motion.div key={i}
                      initial={{opacity:0,x:isStudent?-20:20,scale:0.92}}
                      animate={{opacity:1,x:0,scale:1}}
                      transition={{duration:0.35,ease:[0.23,1,0.32,1]}}
                      className={\`flex flex-col \${isStudent?'items-start':'items-end'} gap-[0.2vw]\`}>
                      <div className={\`max-w-[80%] px-[0.9vw] py-[0.6vw] rounded-[1.2vw] text-[0.55vw] leading-relaxed\`}
                        style={isStudent
                          ? {background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.85)',borderBottomLeftRadius:'0.3vw',border:'1px solid rgba(255,255,255,0.06)'}
                          : {background:gc,color:'#000',borderBottomRightRadius:'0.3vw',fontWeight:600}}>
                        {msg.text}
                      </div>
                      <span className="text-[0.36vw] text-white/20 px-[0.3vw]">{isStudent?'Pelajar':'Exco Kebajikan'} · Sekarang</span>
                    </motion.div>
                  );
                })}

                {typing && (
                  <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="flex items-center gap-[0.2vw] px-[0.9vw] py-[0.6vw] rounded-[1.2vw] w-fit" style={{background:gc}}>
                    {[0,1,2].map(d=>(
                      <motion.div key={d} className="w-[0.35vw] h-[0.35vw] bg-black rounded-full" animate={{y:[0,-3,0]}} transition={{duration:0.6,repeat:Infinity,delay:d*0.1}} />
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Chat Input area */}
              <div className="p-[1vw] border-t border-white/5" style={{background:'#0a0b10'}}>
                <div className="h-[2vw] rounded-full flex items-center px-[0.8vw] justify-between" style={{background:'#151720',border:'1px solid rgba(255,255,255,0.05)'}}>
                  <span className="text-[0.6vw] text-white/30">Taip mesej...</span>
                  <div className="w-[1.2vw] h-[1.2vw] rounded-full flex items-center justify-center text-[0.6vw]" style={{background:gc+'30',color:gc}}>➤</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar Status Panels (Only show when Dashboard disappears to keep focus) */}
        <AnimatePresence>
          {act >= 3 && act < 6 && (
            <motion.div initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,scale:0.95}} transition={{duration:1,delay:0.5,ease:CE}}
              className="absolute right-[8vw] top-[50%] flex flex-col gap-[1vw]" style={{translateY:'-50%'}}>
              
              <div className="w-[14vw] rounded-[1vw] p-[1.5vw] border border-white/5" style={{background:'rgba(15,16,22,0.6)',backdropFilter:'blur(20px)'}}>
                <p className="text-[0.55vw] tracking-[0.2em] text-white/40 mb-[0.3vw]">MASA TINDAK BALAS</p>
                <div className="flex items-center gap-[0.6vw]">
                  <span className="text-[1.5vw]">⚡</span>
                  <p className="text-[2.2vw] font-black tracking-tight" style={{color:gc}}>{'<'} 2 Jam</p>
                </div>
              </div>

              <div className="w-[14vw] rounded-[1vw] p-[1.5vw] border border-white/5" style={{background:'rgba(15,16,22,0.6)',backdropFilter:'blur(20px)'}}>
                <p className="text-[0.55vw] tracking-[0.2em] text-white/40 mb-[0.3vw]">KES DISELESAIKAN</p>
                <div className="flex items-center gap-[0.6vw]">
                  <span className="text-[1.5vw]">✅</span>
                  <p className="text-[2.2vw] font-black tracking-tight" style={{color:gc}}>98%</p>
                </div>
              </div>

              <div className="w-[14vw] rounded-[1vw] p-[1.5vw] border border-white/5" style={{background:'rgba(15,16,22,0.6)',backdropFilter:'blur(20px)'}}>
                <p className="text-[0.55vw] tracking-[0.2em] text-white/40 mb-[0.3vw]">TIKET AKTIF HARI INI</p>
                <div className="flex items-center gap-[0.6vw]">
                  <span className="text-[1.5vw]">🎫</span>
                  <p className="text-[2.2vw] font-black tracking-tight" style={{color:gc}}>12</p>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        <ModuleOverlay show={act>=6} num="Modul 01" name="E-Kebajikan" tagline={mod.tagline} gc={gc} />
      </div>
    </CinematicEnvelope>
  );
}
`;

  fs.writeFileSync(file, head + newScene + tail, 'utf8');
  console.log('Successfully replaced KebajikanScene');
} else {
  console.log('Could not find bounds');
}
