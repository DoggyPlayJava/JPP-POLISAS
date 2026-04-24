import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface KarnivalSettings {
  showKarnival: boolean;
  karnivalVotingEnabled: boolean;
  karnivalRegistrationOpen: boolean;
}

const KarnivalContext = createContext<KarnivalSettings>({ 
  showKarnival: false, 
  karnivalVotingEnabled: false, 
  karnivalRegistrationOpen: false 
});

export function KarnivalProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<KarnivalSettings>({ 
    showKarnival: false, 
    karnivalVotingEnabled: false, 
    karnivalRegistrationOpen: false 
  });

  useEffect(() => {
    let mounted = true;

    const fetchSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['show_karnival', 'karnival_voting_enabled', 'karnival_registration_open']);

      if (mounted && data) {
        const parsed: KarnivalSettings = { 
          showKarnival: false, 
          karnivalVotingEnabled: false, 
          karnivalRegistrationOpen: false 
        };
        data.forEach((row: any) => {
          const val = row.value === true || String(row.value).toLowerCase() === 'true';
          if (row.key === 'show_karnival') parsed.showKarnival = val;
          if (row.key === 'karnival_voting_enabled') parsed.karnivalVotingEnabled = val;
          if (row.key === 'karnival_registration_open') parsed.karnivalRegistrationOpen = val;
        });
        setSettings(parsed);
      }
    };
    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel('karnival_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload: any) => {
          if (!mounted) return;
          const key = payload.new?.key || payload.old?.key;
          const val = payload.new?.value === true || String(payload.new?.value).toLowerCase() === 'true';

          if (key === 'show_karnival') {
            setSettings(prev => ({ ...prev, showKarnival: val }));
          }
          if (key === 'karnival_voting_enabled') {
            setSettings(prev => ({ ...prev, karnivalVotingEnabled: val }));
          }
          if (key === 'karnival_registration_open') {
            setSettings(prev => ({ ...prev, karnivalRegistrationOpen: val }));
          }
          
          // Re-fetch everything if it's a batch change or to be safe
          if (['show_karnival', 'karnival_voting_enabled', 'karnival_registration_open'].includes(key)) {
            // fetchSettings(); // Slow, better to rely on payload.new
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <KarnivalContext.Provider value={settings}>
      {children}
    </KarnivalContext.Provider>
  );
}

export function useKarnival() {
  return useContext(KarnivalContext);
}
