import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba } from '@/lib/utils';
import {
  Star, TrendingUp, QrCode, GraduationCap, Award,
  Calendar, ChevronRight, BookOpen, Zap,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';

const THEME = '#818CF8';

const SOURCE_CFG: Record<string, { label: string; color: string; icon: any }> = {
  KELAB:    { label: 'Kegiatan Kelab',   color: '#F87171', icon: GraduationCap },
  AKADEMIK: { label: 'Pencapaian',        color: THEME,     icon: Award },
  QR_SCAN:  { label: 'Aktiviti QR',       color: '#34D399', icon: QrCode },
  MAKMP:    { label: 'MAKMP',             color: '#F59E0B', icon: Star },
  MANUAL:   { label: 'Manual',            color: '#94A3B8', icon: Zap },
};

export function AkademikMeritPage() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState({
    KELAB: 0, AKADEMIK: 0, QR_SCAN: 0, MAKMP: 0, MANUAL: 0,
  });

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('merit_transactions')
      .select('id, points, reason, source, created_at, actor_name')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(100);

    const tx = data || [];
    setTransactions(tx);

    const bk: any = { KELAB: 0, AKADEMIK: 0, QR_SCAN: 0, MAKMP: 0, MANUAL: 0 };
    tx.forEach((t: any) => {
      const src = t.source || 'KELAB';
      bk[src] = (bk[src] || 0) + (t.points || 0);
    });
    setBreakdown(bk);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const total = profile?.merit || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Rekod</p>
        <h1 className="text-2xl font-black text-white">Merit Saya</h1>
        <p className="text-xs text-white/40 font-medium mt-1">
          Semua sumber merit — kelab, pencapaian akademik & aktiviti QR
        </p>
      </div>

      {/* Total Merit */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[2rem] p-6 border border-white/[0.06]"
        style={{ background: `linear-gradient(135deg, ${hexToRgba(THEME, 0.14)}, ${hexToRgba('#60A5FA', 0.06)})` }}
      >
        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 10% 50%, ${THEME}, transparent 60%)` }} />
        <div className="relative flex items-center gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: hexToRgba(THEME, 0.2), color: THEME, boxShadow: `0 8px 24px ${hexToRgba(THEME, 0.25)}` }}
          >
            <Star className="w-7 h-7 fill-current" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5">Jumlah Merit</p>
            <p className="text-4xl font-black text-white">{total}</p>
          </div>
        </div>
      </motion.div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(SOURCE_CFG).map(([key, cfg], i) => {
          const val = (breakdown as any)[key] || 0;
          if (val === 0) return null;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-[1.5rem] p-4 border border-white/[0.06] bg-white/[0.02] flex flex-col gap-2"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(cfg.color, 0.15) }}>
                <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
              </div>
              <p className="text-2xl font-black text-white">{val}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{cfg.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">
          Sejarah Merit
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <Star className="w-8 h-8 mx-auto text-white/10 mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada transaksi merit lagi</p>
          </div>
        ) : (
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-white/[0.05]" />
            <div className="space-y-3 pl-10">
              {transactions.map((tx, i) => {
                const src = tx.source || 'KELAB';
                const cfg = SOURCE_CFG[src] || SOURCE_CFG.KELAB;
                const TxIcon = cfg.icon;
                const date = tx.created_at
                  ? format(parseISO(tx.created_at), 'd MMM yyyy, h:mm a', { locale: ms })
                  : '';
                return (
                  <div key={tx.id} className="relative flex items-start gap-3">
                    {/* dot */}
                    <div
                      className="absolute -left-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border"
                      style={{ background: hexToRgba(cfg.color, 0.15), borderColor: hexToRgba(cfg.color, 0.3) }}
                    >
                      <TxIcon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-white line-clamp-1">{tx.reason || 'Merit diterima'}</p>
                        <span
                          className="text-sm font-black shrink-0"
                          style={{ color: (tx.points || 0) >= 0 ? '#34D399' : '#F87171' }}
                        >
                          {(tx.points || 0) >= 0 ? '+' : ''}{tx.points}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: hexToRgba(cfg.color, 0.12), color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className="text-[9px] text-white/25 font-medium">{date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
