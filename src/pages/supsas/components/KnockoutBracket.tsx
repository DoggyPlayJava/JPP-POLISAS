/**
 * GroupStandingsTable — Jadual kedudukan kumpulan (round-robin).
 * Kiraan mata: Menang=3, Seri=1, Kalah=0. Tiebreaker: perbezaan gol.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Minus, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  calculateGroupStandings,
  type GroupStanding,
} from '@/hooks/useLiveDraw';
import type { SupsasFixture, SupsasKontingen } from '@/contexts/SupsasContext';

interface GroupStandingsTableProps {
  group: 'A' | 'B';
  fixtures: SupsasFixture[];
  kontingen: SupsasKontingen[];
  color: string;
}

export function GroupStandingsTable({ group, fixtures, kontingen, color }: GroupStandingsTableProps) {
  const groupFixtures = fixtures.filter(f => f.group_name === group);
  const teamsInGroup = kontingen.filter(k =>
    groupFixtures.some(f => f.kontingen_a_id === k.id || f.kontingen_b_id === k.id)
  );

  const standings = calculateGroupStandings(groupFixtures, teamsInGroup);
  const qualifiedCount = 2; // Top 2 advance

  return (
    <div className="rounded-2xl overflow-hidden border border-white/8">
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ backgroundColor: `${color}15`, borderBottom: `1px solid ${color}20` }}
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>
          Kumpulan {group}
        </span>
        <span className="text-white/20 text-[9px] ml-auto">{groupFixtures.filter(f => f.status === 'completed').length}/{groupFixtures.length} selesai</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-2 text-white/30 font-black uppercase tracking-widest text-[8px]">Pasukan</th>
              <th className="text-center px-2 py-2 text-white/30 font-black uppercase tracking-widest text-[8px]">M</th>
              <th className="text-center px-2 py-2 text-white/30 font-black uppercase tracking-widest text-[8px]">W</th>
              <th className="text-center px-2 py-2 text-white/30 font-black uppercase tracking-widest text-[8px]">D</th>
              <th className="text-center px-2 py-2 text-white/30 font-black uppercase tracking-widest text-[8px]">L</th>
              <th className="text-center px-2 py-2 text-white/30 font-black uppercase tracking-widest text-[8px]">GD</th>
              <th className="text-center px-3 py-2 text-white/30 font-black uppercase tracking-widest text-[8px]">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const qualified = i < qualifiedCount;
              return (
                <motion.tr
                  key={s.kontingenId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn(
                    'border-b border-white/[0.03] transition-all',
                    qualified ? 'bg-white/[0.02]' : 'opacity-60'
                  )}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {/* Rank */}
                      <span className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0',
                        i === 0 ? 'text-amber-400' : i === 1 ? 'text-white/60' : 'text-white/20'
                      )}>
                        {i + 1}
                      </span>
                      {/* Color dot */}
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className={cn('font-black', qualified ? 'text-white' : 'text-white/40')}>
                        {s.shortCode}
                      </span>
                      {/* Qualified badge */}
                      {qualified && (
                        <span
                          className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          Maju
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-2 py-2.5 text-white/50">{s.played}</td>
                  <td className="text-center px-2 py-2.5 text-emerald-400 font-bold">{s.won}</td>
                  <td className="text-center px-2 py-2.5 text-white/40">{s.drawn}</td>
                  <td className="text-center px-2 py-2.5 text-red-400/70">{s.lost}</td>
                  <td className={cn(
                    'text-center px-2 py-2.5 font-bold',
                    s.goalDiff > 0 ? 'text-emerald-400' : s.goalDiff < 0 ? 'text-red-400' : 'text-white/30'
                  )}>
                    {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                  </td>
                  <td className="text-center px-3 py-2.5">
                    <span className={cn(
                      'font-black text-sm',
                      qualified ? 'text-amber-400' : 'text-white/30'
                    )}>
                      {s.points}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
            {standings.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-white/20 text-[10px] font-black uppercase tracking-widest">
                  Belum ada keputusan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KO Bracket For SF + Final ────────────────────────────────
interface KnockoutMatchProps {
  fixture: SupsasFixture | null;
  kontingenMap: Record<string, SupsasKontingen>;
  delay?: number;
  label: string;
}

function KoMatchCard({ fixture, kontingenMap, delay = 0, label }: KnockoutMatchProps) {
  const a = fixture?.kontingen_a_id ? kontingenMap[fixture.kontingen_a_id] : null;
  const b = fixture?.kontingen_b_id ? kontingenMap[fixture.kontingen_b_id] : null;
  const winnerA = fixture?.winner_id === fixture?.kontingen_a_id && !!fixture?.winner_id;
  const winnerB = fixture?.winner_id === fixture?.kontingen_b_id && !!fixture?.winner_id;
  const isLive = fixture?.status === 'live';
  const isDone = fixture?.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-1"
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">{label}</p>
      <div className={cn(
        'rounded-2xl border overflow-hidden min-w-[180px]',
        isLive ? 'border-red-500/40 shadow-[0_0_20px_-4px_rgba(239,68,68,0.3)]' :
        isDone ? 'border-emerald-500/20' : 'border-white/8'
      )}>
        {isLive && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            <span className="text-[8px] font-black uppercase tracking-widest text-red-400">Live</span>
          </div>
        )}
        {/* Team A */}
        <div className={cn('flex items-center gap-2 px-3 py-2.5', winnerA && 'bg-amber-500/10')}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a?.color ?? '#ffffff15' }} />
          <span className={cn('flex-1 text-sm font-black', winnerA ? 'text-amber-300' : a ? 'text-white' : 'text-white/20')}>
            {a?.short_code ?? 'TBD'}
          </span>
          {isDone && <span className="text-xs font-black text-white/40 w-4 text-right">{fixture?.score_a ?? '?'}</span>}
          {winnerA && <Trophy className="w-3 h-3 text-amber-400" />}
        </div>
        <div className="h-px bg-white/5 mx-3" />
        {/* Team B */}
        <div className={cn('flex items-center gap-2 px-3 py-2.5', winnerB && 'bg-amber-500/10')}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b?.color ?? '#ffffff15' }} />
          <span className={cn('flex-1 text-sm font-black', winnerB ? 'text-amber-300' : b ? 'text-white' : 'text-white/20')}>
            {b?.short_code ?? 'TBD'}
          </span>
          {isDone && <span className="text-xs font-black text-white/40 w-4 text-right">{fixture?.score_b ?? '?'}</span>}
          {winnerB && <Trophy className="w-3 h-3 text-amber-400" />}
        </div>
      </div>
    </motion.div>
  );
}

interface KnockoutBracketProps {
  sfFixtures: SupsasFixture[];
  finalFixture: SupsasFixture | null;
  kontingenMap: Record<string, SupsasKontingen>;
}

export function KnockoutBracket({ sfFixtures, finalFixture, kontingenMap }: KnockoutBracketProps) {
  const sf1 = sfFixtures.find(f => f.bracket_position === 1) ?? null;
  const sf2 = sfFixtures.find(f => f.bracket_position === 2) ?? null;
  const winner = finalFixture?.winner_id ? kontingenMap[finalFixture.winner_id] : null;

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center gap-4 min-w-max">
        {/* Semi Finals */}
        <div className="flex flex-col gap-6">
          <KoMatchCard fixture={sf1} kontingenMap={kontingenMap} delay={0} label="Separuh Akhir 1" />
          <KoMatchCard fixture={sf2} kontingenMap={kontingenMap} delay={0.1} label="Separuh Akhir 2" />
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center self-stretch justify-center gap-0">
          <div className="flex-1 border-t border-r border-white/10 w-6" style={{ borderEndEndRadius: 0 }} />
          <div className="w-6 h-2 border-r border-white/10" />
          <div className="flex-1 border-b border-r border-white/10 w-6" />
        </div>

        {/* Final */}
        <KoMatchCard fixture={finalFixture} kontingenMap={kontingenMap} delay={0.2} label="🏆 Akhir" />

        {/* Champion */}
        {winner && (
          <>
            <div className="w-6 h-px bg-amber-500/30" />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="flex flex-col items-center gap-2"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/60">JUARA</p>
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col items-center justify-center gap-1"
                style={{ boxShadow: `0 0 32px -8px ${winner.color}60` }}>
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-black text-amber-300">{winner.short_code}</span>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
