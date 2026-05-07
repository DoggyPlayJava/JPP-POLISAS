import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useKarnival, KarnivalCategory } from '@/contexts/KarnivalContext';
import { Trophy, QrCode, Users, ChevronRight, Loader2, CalendarDays, AlertCircle } from 'lucide-react';

export function KarnivalLandingPage() {
  const { edition, categories, booths, isActive, votingOpen, isLoading } = useKarnival();
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const selectedCat = activeCat
    ? categories.find(c => c.id === activeCat)
    : (categories[0] ?? null);

  const filteredBooths = useMemo(() => {
    if (!selectedCat) return [];
    return booths.filter(b => b.category_id === selectedCat.id);
  }, [booths, selectedCat]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-violet-600/10 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-violet-500/40" />
          </div>
          <p className="text-xl font-black text-white">Tiada Karnival Aktif</p>
          <p className="text-sm text-white/40">Karnival JPP belum bermula. Pantau laman ini dari masa ke masa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-16">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-900/40 via-purple-900/30 to-[#0d0d1a] p-8 md:p-12"
      >
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-purple-600/10 blur-3xl" />
        </div>

        <div className="relative">
          {/* Status badge */}
          <div className="mb-4 inline-flex items-center gap-2">
            {isActive ? (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/25 border border-violet-400/30 text-xs font-black text-violet-300 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Karnival Sedang Berlangsung
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-black text-white/40 uppercase tracking-widest">
                Tidak Aktif
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2">
            {edition.name}
          </h1>
          {edition.tagline && (
            <p className="text-lg text-violet-300/80 font-medium mb-6">{edition.tagline}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-white/50">
            {edition.start_date && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {new Date(edition.start_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              {categories.length} Kategori Pertandingan
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {booths.length} Booth Bertanding
            </span>
          </div>

          {/* Voting CTA */}
          {votingOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-4 rounded-2xl bg-violet-600/20 border border-violet-400/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600/30 flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Pengundian Sedang Dibuka! 🎉</p>
                  <p className="text-xs text-violet-300/70">Scan QR code di setiap booth untuk mengundi</p>
                </div>
              </div>
            </motion.div>
          )}

          {isActive && !votingOpen && (
            <div className="mt-6 p-4 rounded-2xl bg-amber-600/10 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-300/80">Pengundian belum dibuka. Tunggu pengumuman daripada Exco KPP.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Kategori + Booth ─────────────────────────────────── */}
      {categories.length > 0 && (
        <div className="grid md:grid-cols-[240px_1fr] gap-6">

          {/* Kategori sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Kategori Pertandingan</p>
            {categories.map((cat: KarnivalCategory) => {
              const boothCount = booths.filter(b => b.category_id === cat.id).length;
              const isSelected = (activeCat ?? categories[0]?.id) === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
                    isSelected
                      ? 'bg-violet-600/25 border border-violet-500/40'
                      : 'bg-white/[0.03] border border-white/[0.14] hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{cat.icon_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black leading-tight ${isSelected ? 'text-white' : 'text-white/70'}`}>
                      {cat.name}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">{boothCount} booth · max {cat.max_votes} undi</p>
                  </div>
                  {isSelected && <ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0" />}
                </button>
              );
            })}
          </motion.div>

          {/* Booth list */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {selectedCat && (
              <div className="mb-4">
                <h2 className="text-lg font-black text-white">
                  {selectedCat.icon_emoji} {selectedCat.name}
                </h2>
                {selectedCat.description && (
                  <p className="text-sm text-white/40 mt-1">{selectedCat.description}</p>
                )}
                <p className="text-xs text-violet-300/60 mt-1">
                  Had undi: {selectedCat.max_votes} undi per pelajar dalam kategori ini
                </p>
              </div>
            )}

            {filteredBooths.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Trophy className="w-12 h-12 text-white/10 mb-3" />
                <p className="text-sm text-white/30 font-bold">Tiada booth didaftarkan lagi</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredBooths.map((booth, i) => (
                  <motion.div
                    key={booth.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                  >
                    {/* Image */}
                    {booth.image_url ? (
                      <div className="h-32 overflow-hidden">
                        <img
                          src={booth.image_url}
                          alt={booth.kelab_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : (
                      <div className="h-24 bg-gradient-to-br from-violet-900/30 to-purple-900/20 flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-violet-500/20" />
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {booth.booth_number && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-600/15 px-2 py-0.5 rounded-full">
                              {booth.booth_number}
                            </span>
                          )}
                          <p className="font-black text-sm text-white mt-1 leading-tight">{booth.kelab_name}</p>
                          {booth.theme && (
                            <p className="text-[11px] text-white/40 mt-0.5">"{booth.theme}"</p>
                          )}
                        </div>
                      </div>

                      {/* Undi button */}
                      {votingOpen && (
                        <button
                          onClick={() => navigate(`/karnival/undi?booth=${booth.id}`)}
                          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-violet-500/20"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Undi Booth Ini
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {categories.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <Trophy className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 font-bold">Kategori belum ditetapkan lagi</p>
        </div>
      )}
    </div>
  );
}
