import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryCache, CACHE_TTL } from '@/lib/cache';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy, Star, Vote, CheckCircle2, Users,
  Activity, Zap, Lock, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VoteCount {
  kelab_id: string;
  kelab_name: string;
  total_votes: number;
}

interface KarnivalSettings {
  voting_enabled: boolean;
  registration_open: boolean;
  title: string;
  max_votes: number;
}

// ─── Medal colors berdasarkan ranking ────────────────────────────────────────
const RANK_STYLES = [
  { bg: 'from-amber-400 to-yellow-600',   shadow: 'shadow-amber-500/30',  label: '🥇 Pertama' },
  { bg: 'from-slate-300 to-slate-500',    shadow: 'shadow-slate-400/30',  label: '🥈 Kedua' },
  { bg: 'from-orange-400 to-amber-700',   shadow: 'shadow-orange-500/30', label: '🥉 Ketiga' },
];

// ─── Komponen Utama ───────────────────────────────────────────────────────────
export function KarnivalVotingPage() {
  const { user, profile, isSuperAdmin } = useAuth();

  const [voteCounts, setVoteCounts] = useState<VoteCount[]>([]);
  const [myVotes, setMyVotes] = useState<string[]>([]);      // kelab_id yang sudah diundi
  const [settings, setSettings] = useState<KarnivalSettings>({
    voting_enabled: false,
    registration_open: true,
    title: 'Hari Karnival JPP POLISAS',
    max_votes: 3,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [votingIds, setVotingIds] = useState<Set<string>>(new Set()); // loading state per kelab
  const channelRef = useRef<any>(null);

  // ── Fetch vote counts (dengan cache ringan) ────────────────────────────────
  const fetchVoteCounts = useCallback(async () => {
    const cacheKey = 'karnival_vote_counts';
    const cached = queryCache.get<VoteCount[]>(cacheKey);
    if (cached) { setVoteCounts(cached); return; }

    const { data, error } = await supabase.rpc('get_vote_counts');
    if (!error && data) {
      queryCache.set(cacheKey, data, CACHE_TTL.VOTE_COUNT);
      setVoteCounts(data);
    }
  }, []);

  // ── Fetch settings karnival ────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    const cacheKey = 'karnival_settings';
    const cached = queryCache.get<KarnivalSettings>(cacheKey);
    if (cached) { setSettings(cached); return; }

    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'karnival_voting_enabled',
        'karnival_registration_open',
        'karnival_title',
        'karnival_max_votes',
      ]);

    if (data) {
      const s: Partial<KarnivalSettings> = {};
      data.forEach((row: any) => {
        if (row.key === 'karnival_voting_enabled')    s.voting_enabled    = row.value === true || row.value === 'true';
        if (row.key === 'karnival_registration_open') s.registration_open = row.value === true || row.value === 'true';
        if (row.key === 'karnival_title')             s.title             = typeof row.value === 'string' ? row.value : String(row.value);
        if (row.key === 'karnival_max_votes')         s.max_votes         = Number(row.value);
      });
      const merged = { ...settings, ...s };
      queryCache.set(cacheKey, merged, CACHE_TTL.SETTINGS);
      setSettings(merged);
    }
  }, []);

  // ── Fetch undi pengguna semasa ─────────────────────────────────────────────
  const fetchMyVotes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc('get_my_votes');
    if (data) setMyVotes(data.map((v: any) => v.kelab_id));
  }, [user]);

  // ── Init: load semua data ──────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchVoteCounts(), fetchSettings(), fetchMyVotes()]);
    setIsLoading(false);
  }, [fetchVoteCounts, fetchSettings, fetchMyVotes]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Supabase Realtime subscription ────────────────────────────────────────
  // Hanya SUPER_ADMIN_JPP yang mendapat live vote counts (untuk paparan LCD dewan)
  // Pelajar biasa: kiraan dikemas kini secara local selepas mengundi, atau tekan refresh manual
  useEffect(() => {
    if (!isSuperAdmin) return; // ← Pelajar biasa keluar di sini

    const channel = supabase
      .channel('karnival-votes-admin-live') // ← Nama tetap, bukan random
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'karnival_votes' },
        () => {
          queryCache.invalidate('karnival_vote_counts');
          fetchVoteCounts();
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [fetchVoteCounts, isSuperAdmin]);

  // ── Buat undi ─────────────────────────────────────────────────────────────
  const handleVote = async (kelabId: string, kelabName: string) => {
    if (!user || !profile) { toast.error('Sila log masuk untuk mengundi.'); return; }
    if (!settings.voting_enabled) { toast.error('Pengundian belum dibuka.'); return; }
    if (myVotes.includes(kelabId)) { toast.error('Anda sudah mengundi kelab ini!'); return; }
    if (myVotes.length >= settings.max_votes) {
      toast.error(`Had undi dicapai. Anda hanya boleh undi ${settings.max_votes} kelab.`);
      return;
    }

    setVotingIds(prev => new Set(prev).add(kelabId));

    try {
      const { error } = await supabase.from('karnival_votes').insert({
        voter_id:   user.id,
        kelab_id:   kelabId,
        kelab_name: kelabName,
        matric_no:  (profile as any).matric_no ?? null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Anda sudah mengundi kelab ini!');
        } else {
          throw error;
        }
        return;
      }

      setMyVotes(prev => [...prev, kelabId]);
      queryCache.invalidate('karnival_vote_counts');
      // ← Fetch semula kiraan selepas undi berjaya (untuk pelajar yang tiada Realtime)
      await fetchVoteCounts();
      toast.success(`Undi untuk ${kelabName} berjaya! 🎉`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengundi. Cuba lagi.');
    } finally {
      setVotingIds(prev => {
        const next = new Set(prev);
        next.delete(kelabId);
        return next;
      });
    }
  };

  // ── Toggle settings oleh Admin ─────────────────────────────────────────────
  const toggleSetting = async (key: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('system_settings')
      .update({ value: (!currentValue).toString() })
      .eq('key', key);

    if (!error) {
      queryCache.invalidate('karnival_settings');
      fetchSettings();
      toast.success(`${key.replace('karnival_', '').replace(/_/g, ' ')} dikemaskini!`);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const top3 = voteCounts.slice(0, 3);
  const rest  = voteCounts.slice(3);
  const remainingVotes = settings.max_votes - myVotes.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-container space-y-10 pb-20"
    >
      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-primary via-purple-600 to-pink-600 p-10 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 80 + 20,
                height: Math.random() * 80 + 20,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
              }}
            />
          ))}
        </div>
        <div className="relative space-y-4">
          <Badge className="bg-white/20 text-white border-none text-[10px] font-black uppercase tracking-widest backdrop-blur-sm px-4 py-1">
            <Zap className="w-3 h-3 mr-2 inline" />
            LIVE · Pengundian Hakiki
          </Badge>
          <h1 className="text-5xl font-black tracking-tighter leading-none">
            {settings.title}
          </h1>
          <div className="flex items-center gap-6 pt-2">
            <div className="text-center">
              <p className="text-3xl font-black">{voteCounts.reduce((s, v) => s + Number(v.total_votes), 0)}</p>
              <p className="text-[10px] font-black uppercase opacity-70">Jumlah Undi</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-black">{voteCounts.length}</p>
              <p className="text-[10px] font-black uppercase opacity-70">Kelab Bertanding</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className={cn("text-3xl font-black", remainingVotes === 0 ? "opacity-50" : "text-yellow-300")}>
                {remainingVotes}
              </p>
              <p className="text-[10px] font-black uppercase opacity-70">Undi Berbaki</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ADMIN CONTROLS ── */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => toggleSetting('karnival_voting_enabled', settings.voting_enabled)}
            className={cn(
              "p-5 rounded-[1.5rem] border-2 text-left transition-all font-black text-sm",
              settings.voting_enabled
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                : "border-border bg-card text-muted-foreground hover:border-primary"
            )}
          >
            <Vote className="w-5 h-5 mb-2" />
            <p className="font-black uppercase text-[10px] tracking-widest mb-1">Pengundian</p>
            <p className="text-lg">{settings.voting_enabled ? '🟢 Dibuka' : '🔴 Ditutup'}</p>
          </button>
          <button
            onClick={() => toggleSetting('karnival_registration_open', settings.registration_open)}
            className={cn(
              "p-5 rounded-[1.5rem] border-2 text-left transition-all font-black text-sm",
              settings.registration_open
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                : "border-border bg-card text-muted-foreground hover:border-primary"
            )}
          >
            <Users className="w-5 h-5 mb-2" />
            <p className="font-black uppercase text-[10px] tracking-widest mb-1">Pendaftaran Kelab</p>
            <p className="text-lg">{settings.registration_open ? '🟢 Dibuka' : '🔴 Ditutup'}</p>
          </button>
        </div>
      )}

      {/* ── STATUS VOTING ── */}
      {!settings.voting_enabled && (
        <div className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-amber-500/10 border border-amber-200">
          <Lock className="text-amber-600 shrink-0" size={20} />
          <div>
            <p className="font-black text-amber-800 text-sm">Pengundian Belum Dibuka</p>
            <p className="text-xs text-amber-600 font-medium">
              Pihak JPP akan membuka pengundian apabila masa tiba. Sila tunggu!
            </p>
          </div>
        </div>
      )}

      {/* ── PODIUM TOP 3 ── */}
      {!isLoading && top3.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Trophy className="text-amber-500" size={24} /> Podium Teratas
            </h2>
            <button
              onClick={() => { queryCache.invalidate('karnival_vote_counts'); fetchVoteCounts(); }}
              className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 items-end">
            {/* Silver (2nd) */}
            {top3[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <PodiumCard
                  item={top3[1]} rank={1} styles={RANK_STYLES[1]}
                  hasVoted={myVotes.includes(top3[1].kelab_id)}
                  isVoting={votingIds.has(top3[1].kelab_id)}
                  votingEnabled={settings.voting_enabled}
                  onVote={handleVote}
                  height="h-44"
                />
              </motion.div>
            )}
            {/* Gold (1st) */}
            {top3[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
              >
                <PodiumCard
                  item={top3[0]} rank={0} styles={RANK_STYLES[0]}
                  hasVoted={myVotes.includes(top3[0].kelab_id)}
                  isVoting={votingIds.has(top3[0].kelab_id)}
                  votingEnabled={settings.voting_enabled}
                  onVote={handleVote}
                  height="h-56"
                />
              </motion.div>
            )}
            {/* Bronze (3rd) */}
            {top3[2] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <PodiumCard
                  item={top3[2]} rank={2} styles={RANK_STYLES[2]}
                  hasVoted={myVotes.includes(top3[2].kelab_id)}
                  isVoting={votingIds.has(top3[2].kelab_id)}
                  votingEnabled={settings.voting_enabled}
                  onVote={handleVote}
                  height="h-36"
                />
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ── SENARAI KELAB LAIN ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-[1.5rem]" />)}
        </div>
      ) : (
        <>
          {rest.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-black text-muted-foreground text-[10px] uppercase tracking-widest">
                Kelab Lain
              </h3>
              <AnimatePresence>
                {rest.map((item, idx) => (
                  <motion.div
                    key={item.kelab_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <VoteListItem
                      item={item}
                      rank={idx + 4}
                      hasVoted={myVotes.includes(item.kelab_id)}
                      isVoting={votingIds.has(item.kelab_id)}
                      votingEnabled={settings.voting_enabled}
                      onVote={handleVote}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {voteCounts.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Activity size={40} className="mx-auto mb-4 opacity-20" />
              <p className="font-black uppercase text-sm tracking-widest">Tiada undian lagi</p>
              <p className="text-xs mt-1">Jadilah yang pertama mengundi!</p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Sub-komponen ─────────────────────────────────────────────────────────────
function PodiumCard({ item, rank, styles, hasVoted, isVoting, votingEnabled, onVote, height }: any) {
  return (
    <div className={cn("flex flex-col items-center gap-3", height)}>
      <div className="text-center">
        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">{styles.label}</p>
        <p className="font-black text-sm line-clamp-2 text-center max-w-[100px]">{item.kelab_name}</p>
        <p className="text-2xl font-black text-primary mt-1">{item.total_votes}</p>
        <p className="text-[9px] text-muted-foreground font-bold uppercase">undi</p>
      </div>
      <button
        onClick={() => !hasVoted && votingEnabled && onVote(item.kelab_id, item.kelab_name)}
        disabled={hasVoted || isVoting || !votingEnabled}
        className={cn(
          "w-full h-10 rounded-2xl text-[10px] font-black uppercase transition-all",
          hasVoted
            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200 cursor-default"
            : votingEnabled
            ? "bg-primary text-white hover:scale-105 active:scale-95 shadow-lg"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {isVoting ? '...' : hasVoted ? <><CheckCircle2 size={12} className="inline mr-1" />Sudah Undi</> : <><Star size={12} className="inline mr-1" />Undi</>}
      </button>
    </div>
  );
}

function VoteListItem({ item, rank, hasVoted, isVoting, votingEnabled, onVote }: any) {
  return (
    <Card className="border-none bg-card shadow-sm rounded-[1.5rem] overflow-hidden">
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center font-black text-muted-foreground">
            {rank}
          </div>
          <div>
            <p className="font-black text-sm">{item.kelab_name}</p>
            <p className="text-xs text-muted-foreground font-bold">{item.total_votes} undi</p>
          </div>
        </div>
        <Button
          onClick={() => !hasVoted && votingEnabled && onVote(item.kelab_id, item.kelab_name)}
          disabled={hasVoted || isVoting || !votingEnabled}
          size="sm"
          className={cn(
            "rounded-xl h-9 px-5 text-[10px] font-black uppercase min-w-[90px]",
            hasVoted ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10" : ""
          )}
          variant={hasVoted ? "ghost" : "default"}
        >
          {isVoting ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : hasVoted ? (
            <><CheckCircle2 size={12} className="mr-1" />Diundi</>
          ) : (
            <><Vote size={12} className="mr-1" />Undi</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
