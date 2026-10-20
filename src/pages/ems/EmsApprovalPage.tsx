import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Calendar,
  MapPin,
  User,
  FileText,
  Award,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { format, isValid } from 'date-fns';
import { ms } from 'date-fns/locale';
import { fetchEmsEvents, approveEmsEvent } from '@/lib/ems';
import type { EmsEvent, EmsFormField, EmsRubricCriteria } from '@/types';

type EventWithDetails = EmsEvent & {
  form_fields?: EmsFormField[];
  rubrics?: EmsRubricCriteria[];
  creator?: { id: string; full_name: string | null; email: string | null };
};

export function EmsApprovalPage() {
  const { t } = useTranslation(['ems', 'common']);
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [pendingEvents, setPendingEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null);

  // Reject Modal State
  const [rejectingEvent, setRejectingEvent] = useState<EventWithDetails | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPendingEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchEmsEvents('PENDING_APPROVAL');
      setPendingEvents(data as EventWithDetails[]);
    } catch (err: any) {
      toast.error(t('ems:approval_toast_fail_load', 'Gagal memuatkan acara pending: {{error}}', { error: err.message }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadPendingEvents();
    }
  }, [isSuperAdmin]);

  // Access check
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center space-y-4 transition-colors">
        <div className="p-4 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <XCircle className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          {t('ems:approval_access_required', 'Akses Diperlukan')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
          {t('ems:approval_access_desc', 'Halaman Semakan Kelulusan Acara EMS hanya boleh dicapai oleh Pentadbir Mutlak (SUPER_ADMIN_JPP).')}
        </p>
        <button
          onClick={() => navigate('/ems/dashboard')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-[0.98]"
        >
          {t('ems:approval_back_dashboard', 'Kembali ke Papan Pemuka EMS')}
        </button>
      </div>
    );
  }

  const handleApprove = async (eventId: string, title: string) => {
    try {
      setIsSubmitting(true);
      await approveEmsEvent(eventId, 'APPROVED');
      toast.success(t('ems:approval_toast_approved', 'Acara "{{title}}" telah berjaya DILULUSKAN!', { title }));
      if (selectedEvent?.id === eventId) setSelectedEvent(null);
      loadPendingEvents();
    } catch (err: any) {
      toast.error(err.message || t('ems:approval_toast_fail_approve', 'Gagal meluluskan acara: {{error}}', { error: err.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingEvent) return;
    if (!rejectNote.trim()) {
      toast.error(t('ems:approval_toast_reject_reason_required', 'Sila nyatakan sebab penolakan permohonan acara.'));
      return;
    }
    try {
      setIsSubmitting(true);
      await approveEmsEvent(rejectingEvent.id, 'REJECTED', rejectNote.trim());
      toast.success(t('ems:approval_toast_rejected', 'Acara "{{title}}" telah DITOLAK.', { title: rejectingEvent.title }));
      setRejectingEvent(null);
      setRejectNote('');
      if (selectedEvent?.id === rejectingEvent.id) setSelectedEvent(null);
      loadPendingEvents();
    } catch (err: any) {
      toast.error(err.message || t('ems:approval_toast_fail_reject', 'Gagal menolak acara: {{error}}', { error: err.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 pb-28 md:pb-8 space-y-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ems/dashboard')}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-slate-700 dark:text-slate-300" />
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('ems:approval_title', 'Semakan & Kelulusan Acara EMS')}
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('ems:approval_subtitle', 'Modul pengesahan khas Pentadbir Mutlak (Super Admin JPP).')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPendingEvents}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('ems:approval_refresh', 'Muat Semula')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400 space-y-2">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold">{t('ems:approval_loading_list', 'Memuatkan senarai permohonan acara...')}</p>
        </div>
      ) : pendingEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl text-center shadow-sm max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
            {t('ems:approval_no_pending', 'Tiada Permohonan Menunggu')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
            {t('ems:approval_no_pending_desc', 'Semua permohonan penganjuran acara pertandingan EMS telah disemak dan diluluskan sepenuhnya.')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/ems/dashboard')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all shadow-sm"
            >
              {t('ems:approval_back_hub', 'Kembali ke Hub Acara')}
            </button>
            <button
              onClick={() => navigate('/ems/event/new')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm"
            >
              {t('ems:approval_create_new', '+ Cipta Acara Baharu')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Event List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {t('ems:approval_pending_header', 'Permohonan Menunggu Kelulusan ({{count}})', { count: pendingEvents.length })}
            </h2>

            <div className="space-y-3">
              {pendingEvents.map((ev) => {
                const isSelected = selectedEvent?.id === ev.id;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800/90 border-slate-900 dark:border-amber-400 text-slate-900 dark:text-white shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {t('ems:approval_pending_badge', 'PENDING')}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {new Date(ev.created_at).toLocaleDateString('ms-MY')}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 mb-1">{ev.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
                      {ev.category || 'Keusahawanan'} •{' '}
                      {ev.event_mode === 'TEAM' ? t('ems:event_form_mode_team', 'Pasukan') : t('ems:event_form_mode_indiv', 'Individu')}
                    </p>

                    {ev.creator?.full_name && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('ems:approval_organizer_label', 'Penganjur:')} {ev.creator.full_name}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Inspector */}
          <div className="lg:col-span-2">
            {selectedEvent ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl sticky top-6">
                {/* Header Details */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      {t('ems:approval_pending_hq', 'Menunggu Kelulusan HQ')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('ems:approval_mode_label', 'Mod:')} <strong className="text-slate-900 dark:text-white">{selectedEvent.event_mode}</strong>
                    </span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                    {selectedEvent.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    {t('ems:approval_category_label', 'Kategori:')} {selectedEvent.category || 'Keusahawanan'}
                  </p>
                </div>

                {/* Event Description & Info */}
                <div className="space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {t('ems:event_form_desc_label', 'Penerangan Acara')}
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      {selectedEvent.description || t('ems:approval_unspecified', 'Tiada penerangan disediakan.')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>
                        {t('ems:approval_date', 'Tarikh:')}{' '}
                        {(() => {
                          if (!selectedEvent.event_date) return t('ems:approval_unspecified', 'Belum ditetapkan');
                          try {
                            const d = new Date(selectedEvent.event_date);
                            return isValid(d) ? format(d, 'd MMM yyyy, h:mm a', { locale: ms }) : selectedEvent.event_date;
                          } catch {
                            return selectedEvent.event_date;
                          }
                        })()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{t('ems:approval_venue', 'Lokasi:')} {selectedEvent.location || t('ems:approval_unspecified', 'Belum ditetapkan')}</span>
                    </div>

                    <div className="flex items-center gap-2 sm:col-span-2">
                      <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>
                        {t('ems:approval_organizer_label', 'Dicipta oleh:')}{' '}
                        {selectedEvent.creator?.full_name || 'Pentadbir'}{' '}
                        {selectedEvent.creator?.email ? `(${selectedEvent.creator.email})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Fields Preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{t('ems:approval_tab_fields', 'Medan Pendaftaran ({{count}})', { count: selectedEvent.form_fields?.length || 0 })}</span>
                  </div>

                  {selectedEvent.form_fields && selectedEvent.form_fields.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedEvent.form_fields.map((f, idx) => (
                        <div
                          key={f.id || idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">{f.field_label}</span>
                            {f.is_required && (
                              <span className="text-[10px] text-rose-500 font-bold">{t('ems:approval_required_field', 'Wajib')}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 uppercase font-mono block">
                            {t('ems:event_form_field_type', 'Jenis:')} {f.field_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">{t('ems:approval_unspecified', 'Tiada medan borang tambahan.')}</p>
                  )}
                </div>

                {/* Rubrics Preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                    <Award className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span>{t('ems:approval_tab_rubrics', 'Rubrik Pemarkahan ({{count}})', { count: selectedEvent.rubrics?.length || 0 })}</span>
                  </div>

                  {selectedEvent.rubrics && selectedEvent.rubrics.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEvent.rubrics.map((r, idx) => (
                        <div
                          key={r.id || idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">{r.criteria_name}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-mono font-bold">
                            {t('ems:approval_max_score', 'Max Score')}: {r.max_score} ({t('ems:approval_weight', 'Weight')}: {r.weight}x)
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">{t('ems:approval_unspecified', 'Tiada rubrik pemarkahan.')}</p>
                  )}
                </div>

                {/* Approval Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    disabled={isSubmitting}
                    onClick={() => setRejectingEvent(selectedEvent)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/30 transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{t('ems:approval_reject_btn', 'Tolak Permohonan')}</span>
                  </button>

                  <button
                    disabled={isSubmitting}
                    onClick={() => handleApprove(selectedEvent.id, selectedEvent.title)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('ems:approval_approve_btn', 'Luluskan Acara')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl text-center p-6 shadow-sm">
                <Eye className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {t('ems:current_selection', 'Pilih Acara Untuk Disemak')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  {t('ems:approval_no_pending_desc', 'Sila klik mana-mana permohonan acara dari senarai di sebelah kiri untuk melihat butiran lengkap.')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => {
                setRejectingEvent(null);
                setRejectNote('');
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {t('ems:approval_reject_modal_title', 'Tolak Permohonan Acara')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{rejectingEvent.title}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {t('ems:approval_reject_reason_label', 'Sebab Penolakan / Catatan')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={t('ems:approval_reject_reason_placeholder', 'Contoh: Maklumat lokasi belum lengkap / tarikh bertembung acara rasmi. Sila lengkapkan...')}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectingEvent(null);
                  setRejectNote('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                {t('ems:approval_cancel', 'Batal')}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isSubmitting ? t('ems:approval_approving', 'Memproses...') : t('ems:approval_confirm_reject', 'Sahkan Penolakan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
