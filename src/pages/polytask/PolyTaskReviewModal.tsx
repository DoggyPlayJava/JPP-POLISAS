import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { X, Star, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PolyTaskReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  onReviewSubmitted: () => void;
}

export function PolyTaskReviewModal({ isOpen, onClose, jobId, reviewerId, revieweeId, revieweeName, onReviewSubmitted }: PolyTaskReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Sila berikan sekurang-kurangnya 1 bintang.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('polytask_reviews').insert({
      job_id: jobId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      rating,
      comment
    });

    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error('Gagal menghantar ulasan. Sila cuba lagi.');
    } else {
      toast.success('Ulasan berjaya dihantar!');
      onReviewSubmitted();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                <Star className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black text-white">Nilai Tugasan</h2>
              <p className="text-sm text-slate-400 mt-2">
                Bagaimanakah pengalaman anda berurusan dengan <strong className="text-white">{revieweeName}</strong>?
              </p>
            </div>

            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-600'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Komen (Pilihan)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tulis sedikit ulasan tentang kualiti kerja..."
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Sedang Menghantar...
                </>
              ) : (
                'Hantar Ulasan'
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
