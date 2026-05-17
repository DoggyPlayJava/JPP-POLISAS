import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, MapPin, DollarSign, Calendar, Clock, Loader2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateJobModal({ isOpen, onClose, onSuccess }: CreateJobModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'AKADEMIK', // AKADEMIK, TEKNIKAL, RUNNER, KREATIF, LAIN-LAIN
    location: '',
    budget: '',
    deadlineDate: '',
    deadlineTime: '',
  });

  const [avgBudget, setAvgBudget] = useState<number | null>(null);

  React.useEffect(() => {
    if (formData.category) {
      fetchAverageBudget(formData.category);
    }
  }, [formData.category]);

  const fetchAverageBudget = async (category: string) => {
    const { data, error } = await supabase.rpc('get_average_budget_by_category', {
      p_category: category
    });
    if (!error && data !== null && data > 0) {
      setAvgBudget(Number(data));
    } else {
      setAvgBudget(null);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.title || !formData.description) {
        toast.error('Sila lengkapkan Tajuk dan Deskripsi sebelum meneruskan.');
        return;
      }
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Validations
    if (!formData.location || !formData.budget || !formData.deadlineDate) {
      toast.error('Sila lengkapkan Lokasi, Upah dan Tarikh Akhir.');
      return;
    }

    const budgetVal = parseFloat(formData.budget);
    if (isNaN(budgetVal) || budgetVal <= 0) {
      toast.error('Bajet mesti lebih daripada RM 0');
      return;
    }

    setLoading(true);

    const deadlineTimestamp = new Date(`${formData.deadlineDate}T${formData.deadlineTime || '23:59'}`).toISOString();

    const { error } = await supabase.from('polytask_jobs').insert({
      requester_id: profile.id,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      location: formData.location,
      budget: budgetVal,
      deadline: deadlineTimestamp,
      status: 'OPEN'
    });

    setLoading(false);

    if (error) {
      console.error(error);
      toast.error('Gagal memuat naik tugasan. Sila cuba lagi.');
    } else {
      toast.success('Tugasan berjaya diiklankan!');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        title: '', description: '', category: 'AKADEMIK', location: '', budget: '', deadlineDate: '', deadlineTime: ''
      });
      setStep(1);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 bg-slate-800/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Cipta Tugasan Baharu</h2>
                  <p className="text-xs text-slate-400">Iklankan tugasan anda kepada rakan pelajar.</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 mt-4">
              <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`} />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className={step >= 1 ? 'text-indigo-400' : ''}>Langkah 1: Butiran</span>
              <span className={step >= 2 ? 'text-indigo-400' : ''}>Langkah 2: Logistik & Upah</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
            <form id="job-form" onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Tajuk Tugasan <span className="text-rose-400">*</span></label>
                      <input 
                        type="text" 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="Cth: Format Laptop HP & Install Windows 11" 
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        maxLength={100}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Kategori <span className="text-rose-400">*</span></label>
                      <select 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                      >
                        <option value="AKADEMIK">Akademik (Tutor, Assignment)</option>
                        <option value="TEKNIKAL">Teknikal (Baiki Laptop, Motor)</option>
                        <option value="RUNNER">Runner (Beli Barang, Hantar Dokumen)</option>
                        <option value="KREATIF">Kreatif (Design, Video, Foto)</option>
                        <option value="LAIN-LAIN">Lain-lain Khidmat</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Deskripsi Penuh <span className="text-rose-400">*</span></label>
                      <textarea 
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Terangkan dengan terperinci apa yang anda perlukan..." 
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-32 resize-none"
                        required
                      />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-500"/> Lokasi <span className="text-rose-400">*</span></label>
                        <input 
                          type="text" 
                          value={formData.location}
                          onChange={e => setFormData({...formData, location: e.target.value})}
                          placeholder="Cth: Kamsis A / Kafeteria" 
                          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500"/> Upah (RM) <span className="text-rose-400">*</span></label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">RM</span>
                          <input 
                            type="number" 
                            min="1"
                            step="0.10"
                            value={formData.budget}
                            onChange={e => setFormData({...formData, budget: e.target.value})}
                            placeholder="0.00" 
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-emerald-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            required
                          />
                        </div>
                        {avgBudget !== null && (
                          <p className="text-[10px] text-indigo-400 font-medium flex items-center mt-1">
                            💡 Purata pasaran untuk {formData.category.toLowerCase()}: RM {avgBudget.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500"/> Tarikh Akhir <span className="text-rose-400">*</span></label>
                        <input 
                          type="date" 
                          value={formData.deadlineDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => setFormData({...formData, deadlineDate: e.target.value})}
                          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark]"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500"/> Masa Akhir</label>
                        <input 
                          type="time" 
                          value={formData.deadlineTime}
                          onChange={e => setFormData({...formData, deadlineTime: e.target.value})}
                          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex gap-3 text-indigo-200 text-sm leading-relaxed mt-4">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 text-indigo-400 mt-0.5" />
                      <p>
                        Sila pastikan tawaran anda munasabah dan adil. Pembayaran kepada Tasker harus dibincangkan dan diselesaikan secara terus (tunai/transfer) setelah tugasan selesai. JPPHQ tidak memegang wang anda buat masa ini.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-slate-800/30 flex items-center justify-between mt-auto">
            {step === 1 ? (
              <Button variant="ghost" type="button" onClick={onClose} disabled={loading} className="text-slate-400 hover:text-white">
                Batal
              </Button>
            ) : (
              <Button variant="ghost" type="button" onClick={handlePrevStep} disabled={loading} className="text-slate-400 hover:text-white">
                <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
              </Button>
            )}

            {step === 1 ? (
              <Button 
                type="button" 
                onClick={handleNextStep}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] rounded-xl font-bold"
              >
                Seterusnya <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                form="job-form"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[120px] rounded-xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iklankan Tugasan'}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
