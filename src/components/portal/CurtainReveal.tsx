import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function CurtainReveal({ karnivalActive, supsasActive }: { karnivalActive: boolean, supsasActive: boolean }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!karnivalActive && !supsasActive) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex overflow-hidden">
          {karnivalActive && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="absolute inset-0 bg-[#0a0a0a]"
            >
              <motion.div
                initial={{ top: '-20%' }}
                animate={{ top: '120%' }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute left-0 w-full h-[20vh] bg-gradient-to-b from-transparent via-pink-500/20 to-pink-500/80 border-b-[4px] border-pink-400 shadow-[0_20px_50px_rgba(236,72,153,1)]"
              >
                <div className="absolute bottom-0 w-full h-[1px] bg-white opacity-50" />
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 1.2 }}
                className="absolute inset-0 flex items-center justify-center mix-blend-screen"
              >
                <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 tracking-tighter drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]">
                  KARNIVAL
                </h1>
              </motion.div>
            </motion.div>
          )}

          {supsasActive && !karnivalActive && (
            <>
              {/* Left Door */}
              <motion.div
                initial={{ x: '0%' }}
                exit={{ x: '-100%' }}
                transition={{ duration: 1.2, ease: [0.83, 0, 0.17, 1], delay: 0.5 }}
                className="w-1/2 h-full bg-slate-900 border-r-4 border-yellow-500 shadow-[20px_0_50px_rgba(0,0,0,0.8)] relative z-20 flex items-center justify-end pr-2 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]" />
                <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-400 tracking-tighter absolute right-0 translate-x-[50%]">
                  SUP
                </h1>
              </motion.div>
              
              {/* Right Door */}
              <motion.div
                initial={{ x: '0%' }}
                exit={{ x: '100%' }}
                transition={{ duration: 1.2, ease: [0.83, 0, 0.17, 1], delay: 0.5 }}
                className="w-1/2 h-full bg-slate-900 border-l-4 border-yellow-500 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] relative z-20 flex items-center justify-start pl-2 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]" />
                <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 tracking-tighter absolute left-0 -translate-x-[50%]">
                  SAS
                </h1>
              </motion.div>
              
              {/* Flash / Light burst behind doors */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                exit={{ opacity: 1, scale: 2 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="absolute inset-0 m-auto w-32 h-32 bg-yellow-400 rounded-full blur-[100px] z-10"
              />
            </>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
