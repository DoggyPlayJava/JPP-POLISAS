// ============================================================
// MultimediaUnitDashboard — Pusat Penerbitan Hebahan Siswa & Hab Brandkit Rasmi
// Unit Code: 'MULTIMEDIA' | Accent Color: #FB923C
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radio, Sparkles, Image, Video, Calendar, Megaphone,
  Bell, CheckCircle2, Clock, AlertTriangle, XCircle,
  Search, Filter, Download, ArrowUpRight, FileText,
  Layers, RefreshCw, Eye, Share2, ShieldCheck, Check,
  Copy, Palette, ExternalLink, MessageSquare, Send,
  Globe2, Smartphone, Terminal, Award
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const MULTIMEDIA_COLOR = '#FB923C';

// ── Types ─────────────────────────────────────────────────────────────
type SubTab = 'siaran' | 'brandkit' | 'copywriter' | 'rekod';

interface InstitutionalLogo {
  id: string;
  name: string;
  category: string;
  format: string;
  resolution: string;
  downloadUrl: string;
}

interface InstitutionalColor {
  name: string;
  hex: string;
  rgb: string;
  usage: string;
}

export function MultimediaUnitDashboard() {
  const { t } = useTranslation(['portal', 'jpp', 'common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('siaran');

  // ── Master Brandkit Assets Data ───────────────────────────────────────
  const brandkitLogos: InstitutionalLogo[] = useMemo(() => [
    {
      id: 'logo-polisas',
      name: t('portal:logo_polisas_name', 'Logo Rasmi Politeknik Sultan Haji Ahmad Shah (POLISAS)'),
      category: 'Institusi',
      format: t('portal:logo_fmt_png_svg', 'PNG Telus & SVG Vektor'),
      resolution: '4000 x 1200 px (UHD)',
      downloadUrl: '/logo.png',
    },
    {
      id: 'logo-jpp',
      name: t('portal:logo_jpp_name', 'Logo Rasmi Jawatankuasa Perwakilan Pelajar (JPP POLISAS)'),
      category: 'Jawatankuasa',
      format: t('portal:logo_fmt_png_svg', 'PNG Telus & SVG Vektor'),
      resolution: '2048 x 2048 px (HD)',
      downloadUrl: '/jpp-logo.png',
    },
    {
      id: 'logo-kpt',
      name: t('portal:logo_kpt_name', 'Logo Kementerian Pendidikan Tinggi (KPT) Malaysia'),
      category: 'Kementerian',
      format: t('portal:logo_fmt_png', 'PNG Telus'),
      resolution: '3000 x 900 px',
      downloadUrl: '#',
    },
    {
      id: 'logo-jka',
      name: t('portal:logo_jka_name', 'Jabatan Kejuruteraan Awam (JKA)'),
      category: t('portal:cat_academic_dept', 'Jabatan Akademik'),
      format: t('portal:logo_fmt_png', 'PNG Telus'),
      resolution: '1500 x 1500 px',
      downloadUrl: '#',
    },
    {
      id: 'logo-jke',
      name: t('portal:logo_jke_name', 'Jabatan Kejuruteraan Elektrik (JKE)'),
      category: t('portal:cat_academic_dept', 'Jabatan Akademik'),
      format: t('portal:logo_fmt_png', 'PNG Telus'),
      resolution: '1500 x 1500 px',
      downloadUrl: '#',
    },
    {
      id: 'logo-jkm',
      name: t('portal:logo_jkm_name', 'Jabatan Kejuruteraan Mekanikal (JKM)'),
      category: t('portal:cat_academic_dept', 'Jabatan Akademik'),
      format: t('portal:logo_fmt_png', 'PNG Telus'),
      resolution: '1500 x 1500 px',
      downloadUrl: '#',
    },
    {
      id: 'logo-jp',
      name: t('portal:logo_jp_name', 'Jabatan Perdagangan (JP)'),
      category: t('portal:cat_academic_dept', 'Jabatan Akademik'),
      format: t('portal:logo_fmt_png', 'PNG Telus'),
      resolution: '1500 x 1500 px',
      downloadUrl: '#',
    },
    {
      id: 'logo-jmsk',
      name: t('portal:logo_jmsk_name', 'Jabatan Matematik, Sains & Komputer (JMSK)'),
      category: t('portal:cat_academic_dept', 'Jabatan Akademik'),
      format: t('portal:logo_fmt_png', 'PNG Telus'),
      resolution: '1500 x 1500 px',
      downloadUrl: '#',
    },
  ], [t]);

  const brandkitColors: InstitutionalColor[] = useMemo(() => [
    { name: t('portal:color_kuning_diraja', 'Kuning Diraja POLISAS'), hex: '#F59E0B', rgb: '245, 158, 11', usage: t('portal:color_kuning_usage', 'Warna identiti utama institusi & jata rasmi') },
    { name: t('portal:color_biru_korporat', 'Biru Korporat Utama'), hex: '#1E3A8A', rgb: '30, 58, 138', usage: t('portal:color_biru_usage', 'Warna latar belakang dokumen rasmi & blazer') },
    { name: t('portal:color_emerald_gemilang', 'Emerald Gemilang'), hex: '#10B981', rgb: '16, 185, 129', usage: t('portal:color_emerald_usage', 'Aksen kejayaan, pengesahan dan kelulusan') },
    { name: t('portal:color_oren_multimedia', 'Oren Multimedia JPP'), hex: '#FB923C', rgb: '251, 146, 60', usage: t('portal:color_oren_usage', 'Warna rasmi Exco Multimedia & penyiaran') },
    { name: t('portal:color_hitam_arang', 'Hitam Arang Eksklusif'), hex: '#0F172A', rgb: '15, 23, 42', usage: t('portal:color_hitam_usage', 'Warna tipografi dokumen rasmi & kad pelajar') },
    { name: t('portal:color_putih_mutiara', 'Putih Mutiara Bersih'), hex: '#F8FAFC', rgb: '248, 250, 252', usage: t('portal:color_putih_usage', 'Warna kanvas digital dan latar belakang poster') },
  ], [t]);

  // ── Live DB Data ────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Search & Filter ─────────────────────────────────────────────────
  const [searchAnnounce, setSearchAnnounce] = useState('');
  const [announceFilter, setAnnounceFilter] = useState<'SEMUA' | 'AKTIF' | 'ARKIB'>('SEMUA');

  // ── WhatsApp Text Generator State ───────────────────────────────────
  const [cwTitle, setCwTitle] = useState(() => t('portal:mm_cw_default_title', 'Pesta Konvokesyen POLISAS Ke-25'));
  const [cwDate, setCwDate] = useState(() => t('portal:mm_cw_default_date', '24 - 26 Oktober 2026'));
  const [cwTime, setCwTime] = useState(() => t('portal:mm_cw_default_time', '8:00 Pagi - 11:00 Malam'));
  const [cwLocation, setCwLocation] = useState(() => t('portal:mm_cw_default_loc', 'Dewan Jubli Perak & Dataran Gemilang POLISAS'));
  const [cwOrganizer, setCwOrganizer] = useState(() => t('portal:mm_cw_default_org', 'JPP POLISAS & Unit Hal Ehwal Pelajar (HEP)'));
  const [cwLink, setCwLink] = useState('https://jpppolisas.my/portal/events');
  const [copiedCw, setCopiedCw] = useState(false);

  // Load live data safely with Promise.all
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [annRes, actsRes, repRes] = await Promise.all([
        supabase
          .from('system_announcements')
          .select('id, title, content, is_active, created_at, image_url, target, priority')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('club_activities')
          .select('id, title, status, start_date, location, priority')
          .eq('exco_unit', 'MULTIMEDIA')
          .eq('is_archived', false)
          .order('start_date', { ascending: false })
          .limit(20),
        supabase
          .from('club_reports')
          .select('id, file_name, status, created_at, is_archived')
          .eq('exco_unit', 'MULTIMEDIA')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      setAnnouncements(annRes.data || []);
      setActivities(actsRes.data || []);
      setReports(repRes.data || []);
    } catch (err) {
      console.error('Failed to load multimedia hub data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      const matchSearch =
        ann.title?.toLowerCase().includes(searchAnnounce.toLowerCase()) ||
        ann.content?.toLowerCase().includes(searchAnnounce.toLowerCase());

      if (!matchSearch) return false;
      if (announceFilter === 'AKTIF') return ann.is_active;
      if (announceFilter === 'ARKIB') return !ann.is_active;
      return true;
    });
  }, [announcements, searchAnnounce, announceFilter]);

  // WhatsApp text template engine
  const generatedWhatsAppText = useMemo(() => {
    return t('portal:mm_whatsapp_template', `📢 *HEBAHAN RASMI JPP POLISAS*\n\n` +
      `🔥 *${cwTitle.toUpperCase()}*\n\n` +
      `📅 *Tarikh:* ${cwDate}\n` +
      `⏰ *Masa:* ${cwTime}\n` +
      `📍 *Tempat:* ${cwLocation}\n` +
      `🏛️ *Anjuran:* ${cwOrganizer}\n\n` +
      `Perhatian kepada semua mahasiswa POLISAS! Anda dijemput hadir memberi sokongan dan memeriahkan program ini.\n\n` +
      `🔗 *Pautan Pendaftaran / Maklumat Lanjut:*\n${cwLink}\n\n` +
      `_Diterbitkan oleh Exco Multimedia, Informasi & Penyiaran JPP POLISAS_`,
      {
        title: cwTitle.toUpperCase(),
        date: cwDate,
        time: cwTime,
        location: cwLocation,
        organizer: cwOrganizer,
        link: cwLink,
      }
    );
  }, [cwTitle, cwDate, cwTime, cwLocation, cwOrganizer, cwLink, t]);

  const copyWhatsApp = () => {
    navigator.clipboard.writeText(generatedWhatsAppText);
    setCopiedCw(true);
    toast.success(t('jpp:mm_copy_text_success', 'Teks siaran WhatsApp berjaya disalin!'));
    setTimeout(() => setCopiedCw(false), 2500);
  };

  const copyHex = (hex: string, name: string) => {
    navigator.clipboard.writeText(hex);
    toast.success(t('jpp:mm_color_copied_toast', 'Kod warna {{name}} ({{hex}}) disalin!', { name, hex }));
  };

  // Stats calculation
  const stats = useMemo(() => {
    const activeCount = announcements.filter((a) => a.is_active).length;
    return {
      activeAnnouncements: activeCount,
      totalAnnouncements: announcements.length,
      brandkitAssets: brandkitLogos.length,
      activitiesCount: activities.length,
      reportsCount: reports.length,
    };
  }, [announcements, activities, reports, brandkitLogos]);

  return (
    <div className="space-y-6">
      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kad 1: Hebahan Aktif di Portal */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:mm_card_active_announcements', 'Hebahan Aktif')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.activeAnnouncements}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {t('jpp:mm_card_active_desc', 'Siaran langsung ke Portal Siswa')}
          </p>
        </div>

        {/* Kad 2: Aset Brandkit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:mm_card_brandkit_assets', 'Aset Brandkit')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Palette className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.brandkitAssets}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {t('jpp:mm_card_brandkit_desc', 'Logo rasmi institusi sedia muat turun')}
          </p>
        </div>

        {/* Kad 3: Saluran WhatsApp Blast */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:mm_card_quick_broadcast', 'Format Siaran Pantas')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {t('jpp:mm_card_one_click', '1-Klik')}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {t('jpp:mm_card_quick_desc', 'Penjana teks kumpulan WhatsApp rasmi')}
          </p>
        </div>

        {/* Kad 4: Aktiviti Berdaftar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:mm_card_unit_activities', 'Aktiviti Unit')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.activitiesCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {t('jpp:mm_card_reports_desc', '{{count}} fail laporan berdaftar', { count: stats.reportsCount })}
          </p>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.06] pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'siaran', label: t('jpp:mm_tab_portal_broadcast', 'Pusat Siaran & Hebahan Portal'), icon: Megaphone },
          { key: 'brandkit', label: t('jpp:mm_tab_brandkit', 'Hab Brandkit & Aset Rasmi'), icon: Palette },
          { key: 'copywriter', label: t('jpp:mm_tab_copywriter', 'Penjana Teks WhatsApp / Telegram'), icon: MessageSquare },
          { key: 'rekod', label: t('jpp:mm_tab_records', 'Aktiviti & Laporan Exco'), icon: FileText },
        ].map((tab) => {
          const isActive = subTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key as SubTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap active:scale-[0.98]',
                isActive
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── SUBTAB 1: Pusat Siaran & Hebahan Portal ── */}
      {subTab === 'siaran' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchAnnounce}
                onChange={(e) => setSearchAnnounce(e.target.value)}
                placeholder={t('jpp:mm_search_placeholder', 'Cari tajuk hebahan atau kandungan...')}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {(['SEMUA', 'AKTIF', 'ARKIB'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setAnnounceFilter(st)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                      announceFilter === st
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                    )}
                  >
                    {st === 'SEMUA' ? t('jpp:mm_filter_all', 'SEMUA') : st === 'AKTIF' ? t('jpp:mm_filter_active', 'AKTIF') : t('jpp:mm_filter_archive', 'ARKIB')}
                  </button>
                ))}
              </div>

              <button
                onClick={() => navigate('/jpp/announcements')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white transition-colors shrink-0 shadow-xs"
              >
                <span>{t('jpp:mm_manage_all_announcements', 'Urus Penuh Hebahan')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of System Announcements */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:mm_announcements_list_title', 'Senarai Hebahan & Poster Siswa')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:mm_announcements_list_desc', 'Diselaraskan terus daripada pangkalan data system_announcements JPP POLISAS.')}
                </p>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-slate-400">
                {t('jpp:mm_loading_announcements', 'Memuatkan senarai hebahan terkini...')}
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
                {t('jpp:mm_no_announcements', 'Tiada rekod hebahan dijumpai.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filteredAnnouncements.map((ann) => (
                  <div key={ann.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">{ann.title}</h4>
                          {ann.is_active ? (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {t('jpp:mm_live_on_portal', 'Live di Portal')}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                              {t('jpp:mm_archive_badge', 'Arkib')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-white/60 mt-1 line-clamp-2 leading-relaxed">
                          {ann.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-white/40 mt-2">
                          <span className="font-mono tabular-nums">
                            {ann.created_at ? format(parseISO(ann.created_at), 'dd MMM yyyy, hh:mm a', { locale: ms }) : '—'}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-slate-700 dark:text-white/70">
                            {t('jpp:mm_target_label', 'Sasaran: {{target}}', { target: ann.target || t('jpp:mm_target_all_students', 'Semua Mahasiswa') })}
                          </span>
                          {ann.priority && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                {t('jpp:mm_priority_label', 'Keutamaan: {{priority}}', { priority: ann.priority })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/[0.04]">
                      {ann.image_url && (
                        <a
                          href={ann.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-white/70 hover:bg-slate-200 transition-colors"
                        >
                          <Image className="w-3.5 h-3.5" />
                          <span>{t('jpp:mm_poster_btn', 'Poster')}</span>
                        </a>
                      )}
                      <button
                        onClick={() => navigate('/jpp/announcements')}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-orange-500/10 text-slate-600 dark:text-white/70 hover:text-orange-500 transition-colors"
                        title={t('jpp:mm_edit_announcement_tooltip', 'Sunting Hebahan')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUBTAB 2: Hab Brandkit & Aset Rasmi ── */}
      {subTab === 'brandkit' && (
        <div className="space-y-6">
          {/* Logo Rasmi Institusi */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:mm_logos_pack_title', 'Pek Logo Rasmi Institusi (Format Telus HD)')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:mm_logos_pack_desc', 'Gunakan aset vektor dan PNG resolusi tinggi ini untuk memastikan kualiti poster kelab mematuhi piawaian.')}
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                Piawaian Identiti
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {brandkitLogos.map((logo) => (
                <div
                  key={logo.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200/60 dark:bg-white/[0.04] flex items-center justify-center p-1.5 shrink-0 border border-slate-300/50 dark:border-white/[0.08]">
                      <img src="/logo.png" alt="POLISAS" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                        {logo.category}
                      </span>
                      <h4 className="font-black text-xs text-slate-900 dark:text-white leading-tight">{logo.name}</h4>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-white/40 mt-0.5">
                        {logo.format} · {logo.resolution}
                      </p>
                    </div>
                  </div>

                  <a
                    href={logo.downloadUrl}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0 shadow-xs hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('jpp:mm_download_asset_btn', 'Muat Turun')}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Palet Warna Rasmi Institusi */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">
              {t('jpp:mm_palette_title', 'Palet Kod Warna Rasmi JPP & Institusi')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mb-4">
              {t('jpp:mm_palette_desc', 'Klik pada mana-mana swatch warna untuk menyalin kod HEX ke papan klip komputer anda.')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {brandkitColors.map((col) => (
                <button
                  key={col.hex}
                  onClick={() => copyHex(col.hex, col.name)}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between text-left group hover:border-slate-300 dark:hover:border-white/10 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl shadow-xs shrink-0 border border-black/10 dark:border-white/20"
                      style={{ background: col.hex }}
                    />
                    <div>
                      <p className="font-black text-xs text-slate-900 dark:text-white">{col.name}</p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-white/40 mt-0.5">{col.hex}</p>
                      <p className="text-[10px] text-slate-400 dark:text-white/30 truncate max-w-[170px] mt-0.5">{col.usage}</p>
                    </div>
                  </div>
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 3: Penjana Teks WhatsApp / Telegram ── */}
      {subTab === 'copywriter' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Input */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:mm_program_form_title', 'Borang Butiran Program')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:mm_program_form_desc', 'Masukkan butiran untuk menjana format siaran kumpulan WhatsApp secara automatik.')}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1 block">
                    {t('jpp:mm_field_program_name', 'Nama Program / Hebahan')}
                  </label>
                  <input
                    type="text"
                    value={cwTitle}
                    onChange={(e) => setCwTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1 block">
                      {t('jpp:mm_field_date', 'Tarikh Pelaksanaan')}
                    </label>
                    <input
                      type="text"
                      value={cwDate}
                      onChange={(e) => setCwDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-medium text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1 block">
                      {t('jpp:mm_field_time', 'Waktu Program')}
                    </label>
                    <input
                      type="text"
                      value={cwTime}
                      onChange={(e) => setCwTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1 block">
                    {t('jpp:mm_field_location', 'Lokasi / Tempat')}
                  </label>
                  <input
                    type="text"
                    value={cwLocation}
                    onChange={(e) => setCwLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1 block">
                    {t('jpp:mm_field_organizer', 'Pihak Penganjur')}
                  </label>
                  <input
                    type="text"
                    value={cwOrganizer}
                    onChange={(e) => setCwOrganizer(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1 block">
                    {t('jpp:mm_field_link', 'Pautan Pendaftaran / Portal')}
                  </label>
                  <input
                    type="text"
                    value={cwLink}
                    onChange={(e) => setCwLink(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Live WhatsApp Preview */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      {t('jpp:mm_preview_whatsapp_title', 'Pratonton Teks WhatsApp')}
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {t('jpp:mm_ready_for_broadcast', 'Sedia Untuk Sebaran')}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-black/30 border border-slate-200 dark:border-white/[0.06] text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed max-h-[360px] overflow-y-auto">
                  {generatedWhatsAppText}
                </div>
              </div>

              <button
                onClick={copyWhatsApp}
                className="mt-4 w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-[0.98] transition-all"
              >
                {copiedCw ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCw ? t('jpp:mm_text_copied', 'Teks Berjaya Disalin!') : t('jpp:mm_copy_text_btn', 'Salin Teks Ke Papan Klip')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 4: Aktiviti & Laporan Exco (Live DB) ── */}
      {subTab === 'rekod' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:mm_records_title', 'Rekod Pentadbiran Exco Multimedia')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:mm_records_desc', 'Diselaraskan terus daripada pangkalan data pusat JPP.')}
                </p>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-white/70 hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                {t('jpp:mm_reload_records', 'Segar Semula')}
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-slate-400">
                {t('jpp:mm_loading_records', 'Memuatkan data aktiviti & laporan...')}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-3">
                    {t('jpp:mm_registered_activities', 'Aktiviti Berdaftar ({{count}})', { count: activities.length })}
                  </h4>
                  {activities.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
                      {t('jpp:mm_no_activities', 'Tiada aktiviti didaftarkan untuk unit Multimedia pada masa ini.')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="font-black text-xs text-slate-900 dark:text-white">{act.title}</p>
                            <p className="text-[11px] font-mono text-slate-500 dark:text-white/40 mt-0.5">
                              {act.start_date || t('jpp:mm_date_unset', 'Tarikh belum ditetapkan')} · {act.location || t('jpp:mm_location_unset', 'Lokasi belum ditetapkan')}
                            </p>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-200 dark:bg-white/[0.06] text-slate-700 dark:text-white/70">
                            {act.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-3">
                    {t('jpp:mm_official_reports', 'Laporan Rasmi ({{count}})', { count: reports.length })}
                  </h4>
                  {reports.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
                      {t('jpp:mm_no_reports', 'Tiada fail laporan dimuat naik untuk unit Multimedia setakat ini.')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reports.map((rep) => (
                        <div
                          key={rep.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                            <div>
                              <p className="font-black text-xs text-slate-900 dark:text-white">{rep.file_name}</p>
                              <p className="text-[11px] font-mono text-slate-500 dark:text-white/40 mt-0.5">
                                {rep.created_at ? t('jpp:mm_uploaded_on', 'Dimuat naik pada {{date}}', { date: format(parseISO(rep.created_at), 'dd MMM yyyy', { locale: ms }) }) : '—'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {rep.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
