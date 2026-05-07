import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTakwimPusat } from '@/hooks/useTakwimPusat';
import { TAKWIM_JENIS, STUDENT_FILTER_OPTIONS, SESI_OPTIONS, INSTITUSI_LABEL, type TakwimItem } from '@/config/takwim-constants';
import { cn, hexToRgba } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { ms } from 'date-fns/locale';
import { CalendarDays, Filter, Table, LayoutGrid, ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ALL_CLUBS } from '@/types';

export function AkademikTakwimPage() {
  const { profile, userClubIds } = useAuth();
  const [filter, setFilter] = useState('KESELURUHAN');
  const [sesi, setSesi] = useState('2026/2027');
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [calMonth, setCalMonth] = useState(new Date());
  const [sesiToggle, setSesiToggle] = useState<'I' | 'II' | 'ALL'>('ALL');
  const [selectedClubFilter, setSelectedClubFilter] = useState('ALL'); // 'ALL' or specific club_id

  // Resolve effective club IDs for "Kelab Saya"
  const effectiveClubIds = useMemo(() => {
    if (selectedClubFilter !== 'ALL') return [selectedClubFilter];
    return userClubIds;
  }, [selectedClubFilter, userClubIds]);

  // Build list of user's clubs for sub-picker
  const myClubs = useMemo(() =>
    userClubIds.map(id => {
      const club = ALL_CLUBS.find(c => c.id === id);
      return { id, name: club?.name || id };
    }).sort((a, b) => a.name.localeCompare(b.name)),
  [userClubIds]);

  const { items, loading, stats } = useTakwimPusat({
    filter: filter === 'KELAB_SAYA' ? 'KELAB_SAYA' : filter,
    sesi,
    clubIds: effectiveClubIds,
    excludeJenis: ['KELAB_KEDIAMAN'],
  });

  // Sesi auto-split: filter items by semester dates
  const filteredItems = useMemo(() => {
    if (sesiToggle === 'ALL') return items;
    return items.filter(item => {
      const d = new Date(item.tarikh_mula);
      if (sesiToggle === 'I') return d.getMonth() >= 5 && d.getMonth() <= 10 && d.getFullYear() === 2026; // Jun-Nov 2026
      return d.getFullYear() === 2027 || (d.getFullYear() === 2026 && d.getMonth() >= 10); // Nov 2026 onwards
    });
  }, [items, sesiToggle]);

  return (
    <div className="space-y-8 pb-20">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Takwim POLISAS</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{INSTITUSI_LABEL} · Berpusat · {sesi}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={v => { setFilter(v); if (v !== 'KELAB_SAYA') setSelectedClubFilter('ALL'); }}>
          <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/5 border-white/10 text-xs font-bold text-white">
            <Filter className="w-3 h-3 mr-2 text-white/40" /><SelectValue />
          </SelectTrigger>
          <SelectContent>{STUDENT_FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>

        {/* Club sub-picker — only visible when "Kelab Saya" is selected */}
        {filter === 'KELAB_SAYA' && myClubs.length > 0 && (
          <Select value={selectedClubFilter} onValueChange={setSelectedClubFilter}>
            <SelectTrigger className="w-[200px] h-10 rounded-xl bg-emerald-500/5 border-emerald-500/15 text-xs font-bold text-emerald-400">
              <Users className="w-3 h-3 mr-2 text-emerald-400/50" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kelab Saya ({myClubs.length})</SelectItem>
              {myClubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={sesi} onValueChange={setSesi}>
          <SelectTrigger className="w-[150px] h-10 rounded-xl bg-white/5 border-white/10 text-xs font-bold text-white"><SelectValue /></SelectTrigger>
          <SelectContent>{SESI_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>

        {/* Sesi Toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
          {(['ALL', 'I', 'II'] as const).map(s => (
            <button key={s} onClick={() => setSesiToggle(s)} className={cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all', sesiToggle === s ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/40 hover:text-white/60')}>
              {s === 'ALL' ? 'Semua' : `Sesi ${s}`}
            </button>
          ))}
        </div>

        {/* View Mode */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 ml-auto">
          <button onClick={() => setViewMode('calendar')} className={cn('p-2 rounded-lg transition-all', viewMode === 'calendar' ? 'bg-white/10 text-white' : 'text-white/40')}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('table')} className={cn('p-2 rounded-lg transition-all', viewMode === 'table' ? 'bg-white/10 text-white' : 'text-white/40')}><Table className="w-4 h-4" /></button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(stats).filter(([k]) => k !== 'KESELURUHAN').map(([k, v]) => {
          const cfg = TAKWIM_JENIS[k];
          if (!cfg || v === 0) return null;
          return (
            <Badge key={k} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border-none cursor-pointer hover:scale-105 transition-transform"
              style={{ background: cfg.bgColor, color: cfg.color }}
              onClick={() => setFilter(k)}>
              {cfg.shortLabel}: {v}
            </Badge>
          );
        })}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
      ) : viewMode === 'calendar' ? (
        <StudentCalendar items={filteredItems} month={calMonth} onPrev={() => setCalMonth(m => subMonths(m, 1))} onNext={() => setCalMonth(m => addMonths(m, 1))} />
      ) : (
        <StudentTable items={filteredItems} />
      )}
    </div>
  );
}

function StudentCalendar({ items, month, onPrev, onNext }: { items: TakwimItem[]; month: Date; onPrev: () => void; onNext: () => void }) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startDay = getDay(startOfMonth(month));
  const getEvents = (day: Date) => items.filter(i => { const s = parseISO(i.tarikh_mula); const e = i.tarikh_tamat ? parseISO(i.tarikh_tamat) : s; return day >= s && day <= e; });

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-white/[0.03]">
        <button onClick={onPrev} className="p-2 rounded-lg hover:bg-white/10 text-white/50"><ChevronLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-black text-white uppercase tracking-widest">{format(month, 'MMMM yyyy', { locale: ms })}</h3>
        <button onClick={onNext} className="p-2 rounded-lg hover:bg-white/10 text-white/50"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7">
        {['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'].map(d => (
          <div key={d} className="p-2 text-center text-[9px] font-black uppercase tracking-widest text-white/25 border-b border-white/5">{d}</div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} className="p-2 min-h-[80px] border-b border-r border-white/[0.03]" />)}
        {days.map(day => {
          const evts = getEvents(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={cn('p-1.5 min-h-[80px] border-b border-r border-white/[0.03]', isToday && 'bg-indigo-500/5')}>
              <span className={cn('text-[10px] font-black inline-flex items-center justify-center', isToday ? 'text-indigo-400 bg-indigo-500/20 w-6 h-6 rounded-full' : 'text-white/40')}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {evts.slice(0, 3).map(e => {
                  const c = e.warna_custom || TAKWIM_JENIS[e.jenis]?.color || '#94A3B8';
                  return <div key={e.id} className="text-[8px] font-bold px-1.5 py-0.5 rounded truncate" style={{ background: hexToRgba(c, 0.15), color: c }}>{e.tajuk}</div>;
                })}
                {evts.length > 3 && <div className="text-[8px] font-bold text-white/30 px-1">+{evts.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentTable({ items }: { items: TakwimItem[] }) {
  const fmtDate = (d: string) => { try { return format(parseISO(d), 'd MMM yyyy', { locale: ms }); } catch { return d; } };
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CalendarDays className="w-10 h-10 text-white/10 mb-3" />
      <p className="text-xs font-black text-white/20 uppercase tracking-widest">Tiada entri takwim</p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.04]">
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Jenis</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Tajuk / Aktiviti</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Tarikh</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Minggu</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {items.map(item => {
              const cfg = TAKWIM_JENIS[item.jenis];
              const color = item.warna_custom || cfg?.color || '#94A3B8';
              return (
                <tr key={`${item.type}-${item.id}`} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Badge className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none" style={{ background: hexToRgba(color, 0.15), color }}>{cfg?.shortLabel || item.jenis}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-black text-white/90">{item.tajuk}</p>
                    {item.club_name && <p className="text-[10px] text-white/30 mt-0.5">{item.club_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-bold text-white/60 whitespace-nowrap">
                    {fmtDate(item.tarikh_mula)}{item.tarikh_tamat && item.tarikh_tamat !== item.tarikh_mula ? ` — ${fmtDate(item.tarikh_tamat)}` : ''}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-white/40 text-center">{item.bil_minggu || '—'}</td>
                  <td className="px-4 py-3 text-[10px] text-white/40 max-w-[200px] truncate">{item.catatan || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
