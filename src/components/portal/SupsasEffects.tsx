import React, { useEffect, useState } from 'react';

export function SupsasEffects() {
  const [burstDone, setBurstDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBurstDone(true), 12000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[5%] w-[70vw] h-[70vw] rounded-full opacity-20 blur-[120px]" style={{ background: 'radial-gradient(circle, #b45309 0%, transparent 70%)', animation: 'supsas-blob-1 25s ease-in-out infinite' }} />
        <div className="absolute top-[40%] -left-[10%] w-[60vw] h-[60vw] rounded-full opacity-15 blur-[100px]" style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)', animation: 'supsas-blob-2 35s ease-in-out infinite' }} />
        <div className="absolute top-[10%] left-[30%] w-[40vw] h-[40vw] rounded-full opacity-[0.08] blur-[80px]" style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)', animation: 'supsas-blob-1 40s ease-in-out infinite reverse' }} />
      </div>

      <style>{`
        @keyframes supsas-blob-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(-30px, 40px) scale(1.05); }
          66%       { transform: translate(20px, -20px) scale(0.95); }
        }
        @keyframes supsas-blob-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          40%       { transform: translate(40px, -30px) scale(1.1); }
          70%       { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes supsas-medal-burst {
          0%   { transform: translateY(0px) rotate(0deg); opacity: 1; }
          85%  { opacity: 0.9; }
          100% { transform: translateY(-110vh) rotate(-720deg); opacity: 0; }
        }
        @keyframes supsas-meteor {
          0%   { transform: translate(100vw, -10vh) rotate(-45deg); opacity: 0; }
          10%  { opacity: 1; }
          30%  { transform: translate(-20vw, 110vh) rotate(-45deg); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes supsas-sparkle {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(1.3); }
        }
        @keyframes supsas-gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes supsas-glow-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(245,158,11,0.15), 0 0 60px rgba(245,158,11,0.05); }
          50%       { box-shadow: 0 0 50px rgba(245,158,11,0.3), 0 0 100px rgba(245,158,11,0.1); }
        }
      `}</style>

      {/* Diagonal Meteor Streaks (Continuous) */}
      <div className="fixed inset-0 z-[2] pointer-events-none overflow-hidden">
        {[
          { t: '10%', d: '0s', dur: '8s' },
          { t: '30%', d: '3s', dur: '6s' },
          { t: '50%', d: '1s', dur: '9s' },
          { t: '70%', d: '5s', dur: '7s' },
          { t: '85%', d: '2s', dur: '10s' },
          { t: '-10%', d: '4s', dur: '7.5s' },
          { t: '20%', d: '6s', dur: '8.5s' },
        ].map((m, i) => (
          <div key={i} style={{
            position: 'absolute', top: m.t, right: 0,
            width: '120px', height: '2px',
            background: 'linear-gradient(90deg, rgba(251,191,36,0) 0%, rgba(251,191,36,0.8) 50%, rgba(255,255,255,1) 100%)',
            boxShadow: '0 0 10px rgba(245,158,11,0.5)',
            animationName: 'supsas-meteor',
            animationDuration: m.dur,
            animationDelay: m.d,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            transformOrigin: 'right center',
          }} />
        ))}
      </div>

      {/* Upward Medal Burst (10s) */}
      {!burstDone && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {[
            { l: '4%', s: 12, c: '#fbbf24', d: '2.0s', dl: '0s' },
            { l: '9%', s: 10, c: '#e5e7eb', d: '2.5s', dl: '0.2s' },
            { l: '14%', s: 14, c: '#cd7c2f', d: '1.8s', dl: '0.5s' },
            { l: '19%', s: 11, c: '#fbbf24', d: '2.3s', dl: '0.1s' },
            { l: '24%', s: 9, c: '#ffffff', d: '2.8s', dl: '0.6s' },
            { l: '29%', s: 13, c: '#f59e0b', d: '2.1s', dl: '0.3s' },
            { l: '34%', s: 10, c: '#e5e7eb', d: '2.6s', dl: '0.8s' },
            { l: '39%', s: 12, c: '#fbbf24', d: '1.9s', dl: '0.4s' },
            { l: '44%', s: 14, c: '#cd7c2f', d: '2.4s', dl: '0.7s' },
            { l: '49%', s: 10, c: '#ffffff', d: '2.2s', dl: '0s' },
            { l: '54%', s: 11, c: '#fbbf24', d: '2.7s', dl: '0.9s' },
            { l: '59%', s: 9, c: '#f59e0b', d: '2.0s', dl: '0.2s' },
            { l: '64%', s: 13, c: '#e5e7eb', d: '2.5s', dl: '0.5s' },
            { l: '69%', s: 12, c: '#fbbf24', d: '1.8s', dl: '0.3s' },
            { l: '74%', s: 10, c: '#cd7c2f', d: '2.3s', dl: '0.6s' },
            { l: '79%', s: 11, c: '#ffffff', d: '2.9s', dl: '0.1s' },
            { l: '84%', s: 14, c: '#fbbf24', d: '2.1s', dl: '0.7s' },
            { l: '89%', s: 9, c: '#f59e0b', d: '2.6s', dl: '0.4s' },
            { l: '94%', s: 12, c: '#e5e7eb', d: '2.0s', dl: '0.8s' },
            { l: '7%', s: 10, c: '#fbbf24', d: '2.4s', dl: '1.1s' },
            { l: '17%', s: 13, c: '#cd7c2f', d: '2.2s', dl: '1.3s' },
            { l: '27%', s: 11, c: '#ffffff', d: '2.8s', dl: '1.0s' },
            { l: '37%', s: 14, c: '#fbbf24', d: '1.9s', dl: '1.4s' },
            { l: '47%', s: 9, c: '#f59e0b', d: '2.5s', dl: '1.2s' },
            { l: '57%', s: 12, c: '#e5e7eb', d: '2.0s', dl: '1.5s' },
            { l: '67%', s: 10, c: '#fbbf24', d: '2.7s', dl: '1.6s' },
            { l: '77%', s: 13, c: '#cd7c2f', d: '2.3s', dl: '1.1s' },
            { l: '87%', s: 11, c: '#ffffff', d: '2.1s', dl: '1.7s' },
            { l: '97%', s: 9, c: '#fbbf24', d: '2.6s', dl: '1.3s' },
            { l: '12%', s: 14, c: '#f59e0b', d: '2.4s', dl: '1.8s' },
            { l: '32%', s: 10, c: '#fbbf24', d: '2.2s', dl: '2.0s' },
            { l: '52%', s: 12, c: '#e5e7eb', d: '1.8s', dl: '1.9s' },
            { l: '72%', s: 11, c: '#cd7c2f', d: '2.5s', dl: '2.1s' },
          ].map((p, i) => (
            <div key={i} style={{
              position: 'absolute', bottom: 0, left: p.l,
              width: p.s, height: p.s,
              borderRadius: '50%',
              backgroundColor: p.c,
              boxShadow: `0 0 ${p.s / 2}px ${p.c}80`,
              animationName: 'supsas-medal-burst',
              animationDuration: p.d,
              animationDelay: p.dl,
              animationTimingFunction: 'ease-out',
              animationFillMode: 'forwards',
            }} />
          ))}
        </div>
      )}

      {/* Floating Gold Sparkles */}
      <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
        {[
          { x: '12%', y: '25%', s: 3, dur: '2.4s', dl: '0.2s' },
          { x: '28%', y: '65%', s: 4, dur: '3.1s', dl: '0.7s' },
          { x: '45%', y: '15%', s: 2, dur: '2.8s', dl: '1.3s' },
          { x: '62%', y: '85%', s: 5, dur: '3.5s', dl: '0.4s' },
          { x: '78%', y: '35%', s: 3, dur: '2.2s', dl: '0.9s' },
          { x: '88%', y: '70%', s: 4, dur: '3.0s', dl: '1.5s' },
          { x: '5%',  y: '50%', s: 2, dur: '2.6s', dl: '0.1s' },
          { x: '35%', y: '88%', s: 3, dur: '3.2s', dl: '1.1s' },
          { x: '55%', y: '40%', s: 4, dur: '2.5s', dl: '0.6s' },
          { x: '72%', y: '12%', s: 2, dur: '2.9s', dl: '1.4s' },
          { x: '92%', y: '45%', s: 3, dur: '3.4s', dl: '0.8s' },
          { x: '20%', y: '95%', s: 4, dur: '2.7s', dl: '1.0s' },
        ].map((sp, i) => (
          <div key={i} style={{
            position: 'absolute', left: sp.x, top: sp.y,
            width: sp.s, height: sp.s,
            borderRadius: '50%',
            backgroundColor: '#fbbf24',
            boxShadow: '0 0 8px #f59e0b',
            animationName: 'supsas-sparkle',
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
