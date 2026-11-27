import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useTranslation } from 'react-i18next';

const MOCK_DISMISSED_KEY = 'mock_dismissed_announcements';
const MOCK_SESSION_DISMISSED_KEY = 'mock_session_dismissed_announcements';

function readMockDismissedIds(): string[] {
  const ids = new Set<string>();
  try {
    const raw = localStorage.getItem(MOCK_DISMISSED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.forEach((id) => ids.add(String(id)));
    }
  } catch {}
  try {
    const rawSess = sessionStorage.getItem(MOCK_SESSION_DISMISSED_KEY);
    if (rawSess) {
      const parsedSess = JSON.parse(rawSess);
      if (Array.isArray(parsedSess)) parsedSess.forEach((id) => ids.add(String(id)));
    }
  } catch {}
  return Array.from(ids);
}

function saveMockDismissedId(id: string, permanent = true) {
  try {
    const storage = permanent ? localStorage : sessionStorage;
    const key = permanent ? MOCK_DISMISSED_KEY : MOCK_SESSION_DISMISSED_KEY;
    const raw = storage.getItem(key);
    const existing: string[] = raw ? JSON.parse(raw) : [];
    if (!existing.includes(id)) {
      storage.setItem(key, JSON.stringify([...existing, id]));
    }
  } catch {}
}

function normalizeAnnouncementRoute(rawUrl?: string | null): { internalPath: string | null; externalUrl: string | null } {
  if (!rawUrl) return { internalPath: null, externalUrl: null };
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/')) {
    return { internalPath: trimmed, externalUrl: null };
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host === 'jpp.cipher-node.org' || host === 'www.jpp.cipher-node.org') {
      return { internalPath: `${parsed.pathname}${parsed.search}${parsed.hash}` || '/portal', externalUrl: null };
    }
    return { internalPath: null, externalUrl: trimmed };
  } catch {
    return { internalPath: null, externalUrl: trimmed };
  }
}

export function GlobalAnnouncementModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      let respondedIds: string[] = [];
      if (localStorage.getItem('use_mock_auth') === 'true') {
        respondedIds = readMockDismissedIds();
      } else {
        const { data: userRes, error: resError } = await supabase
          .from('user_announcement_responses')
          .select('announcement_id')
          .eq('user_id', user!.id);

        if (resError) throw resError;
        respondedIds = userRes?.map(r => r.announcement_id) || [];
      }

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
    const cur = announcements[currentIdx];
    if (cur?.id && localStorage.getItem('use_mock_auth') === 'true') {
      saveMockDismissedId(cur.id, false);
    }
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
    if (localStorage.getItem('use_mock_auth') === 'true') {
      saveMockDismissedId(current.id, permanently);
    } else if (permanently) {
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
          toast.error(t('portal:please_fill_field', 'Sila isi ruangan: {{field}}', { field: field.label }));
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      if (localStorage.getItem('use_mock_auth') === 'true') {
        saveMockDismissedId(current.id);
      } else {
        const { error } = await supabase.from('user_announcement_responses').insert({
          user_id: user.id,
          announcement_id: current.id,
          status: 'completed',
          form_data: Object.keys(formData).length > 0 ? formData : null
        });

        if (error) throw error;
      }
      toast.success(t('portal:feedback_recorded', 'Terima kasih. Maklumbalas direkodkan.'));
      handleNext();
    } catch (err: any) {
      toast.error(err.message || t('portal:failed_to_send', 'Gagal menghantar'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (f: AnnouncementFormField) => {
    return (
      <div key={f.id} className="space-y-2 text-left">
        <Label className="font-bold text-[#0B2420] dark:text-white/90 text-[11px] uppercase tracking-wider block mb-2">
          {f.label} {f.required && <span className="text-rose-500">*</span>}
        </Label>
        {f.type === 'select' && f.options ? (
          <Select value={formData[f.id] || ''} onValueChange={v => setFormData({ ...formData, [f.id]: v })}>
            <SelectTrigger className="bg-[#F6FBF9] dark:bg-white/5 border-[#B8E4DC] dark:border-white/10 text-[#0B2420] dark:text-white h-12 rounded-xl focus:ring-1 focus:ring-[#0D9488]/30"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#13171D] border-[#B8E4DC] dark:border-white/10 text-[#0B2420] dark:text-white">
              {f.options.map(opt => <SelectItem key={opt} value={opt} className="focus:bg-[#EBF7F4] dark:focus:bg-white/10">{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={f.type}
            value={formData[f.id] || ''}
            onChange={e => setFormData({ ...formData, [f.id]: e.target.value })}
            placeholder={f.placeholder}
            className="bg-[#F6FBF9] dark:bg-white/5 border-[#B8E4DC] dark:border-white/10 text-[#0B2420] dark:text-white h-12 rounded-xl placeholder:text-[#3B635C]/50 dark:placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-[#0D9488]/30"
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
      default: return isHigh ? <AlertCircle size={24} /> : <Info size={24} />;
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 "
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-[480px] bg-white dark:bg-[#13171D] text-[#0B2420] dark:text-[#F1F5F9] rounded-[2.5rem] shadow-2xl border border-[#B8E4DC]/80 dark:border-[#252B35] overflow-hidden flex flex-col max-h-[85dvh]"
      >
        {/* Progress bar — fixed at top */}
        {announcements.length > 1 && !isHigh && currentIdx < announcements.length - 1 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#B8E4DC]/40 dark:bg-white/5 z-30">
            <div className="h-full bg-[#0F766E] dark:bg-[#2DD4BF] transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Close button */}
        {!isHigh && (
          <button
            onClick={() => handleDismiss(false)}
            aria-label={t('common:close', 'Tutup')}
            className="absolute top-5 right-5 p-2 rounded-full bg-[#EBF7F4] dark:bg-white/5 hover:bg-[#D5EFEA] dark:hover:bg-white/10 text-[#3B635C] dark:text-white/60 hover:text-[#0B2420] dark:hover:text-white transition-colors z-30 cursor-pointer"
          >
            <X size={16} />
          </button>
        )}

        {/* Fixed compact header — icon + title only */}
        <div className="px-6 pt-8 pb-4 flex flex-col items-center text-center shrink-0">
          <div className={`p-3 rounded-full flex-shrink-0 z-10 mb-3 ${getIconColor(current.icon_type, isHigh)}`}>
            {getIcon(current.icon_type, isHigh)}
          </div>
          <h2 className="text-xl font-black tracking-tighter leading-tight mb-1 text-[#0B2420] dark:text-[#F1F5F9]">
            {current.title}
          </h2>
          {isHigh && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
              Notis Mandatori
            </div>
          )}
        </div>

        {/* Butang Buka Pautan — atas sekali, prominent, sentiasa nampak tanpa scroll */}
        {current.action_url && (() => {
          const { internalPath, externalUrl } = normalizeAnnouncementRoute(current.action_url);
          if (internalPath) {
            return (
              <div className="px-6 sm:px-8 pb-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleNext();
                    navigate(internalPath);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-2xl bg-[#0F766E] hover:bg-[#0D9488] dark:bg-[#2DD4BF] dark:hover:bg-[#14B8A6] text-white dark:text-[#090B0E] font-black tracking-wide text-[12px] uppercase shadow-lg shadow-teal-600/20 transition-all group cursor-pointer"
                >
                  <ExternalLink size={16} className="group-hover:scale-110 transition-transform" />
                  <span>{t('portal:open_link', 'Buka Pautan')}</span>
                </button>
              </div>
            );
          }
          return (
            <div className="px-6 sm:px-8 pb-3 shrink-0">
              <a
                href={externalUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-2xl bg-[#0F766E] hover:bg-[#0D9488] dark:bg-[#2DD4BF] dark:hover:bg-[#14B8A6] text-white dark:text-[#090B0E] font-black tracking-wide text-[12px] uppercase shadow-lg shadow-teal-600/20 transition-all group"
              >
                <ExternalLink size={16} className="group-hover:scale-110 transition-transform" />
                <span>{t('portal:open_link', 'Buka Pautan')}</span>
              </a>
            </div>
          );
        })()}

        {/* Scrollable content area — image included */}
        <div className="flex-1 overflow-y-auto">
          {/* Image inside scroll so it doesn't steal fixed space */}
          {current.image_url && (
            <div className="w-full relative overflow-hidden bg-black/5 dark:bg-black flex items-center justify-center group mb-4">
              <img src={current.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 scale-125" />
              <img src={current.image_url} alt="Poster" className="relative w-full max-h-[35vh] object-contain cursor-zoom-in" onClick={() => setFullScreenImage(current.image_url)} />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-[#13171D] pointer-events-none" />
              <button
                onClick={(e) => { e.stopPropagation(); setFullScreenImage(current.image_url); }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/55 border border-white/15 text-white hover:bg-black/75 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 transition-all z-20"
              >
                <Maximize2 size={12} />
                {t('portal:view_fullscreen', 'Papar Skrin Penuh')}
              </button>
            </div>
          )}

          <div className="px-6 sm:px-8 pb-6 space-y-4">
            <div className="text-[#3B635C] dark:text-[#94A0B2] text-[13px] leading-relaxed text-center font-medium whitespace-pre-wrap">
              {current.content_body}
            </div>

            {current.form_schema && current.form_schema.length > 0 && (
              <div className="space-y-4 pt-4 text-left">
                {current.form_schema.map(renderField)}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex flex-col gap-3 shrink-0 relative z-10 pt-2">
          {current.form_schema && current.form_schema.length > 0 ? (
            <>
              <Button
                disabled={submitting}
                className={`w-full h-12 rounded-full font-black tracking-wider text-[11px] uppercase shadow-sm ${isHigh ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-[#0F766E] hover:bg-[#0D9488] text-white'}`}
                onClick={handleSubmit}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {submitting ? 'Memproses...' : t('portal:submit_info', 'Hantar Maklumat')}
              </Button>
              {!isHigh && (
                <Button variant="ghost" className="w-full h-12 rounded-full font-bold tracking-wider text-[11px] uppercase border border-[#B8E4DC] dark:border-white/10 text-[#3B635C] dark:text-white/70 hover:text-[#0B2420] dark:hover:text-white hover:bg-[#EBF7F4] dark:hover:bg-white/5" onClick={() => handleNext()}>
                  Langkau Seterusnya
                </Button>
              )}
            </>
          ) : isHigh ? (
            <Button
              disabled={submitting}
              className="w-full h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-black tracking-wider text-[11px] uppercase shadow-sm"
              onClick={handleSubmit}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t('portal:i_understand', 'Saya Faham')}
            </Button>
          ) : (
            <Button className="w-full h-12 rounded-full border border-[#B8E4DC] dark:border-white/10 bg-[#F6FBF9] dark:bg-white/5 hover:bg-[#EBF7F4] dark:hover:bg-white/10 text-[#0B2420] dark:text-white/85 font-bold tracking-wider text-[11px] uppercase transition-colors" onClick={() => handleNext()}>
              {currentIdx < announcements.length - 1 ? 'Seterusnya' : t('portal:close_notice', 'Tutup Makluman')}
            </Button>
          )}

          {current.priority === 'EASY' && (
            <button
              onClick={() => handleDismiss(true)}
              className="flex items-center justify-center gap-1.5 w-full text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-2 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors text-center"
            >
              <ShieldAlert size={13} className="shrink-0" />
              {t('portal:dont_show_again', 'Jangan Tunjuk Notis Ini Lagi')}
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
            className="fixed inset-0 z-[210] bg-black/95  flex items-center justify-center p-4 cursor-zoom-out"
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
              alt={t('portal:view_full', 'Papar Penuh')}
              className="max-w-full max-h-[95vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
