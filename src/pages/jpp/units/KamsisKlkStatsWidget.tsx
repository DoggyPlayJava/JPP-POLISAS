import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Home, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn, hexToRgba } from '@/lib/utils';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { getKlkAcademicYear } from '@/utils/klkUtils';

interface KamsisKlkStatsWidgetProps {
  themeColor: string;
}

export function KamsisKlkStatsWidget({ themeColor }: KamsisKlkStatsWidgetProps) {
  const { activeSession, semesterString } = useAcademicSession();
  const [stats, setStats] = useState({
    kamsisPemohon: 0,
    kamsisLulus: 0,
    kamsisTolak: 0,
    kamsisRayuan: 0,
    klkLuar: 0,
    klkDalam: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [kamsisRes, klkRes] = await Promise.all([
          supabase.from('kamsis_applications')
            .select('status, extra_data')
            .eq('session', activeSession)
            .eq('semester', semesterString),
          supabase.from('klk_student_residency')
            .select('tinggal_luar')
            .eq('academic_year', getKlkAcademicYear())
            .eq('is_expired', false)
        ]);

        const kamsis = kamsisRes.data || [];
        const klk = klkRes.data || [];

        let kamsisPemohon = 0;
        let kamsisLulus = 0;
        let kamsisTolak = 0;
        let kamsisRayuan = 0;

        kamsis.forEach(k => {
          if (k.status === 'APPROVED') kamsisLulus++;
          else if (k.status === 'REJECTED' && !k.extra_data?.appeal_reason) kamsisTolak++;
          else if (k.status === 'APPEALING') kamsisRayuan++;
          else if (k.status === 'PENDING') kamsisPemohon++;
        });

        const klkLuar = klk.filter(k => k.tinggal_luar).length;
        const klkDalam = klk.filter(k => !k.tinggal_luar).length;

        setStats({ kamsisPemohon, kamsisLulus, kamsisTolak, kamsisRayuan, klkLuar, klkDalam });
      } catch (error) {
        console.error('Failed to load kamsis stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeSession, semesterString]);

  if (loading) {
    return (
      <div className="h-32 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] flex items-center justify-center animate-pulse">
        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── KAMSIS STATS ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] p-5 border flex flex-col justify-between space-y-4"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          borderColor: hexToRgba(themeColor, 0.15),
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: hexToRgba(themeColor, 0.15) }}>
            <Building2 className="w-5 h-5" style={{ color: themeColor }} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Status i-KAMSIS</h3>
            <p className="text-[10px] text-white/40 font-bold">Permohonan Sesi Semasa</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <StatMini label="Menunggu" val={stats.kamsisPemohon} color="#F59E0B" icon={FileText} />
          <StatMini label="Lulus" val={stats.kamsisLulus} color="#10B981" icon={CheckCircle} />
          <StatMini label="Tolak" val={stats.kamsisTolak} color="#EF4444" icon={XCircle} />
          <StatMini label="Rayuan" val={stats.kamsisRayuan} color="#8B5CF6" icon={AlertCircle} />
        </div>
      </motion.div>

      {/* ── KLK STATS ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-[2rem] p-5 border flex flex-col justify-between space-y-4"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          borderColor: hexToRgba('#60A5FA', 0.15),
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: hexToRgba('#60A5FA', 0.15) }}>
            <Home className="w-5 h-5" style={{ color: '#60A5FA' }} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Taburan Kediaman</h3>
            <p className="text-[10px] text-white/40 font-bold">Luar Kampus (KLK) vs Asrama</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatMini label="Luar Kampus" val={stats.klkLuar} color="#60A5FA" icon={Home} />
          <StatMini label="Dalam Kamsis" val={stats.klkDalam} color="#22C55E" icon={Building2} />
        </div>
      </motion.div>
    </div>
  );
}

function StatMini({ label, val, color, icon: Icon }: any) {
  return (
    <div className="rounded-2xl p-3 border border-white/[0.05] bg-white/[0.02] flex flex-col items-center justify-center text-center gap-2 group hover:bg-white/[0.05] transition-colors">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: hexToRgba(color, 0.1) }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-black text-white leading-none">{val}</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">{label}</p>
      </div>
    </div>
  );
}
