import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { hexToRgba } from '@/lib/utils';
import {
  Trophy, Star, TrendingUp, Crown, Medal, Award,
  Loader2, Users, BookOpen, BarChart3,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const THEME = '#818CF8';

// ─── Rank badge ───────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
      <Crown className="w-4 h-4 text-amber-900" />
    </div>
  );
  if (rank === 2) return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #9CA3AF, #D1D5DB)', boxShadow: '0 4px 12px rgba(156,163,175,0.3)' }}>
      <Medal className="w-4 h-4 text-gray-700" />
    </div>
  );
  if (rank === 3) return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #B45309, #D97706)', boxShadow: '0 4px 12px rgba(180,83,9,0.3)' }}>
      <Award className="w-4 h-4 text-amber-100" />
    </div>
  );
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.05] text-white/30">
      <span className="text-xs font-black">{rank}</span>
    </div>
  );
}

// ─── Leaderboard tabs ─────────────────────────────────────────
type LeaderTab = 'OVERALL' | 'AKADEMIK' | 'QR' | 'CGPA';

interface LeaderEntry {
  id: string;
  full_name: string | null;
  department: string | null;
  avatar_url: string | null;
  merit?: number;
  hpnm?: number | null;
}

// ─── Main Leaderboard ─────────────────────────────────────────
export function AkademikLeaderboard() {
  const { profile } = useAuth();
  const [tab,      setTab]      = useState<LeaderTab>('OVERALL');
  const [entries,  setEntries]  = useState<LeaderEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [myRank,   setMyRank]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'CGPA') {
        // Top CGPA: latest record per student
        const { data } = await supabase
          .from('akademik_cgpa_records')
          .select('user_id, hpnm, profiles(id, full_name, department, avatar_url)')
          .order('hpnm', { ascending: false })
          .limit(50);

        // De-dup — take highest hpnm per user
        const seen = new Map<string, any>();
        for (const r of (data || [])) {
          const hpnmVal = r.hpnm !== null && r.hpnm !== undefined ? parseFloat(r.hpnm) : null;
          const prev = seen.get(r.user_id);
          if (!prev || (hpnmVal !== null && (prev.hpnm === null || hpnmVal > prev.hpnm))) {
            seen.set(r.user_id, { ...r.profiles as any, hpnm: hpnmVal });
          }
        }
        const sorted = [...seen.values()].sort((a, b) => (b.hpnm || 0) - (a.hpnm || 0));
        setEntries(sorted.slice(0, 30));
        const idx = sorted.findIndex(e => e.id === profile?.id);
        setMyRank(idx !== -1 ? idx + 1 : null);
      } else if (tab === 'OVERALL') {
        // Top by profiles.merit
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, department, avatar_url, merit')
          .eq('account_status', 'APPROVED')
          .not('merit', 'is', null)
          .gt('merit', 0)
          .order('merit', { ascending: false })
          .limit(50);
        setEntries(data || []);
        const idx = (data || []).findIndex(e => e.id === profile?.id);
        setMyRank(idx !== -1 ? idx + 1 : null);
      } else {
        // AKADEMIK or QR: sum merit_transactions by source
        const source = tab === 'AKADEMIK' ? 'AKADEMIK' : 'QR_SCAN';
        const { data } = await supabase
          .from('merit_transactions')
          .select('user_id, points, profiles(id, full_name, department, avatar_url)')
          .eq('source', source);

        // Sum per user
        const sumMap = new Map<string, { profile: any; total: number }>();
        for (const row of (data || [])) {
          const uid  = row.user_id;
          const prev = sumMap.get(uid);
          if (prev) prev.total += row.points || 0;
          else sumMap.set(uid, { profile: row.profiles, total: row.points || 0 });
        }
        const sorted = [...sumMap.values()]
          .sort((a, b) => b.total - a.total)
          .slice(0, 30)
          .map(v => ({ ...(v.profile as any), merit: v.total }));
        setEntries(sorted);
        const idx = sorted.findIndex(e => e.id === profile?.id);
        setMyRank(idx !== -1 ? idx + 1 : null);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, profile?.id]);

  useEffect(() => { load(); }, [load]);

  const myEntry = entries.find(e => e.id === profile?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Akademik</p>
        <h1 className="text-2xl font-black text-white">Leaderboard</h1>
        <p className="text-xs text-white/40 font-medium mt-1">Ranking merit akademik, QR, dan CGPA pelajar</p>
      </div>

      {/* My rank card */}
      {myRank && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl border border-white/[0.06] flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${hexToRgba(THEME, 0.1)}, transparent)` }}
        >
          <RankBadge rank={myRank} />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Kedudukan Anda</p>
            <p className="text-sm font-black text-white">#{myRank} — {profile?.full_name?.split(' ')[0]}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {tab === 'CGPA' ? (
              <span className="text-lg font-black text-white">{myEntry?.hpnm?.toFixed(2) || '—'}</span>
            ) : (
              <>
                <Star className="w-4 h-4 fill-current text-amber-400" />
                <span className="text-lg font-black text-amber-300">{myEntry?.merit || 0}</span>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Tab selector */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'OVERALL',  label: 'Keseluruhan', icon: Trophy },
          { id: 'AKADEMIK', label: 'Pencapaian',  icon: Award },
          { id: 'QR',       label: 'QR Merit',    icon: Star },
          { id: 'CGPA',     label: 'HPNM',        icon: BarChart3 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all"
            style={tab === id
              ? { background: `${THEME}20`, borderColor: THEME, color: THEME }
              : { background: 'transparent', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }
            }
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {!loading && entries.length >= 3 && (
        <div className="flex items-end justify-center gap-3 pt-4 pb-2">
          {/* 2nd */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/[0.1]">
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage src={entries[1]?.avatar_url || ''} />
                  <AvatarFallback className="text-sm font-black bg-white/5 text-white/50">{entries[1]?.full_name?.[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-slate-800 border border-white/10">
                <span className="text-[8px] font-black text-white/50">2</span>
              </div>
            </div>
            <p className="text-[9px] font-black text-white/50 text-center max-w-[60px] truncate">{entries[1]?.full_name?.split(' ')[0]}</p>
            <div className="h-14 w-16 rounded-t-2xl flex items-center justify-center" style={{ background: 'rgba(156,163,175,0.15)', border: '1px solid rgba(156,163,175,0.2)' }}>
              <span className="text-xs font-black text-white/40">{tab === 'CGPA' ? entries[1]?.hpnm?.toFixed(2) : entries[1]?.merit}</span>
            </div>
          </motion.div>

          {/* 1st */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
            className="flex flex-col items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <div className="relative">
              <div className="w-18 h-18 w-[4.5rem] h-[4.5rem] rounded-2xl overflow-hidden border-2 border-amber-400/40"
                style={{ boxShadow: '0 0 20px rgba(251,191,36,0.25)' }}>
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage src={entries[0]?.avatar_url || ''} />
                  <AvatarFallback className="text-base font-black bg-amber-500/20 text-amber-300">{entries[0]?.full_name?.[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-amber-500 border border-amber-300">
                <span className="text-[8px] font-black text-amber-900">1</span>
              </div>
            </div>
            <p className="text-[10px] font-black text-white text-center max-w-[70px] truncate">{entries[0]?.full_name?.split(' ')[0]}</p>
            <div className="h-20 w-16 rounded-t-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span className="text-sm font-black text-amber-300">{tab === 'CGPA' ? entries[0]?.hpnm?.toFixed(2) : entries[0]?.merit}</span>
            </div>
          </motion.div>

          {/* 3rd */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/[0.1]">
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage src={entries[2]?.avatar_url || ''} />
                  <AvatarFallback className="text-sm font-black bg-white/5 text-white/50">{entries[2]?.full_name?.[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-slate-800 border border-white/10">
                <span className="text-[8px] font-black text-amber-700">3</span>
              </div>
            </div>
            <p className="text-[9px] font-black text-white/50 text-center max-w-[60px] truncate">{entries[2]?.full_name?.split(' ')[0]}</p>
            <div className="h-10 w-16 rounded-t-2xl flex items-center justify-center" style={{ background: 'rgba(180,83,9,0.15)', border: '1px solid rgba(180,83,9,0.2)' }}>
              <span className="text-xs font-black text-amber-700/60">{tab === 'CGPA' ? entries[2]?.hpnm?.toFixed(2) : entries[2]?.merit}</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Full list */}
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Trophy className="w-10 h-10 mx-auto text-white/10" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada data lagi</p>
        </div>
      ) : (
        <div className="space-y-2 pt-2">
          {entries.map((entry, i) => {
            const rank    = i + 1;
            const isMe    = entry.id === profile?.id;
            const val     = tab === 'CGPA' ? entry.hpnm?.toFixed(2) : entry.merit;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025 }}
                className="flex items-center gap-3 p-3 rounded-2xl border transition-all"
                style={isMe
                  ? { borderColor: hexToRgba(THEME, 0.35), background: hexToRgba(THEME, 0.08) }
                  : { borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }
                }
              >
                <RankBadge rank={rank} />
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/[0.08] shrink-0">
                  <Avatar className="w-full h-full rounded-none">
                    <AvatarImage src={entry.avatar_url || ''} />
                    <AvatarFallback className="text-[10px] font-black bg-white/5 text-white/50">{entry.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-black truncate ${isMe ? 'text-white' : 'text-white/70'}`}>
                    {entry.full_name || '—'}
                    {isMe && <span className="ml-2 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest" style={{ background: hexToRgba(THEME, 0.2), color: THEME }}>Anda</span>}
                  </p>
                  <p className="text-[9px] text-white/25 font-bold">{entry.department?.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {tab === 'CGPA'
                    ? <span className="text-sm font-black" style={{ color: THEME }}>{val}</span>
                    : (
                      <>
                        <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                        <span className="text-sm font-black text-amber-300">{val}</span>
                      </>
                    )
                  }
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
