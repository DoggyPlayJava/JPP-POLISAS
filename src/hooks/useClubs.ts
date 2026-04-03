import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  created_at: string;
}

export function useClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClubs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name');

      if (error) throw error;
      setClubs(data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  return { clubs, loading, error, refresh: fetchClubs };
}
