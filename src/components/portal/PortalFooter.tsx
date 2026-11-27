import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';

// Lazy load FloatingAiChat to prevent react-markdown and large chat logic from blocking Portal initial paint
const FloatingAiChat = lazy(() =>
  import('@/components/ai/FloatingAiChat').then(m => ({ default: m.FloatingAiChat }))
);

export function PortalFooter() {
  const { t } = useTranslation('portal');

  return (
    <>
      <footer className="relative z-10 py-16 px-6 border-t border-[#B8E4DC]/80 dark:border-[#1E4D45] mt-auto bg-[#EBF7F4] dark:bg-[#081A17]">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="group flex items-center gap-4 opacity-70 hover:opacity-100 transition-all duration-700">
            <img src="/jpp-logo.png" alt="JPP" className="h-8 w-auto object-contain grayscale transition-all duration-300 group-hover:grayscale-0" />
            <div className="h-8 w-px bg-[#B8E4DC] dark:bg-[#1E4D45]" />
            <div className="flex flex-col text-left text-[#0B2420] dark:text-[#F6FBF9]">
              <span className="font-black text-xs tracking-tight">POLISAS DIGITAL</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#0D9488] dark:text-[#2DD4BF]">EST. {new Date().getFullYear()}</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-[#3B635C] dark:text-[#99CBC2] uppercase tracking-[0.4em] max-w-md mx-auto leading-loose">
            &copy; {new Date().getFullYear()} {t('portal:jpp_full_name', 'Jawatankuasa Perwakilan Pelajar')} <br />
            Politeknik Sultan Haji Ahmad Shah
          </p>

          {/* Developer Signature */}
          <div className="pt-6 flex justify-center">
            <div className="flex items-center opacity-40 hover:opacity-100 transition-all duration-500 cursor-default group/hz">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#3B635C] dark:text-[#99CBC2] mt-1">
                {t('portal:engineered_by', 'Direka Oleh')}
              </span>
              <img 
                src="/HZ.png?v=2" 
                alt="HZ" 
                className="w-16 sm:w-20 h-auto object-contain grayscale opacity-80 group-hover/hz:grayscale-0 group-hover/hz:opacity-100 transition-all duration-500 drop-shadow-sm -ml-1" 
              />
            </div>
          </div>
        </div>
      </footer>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <Suspense fallback={null}>
        <FloatingAiChat />
      </Suspense>
    </>
  );
}
