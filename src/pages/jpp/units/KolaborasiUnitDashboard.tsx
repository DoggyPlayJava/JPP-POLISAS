// ============================================================
// KolaborasiUnitDashboard — Dashboard Rasmi Exco Kolaborasi & Kesukarelawanan
// Unit Code: 'KOLAB' | Accent Color: #34D399
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Handshake, HeartHandshake, Users, Award, Calendar,
  Globe2, Building2, CheckCircle2, Clock, AlertTriangle,
  Search, Filter, ExternalLink, Mail, Phone, FileText,
  RefreshCw, MapPin, ChevronRight, ShieldCheck, Sparkles,
  UserCheck, Activity, Target
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';

const KOLAB_COLOR = '#34D399';

// ── Types ─────────────────────────────────────────────────────────────
type SubTab = 'rakan' | 'sukarelawan' | 'program' | 'rekod';

interface MouPartner {
  id: string;
  name: string;
  type: 'Industri / Korporat' | 'Agensi Kerajaan' | 'NGO / Komuniti' | 'Institusi Pendidikan';
  collaborationType: 'MoU Rasmi' | 'MoA Projek' | 'Rakan CSR' | 'Tajaan';
  validUntil: string;
  status: 'AKTIF' | 'RUNDINGAN' | 'TAMAT';
  contactPerson: string;
  contactEmail: string;
  scope: string;
}

interface Volunteer {
  id: string;
  name: string;
  matricNo: string;
  department: string;
  skills: string[];
  hoursLogged: number;
  status: 'SEDIA_DITUGASKAN' | 'SEDANG_BERTUGAS' | 'TIDAK_AKTIF';
  tier: 'Emas (100j+)' | 'Perak (50j+)' | 'Gangsa (20j+)';
}

interface ImpactProgram {
  id: string;
  title: string;
  beneficiary: string;
  targetCount: number;
  date: string;
  location: string;
  status: 'SELESAI' | 'DALAM_PELAKSANAAN' | 'PERANCANGAN';
  budgetSponsored: string;
}

// ── Seed Data for UI Wiring ───────────────────────────────────────────
const INITIAL_PARTNERS: MouPartner[] = [
  {
    id: 'mou-01',
    name: 'Petronas Chemicals MTBE Sdn Bhd',
    type: 'Industri / Korporat',
    collaborationType: 'MoU Rasmi',
    validUntil: '2028-12-31',
    status: 'AKTIF',
    contactPerson: 'Ir. Ahmad Razif (Pengurus CSR)',
    contactEmail: 'razif_mtbe@petronas.com.my',
    scope: 'Penajaan Geran Inovasi, Latihan Industri & Khidmat Komuniti Pesisir Pantai',
  },
  {
    id: 'mou-02',
    name: 'Majlis Bandaraya Kuantan (MBK)',
    type: 'Agensi Kerajaan',
    collaborationType: 'MoU Rasmi',
    validUntil: '2027-06-30',
    status: 'AKTIF',
    contactPerson: 'Puan Noraini (Bahagian Belia & Sukan)',
    contactEmail: 'noraini@mbk.gov.my',
    scope: 'Pembersihan Bandar, Kempen Bebas Plastik & Program Bandar Pintar',
  },
  {
    id: 'mou-03',
    name: 'Yayasan Pahang',
    type: 'Agensi Kerajaan',
    collaborationType: 'Rakan CSR',
    validUntil: '2027-12-31',
    status: 'AKTIF',
    contactPerson: 'Encik Kamarul (Unit Bantuan Mahasiswa)',
    contactEmail: 'kamarul@yp.org.my',
    scope: 'Dana Tabung Kecemasan Mahasiswa & Bantuan B40 POLISAS',
  },
  {
    id: 'mou-04',
    name: 'Persatuan Bulan Sabit Merah Cawangan Kuantan',
    type: 'NGO / Komuniti',
    collaborationType: 'MoA Projek',
    validUntil: '2026-11-15',
    status: 'RUNDINGAN',
    contactPerson: 'Dr. Subramaniam (Penyelaras Operasi)',
    contactEmail: 'subra@pbsmkuantan.org',
    scope: 'Kursus Pertolongan Cemas CPR Siswa & Skuad Tindakan Bencana Banjir',
  },
  {
    id: 'mou-05',
    name: 'Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)',
    type: 'Institusi Pendidikan',
    collaborationType: 'MoU Rasmi',
    validUntil: '2025-12-31',
    status: 'TAMAT',
    contactPerson: 'Dr. Wan Zulkifli (Dekan HEP)',
    contactEmail: 'wanzul@umpsa.edu.my',
    scope: 'Program Pertukaran Pemimpin Pelajar & Debat Inter-Varsiti Pantai Timur',
  },
];

const INITIAL_VOLUNTEERS: Volunteer[] = [
  {
    id: 'vol-01',
    name: 'Muhammad Aiman Firdaus',
    matricNo: '02DKA23F1012',
    department: 'Kejuruteraan Awam (JKA)',
    skills: ['Logistik Acara', 'Pertolongan Cemas', 'Pengurusan Lalu Lintas'],
    hoursLogged: 124,
    status: 'SEDIA_DITUGASKAN',
    tier: 'Emas (100j+)',
  },
  {
    id: 'vol-02',
    name: 'Siti Sarah binti Khalid',
    matricNo: '02DAT23F2044',
    department: 'Perdagangan (JP)',
    skills: ['Fasilitator Modul', 'Pendaftaran Peserta', 'Khidmat Pelanggan'],
    hoursLogged: 78,
    status: 'SEDIA_DITUGASKAN',
    tier: 'Perak (50j+)',
  },
  {
    id: 'vol-03',
    name: 'Khairul Anuar bin Osman',
    matricNo: '02DEM24F1005',
    department: 'Kejuruteraan Mekanikal (JKM)',
    skills: ['Teknikal PA', 'Memandu Van/Penyelia Logistik', 'Bantuan Bencana'],
    hoursLogged: 62,
    status: 'SEDANG_BERTUGAS',
    tier: 'Perak (50j+)',
  },
  {
    id: 'vol-04',
    name: 'Nur Sabrina binti Azman',
    matricNo: '02DKE24F1089',
    department: 'Kejuruteraan Elektrik (JKE)',
    skills: ['Fotografi Acara', 'Penterjemah', 'Pengiring VIP'],
    hoursLogged: 34,
    status: 'SEDIA_DITUGASKAN',
    tier: 'Gangsa (20j+)',
  },
];

const INITIAL_PROGRAMS: ImpactProgram[] = [
  {
    id: 'prg-01',
    title: 'Misi Khidmat Siswa Madani & Celik Digital Komuniti Beserah',
    beneficiary: 'Komuniti Nelayan & Pelajar Sekolah Rendah Beserah',
    targetCount: 150,
    date: '2026-10-25',
    location: 'Dewan Orang Ramai Kg. Beserah',
    status: 'DALAM_PELAKSANAAN',
    budgetSponsored: 'RM 4,500 (MBK + JPPHQ)',
  },
  {
    id: 'prg-02',
    title: 'Santun Kasih Warga Emas & Gotong-Royong Rumah Seri Kenangan',
    beneficiary: 'Warga Emas Rumah Seri Kenangan Kuantan',
    targetCount: 65,
    date: '2026-11-08',
    location: 'Rumah Seri Kenangan, Kuantan',
    status: 'PERANCANGAN',
    budgetSponsored: 'RM 2,800 (Tajaan Yayasan Pahang)',
  },
  {
    id: 'prg-03',
    title: 'Program Pemuliharaan Terumbu Karang & Pesisir Teluk Cempedak',
    beneficiary: 'Pelawat & Ekosistem Marin Teluk Cempedak',
    targetCount: 300,
    date: '2026-09-15',
    location: 'Pantai Teluk Cempedak',
    status: 'SELESAI',
    budgetSponsored: 'RM 3,200 (Petronas Chemicals)',
  },
];

export function KolaborasiUnitDashboard() {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('rakan');

  // ── Live DB data for Activities & Reports ───────────────────────────
  const [activities, setActivities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // ── Client State for UI Modules ─────────────────────────────────────
  const [partners, setPartners] = useState<MouPartner[]>(INITIAL_PARTNERS);
  const [volunteers, setVolunteers] = useState<Volunteer[]>(INITIAL_VOLUNTEERS);
  const [programs, setPrograms] = useState<ImpactProgram[]>(INITIAL_PROGRAMS);

  // Filter states
  const [partnerFilter, setPartnerFilter] = useState<'SEMUA' | 'AKTIF' | 'RUNDINGAN' | 'TAMAT'>('SEMUA');
  const [searchPartner, setSearchPartner] = useState('');
  const [volunteerSearch, setVolunteerSearch] = useState('');

  // Load live DB data safely with Promise.all
  const loadDbData = useCallback(async () => {
    setLoadingDb(true);
    try {
      const [actsRes, reportsRes] = await Promise.all([
        supabase
          .from('club_activities')
          .select('id, title, status, start_date, location, priority')
          .eq('exco_unit', 'KOLAB')
          .eq('is_archived', false)
          .order('start_date', { ascending: false })
          .limit(30),
        supabase
          .from('club_reports')
          .select('id, file_name, status, created_at, is_archived')
          .eq('exco_unit', 'KOLAB')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setActivities(actsRes.data || []);
      setReports(reportsRes.data || []);
    } catch (err) {
      console.error('Failed to load kolaborasi unit data:', err);
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    loadDbData();
  }, [loadDbData]);

  // Filtered Partners
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchFilter = partnerFilter === 'SEMUA' || p.status === partnerFilter;
      const matchSearch = p.name.toLowerCase().includes(searchPartner.toLowerCase()) ||
                          p.scope.toLowerCase().includes(searchPartner.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [partners, partnerFilter, searchPartner]);

  // Filtered Volunteers
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((v) => {
      return (
        v.name.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
        v.matricNo.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
        v.department.toLowerCase().includes(volunteerSearch.toLowerCase())
      );
    });
  }, [volunteers, volunteerSearch]);

  // Overall Stats
  const stats = useMemo(() => {
    const activePartners = partners.filter((p) => p.status === 'AKTIF').length;
    const totalVolunteers = volunteers.length;
    const totalHours = volunteers.reduce((acc, v) => acc + v.hoursLogged, 0);

    return {
      activePartners,
      totalVolunteers,
      totalHours,
      activitiesCount: activities.length,
      reportsCount: reports.length,
    };
  }, [partners, volunteers, activities, reports]);

  return (
    <div className="space-y-6">
      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kad 1: Rakan Strategik Aktif */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Rakan MoU Aktif</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Handshake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.activePartners}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium">{partners.length} entiti dalam jalinan kerjasama</p>
        </div>

        {/* Kad 2: Sukarelawan Berdaftar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Pangkalan Sukarelawan</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.totalVolunteers}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium">Mahasiswa aktif sedia ditugaskan</p>
        </div>

        {/* Kad 3: Jam Khidmat Komuniti */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Jam Khidmat Komuniti</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.totalHours}j
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium">Terkumpul sesi semasa</p>
        </div>

        {/* Kad 4: Aktiviti Berdaftar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Aktiviti Unit</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
          { key: 'rakan', label: 'Rakan Strategik', icon: Handshake },
          { key: 'sukarelawan', label: 'Pangkalan Sukarelawan', icon: Users },
          { key: 'program', label: 'Program Impak', icon: Target },
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
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── SUBTAB 1: Rakan Strategik ── */}
      {subTab === 'rakan' && (
        <div className="space-y-6">
          {/* Action Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPartner}
                onChange={(e) => setSearchPartner(e.target.value)}
                placeholder="Cari organisasi atau skop kerjasama..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['SEMUA', 'AKTIF', 'RUNDINGAN', 'TAMAT'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setPartnerFilter(st)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                    partnerFilter === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Partners Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPartners.map((partner) => (
              <div
                key={partner.id}
                className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs flex flex-col justify-between group hover:border-emerald-500/30 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/40">
                          {partner.type}
                        </span>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                          {partner.name}
                        </h4>
                      </div>
                    </div>

                    {/* Semantic Status Badge */}
                    {partner.status === 'AKTIF' && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        Aktif
                      </span>
                    )}
                    {partner.status === 'RUNDINGAN' && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        Rundingan
                      </span>
                    )}
                    {partner.status === 'TAMAT' && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                        Tamat
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed mb-4">
                    {partner.scope}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.04] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40">
                    <span>Tempoh Perjanjian:</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-white/70">
                      Sah sehingga {partner.validUntil}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-white/40">Pegawai: {partner.contactPerson}</span>
                    <a
                      href={`mailto:${partner.contactEmail}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Mail className="w-3 h-3" /> Emel
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUBTAB 2: Pangkalan Sukarelawan ── */}
      {subTab === 'sukarelawan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={volunteerSearch}
                onChange={(e) => setVolunteerSearch(e.target.value)}
                placeholder="Cari nama sukarelawan, no matrik atau jabatan..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
              />
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-white/40">
              {filteredVolunteers.length} sukarelawan tersenarai
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredVolunteers.map((vol) => (
                <div key={vol.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      {vol.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-slate-900 dark:text-white">{vol.name}</p>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          {vol.tier}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-500 dark:text-white/40 mt-0.5">
                        {vol.matricNo} · {vol.department}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {vol.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/[0.06]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/[0.04]">
                    <div className="text-right">
                      <p className="text-sm font-black font-mono tabular-nums text-slate-900 dark:text-white">
                        {vol.hoursLogged} Jam
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Khidmat Komuniti</p>
                    </div>
                    {vol.status === 'SEDIA_DITUGASKAN' ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Sedia
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        Bertugas
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 3: Program Impak Komuniti ── */}
      {subTab === 'program' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Inisiatif Impak Komuniti & CSR Mahasiswa</h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Program jalinan universiti-masyarakat dan geran khidmat masyarakat.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Sesi 2026/2027
              </span>
            </div>

            <div className="space-y-3">
              {programs.map((prg) => (
                <div
                  key={prg.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-white/10 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{prg.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-white/60 mt-0.5">
                        Sasaran: <span className="font-semibold text-slate-800 dark:text-white/80">{prg.beneficiary}</span> ({prg.targetCount} penerima manfaat)
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-white/40 mt-1.5">
                        <span className="font-mono tabular-nums">{prg.date}</span>
                        <span>•</span>
                        <span>{prg.location}</span>
                        <span>•</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">{prg.budgetSponsored}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-white/[0.06]">
                    {prg.status === 'SELESAI' && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-white/[0.05] text-slate-700 dark:text-white/70">
                        Selesai
                      </span>
                    )}
                    {prg.status === 'DALAM_PELAKSANAAN' && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Dalam Pelaksanaan
                      </span>
                    )}
                    {prg.status === 'PERANCANGAN' && (
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

      {/* ── SUBTAB 4: Aktiviti & Laporan (Live DB) ── */}
      {subTab === 'rekod' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Rekod Aktiviti & Laporan Exco Kolaborasi</h3>
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
                      Tiada aktiviti didaftarkan untuk unit Kolaborasi pada masa ini.
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
                      Tiada fail laporan dimuat naik untuk unit Kolaborasi setakat ini.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reports.map((rep) => (
                        <div
                          key={rep.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
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
