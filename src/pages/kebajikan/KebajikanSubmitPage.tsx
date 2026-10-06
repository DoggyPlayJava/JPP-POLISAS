import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HeartHandshake, ChevronRight, ChevronLeft, Building2,
  Dumbbell, Coffee, Wifi, MoreHorizontal, Check, CheckCircle2, Clock,
  TrendingUp, ListChecks, ArrowUpRight, ArrowRight, HelpCircle,
  Upload, AlertCircle, X, Camera, Loader2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotificationToKebajikanExco, sendNotificationToUser, sendNotificationToKKExco } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { compressImage } from '@/lib/imageCompression';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  KEBAJIKAN_THEME_COLOR, KebajikanTicketCategory,
  KEBAJIKAN_CATEGORY_LABELS, KEBAJIKAN_CATEGORY_DESCRIPTIONS,
  KebajikanPublicStats,
} from '@/types';
import { cn } from '@/lib/utils';
import { SystemTour } from '@/components/ui/SystemTour';
import { useTour } from '@/hooks/useTour';

const TEAL = KEBAJIKAN_THEME_COLOR;

const JABATAN_LIST = [
  'Jabatan Perdagangan (JP)',
  'Jabatan Kejuruteraan Mekanikal (JKM)',
  'Jabatan Teknologi Makanan (JTM)',
  'Jabatan Kejuruteraan Elektrik (JKE)',
  'Jabatan Kejuruteraan Awam (JKA)',
  'Asasi Teknologi Kejuruteraan (FTV)',
  'Lain-Lain',
];

const SUKAN_LIST = [
  'Padang Football / Futsal',
  'Gelanggang Badminton',
  'Gelanggang Bola Tampar',
  'Gimnasium',
  'Dewan Sukan',
  'Lain-Lain',
];

const KAFETERIA_LIST = ['Al-Biruni', 'Al-Ghazali', 'Ibn Sina', 'Lain-Lain'];

const KAFETERIA_TYPES = [
  'Kebersihan & Sanitasi',
  'Kualiti / Rasa Makanan',
  'Harga Tidak Berpatutan',
  'Perkhidmatan Tidak Memuaskan',
  'Kehabisan Stok / Menu',
  'Lain-Lain',
];

type Step = 'STATS' | 'CATEGORY' | 'FORM' | 'PREVIEW' | 'SUCCESS';

interface FormData {
  full_name: string;
  gender: string;
  matric_no: string;
  phone: string;
  class: string;
  category: KebajikanTicketCategory | null;
  title: string;
  description: string;
  // Category-specific
  jabatan?: string;
  jabatan_custom?: string;
  lokasi?: string;
  sukan?: string;
  sukan_custom?: string;
  kafeteria?: string;
  kafeteria_custom?: string;
  kafeteria_types?: string[];
  wifi_blok?: string;
  wifi_bilik?: string;
  wifi_speed?: string;
  wifi_frequency?: string;
  wifi_times?: string[];
  wifi_activities?: string[];
  wifi_suggestion?: string;
}

const CATEGORIES: { key: KebajikanTicketCategory; icon: React.ElementType; color: string; bg: string }[] = [
  { key: 'FASILITI_JABATAN', icon: Building2,    color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  { key: 'FASILITI_SUKAN',   icon: Dumbbell,     color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  { key: 'KAFETERIA',        icon: Coffee,        color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  { key: 'WIFI_KAMSIS',      icon: Wifi,          color: TEAL,      bg: 'rgba(45,212,191,0.1)'  },
  { key: 'LAIN_LAIN',        icon: MoreHorizontal,color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
];

/** Auto-resolve and map student details from Auth & Profile */
const getInitialProfileData = (profile: any, user: any) => {
  const full_name = profile?.name || profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const matric_no = profile?.student_id || profile?.matric_no || profile?.matrix_no || user?.user_metadata?.matric_no || user?.user_metadata?.student_id || '';
  const phone = profile?.phone || user?.user_metadata?.phone || '';
  const studentClass = profile?.class || user?.user_metadata?.class || '';
  const gender = profile?.gender || user?.user_metadata?.gender || '';

  const rawDept = profile?.department || profile?.jabatan || user?.user_metadata?.department || '';
  let jabatan = '';
  if (rawDept) {
    const matched = JABATAN_LIST.find(j => j.toLowerCase().includes(rawDept.toLowerCase()) || rawDept.toLowerCase().includes(j.toLowerCase()));
    if (matched) {
      jabatan = matched;
    } else if (/jp|perdagangan/i.test(rawDept)) {
      jabatan = 'Jabatan Perdagangan (JP)';
    } else if (/jkm|mekanikal/i.test(rawDept)) {
      jabatan = 'Jabatan Kejuruteraan Mekanikal (JKM)';
    } else if (/jtm|makanan/i.test(rawDept)) {
      jabatan = 'Jabatan Teknologi Makanan (JTM)';
    } else if (/jke|elektrik/i.test(rawDept)) {
      jabatan = 'Jabatan Kejuruteraan Elektrik (JKE)';
    } else if (/jka|awam/i.test(rawDept)) {
      jabatan = 'Jabatan Kejuruteraan Awam (JKA)';
    } else if (/ftv|asasi/i.test(rawDept)) {
      jabatan = 'Asasi Teknologi Kejuruteraan (FTV)';
    } else {
      jabatan = rawDept;
    }
  }

  return { full_name, matric_no, phone, class: studentClass, gender, jabatan };
};

export function KebajikanSubmitPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]             = useState<Step>('STATS');
  const [submitting, setSubmitting]   = useState(false);
  const [submittedNo, setSubmittedNo] = useState('');
  const [images, setImages]           = useState<File[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [publicStats, setPublicStats] = useState<KebajikanPublicStats | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate detection state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string; ticket_no: string; title: string; status: string;
  } | null>(null);
  const [bypassDuplicate, setBypassDuplicate] = useState(false);

  const { runTour, startTour, closeTour } = useTour('KEBAJIKAN_SUBMIT', !!profile);

  // Form State initialized from Profile / Auth metadata
  const [form, setForm] = useState<FormData>(() => {
    const initial = getInitialProfileData(profile, user);
    return {
      full_name:    initial.full_name,
      gender:       initial.gender,
      matric_no:    initial.matric_no,
      phone:        initial.phone,
      class:        initial.class,
      category:     null,
      title:        '',
      description:  '',
      jabatan:      initial.jabatan,
    };
  });

  // Re-sync form state once profile / user asynchronously finishes loading
  useEffect(() => {
    if (profile || user) {
      const pData = getInitialProfileData(profile, user);
      setForm(prev => ({
        ...prev,
        full_name: prev.full_name || pData.full_name,
        matric_no: prev.matric_no || pData.matric_no,
        phone:     prev.phone || pData.phone,
        class:     prev.class || pData.class,
        gender:    prev.gender || pData.gender,
        jabatan:   prev.jabatan || pData.jabatan,
      }));
    }
  }, [profile, user]);

  // Load public stats for hero
  useEffect(() => {
    supabase.from('kebajikan_public_stats').select('*').single().then(({ data }) => {
      if (data) setPublicStats(data as KebajikanPublicStats);
    });
  }, []);

  const upd = (k: keyof FormData, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleArr = (k: keyof FormData, val: string) => {
    const arr = (form[k] as string[]) || [];
    upd(k, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  // Image capture & compression handler
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 3) {
      alert('Maksimum 3 keping gambar sahaja dibenarkan.');
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setImages(prev => (prev.length < 3 ? [...prev, compressed] : prev));
    } catch (err) {
      console.error('Error compressing image:', err);
      setImages(prev => (prev.length < 3 ? [...prev, file] : prev));
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Upload images to Supabase storage
  const uploadImages = async (): Promise<string[]> => {
    if (!images.length) return [];
    
    const urls: string[] = [];
    for (const img of images) {
      const compressedImg = await compressImage(img);
      const sanitizedName = compressedImg.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `${user?.id ?? 'anon'}/${Date.now()}-${sanitizedName}`;
      const { error } = await supabase.storage.from('kebajikan-images').upload(path, compressedImg, { contentType: compressedImg.type || 'image/jpeg' });
      if (!error) {
        const { data } = supabase.storage.from('kebajikan-images').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const buildFormData = (): Record<string, any> => {
    switch (form.category) {
      case 'FASILITI_JABATAN': return { jabatan: form.jabatan === 'Lain-Lain' ? form.jabatan_custom : form.jabatan, lokasi: form.lokasi };
      case 'FASILITI_SUKAN':   return { sukan: form.sukan === 'Lain-Lain' ? form.sukan_custom : form.sukan };
      case 'KAFETERIA':        return { kafeteria: form.kafeteria === 'Lain-Lain' ? form.kafeteria_custom : form.kafeteria, types: form.kafeteria_types };
      case 'WIFI_KAMSIS':      return { blok: form.wifi_blok, bilik: form.wifi_bilik, speed: form.wifi_speed, frequency: form.wifi_frequency, times: form.wifi_times, activities: form.wifi_activities, suggestion: form.wifi_suggestion };
      default: return {};
    }
  };

  const buildTitle = (): string => {
    if (form.title) return form.title;
    switch (form.category) {
      case 'FASILITI_JABATAN': return `Aduan Fasiliti — ${form.jabatan === 'Lain-Lain' ? form.jabatan_custom : form.jabatan || 'Jabatan'}`;
      case 'FASILITI_SUKAN':   return `Aduan Sukan — ${form.sukan === 'Lain-Lain' ? form.sukan_custom : form.sukan || 'Fasiliti Sukan'}`;
      case 'KAFETERIA':        return `Aduan Kafeteria ${form.kafeteria === 'Lain-Lain' ? form.kafeteria_custom : form.kafeteria || ''}`;
      case 'WIFI_KAMSIS':      return `Aduan WiFi Blok ${form.wifi_blok || '(Tidak dinyatakan)'}`;
      default: return form.title || 'Aduan Umum';
    }
  };

  const getLocationSummary = (): string => {
    switch (form.category) {
      case 'FASILITI_JABATAN':
        return [form.jabatan === 'Lain-Lain' ? form.jabatan_custom : form.jabatan, form.lokasi].filter(Boolean).join(' — ');
      case 'FASILITI_SUKAN':
        return form.sukan === 'Lain-Lain' ? form.sukan_custom || '' : form.sukan || '';
      case 'KAFETERIA':
        return form.kafeteria === 'Lain-Lain' ? form.kafeteria_custom || '' : form.kafeteria || '';
      case 'WIFI_KAMSIS':
        return [`Blok ${form.wifi_blok || '-'}`, form.wifi_bilik ? `Bilik ${form.wifi_bilik}` : ''].filter(Boolean).join(', ');
      default:
        return form.lokasi || '';
    }
  };

  // Form completion indicator
  const isCategoryDetailValid = (): boolean => {
    switch (form.category) {
      case 'FASILITI_JABATAN':
        return Boolean(form.jabatan && (form.jabatan !== 'Lain-Lain' || form.jabatan_custom?.trim()));
      case 'FASILITI_SUKAN':
        return Boolean(form.sukan && (form.sukan !== 'Lain-Lain' || form.sukan_custom?.trim()));
      case 'KAFETERIA':
        return Boolean(form.kafeteria && (form.kafeteria !== 'Lain-Lain' || form.kafeteria_custom?.trim()));
      case 'WIFI_KAMSIS':
        return Boolean(form.wifi_blok && form.wifi_blok.trim());
      case 'LAIN_LAIN':
        return Boolean(form.title && form.title.trim());
      default:
        return false;
    }
  };

  const isFormReady = Boolean(
    form.category &&
    form.full_name?.trim() &&
    form.description?.trim() &&
    images.length >= 1 &&
    isCategoryDetailValid()
  );

  const handleSubmit = async () => {
    if (!user || !form.category) return;
    if (images.length === 0) {
      alert("Sila muat naik sekurang-kurangnya 1 gambar sokongan.");
      return;
    }
    setSubmitting(true);
    try {
      // ─ Duplicate detection ─
      if (!bypassDuplicate) {
        const { data: existing } = await supabase
          .from('kebajikan_tickets')
          .select('id, ticket_no, title, status')
          .eq('submitter_id', user.id)
          .eq('category', form.category)
          .not('status', 'in', '("RESOLVED","CLOSED","CANCELLED")')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          setDuplicateWarning(existing);
          setSubmitting(false);
          return;
        }
      }
      const image_urls = await uploadImages();
      const { data, error } = await supabase.from('kebajikan_tickets').insert({
        submitter_id: user.id,
        full_name:    form.full_name,
        gender:       form.gender || null,
        matric_no:    form.matric_no || null,
        phone:        form.phone || null,
        class:        form.class || null,
        category:     form.category,
        title:        buildTitle(),
        description:  form.description,
        form_data:    buildFormData(),
        image_urls,
        status:       'NEW',
        priority:     'NORMAL',
      }).select('id, ticket_no').single();

      if (error) throw error;

      // Tentukan unit yang bertanggungjawab berdasarkan kategori
      const handled_by_unit = form.category === 'KAFETERIA' ? 'KK' : 'KEBAJIKAN';

      // Kemaskini tiket dengan unit yang betul
      await supabase.from('kebajikan_tickets').update({ handled_by_unit }).eq('id', data.id);

      // Fetch auto-reply settings
      const { data: settings } = await supabase.from('kebajikan_settings').select('auto_reply_message').limit(1).single();
      const rawAutoReply = settings?.auto_reply_message || 'Terima kasih atas aduan anda. No. Tiket anda ialah {ticket_no}. Exco Kebajikan akan menghubungi anda dalam masa yang singkat. Terima kasih.';
      const personalizedAutoReply = rawAutoReply.replace('{ticket_no}', data.ticket_no);

      // Insert auto-reply as the first comment
      await supabase.from('kebajikan_ticket_comments').insert({
        ticket_id: data.id,
        author_id: user.id, // Using submitter's ID to satisfy FK constraint, but role is SISTEM
        author_name: 'Sistem E-Kebajikan',
        author_role: 'SISTEM',
        is_internal: false,
        content: personalizedAutoReply
      });

      // Notify the user about the auto-reply
      await sendNotificationToUser(user.id, {
        title: `Aduan Diterima: ${data.ticket_no}`,
        message: personalizedAutoReply.slice(0, 80) + (personalizedAutoReply.length > 80 ? '...' : ''),
        type: 'AUTO_REPLY',
        module: 'KEBAJIKAN',
        link: `/kebajikan/aduan/${data.id}`,
        reference_id: data.ticket_no,
        actor_name: 'Sistem E-Kebajikan',
      });

      // Notify unit Exco yang betul tentang tiket baru
      const ticketTitle = buildTitle();
      const newTicketPayload = {
        title:       `Aduan Baru: ${data.ticket_no}`,
        message:     `${form.full_name || 'Pelajar'} telah menghantar aduan baharu — "${ticketTitle}" (${KEBAJIKAN_CATEGORY_LABELS[form.category!]})`,
        type:        'NEW_TICKET',
        module:      'KEBAJIKAN' as const,
        link:        `/kebajikan/tiket/${data.id}`,
        reference_id: data.ticket_no,
        actor_name:  form.full_name || profile?.full_name || 'Pelajar',
      };

      if (handled_by_unit === 'KK') {
        await sendNotificationToKKExco(newTicketPayload);
      } else {
        await sendNotificationToKebajikanExco(newTicketPayload);
        
        // ── EMAIL NOTIFICATION: TIKET BARU ──────────────────────────────
        try {
          const { data: settingsData } = await supabase
            .from('kebajikan_settings')
            .select('email_new_ticket')
            .limit(1)
            .single();

          if (settingsData?.email_new_ticket) {
            const { data: excos } = await supabase
              .from('profiles')
              .select('email')
              .eq('role', 'JPP')
              .eq('jpp_unit', 'KEBAJIKAN');

            const emails = excos?.map(e => e.email).filter(Boolean) as string[];

            if (emails && emails.length > 0) {
              const { generateStaffNotificationEmail } = await import('@/lib/emailTemplates');
              const emailHtml = generateStaffNotificationEmail(
                'NEW',
                data.ticket_no,
                ticketTitle,
                form.full_name || profile?.full_name || 'Pelajar',
                `/kebajikan/tiket/${data.id}`
              );

              await sendEmail({
                to: emails,
                subject: `Aduan Baharu: ${data.ticket_no}`,
                html: emailHtml,
              });
            }
          }
        } catch (emailErr) {
          console.error('Error sending new ticket email:', emailErr);
        }
      }

      setSubmittedNo(data.ticket_no);
      setShowReviewModal(false);
      setStep('SUCCESS');
    } catch (err: any) {
      alert(`Gagal hantar: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative overflow-hidden transition-colors">
      {/* Background Glow */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-teal-500/10 dark:bg-teal-500/15 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />
      
      {/* Top Nav */}
      <div
        className="relative z-10 flex items-center justify-between px-6 h-16 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/50 backdrop-blur-xl transition-colors"
      >
        <Link to="/portal" className="flex items-center gap-2 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/80 transition-colors text-xs font-black uppercase tracking-widest">
          <ChevronLeft className="w-3.5 h-3.5" />Portal JPP
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={startTour}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/80 flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all"
            title="Bantuan Sistem"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <HeartHandshake className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-white/80">E-Kebajikan</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP: STATS HERO ───────────────────────────────────────────────── */}
        {step === 'STATS' && (
          <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-10">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-4 bg-teal-500/10 dark:bg-teal-500/20 border-2 border-teal-500/30 text-teal-600 dark:text-teal-400 shadow-sm"
              >
                <HeartHandshake className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Sistem Aduan Pelajar</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Aduan anda akan diproses oleh Exco Kebajikan JPP POLISAS</p>
            </div>

            {/* Stats Grid */}
            {publicStats && (
              <div className="relative rounded-3xl p-6 sm:p-8 mb-8 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-sm dark:shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
                <p className="relative z-10 text-[11px] font-black uppercase tracking-[0.3em] mb-6 text-teal-700 dark:text-teal-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Prestasi Exco Kebajikan
                </p>
                <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: CheckCircle2, val: publicStats.total_resolved,    label: 'Kes Selesai', col: '#10B981' },
                    { icon: TrendingUp,   val: `${publicStats.resolution_rate ?? 0}%`, label: 'Kadar Selesai', col: TEAL },
                    { icon: Clock,        val: `~${publicStats.avg_resolution_hours ?? 0}j`, label: 'Purata Masa', col: '#F59E0B' },
                    { icon: ListChecks,   val: publicStats.total_active,     label: 'Kes Aktif', col: '#6366F1' },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-transparent">
                      <s.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: s.col }} />
                      <p className="font-black text-lg text-slate-900 dark:text-white leading-tight">{String(s.val)}</p>
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
                <Link
                  to="/kebajikan/statistik"
                  className="relative z-10 mt-6 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 transition-colors w-fit mx-auto"
                >
                  Lihat statistik penuh <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            <Button
              onClick={() => setStep('CATEGORY')}
              className="relative w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl text-slate-950 bg-teal-400 hover:bg-teal-300 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-teal-500/20"
            >
              Buat Aduan Baru <ChevronRight className="w-5 h-5 ml-1.5" />
            </Button>
            
            <Link to="/kebajikan/aduan-saya" className="block w-full mt-3">
              <button
                className="relative w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl border border-slate-300 dark:border-white/20 text-slate-800 dark:text-white bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center shadow-sm"
              >
                Semak Status Aduan Saya <ArrowUpRight className="w-4 h-4 ml-1.5" />
              </button>
            </Link>

            <p className="text-center text-[10px] text-slate-500 dark:text-white/30 mt-4">Log masuk diperlukan untuk kemukakan aduan</p>
          </motion.div>
        )}

        {/* ── STEP: CATEGORY ─────────────────────────────────────────────────── */}
        {step === 'CATEGORY' && (
          <motion.div key="cat" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <div className="mb-8">
              <button onClick={() => setStep('STATS')} className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70 mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">Pilih Kategori Aduan</h2>
              <p className="text-xs text-slate-600 dark:text-white/40">Pilih kategori yang paling sesuai dengan aduan fasiliti anda</p>
            </div>

            {/* Tactile 1-Touch High-Contrast Category Grid */}
            <div className="tour-aduan-kategori grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {CATEGORIES.map(cat => {
                const isSelected = form.category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => { upd('category', cat.key); }}
                    className={cn(
                      'relative flex items-start gap-4 p-5 rounded-2xl text-left border min-h-[56px] transition-all duration-200 group overflow-hidden',
                      isSelected 
                        ? 'border-teal-500/90 bg-teal-50/70 dark:bg-slate-900 shadow-md shadow-teal-500/10 scale-[1.01]' 
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm'
                    )}
                  >
                    {isSelected && (
                      <motion.div layoutId="active-cat-bg" className="absolute inset-0 opacity-15" style={{ background: `linear-gradient(135deg, ${cat.color}, transparent)` }} />
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 border-2 rounded-2xl pointer-events-none" style={{ borderColor: cat.color }} />
                    )}
                    <div
                      className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                      style={{ background: isSelected ? cat.color : cat.bg }}
                    >
                      <cat.icon className="w-6 h-6" style={{ color: isSelected ? '#0f172a' : cat.color }} />
                    </div>
                    <div className="relative z-10 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                          {KEBAJIKAN_CATEGORY_LABELS[cat.key]}
                        </p>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-white/50 mt-1 leading-relaxed">
                        {KEBAJIKAN_CATEGORY_DESCRIPTIONS[cat.key]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setStep('FORM')}
              disabled={!form.category}
              className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl mt-8 text-slate-950 disabled:opacity-30 transition-all hover:scale-[1.01] active:scale-[0.99] bg-teal-400 hover:bg-teal-300 shadow-lg shadow-teal-500/20"
            >
              Seterusnya <ChevronRight className="w-5 h-5 ml-1.5" />
            </Button>
          </motion.div>
        )}

        {/* ── STEP: FORM ─────────────────────────────────────────────────────── */}
        {step === 'FORM' && (
          <motion.div key="form" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-28 sm:pb-12">
            <div className="mb-6">
              <button onClick={() => setStep('CATEGORY')} className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70 mb-3 transition-colors font-bold">
                <ChevronLeft className="w-4 h-4" /> Tukar Kategori
              </button>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">Maklumat Pengadu & Aduan</h2>
                  <p className="text-xs text-slate-600 dark:text-white/50">Lengkapkan butiran aduan fasiliti anda</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20">
                  <span className="text-[10px] font-black uppercase tracking-wider">Kategori:</span>
                  <span className="text-xs font-black">
                    {form.category ? KEBAJIKAN_CATEGORY_LABELS[form.category] : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Maklumat Pengadu (Auto-Filled from Profile/Auth) */}
              <fieldset className="rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900/80 shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-white/40 px-1">
                    Maklumat Pengadu
                  </legend>
                  {Boolean(profile?.full_name || profile?.matric_no || user?.user_metadata?.full_name) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      Auto-isi dari Profil
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Nama Penuh *</label>
                    <Input value={form.full_name} onChange={e => upd('full_name', e.target.value)} placeholder="Nama seperti dalam rekod" className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">No. Matrik</label>
                    <Input value={form.matric_no} onChange={e => upd('matric_no', e.target.value)} placeholder="23DAD00111" className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">No. Telefon</label>
                    <Input value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="010-1234567" className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Kelas / Program</label>
                    <Input value={form.class} onChange={e => upd('class', e.target.value)} placeholder="DAD3A" className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Jantina</label>
                  <div className="flex gap-3">
                    {['Lelaki', 'Perempuan'].map(g => (
                      <button
                        type="button"
                        key={g} onClick={() => upd('gender', g)}
                        className={cn('flex-1 py-2.5 rounded-xl text-xs font-black border transition-all', form.gender === g ? 'bg-teal-400 border-teal-400 text-slate-950 shadow-sm' : 'text-slate-700 dark:text-white/50 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-white/[0.03]')}
                      >{g}</button>
                    ))}
                  </div>
                </div>
              </fieldset>

              {/* Category-specific fields */}
              {form.category === 'FASILITI_JABATAN' && (
                <CategoryJabatan form={form} upd={upd} />
              )}
              {form.category === 'FASILITI_SUKAN' && (
                <CategorySukan form={form} upd={upd} />
              )}
              {form.category === 'KAFETERIA' && (
                <CategoryKafeteria form={form} upd={upd} toggleArr={toggleArr} />
              )}
              {form.category === 'WIFI_KAMSIS' && (
                <CategoryWifi form={form} upd={upd} toggleArr={toggleArr} />
              )}
              {form.category === 'LAIN_LAIN' && (
                <div className="space-y-4 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 shadow-sm">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Tajuk Aduan *</label>
                    <Input value={form.title} onChange={e => upd('title', e.target.value)} placeholder="Ringkasan aduan anda" className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />
                  </div>
                </div>
              )}

              {/* Description (common) */}
              <fieldset className="rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900/80 shadow-sm">
                <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-white/40 px-2">Penerangan Aduan</legend>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Huraikan Aduan Anda dengan Terperinci *</label>
                  <Textarea
                    value={form.description}
                    onChange={e => upd('description', e.target.value)}
                    placeholder="Terangkan masalah yang anda hadapi dengan lebih lanjut. Sertakan butiran seperti tarikh, masa, dan tempat kejadian..."
                    rows={4}
                    className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl resize-none"
                  />
                </div>

                {/* Direct Camera Capture & File Upload */}
                <div className="tour-aduan-gambar">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 block">
                      Gambar Sokongan (Wajib - min. 1, maks. 3) *
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">
                      {images.length}/3 keping
                    </span>
                  </div>

                  {images.length === 0 && (
                    <p className="text-red-500 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Sila muat naik sekurang-kurangnya 1 gambar/bukti aduan
                    </p>
                  )}

                  <div className="flex gap-3 flex-wrap items-center">
                    {/* Thumbnails */}
                    {images.map((img, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm group">
                        <img src={URL.createObjectURL(img)} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <button
                          type="button"
                          onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-md"
                          title="Padam gambar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Compression indicator */}
                    {isCompressing && (
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-teal-500/40 bg-teal-50/50 dark:bg-teal-500/10 flex flex-col items-center justify-center">
                        <Loader2 className="w-6 h-6 text-teal-600 dark:text-teal-400 animate-spin mb-1" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">Memampat...</span>
                      </div>
                    )}

                    {/* Action Upload Buttons */}
                    {images.length < 3 && !isCompressing && (
                      <div className="flex gap-2">
                        {/* Direct Camera Capture */}
                        <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-teal-500/30 bg-teal-50/30 dark:bg-teal-500/5 hover:bg-teal-50/70 dark:hover:bg-teal-500/10 hover:border-teal-500 flex flex-col items-center justify-center cursor-pointer transition-all group">
                          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <Camera className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-black tracking-wider uppercase text-teal-800 dark:text-teal-300">Kamera</span>
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleImageSelect}
                          />
                        </label>

                        {/* File / Gallery Upload */}
                        <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:border-teal-500/50 flex flex-col items-center justify-center cursor-pointer transition-all group">
                          <div className="w-8 h-8 rounded-xl bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-white/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-black tracking-wider uppercase text-slate-600 dark:text-white/50">Galeri</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageSelect}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Gambar dimampatkan secara automatik sebelum dimuat naik untuk kelajuan & penjimatan data.
                  </p>
                </div>
              </fieldset>
            </div>

            {/* Desktop Action Button */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('CATEGORY')}
                className="w-full sm:w-1/3 h-14 text-xs font-black uppercase tracking-widest rounded-2xl border-slate-300 dark:border-white/15"
              >
                <ChevronLeft className="w-4 h-4 mr-1.5" /> Tukar Kategori
              </Button>
              <Button
                type="button"
                onClick={() => setShowReviewModal(true)}
                disabled={!isFormReady}
                className="w-full sm:w-2/3 h-14 text-sm font-black uppercase tracking-widest rounded-2xl text-slate-950 disabled:opacity-30 transition-all hover:scale-[1.01] active:scale-[0.99] bg-teal-400 hover:bg-teal-300 shadow-lg shadow-teal-500/20"
              >
                Semak & Hantar <ChevronRight className="w-5 h-5 ml-1.5" />
              </Button>
            </div>

            {/* Mobile Floating Sticky Bottom Summary Capsule */}
            <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40 bg-slate-900/95 dark:bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl backdrop-blur-md flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    {form.category ? KEBAJIKAN_CATEGORY_LABELS[form.category] : 'Pilih Kategori'}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-black text-white truncate">
                    {isFormReady ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="truncate">Sedia Dihantar</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate text-amber-200">
                          {images.length === 0 ? 'Perlu 1 Gambar' : 'Lengkapkan Borang'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isFormReady) {
                    setShowReviewModal(true);
                  } else if (images.length === 0) {
                    alert('Sila muat naik sekurang-kurangnya 1 gambar sokongan sebelum menyemak.');
                  } else {
                    alert('Sila lengkapkan maklumat yang bertanda bintang (*) sebelum menyemak.');
                  }
                }}
                disabled={!form.category || !form.full_name || !form.description}
                className="h-10 px-4 rounded-xl bg-teal-400 hover:bg-teal-300 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 shadow-md shadow-teal-500/20"
              >
                Semak & Hantar <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP: PREVIEW (Fallback / Direct Desktop Review) ───────────────── */}
        {step === 'PREVIEW' && (
          <motion.div key="preview" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <div className="mb-8">
              <button onClick={() => setStep('FORM')} className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70 mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Edit Aduan
              </button>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">Semak & Sahkan Aduan</h2>
              <p className="text-xs text-slate-600 dark:text-white/40">Sila semak maklumat sebelum menghantar aduan anda</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.1] p-6 space-y-5 bg-white dark:bg-slate-900/80 shadow-sm">
              <Row label="Nama" value={form.full_name} />
              <Row label="No. Matrik" value={form.matric_no || '-'} />
              <Row label="Telefon" value={form.phone || '-'} />
              <Row label="Kelas" value={form.class || '-'} />
              <hr className="border-slate-200 dark:border-white/[0.08]" />
              <Row label="Kategori" value={form.category ? KEBAJIKAN_CATEGORY_LABELS[form.category] : '-'} highlight />
              <Row label="Tajuk Aduan" value={buildTitle()} />
              {getLocationSummary() && <Row label="Lokasi" value={getLocationSummary()} />}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1.5">Penerangan</p>
                <p className="text-xs text-slate-700 dark:text-white/70 leading-relaxed">{form.description}</p>
              </div>
              {images.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-2">Gambar ({images.length})</p>
                  <div className="flex gap-2">
                    {images.map((img, i) => (
                      <img key={i} src={URL.createObjectURL(img)} alt={`Bukti ${i+1}`} className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-white/10 shadow-sm" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 rounded-2xl flex items-start gap-3 bg-teal-50 dark:bg-teal-500/[0.06] border border-teal-200 dark:border-teal-500/15">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
              <p className="text-xs text-slate-700 dark:text-white/70">Dengan menghantar aduan ini, anda bersetuju maklumat anda dikongsi dengan pihak Exco Kebajikan JPP POLISAS untuk tindakan lanjut.</p>
            </div>

            {/* ── Duplicate Warning ── */}
            {duplicateWarning && (
              <div className="mt-4 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/[0.06] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Aduan Serupa Sedang Diproses</p>
                    <p className="text-xs text-slate-700 dark:text-white/60 leading-relaxed">
                      Anda mempunyai aduan dalam kategori yang sama yang masih dalam proses:{' '}
                      <span className="font-bold text-slate-900 dark:text-white/80">{duplicateWarning.ticket_no}</span> — {duplicateWarning.title}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={`/kebajikan/aduan/${duplicateWarning.id}`}
                    className="flex-1 h-9 flex items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider border border-teal-500/30 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
                  >
                    Lihat Tiket Sedia Ada
                  </a>
                  <button
                    onClick={() => {
                      setBypassDuplicate(true);
                      setDuplicateWarning(null);
                    }}
                    className="flex-1 h-9 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    Hantar Aduan Tetap
                  </button>
                </div>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || images.length === 0}
              className="w-full h-12 text-sm font-black uppercase tracking-widest rounded-2xl mt-5 text-slate-950 bg-teal-400 hover:bg-teal-300 transition-all shadow-lg shadow-teal-500/20"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Menghantar...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sahkan & Hantar Aduan <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </motion.div>
        )}

        {/* ── STEP: SUCCESS ──────────────────────────────────────────────────── */}
        {step === 'SUCCESS' && (
          <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-lg mx-auto px-6 py-16 sm:py-20 text-center">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100 dark:bg-emerald-500/15 border-2 border-emerald-500/30"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Aduan Berjaya Dikemukakan!</h2>
            <p className="text-sm text-slate-600 dark:text-white/50 mb-6">Aduan anda telah diterima oleh sistem. No. aduan anda ialah:</p>
            <div
              className="inline-block px-8 py-4 rounded-2xl text-2xl font-black tracking-widest mb-8 bg-teal-50 dark:bg-teal-500/10 border-2 border-teal-400 dark:border-teal-500/30 text-teal-800 dark:text-teal-300 shadow-sm"
            >
              {submittedNo}
            </div>
            <p className="text-xs text-slate-500 dark:text-white/40 mb-8">Exco Kebajikan akan menguruskan aduan anda dalam masa yang singkat. Anda akan dimaklumkan melalui notifikasi dalam portal.</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/kebajikan/aduan-saya" className="flex-1">
                <Button className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-md">
                  Semak Status Aduan
                </Button>
              </Link>
              <Link to="/portal" className="flex-1">
                <Button variant="outline" className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-slate-300 dark:border-white/15 text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-transparent">
                  Kembali ke Portal
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SLIDE-UP BOTTOM SHEET / REVIEW MODAL ───────────────────────────── */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowReviewModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Slide-Up Sheet Panel */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 w-full max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drag Handle Indicator (Mobile) */}
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

              {/* Sheet Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Semak & Sahkan Aduan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pastikan butiran aduan fasiliti anda tepat</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  disabled={submitting}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet Body (Scrollable) */}
              <div className="px-6 py-5 overflow-y-auto space-y-4 text-left">
                {/* Clean Summary Card */}
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-3.5 bg-slate-50 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Kategori</span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                      {form.category ? KEBAJIKAN_CATEGORY_LABELS[form.category] : '-'}
                    </span>
                  </div>

                  <Row label="Tajuk Aduan" value={buildTitle()} highlight />
                  {getLocationSummary() && <Row label="Lokasi" value={getLocationSummary()} />}

                  <div className="border-t border-slate-200 dark:border-white/10 pt-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Penerangan</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">{form.description}</p>
                  </div>

                  <div className="border-t border-slate-200 dark:border-white/10 pt-3 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Maklumat Pengadu</span>
                    <Row label="Nama" value={form.full_name} />
                    <Row label="No. Matrik" value={form.matric_no || '-'} />
                    <Row label="Telefon" value={form.phone || '-'} />
                    <Row label="Kelas / Program" value={form.class || '-'} />
                  </div>

                  {images.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-white/10 pt-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                        Gambar Sokongan ({images.length})
                      </span>
                      <div className="flex gap-2">
                        {images.map((img, i) => (
                          <img key={i} src={URL.createObjectURL(img)} alt={`Bukti ${i+1}`} className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-white/10 shadow-sm" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Consent Notice */}
                <div className="p-3.5 rounded-2xl flex items-start gap-2.5 bg-teal-500/10 border border-teal-500/20">
                  <AlertCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Dengan mengesahkan aduan ini, anda bersetuju maklumat anda dikongsi dengan Exco Kebajikan JPP POLISAS untuk siasatan dan tindakan pembaikan segera.
                  </p>
                </div>

                {/* Duplicate Warning in modal */}
                {duplicateWarning && (
                  <div className="rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/[0.06] p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Aduan Serupa Sedang Diproses</p>
                        <p className="text-xs text-slate-700 dark:text-white/60 leading-relaxed">
                          Anda mempunyai aduan dalam kategori yang sama yang masih dalam proses:{' '}
                          <span className="font-bold text-slate-900 dark:text-white/80">{duplicateWarning.ticket_no}</span> — {duplicateWarning.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={`/kebajikan/aduan/${duplicateWarning.id}`}
                        className="flex-1 h-9 flex items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider border border-teal-500/30 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
                      >
                        Lihat Tiket Sedia Ada
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setBypassDuplicate(true);
                          setDuplicateWarning(null);
                        }}
                        className="flex-1 h-9 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white transition-colors"
                      >
                        Hantar Aduan Tetap
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sheet Footer */}
              <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  disabled={submitting}
                  className="w-full sm:w-auto flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-wider border-slate-300 dark:border-white/15"
                >
                  Kembali Edit
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || images.length === 0}
                  className="w-full sm:w-auto flex-[2] h-12 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-lg shadow-teal-500/20 disabled:opacity-40"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Menghantar...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sahkan & Hantar Aduan <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SystemTour run={runTour} onClose={closeTour} tourKey="KEBAJIKAN_SUBMIT" />
    </div>
  );
}

// ── Category sub-forms ──────────────────────────────────────────────────────

function CategoryJabatan({ form, upd }: { form: FormData; upd: Function }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900/80 shadow-sm">
      <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-white/40 px-2">Fasiliti Jabatan</legend>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Jabatan *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {JABATAN_LIST.map(j => (
            <button key={j} type="button" onClick={() => upd('jabatan', j)} className={cn('text-left px-3.5 py-2.5 rounded-xl text-xs border transition-all', form.jabatan === j ? 'text-indigo-900 dark:text-white border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 font-bold shadow-sm' : 'text-slate-700 dark:text-white/60 border-slate-200 dark:border-white/[0.07] bg-slate-50/50 dark:bg-transparent hover:border-slate-300 dark:hover:border-white/15')}>
              {j}
            </button>
          ))}
        </div>
        {form.jabatan === 'Lain-Lain' && <Input value={form.jabatan_custom || ''} onChange={e => upd('jabatan_custom', e.target.value)} placeholder="Nama jabatan..." className="mt-2 bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />}
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Lokasi Spesifik</label>
        <Input value={form.lokasi || ''} onChange={e => upd('lokasi', e.target.value)} placeholder="Bilik Kuliah JKE-02, dsb." className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />
      </div>
    </fieldset>
  );
}

function CategorySukan({ form, upd }: { form: FormData; upd: Function }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900/80 shadow-sm">
      <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-white/40 px-2">Fasiliti Sukan</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUKAN_LIST.map(s => (
          <button key={s} type="button" onClick={() => upd('sukan', s)} className={cn('text-left px-3.5 py-2.5 rounded-xl text-xs border transition-all', form.sukan === s ? 'text-amber-900 dark:text-white border-amber-500 bg-amber-50 dark:bg-amber-500/20 font-bold shadow-sm' : 'text-slate-700 dark:text-white/60 border-slate-200 dark:border-white/[0.07] bg-slate-50/50 dark:bg-transparent hover:border-slate-300 dark:hover:border-white/15')}>
            {s}
          </button>
        ))}
      </div>
      {form.sukan === 'Lain-Lain' && <Input value={form.sukan_custom || ''} onChange={e => upd('sukan_custom', e.target.value)} placeholder="Nama fasiliti..." className="mt-2 bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />}
    </fieldset>
  );
}

function CategoryKafeteria({ form, upd, toggleArr }: { form: FormData; upd: Function; toggleArr: Function }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900/80 shadow-sm">
      <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-white/40 px-2">Kafeteria</legend>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Pilih Kafeteria *</label>
        <div className="flex gap-2 flex-wrap">
          {KAFETERIA_LIST.map(k => (
            <button key={k} type="button" onClick={() => upd('kafeteria', k)} className={cn('px-4 py-2 rounded-xl text-xs font-black border transition-all', form.kafeteria === k ? 'text-red-900 dark:text-white border-red-500 bg-red-50 dark:bg-red-500/20 font-bold shadow-sm' : 'text-slate-700 dark:text-white/60 border-slate-200 dark:border-white/[0.07] bg-slate-50/50 dark:bg-transparent hover:border-slate-300 dark:hover:border-white/15')}>
              {k}
            </button>
          ))}
        </div>
        {form.kafeteria === 'Lain-Lain' && <Input value={form.kafeteria_custom || ''} onChange={e => upd('kafeteria_custom', e.target.value)} placeholder="Nama kafeteria..." className="mt-2 bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />}
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Jenis Aduan (boleh pilih lebih 1)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {KAFETERIA_TYPES.map(t => {
            const checked = (form.kafeteria_types as string[] || []).includes(t);
            return (
              <button key={t} type="button" onClick={() => toggleArr('kafeteria_types', t)} className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs border transition-all text-left', checked ? 'text-red-900 dark:text-white border-red-500 bg-red-50 dark:bg-red-500/20 font-bold shadow-sm' : 'text-slate-700 dark:text-white/60 border-slate-200 dark:border-white/[0.07] bg-slate-50/50 dark:bg-transparent hover:border-slate-300 dark:hover:border-white/15')}>
                <Check className={cn('w-3 h-3 flex-shrink-0', checked ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-white/20')} />{t}
              </button>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}

function CategoryWifi({ form, upd, toggleArr }: { form: FormData; upd: Function; toggleArr: Function }) {
  const speeds = ['Sangat Perlahan (<1 Mbps)', 'Perlahan (1–5 Mbps)', 'Sederhana (5–10 Mbps)', 'Masih OK (10–20 Mbps)'];
  const freqs  = ['Hampir Setiap Hari', 'Beberapa Kali/Minggu', 'Sekali/Minggu', 'Kadang-Kadang'];
  const times  = ['Pagi (6am–12pm)', 'Tengah Hari (12pm–6pm)', 'Malam (6pm–12am)', 'Lewat Malam (12am–6am)'];
  const acts   = ['Google Classroom/Teams', 'Zoom/Video Call', 'Download/Upload tugasan', 'Streaming', 'Media Sosial', 'Gaming', 'Lain-Lain'];

  return (
    <fieldset className="rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900/80 shadow-sm">
      <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-white/40 px-2">WiFi Kamsis</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Blok Asrama *</label>
          <Input value={form.wifi_blok || ''} onChange={e => upd('wifi_blok', e.target.value)} placeholder="Blok A, B, dsb." className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Bilik (Opsional)</label>
          <Input value={form.wifi_bilik || ''} onChange={e => upd('wifi_bilik', e.target.value)} placeholder="A-214" className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl" />
        </div>
      </div>
      <OptionGrid label="Tahap Kelajuan" options={speeds} value={form.wifi_speed} onSelect={v => upd('wifi_speed', v)} />
      <OptionGrid label="Kekerapan Gangguan" options={freqs} value={form.wifi_frequency} onSelect={v => upd('wifi_frequency', v)} />
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Masa Gangguan (boleh pilih lebih 1)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {times.map(t => { const c = (form.wifi_times as string[] || []).includes(t); return (<button key={t} type="button" onClick={() => toggleArr('wifi_times', t)} className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs border transition-all text-left', c ? 'text-teal-900 dark:text-white border-teal-500 bg-teal-50 dark:bg-teal-500/20 font-bold shadow-sm' : 'text-slate-700 dark:text-white/60 border-slate-200 dark:border-white/[0.07] bg-slate-50/50 dark:bg-transparent hover:border-slate-300 dark:hover:border-white/15')}><Check className={cn('w-3 h-3', c ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-white/20')} />{t}</button>); })}
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Aktiviti Terganggu (boleh pilih lebih 1)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {acts.map(a => { const c = (form.wifi_activities as string[] || []).includes(a); return (<button key={a} type="button" onClick={() => toggleArr('wifi_activities', a)} className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs border transition-all text-left', c ? 'text-teal-900 dark:text-white border-teal-500 bg-teal-50 dark:bg-teal-500/20 font-bold shadow-sm' : 'text-slate-700 dark:text-white/60 border-slate-200 dark:border-white/[0.07] bg-slate-50/50 dark:bg-transparent hover:border-slate-300 dark:hover:border-white/15')}><Check className={cn('w-3 h-3', c ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-white/20')} />{a}</button>); })}
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">Cadangan / Harapan Anda</label>
        <Textarea value={form.wifi_suggestion || ''} onChange={e => upd('wifi_suggestion', e.target.value)} placeholder="Cadangan penambahbaikan..." rows={2} className="bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl resize-none" />
      </div>
    </fieldset>
  );
}

function OptionGrid({ label, options, value, onSelect }: { label: string; options: string[]; value?: string; onSelect: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60 mb-1.5 block">{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(o => (
          <button key={o} type="button" onClick={() => onSelect(o)} className={cn('px-3 py-2.5 rounded-xl text-xs border transition-all text-left', value === o ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/20 text-teal-900 dark:text-teal-300 font-bold shadow-sm' : 'text-slate-700 dark:text-white/60 border-slate-200 dark:border-white/[0.07] bg-slate-50/50 dark:bg-transparent hover:border-slate-300 dark:hover:border-white/15')} >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 flex-shrink-0 mt-0.5">{label}</p>
      <p className={cn('text-xs font-bold text-right', highlight ? 'text-teal-600 dark:text-teal-400 font-black' : 'text-slate-800 dark:text-white/80')}>{value}</p>
    </div>
  );
}
