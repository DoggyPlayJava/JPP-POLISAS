import React from 'react';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

export function PortalFooter() {
  return (
    <>
      <footer className="relative z-10 py-16 px-6 border-t border-black/5 dark:border-white/10 mt-auto bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="group flex items-center gap-4 opacity-50 hover:opacity-100 transition-all duration-700">
            <img src="/jpp-logo.png" alt="JPP" className="h-8 w-auto object-contain grayscale transition-all duration-300 group-hover:grayscale-0" />
            <div className="h-8 w-px bg-black/20 dark:bg-white/20" />
            <div className="flex flex-col text-left text-slate-800 dark:text-white">
              <span className="font-black text-xs tracking-tight">POLISAS DIGITAL</span>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">EST. {new Date().getFullYear()}</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-900/40 dark:text-white/40 uppercase tracking-[0.4em] max-w-md mx-auto leading-loose">
            &copy; {new Date().getFullYear()} Jawatankuasa Perwakilan Pelajar <br />
            Politeknik Sultan Haji Ahmad Shah
          </p>
        </div>
      </footer>
      <FloatingAiChat />
    </>
  );
}
