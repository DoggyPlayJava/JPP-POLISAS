import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, MoreHorizontal } from 'lucide-react';
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
import { useTranslation } from 'react-i18next';

export function InstallAppPrompt() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    console.log('[PWA Prompt] Checking conditions...');

    // Semak sama ada pengguna sudah menggunakan sebagai PWA (Standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;

    if (isStandalone) {
      console.log('[PWA Prompt] Abort: App is running in standalone mode.');
      return;
    }

    // Semak sama ada pengguna telah menekan "Nanti" dalam masa 7 hari lepas
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
    if (dismissedAt && !import.meta.env.DEV) { // Abaikan snooze semasa Development Mode
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        console.log('[PWA Prompt] Abort: Snoozed for 7 days. Dismissed at:', new Date(parseInt(dismissedAt, 10)).toLocaleString());
        return; // Sembunyikan selama 7 hari
      }
    }

    // Pengecaman OS: Kenal pasti iOS (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /ipad|iphone|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    setIsIOS(isIOSDevice);
    console.log('[PWA Prompt] isIOSDevice:', isIOSDevice, 'DEV mode:', import.meta.env.DEV);

    // Event bagi peranti Android (Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Halang banner lalai
      console.log('[PWA Prompt] beforeinstallprompt event fired!');
      setDeferredPrompt(e);
      // Tangguh kemunculan Drawer selama 4 saat supaya tidak mengganggu pengguna lantas masuk
      setTimeout(() => setIsOpen(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Hanya trigger manual jika peranti mudah alih (iOS) dan bukan standalone
    if (isIOSDevice) {
      console.log('[PWA Prompt] iOS device detected, scheduling prompt...');
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
    if (!deferredPrompt) {
      setIsOpen(false);
      return;
    }

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
      <DrawerContent className="bg-white dark:bg-[#151D16] border-t border-slate-200 dark:border-white/10 shadow-2xl rounded-t-[2rem]">
        <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />

        <DrawerHeader className="text-left pt-6 pb-2 px-6">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-3.5 rounded-2xl ring-1 ring-emerald-500/20 dark:ring-emerald-500/30">
              <Download className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Pasang Aplikasi JPP
              </DrawerTitle>
              <DrawerDescription className="text-sm mt-1 font-medium text-slate-600 dark:text-white/60">
                {t('portal:pwa_install_desc', 'Akses pantas portal JPP terus dari skrin utama peranti anda tanpa perlu membuka pelayar web setiap kali.')}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-6 py-4">
          {isIOS ? (
            <div className="bg-slate-100/80 dark:bg-white/5 rounded-2xl p-5 flex flex-col gap-3.5 border border-slate-200 dark:border-white/10">
              <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40 text-center mb-1">
                Langkah Pemasangan iOS
              </p>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-white/10 shadow-xs font-bold text-xs text-emerald-600 dark:text-emerald-400">1</span>
                <span>Tekan butang <MoreHorizontal className="w-5 h-5 inline-block mx-0.5 text-slate-800 dark:text-white" /> {t('portal:pwa_menu_then_select', '(Menu), kemudian pilih')} <Share className="w-4 h-4 inline-block ml-1 mr-0.5 text-slate-800 dark:text-white" /> <b>Share</b>.</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-white/10 shadow-xs font-bold text-xs text-emerald-600 dark:text-emerald-400">2</span>
                <span>{t('portal:pwa_scroll_and_select', 'Tatal ke bawah dan pilih')} <PlusSquare className="w-5 h-5 inline-block mx-1 text-slate-800 dark:text-white" /> <b>Add to Home Screen</b>.</span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center gap-3">
              <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t('portal:pwa_supported_browsers', 'Pemasangan segera disokong untuk pelayar Chrome dan Edge di telefon pintar anda.')}</span>
            </div>
          )}
        </div>

        <DrawerFooter className="px-6 pt-2 pb-8">
          {!isIOS && (
            <Button
              onClick={handleInstallClick}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-wide h-12 text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01]"
            >
              Pasang Sekarang
            </Button>
          )}
          <DrawerClose asChild>
            <Button
              variant="ghost"
              className="w-full rounded-xl mt-2 text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold h-12"
              onClick={handleDismiss}
            >
              {t('portal:later', 'Nanti Sahaja')}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
