import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CancelJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  role: 'STUDENT' | 'RIDER';
  isLoading?: boolean;
}

const STUDENT_REASONS = [
  "Rider terlalu lambat",
  "Berubah fikiran",
  "Kecemasan / Tukar perancangan",
  "Tertekan dengan tidak sengaja",
  "Lain-lain"
];

const RIDER_REASONS = [
  "Kenderaan mengalami kerosakan",
  "Kecemasan peribadi",
  "Penumpang tidak muncul",
  "Jalan ditutup / Kesesakan teruk",
  "Lain-lain"
];

export function CancelJobModal({ isOpen, onClose, onConfirm, role, isLoading = false }: CancelJobModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');

  const reasonsList = role === 'STUDENT' ? STUDENT_REASONS : RIDER_REASONS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;
    
    const finalReason = selectedReason === 'Lain-lain' ? otherReason : selectedReason;
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
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
                  <h3 className="text-lg font-bold">Batal Pesanan</h3>
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
                    <p className="font-semibold mb-1">Amaran Sistem</p>
                    <p>Pembatalan yang kerap (3 kali dalam sejam) akan menyebabkan akaun anda <strong>digantung automatik selama 24 jam</strong>. Sila berikan alasan munasabah.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Mengapa anda membatalkan pesanan ini? <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="space-y-2">
                    {reasonsList.map((reason, idx) => (
                      <label 
                        key={idx} 
                        className={`
                          flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                          ${selectedReason === reason 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                        `}
                      >
                        <input
                          type="radio"
                          name="cancelReason"
                          value={reason}
                          checked={selectedReason === reason}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="w-4 h-4 text-primary bg-slate-100 border-slate-300 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{reason}</span>
                      </label>
                    ))}
                  </div>

                  <AnimatePresence>
                    {selectedReason === 'Lain-lain' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 overflow-hidden"
                      >
                        <textarea
                          placeholder="Sila nyatakan sebab anda..."
                          value={otherReason}
                          onChange={(e) => setOtherReason(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                          rows={3}
                          required={selectedReason === 'Lain-lain'}
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
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedReason || (selectedReason === 'Lain-lain' && !otherReason.trim()) || isLoading}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sila tunggu...
                      </>
                    ) : (
                      'Sahkan Batal'
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
