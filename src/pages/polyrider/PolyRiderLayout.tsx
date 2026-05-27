import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { supabase } from '@/lib/supabase';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PolyRiderSuspended } from './PolyRiderSuspended';

import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

export function PolyRiderLayout() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      // 1. Check system settings
      const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'polyrider_active').single();
      setIsActive(settings?.value !== 'false');

      // 2. Check user profile for suspension
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('polyrider_suspended_until').eq('id', user.id).single();
        if (profile?.polyrider_suspended_until && new Date(profile.polyrider_suspended_until) > new Date()) {
          setSuspendedUntil(profile.polyrider_suspended_until);
        }
      }

      setLoading(false);
    };

    fetchStatus();
  }, [user]);

  if (loading || isActive === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Menyemak Sistem...</p>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 after:content-[''] after:block after:h-32 after:shrink-0">
        <div className="flex-1 w-full flex items-center justify-center p-6">
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 text-center max-w-sm shadow-xl border border-slate-100 dark:border-white/5">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Sistem Ditutup
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-white/60 mb-6">
              Perkhidmatan PolyRider sedang ditutup sementara waktu oleh pihak pembangun.
            </p>
          </div>
        </div>
        <BottomNav />
        <FloatingAiChat />
      </div>
    );
  }

  if (suspendedUntil) {
    return <PolyRiderSuspended suspendedUntil={suspendedUntil} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 after:content-[''] after:block after:h-32 after:shrink-0">
      <div className="flex-1 w-full">
        <Outlet />
      </div>
      <BottomNav />
      <FloatingAiChat />
    </div>
  );
}
