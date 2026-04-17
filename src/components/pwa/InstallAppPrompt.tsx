import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

export function InstallAppPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Semak sama ada pengguna sudah menggunakan sebagai PWA (Standalone)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone;
      
    if (isStandalone) return;

    // Semak sama ada pengguna telah menekan "Nanti" dalam masa 7 hari lepas
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Sembunyikan selama 7 hari
      }
    }

    // Pengecaman OS: Kenal pasti iOS (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = 
      /ipad|iphone|ipod/.test(ua) || 
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    setIsIOS(isIOSDevice);

    // Event bagi peranti Android (Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Halang banner lalai
      setDeferredPrompt(e);
      // Tangguh kemunculan Drawer selama 4 saat supaya tidak mengganggu pengguna lantas masuk
      setTimeout(() => setIsOpen(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Bagi iOS, tiada event `beforeinstallprompt`, jadi kita panggil secara manual
    if (isIOSDevice) {
      setTimeout(() => setIsOpen(true), 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Tunjukkan prom asal sistem Android
    deferredPrompt.prompt();
    
    // Tunggu tindakan pengguna
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsOpen(false);
    }
    setDeferredPrompt(null);
  };

  // Jangan render apa-apa jika tidak dibuka
  if (!isOpen) return null;

  return (
    <Drawer 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) handleDismiss();
      }}
    >
      <DrawerContent className="glass dark:bg-slate-900/90 rounded-t-[2rem] border-t border-white/20 shadow-2xl">
        <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        
        <DrawerHeader className="text-left pt-6 pb-2 px-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/10 dark:bg-blue-500/20 p-3.5 rounded-2xl ring-1 ring-blue-600/20 dark:ring-blue-500/30">
              <Download className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Pasang Aplikasi JPP
              </DrawerTitle>
              <DrawerDescription className="text-sm mt-1 font-medium text-slate-600 dark:text-slate-400">
                Akses portal dengan lebih pantas dan lancar terus dari <i>Home Screen</i> anda.
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-6 py-4">
          {isIOS ? (
            <div className="bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl p-5 flex flex-col gap-3.5 border border-slate-200 dark:border-slate-700">
              <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center mb-1">
                Langkah Pemasangan iOS
              </p>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-slate-700 shadow-sm font-bold text-xs text-blue-600 dark:text-blue-400">1</span>
                <span>Tekan butang <Share className="w-5 h-5 inline-block mx-1 text-slate-800 dark:text-slate-200" /> <b>Share</b> di menu bawah.</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-slate-700 shadow-sm font-bold text-xs text-blue-600 dark:text-blue-400">2</span>
                <span>Tatal ke atas dan pilih <PlusSquare className="w-5 h-5 inline-block mx-1 text-slate-800 dark:text-slate-200" /> <b>Add to Home Screen</b>.</span>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/50">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 text-center">
                Aplikasi PWA ini sangat ringan, menjimatkan data mudah alih dan tidak akan memakan ruang storan peranti anda.
              </p>
            </div>
          )}
        </div>

        <DrawerFooter className="px-6 pt-2 pb-8">
          {!isIOS && (
            <Button 
              onClick={handleInstallClick} 
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wide h-12 text-sm shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02]"
            >
              Pasang Sekarang
            </Button>
          )}
          <DrawerClose asChild>
            <Button 
              variant="ghost" 
              className="w-full rounded-xl mt-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold h-12" 
              onClick={handleDismiss}
            >
              Nanti
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
