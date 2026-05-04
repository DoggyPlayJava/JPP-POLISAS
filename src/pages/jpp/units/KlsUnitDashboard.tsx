// ============================================================
// KlsUnitDashboard — Mini dashboard untuk /jpp/unit/kls
// Dipaparkan dalam JppUnitDashboard.tsx (sama pattern dengan KebajikanUnitDashboard)
// Nota: kod unit dalam DB ialah 'KLS', bukan 'KLK'
// ============================================================
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Building2, MapPin, Database, ArrowRight, Wifi, Upload, AlertTriangle, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { KamsisKlkStatsWidget } from './KamsisKlkStatsWidget';

import { getKlkAcademicYear } from '@/utils/klkUtils';

const KLS_COLOR = '#60A5FA';

export function KlsUnitDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ luar: 0, kamsis: 0, topKawasan: '' });
  const [dbReady, setDbReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const academicYear = getKlkAcademicYear();

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('klk_student_residency')
          .select('tinggal_luar, kawasan_kediaman')
          .eq('academic_year', academicYear)
          .eq('is_expired', false);

        if (error?.code === '42P01') { setDbReady(false); setLoading(false); return; }

        setDbReady(true);
        const records = data ?? [];
        const luar = records.filter((r: any) => r.tinggal_luar).length;
        const kamsis = records.filter((r: any) => !r.tinggal_luar).length;

        // Cari kawasan top
        const kawasanCount: Record<string, number> = {};
        records.filter((r: any) => r.tinggal_luar && r.kawasan_kediaman).forEach((r: any) => {
          kawasanCount[r.kawasan_kediaman] = (kawasanCount[r.kawasan_kediaman] ?? 0) + 1;
        });
        const topKawasan = Object.entries(kawasanCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
        setStats({ luar, kamsis, topKawasan });
      } catch { setDbReady(false); }
      finally { setLoading(false); }
    })();
  }, [user, academicYear]);

  const cards = [
    { label: 'Pelajar Luar Kampus', value: loading ? '—' : stats.luar.toString(), icon: Home, color: KLS_COLOR },
    { label: 'Dalam KAMSIS', value: loading ? '—' : stats.kamsis.toString(), icon: Building2, color: '#22C55E' },
    { label: 'Top Kawasan', value: loading ? '—' : (stats.topKawasan || '—'), icon: MapPin, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      {/* DB not ready banner */}
      {!loading && !dbReady && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-amber-300">Database Sedang Disediakan</p>
            <p className="text-[11px] text-amber-400/60 mt-0.5">Migration perlu dijalankan dahulu. Klik dashboard untuk setup.</p>
          </div>
        </div>
      )}

      {/* Mini stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-4 border border-white/[0.05] bg-white/[0.02]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${c.color}1a` }}>
              <c.icon className="w-4 h-4" style={{ color: c.color }} />
            </div>
            <p className="text-xl font-black text-white truncate">{c.value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: `${c.color}99` }}>{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Advanced Stats */}
      <KamsisKlkStatsWidget themeColor={KLS_COLOR} />

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Buka Dashboard KLK', desc: 'Peta hotspot + senarai pelajar', icon: MapPin, href: '/klk', color: KLS_COLOR },
          { label: 'Statistik Awam', desc: 'QR Code & data semasa', icon: BarChart3, href: '/klk/statistik', color: '#10B981' },
          { label: 'Tetapan & Import', desc: 'Webhook, CSV import, kawasan', icon: Database, href: '/klk/tetapan', color: '#818CF8' },
        ].map(link => (
          <motion.button key={link.href} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate(link.href)}
            className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${link.color}1a` }}>
              <link.icon className="w-4 h-4" style={{ color: link.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-200 truncate">{link.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{link.desc}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
          </motion.button>
        ))}
      </div>

      {/* Tahun akademik note */}
      <p className="text-center text-[10px] font-black uppercase tracking-widest text-white/20">
        Tahun Akademik {academicYear}
      </p>
    </div>
  );
}
