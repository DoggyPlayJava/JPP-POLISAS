// ============================================================
// useTakwimPusat — Centralized Takwim Data Hook
// Merges data from: takwim_pusat + programs (non-DRAFT) + takwim_holidays
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { TakwimItem } from '@/config/takwim-constants';
import { ALL_CLUBS } from '@/types';

interface UseTakwimPusatOptions {
  filter?: string;       // 'KESELURUHAN' | 'AKADEMIK' | 'JPP' | 'KELAB_SAYA' | unit code
  sesi?: string;         // '2026/2027'
  clubId?: string;       // For "Kelab Saya" filter
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
  const { filter = 'KESELURUHAN', sesi, clubId, enabled = true } = options;

  const [items, setItems] = useState<TakwimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});

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
      if (filter !== 'KESELURUHAN' && filter !== 'KELAB_SAYA') {
        tpQuery = tpQuery.eq('jenis', filter);
      }

      // ── 2. Fetch programs (kelab rasmi) — status bukan DRAFT ──
      let progQuery = supabase
        .from('programs')
        .select('*')
        .not('status', 'eq', 'DRAFT')
        .eq('is_archived', false)
        .order('tarikh_mula', { ascending: true });

      // For "Kelab Saya" filter
      if (filter === 'KELAB_SAYA' && clubId) {
        progQuery = progQuery.eq('club_id', clubId);
      }

      // ── 3. Fetch takwim_holidays (cuti umum) ──
      const holidayQuery = supabase
        .from('takwim_holidays')
        .select('*')
        .order('tarikh_mula', { ascending: true });

      // Execute all queries in parallel
      const [tpRes, progRes, holRes] = await Promise.all([
        tpQuery,
        // Skip programs if filtering to a specific jenis (non-kelab)
        (filter !== 'KESELURUHAN' && filter !== 'KELAB_SAYA' && filter !== 'KPP')
          ? Promise.resolve({ data: [], error: null })
          : progQuery,
        // Skip holidays unless showing keseluruhan or cuti_umum
        (filter !== 'KESELURUHAN' && filter !== 'CUTI_UMUM')
          ? Promise.resolve({ data: [], error: null })
          : holidayQuery,
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
  }, [filter, sesi, clubId, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, loading, error, refresh: fetchData, stats };
}
