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

const MULTIMEDIA_COLOR = '#FB923C';

// ── Types ─────────────────────────────────────────────────────────────
type SubTab = 'siaran' | 'brandkit' | 'copywriter' | 'rekod';

interface InstitutionalLogo {
  id: string;
  name: string;
  category: 'Institusi' | 'Jawatankuasa' | 'Kementerian' | 'Jabatan Akademik';
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

// ── Master Brandkit Assets Data ───────────────────────────────────────
const BRANDKIT_LOGOS: InstitutionalLogo[] = [
  {
    id: 'logo-polisas',
    name: 'Logo Rasmi Politeknik Sultan Haji Ahmad Shah (POLISAS)',
    category: 'Institusi',
    format: 'PNG Telus & SVG Vektor',
    resolution: '4000 x 1200 px (UHD)',
    downloadUrl: '/polisas-logo.png',
  },
  {
    id: 'logo-jpp',
    name: 'Logo Rasmi Jawatankuasa Perwakilan Pelajar (JPP POLISAS)',
    category: 'Jawatankuasa',
    format: 'PNG Telus & SVG Vektor',
    resolution: '2048 x 2048 px (HD)',
    downloadUrl: '/jpp-logo.png',
  },
  {
    id: 'logo-kpt',
    name: 'Logo Kementerian Pendidikan Tinggi (KPT) Malaysia',
    category: 'Kementerian',
    format: 'PNG Telus',
    resolution: '3000 x 900 px',
    downloadUrl: '#',
  },
  {
    id: 'logo-jka',
    name: 'Jabatan Kejuruteraan Awam (JKA)',
    category: 'Jabatan Akademik',
    format: 'PNG Telus',
    resolution: '1500 x 1500 px',
    downloadUrl: '#',
  },
  {
    id: 'logo-jke',
    name: 'Jabatan Kejuruteraan Elektrik (JKE)',
    category: 'Jabatan Akademik',
    format: 'PNG Telus',
    resolution: '1500 x 1500 px',
    downloadUrl: '#',
  },
  {
    id: 'logo-jkm',
    name: 'Jabatan Kejuruteraan Mekanikal (JKM)',
    category: 'Jabatan Akademik',
    format: 'PNG Telus',
    resolution: '1500 x 1500 px',
    downloadUrl: '#',
  },
  {
    id: 'logo-jp',
    name: 'Jabatan Perdagangan (JP)',
    category: 'Jabatan Akademik',
    format: 'PNG Telus',
    resolution: '1500 x 1500 px',
    downloadUrl: '#',
  },
  {
    id: 'logo-jtmk',
    name: 'Jabatan Teknologi Maklumat & Komunikasi (JTMK)',
    category: 'Jabatan Akademik',
    format: 'PNG Telus',
    resolution: '1500 x 1500 px',
    downloadUrl: '#',
  },
];

const BRANDKIT_COLORS: InstitutionalColor[] = [
  { name: 'POLISAS Forest Navy', hex: '#1E293B', rgb: 'rgb(30, 41, 59)', usage: 'Warna identiti utama dokumen rasmi' },
  { name: 'JPP Crimson Red (KPP)', hex: '#F87171', rgb: 'rgb(248, 113, 113)', usage: 'Unit Kelab, Persatuan & Hebahan Am' },
  { name: 'Keusahawanan Emerald', hex: '#4ADE80', rgb: 'rgb(74, 222, 128)', usage: 'PolyMart, Siswapreneur & Perniagaan' },
  { name: 'Kebajikan Cyan/Teal', hex: '#2DD4BF', rgb: 'rgb(45, 212, 191)', usage: 'E-Bantu, FoodBank & Bantuan Mahasiswa' },
  { name: 'Sukan & Rekreasi Amber', hex: '#F59E0B', rgb: 'rgb(245, 158, 11)', usage: 'SUPSAS, Sukan Kampus & Kejohanan' },
  { name: 'Akademik Lavender', hex: '#818CF8', rgb: 'rgb(129, 140, 248)', usage: 'MAKMP, Takwim Kuliah & Inovasi' },
  { name: 'Multimedia Tangerine', hex: '#FB923C', rgb: 'rgb(251, 146, 60)', usage: 'Siaran Media, Hebahan & Buletin Digital' },
];

export function MultimediaUnitDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('siaran');

  // ── Live DB data ────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Copywriter Form State ───────────────────────────────────────────
  const [cwTitle, setCwTitle] = useState('KEJOHANAN SUKAN ANTARA JABATAN (SUPSAS 2026)');
  const [cwDate, setCwDate] = useState('25 - 28 Oktober 2026');
  const [cwTime, setCwTime] = useState('08:00 Pagi - 05:00 Petang');
  const [cwLocation, setCwLocation] = useState('Kompleks Sukan & Padang Utama POLISAS');
  const [cwOrganizer, setCwOrganizer] = useState('Majlis Sukan JPP bersama Exco SRK');
  const [cwLink, setCwLink] = useState('https://jpp-polisas.edu.my/supsas');
  const [copiedCw, setCopiedCw] = useState(false);

  // ── Search & Filter ─────────────────────────────────────────────────
  const [searchAnnounce, setSearchAnnounce] = useState('');
  const [announceFilter, setAnnounceFilter] = useState<'SEMUA' | 'AKTIF' | 'ARKIB'>('SEMUA');

  // Load live data safely with Promise.all
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [annRes, actsRes, repRes] = await Promise.all([
        supabase
          .from('system_announcements')
          .select('id, title, content_body, priority, target_audience, is_active, created_at, image_url, action_url')
          .order('created_at', { ascending: false })
          .limit(25),
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
      const matchFilter =
        announceFilter === 'SEMUA' ||
        (announceFilter === 'AKTIF' && ann.is_active) ||
        (announceFilter === 'ARKIB' && !ann.is_active);
      const matchSearch =
        ann.title?.toLowerCase().includes(searchAnnounce.toLowerCase()) ||
        ann.content_body?.toLowerCase().includes(searchAnnounce.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [announcements, announceFilter, searchAnnounce]);

  // Generated WhatsApp text
  const generatedWhatsAppText = useMemo(() => {
    return `📢 *HEBAHAN RASMI JPP POLISAS*\n\n` +
      `🔥 *${cwTitle.toUpperCase()}*\n\n` +
      `📅 *Tarikh:* ${cwDate}\n` +
      `⏰ *Masa:* ${cwTime}\n` +
      `📍 *Tempat:* ${cwLocation}\n` +
      `🏛️ *Anjuran:* ${cwOrganizer}\n\n` +
      `Perhatian kepada semua mahasiswa POLISAS! Anda dijemput hadir memberi sokongan dan memeriahkan program ini.\n\n` +
      `🔗 *Pautan Pendaftaran / Maklumat Lanjut:*\n${cwLink}\n\n` +
      `_Diterbitkan oleh Exco Multimedia, Informasi & Penyiaran JPP POLISAS_`;
  }, [cwTitle, cwDate, cwTime, cwLocation, cwOrganizer, cwLink]);

  const copyWhatsApp = () => {
    navigator.clipboard.writeText(generatedWhatsAppText);
    setCopiedCw(true);
    toast.success('Teks siaran WhatsApp berjaya disalin!');
    setTimeout(() => setCopiedCw(false), 2500);
  };

  const copyHex = (hex: string, name: string) => {
    navigator.clipboard.writeText(hex);
    toast.success(`Kod warna ${name} (${hex}) disalin!`);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const activeCount = announcements.filter((a) => a.is_active).length;
    return {
      activeAnnouncements: activeCount,
      totalAnnouncements: announcements.length,
      brandkitAssets: BRANDKIT_LOGOS.length,
      activitiesCount: activities.length,
      reportsCount: reports.length,
    };
  }, [announcements, activities, reports]);

  return (
    <div className="space-y-6">
      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kad 1: Hebahan Aktif di Portal */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Hebahan Aktif</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.activeAnnouncements}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            Siaran langsung ke Portal Siswa
          </p>
        </div>

        {/* Kad 2: Aset Brandkit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Aset Brandkit</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Palette className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.brandkitAssets}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            Logo rasmi institusi sedia muat turun
          </p>
        </div>

        {/* Kad 3: Saluran WhatsApp Blast */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Format Siaran Pantas</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            1-Klik
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            Penjana teks kumpulan WhatsApp rasmi
          </p>
        </div>

        {/* Kad 4: Aktiviti Berdaftar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Aktiviti Unit</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.activitiesCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {stats.reportsCount} fail laporan berdaftar
          </p>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.06] pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'siaran', label: 'Pusat Siaran & Hebahan Portal', icon: Megaphone },
          { key: 'brandkit', label: 'Hab Brandkit & Aset Rasmi', icon: Palette },
          { key: 'copywriter', label: 'Penjana Teks WhatsApp / Telegram', icon: MessageSquare },
          { key: 'rekod', label: 'Aktiviti & Laporan Exco', icon: FileText },
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
                placeholder="Cari tajuk hebahan atau kandungan..."
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
                    {st}
                  </button>
                ))}
              </div>

              <button
                onClick={() => navigate('/jpp/announcements')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white transition-colors shrink-0 shadow-xs"
              >
                <span>Urus Penuh Hebahan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of System Announcements */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Senarai Hebahan & Poster Siswa</h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  Diselaraskan terus daripada pangkalan data system_announcements JPP POLISAS.
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
                Memuatkan senarai hebahan terkini...
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
                Tiada rekod hebahan dijumpai.
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
                              <CheckCircle2 className="w-3 h-3" /> Live di Portal
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                              Arkib
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-white/60 mt-1 line-clamp-2 leading-relaxed">
                          {ann.content_body}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-white/40 mt-2">
                          <span className="font-mono tabular-nums">
                            {ann.created_at ? format(parseISO(ann.created_at), 'dd MMM yyyy, hh:mm a', { locale: ms }) : '—'}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-slate-700 dark:text-white/70">
                            Sasaran: {ann.target_audience || 'Semua Mahasiswa'}
                          </span>
                          {ann.priority && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                Keutamaan: {ann.priority}
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
                          <span>Poster</span>
                        </a>
                      )}
                      <button
                        onClick={() => navigate('/jpp/announcements')}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-orange-500/10 text-slate-600 dark:text-white/70 hover:text-orange-500 transition-colors"
                        title="Sunting Hebahan"
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
                <h3 className="font-black text-base text-slate-900 dark:text-white">Pek Logo Rasmi Institusi (Format Telus HD)</h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  Gunakan aset vektor dan PNG resolusi tinggi ini untuk memastikan kualiti poster kelab mematuhi piawaian.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                Piawaian Identiti
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {BRANDKIT_LOGOS.map((logo) => (
                <div
                  key={logo.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200/60 dark:bg-white/[0.04] flex items-center justify-center p-1.5 shrink-0 border border-slate-300/50 dark:border-white/[0.08]">
                      <img src={logo.downloadUrl !== "#" ? logo.downloadUrl : "/polisas-logo.png"} alt={logo.name} className="w-full h-full object-contain" />
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

                  {logo.downloadUrl !== '#' ? (
                    <a
                      href={logo.downloadUrl}
                      download
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0 shadow-xs hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Muat Turun</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-white/30 shrink-0 cursor-not-allowed">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Akan Datang</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Palet Warna Rasmi Institusi */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-1">Palet Kod Warna Rasmi JPP & Institusi</h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mb-4">
              Klik pada mana-mana swatch warna untuk menyalin kod HEX ke papan klip komputer anda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BRANDKIT_COLORS.map((col) => (
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
                <h3 className="font-black text-base text-slate-900 dark:text-white">Borang Butiran Program</h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  Masukkan butiran untuk menjana format siaran kumpulan WhatsApp secara automatik.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1 block">
                    Nama Program / Hebahan
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
                      Tarikh Pelaksanaan
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
                      Waktu Program
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
                    Lokasi / Tempat
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
                    Pihak Penganjur
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
                    Pautan Pendaftaran / Portal
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
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">Pratonton Teks WhatsApp</h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Sedia Untuk Sebaran
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
                <span>{copiedCw ? 'Teks Berjaya Disalin!' : 'Salin Teks Ke Papan Klip'}</span>
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
                <h3 className="font-black text-base text-slate-900 dark:text-white">Rekod Pentadbiran Exco Multimedia</h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Diselaraskan terus daripada pangkalan data pusat JPP.</p>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-white/70 hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                Segar Semula
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-slate-400">
                Memuatkan data aktiviti & laporan...
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-3">
                    Aktiviti Berdaftar ({activities.length})
                  </h4>
                  {activities.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
                      Tiada aktiviti didaftarkan untuk unit Multimedia pada masa ini.
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
                              {act.start_date || 'Tarikh belum ditetapkan'} · {act.location || 'Lokasi belum ditetapkan'}
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
                    Laporan Rasmi ({reports.length})
                  </h4>
                  {reports.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
                      Tiada fail laporan dimuat naik untuk unit Multimedia setakat ini.
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
                                Dimuat naik pada {rep.created_at ? format(parseISO(rep.created_at), 'dd MMM yyyy', { locale: ms }) : '—'}
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
