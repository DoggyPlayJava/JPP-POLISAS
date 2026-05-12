import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

export function KarnivalEffects() {
  const [confettiDone, setConfettiDone] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

  // Smooth springs for spotlight and cursor trail
  const spotX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const spotY = useSpring(mouseY, { stiffness: 100, damping: 30 });
  
  const cursorX = useSpring(mouseX, { stiffness: 400, damping: 25 });
  const cursorY = useSpring(mouseY, { stiffness: 400, damping: 25 });
  
  const trailX = useSpring(mouseX, { stiffness: 150, damping: 35 });
  const trailY = useSpring(mouseY, { stiffness: 150, damping: 35 });

  useEffect(() => {
    let animationFrameId: number;
    let autoPanTime = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    
    // Touch Ripple effect
    const handleTouchOrClick = (e: MouseEvent | TouchEvent) => {
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const newRipple = { id: Date.now(), x: clientX, y: clientY };
      setRipples(prev => [...prev, newRipple]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 1000);
    };

    // Automated panning for the spotlight (kicks in if mouse doesn't move or on mobile)
    const renderLoop = () => {
      autoPanTime += 0.005;
      // If mouse is at 0,0 (initial state on mobile), use auto pan
      if (mouseX.get() === 0 && mouseY.get() === 0) {
        const ww = window.innerWidth;
        const wh = window.innerHeight;
        // Figure 8 pattern
        const cx = ww / 2 + Math.sin(autoPanTime) * (ww / 3);
        const cy = wh / 2 + Math.sin(autoPanTime * 2) * (wh / 4);
        spotX.set(cx);
        spotY.set(cy);
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleTouchOrClick);
    window.addEventListener('touchstart', handleTouchOrClick, { passive: true });
    
    renderLoop();
    const t = setTimeout(() => setConfettiDone(true), 15000);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleTouchOrClick);
      window.removeEventListener('touchstart', handleTouchOrClick);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(t);
    };
  }, [mouseX, mouseY, spotX, spotY]);

  return (
    <>
      {/* Heavy Cinematic Vignette */}
      <div className="fixed inset-0 z-[1] pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] mix-blend-multiply" />

      {/* Upgraded Aurora Blobs with Color Dodge */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none mix-blend-color-dodge">
        <div className="absolute -top-[15%] -left-[10%] w-[80vw] h-[80vw] rounded-full opacity-40 blur-[120px]" style={{ background: 'radial-gradient(circle, #c084fc 0%, transparent 70%)', animation: 'aurora-blob-1 25s ease-in-out infinite' }} />
        <div className="absolute top-[50%] -right-[15%] w-[70vw] h-[70vw] rounded-full opacity-30 blur-[120px]" style={{ background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)', animation: 'aurora-blob-2 30s ease-in-out infinite' }} />
        <div className="absolute top-[20%] left-[40%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[140px]" style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)', animation: 'aurora-blob-1 40s ease-in-out infinite reverse' }} />
      </div>

      {/* Dynamic Spotlight */}
      <motion.div
        className="fixed inset-0 z-[2] pointer-events-none"
        style={{
          background: useMotionTemplate`radial-gradient(600px circle at ${spotX}px ${spotY}px, rgba(192, 132, 252, 0.15), transparent 80%)`,
          mixBlendMode: 'screen'
        }}
      />

      {/* Neon Cursor Trail */}
      <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden hidden md:block">
        <motion.div
          className="absolute w-4 h-4 rounded-full bg-white/80 blur-[2px]"
          style={{ x: cursorX, y: cursorY, translateX: '-50%', translateY: '-50%', boxShadow: '0 0 20px 5px rgba(244,114,182,0.8)' }}
        />
        <motion.div
          className="absolute w-8 h-8 rounded-full bg-violet-500/40 blur-[8px]"
          style={{ x: trailX, y: trailY, translateX: '-50%', translateY: '-50%', boxShadow: '0 0 30px 10px rgba(192,132,252,0.5)' }}
        />
      </div>

      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-10px) rotate(0deg);    opacity: 1; }
          85%  { opacity: 0.8; }
          100% { transform: translateY(105vh) rotate(1080deg); opacity: 0; }
        }
        @keyframes aurora-blob-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(60px, -40px) scale(1.1); }
          66%       { transform: translate(-30px, 30px) scale(0.95); }
        }
        @keyframes aurora-blob-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          40%       { transform: translate(-70px, 40px) scale(1.15); }
          70%       { transform: translate(40px, -30px) scale(0.9); }
        }
        @keyframes ripple-burst {
          0% { transform: scale(0); opacity: 1; border-width: 4px; }
          100% { transform: scale(4); opacity: 0; border-width: 0px; }
        }
      `}</style>

      {/* Touch Ripples */}
      <div className="fixed inset-0 z-[101] pointer-events-none overflow-hidden">
        {ripples.map(r => (
          <div
            key={r.id}
            className="absolute rounded-full border-violet-500"
            style={{
              left: r.x, top: r.y,
              width: 40, height: 40,
              marginLeft: -20, marginTop: -20,
              animation: 'ripple-burst 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
              boxShadow: '0 0 20px rgba(168,85,247,0.6)'
            }}
          />
        ))}
      </div>

      {/* Confetti Layer (15s) */}
      {!confettiDone && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {[
            { l: '3%', s: 8, r: 0.5, c: '#a855f7', d: '3.1s', dl: '2.0s', sh: 'square' },
            { l: '7%', s: 6, r: 1.8, c: '#fbbf24', d: '4.2s', dl: '2.3s', sh: 'rect' },
            { l: '11%', s: 9, r: 1, c: '#f472b6', d: '3.5s', dl: '2.7s', sh: 'circle' },
            { l: '15%', s: 7, r: 0.6, c: '#818cf8', d: '5.0s', dl: '2.1s', sh: 'square' },
            { l: '19%', s: 10, r: 1.5, c: '#c084fc', d: '3.8s', dl: '3.2s', sh: 'rect' },
            { l: '23%', s: 5, r: 1, c: '#e879f9', d: '4.5s', dl: '2.5s', sh: 'circle' },
            { l: '27%', s: 8, r: 0.7, c: '#fbbf24', d: '3.2s', dl: '2.9s', sh: 'square' },
            { l: '31%', s: 6, r: 2, c: '#a78bfa', d: '4.8s', dl: '2.2s', sh: 'rect' },
            { l: '35%', s: 9, r: 1, c: '#f9a8d4', d: '3.6s', dl: '3.4s', sh: 'circle' },
            { l: '39%', s: 7, r: 0.5, c: '#7c3aed', d: '5.2s', dl: '2.6s', sh: 'square' },
            { l: '43%', s: 11, r: 1.3, c: '#f472b6', d: '3.4s', dl: '2.4s', sh: 'rect' },
            { l: '47%', s: 6, r: 1, c: '#fbbf24', d: '4.1s', dl: '3.1s', sh: 'circle' },
            { l: '51%', s: 8, r: 0.8, c: '#c084fc', d: '3.9s', dl: '2.8s', sh: 'square' },
            { l: '55%', s: 7, r: 1.6, c: '#818cf8', d: '4.7s', dl: '2.0s', sh: 'rect' },
            { l: '59%', s: 9, r: 1, c: '#a855f7', d: '3.3s', dl: '3.3s', sh: 'circle' },
            { l: '63%', s: 6, r: 0.6, c: '#e879f9', d: '5.1s', dl: '2.3s', sh: 'square' },
            { l: '67%', s: 10, r: 1.4, c: '#fbbf24', d: '3.7s', dl: '2.7s', sh: 'rect' },
            { l: '71%', s: 7, r: 1, c: '#f9a8d4', d: '4.4s', dl: '3.0s', sh: 'circle' },
            { l: '75%', s: 8, r: 0.7, c: '#7c3aed', d: '3.0s', dl: '2.5s', sh: 'square' },
            { l: '79%', s: 6, r: 2, c: '#a78bfa', d: '4.9s', dl: '2.2s', sh: 'rect' },
            { l: '83%', s: 9, r: 1, c: '#c084fc', d: '3.5s', dl: '3.5s', sh: 'circle' },
            { l: '87%', s: 7, r: 0.5, c: '#fbbf24', d: '5.3s', dl: '2.6s', sh: 'square' },
            { l: '91%', s: 8, r: 1.7, c: '#f472b6', d: '3.8s', dl: '2.9s', sh: 'rect' },
            { l: '95%', s: 6, r: 1, c: '#818cf8', d: '4.3s', dl: '2.1s', sh: 'circle' },
            { l: '5%', s: 7, r: 0.8, c: '#e879f9', d: '4.6s', dl: '3.8s', sh: 'square' },
            { l: '13%', s: 9, r: 1.2, c: '#fbbf24', d: '3.1s', dl: '4.1s', sh: 'rect' },
            { l: '22%', s: 6, r: 1, c: '#a855f7', d: '5.0s', dl: '3.7s', sh: 'circle' },
            { l: '33%', s: 10, r: 0.6, c: '#f9a8d4', d: '3.4s', dl: '4.3s', sh: 'square' },
            { l: '44%', s: 7, r: 1.5, c: '#7c3aed', d: '4.2s', dl: '3.6s', sh: 'rect' },
            { l: '56%', s: 8, r: 1, c: '#c084fc', d: '3.7s', dl: '4.0s', sh: 'circle' },
            { l: '68%', s: 6, r: 0.7, c: '#fbbf24', d: '4.8s', dl: '3.9s', sh: 'square' },
            { l: '77%', s: 9, r: 1.3, c: '#a78bfa', d: '3.2s', dl: '4.4s', sh: 'rect' },
            { l: '89%', s: 7, r: 1, c: '#f472b6', d: '5.1s', dl: '3.5s', sh: 'circle' },
          ].map((p, i) => (
            <div key={i} style={{
              position: 'absolute', top: 0, left: p.l,
              width: p.s,
              height: p.sh === 'circle' ? p.s : p.sh === 'square' ? p.s : p.s * p.r,
              borderRadius: p.sh === 'circle' ? '50%' : '2px',
              backgroundColor: p.c,
              animationName: 'confetti-fall',
              animationDuration: p.d,
              animationDelay: p.dl,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
            }} />
          ))}
        </div>
      )}

      {/* Spring Physics Micro-Particles */}
      <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
        {[
          { x: 8, y: 15, s: 3, c: '#c084fc', d: 2.1 },
          { x: 15, y: 45, s: 2, c: '#fbbf24', d: 3.0 },
          { x: 22, y: 72, s: 4, c: '#f472b6', d: 2.5 },
          { x: 31, y: 28, s: 2, c: '#818cf8', d: 3.5 },
          { x: 40, y: 60, s: 3, c: '#a855f7', d: 2.3 },
          { x: 50, y: 18, s: 5, c: '#fbbf24', d: 2.8 },
          { x: 58, y: 80, s: 2, c: '#e879f9', d: 3.2 },
          { x: 66, y: 35, s: 4, c: '#c084fc', d: 2.0 },
          { x: 74, y: 65, s: 3, c: '#f9a8d4', d: 3.7 },
          { x: 82, y: 22, s: 2, c: '#7c3aed', d: 2.6 },
          { x: 89, y: 52, s: 4, c: '#fbbf24', d: 3.1 },
          { x: 94, y: 78, s: 3, c: '#a78bfa', d: 2.4 },
          { x: 5, y: 88, s: 2, c: '#f472b6', d: 3.3 },
          { x: 27, y: 10, s: 3, c: '#818cf8', d: 2.7 },
          { x: 70, y: 5, s: 4, c: '#c084fc', d: 3.0 },
          { x: 45, y: 92, s: 2, c: '#fbbf24', d: 2.2 },
          { x: 55, y: 48, s: 3, c: '#e879f9', d: 2.9 },
          { x: 12, y: 58, s: 4, c: '#a855f7', d: 3.4 },
        ].map((sp, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full mix-blend-screen"
            style={{ 
              left: `${sp.x}%`, 
              top: `${sp.y}%`,
              width: sp.s, 
              height: sp.s,
              backgroundColor: sp.c,
            }}
            animate={{
              y: [0, -30, 0, 20, 0],
              x: [0, 20, 0, -20, 0],
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: sp.d * 2,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.25, 0.5, 0.75, 1]
            }}
          />
        ))}
      </div>
    </>
  );
}

