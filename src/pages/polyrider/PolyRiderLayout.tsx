import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { supabase } from '@/lib/supabase';
import { ShieldAlert } from 'lucide-react';

export function PolyRiderLayout() {
  const [isActive, setIsActive] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'polyrider_active').single()
      .then(({ data }) => {
        setIsActive(data?.value !== 'false');
      });
  }, []);

  if (isActive === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Menyemak Sistem...</p>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
        <div className="flex-1 w-full flex items-center justify-center p-6">
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 text-center max-w-sm shadow-xl border border-slate-100 dark:border-white/5">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Sistem Ditutup
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-white/60 mb-6">
              Perkhidmatan PolyRider sedang ditutup sementara waktu oleh pihak pentadbir untuk tujuan penyelenggaraan atau di luar waktu operasi.
            </p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      <div className="flex-1 w-full">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
