import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { hexToRgba } from '@/lib/utils';
import {
  ShieldAlert, UserX, Search, AlertCircle, CheckCircle,
  XCircle, Clock, Loader2, FileText, ChevronRight, Settings, Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';

const THEME = '#ef4444'; // Red theme for demerits

interface DemeritManagerProps {
  sourceOverride?: 'KELAB' | 'AKADEMIK' | 'QR_SCAN' | 'MANUAL';
}

export function DemeritManager({ sourceOverride }: DemeritManagerProps = {}) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'NEW_DEMERIT' | 'APPEALS' | 'SETTINGS'>('NEW_DEMERIT');
  
  // New Demerit State
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [demeritForm, setDemeritForm] = useState({ reason: '', points: 5, proof_url: '' });
  const [submitting, setSubmitting] = useState(false);

  // Appeals State
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loadingAppeals, setLoadingAppeals] = useState(false);

  // Exco check
  const isExco = profile?.role === 'JPP' || profile?.role === 'SUPER_ADMIN_JPP' || profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN';
  const isAdmin = profile?.role === 'SUPER_ADMIN_JPP' || profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN';

  // Tutup Kohort State
  const [selectedSession, setSelectedSession] = useState('');
  const [cohortConfirm, setCohortConfirm] = useState('');
  const [archiving, setArchiving] = useState(false);

  // Generate academic session options dynamically
  const sessionOptions = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const opts: string[] = [];
    // Current academic year: if month >= 6 (July), it's Year/Year+1, else Year-1/Year
    const startYear = month >= 6 ? year : year - 1;
    // Generate recent sessions
    for (let y = startYear; y >= startYear - 1; y--) {
      opts.push(`Sem 2 ${y}/${y + 1}`);
      opts.push(`Sem 1 ${y}/${y + 1}`);
    }
    return opts;
  })();

  // Current session for highlighting
  const currentSession = (() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return m >= 6 ? `Sem 1 ${y}/${y + 1}` : `Sem 2 ${y - 1}/${y}`;
  })();

  const cohortName = selectedSession; // used by handleArchiveCohort
  const confirmMatch = cohortConfirm === selectedSession;

  // Search Students
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 3) {
        setStudents([]);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, matric_no')
        .or(`full_name.ilike.%${searchQuery}%,matric_no.ilike.%${searchQuery}%`)
        .limit(10);
      setStudents(data || []);
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDemerit = async () => {
    if (!selectedStudent) return;
    if (!demeritForm.reason) { toast.error('Sila nyatakan kesalahan'); return; }
    
    setSubmitting(true);
    try {
      let finalSource = sourceOverride || 'MANUAL';
      if (finalSource === 'MANUAL') {
        if (profile?.jpp_unit === 'KK') finalSource = 'QR_SCAN';
        else if (profile?.jpp_unit === 'KPP') finalSource = 'KELAB';
        else if (profile?.jpp_unit === 'AKADEMIK') finalSource = 'AKADEMIK';
      }

      const { error } = await supabase.from('merit_transactions').insert({
        user_id: selectedStudent.id,
        points: -Math.abs(demeritForm.points), // ensure negative
        reason: demeritForm.reason,
        actor_name: profile?.full_name,
        source: finalSource,
        proof_url: demeritForm.proof_url || null
      });

      if (error) throw error;
      
      // Update profile — jika gagal, log error tapi jangan block UI
      const { error: rpcError } = await supabase.rpc('increment_merit_by_source', {
        p_uid: selectedStudent.id,
        p_delta: -Math.abs(demeritForm.points),
        p_src: finalSource
      });
      if (rpcError) console.error('RPC increment_merit_by_source gagal:', rpcError.message);

      toast.success(`Demerit berjaya direkod untuk ${selectedStudent.full_name}`);
      setSelectedStudent(null);
      setSearchQuery('');
      setDemeritForm({ reason: '', points: 5, proof_url: '' });
    } catch (err: any) {
      toast.error(err.message || 'Gagal merekod demerit');
    } finally {
      setSubmitting(false);
    }
  };

  const loadAppeals = useCallback(async () => {
    setLoadingAppeals(true);
    // Fetch pending appeals with student info and transaction info
    const { data, error } = await supabase
      .from('demerit_appeals')
      .select('*, student:profiles!user_id(full_name, matric_no), transaction:merit_transactions!transaction_id(reason, points, source)')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Gagal memuatkan rayuan');
    } else {
      setAppeals(data || []);
    }
    setLoadingAppeals(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'APPEALS') {
      loadAppeals();
    }
  }, [activeTab, loadAppeals]);

  const updateAppealStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      // 1. Update Appeal
      const { error } = await supabase
        .from('demerit_appeals')
        .update({ status, reviewed_by: profile?.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;

      // 2. If approved, we need to refund the merit
      if (status === 'APPROVED') {
        const appeal = appeals.find(a => a.id === id);
        if (appeal && appeal.transaction) {
          const refundPoints = Math.abs(appeal.transaction.points);
          
          let finalSource = appeal.transaction.source || sourceOverride || 'MANUAL';
          if (finalSource === 'MANUAL') {
            if (profile?.jpp_unit === 'KK') finalSource = 'QR_SCAN';
            else if (profile?.jpp_unit === 'KPP') finalSource = 'KELAB';
            else if (profile?.jpp_unit === 'AKADEMIK') finalSource = 'AKADEMIK';
          }

          await supabase.from('merit_transactions').insert({
            user_id: appeal.user_id,
            points: refundPoints,
            reason: `Refund Rayuan Lulus: ${appeal.transaction.reason}`,
            actor_name: profile?.full_name,
            source: finalSource
          });

          const { error: rpcError } = await supabase.rpc('increment_merit_by_source', {
            p_uid: appeal.user_id,
            p_delta: refundPoints,
            p_src: finalSource
          });
          if (rpcError) console.error('RPC refund gagal:', rpcError.message);
        }
      }

      toast.success(status === 'APPROVED' ? 'Rayuan diluluskan' : 'Rayuan ditolak');
      loadAppeals();
    } catch (err: any) {
      toast.error(err.message || 'Ralat mengemaskini status rayuan');
    }
  };

  const handleArchiveCohort = async () => {
    if (!cohortName) { toast.error('Sila masukkan nama Sesi/Kohort'); return; }

    // Determine which pool to reset based on sourceOverride or unit
    let resetSource = sourceOverride;
    if (!resetSource || resetSource === 'MANUAL') {
      if (profile?.jpp_unit === 'KK') resetSource = 'QR_SCAN';
      else if (profile?.jpp_unit === 'KPP') resetSource = 'KELAB';
      else if (profile?.jpp_unit === 'AKADEMIK') resetSource = 'AKADEMIK';
    }

    const poolLabel = resetSource === 'KELAB' ? 'Merit Kelab' : resetSource === 'AKADEMIK' ? 'Merit Akademik' : resetSource === 'QR_SCAN' ? 'Merit Asrama' : 'Semua Merit';
    const isGlobal = isAdmin && (!resetSource || resetSource === 'MANUAL');

    const confirmMsg = isGlobal
      ? `PERINGATAN: Adakah anda pasti untuk TUTUP KOHORT "${cohortName}"?\n\nSEMUA merit pelajar akan di-reset ke 0. Proses ini tidak boleh diundur.`
      : `PERINGATAN: Adakah anda pasti untuk TUTUP KOHORT "${cohortName}"?\n\nHanya ${poolLabel} akan di-reset ke 0. Merit pool lain kekal.`;

    if (!window.confirm(confirmMsg)) return;

    setArchiving(true);
    try {
      if (isGlobal) {
        // Super Admin — global reset semua pool
        const { error } = await supabase.rpc('archive_merit_cohort', {
          p_cohort_id: cohortName
        });
        if (error) throw error;
      } else {
        // Unit Exco — reset pool sendiri sahaja
        const { error } = await supabase.rpc('archive_merit_by_source', {
          p_cohort_id: cohortName,
          p_source: resetSource
        });
        if (error) throw error;
      }
      toast.success(`Kohort "${cohortName}" (${isGlobal ? 'Global' : poolLabel}) telah berjaya ditutup.`);
      setSelectedSession('');
      setCohortConfirm('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menutup kohort');
    } finally {
      setArchiving(false);
    }
  };

  if (!isExco) {
    return (
      <div className="py-12 text-center text-white/50">
        <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-black">Akses Ditolak</h2>
        <p className="text-sm">Hanya EXCO dibenarkan mengakses modul ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" /> Pengurusan Demerit
          </h1>
          <p className="text-xs text-white/40 font-medium mt-1">Urus potongan merit pelajar dan nilai rayuan</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/[0.02] border border-white/[0.05] p-1.5 rounded-2xl w-max">
        <button
          onClick={() => setActiveTab('NEW_DEMERIT')}
          className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'NEW_DEMERIT' ? 'bg-rose-500/20 text-rose-400' : 'text-white/40 hover:text-white/70'
          }`}
        >
          Rekod Baru
        </button>
        <button
          onClick={() => setActiveTab('APPEALS')}
          className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'APPEALS' ? 'bg-rose-500/20 text-rose-400' : 'text-white/40 hover:text-white/70'
          }`}
        >
          Rayuan Pelajar
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'SETTINGS' ? 'bg-rose-500/20 text-rose-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Tetapan
          </button>
        )}
        {!isAdmin && sourceOverride && sourceOverride !== 'MANUAL' && (
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'SETTINGS' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Tutup Kohort
          </button>
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={activeTab}
      >
        {activeTab === 'NEW_DEMERIT' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search Panel */}
            <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] space-y-4">
              <h3 className="text-sm font-black text-white">1. Pilih Pelajar</h3>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Cari nama atau matrik..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-rose-500/50"
                />
              </div>

              {selectedStudent ? (
                <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{selectedStudent.full_name}</p>
                    <p className="text-[10px] text-white/50">{selectedStudent.matric_no}</p>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="text-rose-400 p-1 bg-rose-500/20 rounded-lg">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2 mt-4">
                  {students.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className="w-full text-left p-3 rounded-xl border border-white/[0.05] hover:bg-white/[0.05] transition-all flex items-center gap-3"
                    >
                      <UserX className="w-4 h-4 text-white/30" />
                      <div>
                        <p className="text-xs font-black text-white">{s.full_name}</p>
                        <p className="text-[10px] text-white/40">{s.matric_no}</p>
                      </div>
                    </button>
                  ))}
                  {searchQuery.length >= 3 && students.length === 0 && (
                    <p className="text-xs text-white/30 text-center py-4">Tiada pelajar ditemui.</p>
                  )}
                </div>
              )}
            </div>

            {/* Demerit Form */}
            <div className={`bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] space-y-4 transition-all ${!selectedStudent ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <h3 className="text-sm font-black text-white">2. Butiran Kesalahan</h3>
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">Kesalahan</label>
                <textarea
                  value={demeritForm.reason}
                  onChange={(e) => setDemeritForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Cth: Tidak hadir mesyuarat, melanggar peraturan asrama..."
                  rows={3}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-rose-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1.5">Jumlah Potongan</label>
                  <input
                    type="number"
                    min="1"
                    value={demeritForm.points}
                    onChange={(e) => setDemeritForm(p => ({ ...p, points: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-rose-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">Pautan Bukti</label>
                  <input
                    type="text"
                    placeholder="Link GDrive/Imej (Opsional)"
                    value={demeritForm.proof_url}
                    onChange={(e) => setDemeritForm(p => ({ ...p, proof_url: e.target.value }))}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <button
                onClick={handleDemerit}
                disabled={submitting}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-500 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                Rekod Demerit
              </button>
            </div>
          </div>
        ) : activeTab === 'APPEALS' ? (
          <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem]">
            {loadingAppeals ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
            ) : appeals.length === 0 ? (
              <div className="py-12 text-center text-white/30">Tiada rayuan setakat ini.</div>
            ) : (
              <div className="space-y-4">
                {appeals.map(appeal => (
                  <div key={appeal.id} className="p-4 rounded-2xl bg-black/20 border border-white/10 flex flex-col md:flex-row gap-4 justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          appeal.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                          appeal.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-rose-500/20 text-rose-400'
                        }`}>
                          {appeal.status}
                        </span>
                        <span className="text-[10px] text-white/30">
                          {format(parseISO(appeal.created_at), 'd MMM yyyy')}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-sm font-black text-white">{appeal.student?.full_name}</p>
                        <p className="text-[10px] text-white/50">{appeal.student?.matric_no}</p>
                      </div>

                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] uppercase font-black text-rose-400 mb-1">Kesalahan Asal: {appeal.transaction?.reason} ({appeal.transaction?.points} Merit)</p>
                        <p className="text-xs text-white/80"><span className="text-white/40">Alasan Rayuan:</span> {appeal.appeal_reason}</p>
                        {appeal.proof_url && (
                          <a href={appeal.proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline mt-2 inline-flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Lihat Bukti Dilampirkan
                          </a>
                        )}
                      </div>
                    </div>

                    {appeal.status === 'PENDING' && (
                      <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                        <button
                          onClick={() => updateAppealStatus(appeal.id, 'APPROVED')}
                          className="flex-1 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Terima & Refund
                        </button>
                        <button
                          onClick={() => updateAppealStatus(appeal.id, 'REJECTED')}
                          className="flex-1 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] max-w-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Tutup Kohort Merit</h3>
                  <p className="text-[10px] text-white/40">Arkib semua merit pelajar untuk sesi lepas</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-[10px] font-black text-rose-300 mb-2 uppercase tracking-widest">Awas: Operasi Kekal</p>
                <ul className="text-[11px] text-rose-200/80 list-disc list-inside space-y-1">
                  {sourceOverride && sourceOverride !== 'MANUAL' ? (
                    <>
                      <li>Hanya <b>{sourceOverride === 'KELAB' ? 'Merit Kelab' : sourceOverride === 'AKADEMIK' ? 'Merit Akademik' : 'Merit Asrama'}</b> akan di-reset.</li>
                      <li>Merit pool lain kekal tidak berubah.</li>
                      <li>Jumlah merit total akan dikurangkan mengikut baki pool ini.</li>
                    </>
                  ) : (
                    <>
                      <li>Semua transaksi merit sesi semasa akan dikategorikan di bawah Sesi ini.</li>
                      <li>Satu rekod sejarah akan dicipta untuk setiap pelajar.</li>
                      <li>Baki merit <b>semua pelajar</b> akan di-reset kepada 0 untuk mula sesi baharu.</li>
                    </>
                  )}
                </ul>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">Pilih Sesi Akademik</label>
                <select
                  value={selectedSession}
                  onChange={(e) => { setSelectedSession(e.target.value); setCohortConfirm(''); }}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-neutral-900">— Pilih sesi —</option>
                  {sessionOptions.map(s => (
                    <option key={s} value={s} className="bg-neutral-900">{s}{s === currentSession ? ' ★ Semasa' : ''}</option>
                  ))}
                </select>
              </div>

              {selectedSession && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">
                    Taip “<span className="text-amber-400">{selectedSession}</span>” untuk sahkan
                  </label>
                  <input
                    type="text"
                    placeholder={selectedSession}
                    value={cohortConfirm}
                    onChange={(e) => setCohortConfirm(e.target.value)}
                    className={`w-full bg-black/20 border rounded-xl px-4 py-3 text-sm text-white outline-none transition-all ${
                      cohortConfirm && !confirmMatch ? 'border-rose-500/50' : 'border-white/10 focus:border-amber-500/50'
                    }`}
                  />
                  {cohortConfirm && !confirmMatch && (
                    <p className="text-[10px] text-rose-400 mt-1">Nama sesi tidak sepadan.</p>
                  )}
                </div>
              )}

              <button
                onClick={handleArchiveCohort}
                disabled={archiving || !selectedSession || !confirmMatch}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest bg-amber-600 text-white hover:bg-amber-500 transition-all disabled:opacity-50 mt-4"
              >
                {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                Sahkan Tutup Kohort
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
