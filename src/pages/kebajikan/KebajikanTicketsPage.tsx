import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutGrid, Building2, Coffee, Wifi, Box, HelpCircle,
  Filter, Search, ChevronRight, AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  KebajikanTicket, KebajikanTicketStatus, KEBAJIKAN_STATUS_LABELS,
  KEBAJIKAN_STATUS_COLORS, KEBAJIKAN_CATEGORY_LABELS,
  KEBAJIKAN_THEME_COLOR,
} from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SystemTour } from '@/components/ui/SystemTour';
import { useTour } from '@/hooks/useTour';

const TEAL  = KEBAJIKAN_THEME_COLOR;
const ALL_STATUSES: KebajikanTicketStatus[] = ['NEW','IN_PROGRESS','WAITING_INFO','PENDING_EXTERNAL','DELEGATED','ESCALATED','REOPENED','RESOLVED','CLOSED','CANCELLED'];

export function KebajikanTicketsPage() {
  const { isUnitKebajikanStaff, isKediamanExco, isKebajikanExco, isSuperAdmin, isYdp, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [tickets, setTickets]   = useState<KebajikanTicket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<KebajikanTicketStatus | 'ALL'>(
    (searchParams.get('status') as KebajikanTicketStatus) || 'ALL'
  );
  const [catFilter, setCatFilter]   = useState('ALL');
  const [showFilter, setShowFilter] = useState(false);

  const { runTour, startTour, closeTour } = useTour('KEBAJIKAN_TICKETS', !!user);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('kebajikan_tickets')
      .select('*, assignee:assigned_to(full_name), delegate:delegated_to(full_name)')
      .order('created_at', { ascending: false });

    if (isUnitKebajikanStaff && !user?.id) q = q.eq('delegated_to', user?.id);

    // Auto-filter berdasarkan unit exco:
    // - Exco KK: nampak tiket kafeteria sahaja
    // - Exco Kebajikan: nampak semua kecuali kafeteria
    // - Super Admin / YDP: nampak semua
    if (!isSuperAdmin && !isYdp) {
      if (isKediamanExco) {
        q = q.eq('handled_by_unit', 'KK');
      } else if (isKebajikanExco) {
        q = q.neq('handled_by_unit', 'KK');
      }
    }

    if (statusFilter && statusFilter !== 'ALL') q = q.eq('status', statusFilter);
    if (catFilter && catFilter !== 'ALL') q = q.eq('category', catFilter);

    const { data } = await q;
    let result = (data as KebajikanTicket[]) || [];

    // Client-side search
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        t.ticket_no.toLowerCase().includes(s) ||
        t.title.toLowerCase().includes(s) ||
        t.full_name.toLowerCase().includes(s) ||
        (t.matric_no ?? '').toLowerCase().includes(s)
      );
    }

    setTickets(result);
    setLoading(false);
  }, [search, statusFilter, catFilter, isUnitKebajikanStaff, isKediamanExco, isKebajikanExco, isSuperAdmin, isYdp, user?.id]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('tickets_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kebajikan_tickets' }, fetchTickets)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchTickets]);

  const urgentCount   = tickets.filter(t => t.status === 'ESCALATED').length;
  const newCount      = tickets.filter(t => t.status === 'NEW').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen relative transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            {isKediamanExco && !isSuperAdmin && !isYdp ? 'Aduan Kafeteria' : 'Senarai Tiket'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-white/40">
            {loading ? 'Memuatkan...' : `${tickets.length} tiket`}
            {urgentCount > 0 && <span className="ml-2 text-red-600 dark:text-red-400 font-black">· {urgentCount} diescalate!</span>}
            {newCount > 0 && <span className="ml-2 font-black text-teal-700 dark:text-teal-400">· {newCount} baru</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button onClick={() => setShowFilter(!showFilter)} variant="outline" className="h-10 px-4 sm:px-5 text-xs font-black border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300 rounded-xl gap-2 shadow-sm bg-white dark:bg-transparent">
            <Filter className="w-4 h-4" /> Tapis
          </Button>
          <button
            onClick={startTour}
            className="w-10 h-10 rounded-full bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform shadow-sm"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 z-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari tiket, nama, no. matrik..."
          className="pl-12 bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-teal-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-2xl h-14 shadow-sm text-sm transition-all"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 scrollbar-none z-10 relative">
        <CategoryTab icon={LayoutGrid} label="Semua Aduan" active={catFilter === 'ALL'} onClick={() => setCatFilter('ALL')} />
        <CategoryTab icon={Building2} label="Fasiliti Jabatan" active={catFilter === 'FASILITI_JABATAN'} onClick={() => setCatFilter('FASILITI_JABATAN')} />
        <CategoryTab icon={AlertTriangle} label="Fasiliti Sukan" active={catFilter === 'FASILITI_SUKAN'} onClick={() => setCatFilter('FASILITI_SUKAN')} />
        <CategoryTab icon={Coffee} label="Kafeteria" active={catFilter === 'KAFETERIA'} onClick={() => setCatFilter('KAFETERIA')} />
        <CategoryTab icon={Wifi} label="WiFi Kamsis" active={catFilter === 'WIFI_KAMSIS'} onClick={() => setCatFilter('WIFI_KAMSIS')} />
        <CategoryTab icon={Box} label="Lain-Lain" active={catFilter === 'LAIN_LAIN'} onClick={() => setCatFilter('LAIN_LAIN')} />
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilter && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6 z-10 relative">
            <div className="space-y-4 p-6 rounded-3xl border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-slate-900/70 backdrop-blur-xl shadow-md dark:shadow-2xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-700 dark:text-teal-400 mb-3">Status</p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="Semua" active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} />
                  {ALL_STATUSES.map(s => (
                    <FilterChip key={s} label={KEBAJIKAN_STATUS_LABELS[s]} active={statusFilter === s}
                      onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket list */}
      <div className="tour-ticket-status relative z-10">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-3xl bg-slate-200/60 dark:bg-white/[0.02] animate-pulse border border-slate-200 dark:border-white/5" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm">
            <Search className="w-14 h-14 mx-auto mb-4 text-slate-300 dark:text-teal-500/40" />
            <p className="font-black text-base text-slate-700 dark:text-slate-300">Tiada tiket ditemui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t, i) => (
              <motion.div key={t.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <Link
                  to={`/kebajikan/tiket/${t.id}`}
                  className="relative flex items-center gap-4 sm:gap-5 p-5 rounded-3xl border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/10 hover:shadow-md dark:hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden"
                  style={t.status === 'ESCALATED' ? { borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.03)' } : {}}
                >
                  {/* Status Strip */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: priorityColor(t.priority) }} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-black text-sm text-slate-900 dark:text-slate-50 truncate">{t.title}</span>
                      <span className={cn('text-[9px] font-black px-2.5 py-1 rounded-full flex-shrink-0 uppercase tracking-widest shadow-sm', KEBAJIKAN_STATUS_COLORS[t.status])}>
                        {KEBAJIKAN_STATUS_LABELS[t.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="font-black text-slate-800 dark:text-slate-300">{t.ticket_no}</span>
                      <span className="opacity-50">·</span>
                      <span className="truncate max-w-[150px] font-medium">{t.full_name}</span>
                      <span className="opacity-50">·</span>
                      <span>{KEBAJIKAN_CATEGORY_LABELS[t.category]}</span>
                      <span className="opacity-50">·</span>
                      <span className="text-teal-700 dark:text-teal-400 font-semibold">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ms })}</span>
                    </div>
                    {(t as any).assignee && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 mt-2">Diuruskan oleh: {(t as any).assignee.full_name}</p>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 flex-shrink-0 text-slate-400 dark:text-slate-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors mr-2" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <SystemTour run={runTour} onClose={closeTour} tourKey="KEBAJIKAN_TICKETS" />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn('px-3.5 py-1.5 rounded-xl text-[10px] font-black border transition-all', active ? 'text-slate-950 bg-teal-400 border-teal-400 shadow-sm' : 'text-slate-700 dark:text-white/50 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-white/[0.02]')}
    >
      {label}
    </button>
  );
}

function CategoryTab({ icon: Icon, label, active, onClick }: { icon: any, label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all whitespace-nowrap flex-shrink-0',
        active
          ? 'bg-teal-400 border-teal-400 text-slate-950 shadow-md'
          : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm'
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-slate-950" : "text-slate-400 dark:text-slate-500")} />
      {label}
    </button>
  );
}

function priorityColor(p: string) {
  return ({ LOW: '#64748b', NORMAL: '#3B82F6', HIGH: '#F97316', URGENT: '#EF4444' } as any)[p] ?? '#64748b';
}
