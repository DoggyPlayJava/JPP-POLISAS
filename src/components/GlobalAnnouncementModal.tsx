import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Info, ExternalLink, CheckCircle2 } from 'lucide-react';
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

  if (!user || loading || announcements.length === 0 || currentIdx >= announcements.length) {
    return null; // hide
  }

  const current = announcements[currentIdx];
  const isHigh = current.priority === 'HIGH';

  const handleNext = () => {
    setFormData({}); // reset
    setCurrentIdx(prev => prev + 1);
  };

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
        <Label className="font-bold text-foreground">
          {f.label} {f.required && <span className="text-rose-500">*</span>}
        </Label>
        {f.type === 'select' && f.options ? (
          <Select value={formData[f.id] || ''} onValueChange={v => setFormData({...formData, [f.id]: v})}>
             <SelectTrigger className="bg-background"><SelectValue/></SelectTrigger>
             <SelectContent>
                {f.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
             </SelectContent>
          </Select>
        ) : (
          <Input 
             type={f.type} 
             value={formData[f.id] || ''} 
             onChange={e => setFormData({...formData, [f.id]: e.target.value})}
             placeholder={f.placeholder}
             className="bg-background"
          />
        )}
      </div>
    );
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
        className="relative w-full max-w-lg bg-card rounded-[2rem] border border-border/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className={`p-6 sm:p-8 flex items-start gap-4 border-b border-border/50 ${isHigh ? 'bg-rose-500/10' : 'bg-muted/30'}`}>
           <div className={`p-3 rounded-2xl flex-shrink-0 ${isHigh ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-primary/20 text-primary'}`}>
             {isHigh ? <AlertCircle size={24} /> : <Info size={24}/>}
           </div>
           <div className="flex-1 min-w-0 pr-8">
             <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight mb-1">{current.title}</h2>
             {isHigh && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest">
                  Notis Mandatori
                </div>
             )}
           </div>

           {!isHigh && (
             <button 
               onClick={() => handleDismiss(false)}
               className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors"
             >
               <X size={20} />
             </button>
           )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
           <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
             {current.content_body}
           </div>

           {current.action_url && (
             <a 
               href={current.action_url} 
               target="_blank" 
               rel="noreferrer"
               className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group"
             >
               <span className="font-bold text-primary text-sm">Buka Pautan Tindakan</span>
               <ExternalLink size={16} className="text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
             </a>
           )}

           {current.form_schema && current.form_schema.length > 0 && (
             <div className="space-y-4 pt-4 mt-6 border-t border-border/50">
                {current.form_schema.map(renderField)}
             </div>
           )}
        </div>

        <div className="p-6 border-t border-border/50 bg-muted/20 flex flex-col sm:flex-row gap-3">
          {current.priority === 'EASY' && (
             <Button variant="ghost" className="flex-1" onClick={() => handleDismiss(true)}>
               Jangan tunjuk lagi
             </Button>
          )}

          {isHigh ? (
             <Button 
               disabled={submitting}
               className="flex-1 h-12 rounded-xl bg-primary shadow-xl shadow-primary/20 font-bold"
               onClick={handleSubmit}
             >
               <CheckCircle2 className="w-5 h-5 mr-2" />
               {submitting ? 'Memproses...' : (current.form_schema?.length ? 'Hantar Maklumat' : 'Saya Faham')}
             </Button>
          ) : (
             <Button variant="secondary" className="flex-1" onClick={() => handleDismiss(false)}>
               Tutup
             </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
