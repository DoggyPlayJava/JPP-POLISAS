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

    // Single realtime subscription for the entire app
    const channel = supabase
      .channel('global_ai_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'system_settings' },
        (payload: any) => {
          if (!mounted) return;
          const val = payload.new.value === true || String(payload.new.value).toLowerCase() === 'true';
          if (payload.new.key === 'allow_ai_chat') {
            setSettings(prev => ({ ...prev, allowAiChat: val }));
          }
          if (payload.new.key === 'allow_ai_budget') {
            setSettings(prev => ({ ...prev, allowAiBudget: val }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_settings' },
        (payload: any) => {
          if (!mounted) return;
          const val = payload.new.value === true || String(payload.new.value).toLowerCase() === 'true';
          if (payload.new.key === 'allow_ai_chat') {
            setSettings(prev => ({ ...prev, allowAiChat: val }));
          }
          if (payload.new.key === 'allow_ai_budget') {
            setSettings(prev => ({ ...prev, allowAiBudget: val }));
          }
        }
      )
      .subscribe((status) => {
        console.log('[AiSettings] Realtime status:', status);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
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
