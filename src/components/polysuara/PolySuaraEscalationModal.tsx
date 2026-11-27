import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  AlertCircle,
  HeartHandshake,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  KEBAJIKAN_CATEGORY_LABELS,
  KEBAJIKAN_PRIORITY_LABELS,
  type KebajikanTicketCategory,
  type KebajikanTicketPriority,
} from '@/types';
import {
  buildEscalationRpcArgs,
  getHandledUnitForCategory,
  suggestKebajikanEscalation,
  type KebajikanHandledUnit,
} from '@/lib/polySuaraEscalation';

export interface PolySuaraEscalationConfession {
  id: string;
  content: string;
  category?: string | null;
  codename?: string | null;
  image_url?: string | null;
}

export interface PolySuaraEscalationResult {
  confessionId: string;
  ticket_id: string;
  ticket_no: string;
  handled_by_unit: KebajikanHandledUnit;
  already_escalated: boolean;
  note: string;
}

interface PolySuaraEscalationModalProps {
  isOpen: boolean;
  confession: PolySuaraEscalationConfession | null;
  onClose: () => void;
  onEscalated: (result: PolySuaraEscalationResult) => void;
}

const CATEGORY_OPTIONS: KebajikanTicketCategory[] = [
  'FASILITI_JABATAN',
  'FASILITI_SUKAN',
  'KAFETERIA',
  'WIFI_KAMSIS',
  'LAIN_LAIN',
];

const PRIORITY_OPTIONS: KebajikanTicketPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export function PolySuaraEscalationModal({
  isOpen,
  confession,
  onClose,
  onEscalated,
}: PolySuaraEscalationModalProps) {
  const { t } = useTranslation(['services', 'kebajikan', 'common']);

  const suggestion = useMemo(
    () =>
      confession
        ? suggestKebajikanEscalation(confession)
        : {
            category: 'LAIN_LAIN' as KebajikanTicketCategory,
            handledByUnit: 'KEBAJIKAN' as KebajikanHandledUnit,
            priority: 'NORMAL' as KebajikanTicketPriority,
            title: '',
            imageUrls: [],
          },
    [confession]
  );

  const [category, setCategory] = useState<KebajikanTicketCategory>(suggestion.category);
  const [priority, setPriority] = useState<KebajikanTicketPriority>(suggestion.priority);
  const [title, setTitle] = useState(suggestion.title);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !confession) return;
    setCategory(suggestion.category);
    setPriority(suggestion.priority);
    setTitle(suggestion.title);
    setNote('');
  }, [isOpen, confession, suggestion]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, submitting, onClose]);

  if (typeof document === 'undefined') return null;

  const routedUnit = getHandledUnitForCategory(category);
  const anonDisplay = `Pelajar Anon · ${confession?.codename?.trim() || 'PolySuara'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confession || !title.trim() || submitting) return;

    setSubmitting(true);
    try {
      const rpcArgs = buildEscalationRpcArgs({
        confessionId: confession.id,
        category,
        priority,
        title,
        note,
      });

      const isDevMock =
        import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        localStorage.getItem('use_mock_auth') === 'true';

      if (isDevMock) {
        const mockTicketNo = `EK-${new Date().getFullYear()}-${String(
          Math.floor(1000 + (confession.id.charCodeAt(0) % 8999))
        )}`;
        const mockResult: PolySuaraEscalationResult = {
          confessionId: confession.id,
          ticket_id: `mock-ek-${confession.id.slice(0, 8)}`,
          ticket_no: mockTicketNo,
          handled_by_unit: routedUnit,
          already_escalated: false,
          note: note.trim(),
        };
        toast.success(
          t('services:suara_escalate_success', 'Berjaya dieskalasi ke e-Kebajikan ({{ticketNo}})', {
            ticketNo: mockTicketNo,
          })
        );
        onEscalated(mockResult);
        onClose();
        return;
      }

      const { data, error } = await supabase.rpc('escalate_polysuara_to_kebajikan', rpcArgs);
      if (error) throw error;

      const payload = (data || {}) as {
        ticket_id?: string;
        ticket_no?: string;
        handled_by_unit?: KebajikanHandledUnit;
        already_escalated?: boolean;
      };

      if (!payload.ticket_id || !payload.ticket_no) {
        throw new Error('Respon eskalasi tidak lengkap daripada pelayan.');
      }

      if (payload.already_escalated) {
        toast.success(
          t('services:suara_escalate_already', 'Luahan ini sudah mempunyai tiket rasmi ({{ticketNo}}).', {
            ticketNo: payload.ticket_no,
          })
        );
      } else {
        toast.success(
          t('services:suara_escalate_success', 'Berjaya dieskalasi ke e-Kebajikan ({{ticketNo}})', {
            ticketNo: payload.ticket_no,
          })
        );
      }

      onEscalated({
        confessionId: confession.id,
        ticket_id: payload.ticket_id,
        ticket_no: payload.ticket_no,
        handled_by_unit: payload.handled_by_unit || routedUnit,
        already_escalated: Boolean(payload.already_escalated),
        note: note.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error('[PolySuara Escalation Error]', err);
      toast.error(
        err?.message ||
          t('services:suara_escalate_failed', 'Gagal membuat eskalasi ke e-Kebajikan. Sila cuba lagi.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && confession && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
            className="fixed inset-0 bg-[#090B0E]/75 z-[220]"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[221] pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="polysuara-escalate-title"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-[2rem] shadow-2xl p-5 sm:p-6 pointer-events-auto text-[#0B2420] dark:text-[#F1F5F9] max-h-[90dvh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC]/80 dark:border-[#252B35] flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF] shrink-0">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      id="polysuara-escalate-title"
                      className="text-base sm:text-lg font-black tracking-tight leading-tight"
                    >
                      {t('services:suara_escalate_modal_title', 'Eskalasi ke e-Kebajikan')}
                    </h3>
                    <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                      {t('services:suara_escalate_modal_subtitle', 'Buka tiket tindakan rasmi tanpa dedah identiti')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  aria-label={t('common:close', 'Tutup')}
                  className="w-8 h-8 rounded-full bg-[#F6FBF9] dark:bg-[#1B2028] hover:bg-[#EBF7F4] dark:hover:bg-[#232933] text-[#3B635C] dark:text-[#94A0B2] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Zero-PII Guarantee Banner */}
              <div className="mb-4 p-3 rounded-2xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#0F766E]/25 dark:border-[#2DD4BF]/25 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#0F766E] dark:text-[#2DD4BF]">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('services:suara_escalate_zero_pii_title', 'Jaminan 100% Rahsia (Zero-PII)')}</span>
                </div>
                <p className="text-[#3B635C] dark:text-[#94A0B2] leading-relaxed">
                  {t(
                    'services:suara_escalate_zero_pii_desc',
                    'Tiket akan didaftarkan atas nama "{{anonName}}" tanpa No. Matrik, telefon, atau ID pelajar. Penulis asal akan menerima notifikasi automatik apabila tiket selesai.',
                    { anonName: anonDisplay }
                  )}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Title */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] mb-1.5 block">
                    {t('services:suara_escalate_title_label', 'Tajuk Tiket Rasmi')}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('services:suara_escalate_title_ph', 'Ringkasan isu untuk tiket e-Kebajikan...')}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] text-sm text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/60 dark:placeholder:text-[#94A0B2]/60 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/35"
                  />
                </div>

                {/* Category + Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] mb-1.5 block">
                      {t('services:suara_escalate_category_label', 'Kategori e-Kebajikan')}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as KebajikanTicketCategory)}
                      className="w-full h-11 px-3 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] text-sm font-medium text-[#0B2420] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/35"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {KEBAJIKAN_CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] mb-1.5 block">
                      {t('services:suara_escalate_priority_label', 'Keutamaan')}
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as KebajikanTicketPriority)}
                      className="w-full h-11 px-3 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] text-sm font-medium text-[#0B2420] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/35"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {KEBAJIKAN_PRIORITY_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto-routed Unit Indicator */}
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/70 dark:border-[#252B35] text-xs">
                  <span className="text-[#3B635C] dark:text-[#94A0B2] font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" />
                    {t('services:suara_escalate_unit_label', 'Unit Bertanggungjawab')}
                  </span>
                  <span className="font-bold text-[#0F766E] dark:text-[#2DD4BF]">
                    {routedUnit === 'KK'
                      ? t('services:suara_escalate_unit_kk', 'Exco KK (Kafeteria)')
                      : t('services:suara_escalate_unit_kebajikan', 'Exco Kebajikan')}
                  </span>
                </div>

                {/* Optional Public Note */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] mb-1.5 block">
                    {t('services:suara_escalate_note_label', 'Nota Ringkas JPP (Pilihan)')}
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t(
                      'services:suara_escalate_note_ph',
                      'Cth: Akan disemak bersama pihak penyelenggaraan blok esok pagi...'
                    )}
                    className="w-full p-3 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] text-sm text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/60 dark:placeholder:text-[#94A0B2]/60 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/35 resize-none"
                  />
                  <p className="mt-1 text-[11px] text-[#3B635C] dark:text-[#94A0B2] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>
                      {t(
                        'services:suara_escalate_note_hint',
                        'Elakkan menulis nama atau no. matrik pelajar di ruangan ini.'
                      )}
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors cursor-pointer"
                  >
                    {t('common:cancel', 'Batal')}
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || submitting}
                    className="px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D9488] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] disabled:opacity-50 text-white dark:text-[#090B0E] text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {submitting
                        ? t('services:submitting', 'Menghantar...')
                        : t('services:suara_escalate_confirm_btn', 'Buka Tiket e-Kebajikan')}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
