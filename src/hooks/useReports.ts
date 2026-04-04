import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ReportStatus } from '@/types';

export interface Report {
  id: string;
  club_id: string;
  submitted_by: string;
  report_type: string;
  file_url: string;
  file_name: string;
  status: ReportStatus;
  admin_feedback?: string;
  created_at: string;
}

export function useReports(clubId?: string) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReports = useCallback(async () => {
    if (!clubId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('club_reports')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, error, refresh: fetchReports };
}
