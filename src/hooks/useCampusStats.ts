import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { queryCache, CACHE_TTL } from '@/lib/cache';
import type { CampusStats } from '@/components/landing/landingTypes';

export const LANDING_STATS_CACHE_KEY = 'landing_campus_stats';

export const DEFAULT_CAMPUS_STATS: CampusStats = {
  clubsCount: 21,
  activitiesCount: 41,
  studentsCount: 1083,
  productsCount: 277,
  ordersCount: 344,
};

export function useCampusStats(): CampusStats {
  const cached = queryCache.get<CampusStats>(LANDING_STATS_CACHE_KEY);
  const [stats, setStats] = useState<CampusStats>(cached ?? DEFAULT_CAMPUS_STATS);

  useEffect(() => {
    let isMounted = true;

    async function fetchLiveStats() {
      const activeCache = queryCache.get<CampusStats>(LANDING_STATS_CACHE_KEY);
      if (activeCache && isMounted) {
        setStats(activeCache);
        return;
      }

      try {
        const [clubsRes, actsRes, prodsRes, ordersRes, klkRes] = await Promise.all([
          supabase.from('clubs').select('id', { count: 'exact', head: true }),
          supabase.from('club_activities').select('id', { count: 'exact', head: true }),
          supabase.from('business_products').select('id', { count: 'exact', head: true }),
          supabase.from('polymart_orders').select('id', { count: 'exact', head: true }),
          supabase.from('klk_student_residency').select('id', { count: 'exact', head: true }),
        ]);

        if (isMounted) {
          const freshStats: CampusStats = {
            clubsCount: clubsRes.count ?? DEFAULT_CAMPUS_STATS.clubsCount,
            activitiesCount: actsRes.count ?? DEFAULT_CAMPUS_STATS.activitiesCount,
            studentsCount: klkRes.count ?? DEFAULT_CAMPUS_STATS.studentsCount,
            productsCount: prodsRes.count ?? DEFAULT_CAMPUS_STATS.productsCount,
            ordersCount: ordersRes.count ?? DEFAULT_CAMPUS_STATS.ordersCount,
          };
          queryCache.set(LANDING_STATS_CACHE_KEY, freshStats, CACHE_TTL.DASHBOARD);
          setStats(freshStats);
        }
      } catch {
        // Safe fallback to DEFAULT_CAMPUS_STATS
      }
    }

    fetchLiveStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return stats;
}
