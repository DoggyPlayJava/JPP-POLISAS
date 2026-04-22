/**
 * BracketPage — Public bracket + group standings viewer at /supsas/bracket/:sportId
 * Menunjukkan:
 *   1. Jadual kumpulan (Group A & Group B) dengan kedudukan
 *   2. Senarai perlawanan kumpulan
 *   3. Bracket KO (Separuh Akhir + Akhir)
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, MapPin, LayoutGrid, List } from 'lucide-react';
import { useSupsas } from '@/contexts/SupsasContext';
import { GroupStandingsTable, KnockoutBracket } from './components/KnockoutBracket';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'kumpulan' | 'bracket' | 'jadual';

export function BracketPage() {
  const { sportId } = useParams<{ sportId: string }>();
  const navigate = useNavigate();
  const { sports, fixtures, kontingen, teams } = useSupsas();
  const [activeTab, setActiveTab] = useState<Tab>('kumpulan');

  const sport = sports.find(s => s.id === sportId);
  const sportFixtures = fixtures.filter(f => f.sport_id === sportId);

  // Detect groups dynamically (A, B, C, D)
  const allGroupNames = ['A', 'B', 'C', 'D'].filter(g =>
    sportFixtures.some(f => f.group_name === g)
  );
  const qfFixtures = sportFixtures.filter(f => f.bracket_round === 3);
  const sfFixtures = sportFixtures.filter(f => f.bracket_round === 2);
  const finalFixture = sportFixtures.find(f => f.bracket_round === 1) ?? null;
  const hasQF = qfFixtures.length > 0;

  const GROUP_COLORS: Record<string, string> = {
    A: '#F59E0B', B: '#8B5CF6', C: '#10B981', D: '#EF4444',
  };

  const kontingenMap = Object.fromEntries(kontingen.map(k => [k.id, k]));
  const teamsMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const hasBracket = sportFixtures.some(f => f.group_name || f.bracket_round != null);

  const liveCount = sportFixtures.filter(f => f.status === 'live').length;
  const doneCount = sportFixtures.filter(f => f.status === 'completed').length;

  const SportIcon = sport ? ((LucideIcons as any)[sport.icon] || LucideIcons.Trophy) : LucideIcons.Trophy;

  const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'kumpulan', label: 'Kumpulan', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'bracket', label: 'Bracket KO', icon: <Trophy className="w-3.5 h-3.5" /> },
    { id: 'jadual', label: 'Semua Match', icon: <List className="w-3.5 h-3.5" /> },
  ];

  if (!sport) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <Trophy className="w-12 h-12 text-white/10 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Sukan Tidak Dijumpai</h1>
        <button onClick={() => navigate('/supsas')} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black mt-4">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back nav */}
      <button onClick={() => navigate('/supsas/jadual')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-bold transition-all">
        <ArrowLeft className="w-4 h-4" /> Jadual Pertandingan
      </button>

      {/* Sport header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <SportIcon className="w-7 h-7 text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-black text-white">{sport.name}</h1>
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-widest text-red-400">{liveCount} Live</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-white/30 font-bold uppercase tracking-widest">Peringkat Kumpulan + Gugur</span>
            {sport.venue && (
              <span className="flex items-center gap-1 text-xs text-white/30">
                <MapPin className="w-3 h-3" />{sport.venue}
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500/60 transition-all duration-700"
                style={{ width: sportFixtures.length ? `${(doneCount / sportFixtures.length) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-[9px] text-white/30 font-bold">{doneCount}/{sportFixtures.length} selesai</span>
          </div>
        </div>
      </motion.div>

      {!hasBracket ? (
        <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/5">
          <Trophy className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/20 text-sm font-black uppercase tracking-widest">Bracket belum dijana</p>
          <p className="text-white/10 text-xs mt-2">Exco Sukan perlu jana bracket terlebih dahulu.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                  activeTab === tab.id
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                    : 'text-white/30 hover:text-white'
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {/* ── Tab: Kumpulan ─────────────────────────── */}
            {activeTab === 'kumpulan' && (
              <motion.div key="kumpulan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="text-center py-3 px-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-white/30 text-[10px] font-medium">
                    Menang = <span className="text-emerald-400 font-black">3 mata</span> &nbsp;·&nbsp;
                    Seri = <span className="text-amber-400 font-black">1 mata</span> &nbsp;·&nbsp;
                    Kalah = <span className="text-red-400 font-black">0 mata</span>
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    Top 2 setiap kumpulan maju ke {hasQF ? 'Suku Akhir' : 'Separuh Akhir'}
                  </p>
                </div>

                {allGroupNames.map(grp => (
                  <GroupStandingsTable
                    key={grp}
                    group={grp}
                    fixtures={sportFixtures}
                    kontingen={kontingen}
                    teams={teams}
                    kontingenMap={kontingenMap}
                    color={GROUP_COLORS[grp] ?? '#F59E0B'}
                  />
                ))}
              </motion.div>
            )}

            {/* ── Tab: Bracket KO ───────────────────────── */}
            {activeTab === 'bracket' && (
              <motion.div key="bracket" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="rounded-[2rem] bg-white/[0.02] border border-white/5 p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-black text-white">Fasa Knockout</span>
                    <span className="text-[10px] text-white/30 font-medium ml-1">
                      ({hasQF ? 'QF → SF → Final' : 'SF → Final'})
                    </span>
                  </div>
                  {sfFixtures.length === 0 && !finalFixture ? (
                    <div className="text-center py-10 text-white/20 text-xs font-black uppercase tracking-widest">
                      Fasa KO bermula selepas fasa kumpulan selesai
                    </div>
                  ) : (
                    <KnockoutBracket
                      qfFixtures={qfFixtures}
                      sfFixtures={sfFixtures}
                      finalFixture={finalFixture}
                      kontingenMap={kontingenMap}
                      teamsMap={teamsMap}
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Tab: Semua Match ──────────────────────── */}
            {activeTab === 'jadual' && (
              <motion.div key="jadual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Group A matches */}
                {['A', 'B'].map(grp => {
                  const gf = sportFixtures.filter(f => f.group_name === grp);
                  if (!gf.length) return null;
                  return (
                    <div key={grp}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-white/5" />
                        <span
                          className="text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full"
                          style={{
                            backgroundColor: grp === 'A' ? '#F59E0B20' : '#8B5CF620',
                            color: grp === 'A' ? '#F59E0B' : '#8B5CF6',
                          }}
                        >
                          Kumpulan {grp}
                        </span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      <div className="space-y-2">
                        {gf.map(f => <MatchRow key={f.id} fixture={f} kontingenMap={kontingenMap} teamsMap={teamsMap} />)}
                      </div>
                    </div>
                  );
                })}

                {/* KO phase */}
                {(sfFixtures.length > 0 || finalFixture) && (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-amber-500/15 text-amber-400">
                        Fasa Knockout
                      </span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="space-y-2">
                      {sfFixtures.map(f => <MatchRow key={f.id} fixture={f} kontingenMap={kontingenMap} teamsMap={teamsMap} />)}
                      {finalFixture && <MatchRow fixture={finalFixture} kontingenMap={kontingenMap} teamsMap={teamsMap} />}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ─── Match Row (shared) ───────────────────────────────────────
function MatchRow({ fixture, kontingenMap, teamsMap }: {
  fixture: import('@/contexts/SupsasContext').SupsasFixture;
  kontingenMap: Record<string, import('@/contexts/SupsasContext').SupsasKontingen>;
  teamsMap?: Record<string, import('@/contexts/SupsasContext').SupsasTeam>;
}) {
  const isTeamBased = !!(fixture.team_a_id || fixture.team_b_id);
  let aDisplay = 'TBD', bDisplay = 'TBD';
  let aColor: string | undefined, bColor: string | undefined;

  if (isTeamBased && teamsMap) {
    const tA = fixture.team_a_id ? teamsMap[fixture.team_a_id] : null;
    const tB = fixture.team_b_id ? teamsMap[fixture.team_b_id] : null;
    const kA = tA ? kontingenMap[tA.kontingen_id] : null;
    const kB = tB ? kontingenMap[tB.kontingen_id] : null;
    if (tA && kA) { aDisplay = `${kA.short_code} #${tA.group_number}`; aColor = kA.color; }
    if (tB && kB) { bDisplay = `${kB.short_code} #${tB.group_number}`; bColor = kB.color; }
  } else {
    const a = fixture.kontingen_a_id ? kontingenMap[fixture.kontingen_a_id] : null;
    const b = fixture.kontingen_b_id ? kontingenMap[fixture.kontingen_b_id] : null;
    if (a) { aDisplay = a.short_code; aColor = a.color; }
    if (b) { bDisplay = b.short_code; bColor = b.color; }
  }
  const isLive = fixture.status === 'live';
  const isDone = fixture.status === 'completed';

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-2xl border transition-all',
      isLive ? 'bg-red-500/5 border-red-500/15' :
      isDone ? 'bg-emerald-500/5 border-emerald-500/10' :
      'bg-white/[0.02] border-white/5'
    )}>
      <div className="w-20 flex-shrink-0">
        <p className="text-[8px] font-black uppercase tracking-widest text-amber-400/50">{fixture.round}</p>
        <p className="text-[8px] text-white/20">#{fixture.match_number}</p>
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <span className={cn('text-sm font-black truncate', aDisplay !== 'TBD' ? 'text-white' : 'text-white/20')}>
            {aDisplay}
          </span>
          {aColor && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: aColor }} />}
        </div>

        <div className="flex-shrink-0 px-2">
          {isDone ? (
            <span className="text-xs font-black text-white/60">
              {fixture.score_a ?? '?'} – {fixture.score_b ?? '?'}
            </span>
          ) : (
            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">VS</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-1">
          {bColor && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: bColor }} />}
          <span className={cn('text-sm font-black truncate', bDisplay !== 'TBD' ? 'text-white' : 'text-white/20')}>
            {bDisplay}
          </span>
        </div>
      </div>

      <span className={cn(
        'px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border flex-shrink-0',
        isLive ? 'bg-red-500/20 border-red-500/30 text-red-400' :
        isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
        'bg-white/5 border-white/10 text-white/30'
      )}>
        {isLive ? '🔴 Live' : isDone ? 'Selesai' : 'Akan Datang'}
      </span>
    </div>
  );
}
