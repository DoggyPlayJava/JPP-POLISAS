import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { JPP_POSITION_LABELS, JPP_UNIT_LABELS, JPP_UNITS } from '@/types';
import { UNIT_CFG, UNIT_ORDER, UnitConfig } from '@/pages/jpp/jppConfig';

interface JppConfigContextType {
  positionLabels: Record<string, string>;
  unitLabels: Record<string, string>;
  unitConfig: Record<string, UnitConfig>;
  unitOrder: string[];
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
  // Helper functions
  getPositionLabel: (code: string) => string;
  getUnitLabel: (code: string) => string;
}

const defaultContext: JppConfigContextType = {
  positionLabels: JPP_POSITION_LABELS,
  unitLabels: JPP_UNIT_LABELS,
  unitConfig: UNIT_CFG,
  unitOrder: UNIT_ORDER,
  isLoading: true,
  refreshConfig: async () => {},
  getPositionLabel: (code: string) => JPP_POSITION_LABELS[code as keyof typeof JPP_POSITION_LABELS] || code,
  getUnitLabel: (code: string) => JPP_UNIT_LABELS[code] || code,
};

const JppConfigContext = createContext<JppConfigContextType>(defaultContext);

export function JppConfigProvider({ children }: { children: React.ReactNode }) {
  const [positionLabels, setPositionLabels] = useState(JPP_POSITION_LABELS);
  const [unitLabels, setUnitLabels] = useState(JPP_UNIT_LABELS);
  const [unitConfig, setUnitConfig] = useState(UNIT_CFG);
  const [unitOrder, setUnitOrder] = useState(UNIT_ORDER);
  const [isLoading, setIsLoading] = useState(true);

  const refreshConfig = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', ['jpp_position_labels', 'jpp_unit_cfg', 'jpp_unit_order']);

      let newPosLabels = { ...JPP_POSITION_LABELS };
      let newUnitLabels = { ...JPP_UNIT_LABELS };
      let newUnitCfg = { ...UNIT_CFG };
      let newUnitOrder = [...UNIT_ORDER];

      if (data) {
        data.forEach(item => {
          let val = item.value;
          if (typeof val === 'string' && val.startsWith('{')) {
            try { val = JSON.parse(val); } catch (e) {}
          }
          if (typeof val === 'string' && val.startsWith('[')) {
             try { val = JSON.parse(val); } catch (e) {}
          }

          if (item.key === 'jpp_position_labels' && typeof val === 'object') {
            newPosLabels = { ...JPP_POSITION_LABELS, ...val };
          }
          if (item.key === 'jpp_unit_cfg' && typeof val === 'object') {
            // Apply overrides deeply onto existing configs, and capture new ones
            Object.entries(val).forEach(([code, overrideData]: [string, any]) => {
              const { icon, ...safeOverrides } = overrideData; // Jangan replace icon functions dengan mock objects dari DB
              newUnitCfg[code] = { ...(newUnitCfg[code] || {}), ...safeOverrides };
              if (safeOverrides.fullLabel) newUnitLabels[code] = safeOverrides.fullLabel;
            });
          }
          if (item.key === 'jpp_unit_order' && Array.isArray(val)) {
            newUnitOrder = val;
          }
        });
      }

      setPositionLabels(newPosLabels);
      setUnitLabels(newUnitLabels);
      setUnitConfig(newUnitCfg);
      setUnitOrder(newUnitOrder);
    } catch (e) {
      console.error("[JppConfigProvider] Failed to fetch jpp visual overrides", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  const getPositionLabel = (code: string) => positionLabels[code] || code;
  const getUnitLabel = (code: string) => unitLabels[code] || code;

  return (
    <JppConfigContext.Provider value={{
      positionLabels,
      unitLabels,
      unitConfig,
      unitOrder,
      isLoading,
      refreshConfig,
      getPositionLabel,
      getUnitLabel
    }}>
      {children}
    </JppConfigContext.Provider>
  );
}

export function useJppConfig() {
  return useContext(JppConfigContext);
}
