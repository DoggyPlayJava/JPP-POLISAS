import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, X, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchEventCertificates } from '@/lib/ems';
import type { EmsEvent, EmsCertificate } from '@/types';

export interface EmsEventCertsModalProps {
  event: EmsEvent | null;
  onClose: () => void;
}

export function EmsEventCertsModal({ event, onClose }: EmsEventCertsModalProps) {
  const { t } = useTranslation(['ems', 'common']);
  const navigate = useNavigate();
  const [certs, setCerts] = useState<Array<EmsCertificate & { participant?: any; jury?: any; event_title?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!event) return;

    const loadCerts = async () => {
      try {
        setLoading(true);
        const data = await fetchEventCertificates(event.id);
        setCerts(data);
      } catch (err: any) {
        toast.error(t('ems:cert_load_failed', 'Gagal memuatkan senarai sijil acara.'));
      } finally {
        setLoading(false);
      }
    };

    loadCerts();
  }, [event, t]);

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/80 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[85vh] overflow-y-auto text-slate-900 dark:text-white animate-in fade-in-50 zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
          aria-label={t('ems:close_modal', 'Tutup Modal')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('ems:event_certs_title', 'Senarai E-Sijil Acara')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {event.title} ({t('ems:certs_generated_count', '{{count}} Sijil Dijana', { count: certs.length })})
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('ems:loading_certs', 'Memuatkan senarai sijil...')}
            </p>
          </div>
        ) : certs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('ems:no_certs_generated', 'Belum Ada E-Sijil Dijana')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('ems:no_certs_desc', 'Pilih tindakan "Jana Semula E-Sijil" pada menu acara untuk menjana sijil rasmi.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {certs.map((cert) => {
              const recipientName =
                cert.participant?.team_name ||
                cert.participant?.leader_name ||
                cert.jury?.jury_name ||
                t('ems:cert_recipient_fallback', 'Penerima Sijil');
              const subtext =
                cert.participant?.matrix_no || cert.jury?.organization || cert.cert_type;

              return (
                <div
                  key={cert.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300">
                        {cert.cert_type}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                        {cert.cert_serial}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {recipientName}
                    </p>
                    {subtext && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtext}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/ems/cert/${cert.cert_serial}`)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 font-semibold text-xs transition border border-slate-200 dark:border-slate-700 shrink-0"
                  >
                    {t('ems:btn_view_cert', 'Lihat Sijil')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
