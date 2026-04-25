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

    // Susbcription removed to save Realtime Connections during high traffic
    return () => {
      mounted = false;
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
