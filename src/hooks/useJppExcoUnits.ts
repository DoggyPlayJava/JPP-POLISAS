import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { JppExcoUnit } from '@/types';

/**
 * Hook untuk memuatkan senarai unit exco JPP dari database.
 * Fallback kepada hardcoded list jika DB kosong.
 */
export function useJppExcoUnits() {
  const [units, setUnits] = useState<JppExcoUnit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    const { data } = await supabase
      .from('jpp_exco_units')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    setUnits(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  /** Map code → name untuk lookup pantas */
  const unitLabels: Record<string, string> = Object.fromEntries(
    units.map(u => [u.code, u.name])
  );

  /** Map code → color untuk lookup pantas */
  const unitColors: Record<string, string> = Object.fromEntries(
    units.map(u => [u.code, u.color])
  );

  return { units, loading, unitLabels, unitColors, refresh: fetchUnits };
}
