// ============================================================
// KolaborasiUnitDashboard — Pengerahan Sukarelawan Siswa & Integrasi Acara EMS
// Unit Code: 'KOLAB' | Accent Color: #34D399
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Handshake, HeartHandshake, Users, Award, Calendar,
  Globe2, Building2, CheckCircle2, Clock, AlertTriangle,
  Search, Filter, ExternalLink, Mail, Phone, FileText,
  RefreshCw, MapPin, ChevronRight, ShieldCheck, Sparkles,
  QrCode, UserCheck, Activity, Target, Download, Check,
  UserPlus, PlusCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const KOLAB_COLOR = '#34D399';

// ── Types ─────────────────────────────────────────────────────────────
type SubTab = 'sukarelawan' | 'kehadiran' | 'sijil' | 'rakan';

interface MouPartner {
  id: string;
  name: string;
  type: string;
  scope: string;
  validUntil: string;
  status: 'AKTIF' | 'RUNDINGAN' | 'TAMAT';
  contactPerson: string;
  contactEmail: string;
}

// ── Strategic Partners Data ───────────────────────────────────────────
const INITIAL_PARTNERS: MouPartner[] = [
  {
    id: 'mou-01',
    name: 'Petronas Chemicals MTBE Sdn Bhd (Gebeng)',
    type: 'Industri / Korporat',
    scope: 'Penajaan Geran Inovasi Siswa & Misi Khidmat Komuniti Pesisir Pantai',
    validUntil: '2028-12-31',
    status: 'AKTIF',
    contactPerson: 'Ir. Ahmad Razif (Pengurus CSR)',
    contactEmail: 'razif_mtbe@petronas.com.my',
  },
  {
    id: 'mou-02',
    name: 'Majlis Bandaraya Kuantan (MBK)',
    type: 'Agensi Kerajaan Tempatan',
    scope: 'Program Bandar Pintar, Gotong-Royong Komuniti & Skuad Sukarelawan Belia',
    validUntil: '2027-06-30',
    status: 'AKTIF',
    contactPerson: 'Puan Noraini (Bahagian Belia & Sukan)',
    contactEmail: 'noraini@mbk.gov.my',
  },
  {
    id: 'mou-03',
    name: 'Yayasan Pahang',
    type: 'Agensi Negeri',
    scope: 'Dana Tabung Khidmat Komuniti & Bantuan Kecemasan Bencana Mahasiswa',
    validUntil: '2027-12-31',
    status: 'AKTIF',
    contactPerson: 'Encik Kamarul (Unit Bantuan Mahasiswa)',
    contactEmail: 'kamarul@yp.org.my',
  },
  {
    id: 'mou-04',
    name: 'Bulan Sabit Merah Malaysia (Cawangan Kuantan)',
    type: 'Badan Bukan Kerajaan (NGO)',
    scope: 'Latihan Pertolongan Cemas CPR & Skuad Tindak Balas Banjir Mahasiswa',
    validUntil: '2026-11-15',
    status: 'RUNDINGAN',
    contactPerson: 'Dr. Subramaniam (Penyelaras Operasi)',
    contactEmail: 'subra@pbsmkuantan.org',
  },
];

export function KolaborasiUnitDashboard() {
  const { t } = useTranslation(['jpp', 'common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('sukarelawan');

  // ── Live DB Data ────────────────────────────────────────────────────
  const [emsEvents, setEmsEvents] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Search & Filter ─────────────────────────────────────────────────
  const [searchEvent, setSearchEvent] = useState('');
  const [partners, setPartners] = useState<MouPartner[]>(INITIAL_PARTNERS);

  // Load live data safely with Promise.all
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, certsRes, actsRes, repRes] = await Promise.all([
        supabase
          .from('ems_events')
          .select('id, title, description, event_date, location, status, max_participants, category, created_at')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('ems_certificates')
          .select('id, event_id, participant_id, cert_type, cert_serial, qr_code_url, created_at')
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('club_activities')
          .select('id, title, status, start_date, location, priority')
          .eq('exco_unit', 'KOLAB')
          .eq('is_archived', false)
          .order('start_date', { ascending: false })
          .limit(20),
        supabase
          .from('club_reports')
          .select('id, file_name, status, created_at, is_archived')
          .eq('exco_unit', 'KOLAB')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      setEmsEvents(eventsRes.data || []);
      setCertificates(certsRes.data || []);
      setActivities(actsRes.data || []);
      setReports(repRes.data || []);
    } catch (err) {
      console.error('Failed to load kolaborasi EMS hub data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered EMS events
  const filteredEvents = useMemo(() => {
    return emsEvents.filter((evt) => {
      return (
        evt.title?.toLowerCase().includes(searchEvent.toLowerCase()) ||
        evt.location?.toLowerCase().includes(searchEvent.toLowerCase()) ||
        evt.category?.toLowerCase().includes(searchEvent.toLowerCase())
      );
    });
  }, [emsEvents, searchEvent]);

  // Stats calculation
  const stats = useMemo(() => {
    const activeEventsCount = emsEvents.filter((e) => e.status === 'ACTIVE' || e.status === 'PUBLISHED' || e.status === 'OPEN').length;
    const certsCount = certificates.length;
    const activePartnersCount = partners.filter((p) => p.status === 'AKTIF').length;

    return {
      activeEvents: activeEventsCount || emsEvents.length,
      totalCerts: certsCount,
      activePartners: activePartnersCount,
      activitiesCount: activities.length,
      reportsCount: reports.length,
    };
  }, [emsEvents, certificates, partners, activities, reports]);

  return (
    <div className="space-y-6">
      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kad 1: Acara EMS Buka Sukarelawan */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:kolab_card_ems_events', 'Acara EMS Terkini')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.activeEvents}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {t('jpp:kolab_card_ems_desc', 'Pangkalan data acara EMS diselaraskan')}
          </p>
        </div>

        {/* Kad 2: E-Sijil Dijana */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:kolab_card_certs', 'E-Sijil EMS Dijana')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.totalCerts}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {t('jpp:kolab_card_certs_desc', 'Sijil rasmi berkod QR pengesahan')}
          </p>
        </div>

        {/* Kad 3: Rakan Strategik MoU */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:kolab_card_partners', 'Rakan Strategik')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Handshake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.activePartners}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {t('jpp:kolab_card_partners_desc', 'Jalinan industri & agensi CSR aktif')}
          </p>
        </div>

        {/* Kad 4: Aktiviti Berdaftar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:kolab_card_activities', 'Aktiviti Unit')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {stats.activitiesCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {t('jpp:kolab_card_reports_desc', '{{count}} laporan berdaftar', { count: stats.reportsCount })}
          </p>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.06] pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'sukarelawan', label: t('jpp:kolab_tab_volunteers', 'Pengerahan Sukarelawan Acara EMS'), icon: Users },
          { key: 'kehadiran', label: t('jpp:kolab_tab_attendance', 'Imbasan QR & Pengesahan Kru'), icon: QrCode },
          { key: 'sijil', label: t('jpp:kolab_tab_certs', 'Enjin Sijil Sukarelawan EMS'), icon: Award },
          { key: 'rakan', label: t('jpp:kolab_tab_partners', 'Rakan Strategik & Aktiviti Unit'), icon: Handshake },
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

      {/* ── SUBTAB 1: Pengerahan Sukarelawan Acara EMS ── */}
      {subTab === 'sukarelawan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchEvent}
                onChange={(e) => setSearchEvent(e.target.value)}
                placeholder={t('jpp:kolab_search_placeholder', 'Cari acara EMS, lokasi atau kategori...')}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/ems')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0 shadow-xs"
              >
                <span>{t('jpp:kolab_open_ems_panel', 'Buka Panel EMS')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of EMS Events with Volunteer Rostering */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:kolab_volunteers_coordination_title', 'Penyelarasan Sukarelawan Mengikut Acara EMS')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:kolab_volunteers_coordination_desc', 'Menghubungkan keperluan kru sukarelawan terus ke acara EMS institusi.')}
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
                {t('jpp:kolab_loading_events', 'Memuatkan senarai acara EMS...')}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
                {t('jpp:kolab_no_events_found', 'Tiada acara EMS dijumpai.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filteredEvents.map((evt) => (
                  <div key={evt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">{evt.title}</h4>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {evt.status || 'Aktif'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-white/60 mt-1 line-clamp-1 leading-relaxed">
                          {evt.description || t('jpp:kolab_no_desc', 'Tiada penerangan tambahan acara.')}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-white/40 mt-2">
                          <span className="font-mono tabular-nums">
                            {evt.event_date ? format(parseISO(evt.event_date), 'dd MMM yyyy', { locale: ms }) : t('jpp:kolab_date_set', 'Tarikh ditetapkan')}
                          </span>
                          <span>•</span>
                          <span>{evt.location || 'Kampus POLISAS'}</span>
                          {evt.max_participants && (
                            <>
                              <span>•</span>
                              <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-white/70">
                                {t('jpp:kolab_capacity_label', 'Kapasiti: {{count}} Peserta', { count: evt.max_participants })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/[0.04]">
                      <button
                        onClick={() => navigate(`/ems/checkin?eventId=${evt.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs hover:opacity-90 active:scale-[0.98] transition-all"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{t('jpp:kolab_scan_qr_btn', 'Imbas QR')}</span>
                      </button>
                      <button
                        onClick={() => navigate(`/ems`)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-emerald-500/10 text-slate-600 dark:text-white/70 hover:text-emerald-600 transition-colors"
                        title={t('jpp:kolab_view_ems_info', 'Lihat Maklumat EMS')}
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

      {/* ── SUBTAB 2: Imbasan QR & Pengesahan Kru ── */}
      {subTab === 'kehadiran' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:kolab_crew_attendance_title', 'Pengesahan Kehadiran Kru & Sukarelawan EMS')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:kolab_crew_attendance_desc', 'Imbas pas digital sukarelawan menggunakan kamera peranti untuk pengesahan jam khidmat serta-merta.')}
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                EMS Scanner
              </span>
            </div>

            <div className="p-6 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {t('jpp:kolab_open_scanner_title', 'Buka Pengimbas QR Kehadiran EMS')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
                  {t('jpp:kolab_open_scanner_desc', 'Gunakan enjin pengimbas EMS yang terbukti pantas untuk mengimbas kad pelajar dan kod QR tiket acara tanpa kelewatan.')}
                </p>
              </div>
              <button
                onClick={() => navigate('/ems/checkin')}
                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-[0.98] transition-all inline-flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>{t('jpp:kolab_launch_scanner_btn', 'Lancarkan Pengimbas Kehadiran')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 3: Enjin Sijil Sukarelawan EMS ── */}
      {subTab === 'sijil' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:kolab_certs_ledger_title', 'Lejar Sijil Penghargaan Sukarelawan EMS')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:kolab_certs_ledger_desc', 'Setiap sijil dijana dengan kod verifikasi kriptografik unik dan boleh disemak keasliannya di /ems/verify.')}
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-mono tabular-nums">
                {t('jpp:kolab_certs_issued_count', '{{count}} Sijil Dikeluarkan', { count: certificates.length })}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-slate-400">
                {t('jpp:kolab_loading_certs', 'Memuatkan rekod sijil EMS...')}
              </div>
            ) : certificates.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
                {t('jpp:kolab_no_certs_issued', 'Tiada sijil sukarelawan dikeluarkan setakat ini.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {certificates.map((cert) => (
                  <div key={cert.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-sm text-slate-900 dark:text-white">{cert.cert_type || 'Sijil Sukarelawan'}</p>
                          <span className="text-[10px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60">
                            {cert.cert_serial}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-white/40 mt-0.5">
                          {t('jpp:kolab_verify_code_label', 'Kod Pengesahan:')} <span className="text-teal-600 dark:text-teal-400 font-bold">{cert.cert_serial}</span>
                        </p>
                      </div>
                    </div>

                    <a
                      href={`/ems/cert/${cert.cert_serial}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-white/70 hover:bg-slate-200 transition-colors shrink-0"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                      <span>{t('jpp:kolab_verify_cert_btn', 'Sahkan Sijil')}</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUBTAB 4: Rakan Strategik & Aktiviti Unit ── */}
      {subTab === 'rakan' && (
        <div className="space-y-6">
          {/* Direktori Rakan Strategik */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:kolab_partners_directory_title', 'Direktori Rakan Strategik & Penaja Luar')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:kolab_partners_directory_desc', 'Saluran kerjasama MoU dan rakan CSR korporat bagi aktiviti mahasiswa.')}
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                CSR & Tajaan
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex flex-col justify-between group hover:border-emerald-500/30 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/40">
                            {partner.type}
                          </span>
                          <h4 className="font-black text-xs text-slate-900 dark:text-white leading-tight">
                            {partner.name}
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        {partner.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed mb-3">
                      {partner.scope}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40">
                    <span>{t('jpp:kolab_valid_until', 'Sah sehingga {{date}}', { date: partner.validUntil })}</span>
                    <a
                      href={`mailto:${partner.contactEmail}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Mail className="w-3 h-3" /> {t('jpp:kolab_contact_link', 'Hubungi')}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aktiviti & Laporan Rasmi */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <h3 className="font-black text-base text-slate-900 dark:text-white mb-4">
              {t('jpp:kolab_records_title', 'Rekod Pentadbiran Exco Kolaborasi')}
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-white/40 mb-2">
                  {t('jpp:kolab_registered_activities', 'Aktiviti Berdaftar ({{count}})', { count: activities.length })}
                </h4>
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 rounded-lg border border-dashed border-slate-200 dark:border-white/[0.08]">
                    {t('jpp:kolab_no_activities', 'Tiada aktiviti didaftarkan untuk unit Kolaborasi pada masa ini.')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div key={act.id} className="p-3 rounded-lg border border-slate-200 dark:border-white/[0.04] flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">{act.title}</span>
                        <span className="font-mono text-slate-500 dark:text-white/40">{act.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
