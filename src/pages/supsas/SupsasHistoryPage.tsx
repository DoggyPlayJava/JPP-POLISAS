/**
 * SupsasHistoryPage — N-5: Halaman sejarah semua edisi SUPSAS
 * Route: /supsas/sejarah
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, Medal, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface EditionStat {
  id: string;
  name: string;
  tagline: string | null;
  edition_year: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  // computed
  total_medals: number;
  total_fixtures: number;
  total_kontingen: number;
  champion: { name: string; short_code: string; color: string; gold: number } | null;
}

export function SupsasHistoryPage() {
  const [editions, setEditions] = useState<EditionStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: edData } = await supabase
        .from('supsas_editions')
        .select('*')
        .order('edition_year', { ascending: false });

      if (!edData || edData.length === 0) { setLoading(false); return; }

      const enriched: EditionStat[] = await Promise.all(
        edData.map(async (ed) => {
          const [mRes, fRes, kRes] = await Promise.all([
            supabase.from('supsas_medal_tally').select('*').eq('edition_id', ed.id),
            supabase.from('supsas_fixtures').select('id', { count: 'exact' }).eq('edition_id', ed.id).eq('status', 'completed'),
            supabase.from('supsas_kontingen').select('id', { count: 'exact' }).eq('edition_id', ed.id),
          ]);

          const tally = (mRes.data ?? []).sort((a: any, b: any) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze);
          const champion = tally[0]
            ? { name: tally[0].name, short_code: tally[0].short_code, color: tally[0].color, gold: tally[0].gold }
            : null;

          return {
            ...ed,
            total_medals: (mRes.data ?? []).reduce((s: number, t: any) => s + t.total_medals, 0),
            total_fixtures: fRes.count ?? 0,
            total_kontingen: kRes.count ?? 0,
            champion,
          };
        })
      );

      setEditions(enriched);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen pb-24 px-4 sm:px-6 md:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="pt-10 pb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Sejarah SUPSAS</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">
                Sukan Polisas — Rekod Semua Edisi
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : editions.length === 0 ? (
          <div className="text-center py-24">
            <Trophy className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-white/20 font-black uppercase tracking-widest text-sm">Tiada rekod edisi lagi</p>
          </div>
        ) : (
          <div className="space-y-4">
            {editions.map((ed, i) => (
              <motion.div
                key={ed.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={cn(
                  'relative p-6 rounded-3xl border transition-all overflow-hidden',
                  ed.is_active
                    ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/20'
                    : 'bg-white/[0.02] border-white/5'
                )}
              >
                {/* Active badge */}
                {ed.is_active && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Edisi Semasa</span>
                  </div>
                )}

                <div className="flex items-start gap-5">
                  {/* Year badge */}
                  <div className={cn(
                    'w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 border',
                    ed.is_active
                      ? 'bg-amber-500/20 border-amber-500/30'
                      : 'bg-white/5 border-white/10'
                  )}>
                    <span className={cn('text-2xl font-black leading-none', ed.is_active ? 'text-amber-400' : 'text-white/60')}>
                      {String(ed.edition_year).slice(-2)}
                    </span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{ed.edition_year}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-white leading-none">{ed.name}</h2>
                    {ed.tagline && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">{ed.tagline}</p>
                    )}

                    {/* Dates */}
                    {ed.start_date && (
                      <p className="text-[10px] font-medium text-white/20 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ed.start_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {ed.end_date && ` — ${new Date(ed.end_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                      </p>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-white/20" />
                        <span className="text-[10px] font-black text-white/30">{ed.total_kontingen} kontinjen</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-white/20" />
                        <span className="text-[10px] font-black text-white/30">{ed.total_fixtures} perlawanan</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Medal className="w-3 h-3 text-white/20" />
                        <span className="text-[10px] font-black text-white/30">{ed.total_medals} medal</span>
                      </div>
                    </div>

                    {/* Champion */}
                    {ed.champion && (
                      <div className="mt-4 flex items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
                        <span className="text-base">🏆</span>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ed.champion.color }}
                        />
                        <div>
                          <p className="text-xs font-black text-white leading-none">{ed.champion.name}</p>
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
                            Juara Keseluruhan · {ed.champion.gold} Emas
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-[9px] font-black uppercase tracking-widest text-white/10 mt-8">
          {editions.length} edisi direkodkan dalam sistem
        </p>
      </div>
    </div>
  );
}
