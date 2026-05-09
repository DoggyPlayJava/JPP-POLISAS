import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useKarnival, KarnivalBooth, KarnivalCategory } from '@/contexts/KarnivalContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import {
  Trophy, QrCode, CheckCircle2, Loader2, AlertCircle,
  Lock, ArrowLeft, Star,
} from 'lucide-react';

export function KarnivalVotePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const boothId = searchParams.get('booth');

  const { edition, categories, booths, votingOpen } = useKarnival();
  const { user, profile, isAuthenticated } = useAuth();

  const [booth,         setBooth]         = useState<KarnivalBooth | null>(null);
  const [category,      setCategory]      = useState<KarnivalCategory | null>(null);
  const [myVotesInCat,  setMyVotesInCat]  = useState<string[]>([]); // booth_ids yang dah diundi
  const [alreadyVoted,  setAlreadyVoted]  = useState(false);
  const [maxReached,    setMaxReached]    = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [success,       setSuccess]       = useState(false);
  const [dataLoading,   setDataLoading]   = useState(true);

  // ── Resolve booth dari URL param ──────────────────────────
  useEffect(() => {
    if (!boothId || booths.length === 0) return;
    const found = booths.find(b => b.id === boothId);
    setBooth(found ?? null);
  }, [boothId, booths]);

  // ── Resolve kategori dari booth ────────────────────────────
  useEffect(() => {
    if (!booth) return;
    const cat = categories.find(c => c.id === booth.category_id);
    setCategory(cat ?? null);
  }, [booth, categories]);

  // ── Semak status undi pelajar ──────────────────────────────
  useEffect(() => {
    if (!user || !category || !booth) { setDataLoading(false); return; }

    supabase.rpc('get_my_karnival_votes_in_category', { p_category_id: category.id })
      .then(({ data }) => {
        const votedBoothIds = (data ?? []).map((v: any) => v.booth_id as string);
        setMyVotesInCat(votedBoothIds);
        setAlreadyVoted(votedBoothIds.includes(booth.id));
        setMaxReached(votedBoothIds.length >= (category.max_votes ?? 1));
        setDataLoading(false);
      });
  }, [user, category, booth]);

  // ── Submit undi ────────────────────────────────────────────
  const handleVote = async () => {
    if (!user || !booth || !category || !edition) return;
    setSubmitting(true);

    const { error } = await supabase
      .from('karnival_votes_v2')
      .insert({
        edition_id:  edition.id,
        category_id: category.id,
        booth_id:    booth.id,
        voter_id:    user.id,
        matric_no:   profile?.matric_no ?? null,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Anda sudah mengundi booth ini!');
        setAlreadyVoted(true);
      } else {
        toast.error('Ralat: ' + error.message);
      }
    } else {
      setSuccess(true);
      setAlreadyVoted(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }
    setSubmitting(false);
  };

  // ── Redirect ke login kalau belum login ────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-5"
        >
          <div className="w-20 h-20 rounded-3xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-center mx-auto">
            <Lock className="w-9 h-9 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white mb-2">Log Masuk Diperlukan</h1>
            <p className="text-sm text-white/50">Anda perlu log masuk untuk mengundi dalam Karnival JPP.</p>
          </div>
          <button
            onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
            className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black transition-all active:scale-95 shadow-lg shadow-violet-500/25"
          >
            Log Masuk Sekarang
          </button>
          <button onClick={() => navigate('/karnival')} className="text-sm text-white/30 hover:text-white/60 transition-colors">
            Kembali ke Karnival
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────
  if (dataLoading || !booth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
          {!booth && !dataLoading && boothId && (
            <div className="space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-white/50 text-sm">Booth tidak dijumpai.</p>
              <button onClick={() => navigate('/karnival')} className="text-violet-400 text-sm hover:text-violet-300">
                Kembali ke Karnival
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-sm w-full text-center space-y-5"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-24 h-24 rounded-3xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black text-white mb-2">Undi Berjaya! 🎉</h1>
            <p className="text-sm text-white/50">
              Anda telah mengundi <span className="text-white font-bold">{booth.kelab_name}</span>
              {category && <> untuk kategori <span className="text-violet-300 font-bold">{category.icon_emoji} {category.name}</span></>}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/karnival')}
              className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black transition-all active:scale-95"
            >
              Lihat Semua Booth
            </button>
            <button
              onClick={() => navigate('/karnival/scoreboard')}
              className="w-full py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-bold text-sm transition-all"
            >
              Lihat Papan Markah
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main vote page ─────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full space-y-5"
      >
        {/* Back */}
        <button
          onClick={() => navigate('/karnival')}
          className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali
        </button>

        {/* Booth card */}
        <div className="rounded-3xl overflow-hidden border border-white/[0.08] bg-white/[0.03]">
          {booth.image_url ? (
            <div className="h-48 overflow-hidden">
              <img src={booth.image_url} alt={booth.kelab_name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </div>
          ) : (
            <div className="h-36 bg-gradient-to-br from-violet-900/50 via-purple-900/30 to-[#0d0d1a] flex items-center justify-center">
              <Trophy className="w-14 h-14 text-violet-500/20" />
            </div>
          )}

          <div className="p-6 space-y-1">
            {booth.booth_number && (
              <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-600/15 px-2 py-0.5 rounded-full">
                {booth.booth_number}
              </span>
            )}
            <h1 className="text-2xl font-black text-white mt-2">{booth.kelab_name}</h1>
            {booth.theme && (
              <p className="text-sm text-white/50 italic">"{booth.theme}"</p>
            )}
            {category && (
              <p className="text-xs text-violet-300/70 font-bold mt-1">
                {category.icon_emoji} {category.name}
              </p>
            )}
            {booth.description && (
              <p className="text-xs text-white/40 mt-2 leading-relaxed">{booth.description}</p>
            )}
          </div>
        </div>

        {/* Voting section */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">

          {/* Voting status */}
          {category && (
            <div className="text-xs text-white/40">
              Undi anda dalam kategori ini:
              <span className="text-white font-bold ml-1">
                {myVotesInCat.length} / {category.max_votes}
              </span>
            </div>
          )}

          {/* States */}
          <AnimatePresence mode="wait">
            {!votingOpen ? (
              <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-amber-300">Pengundian Belum Dibuka</p>
                <p className="text-xs text-white/40 mt-1">Tunggu pengumuman daripada Exco KPP</p>
              </motion.div>
            ) : alreadyVoted ? (
              <motion.div key="voted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-300">Sudah Diundi ✓</p>
                <p className="text-xs text-white/40 mt-1">Anda telah mengundi booth ini</p>
              </motion.div>
            ) : maxReached ? (
              <motion.div key="max" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-amber-300">Had Undi Tercapai</p>
                <p className="text-xs text-white/40 mt-1">
                  Anda sudah mengundi {category?.max_votes} kali dalam kategori {category?.name}
                </p>
              </motion.div>
            ) : (
              <motion.div key="vote" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button
                  onClick={handleVote}
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-base transition-all active:scale-95 shadow-xl shadow-violet-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengundi...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      Undi Sekarang
                    </>
                  )}
                </button>
                <p className="text-[10px] text-white/50 text-center mt-2">
                  Undi anda tidak boleh dibatalkan selepas ini
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="text-center">
          <p className="text-[10px] text-white/50">
            Mengundi sebagai <span className="text-white/50">{profile?.full_name ?? user?.email}</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
