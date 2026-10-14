// ============================================================
// MultimediaUnitDashboard — Dashboard Rasmi Exco Multimedia, Informasi & PA
// Unit Code: 'MULTIMEDIA' | Accent Color: #FB923C
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Radio, Sparkles, Image, Video, Calendar, Mic,
  Volume2, Camera, CheckCircle2, Clock, AlertTriangle,
  XCircle, Search, Filter, Download, ArrowUpRight,
  FileText, Layers, RefreshCw, Eye, Share2, ShieldCheck,
  Check, Play, Monitor, Music
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';

const MULTIMEDIA_COLOR = '#FB923C';

// ── Types ─────────────────────────────────────────────────────────────
type SubTab = 'media' | 'takwim' | 'inventori' | 'rekod';

interface MediaAsset {
  id: string;
  title: string;
  category: 'Poster Rasmi' | 'Infografik' | 'Banner Web' | 'Video/Reels';
  dimensions: string;
  designer: string;
  date: string;
  status: 'DITERBITKAN' | 'SEMAKAN' | 'DRAF';
  previewColor: string;
  downloads: number;
}

interface EquipmentItem {
  id: string;
  name: string;
  category: 'Audio / PA' | 'Kamera & Video' | 'Paparan / Visual' | 'Aksesori & Kabel';
  serialNo: string;
  status: 'SIAP_SIAGA' | 'SEDANG_DIPINJAM' | 'SERVIS';
  borrower?: string;
  returnDate?: string;
  location: string;
}

interface MediaEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  leadPerson: string;
  coverageType: 'Foto & Video' | 'Live Streaming' | 'Siaraya PA Sahaja' | 'Pakej Penuh';
  status: 'DISAHKAN' | 'PERANCANGAN' | 'SELESAI';
}

// ── Seed Data for UI Wiring ───────────────────────────────────────────
const INITIAL_ASSETS: MediaAsset[] = [
  {
    id: 'med-01',
    title: 'Poster Rasmi Kemasukan Mahasiswa Baharu Sesi I 2026/2027',
    category: 'Poster Rasmi',
    dimensions: '1080 x 1350 (IG Portrait)',
    designer: 'Ahmad Daniel (Biro Grafik)',
    date: '2026-10-12',
    status: 'DITERBITKAN',
    previewColor: '#FB923C',
    downloads: 142,
  },
  {
    id: 'med-02',
    title: 'Infografik Penebusan Makanan FoodBank & Kupon Kafeteria',
    category: 'Infografik',
    dimensions: '1080 x 1080 (Square)',
    designer: 'Nurul Hani (Biro Infografik)',
    date: '2026-10-10',
    status: 'DITERBITKAN',
    previewColor: '#2DD4BF',
    downloads: 89,
  },
  {
    id: 'med-03',
    title: 'Banner Promosi Kejohanan Sukan SUPSAS 2026',
    category: 'Banner Web',
    dimensions: '1920 x 600 (Web Header)',
    designer: 'Muhammad Faizal (Biro Multimedia)',
    date: '2026-10-08',
    status: 'SEMAKAN',
    previewColor: '#F59E0B',
    downloads: 24,
  },
  {
    id: 'med-04',
    title: 'Video Teaser Malam Aspirasi Bakat POLISAS',
    category: 'Video/Reels',
    dimensions: '1080 x 1920 (9:16 Video)',
    designer: 'Zulhelmi (Biro Video)',
    date: '2026-10-05',
    status: 'DRAF',
    previewColor: '#818CF8',
    downloads: 5,
  },
  {
    id: 'med-05',
    title: 'Poster Hebahan Aduan Kerosakan Kolej Kediaman',
    category: 'Poster Rasmi',
    dimensions: '1080 x 1350 (IG Portrait)',
    designer: 'Ahmad Daniel (Biro Grafik)',
    date: '2026-10-01',
    status: 'DITERBITKAN',
    previewColor: '#E879F9',
    downloads: 67,
  },
];

const INITIAL_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'eq-01',
    name: 'Sennheiser EW-D Wireless Vocal Set (Mikrofon Tanpa Wayar)',
    category: 'Audio / PA',
    serialNo: 'SN-SENN-8821',
    status: 'SIAP_SIAGA',
    location: 'Bilik Kawalan Media JPPHQ (Rak A1)',
  },
  {
    id: 'eq-02',
    name: 'Yamaha MG16XU 16-Channel Mixing Console',
    category: 'Audio / PA',
    serialNo: 'SN-YAM-4412',
    status: 'SEDANG_DIPINJAM',
    borrower: 'Kelab Kebudayaan (Dewan Sri Mahkota)',
    returnDate: '15 Okt 2026',
    location: 'Dewan Sri Mahkota',
  },
  {
    id: 'eq-03',
    name: 'Sony FX3 Cinema Line Full-Frame Camera + 24-70mm GM II',
    category: 'Kamera & Video',
    serialNo: 'SN-SNY-9902',
    status: 'SIAP_SIAGA',
    location: 'Dry Box Bilik Media JPPHQ',
  },
  {
    id: 'eq-04',
    name: 'DJI Mic 2 Dual-Channel Wireless Microphone Transmitter',
    category: 'Audio / PA',
    serialNo: 'SN-DJI-5120',
    status: 'SIAP_SIAGA',
    location: 'Pouch Media 02',
  },
  {
    id: 'eq-05',
    name: 'Epson EB-2250U 5,000 Lumens Full HD Projector',
    category: 'Paparan / Visual',
    serialNo: 'SN-EPS-3190',
    status: 'SERVIS',
    location: 'Pusat Servis IT POLISAS',
  },
  {
    id: 'eq-06',
    name: 'Set Kabel Audio XLR Neutrik 15 Meter (10 Unit Bundled)',
    category: 'Aksesori & Kabel',
    serialNo: 'SN-XLR-SET01',
    status: 'SIAP_SIAGA',
    location: 'Kotak Kabel 01',
  },
];

const INITIAL_EVENTS: MediaEvent[] = [
  {
    id: 'evt-01',
    title: 'Majlis Amanat Pengarah & Perhimpunan Perdana Siswa',
    date: '2026-10-18',
    time: '08:30 PAGI',
    location: 'Dewan Jubli Perak',
    leadPerson: 'Hafizuddin (Ketua Kru Media)',
    coverageType: 'Pakej Penuh',
    status: 'DISAHKAN',
  },
  {
    id: 'evt-02',
    title: 'Perlawanan Akhir Futsal Piala YDP JPP',
    date: '2026-10-22',
    time: '03:00 PETANG',
    location: 'Kompleks Sukan POLISAS',
    leadPerson: 'Muhammad Faizal',
    coverageType: 'Foto & Video',
    status: 'DISAHKAN',
  },
  {
    id: 'evt-03',
    title: 'Townhall Bersama Exco Kediaman Luar Kampus',
    date: '2026-10-27',
    time: '08:00 MALAM',
    location: 'Bilik Seminar Al-Jazari',
    leadPerson: 'Zulhelmi',
    coverageType: 'Live Streaming',
    status: 'PERANCANGAN',
  },
];

export function MultimediaUnitDashboard() {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('media');

  // ── Live DB data for Activities & Reports ───────────────────────────
  const [activities, setActivities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // ── Client State for UI Modules ─────────────────────────────────────
  const [assets, setAssets] = useState<MediaAsset[]>(INITIAL_ASSETS);
  const [equipment, setEquipment] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);
  const [events, setEvents] = useState<MediaEvent[]>(INITIAL_EVENTS);

  // Filter states
  const [mediaFilter, setMediaFilter] = useState<'SEMUA' | 'DITERBITKAN' | 'SEMAKAN' | 'DRAF'>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentCategory, setEquipmentCategory] = useState<string>('SEMUA');

  // Load live DB data safely with Promise.all
  const loadDbData = useCallback(async () => {
    setLoadingDb(true);
    try {
      const [actsRes, reportsRes] = await Promise.all([
        supabase
          .from('club_activities')
          .select('id, title, status, start_date, location, priority')
          .eq('exco_unit', 'MULTIMEDIA')
          .eq('is_archived', false)
          .order('start_date', { ascending: false })
          .limit(30),
        supabase
          .from('club_reports')
          .select('id, file_name, status, created_at, is_archived')
          .eq('exco_unit', 'MULTIMEDIA')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setActivities(actsRes.data || []);
      setReports(reportsRes.data || []);
    } catch (err) {
      console.error('Failed to load multimedia unit data:', err);
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    loadDbData();
  }, [loadDbData]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesFilter = mediaFilter === 'SEMUA' || asset.status === mediaFilter;
      const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            asset.designer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [assets, mediaFilter, searchQuery]);

  // Filtered Equipment
  const filteredEquipment = useMemo(() => {
    return equipment.filter((eq) => {
      if (equipmentCategory === 'SEMUA') return true;
      return eq.category === equipmentCategory;
    });
  }, [equipment, equipmentCategory]);

  // Stats calculation
  const stats = useMemo(() => {
    const publishedCount = assets.filter((a) => a.status === 'DITERBITKAN').length;
    const readyGearCount = equipment.filter((e) => e.status === 'SIAP_SIAGA').length;
    const gearReadinessPct = Math.round((readyGearCount / (equipment.length || 1)) * 100);
    const upcomingEventsCount = events.filter((e) => e.status !== 'SELESAI').length;

    return {
      published: publishedCount,
      gearPct: gearReadinessPct,
      events: upcomingEventsCount,
      activitiesCount: activities.length,
      reportsCount: reports.length,
    };
  }, [assets, equipment, events, activities, reports]);

  return (
    <div className="space-y-6">
      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kad 1: Poster & Media Diterbitkan */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Poster Diterbitkan</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <Image className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.published}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium">Aset rasmi JPPHQ aktif</p>
        </div>

        {/* Kad 2: Kesiapsiagaan Inventori PA */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Inventori Siap Siaga</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.gearPct}%
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium">{equipment.filter(e => e.status === 'SIAP_SIAGA').length} dari {equipment.length} alat sedia diguna</p>
        </div>

        {/* Kad 3: Liputan Acara Terjadual */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Liputan Terjadual</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.events}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium">Acara rasmi memerlukan kru</p>
        </div>

        {/* Kad 4: Aktiviti & Laporan Exco */}
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
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium">{stats.reportsCount} laporan berdaftar</p>
        </div>
      </div>

      {/* ── Sub-navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.06] pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'media', label: 'Hab Media & Poster', icon: Image },
          { key: 'takwim', label: 'Kalendar Hebahan', icon: Calendar },
          { key: 'inventori', label: 'Inventori PA & Teknikal', icon: Mic },
          { key: 'rekod', label: 'Aktiviti & Laporan', icon: FileText },
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

      {/* ── SUBTAB 1: Hab Media & Poster ── */}
      {subTab === 'media' && (
        <div className="space-y-6">
          {/* Action Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari tajuk poster atau pereka..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['SEMUA', 'DITERBITKAN', 'SEMAKAN', 'DRAF'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setMediaFilter(st)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                    mediaFilter === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Media Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs flex flex-col justify-between group hover:border-orange-500/30 transition-all"
              >
                <div>
                  {/* Poster Thumbnail / Preview Box */}
                  <div
                    className="h-36 rounded-xl mb-4 flex flex-col justify-between p-4 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${asset.previewColor}18, ${asset.previewColor}08)`,
                      border: `1px solid ${asset.previewColor}30`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-white shadow-xs">
                        {asset.category}
                      </span>
                      {/* Semantic Status Badge */}
                      {asset.status === 'DITERBITKAN' && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Diterbitkan
                        </span>
                      )}
                      {asset.status === 'SEMAKAN' && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Semakan MT
                        </span>
                      )}
                      {asset.status === 'DRAF' && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                          Draf Awal
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-white/40">{asset.dimensions}</p>
                    </div>
                  </div>

                  <h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {asset.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-1.5 flex items-center gap-1.5">
                    <span>Oleh:</span>
                    <span className="font-semibold text-slate-700 dark:text-white/70">{asset.designer}</span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px]">
                  <span className="font-mono tabular-nums text-slate-400 dark:text-white/30">
                    {asset.date}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums font-bold text-slate-600 dark:text-white/60">
                      {asset.downloads} muat turun
                    </span>
                    <button
                      title="Salin Pautan Media"
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-orange-500/10 text-slate-600 dark:text-white/70 hover:text-orange-500 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUBTAB 2: Kalendar Hebahan ── */}
      {subTab === 'takwim' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Jadual Tugasan & Liputan Media</h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Penugasan krew foto, rakaman video dan sistem siaraya untuk acara rasmi.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                Sesi 2026/2027
              </span>
            </div>

            <div className="space-y-3">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-white/10 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex flex-col items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{evt.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-white/40 mt-1">
                        <span className="font-mono tabular-nums font-medium">{evt.date} · {evt.time}</span>
                        <span>•</span>
                        <span>{evt.location}</span>
                        <span>•</span>
                        <span className="text-slate-700 dark:text-white/70 font-medium">Ketua: {evt.leadPerson}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-white/[0.06]">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-white/[0.05] text-slate-700 dark:text-white/70">
                      {evt.coverageType}
                    </span>
                    {evt.status === 'DISAHKAN' ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Disahkan
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Perancangan
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 3: Inventori PA & Teknikal ── */}
      {subTab === 'inventori' && (
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['SEMUA', 'Audio / PA', 'Kamera & Video', 'Paparan / Visual', 'Aksesori & Kabel'].map((cat) => (
              <button
                key={cat}
                onClick={() => setEquipmentCategory(cat)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap',
                  equipmentCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Equipment Table / Cards */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-white">Senarai Aset Siaraya & Peralatan</h3>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-white/40">
                {filteredEquipment.length} peralatan berdaftar
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredEquipment.map((eq) => (
                <div key={eq.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      {eq.category === 'Audio / PA' && <Volume2 className="w-4 h-4" />}
                      {eq.category === 'Kamera & Video' && <Camera className="w-4 h-4" />}
                      {eq.category === 'Paparan / Visual' && <Monitor className="w-4 h-4" />}
                      {eq.category === 'Aksesori & Kabel' && <Layers className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-900 dark:text-white leading-tight">{eq.name}</p>
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-white/40 mt-1">
                        <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-white/60">{eq.serialNo}</span>
                        <span>•</span>
                        <span>{eq.location}</span>
                        {eq.borrower && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">Peminjam: {eq.borrower} (Pulang: {eq.returnDate})</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {eq.status === 'SIAP_SIAGA' && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Siap Siaga
                      </span>
                    )}
                    {eq.status === 'SEDANG_DIPINJAM' && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Dipinjam
                      </span>
                    )}
                    {eq.status === 'SERVIS' && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Dalam Servis
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 4: Aktiviti & Laporan (Live DB) ── */}
      {subTab === 'rekod' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Rekod Aktiviti & Laporan Exco Multimedia</h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Diselaraskan terus daripada pangkalan data pusat JPP.</p>
              </div>
              <button
                onClick={loadDbData}
                disabled={loadingDb}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-white/70 hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loadingDb && 'animate-spin')} />
                Segar Semula
              </button>
            </div>

            {loadingDb ? (
              <div className="py-12 text-center text-xs font-mono text-slate-400">
                Memuatkan data aktiviti & laporan...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Aktiviti Terkini */}
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

                {/* Laporan Rasmi */}
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
