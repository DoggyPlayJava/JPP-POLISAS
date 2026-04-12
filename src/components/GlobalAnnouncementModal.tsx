import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Info, ExternalLink, CheckCircle2, ShieldAlert, Gift, Star, Megaphone, Calendar, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SystemAnnouncement, AnnouncementFormField } from '@/types';
import { toast } from 'react-hot-toast';

export function GlobalAnnouncementModal() {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [progress, setProgress] = useState(0);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      loadAnnouncements();
    }
  }, [user, profile]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      // 1. Fetch all active announcements
      const { data: activeAnns, error: annError } = await supabase
        .from('system_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (annError) throw annError;

      // 2. Fetch user's prior responses to filter out completed/dismissed
      const { data: userRes, error: resError } = await supabase
        .from('user_announcement_responses')
        .select('announcement_id')
        .eq('user_id', user!.id);

      if (resError) throw resError;

      const respondedIds = userRes?.map(r => r.announcement_id) || [];

      // 3. Filter audience & responded
      const filtered = (activeAnns || []).filter(a => {
        // Skip if already responded
        if (respondedIds.includes(a.id)) return false;

        // Check audience
        if (a.target_audience === 'ALL') return true;
        const isStaff = profile?.role === 'STAFF';
        if (a.target_audience === 'STAFF' && !isStaff) return false;
        if (a.target_audience === 'STUDENT' && isStaff) return false;

        return true;
      });

      // 4. Sort: HIGH priority first
      filtered.sort((a, b) => {
        const pScores = { HIGH: 3, MEDIUM: 2, EASY: 1 };
        return pScores[b.priority as keyof typeof pScores] - pScores[a.priority as keyof typeof pScores];
      });

      setAnnouncements(filtered);
    } catch (err) {
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setFormData({}); // reset
    setProgress(0);
    setCurrentIdx(prev => prev + 1);
  };

  // Autoplay Logic
  useEffect(() => {
    const current = announcements[currentIdx];
    const isHigh = current?.priority === 'HIGH';
    // Only autoplay if not HIGH priority AND there's a next announcement
    if (!current || isHigh || currentIdx >= announcements.length - 1) return;

    setProgress(0);
    const AUTOPLAY_DURATION = 8000; // 8 seconds
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setFormData({});
          setProgress(0);
          setCurrentIdx(prev => prev + 1);
          return 0;
        }
        return p + (100 / (AUTOPLAY_DURATION / 100)); // increment every 100ms
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIdx, announcements.length, announcements]);

  if (!user || loading || announcements.length === 0 || currentIdx >= announcements.length) {
    return null; // hide
  }

  const current = announcements[currentIdx];
  const isHigh = current.priority === 'HIGH';

  const handleDismiss = async (permanently: boolean) => {
    if (permanently) {
      try {
        await supabase.from('user_announcement_responses').insert({
          user_id: user.id,
          announcement_id: current.id,
          status: 'dismissed_permanently'
        });
      } catch (err) {
        console.error('Failed to dismiss permanently', err);
      }
    }
    handleNext();
  };

  const handleSubmit = async () => {
    // validate
    if (current.form_schema) {
      for (const field of current.form_schema) {
        if (field.required && !formData[field.id]) {
          toast.error(`Sila isi ruangan: ${field.label}`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('user_announcement_responses').insert({
        user_id: user.id,
        announcement_id: current.id,
        status: 'completed',
        form_data: Object.keys(formData).length > 0 ? formData : null
      });

      if (error) throw error;
      toast.success('Terima kasih. Maklumbalas direkodkan.');
      handleNext();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghantar');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (f: AnnouncementFormField) => {
    return (
      <div key={f.id} className="space-y-2 text-left">
        <Label className="font-bold text-white/90 text-[11px] uppercase tracking-wider block mb-2">
          {f.label} {f.required && <span className="text-rose-500">*</span>}
        </Label>
        {f.type === 'select' && f.options ? (
          <Select value={formData[f.id] || ''} onValueChange={v => setFormData({...formData, [f.id]: v})}>
             <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-1 focus:ring-white/20"><SelectValue/></SelectTrigger>
             <SelectContent className="bg-[#0a0a0f] border-white/10 text-white">
                {f.options.map(opt => <SelectItem key={opt} value={opt} className="focus:bg-white/10 focus:text-white">{opt}</SelectItem>)}
             </SelectContent>
          </Select>
        ) : (
          <Input 
             type={f.type} 
             value={formData[f.id] || ''} 
             onChange={e => setFormData({...formData, [f.id]: e.target.value})}
             placeholder={f.placeholder}
             className="bg-white/5 border-white/10 text-white h-12 rounded-xl placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-white/20"
          />
        )}
      </div>
    );
  };

  const getIcon = (type: string | null, isHigh: boolean) => {
    switch (type) {
      case 'ALERT': return <ShieldAlert size={24} />;
      case 'GIFT': return <Gift size={24} />;
      case 'STAR': return <Star size={24} />;
      case 'MEGAPHONE': return <Megaphone size={24} />;
      case 'CALENDAR': return <Calendar size={24} />;
      case 'INFO':
      default: return isHigh ? <AlertCircle size={24} /> : <Info size={24}/>;
    }
  };

  const getIconColor = (type: string | null, isHigh: boolean) => {
    if (isHigh) return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    switch (type) {
      case 'GIFT': return 'bg-pink-500/10 text-pink-500 border border-pink-500/20';
      case 'STAR': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'MEGAPHONE': return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20';
      case 'CALENDAR': return 'bg-teal-500/10 text-teal-500 border border-teal-500/20';
      case 'ALERT': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      case 'INFO':
      default: return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-[480px] bg-[#0a0a0f] text-white rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden flex flex-col max-h-[85dvh]"
      >
        {!isHigh && (
          <button 
            onClick={() => handleDismiss(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-black/20 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-20"
          >
            <X size={18} />
          </button>
        )}

        {current.image_url && (
           <div className="w-full relative overflow-hidden bg-black flex items-center justify-center shrink-0 group">
              <img src={current.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-125" />
              <img src={current.image_url} alt="Poster" className="relative w-full max-h-[25dvh] sm:max-h-[35dvh] object-contain cursor-zoom-in" onClick={() => setFullScreenImage(current.image_url)} />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f] pointer-events-none" />
              
              <button 
                onClick={(e) => { e.stopPropagation(); setFullScreenImage(current.image_url); }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 transition-all z-20 opacity-80 group-hover:opacity-100 group-hover:-translate-y-1"
              >
                <Maximize2 size={14} />
                Papar Skrin Penuh
              </button>
           </div>
        )}

        <div className={`px-8 pt-10 pb-6 flex flex-col items-center text-center relative shrink-0`}>
           {announcements.length > 1 && !isHigh && currentIdx < announcements.length - 1 && (
             <div className="absolute top-0 left-8 right-8 h-1 bg-white/5 rounded-full overflow-hidden mt-2">
               <div className="h-full bg-white/20 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
             </div>
           )}

           <div className={`p-4 rounded-full flex-shrink-0 z-10 shadow-[0_0_40px_-5px_rgba(0,0,0,0.5)] mb-6 ${getIconColor(current.icon_type, isHigh)}`}>
             {getIcon(current.icon_type, isHigh)}
           </div>
           
           <h2 className="text-2xl sm:text-3xl font-black tracking-tighter leading-tight mb-2 text-white">
              {current.title}
           </h2>
           {isHigh && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                Notis Mandatori
              </div>
           )}
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
           <div className="text-white/60 text-[13px] whitespace-pre-wrap leading-relaxed text-center font-medium">
             {current.content_body}
           </div>

           {current.action_url && (
             <a 
               href={current.action_url} 
               target="_blank" 
               rel="noreferrer"
               className="flex items-center justify-center gap-2 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group mt-6"
             >
               <span className="font-bold text-white/80 text-[11px] uppercase tracking-wider">Buka Pautan Tindakan</span>
               <ExternalLink size={14} className="text-white/40 group-hover:text-white transition-colors" />
             </a>
           )}

           {current.form_schema && current.form_schema.length > 0 && (
             <div className="space-y-4 pt-8 mt-6 text-left">
                {current.form_schema.map(renderField)}
             </div>
           )}
        </div>

        <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex flex-col gap-3 shrink-0 relative z-10 pt-2">
          {current.form_schema && current.form_schema.length > 0 ? (
             <>
               <Button 
                 disabled={submitting}
                 className={`w-full h-12 rounded-full font-black tracking-wider text-[11px] uppercase shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)] ${isHigh ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-primary hover:bg-primary/90 text-white'}`}
                 onClick={handleSubmit}
               >
                 <CheckCircle2 className="w-4 h-4 mr-2" />
                 {submitting ? 'Memproses...' : 'Hantar Maklumat'}
               </Button>
               {!isHigh && (
                  <Button variant="ghost" className="w-full h-12 rounded-full font-bold tracking-wider text-[11px] uppercase border border-white/10 text-white/70 hover:text-white hover:bg-white/5" onClick={() => handleNext()}>
                    Langkau Seterusnya
                  </Button>
               )}
             </>
          ) : isHigh ? (
             <Button 
               disabled={submitting}
               className="w-full h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-black tracking-wider text-[11px] uppercase shadow-[0_0_40px_-5px_rgba(225,29,72,0.3)]"
               onClick={handleSubmit}
             >
               <CheckCircle2 className="w-4 h-4 mr-2" />
               Saya Faham
             </Button>
          ) : (
             <Button className="w-full h-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-bold tracking-wider text-[11px] uppercase transition-colors" onClick={() => handleNext()}>
               {currentIdx < announcements.length - 1 ? 'Seterusnya' : 'Tutup Makluman'}
             </Button>
          )}

          {current.priority === 'EASY' && (
             <button onClick={() => handleDismiss(true)} className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-2 hover:text-white/70 transition-colors text-center w-full">
               Jangan Tunjuk Notis Ini Lagi
             </button>
          )}
        </div>
      </motion.div>

      {/* Fullscreen Image Lightbox */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setFullScreenImage(null)}
          >
            <button 
              onClick={() => setFullScreenImage(null)}
              className="absolute top-6 right-6 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[210] shadow-2xl"
            >
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={fullScreenImage} 
              alt="Papar Penuh" 
              className="max-w-full max-h-[95vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
