import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AcademicSessionData {
  sessionString: string; // e.g. "2025/2026"
  semesterString: string; // e.g. "1"
  activeSession: string; // Same as sessionString — used for DB queries (e.g. "2025/2026")
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const AcademicSessionContext = createContext<AcademicSessionData>({
  sessionString: '2025/2026',
  semesterString: '1',
  activeSession: '2025/2026',
  loading: true,
  refreshSession: async () => {},
});

export function AcademicSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionString, setSessionString] = useState('2025/2026');
  const [semesterString, setSemesterString] = useState('1');
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['current_academic_session', 'current_academic_semester']);

      if (data) {
        const sess = data.find(d => d.key === 'current_academic_session')?.value;
        const sem = data.find(d => d.key === 'current_academic_semester')?.value;
        
        if (sess) setSessionString(sess as string);
        if (sem) setSemesterString(sem as string);
      }
    } catch (e) {
      console.error('Failed to fetch academic session:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const activeSession = sessionString;

  return (
    <AcademicSessionContext.Provider value={{ sessionString, semesterString, activeSession, loading, refreshSession: fetchSession }}>
      {children}
    </AcademicSessionContext.Provider>
  );
}

export function useAcademicSession() {
  return useContext(AcademicSessionContext);
}
