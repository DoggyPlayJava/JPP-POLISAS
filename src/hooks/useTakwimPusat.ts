// ============================================================
// useTakwimPusat — Centralized Takwim Data Hook
// Merges data from: takwim_pusat + programs (non-DRAFT) + takwim_holidays
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { TakwimItem } from '@/config/takwim-constants';
import { JPP_UNIT_JENIS } from '@/config/takwim-constants';
import { ALL_CLUBS } from '@/types';

interface UseTakwimPusatOptions {
  filter?: string;       // 'KESELURUHAN' | 'AKADEMIK' | 'JPP_ALL' | 'KELAB_SAYA' | 'KELAB' | unit code
  sesi?: string;         // '2026/2027'
  clubId?: string;       // Single club (backward compat — fallback)
  clubIds?: string[];    // Multi-club for "Kelab Saya" filter
  excludeJenis?: string[]; // Hide specific jenis from results (e.g. ['KELAB_KEDIAMAN'] for students)
  enabled?: boolean;     // Disable auto-fetch
}

interface UseTakwimPusatReturn {
  items: TakwimItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  stats: Record<string, number>;
}

export function useTakwimPusat(options: UseTakwimPusatOptions = {}): UseTakwimPusatReturn {
  const { filter = 'KESELURUHAN', sesi, clubId, clubIds, excludeJenis, enabled = true } = options;

  const [items, setItems] = useState<TakwimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});

  // Resolve effective club IDs list
  const effectiveClubIds = clubIds?.length ? clubIds : (clubId ? [clubId] : []);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      // ── 1. Fetch takwim_pusat entries ──
      let tpQuery = supabase
        .from('takwim_pusat')
        .select('*')
        .order('tarikh_mula', { ascending: true });

      if (sesi) tpQuery = tpQuery.eq('sesi', sesi);

      // Apply jenis filter for specific types
      if (filter === 'JPP_ALL') {
        // Aggregate: all JPP unit types
        tpQuery = tpQuery.in('jenis', JPP_UNIT_JENIS);
      } else if (filter !== 'KESELURUHAN' && filter !== 'KELAB_SAYA' && filter !== 'KELAB') {
        tpQuery = tpQuery.eq('jenis', filter);
      }

      // Exclude specific jenis (e.g. KELAB_KEDIAMAN for student view)
      if (excludeJenis?.length) {
        tpQuery = tpQuery.not('jenis', 'in', `(${excludeJenis.join(',')})`);
      }

      // ── 2. Fetch programs (kelab rasmi) — status bukan DRAFT ──
      let progQuery = supabase
        .from('programs')
        .select('*')
        .not('status', 'eq', 'DRAFT')
        .eq('is_archived', false)
        .order('tarikh_mula', { ascending: true });

      // For "Kelab Saya" filter — multi-club support
      if (filter === 'KELAB_SAYA' && effectiveClubIds.length > 0) {
        progQuery = progQuery.in('club_id', effectiveClubIds);
      }

      // ── 3. Fetch takwim_holidays (cuti umum) ──
      const holidayQuery = supabase
        .from('takwim_holidays')
        .select('*')
        .order('tarikh_mula', { ascending: true });

      // Determine which queries to actually run
      const shouldFetchPrograms = filter === 'KESELURUHAN' || filter === 'KELAB_SAYA' || filter === 'KELAB' || filter === 'KPP';
      const shouldFetchHolidays = filter === 'KESELURUHAN' || filter === 'CUTI_UMUM';

      // Execute all queries in parallel
      const [tpRes, progRes, holRes] = await Promise.all([
        tpQuery,
        shouldFetchPrograms ? progQuery : Promise.resolve({ data: [], error: null }),
        shouldFetchHolidays ? holidayQuery : Promise.resolve({ data: [], error: null }),
      ]);

      if (tpRes.error) throw tpRes.error;
      if (progRes.error) throw progRes.error;
      if (holRes.error) throw holRes.error;

      // ── Normalize to TakwimItem ──
      const takwimItems: TakwimItem[] = (tpRes.data || []).map((tp: any) => ({
        id: tp.id,
        type: 'takwim_pusat' as const,
        jenis: tp.jenis,
        tajuk: tp.tajuk,
        catatan: tp.catatan,
        tarikh_mula: tp.tarikh_mula,
        tarikh_tamat: tp.tarikh_tamat,
        bil_minggu: tp.bil_minggu,
        aktiviti: tp.aktiviti,
        warna_custom: tp.warna_custom,
        sesi: tp.sesi,
        exco_module: tp.exco_module,
        created_by: tp.created_by,
        kelab_kediaman_label: tp.kelab_kediaman_label,
      }));

      const programItems: TakwimItem[] = (progRes.data || []).map((p: any) => ({
        id: p.id,
        type: 'program' as const,
        jenis: 'KELAB',
        tajuk: p.nama_program,
        catatan: p.deskripsi,
        tarikh_mula: p.tarikh_mula,
        tarikh_tamat: p.tarikh_tamat,
        status: p.status,
        club_name: ALL_CLUBS.find(c => c.id === p.club_id)?.name || null,
      }));

      const holidayItems: TakwimItem[] = (holRes.data || []).map((h: any) => ({
        id: h.id,
        type: 'holiday' as const,
        jenis: 'CUTI_UMUM',
        tajuk: h.nama_cuti,
        tarikh_mula: h.tarikh_mula,
        tarikh_tamat: h.tarikh_tamat || h.tarikh_mula,
      }));

      // ── Merge & sort by date ──
      const merged = [...takwimItems, ...programItems, ...holidayItems]
        .sort((a, b) => new Date(a.tarikh_mula).getTime() - new Date(b.tarikh_mula).getTime());

      setItems(merged);

      // ── Calculate stats ──
      const s: Record<string, number> = {};
      merged.forEach(item => {
        s[item.jenis] = (s[item.jenis] || 0) + 1;
      });
      s['KESELURUHAN'] = merged.length;
      setStats(s);

    } catch (err: any) {
      console.error('useTakwimPusat error:', err);
      setError(err.message || 'Gagal memuatkan data takwim');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sesi, clubId, JSON.stringify(clubIds), enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, loading, error, refresh: fetchData, stats };
}
