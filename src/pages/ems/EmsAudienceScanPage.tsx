import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import {
  QrCode,
  Sparkles,
  CheckCircle2,
  Trophy,
  User,
  Mail,
  Phone,
  CreditCard,
  Send,
  RefreshCw,
  AlertCircle,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { supabase } from '@/lib/supabase';
import type { EmsEvent, EmsVisitor } from '@/types';

export interface EmsAudienceScanPageProps {
  initialEvent?: EmsEvent | null;
  initialLoading?: boolean;
}

export function EmsAudienceScanPage({
  initialEvent = null,
  initialLoading,
}: EmsAudienceScanPageProps = {}) {
  const { t } = useTranslation(['ems', 'common']);
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState<EmsEvent | null>(initialEvent);
  const [loading, setLoading] = useState(initialLoading ?? (initialEvent ? false : true));
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [matrixNo, setMatrixNo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isStudent, setIsStudent] = useState(true);

  // Result State
  const [submittedVisitor, setSubmittedVisitor] = useState<EmsVisitor | null>(null);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (profile || user) {
      if (profile?.full_name) setName(profile.full_name);
      if (profile?.matric_no) setMatrixNo(profile.matric_no);
      if (user?.email) setEmail(user.email);
      if (profile?.phone) setPhone(profile.phone);
    }
  }, [profile, user]);

  // Load Event Details
  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('ems_events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error(t('ems:audience_scan_event_not_found', 'Acara tidak dijumpai'));
        } else {
          setEvent(data as EmsEvent);
        }
      } catch (err: any) {
        console.error('[EMS Audience Scan] Error loading event:', err);
        toast.error(t('ems:audience_scan_event_not_found_desc', 'Gagal memuatkan maklumat acara'));
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, t]);

  const triggerConfettiExplosion = () => {
    const end = Date.now() + 4 * 1000;
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f43f5e'];

    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    if (!name.trim()) {
      toast.error(t('ems:audience_scan_toast_name_required', 'Sila masukkan Nama Penuh.'));
      return;
    }

    try {
      setSubmitting(true);

      // Cegah double-scan: semak rekod sedia ada utk pengunjung sama (matric/email/phone)
      const dedupeKey = (matrixNo.trim() || email.trim() || phone.trim()).toLowerCase();
      if (dedupeKey) {
        const dupQuery = supabase
          .from('ems_visitors')
          .select('id, name, scanned_at')
          .eq('event_id', eventId);
        if (matrixNo.trim()) dupQuery.eq('matrix_no', matrixNo.trim());
        else if (email.trim()) dupQuery.eq('email', email.trim());
        else dupQuery.eq('phone', phone.trim());
        const { data: dup } = await dupQuery.maybeSingle();
        if (dup) {
          setSubmitting(false);
          const timeBadge = new Date(dup.scanned_at).toLocaleTimeString('ms-MY');
          toast.error(t('ems:audience_scan_toast_duplicate', 'Kehadiran anda telah direkodkan pada {{time}}. Tidak boleh scan berulang!', { time: timeBadge }));
          setSubmittedVisitor(dup as unknown as EmsVisitor);
          return;
        }
      }

      // Fetch current count of visitors for this event
      const { count, error: countErr } = await supabase
        .from('ems_visitors')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (countErr) {
        console.warn('[EMS Scan] Error fetching visitor count:', countErr.message);
      }

      const currentVisitorCount = (count || 0) + 1;

      // Check milestone configuration (e.g., [50, 100, 250, 500])
      const milestoneConfig: number[] = Array.isArray(event?.milestone_config)
        ? event!.milestone_config
        : [50, 100, 250, 500];

      const isMilestoneWinner = milestoneConfig.includes(currentVisitorCount);

      // Insert into ems_visitors
      const { data, error } = await supabase
        .from('ems_visitors')
        .insert([
          {
            event_id: eventId,
            user_id: user?.id || null,
            name: name.trim(),
            matrix_no: matrixNo.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            is_milestone_winner: isMilestoneWinner,
            milestone_number: isMilestoneWinner ? currentVisitorCount : null,
          },
        ])
        .select()
        .single();

      if (error) {
        // Race-condition: unique index (event_id + matric/email/phone) tangkap double-scan
        if (error.code === '23505') {
          toast.error(t('ems:audience_scan_toast_duplicate', 'Kehadiran anda telah direkodkan. Tidak boleh scan berulang!'));
          return;
        }
        throw error;
      }

      const newRecord = data as EmsVisitor;
      setSubmittedVisitor(newRecord);

      if (isMilestoneWinner) {
        triggerConfettiExplosion();
        toast.success(t('ems:audience_scan_toast_milestone', 'Tahniah! Anda Pengunjung Ke-{{number}}!', { number: currentVisitorCount }));
      } else {
        toast.success(t('ems:audience_scan_toast_success', 'Kehadiran anda berjaya direkodkan!'));
      }
    } catch (err: any) {
      console.error('[EMS Scan] Error recording attendance:', err);
      toast.error(err.message || t('ems:error_occurred', 'Gagal merekodkan kehadiran. Sila cuba lagi.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 transition-colors">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 dark:text-white/50 animate-pulse">
          {t('ems:audience_scan_loading', 'Memuatkan Portal Kehadiran Pengunjung...')}
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center transition-colors">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black mb-2">{t('ems:audience_scan_event_not_found', 'Acara Tidak Ditemui')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-sm">
          {t('ems:audience_scan_event_not_found_desc', 'Pautan imbasan QR kehadiran ini tidak sah atau acara telah ditamatkan.')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 active:scale-[0.98]"
        >
          {t('ems:audience_scan_back_home', 'Kembali ke Halaman Utama')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 pb-28 md:pb-8 relative overflow-hidden select-none font-sans transition-colors">
      {/* Floating ThemeToggle in top-right corner */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 max-w-md w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider">
            <QrCode className="w-3.5 h-3.5" /> {t('ems:audience_scan_title', 'Portal Imbasan Kehadiran Awam')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-amber-200">
            {event.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> {event.location}
              </span>
            )}
            {event.event_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {new Date(event.event_date).toLocaleDateString('ms-MY')}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        {submittedVisitor ? (
          /* Success / Celebration View */
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl transition-colors animate-fadeIn text-slate-900 dark:text-white">
            {submittedVisitor.is_milestone_winner ? (
              /* Milestone Winner Celebration Card */
              <div className="space-y-5">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-b from-amber-400/30 to-amber-500/10 border border-amber-400/40 text-amber-500 dark:text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.3)] animate-bounce">
                  <Trophy className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-widest border border-amber-400/30 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {t('ems:audience_scan_milestone_title', 'PEMENANG PENGUNJUNG BERTUAH!')}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-300">
                    {t('ems:congrats_and_thank_you', 'TAHNIAH!')}
                  </h2>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-semibold">
                    {t('ems:audience_scan_milestone_desc', 'Anda Adalah Pengunjung Ke-[{{number}}] & Pemenang Bertuah!', { number: submittedVisitor.milestone_number || 1 })}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-left text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" /> {t('ems:checkin_instructions', 'Sila Tunjukkan Skrin Ini Kepada Urus Setia Acara:')}
                  </p>
                  <p>• {t('ems:recipient_name', 'Nama')}: <strong>{submittedVisitor.name}</strong></p>
                  {submittedVisitor.matrix_no && <p>• {t('ems:reg_matrix_no', 'No. Matrik')}: <strong>{submittedVisitor.matrix_no}</strong></p>}
                  <p>• {t('ems:checkin_table_th_time', 'Masa Imbasan')}: {new Date(submittedVisitor.scanned_at).toLocaleTimeString('ms-MY')}</p>
                </div>
              </div>
            ) : (
              /* Regular Visitor Recorded Card */
              <div className="space-y-5">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-500">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t('ems:audience_scan_success_title', 'Kehadiran Berjaya Direkodkan!')}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t('ems:audience_scan_success_desc', 'Terima Kasih! Kehadiran Anda Telah Direkodkan. Anda Kini Layak Untuk Cabutan Bertuah!')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  <p><strong className="text-slate-900 dark:text-white">{t('ems:recipient_name', 'Nama')}:</strong> {submittedVisitor.name}</p>
                  {submittedVisitor.matrix_no && <p><strong className="text-slate-900 dark:text-white">{t('ems:reg_matrix_no', 'No. Matrik')}:</strong> {submittedVisitor.matrix_no}</p>}
                  {submittedVisitor.email && <p><strong className="text-slate-900 dark:text-white">{t('ems:reg_email', 'Emel')}:</strong> {submittedVisitor.email}</p>}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setSubmittedVisitor(null);
                setName('');
                setMatrixNo('');
                setEmail('');
                setPhone('');
              }}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-transparent"
            >
              {t('ems:audience_scan_done_btn', 'Imbas Rekod Baharu')}
            </button>
          </div>
        ) : (
          /* Attendance Registration Form */
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl transition-colors"
          >
            <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('ems:audience_scan_heading', 'Borang Kehadiran Pengunjung')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('ems:audience_scan_subtitle', 'Sila isi maklumat anda untuk pendaftaran kehadiran')}
              </p>
            </div>

            {/* Account Status Badge if Logged In */}
            {user && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{t('ems:logged_in_as', 'Log masuk sebagai')} <strong>{profile?.full_name || user.email}</strong></span>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('ems:audience_scan_fullname', 'Nama Penuh')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('ems:audience_scan_fullname_placeholder', 'e.g. Ahmad bin Ali')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Identity Category Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStudent(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                  isStudent
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('ems:audience_scan_student_toggle', 'Pelajar POLISAS')}
              </button>
              <button
                type="button"
                onClick={() => setIsStudent(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                  !isStudent
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('ems:reg_cat_public', 'Pengunjung Awam / Staf')}
              </button>
            </div>

            {/* Matrix No Field (if Student) */}
            {isStudent && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('ems:reg_matrix_no', 'No. Matrik')}
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={matrixNo}
                    onChange={(e) => setMatrixNo(e.target.value.toUpperCase())}
                    placeholder={t('ems:audience_scan_matric_placeholder', 'e.g. 01DIT22F1001')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs uppercase font-mono tabular-nums placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('ems:reg_email', 'Alamat Emel')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('ems:audience_scan_email_placeholder', 'e.g. email@polisas.edu.my')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('ems:reg_phone', 'No. Telefon (WhatsApp)')}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('ems:audience_scan_phone_placeholder', 'e.g. 0123456789')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono tabular-nums placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t('ems:audience_scan_submitting', 'Merekodkan Kehadiran...')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('ems:audience_scan_submit', 'Sahkan & Rekod Kehadiran')}
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <footer className="relative z-10 text-[11px] text-slate-500 text-center mt-8">
        {t('ems:copyright_notice', 'All Rights Reserved © 2026 POLISAS EMS')}
      </footer>
    </div>
  );
}
