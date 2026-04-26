import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useKarnival } from '@/contexts/KarnivalContext';
import { supabase } from '@/lib/supabase';
import { Trophy, Loader2, Download, RefreshCw } from 'lucide-react';

interface BoothResult {
  booth_id: string;
  booth_name: string;
  booth_number: string | null;
  image_url: string | null;
  total_votes: number;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export function KarnivalAdminResults() {
  const { edition, categories, lastUpdated } = useKarnival();
  const [activeCat,  setActiveCat]  = useState<string | null>(null);
  const [results,    setResults]    = useState<BoothResult[]>([]);
  const [loading,    setLoading]    = useState(false);

  const selectedCat = activeCat
    ? categories.find(c => c.id === activeCat)
    : categories[0];

  const fetchResults = useCallback(async () => {
    if (!edition || !selectedCat) return;
    setLoading(true);
    const { data } = await supabase.rpc('get_karnival_booth_votes', {
      p_edition_id:  edition.id,
      p_category_id: selectedCat.id,
    });
    setResults((data ?? []) as BoothResult[]);
    setLoading(false);
  }, [edition, selectedCat]);

  useEffect(() => { fetchResults(); }, [fetchResults, lastUpdated]);

  // ── Export CSV ──────────────────────────────────────────────
  const exportCsv = () => {
    const header = ['Kedudukan', 'Booth', 'No. Booth', 'Jumlah Undi'];
    const rows   = results.map((b, i) => [i + 1, b.booth_name, b.booth_number ?? '', b.total_votes]);
    const csv    = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Keputusan-${selectedCat?.name ?? 'Karnival'}-${edition?.edition_year ?? ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!edition) {
    return (
      <div className="text-center py-16 text-white/55">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-bold">Tiada edisi Karnival</p>
      </div>
    );
  }

  const maxVotes = results[0]?.total_votes ?? 1;

  return (
    <div className="space-y-5">

      {/* ── Category tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0 ${
              (activeCat ?? categories[0]?.id) === cat.id
                ? 'bg-violet-600 text-white'
                : 'bg-white/[0.04] border border-white/[0.15] text-white/50 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {cat.icon_emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-black text-white">
            {selectedCat ? `${selectedCat.icon_emoji} ${selectedCat.name}` : 'Keputusan'}
          </h2>
          <p className="text-xs text-white/60 mt-0.5">{results.length} booth bertanding</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchResults}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 hover:bg-white/[0.06] border border-white/[0.14] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {results.length > 0 && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-xs font-bold text-emerald-400 border border-emerald-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────────── */}
      {loading && results.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-16 h-16 text-white/10 mx-auto mb-3" />
          <p className="text-white/55 font-bold">Belum ada undi lagi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((booth, rank) => {
            const pct     = maxVotes > 0 ? (booth.total_votes / maxVotes) * 100 : 0;
            const medal   = RANK_MEDALS[rank];
            const isTop3  = rank < 3;

            return (
              <motion.div
                key={booth.booth_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rank * 0.04 }}
                className={`rounded-2xl border p-4 flex items-center gap-4 ${
                  isTop3
                    ? 'border-violet-500/20 bg-violet-600/5'
                    : 'border-white/[0.14] bg-white/[0.06]'
                }`}
              >
                {/* Rank */}
                <div className="w-10 text-center text-2xl flex-shrink-0">
                  {medal ?? <span className="text-sm font-black text-white/45">{rank + 1}</span>}
                </div>

                {/* Booth image */}
                {booth.image_url ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={booth.image_url} alt={booth.booth_name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-violet-600/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-violet-500/30" />
                  </div>
                )}

                {/* Info + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div>
                      {booth.booth_number && (
                        <span className="text-[10px] font-black text-violet-400/60 mr-1">{booth.booth_number}</span>
                      )}
                      <span className="text-sm font-black text-white">{booth.booth_name}</span>
                    </div>
                    <span className="text-base font-black text-violet-300 flex-shrink-0">
                      {booth.total_votes.toLocaleString()}
                      <span className="text-xs text-white/55 font-medium ml-1">undi</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: rank * 0.05 }}
                      className={`h-full rounded-full ${
                        rank === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                        rank === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400' :
                        rank === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                        'bg-violet-600'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
