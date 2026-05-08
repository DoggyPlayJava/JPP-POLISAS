import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, ShieldCheck, KeyRound, Calendar, QrCode, ClipboardList, CheckCircle2, XCircle, Clock, ChevronDown, Loader2, User, AlertCircle } from 'lucide-react';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba, cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { JppStructureSettings } from './JppStructureSettings';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { QrLinkManager } from '@/components/jpp/QrLinkManager';

// ═════════════════════════════════════════════════════════════════════════════
// ProfileEditRequestsSection — Panel semakan pindaan profil pelajar untuk JPP
// Setiap kelulusan/penolakan direkodkan sebagai Audit Log (reviewed_by, reviewed_at, review_note)
// ═════════════════════════════════════════════════════════════════════════════
function ProfileEditRequestsSection({ themeColor }: { themeColor: string }) {
  const { user, profile } = useAuth();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  // Modal state
  const [reviewModal, setReviewModal] = React.useState<{ open: boolean; req: any | null; action: 'APPROVED' | 'REJECTED' | null }>({
    open: false, req: null, action: null
  });
  const [reviewNote, setReviewNote] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  const fetchRequests = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_edit_requests')
        .select('*, requester:profiles!profile_edit_requests_user_id_fkey(full_name, matric_no, department, email), reviewer:profiles!profile_edit_requests_reviewed_by_fkey(full_name)')
        .order('submitted_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      toast.error('Gagal muatkan permintaan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  const openModal = (req: any, action: 'APPROVED' | 'REJECTED') => {
    setReviewNote('');
    setReviewModal({ open: true, req, action });
  };

  const handleReview = async () => {
    if (!reviewModal.req || !reviewModal.action || !user || !profile) return;
    if (reviewModal.action === 'REJECTED' && !reviewNote.trim()) {
      toast.error('Sila masukkan sebab penolakan.');
      return;
    }
    setProcessing(true);
    const { req, action } = reviewModal;
    try {
      // ── 1. KEMASKINI STATUS PERMINTAAN (Audit Log Fields) ─────────────────
      const { error: updateErr } = await supabase
        .from('profile_edit_requests')
        .update({
          status: action,
          reviewed_by: user.id,    // Audit: Siapa yang buat keputusan
          review_note: reviewNote.trim() || null,
          // reviewed_at akan dikemaskini automatik oleh trigger DB
        })
        .eq('id', req.id);
      if (updateErr) throw updateErr;

      // ── 2. JIKA DILULUSKAN: kemaskini profiles ────────────────────────────
      if (action === 'APPROVED') {
        const profileUpdate: Record<string, any> = {};
        if (req.field_type === 'matric_no') {
          profileUpdate.matric_no = req.requested_value;
        } else if (req.field_type === 'semester') {
          profileUpdate.semester_override = parseInt(req.requested_value, 10);
        }
        const { error: profileErr } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', req.user_id);
        if (profileErr) throw profileErr;
      }

      // ── 3. NOTIFIKASI KEPADA STUDENT ──────────────────────────────────────
      const fieldLabel = req.field_type === 'matric_no' ? 'No. Matrik' : 'Semester';
      const isApproved = action === 'APPROVED';
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        title: isApproved
          ? `✅ Permintaan Pindaan ${fieldLabel} Diluluskan`
          : `❌ Permintaan Pindaan ${fieldLabel} Ditolak`,
        message: isApproved
          ? `Permintaan anda untuk menukar ${fieldLabel} kepada "${req.requested_value}" telah diluluskan oleh MT JPP${reviewNote.trim() ? `. Nota: ${reviewNote.trim()}` : '.'}`
          : `Permintaan anda untuk menukar ${fieldLabel} kepada "${req.requested_value}" telah ditolak. Sebab: ${reviewNote.trim()}`,
        type: 'SYSTEM',
        is_read: false,
      });

      toast.success(`Permintaan berjaya ${isApproved ? 'diluluskan' : 'ditolak'}. Audit log direkodkan.`);
      setReviewModal({ open: false, req: null, action: null });
      setReviewNote('');
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa memproses.');
    } finally {
      setProcessing(false);
    }
  };

  const filterTabs: Array<{ key: 'PENDING' | 'APPROVED' | 'REJECTED'; label: string }> = [
    { key: 'PENDING', label: 'Menunggu' },
    { key: 'APPROVED', label: 'Diluluskan' },
    { key: 'REJECTED', label: 'Ditolak' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="space-y-6">
      {/* Header seksyen */}
      <div className="flex items-center gap-3 px-2">
        <ClipboardList className="w-5 h-5" style={{ color: themeColor }} />
        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Semakan Pindaan Profil Pelajar</h3>
        {pendingCount > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400">{pendingCount} PENDING</span>
        )}
      </div>

      <div className="rounded-[2rem] overflow-hidden border" style={{ borderColor: hexToRgba(themeColor, 0.2), background: hexToRgba(themeColor, 0.03) }}>
        {/* Filter tabs */}
        <div className="flex border-b" style={{ borderColor: hexToRgba(themeColor, 0.15) }}>
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all',
                filter === tab.key
                  ? 'text-white border-b-2'
                  : 'text-white/30 hover:text-white/60'
              )}
              style={filter === tab.key ? { borderBottomColor: themeColor, color: themeColor } : {}}
            >
              {tab.label}
              {tab.key === 'PENDING' && pendingCount > 0 && <span className="ml-1.5 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-white/30 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuatkan...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-xs font-medium">Tiada rekod {filter === 'PENDING' ? 'menunggu semakan' : filter === 'APPROVED' ? 'yang telah diluluskan' : 'yang ditolak'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(req => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{ background: hexToRgba(themeColor, 0.04), borderColor: hexToRgba(themeColor, 0.12) }}
                >
                  {/* Info pelajar & permintaan */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: hexToRgba(themeColor, 0.15) }}>
                        <User className="w-3.5 h-3.5" style={{ color: themeColor }} />
                      </div>
                      <p className="text-sm font-black text-white truncate">{req.requester?.full_name ?? '—'}</p>
                      {req.requester?.matric_no && <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded-lg">{req.requester.matric_no}</span>}
                    </div>

                    <div className="ml-9">
                      <p className="text-xs text-white/60 font-medium">
                        <span className="text-white/30">Pindaan:</span>{' '}
                        <span className="font-bold text-white/80">{req.field_type === 'matric_no' ? 'No. Matrik' : 'Semester'}</span>
                        {' '}—{' '}
                        <span className="line-through text-white/30 font-mono text-[11px]">{req.current_value ?? '—'}</span>
                        {' → '}
                        <span className="font-black text-white font-mono">{req.requested_value}</span>
                      </p>
                      {req.reason && <p className="text-[11px] text-white/40 mt-1">Sebab: {req.reason}</p>}
                      {req.review_note && <p className="text-[11px] text-amber-400/80 mt-1">Nota JPP: {req.review_note}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/25">
                        <span>Dihantar: {new Date(req.submitted_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {req.reviewed_at && <span>· Disemak: {new Date(req.reviewed_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        {req.reviewer?.full_name && <span>· oleh {req.reviewer.full_name}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Butang tindakan */}
                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openModal(req, 'REJECTED')}
                        className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5 inline mr-1" />Tolak
                      </button>
                      <button
                        onClick={() => openModal(req, 'APPROVED')}
                        className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/30"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Lulus
                      </button>
                    </div>
                  )}

                  {req.status !== 'PENDING' && (
                    <div className="shrink-0">
                      {req.status === 'APPROVED'
                        ? <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />DILULUSKAN</span>
                        : <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black bg-red-500/15 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3" />DITOLAK</span>
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal pengesahan kelulusan/penolakan */}
      <AnimatePresence>
        {reviewModal.open && reviewModal.req && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !processing && setReviewModal({ open: false, req: null, action: null })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-[2rem] p-6 border bg-[#0f0f1a] z-10"
              style={{ borderColor: hexToRgba(themeColor, 0.25) }}
            >
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${reviewModal.action === 'APPROVED' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {reviewModal.action === 'APPROVED'
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      : <XCircle className="w-5 h-5 text-red-400" />
                    }
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">{reviewModal.action === 'APPROVED' ? 'Luluskan' : 'Tolak'} Permintaan Pindaan</p>
                    <p className="text-[11px] text-white/40">
                      {reviewModal.req.field_type === 'matric_no' ? 'No. Matrik' : 'Semester'}:
                      {' '}<span className="font-mono text-white/60 line-through">{reviewModal.req.current_value}</span>
                      {' → '}<span className="font-mono text-white font-black">{reviewModal.req.requested_value}</span>
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">Pelajar: {reviewModal.req.requester?.full_name}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-white/40">
                    {reviewModal.action === 'REJECTED' ? 'Sebab Penolakan *' : 'Nota Ulasan (Pilihan)'}
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    rows={3}
                    placeholder={reviewModal.action === 'REJECTED' ? 'Nyatakan sebab penolakan...' : 'Nota tambahan (jika ada)...'}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 font-medium resize-none focus:outline-none focus:border-white/20"
                  />
                  <p className="text-[10px] text-white/25">⚙ Nota ini akan direkodkan dalam Audit Log dan dihantar kepada pelajar.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setReviewModal({ open: false, req: null, action: null })}
                    disabled={processing}
                    className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider border border-white/10 text-white/40 hover:bg-white/5 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleReview}
                    disabled={processing || (reviewModal.action === 'REJECTED' && !reviewNote.trim())}
                    className={cn(
                      'flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40',
                      reviewModal.action === 'APPROVED'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25'
                    )}
                  >
                    {processing
                      ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Memproses...</>
                      : reviewModal.action === 'APPROVED' ? 'Sahkan Kelulusan' : 'Sahkan Penolakan'
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

export function JppSettingsPage() {
    const { isSuperAdmin, profile, isJppMember } = useAuth();
    const isYDP = profile?.jpp_position === 'YANG_DIPERTUA' || profile?.jpp_position === 'YDP' || isSuperAdmin;
    const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
    const [loading, setLoading] = useState(true);
    const [intake1Month, setIntake1Month] = useState(7);
    const [intake2Month, setIntake2Month] = useState(1);
    const [savingIntake, setSavingIntake] = useState(false);
    

    const [settings, setSettings] = useState<Record<string, any>>({
        staff_registration_code: '',
        traditional_registration_enabled: true
    });

    useEffect(() => {
        supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
            .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
        fetchData();
    }, []);

    // ── Semak dan hantar notifikasi 1 bulan sebelum intake ──────────────────────
    const checkAndSendIntakeAlert = async (m1: number, m2: number) => {
        if (!isSuperAdmin && !isYDP) return;
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-indexed
        const currentYear  = now.getFullYear();

        const alertMonth1 = m1 === 1 ? 12 : m1 - 1;
        const alertMonth2 = m2 === 1 ? 12 : m2 - 1;

        let intakeNum: number | null = null;
        if (currentMonth === alertMonth1) intakeNum = 1;
        else if (currentMonth === alertMonth2) intakeNum = 2;
        if (!intakeNum) return;

        const alertKey = `intake_${intakeNum}_alert_sent_${currentYear}`;
        const { data: existing } = await supabase
            .from('system_settings').select('value').eq('key', alertKey).maybeSingle();
        if (existing?.value === true) return; // Sudah hantar tahun ini

        const { data: admins } = await supabase
            .from('profiles').select('id').in('role', ['SUPER_ADMIN_JPP', 'ADMIN']);
        if (admins && admins.length > 0) {
            await supabase.from('notifications').insert(
                admins.map(a => ({
                    user_id: a.id,
                    title:   `⚠️ Semak Konfigurasi Intake ${intakeNum} — 1 Bulan Lagi`,
                    message: `Pengambilan Pelajar Intake ${intakeNum} dijangka bermula dalam ±1 bulan. Sila semak dan kemaskini bulan mula pengambilan di Tetapan Utama JPP jika perlu.`,
                    type:    'SYSTEM',
                    is_read: false,
                }))
            );
        }
        await supabase.from('system_settings').upsert({ key: alertKey, value: true });
    };

    const fetchData = async () => {
        setLoading(true);
        const { data: settingsData } = await supabase.from('system_settings').select('*');
        if (settingsData) {
            const s = { ...settings };
            settingsData.forEach(item => {
                let val = item.value;
                if (val === 'true') val = true;
                if (val === 'false') val = false;
                if (val === 'string' && val.startsWith('"') && val.endsWith('"')) { val = val.slice(1, -1); }
                s[item.key] = val;
                if (item.key === 'intake_1_month') setIntake1Month(Number(val) || 7);
                if (item.key === 'intake_2_month') setIntake2Month(Number(val) || 1);
            });
            setSettings(s);
            // Cek alert selepas data dimuatkan
            const m1 = Number(settingsData.find(i => i.key === 'intake_1_month')?.value) || 7;
            const m2 = Number(settingsData.find(i => i.key === 'intake_2_month')?.value) || 1;
            checkAndSendIntakeAlert(m1, m2);
        }
        setLoading(false);
    };

    const toggleSetting = async (key: string, currentValue: boolean) => {
        const newValue = !currentValue;
        const toastId = toast.loading('Mengemaskini...');
        try {
            const strVal = String(newValue);
            const { data, error } = await supabase.from('system_settings')
                .update({ value: strVal })
                .eq('key', key)
                .select();
            if (error) throw error;
            if (!data || data.length === 0) {
                const { error: insErr } = await supabase.from('system_settings').insert({ key, value: strVal });
                if (insErr) throw insErr;
            }
            setSettings(s => ({ ...s, [key]: newValue }));
            toast.success(`Berjaya dilaras.`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message, { id: toastId });
        }
    };

    const updateStaffCode = async () => {
        const input = window.prompt("Masukkan kod pendaftaran staf baharu. \nPENTING: Kod ini wajib dirahsiakan. Sentiasa gunakan huruf besar (Uppercase) tanpa jarak.", settings.staff_registration_code);
        if (input === null) return;
        
        const newCode = input.trim().toUpperCase();
        if (newCode.length < 5) {
            toast.error("Kod baharu mestilah sekurang-kurangnya 5 aksara.");
            return;
        }

        const toastId = toast.loading('Mengemaskini kod staf...');
        try {
            const { data, error } = await supabase.from('system_settings').update({ value: JSON.stringify(newCode) }).eq('key', 'staff_registration_code').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'staff_registration_code', value: JSON.stringify(newCode) });
            
            setSettings(s => ({ ...s, staff_registration_code: newCode }));
            toast.success(`Kod pendaftaran staf berjaya dikemaskini. Kod baharu: ${newCode}`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || 'Gagal kemaskini kod staf', { id: toastId });
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30 text-xs uppercase tracking-widest">Memuatkan Tetapan Sistem...</div>;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white py-10 px-6 overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-10"
                    style={{ background: themeColor }} />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto space-y-10">
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ background: hexToRgba(themeColor, 0.1), borderColor: hexToRgba(themeColor, 0.2), color: themeColor }}>
                            <SettingsIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white leading-tight">Tetapan Utama JPP</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">Konfigurasi & parameter global portal</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <ShieldCheck className="w-5 h-5 text-violet-500" />
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Ketetapan Sistem & Akses</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tetapan KPP telah dipindahkan ke Dashboard KPP (Laporan PDF, Had Keahlian, Takwim) */}

                        {/* Traditional Registration Toggle */}
                        {isSuperAdmin && (
                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-violet-900/10 to-violet-900/5 border border-violet-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 md:col-span-2 group hover:from-violet-900/20 transition-all">
                                <div className="flex items-center gap-4 w-full sm:w-auto flex-col sm:flex-row text-center sm:text-left">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-white">Traditional Registration (Emel & Kata Laluan)</p>
                                        <p className="text-xs text-violet-400/70 font-medium">Benarkan pendaftaran menggunakan emel dan kata laluan untuk pelajar. Tutup fungsi ini waktu orientasi untuk elak database overload.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <button
                                        onClick={() => toggleSetting('traditional_registration_enabled', settings.traditional_registration_enabled !== false)}
                                        className={cn(
                                            "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            settings.traditional_registration_enabled !== false ? "bg-violet-600" : "bg-white/10"
                                        )}
                                    >
                                        <span className={cn(
                                            "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                                            settings.traditional_registration_enabled !== false ? "translate-x-3" : "-translate-x-3"
                                        )} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Kod Pendaftaran Staf - Hanya untuk SUPER ADMIN */}
                        {isSuperAdmin && (
                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-rose-900/10 to-rose-900/5 border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 md:col-span-2 group hover:from-rose-900/20 transition-all">
                                <div className="flex items-center gap-4 w-full sm:w-auto flex-col sm:flex-row text-center sm:text-left">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-white">Kod Pendaftaran Staf</p>
                                        <p className="text-xs text-rose-400/70 font-medium">Kod rahsia yang digunakan semasa pendaftaran staf/pensyarah.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <div className="bg-black/40 px-4 py-3 rounded-xl font-mono text-sm font-bold text-rose-200 border border-rose-500/20">
                                        {settings.staff_registration_code || '••••••••'}
                                    </div>
                                    <button onClick={updateStaffCode} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/50 transition-all w-full sm:w-auto">
                                        Tukar Kod
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Konfigurasi Takwim Pengambilan — SUPER_ADMIN sahaja */}
                {isSuperAdmin && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <Calendar className="w-5 h-5 text-amber-500" />
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Konfigurasi Takwim Pengambilan</h3>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-amber-900/10 to-amber-900/5 border border-amber-500/20 space-y-6 md:col-span-2 group hover:from-amber-900/20 transition-all">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-base font-black text-white">Bulan Permulaan Intake</p>
                                    <p className="text-xs text-amber-400/70 font-medium mt-1">Tetapkan bulan mula setiap sesi pengambilan pelajar. Notifikasi semak sahaja akan dihantar kepada pentadbir sebulan sebelum tarikh ini.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Intake 1 */}
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white/50">Intake Pertama (Pertengahan Tahun)</p>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={intake1Month}
                                            onChange={e => setIntake1Month(Number(e.target.value))}
                                            className="flex-1 h-11 bg-black/40 border border-amber-500/20 rounded-xl text-sm text-white/80 font-bold px-3 focus:outline-none focus:border-amber-500/50"
                                        >
                                            {MONTH_NAMES.slice(1).map((m, i) => (
                                                <option key={i + 1} value={i + 1}>{m} ({i + 1})</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={async () => {
                                                setSavingIntake(true);
                                                try {
                                                    await supabase.from('system_settings').update({ value: intake1Month }).eq('key', 'intake_1_month');
                                                    toast.success(`Intake 1 dikemaskini: ${MONTH_NAMES[intake1Month]}`);
                                                } catch { toast.error('Gagal simpan.'); }
                                                finally { setSavingIntake(false); }
                                            }}
                                            disabled={savingIntake}
                                            className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white shadow transition-all whitespace-nowrap"
                                        >
                                            Simpan
                                        </button>
                                    </div>
                                </div>

                                {/* Intake 2 */}
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white/50">Intake Kedua (Awal Tahun)</p>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={intake2Month}
                                            onChange={e => setIntake2Month(Number(e.target.value))}
                                            className="flex-1 h-11 bg-black/40 border border-amber-500/20 rounded-xl text-sm text-white/80 font-bold px-3 focus:outline-none focus:border-amber-500/50"
                                        >
                                            {MONTH_NAMES.slice(1).map((m, i) => (
                                                <option key={i + 1} value={i + 1}>{m} ({i + 1})</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={async () => {
                                                setSavingIntake(true);
                                                try {
                                                    await supabase.from('system_settings').update({ value: intake2Month }).eq('key', 'intake_2_month');
                                                    toast.success(`Intake 2 dikemaskini: ${MONTH_NAMES[intake2Month]}`);
                                                } catch { toast.error('Gagal simpan.'); }
                                                finally { setSavingIntake(false); }
                                            }}
                                            disabled={savingIntake}
                                            className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white shadow transition-all whitespace-nowrap"
                                        >
                                            Simpan
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-amber-500/60 font-medium border-t border-amber-500/10 pt-4">
                                ⚠ Ubah nilai ini SEBELUM pengambilan baharu bermula. Sistem akan menghantar notifikasi kepada pentadbir secara automatik sebulan sebelum tarikh yang ditetapkan.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ── Penjana QR Code — Semua ahli JPP boleh guna ── */}
                {isJppMember && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <QrCode className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Penjana QR Link</h3>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-emerald-900/10 to-emerald-900/5 border border-emerald-500/20 hover:from-emerald-900/20 transition-all">
                            <QrLinkManager showHeader={false} />
                        </div>
                    </motion.div>
                )}


                {/* Struktur JPP & Majlis Tertinggi (Boleh diakses oleh Super Admin / YDP) */}
                {isYDP && (
                    <JppStructureSettings />
                )}

            </div>
        </div>
    );
}
