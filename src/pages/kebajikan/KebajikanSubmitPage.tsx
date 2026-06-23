import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HeartHandshake, ChevronRight, ChevronLeft, Building2,
  Dumbbell, Coffee, Wifi, MoreHorizontal, Check, CheckCircle2, Clock,
  TrendingUp, ListChecks, ArrowUpRight, Star, HelpCircle,
  Upload, AlertCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotificationToKebajikanExco, sendNotificationToUser, sendNotificationToKKExco } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  KEBAJIKAN_THEME_COLOR, KebajikanTicketCategory,
  KEBAJIKAN_CATEGORY_LABELS, KEBAJIKAN_CATEGORY_DESCRIPTIONS,
  KebajikanPublicStats,
} from '@/types';
import { cn } from '@/lib/utils';
import { hexToRgba } from '@/lib/utils';
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

export function KebajikanSubmitPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]             = useState<Step>('STATS');
  const [submitting, setSubmitting]   = useState(false);
  const [submittedNo, setSubmittedNo] = useState('');
  const [images, setImages]           = useState<File[]>([]);
  const [publicStats, setPublicStats] = useState<KebajikanPublicStats | null>(null);

  // Duplicate detection state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: string; ticket_no: string; title: string; status: string;
  } | null>(null);
  const [bypassDuplicate, setBypassDuplicate] = useState(false);

  const { runTour, startTour, closeTour } = useTour('KEBAJIKAN_SUBMIT', !!profile);

  const [form, setForm] = useState<FormData>({
    full_name:    profile?.full_name || '',
    gender:       '',
    matric_no:    profile?.matric_no || '',
    phone:        profile?.phone || '',
    class:        '',
    category:     null,
    title:        '',
    description:  '',
  });

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

  // Upload images
  const uploadImages = async (): Promise<string[]> => {
    if (!images.length) return [];
    
    // Import dynamically to avoid top-level await issues if any, or just import at top. 
    // Actually, I should just import it at the top of the file, but since I'm doing a block replacement, 
    // I can just import it here to be safe and avoid multiple replaces.
    const { compressImage } = await import('@/lib/imageCompression');
    
    const urls: string[] = [];
    for (const img of images) {
      const compressedImg = await compressImage(img);
      const path = `${user?.id ?? 'anon'}/${Date.now()}-${compressedImg.name}`;
      const { error } = await supabase.storage.from('kebajikan-images').upload(path, compressedImg, { contentType: compressedImg.type });
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
      case 'FASILITI_JABATAN': return `Aduan Fasiliti — ${form.jabatan === 'Lain-Lain' ? form.jabatan_custom : form.jabatan}`;
      case 'FASILITI_SUKAN':   return `Aduan Sukan — ${form.sukan === 'Lain-Lain' ? form.sukan_custom : form.sukan}`;
      case 'KAFETERIA':        return `Aduan Kafeteria ${form.kafeteria === 'Lain-Lain' ? form.kafeteria_custom : form.kafeteria}`;
      case 'WIFI_KAMSIS':      return `Aduan WiFi Blok ${form.wifi_blok || '(Tidak dinyatakan)'}`;
      default: return form.title || 'Aduan Umum';
    }
  };

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
      setStep('SUCCESS');
    } catch (err: any) {
      alert(`Gagal hantar: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />
      
      {/* Top Nav */}
      <div
        className="relative z-10 flex items-center justify-between px-6 h-16 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl"
      >
        <Link to="/portal" className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-xs font-black uppercase tracking-widest">
          <ChevronLeft className="w-3.5 h-3.5" />Portal JPP
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={startTour}
            className="w-8 h-8 rounded-full bg-white/5 text-white/40 hover:text-white/80 flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <HeartHandshake className="w-4 h-4" style={{ color: TEAL }} />
          <span className="font-black text-xs uppercase tracking-widest text-white/80">E-Kebajikan</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP: STATS HERO ───────────────────────────────────────────────── */}
        {step === 'STATS' && (
          <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto px-6 py-10">
            {/* Header */}
            <div className="text-center mb-10">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-4"
                style={{ background: hexToRgba(TEAL, 0.12), border: `2px solid ${hexToRgba(TEAL, 0.25)}` }}
              >
                <HeartHandshake className="w-8 h-8" style={{ color: TEAL }} />
              </div>
              <h1 className="text-2xl font-black text-white mb-2">Sistem Aduan Pelajar</h1>
              <p className="text-sm text-white/50">Aduan anda akan diproses oleh Exco Kebajikan JPP POLISAS</p>
            </div>

            {/* Stats Grid */}
            {publicStats && (
              <div className="relative rounded-3xl p-8 mb-8 border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-50 pointer-events-none" />
                <p className="relative z-10 text-[11px] font-black uppercase tracking-[0.3em] mb-6 text-teal-400/90 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> Prestasi Exco Kebajikan
                </p>
                <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: CheckCircle2, val: publicStats.total_resolved,    label: 'Kes Selesai', col: '#10B981' },
                    { icon: TrendingUp,   val: `${publicStats.resolution_rate ?? 0}%`, label: 'Kadar Selesai', col: TEAL },
                    { icon: Clock,        val: `~${publicStats.avg_resolution_hours ?? 0}j`, label: 'Purata Masa', col: '#F59E0B' },
                    { icon: ListChecks,   val: publicStats.total_active,     label: 'Kes Aktif', col: '#6366F1' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <s.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: s.col }} />
                      <p className="font-black text-lg text-white leading-tight">{String(s.val)}</p>
                      <p className="text-[9px] font-black uppercase tracking-wider text-white/40">{s.label}</p>
                    </div>
                  ))}
                </div>
                <Link
                  to="/kebajikan/statistik"
                  className="relative z-10 mt-6 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity w-fit mx-auto"
                  style={{ color: hexToRgba(TEAL, 0.7) }}
                >
                  Lihat statistik penuh <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            <Button
              onClick={() => setStep('CATEGORY')}
              className="relative w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl text-slate-950 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
              style={{ background: TEAL, boxShadow: `0 0 40px ${hexToRgba(TEAL, 0.4)}` }}
            >
              Buat Aduan Baru <ChevronRight className="w-5 h-5 ml-1.5" />
            </Button>
            
            <Link to="/kebajikan/aduan-saya" className="block w-full mt-3">
              <button
                className="relative w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl border border-white/20 text-white hover:bg-white/5 transition-all flex items-center justify-center outline-none"
              >
                Semak Status Aduan Saya <ArrowUpRight className="w-4 h-4 ml-1.5" />
              </button>
            </Link>

            <p className="text-center text-[10px] text-white/20 mt-4">Log masuk diperlukan untuk kemukakan aduan</p>
          </motion.div>
        )}

        {/* ── STEP: CATEGORY ─────────────────────────────────────────────────── */}
        {step === 'CATEGORY' && (
          <motion.div key="cat" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="max-w-3xl mx-auto px-6 py-10">
            <div className="mb-8">
              <button onClick={() => setStep('STATS')} className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>
              <h2 className="text-xl font-black text-white mb-1">Pilih Kategori Aduan</h2>
              <p className="text-xs text-white/40">Pilih kategori yang paling sesuai dengan aduan anda</p>
            </div>

            <div className="tour-aduan-kategori grid grid-cols-1 gap-3">
              {CATEGORIES.map(cat => {
                const isSelected = form.category === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => { upd('category', cat.key); }}
                    className={cn('relative flex items-center gap-4 p-5 rounded-2xl text-left border transition-all duration-300 group overflow-hidden',
                      isSelected ? 'border-transparent shadow-lg transform scale-[1.02]' : 'border-white/5 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
                    )}
                  >
                    {isSelected && (
                      <motion.div layoutId="active-cat-bg" className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${cat.color}, transparent)` }} />
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 border-2 rounded-2xl pointer-events-none" style={{ borderColor: cat.color }} />
                    )}
                    <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner" style={{ background: isSelected ? cat.color : cat.bg }}>
                      <cat.icon className="w-6 h-6" style={{ color: isSelected ? '#0f172a' : cat.color }} />
                    </div>
                    <div className="relative z-10 flex-1">
                      <p className="font-black text-base text-white">{KEBAJIKAN_CATEGORY_LABELS[cat.key]}</p>
                      <p className="text-xs text-white/50 mt-1 leading-relaxed">{KEBAJIKAN_CATEGORY_DESCRIPTIONS[cat.key]}</p>
                    </div>
                    {isSelected && <Check className="relative z-10 w-6 h-6 flex-shrink-0 animate-in zoom-in" style={{ color: cat.color }} />}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setStep('FORM')}
              disabled={!form.category}
              className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl mt-8 text-slate-950 disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: form.category ? TEAL : '#334155', boxShadow: form.category ? `0 0 32px ${hexToRgba(TEAL, 0.3)}` : 'none' }}
            >
              Seterusnya <ChevronRight className="w-5 h-5 ml-1.5" />
            </Button>
          </motion.div>
        )}

        {/* ── STEP: FORM ─────────────────────────────────────────────────────── */}
        {step === 'FORM' && (
          <motion.div key="form" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="max-w-3xl mx-auto px-6 py-10">
            <div className="mb-8">
              <button onClick={() => setStep('CATEGORY')} className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Kategori
              </button>
              <h2 className="text-xl font-black text-white mb-1">Maklumat Pengadu & Aduan</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Kategori:</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: hexToRgba(TEAL, 0.15), color: TEAL }}>
                  {form.category ? KEBAJIKAN_CATEGORY_LABELS[form.category] : ''}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Maklumat Pengadu */}
              <fieldset className="rounded-2xl border border-white/[0.08] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 px-2">Maklumat Pengadu</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Nama Penuh *</label>
                    <Input value={form.full_name} onChange={e => upd('full_name', e.target.value)} placeholder="Nama seperti dalam rekod" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">No. Matrik</label>
                    <Input value={form.matric_no} onChange={e => upd('matric_no', e.target.value)} placeholder="23DAD00111" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">No. Telefon</label>
                    <Input value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="010-1234567" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Kelas / Program</label>
                    <Input value={form.class} onChange={e => upd('class', e.target.value)} placeholder="DAD3A" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Jantina</label>
                  <div className="flex gap-3">
                    {['Lelaki', 'Perempuan'].map(g => (
                      <button
                        key={g} onClick={() => upd('gender', g)}
                        className={cn('flex-1 py-2.5 rounded-xl text-xs font-black border transition-all', form.gender === g ? 'text-white border-transparent' : 'text-white/40 border-white/10 hover:border-white/20 bg-white/[0.03]')}
                        style={form.gender === g ? { background: TEAL, borderColor: TEAL, color: '#0f172a' } : {}}
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
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Tajuk Aduan *</label>
                    <Input value={form.title} onChange={e => upd('title', e.target.value)} placeholder="Ringkasan aduan anda" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />
                  </div>
                </div>
              )}

              {/* Description (common) */}
              <fieldset className="rounded-2xl border border-white/[0.08] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 px-2">Penerangan Aduan</legend>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Huraikan Aduan Anda dengan Terperinci *</label>
                  <Textarea
                    value={form.description}
                    onChange={e => upd('description', e.target.value)}
                    placeholder="Terangkan masalah yang anda hadapi dengan lebih lanjut. Sertakan butiran seperti tarikh, masa, dan tempat kejadian..."
                    rows={4}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl resize-none"
                  />
                </div>

                {/* Image Upload */}
                <div className="tour-aduan-gambar">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-2 block">Gambar Sokongan (Wajib - min. 1, maks. 3) *</label>
                  {images.length === 0 && (
                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Sila muat naik sekurang-kurangnya 1 gambar/bukti aduan
                    </p>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    {images.map((img, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10 shadow-lg group">
                        <img src={URL.createObjectURL(img)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <button
                          onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                    {images.length < 3 && (
                      <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30 flex flex-col items-center justify-center cursor-pointer transition-all">
                        <Upload className="w-6 h-6 text-white/30 mb-1.5" />
                        <span className="text-[9px] font-black tracking-widest uppercase text-white/40">Tambah</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setImages(prev => [...prev, e.target.files![0]]); }} />
                      </label>
                    )}
                  </div>
                </div>
              </fieldset>
            </div>

            <Button
              onClick={() => setStep('PREVIEW')}
              disabled={!form.full_name || !form.description || images.length === 0}
              className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl mt-8 text-slate-950 disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: form.full_name && form.description && images.length > 0 ? TEAL : '#334155', boxShadow: form.full_name && form.description && images.length > 0 ? `0 0 32px ${hexToRgba(TEAL, 0.3)}` : 'none' }}
            >
              Semak Sebelum Hantar <ChevronRight className="w-5 h-5 ml-1.5" />
            </Button>
          </motion.div>
        )}

        {/* ── STEP: PREVIEW ──────────────────────────────────────────────────── */}
        {step === 'PREVIEW' && (
          <motion.div key="preview" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="max-w-3xl mx-auto px-6 py-10">
            <div className="mb-8">
              <button onClick={() => setStep('FORM')} className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Edit Aduan
              </button>
              <h2 className="text-xl font-black text-white mb-1">Semak & Hantar</h2>
              <p className="text-xs text-white/40">Sila semak maklumat sebelum menghantar aduan anda</p>
            </div>

            <div className="rounded-2xl border border-white/[0.1] p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.025)' }}>
              <Row label="Nama" value={form.full_name} />
              <Row label="No. Matrik" value={form.matric_no || '-'} />
              <Row label="Telefon" value={form.phone || '-'} />
              <Row label="Kelas" value={form.class || '-'} />
              <hr className="border-white/[0.08]" />
              <Row label="Kategori" value={form.category ? KEBAJIKAN_CATEGORY_LABELS[form.category] : '-'} highlight />
              <Row label="Tajuk Aduan" value={buildTitle()} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Penerangan</p>
                <p className="text-xs text-white/70 leading-relaxed">{form.description}</p>
              </div>
              {images.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">Gambar ({images.length})</p>
                  <div className="flex gap-2">
                    {images.map((img, i) => (
                      <img key={i} src={URL.createObjectURL(img)} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 rounded-2xl flex items-start gap-3" style={{ background: hexToRgba(TEAL, 0.06), border: `1px solid ${hexToRgba(TEAL, 0.15)}` }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: TEAL }} />
              <p className="text-xs text-white/60">Dengan menghantar aduan ini, anda bersetuju maklumat anda dikongsi dengan pihak Exco Kebajikan JPP POLISAS untuk tindakan lanjut.</p>
            </div>

            {/* ── Duplicate Warning ── */}
            {duplicateWarning && (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">Aduan Serupa Sedang Diproses</p>
                    <p className="text-xs text-white/60 leading-relaxed">
                      Anda mempunyai aduan dalam kategori yang sama yang masih dalam proses:{' '}
                      <span className="font-bold text-white/80">{duplicateWarning.ticket_no}</span> — {duplicateWarning.title}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={`/kebajikan/aduan/${duplicateWarning.id}`}
                    className="flex-1 h-9 flex items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider border border-teal-500/30 text-teal-400 hover:bg-teal-500/10 transition-colors"
                  >
                    Lihat Tiket Sedia Ada
                  </a>
                  <button
                    onClick={() => {
                      setBypassDuplicate(true);
                      setDuplicateWarning(null);
                    }}
                    className="flex-1 h-9 rounded-xl text-xs font-black uppercase tracking-wider bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                  >
                    Hantar Aduan Tetap
                  </button>
                </div>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || images.length === 0}
              className="w-full h-12 text-sm font-black uppercase tracking-widest rounded-2xl mt-5 text-slate-900 transition-all"
              style={{ background: TEAL, boxShadow: `0 0 24px ${hexToRgba(TEAL, 0.3)}` }}
            >
              {submitting ? 'Menghantar...' : 'Hantar Aduan ✓'}
            </Button>
          </motion.div>
        )}

        {/* ── STEP: SUCCESS ──────────────────────────────────────────────────── */}
        {step === 'SUCCESS' && (
          <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-lg mx-auto px-6 py-20 text-center">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: hexToRgba('#10B981', 0.15), border: `2px solid ${hexToRgba('#10B981', 0.4)}` }}
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-3">Aduan Berjaya Dikemukakan!</h2>
            <p className="text-sm text-white/50 mb-6">Aduan anda telah diterima oleh sistem. No. aduan anda ialah:</p>
            <div
              className="inline-block px-8 py-4 rounded-2xl text-2xl font-black tracking-widest mb-8"
              style={{ background: hexToRgba(TEAL, 0.12), border: `2px solid ${hexToRgba(TEAL, 0.3)}`, color: TEAL }}
            >
              {submittedNo}
            </div>
            <p className="text-xs text-white/30 mb-8">Exco Kebajikan akan menguruskan aduan anda dalam masa yang singkat. Anda akan dimaklumkan melalui notifikasi dalam portal.</p>
            <div className="flex gap-3">
              <Link to="/kebajikan/aduan-saya" className="flex-1">
                <Button className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl text-slate-900" style={{ background: TEAL }}>
                  Semak Status Aduan
                </Button>
              </Link>
              <Link to="/portal" className="flex-1">
                <Button variant="outline" className="w-full h-11 text-xs font-black uppercase tracking-widest rounded-xl border-white/15 text-white/60 hover:text-white">
                  Kembali ke Portal
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SystemTour run={runTour} onClose={closeTour} tourKey="KEBAJIKAN_SUBMIT" />
    </div>
  );
}

// ── Category sub-forms ──────────────────────────────────────────────────────

function CategoryJabatan({ form, upd }: { form: FormData; upd: Function }) {
  return (
    <fieldset className="rounded-2xl border border-white/[0.08] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 px-2">Fasiliti Jabatan</legend>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Jabatan *</label>
        <div className="grid grid-cols-2 gap-2">
          {JABATAN_LIST.map(j => (
            <button key={j} onClick={() => upd('jabatan', j)} className={cn('text-left px-3 py-2 rounded-xl text-xs border transition-all', form.jabatan === j ? 'text-white border-indigo-500/60 bg-indigo-500/10' : 'text-white/50 border-white/[0.07] hover:border-white/15')}>
              {j}
            </button>
          ))}
        </div>
        {form.jabatan === 'Lain-Lain' && <Input value={form.jabatan_custom || ''} onChange={e => upd('jabatan_custom', e.target.value)} placeholder="Nama jabatan..." className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />}
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Lokasi Spesifik</label>
        <Input value={form.lokasi || ''} onChange={e => upd('lokasi', e.target.value)} placeholder="Bilik Kuliah JKE-02, dsb." className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />
      </div>
    </fieldset>
  );
}

function CategorySukan({ form, upd }: { form: FormData; upd: Function }) {
  return (
    <fieldset className="rounded-2xl border border-white/[0.08] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 px-2">Fasiliti Sukan</legend>
      <div className="grid grid-cols-2 gap-2">
        {SUKAN_LIST.map(s => (
          <button key={s} onClick={() => upd('sukan', s)} className={cn('text-left px-3 py-2 rounded-xl text-xs border transition-all', form.sukan === s ? 'text-white border-amber-500/60 bg-amber-500/10' : 'text-white/50 border-white/[0.07] hover:border-white/15')}>
            {s}
          </button>
        ))}
      </div>
      {form.sukan === 'Lain-Lain' && <Input value={form.sukan_custom || ''} onChange={e => upd('sukan_custom', e.target.value)} placeholder="Nama fasiliti..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />}
    </fieldset>
  );
}

function CategoryKafeteria({ form, upd, toggleArr }: { form: FormData; upd: Function; toggleArr: Function }) {
  return (
    <fieldset className="rounded-2xl border border-white/[0.08] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 px-2">Kafeteria</legend>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Pilih Kafeteria *</label>
        <div className="flex gap-2 flex-wrap">
          {KAFETERIA_LIST.map(k => (
            <button key={k} onClick={() => upd('kafeteria', k)} className={cn('px-4 py-2 rounded-xl text-xs font-black border transition-all', form.kafeteria === k ? 'text-white border-red-500/60 bg-red-500/10' : 'text-white/50 border-white/[0.07] hover:border-white/15')}>
              {k}
            </button>
          ))}
        </div>
        {form.kafeteria === 'Lain-Lain' && <Input value={form.kafeteria_custom || ''} onChange={e => upd('kafeteria_custom', e.target.value)} placeholder="Nama kafeteria..." className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />}
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Jenis Aduan (boleh pilih lebih 1)</label>
        <div className="grid grid-cols-2 gap-2">
          {KAFETERIA_TYPES.map(t => {
            const checked = (form.kafeteria_types as string[] || []).includes(t);
            return (
              <button key={t} onClick={() => toggleArr('kafeteria_types', t)} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all text-left', checked ? 'text-white border-red-500/60 bg-red-500/10' : 'text-white/50 border-white/[0.07] hover:border-white/15')}>
                <Check className={cn('w-3 h-3 flex-shrink-0', checked ? 'text-red-400' : 'text-white/20')} />{t}
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
    <fieldset className="rounded-2xl border border-white/[0.08] p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <legend className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 px-2">WiFi Kamsis</legend>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Blok Asrama *</label>
          <Input value={form.wifi_blok || ''} onChange={e => upd('wifi_blok', e.target.value)} placeholder="Blok A, B, dsb." className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Bilik (Opsional)</label>
          <Input value={form.wifi_bilik || ''} onChange={e => upd('wifi_bilik', e.target.value)} placeholder="A-214" className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl" />
        </div>
      </div>
      <OptionGrid label="Tahap Kelajuan" options={speeds} value={form.wifi_speed} onSelect={v => upd('wifi_speed', v)} color={TEAL} />
      <OptionGrid label="Kekerapan Gangguan" options={freqs} value={form.wifi_frequency} onSelect={v => upd('wifi_frequency', v)} color={TEAL} />
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Masa Gangguan (boleh pilih lebih 1)</label>
        <div className="grid grid-cols-2 gap-2">
          {times.map(t => { const c = (form.wifi_times as string[] || []).includes(t); return (<button key={t} onClick={() => toggleArr('wifi_times', t)} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all text-left', c ? 'text-white border-teal-500/60 bg-teal-500/10' : 'text-white/50 border-white/[0.07]')}><Check className={cn('w-3 h-3', c ? 'text-teal-400' : 'text-white/20')} />{t}</button>); })}
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Aktiviti Terganggu (boleh pilih lebih 1)</label>
        <div className="grid grid-cols-2 gap-2">
          {acts.map(a => { const c = (form.wifi_activities as string[] || []).includes(a); return (<button key={a} onClick={() => toggleArr('wifi_activities', a)} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all text-left', c ? 'text-white border-teal-500/60 bg-teal-500/10' : 'text-white/50 border-white/[0.07]')}><Check className={cn('w-3 h-3', c ? 'text-teal-400' : 'text-white/20')} />{a}</button>); })}
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">Cadangan / Harapan Anda</label>
        <Textarea value={form.wifi_suggestion || ''} onChange={e => upd('wifi_suggestion', e.target.value)} placeholder="Cadangan penambahbaikan..." rows={2} className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl resize-none" />
      </div>
    </fieldset>
  );
}

function OptionGrid({ label, options, value, onSelect, color }: { label: string; options: string[]; value?: string; onSelect: (v: string) => void; color: string }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1.5 block">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map(o => (
          <button key={o} onClick={() => onSelect(o)} className={cn('px-3 py-2 rounded-xl text-xs border transition-all text-left', value === o ? 'text-white' : 'text-white/50 border-white/[0.07] hover:border-white/15')}
            style={value === o ? { borderColor: color, background: `rgba(45,212,191,0.1)`, color } : {}} >
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
      <p className="text-[10px] font-black uppercase tracking-wider text-white/30 flex-shrink-0 mt-0.5">{label}</p>
      <p className={cn('text-xs font-bold text-right', highlight ? 'text-teal-400 font-black' : 'text-white/70')}>{value}</p>
    </div>
  );
}
