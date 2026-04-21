import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Filter, ChevronRight } from 'lucide-react';
import { useSupsas, SupsasFixture } from '@/contexts/SupsasContext';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  upcoming:  { label: 'Akan Datang', cls: 'bg-white/5 border-white/10 text-white/40' },
  live:      { label: '🔴 LIVE',     cls: 'bg-red-500/20 border-red-500/30 text-red-400 animate-pulse' },
  completed: { label: 'Selesai',     cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  postponed: { label: 'Ditangguh',   cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
};

function FixtureCard({ fixture, kontingenMap, sportMap }: {
  fixture: SupsasFixture;
  kontingenMap: Record<string, { name: string; short_code: string; color: string }>;
  sportMap: Record<string, { name: string }>;
}) {
  const a  = fixture.kontingen_a_id ? kontingenMap[fixture.kontingen_a_id] : null;
  const b  = fixture.kontingen_b_id ? kontingenMap[fixture.kontingen_b_id] : null;
  const sp = fixture.sport_id ? sportMap[fixture.sport_id] : null;
  const st = STATUS_BADGE[fixture.status] ?? STATUS_BADGE.upcoming;
  const isCompleted = fixture.status === 'completed';
  const isLive = fixture.status === 'live';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative rounded-3xl border transition-all duration-300 overflow-hidden',
        isLive
          ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
          : isCompleted
          ? 'bg-white/[0.02] border-white/5 hover:border-white/10'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
      )}
    >
      {/* Live pulse streak */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
      )}

      <div className="p-5">
        {/* Top row: sport + status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {sp && <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{sp.name}</span>}
            {fixture.round && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/60">{fixture.round}</span>
              </>
            )}
          </div>
          <span className={cn('px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border', st.cls)}>
            {st.label}
          </span>
        </div>

        {/* VS row */}
        <div className="flex items-center justify-between gap-4">
          {/* Team A */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-black text-sm text-white"
              style={{ borderColor: a?.color ?? '#ffffff20', backgroundColor: `${a?.color ?? '#ffffff'}15` }}
            >
              {a?.short_code?.charAt(0) ?? '?'}
            </div>
            <p className="text-sm font-black text-white text-center truncate max-w-[100px]">{a?.short_code ?? 'TBD'}</p>
            {isCompleted && fixture.score_a !== null && (
              <span className={cn('text-3xl font-black', fixture.winner_id === fixture.kontingen_a_id ? 'text-amber-400' : 'text-white/50')}>
                {fixture.score_a}
              </span>
            )}
          </div>

          {/* Center */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            {isCompleted ? (
              <span className="text-white/20 font-black text-lg">—</span>
            ) : (
              <span className="text-white/40 font-black text-xl">VS</span>
            )}
            {fixture.match_time && !isCompleted && (
              <div className="flex items-center gap-1 text-[9px] text-white/20 font-black">
                <Clock className="w-3 h-3" />
                {fixture.match_time.slice(0, 5)}
              </div>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-black text-sm text-white"
              style={{ borderColor: b?.color ?? '#ffffff20', backgroundColor: `${b?.color ?? '#ffffff'}15` }}
            >
              {b?.short_code?.charAt(0) ?? '?'}
            </div>
            <p className="text-sm font-black text-white text-center truncate max-w-[100px]">{b?.short_code ?? 'TBD'}</p>
            {isCompleted && fixture.score_b !== null && (
              <span className={cn('text-3xl font-black', fixture.winner_id === fixture.kontingen_b_id ? 'text-amber-400' : 'text-white/50')}>
                {fixture.score_b}
              </span>
            )}
          </div>
        </div>

        {/* Bottom info */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
          {fixture.match_date && (
            <div className="flex items-center gap-1.5 text-[9px] text-white/25 font-bold">
              <Calendar className="w-3 h-3" />
              {new Date(fixture.match_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long' })}
            </div>
          )}
          {fixture.venue && (
            <div className="flex items-center gap-1.5 text-[9px] text-white/25 font-bold">
              <MapPin className="w-3 h-3" />
              {fixture.venue}
            </div>
          )}
          {fixture.notes && (
            <p className="text-[9px] text-amber-400/60 font-bold ml-auto">{fixture.notes}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function SupsasSchedulePage() {
  const { fixtures, kontingen, sports, edition } = useSupsas();
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');
  const [filterSport, setFilterSport] = useState<string>('all');

  const kontingenMap = Object.fromEntries(kontingen.map(k => [k.id, { name: k.name, short_code: k.short_code, color: k.color }]));
  const sportMap = Object.fromEntries(sports.map(s => [s.id, { name: s.name }]));

  const filtered = fixtures.filter(f => {
    const matchStatus = filterStatus === 'all' || f.status === filterStatus;
    const matchSport  = filterSport === 'all' || f.sport_id === filterSport;
    return matchStatus && matchSport;
  });

  // Group by date
  const grouped: Record<string, SupsasFixture[]> = {};
  filtered.forEach(f => {
    const key = f.match_date ?? 'Tarikh Belum Ditetapkan';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-12 pt-8 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-none">Jadual Pertandingan</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">{edition?.name}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'live', 'upcoming', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    filterStatus === s
                      ? s === 'live' ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                        : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                  )}
                >
                  {s === 'all' ? 'Semua' : s === 'live' ? '🔴 Live' : s === 'upcoming' ? 'Akan Datang' : 'Selesai'}
                </button>
              ))}
            </div>
            <select
              value={filterSport}
              onChange={e => setFilterSport(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-amber-500/40 transition-all"
            >
              <option value="all">Semua Sukan</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-24">
              <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 font-black uppercase tracking-widest text-sm">Tiada perlawanan dijadualkan</p>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(grouped).map(([date, dayFixtures]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 px-3">
                      {date === 'Tarikh Belum Ditetapkan' ? date : new Date(date).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayFixtures.map((f, idx) => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <FixtureCard fixture={f} kontingenMap={kontingenMap} sportMap={sportMap} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
