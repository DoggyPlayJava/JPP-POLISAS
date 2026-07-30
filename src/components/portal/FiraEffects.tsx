import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function FiraEffects() {
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

  const spotX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const spotY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  useEffect(() => {
    // Initial celebration burst
    const end = Date.now() + 2.5 * 1000;
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors: ['#ffd700', '#f59e0b', '#e2e8f0', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors: ['#ffd700', '#f59e0b', '#e2e8f0', '#ffffff']
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {/* Dynamic Gold/Silver Spotlight following cursor */}
      <motion.div
        style={{ x: spotX, y: spotY }}
        className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-slate-200/10 blur-[100px] rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
      />
      {/* Top Ambient Glow */}
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.15, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-amber-500/20 via-amber-700/10 to-transparent blur-[120px] rounded-full pointer-events-none"
      />
    </div>
  );
}
