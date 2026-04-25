import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AiSettings {
  allowAiChat: boolean;
  allowAiBudget: boolean;
}

const AiSettingsContext = createContext<AiSettings>({ allowAiChat: true, allowAiBudget: true });

export function AiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AiSettings>({ allowAiChat: true, allowAiBudget: true });

  useEffect(() => {
    let mounted = true;

    // Initial fetch
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['allow_ai_chat', 'allow_ai_budget']);

      if (mounted && data) {
        const parsed: AiSettings = { allowAiChat: true, allowAiBudget: true };
        data.forEach((row: any) => {
          const val = row.value === true || String(row.value).toLowerCase() === 'true';
          if (row.key === 'allow_ai_chat') parsed.allowAiChat = val;
          if (row.key === 'allow_ai_budget') parsed.allowAiBudget = val;
        });
        setSettings(parsed);
      }
    };
    fetchSettings();

    // Realtime subscription removed to save connections during high traffic
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AiSettingsContext.Provider value={settings}>
      {children}
    </AiSettingsContext.Provider>
  );
}

export function useAiSettings() {
  return useContext(AiSettingsContext);
}
