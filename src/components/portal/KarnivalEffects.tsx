import React, { useEffect, useState } from 'react';

export function KarnivalEffects() {
  const [confettiDone, setConfettiDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setConfettiDone(true), 15000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[80vw] h-[80vw] rounded-full opacity-25 blur-[100px]" style={{ background: 'radial-gradient(circle, #4c1d95 0%, transparent 70%)', animation: 'aurora-blob-1 30s ease-in-out infinite' }} />
        <div className="absolute top-[50%] -right-[15%] w-[70vw] h-[70vw] rounded-full opacity-15 blur-[100px]" style={{ background: 'radial-gradient(circle, #831843 0%, transparent 70%)', animation: 'aurora-blob-2 40s ease-in-out infinite' }} />
        <div className="absolute top-[20%] left-[40%] w-[50vw] h-[50vw] rounded-full opacity-10 blur-[120px]" style={{ background: 'radial-gradient(circle, #6d28d9 0%, transparent 70%)', animation: 'aurora-blob-1 50s ease-in-out infinite reverse' }} />
      </div>

      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-10px) rotate(0deg);    opacity: 1; }
          85%  { opacity: 0.8; }
          100% { transform: translateY(105vh) rotate(1080deg); opacity: 0; }
        }
        @keyframes sparkle-pulse {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(1.5); }
        }
        @keyframes aurora-blob-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(40px, -30px) scale(1.05); }
          66%       { transform: translate(-20px, 20px) scale(0.97); }
        }
        @keyframes aurora-blob-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          40%       { transform: translate(-50px, 30px) scale(1.08); }
          70%       { transform: translate(30px, -20px) scale(0.95); }
        }
        @keyframes gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes karnival-glow-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(139,92,246,0.2), 0 0 60px rgba(139,92,246,0.05); }
          50%       { box-shadow: 0 0 50px rgba(139,92,246,0.4), 0 0 100px rgba(139,92,246,0.1); }
        }
      `}</style>

      {/* Confetti Layer (15s) */}
      {!confettiDone && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {[
            { l: '3%', s: 8, r: 0.5, c: '#a855f7', d: '3.1s', dl: '0s', sh: 'square' },
            { l: '7%', s: 6, r: 1.8, c: '#fbbf24', d: '4.2s', dl: '0.3s', sh: 'rect' },
            { l: '11%', s: 9, r: 1, c: '#f472b6', d: '3.5s', dl: '0.7s', sh: 'circle' },
            { l: '15%', s: 7, r: 0.6, c: '#818cf8', d: '5.0s', dl: '0.1s', sh: 'square' },
            { l: '19%', s: 10, r: 1.5, c: '#c084fc', d: '3.8s', dl: '1.2s', sh: 'rect' },
            { l: '23%', s: 5, r: 1, c: '#e879f9', d: '4.5s', dl: '0.5s', sh: 'circle' },
            { l: '27%', s: 8, r: 0.7, c: '#fbbf24', d: '3.2s', dl: '0.9s', sh: 'square' },
            { l: '31%', s: 6, r: 2, c: '#a78bfa', d: '4.8s', dl: '0.2s', sh: 'rect' },
            { l: '35%', s: 9, r: 1, c: '#f9a8d4', d: '3.6s', dl: '1.4s', sh: 'circle' },
            { l: '39%', s: 7, r: 0.5, c: '#7c3aed', d: '5.2s', dl: '0.6s', sh: 'square' },
            { l: '43%', s: 11, r: 1.3, c: '#f472b6', d: '3.4s', dl: '0.4s', sh: 'rect' },
            { l: '47%', s: 6, r: 1, c: '#fbbf24', d: '4.1s', dl: '1.1s', sh: 'circle' },
            { l: '51%', s: 8, r: 0.8, c: '#c084fc', d: '3.9s', dl: '0.8s', sh: 'square' },
            { l: '55%', s: 7, r: 1.6, c: '#818cf8', d: '4.7s', dl: '0s', sh: 'rect' },
            { l: '59%', s: 9, r: 1, c: '#a855f7', d: '3.3s', dl: '1.3s', sh: 'circle' },
            { l: '63%', s: 6, r: 0.6, c: '#e879f9', d: '5.1s', dl: '0.3s', sh: 'square' },
            { l: '67%', s: 10, r: 1.4, c: '#fbbf24', d: '3.7s', dl: '0.7s', sh: 'rect' },
            { l: '71%', s: 7, r: 1, c: '#f9a8d4', d: '4.4s', dl: '1.0s', sh: 'circle' },
            { l: '75%', s: 8, r: 0.7, c: '#7c3aed', d: '3.0s', dl: '0.5s', sh: 'square' },
            { l: '79%', s: 6, r: 2, c: '#a78bfa', d: '4.9s', dl: '0.2s', sh: 'rect' },
            { l: '83%', s: 9, r: 1, c: '#c084fc', d: '3.5s', dl: '1.5s', sh: 'circle' },
            { l: '87%', s: 7, r: 0.5, c: '#fbbf24', d: '5.3s', dl: '0.6s', sh: 'square' },
            { l: '91%', s: 8, r: 1.7, c: '#f472b6', d: '3.8s', dl: '0.9s', sh: 'rect' },
            { l: '95%', s: 6, r: 1, c: '#818cf8', d: '4.3s', dl: '0.1s', sh: 'circle' },
            { l: '5%', s: 7, r: 0.8, c: '#e879f9', d: '4.6s', dl: '1.8s', sh: 'square' },
            { l: '13%', s: 9, r: 1.2, c: '#fbbf24', d: '3.1s', dl: '2.1s', sh: 'rect' },
            { l: '22%', s: 6, r: 1, c: '#a855f7', d: '5.0s', dl: '1.7s', sh: 'circle' },
            { l: '33%', s: 10, r: 0.6, c: '#f9a8d4', d: '3.4s', dl: '2.3s', sh: 'square' },
            { l: '44%', s: 7, r: 1.5, c: '#7c3aed', d: '4.2s', dl: '1.6s', sh: 'rect' },
            { l: '56%', s: 8, r: 1, c: '#c084fc', d: '3.7s', dl: '2.0s', sh: 'circle' },
            { l: '68%', s: 6, r: 0.7, c: '#fbbf24', d: '4.8s', dl: '1.9s', sh: 'square' },
            { l: '77%', s: 9, r: 1.3, c: '#a78bfa', d: '3.2s', dl: '2.4s', sh: 'rect' },
            { l: '89%', s: 7, r: 1, c: '#f472b6', d: '5.1s', dl: '1.5s', sh: 'circle' },
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

      {/* Floating Sparkles */}
      <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
        {[
          { x: '8%', y: '15%', s: 3, c: '#c084fc', dur: '2.1s', dl: '0s' },
          { x: '15%', y: '45%', s: 2, c: '#fbbf24', dur: '3.0s', dl: '0.5s' },
          { x: '22%', y: '72%', s: 4, c: '#f472b6', dur: '2.5s', dl: '1.1s' },
          { x: '31%', y: '28%', s: 2, c: '#818cf8', dur: '3.5s', dl: '0.3s' },
          { x: '40%', y: '60%', s: 3, c: '#a855f7', dur: '2.3s', dl: '0.8s' },
          { x: '50%', y: '18%', s: 5, c: '#fbbf24', dur: '2.8s', dl: '1.4s' },
          { x: '58%', y: '80%', s: 2, c: '#e879f9', dur: '3.2s', dl: '0.2s' },
          { x: '66%', y: '35%', s: 4, c: '#c084fc', dur: '2.0s', dl: '0.9s' },
          { x: '74%', y: '65%', s: 3, c: '#f9a8d4', dur: '3.7s', dl: '0.6s' },
          { x: '82%', y: '22%', s: 2, c: '#7c3aed', dur: '2.6s', dl: '1.2s' },
          { x: '89%', y: '52%', s: 4, c: '#fbbf24', dur: '3.1s', dl: '0.4s' },
          { x: '94%', y: '78%', s: 3, c: '#a78bfa', dur: '2.4s', dl: '1.0s' },
          { x: '5%', y: '88%', s: 2, c: '#f472b6', dur: '3.3s', dl: '1.6s' },
          { x: '27%', y: '10%', s: 3, c: '#818cf8', dur: '2.7s', dl: '0.7s' },
          { x: '70%', y: '5%', s: 4, c: '#c084fc', dur: '3.0s', dl: '1.3s' },
          { x: '45%', y: '92%', s: 2, c: '#fbbf24', dur: '2.2s', dl: '0.1s' },
          { x: '55%', y: '48%', s: 3, c: '#e879f9', dur: '2.9s', dl: '1.5s' },
          { x: '12%', y: '58%', s: 4, c: '#a855f7', dur: '3.4s', dl: '0.8s' },
        ].map((sp, i) => (
          <div key={i} style={{
            position: 'absolute', left: sp.x, top: sp.y,
            width: sp.s, height: sp.s,
            borderRadius: '50%',
            backgroundColor: sp.c,
            animationName: 'sparkle-pulse',
            animationDuration: sp.dur,
            animationDelay: sp.dl,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }} />
        ))}
      </div>
    </>
  );
}
