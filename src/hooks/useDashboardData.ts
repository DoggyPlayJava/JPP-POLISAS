import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { queryCache, CACHE_TTL } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  announcement: { content: string } | null;
  members: any[];
  programs: any[];
  task_stats: {
    active: number;
    completed: number;
    waiting: number;
  };
  act_stats: {
    perancangan: number;
    aktif: number;
    selesai: number;
  };
  tasks: any[];
  activities: any[];
}

const EMPTY_DATA: DashboardData = {
  announcement: null,
  members: [],
  programs: [],
  task_stats: { active: 0, completed: 0, waiting: 0 },
  act_stats: { perancangan: 0, aktif: 0, selesai: 0 },
  tasks: [],
  activities: [],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Custom hook yang disemak semula: Memanggil Supabase secara langsung dengan
 * `Promise.all` dan caching pintar. Walaupun fetch secara serentak, in-memory cache
 * memastikan hit DB tetap sangat minimum ketika penggunaan 800+ pelajar!
 */
export function useDashboardData() {
  const { user, profile, selectedClubId } = useAuth();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clubId = selectedClubId ?? profile?.club_id;

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!clubId || !user) return;

    const cacheKey = `dashboard_${clubId}_${user.id}`;

    // Guna cache jika ada dan tidak force refresh
    if (!forceRefresh) {
      const cached = queryCache.get<DashboardData>(cacheKey);
      if (cached) {
        setData(cached);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // PROMISE.ALL: Fetch pelbagai data secara serentak pada klien
      const [
        { data: announcement },
        { data: memberships },
        { data: programs },
        { data: tasks },
        { data: activities }
      ] = await Promise.all([
        // 1. Pengumuman
        supabase
          .from('announcements')
          .select('content')
          .eq('club_id', clubId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
          
        // 2. Senarai Ahli
        supabase
          .from('student_club_memberships')
          .select(`
            id, role, account_status,
            profiles!inner ( id, full_name, role, merit )
          `)
          .eq('club_id', clubId)
          .eq('account_status', 'APPROVED'),
          
        // 3. Program (Kertas Kerja)
        supabase
          .from('programs')
          .select('*')
          .eq('club_id', clubId)
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
          
        // 4. Tasks (Tugasan)
        supabase
          .from('club_tasks')
          .select(`
            *,
            assigned_to:profiles!club_tasks_assigned_to_fkey(id, full_name, merit),
            created_by_user:profiles!club_tasks_created_by_fkey(id, full_name)
          `)
          .eq('club_id', clubId)
          .order('due_date', { ascending: true }),
          
        // 5. Activities (Aktiviti Spontan)
        supabase
          .from('club_activities')
          .select('*')
          .eq('club_id', clubId)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
      ]);

      // --- PENGIRAAN STATISTIK TEMPATAN ---
      const validTasks = tasks || [];
      const validActs = activities || [];
      
      const task_stats = {
        active: validTasks.filter(t => t.status === 'ACTIVE' && t.approval_status === 'APPROVED' && !t.is_archived).length,
        completed: validTasks.filter(t => t.status === 'COMPLETED' || t.is_archived).length,
        waiting: validTasks.filter(t => t.status === 'ACTIVE' && t.approval_status === 'WAITING' && !t.is_archived).length
      };

      const act_stats = {
        perancangan: validActs.filter(a => String(a.status).toLowerCase() === 'perancangan').length,
        aktif: validActs.filter(a => String(a.status).toLowerCase() === 'aktif').length,
        selesai: validActs.filter(a => String(a.status).toLowerCase() === 'selesai').length
      };

      // MAPPING MEMBER UTK DASHBOARD: Kami ambil profiles properties dan gabungkan role
      const mappedMembers = (memberships || []).map(m => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          id: p?.id,
          full_name: p?.full_name,
          merit: p?.merit || 0,
          role: m.role || p?.role
        };
      });

      const parsedData: DashboardData = {
        announcement: announcement as any,
        members:      mappedMembers,
        programs:     programs     || [],
        task_stats,
        act_stats,
        tasks:        validTasks,
        activities:   validActs,
      };

      // Simpan dalam cache (30 saat)
      queryCache.set(cacheKey, parsedData, CACHE_TTL.DASHBOARD);
      setData(parsedData);

    } catch (err: any) {
      console.error('[useDashboardData] Promise.all error:', err);
      setError(err.message || 'Gagal memuatkan data dashboard.');

      // Fallback: cuba guna cache walaupun expired
      const staleCache = queryCache.get<DashboardData>(`dashboard_${clubId}_${user.id}`);
      if (staleCache) setData(staleCache);

    } finally {
      setIsLoading(false);
    }
  }, [clubId, user]);

  // ── AUTO-REFRESH: Bila kelab berubah, buang cache lama dan fetch data baru ──
  useEffect(() => {
    if (clubId && user) {
      // Invalidate semua cache dashboard lama
      queryCache.invalidate('dashboard_');
      fetchData(true);
    }
  }, [clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Refresh paksa — invalidate cache dan fetch semula */
  const refresh = useCallback(() => {
    if (clubId && user) {
      queryCache.invalidate(`dashboard_${clubId}_${user.id}`);
    }
    fetchData(true);
  }, [fetchData, clubId, user]);

  return { data, isLoading, error, fetchData, refresh };
}
