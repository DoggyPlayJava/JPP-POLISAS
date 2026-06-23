import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AcademicSessionData {
  sessionString: string; // e.g. "2025/2026"
  semesterString: string; // e.g. "1"
  activeSession: string; // Same as sessionString — used for DB queries (e.g. "2025/2026")
  intake1Month: number;
  intake2Month: number;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const AcademicSessionContext = createContext<AcademicSessionData>({
  sessionString: '2025/2026',
  semesterString: '1',
  activeSession: '2025/2026',
  intake1Month: 7,
  intake2Month: 1,
  loading: true,
  refreshSession: async () => {},
});

export function AcademicSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionString, setSessionString] = useState('2025/2026');
  const [semesterString, setSemesterString] = useState('1');
  const [intake1Month, setIntake1Month] = useState<number>(7);
  const [intake2Month, setIntake2Month] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['current_academic_session', 'current_academic_semester', 'intake_1_month', 'intake_2_month']);

      if (data) {
        const sess = data.find(d => d.key === 'current_academic_session')?.value;
        const sem = data.find(d => d.key === 'current_academic_semester')?.value;
        const m1 = data.find(d => d.key === 'intake_1_month')?.value;
        const m2 = data.find(d => d.key === 'intake_2_month')?.value;
        
        if (sess) setSessionString(sess as string);
        if (sem) setSemesterString(sem as string);
        if (m1) setIntake1Month(Number(m1));
        if (m2) setIntake2Month(Number(m2));
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
    <AcademicSessionContext.Provider value={{ sessionString, semesterString, activeSession, intake1Month, intake2Month, loading, refreshSession: fetchSession }}>
      {children}
    </AcademicSessionContext.Provider>
  );
}

export function useAcademicSession() {
  return useContext(AcademicSessionContext);
}
