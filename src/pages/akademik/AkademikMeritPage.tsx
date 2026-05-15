import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba } from '@/lib/utils';
import {
  Star, TrendingUp, QrCode, GraduationCap, Award,
  Calendar, ChevronRight, BookOpen, Zap, AlertTriangle, ShieldAlert, CheckCircle, Clock, XCircle, FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

const THEME = '#818CF8';

const SOURCE_CFG: Record<string, { label: string; color: string; icon: any }> = {
  KELAB:    { label: 'Kegiatan Kelab',   color: '#F87171', icon: GraduationCap },
  AKADEMIK: { label: 'Pencapaian',        color: THEME,     icon: Award },
  QR_SCAN:  { label: 'Aktiviti QR',       color: '#34D399', icon: QrCode },
  MAKMP:    { label: 'MAKMP',             color: '#F59E0B', icon: Star },
  DEMERIT:  { label: 'Demerit',           color: '#ef4444', icon: ShieldAlert },
  MANUAL:   { label: 'Manual',            color: '#94A3B8', icon: Zap },
};

export function AkademikMeritPage() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealProof, setAppealProof] = useState('');

  const [breakdown, setBreakdown] = useState({
    KELAB: 0, AKADEMIK: 0, QR_SCAN: 0, MAKMP: 0, DEMERIT: 0, MANUAL: 0,
  });

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    
    // §15.2: Fetch selari guna Promise.all — bukan sequential await
    const [txRes, cohortsRes, appealsRes] = await Promise.all([
      supabase
        .from('merit_transactions')
        .select('id, points, reason, source, created_at, actor_name')
        .eq('user_id', profile.id)
        .is('academic_session', null)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('student_merit_cohorts')
        .select('id, cohort_id, total_merit, merit_kelab, merit_akademik, merit_asrama, source, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('demerit_appeals')
        .select('id, transaction_id, status')
        .eq('user_id', profile.id),
    ]);

    const tx = txRes.data || [];
    setTransactions(tx);
    setCohorts(cohortsRes.data || []);
    setAppeals(appealsRes.data || []);

    const bk: any = { KELAB: 0, AKADEMIK: 0, QR_SCAN: 0, MAKMP: 0, DEMERIT: 0, MANUAL: 0 };
    tx.forEach((t: any) => {
      const pts = t.points || 0;
      if (pts < 0) {
        bk['DEMERIT'] = (bk['DEMERIT'] || 0) + Math.abs(pts);
      } else {
        const src = t.source || 'KELAB';
        bk[src] = (bk[src] || 0) + pts;
      }
    });
    setBreakdown(bk);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const submitAppeal = async () => {
    if (!appealReason.trim()) {
      toast.error('Sila berikan alasan rayuan.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('demerit_appeals').insert({
        transaction_id: selectedTx.id,
        user_id: profile?.id,
        appeal_reason: appealReason,
        proof_url: appealProof || null,
        status: 'PENDING'
      });
      if (error) throw error;
      toast.success('Rayuan demerit telah dihantar.');
      setShowAppealModal(false);
      setAppealReason('');
      setAppealProof('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghantar rayuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const total = profile?.merit || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Rekod</p>
        <h1 className="text-2xl font-black text-white">Merit & Demerit</h1>
        <p className="text-xs text-white/40 font-medium mt-1">
          Pusat sehenti untuk pencapaian kelab, akademik dan rayuan demerit.
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
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5">Jumlah Merit (Semasa)</p>
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
              <p className="text-2xl font-black text-white">{key === 'DEMERIT' ? `-${val}` : val}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{cfg.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Archived Cohorts (If any) */}
      {cohorts.length > 0 && (
        <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Sejarah Merit Sesi Lepas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cohorts.map((ch) => (
              <div key={ch.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-black text-white">{ch.cohort_id}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-white/40">Disesarkan: {format(parseISO(ch.created_at), 'd MMM yyyy')}</p>
                      {ch.source && ch.source !== 'ALL' && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/50">
                          {ch.source === 'KELAB' ? 'Kelab' : ch.source === 'AKADEMIK' ? 'Akademik' : ch.source === 'QR_SCAN' ? 'Asrama' : ch.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-lg font-black">{ch.total_merit}</span>
                  </div>
                </div>
                {(ch.merit_kelab > 0 || ch.merit_akademik > 0 || ch.merit_asrama > 0) && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {ch.merit_kelab > 0 && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Kelab: {ch.merit_kelab}</span>}
                    {ch.merit_akademik > 0 && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">Akademik: {ch.merit_akademik}</span>}
                    {ch.merit_asrama > 0 && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Asrama: {ch.merit_asrama}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">
          Transaksi Sesi Semasa
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
                const pts = tx.points || 0;
                const isDemerit = pts < 0;
                const src = isDemerit ? 'DEMERIT' : (tx.source || 'KELAB');
                const cfg = SOURCE_CFG[src] || SOURCE_CFG.KELAB;
                const TxIcon = cfg.icon;
                const date = tx.created_at
                  ? format(parseISO(tx.created_at), 'd MMM yyyy, h:mm a', { locale: ms })
                  : '';
                
                const existingAppeal = appeals.find(a => a.transaction_id === tx.id);

                return (
                  <div key={tx.id} className="relative flex items-start gap-3">
                    {/* dot */}
                    <div
                      className="absolute -left-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border mt-1.5"
                      style={{ background: hexToRgba(cfg.color, 0.15), borderColor: hexToRgba(cfg.color, 0.3) }}
                    >
                      <TxIcon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-black line-clamp-2 ${isDemerit ? 'text-rose-300' : 'text-white'}`}>
                          {tx.reason || 'Merit diterima'}
                        </p>
                        <span
                          className="text-sm font-black shrink-0"
                          style={{ color: isDemerit ? '#F87171' : '#34D399' }}
                        >
                          {pts >= 0 ? '+' : ''}{pts}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: hexToRgba(cfg.color, 0.12), color: cfg.color }}>
                          {cfg.label}
                        </span>
                        {tx.actor_name && (
                           <span className="text-[9px] text-white/30 font-bold border border-white/10 px-1.5 py-0.5 rounded">
                             Oleh: {tx.actor_name}
                           </span>
                        )}
                        <span className="text-[9px] text-white/25 font-medium">{date}</span>
                      </div>
                      
                      {/* Appeal Section for Demerits */}
                      {isDemerit && (
                        <div className="mt-3 pt-3 border-t border-rose-500/10">
                          {existingAppeal ? (
                            <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl flex items-center gap-2 inline-flex ${
                              existingAppeal.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              existingAppeal.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {existingAppeal.status === 'APPROVED' ? <CheckCircle className="w-3.5 h-3.5" /> :
                               existingAppeal.status === 'REJECTED' ? <XCircle className="w-3.5 h-3.5" /> :
                               <Clock className="w-3.5 h-3.5" />}
                              Rayuan: {existingAppeal.status === 'PENDING' ? 'DIPROSES' : existingAppeal.status === 'APPROVED' ? 'DILULUSKAN' : 'DITOLAK'}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setSelectedTx(tx); setShowAppealModal(true); }}
                              className="text-[10px] font-black uppercase tracking-widest bg-rose-500/15 text-rose-300 border border-rose-500/30 px-4 py-2 rounded-xl hover:bg-rose-500/25 transition-all"
                            >
                              Buat Rayuan / Bantahan
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Appeal Modal */}
      <AnimatePresence>
        {showAppealModal && selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAppealModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Rayuan Demerit</h3>
                  <p className="text-[10px] text-white/40">Sila nyatakan alasan munasabah</p>
                </div>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] uppercase font-black text-white/30 mb-1">Kesalahan:</p>
                <p className="text-xs font-bold text-rose-300">{selectedTx.reason}</p>
                <p className="text-[10px] text-rose-400 mt-1">Potongan: {selectedTx.points} Merit</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">Alasan Rayuan</label>
                  <textarea
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    placeholder="Kenapa demerit ini tidak wajar?"
                    rows={4}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-rose-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Pautan Bukti (Jika Ada)
                  </label>
                  <input
                    value={appealProof}
                    onChange={(e) => setAppealProof(e.target.value)}
                    placeholder="Link Google Drive / Imej"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-rose-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowAppealModal(false)}
                  className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white/40 bg-white/5 hover:bg-white/10 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={submitAppeal}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Menghantar...' : 'Hantar Rayuan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
