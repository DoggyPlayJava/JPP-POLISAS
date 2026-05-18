import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface PolyRentReverseFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function PolyRentReverseForm({ onClose, onSuccess }: PolyRentReverseFormProps) {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kawasanList, setKawasanList] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    jantina_prefer: 'CAMPURAN',
    budget: '',
    kawasan_id: '',
    description: '',
    move_in_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchKawasan = async () => {
      const { data } = await supabase.from('klk_kawasan').select('*').eq('is_active', true).order('name');
      if (data) setKawasanList(data);
    };
    fetchKawasan();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!formData.budget || !formData.description) {
      toast.error('Sila lengkapkan maklumat wajib (Bajet & Deskripsi)');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('polyrent_reverse_ads').insert({
        student_id: profile.id,
        jantina_prefer: formData.jantina_prefer,
        budget: parseFloat(formData.budget) || 0,
        kawasan_id: formData.kawasan_id || null,
        description: formData.description,
        move_in_date: formData.move_in_date
      });

      if (error) throw error;
      toast.success('Iklan pencarian anda telah diterbitkan!');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan iklan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[100] flex justify-end bg-slate-900/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md h-full bg-white dark:bg-slate-950 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex-none p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Cari Rumah</h2>
              <p className="text-xs text-slate-500">Iklankan apa yang anda cari</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bajet Maksimum (Bulanan) <span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">RM</span>
                <input
                  type="number"
                  placeholder="Cth: 150"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kawasan Pilihan (Pilihan)</label>
              <select
                value={formData.kawasan_id}
                onChange={(e) => handleInputChange('kawasan_id', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
              >
                <option value="">Mana-mana kawasan KLK</option>
                {kawasanList.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Jantina Preferensi <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {['CAMPURAN', 'LELAKI', 'PEREMPUAN'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleInputChange('jantina_prefer', opt)}
                    className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                      formData.jantina_prefer === opt 
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' 
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-500'
                    }`}
                  >
                    {opt === 'CAMPURAN' ? 'Campur' : opt === 'LELAKI' ? 'Lelaki' : 'Perempuan'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Deskripsi (Syarat/Permintaan) <span className="text-rose-500">*</span></label>
              <textarea
                rows={4}
                placeholder="Cth: Sedang mencari 1 bilik single atau kongsi berdua. Nak yang ada mesin basuh dan unifi."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tarikh Kemasukan (Anggaran)</label>
              <input
                type="date"
                value={formData.move_in_date}
                onChange={(e) => handleInputChange('move_in_date', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex-none p-6 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-slate-950">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-teal-500 text-white font-bold hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isSubmitting ? 'Menerbitkan...' : 'Terbit Iklan Pencarian'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
