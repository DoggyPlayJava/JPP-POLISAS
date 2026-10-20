import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CancelJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  role: 'STUDENT' | 'RIDER';
  isLoading?: boolean;
}

export function CancelJobModal({ isOpen, onClose, onConfirm, role, isLoading = false }: CancelJobModalProps) {
  const { t } = useTranslation(['gig', 'common']);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');

  const studentReasons = [
    { key: 'cancel_reason_rider_too_late', label: t('gig:cancel_reason_rider_too_late', 'Rider terlalu lambat') },
    { key: 'cancel_reason_change_mind', label: t('gig:cancel_reason_change_mind', 'Berubah fikiran') },
    { key: 'cancel_reason_emergency_change_plan', label: t('gig:cancel_reason_emergency_change_plan', 'Kecemasan / Tukar perancangan') },
    { key: 'cancel_reason_accidental_click', label: t('gig:cancel_reason_accidental_click', 'Tertekan dengan tidak sengaja') },
    { key: 'cancel_reason_other', label: t('gig:cancel_reason_other', 'Lain-lain') }
  ];

  const riderReasons = [
    { key: 'cancel_reason_vehicle_breakdown', label: t('gig:cancel_reason_vehicle_breakdown', 'Kenderaan mengalami kerosakan') },
    { key: 'cancel_reason_personal_emergency', label: t('gig:cancel_reason_personal_emergency', 'Kecemasan peribadi') },
    { key: 'cancel_reason_passenger_no_show', label: t('gig:cancel_reason_passenger_no_show', 'Penumpang tidak muncul') },
    { key: 'cancel_reason_road_closed_traffic', label: t('gig:cancel_reason_road_closed_traffic', 'Jalan ditutup / Kesesakan teruk') },
    { key: 'cancel_reason_other', label: t('gig:cancel_reason_other', 'Lain-lain') }
  ];

  const reasonsList = role === 'STUDENT' ? studentReasons : riderReasons;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;
    
    const matchedOption = reasonsList.find(r => r.key === selectedReason);
    const finalReason = selectedReason === 'cancel_reason_other' ? otherReason : (matchedOption ? matchedOption.label : selectedReason);
    if (finalReason.trim().length === 0) return;

    onConfirm(finalReason);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60  z-[100]"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pb-24 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden pointer-events-auto border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-100 dark:border-red-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">{t('gig:cancel_order_modal_title', 'Batal Pesanan')}</h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 mb-6 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <p className="font-semibold mb-1">{t('gig:cancel_system_warning_title', 'Amaran Sistem')}</p>
                    <p>{t('gig:cancel_system_warning_desc_1', 'Pembatalan yang kerap (3 kali dalam sejam) akan menyebabkan akaun anda ')}<strong>{t('gig:cancel_system_warning_desc_suspended', 'digantung automatik selama 24 jam')}</strong>{t('gig:cancel_system_warning_desc_2', '. Sila berikan alasan munasabah.')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('gig:why_cancel_order_label', 'Mengapa anda membatalkan pesanan ini?')} <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="space-y-2">
                    {reasonsList.map((reason) => (
                      <label 
                        key={reason.key} 
                        className={`
                          flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                          ${selectedReason === reason.key 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                        `}
                      >
                        <input
                          type="radio"
                          name="cancelReason"
                          value={reason.key}
                          checked={selectedReason === reason.key}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="w-4 h-4 text-primary bg-slate-100 border-slate-300 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{reason.label}</span>
                      </label>
                    ))}
                  </div>

                  <AnimatePresence>
                    {selectedReason === 'cancel_reason_other' && (
                      <motion.div
                        initial={{ opacity: 0, }}
                        animate={{ opacity: 1, }}
                        exit={{ opacity: 0, }}
                        className="pt-2 overflow-hidden"
                      >
                        <textarea
                          placeholder={t('gig:cancel_reason_placeholder', 'Sila nyatakan sebab anda...')}
                          value={otherReason}
                          onChange={(e) => setOtherReason(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                          rows={3}
                          required={selectedReason === 'cancel_reason_other'}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer / Actions */}
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    {t('common:back', 'Kembali')}
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedReason || (selectedReason === 'cancel_reason_other' && !otherReason.trim()) || isLoading}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('common:please_wait', 'Sila tunggu...')}
                      </>
                    ) : (
                      t('gig:cancel_confirm_btn', 'Sahkan Batal')
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
