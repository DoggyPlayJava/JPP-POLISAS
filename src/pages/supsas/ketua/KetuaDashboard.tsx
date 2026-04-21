import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Users, Plus, Search, Trash2, Star, X, Loader, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas, SupsasKontingen } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Profile { id: string; full_name: string; matric_no: string | null; avatar_url: string | null; }
interface Participant { id: string; profile_id: string; sport_id: string; position: string | null; is_confirmed: boolean; jersey_number: number | null; profiles?: Profile; }

export function KetuaDashboard() {
  const { myKontingen } = useOutletContext<{ myKontingen: SupsasKontingen }>();
  const { sports, edition, refetch } = useSupsas();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingPart, setLoadingPart] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  // Fetch participants for this kontingen
  const fetchParticipants = async () => {
    setLoadingPart(true);
    const { data } = await supabase
      .from('supsas_participants')
      .select('*, profiles:profile_id(id, full_name, matric_no, avatar_url)')
      .eq('kontingen_id', myKontingen.id);
    setLoadingPart(false);
    if (data) setParticipants(data as Participant[]);
  };

  useEffect(() => { fetchParticipants(); }, [myKontingen.id]);

  // Search profiles
  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, matric_no, avatar_url')
        .or(`full_name.ilike.%${searchTerm}%,matric_no.ilike.%${searchTerm}%`)
        .limit(10);
      setSearching(false);
      setSearchResults(data as Profile[] ?? []);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleAdd = async (person: Profile) => {
    if (!edition || !selectedSport) { toast.error('Sila pilih sukan'); return; }

    // S-3: Enforce max_per_team limit
    const sportObj = sports.find(s => s.id === selectedSport);
    const currentCount = participants.filter(p => p.sport_id === selectedSport).length;
    if (sportObj && currentCount >= sportObj.max_per_team) {
      toast.error(`Had maksimum ${sportObj.max_per_team} peserta untuk ${sportObj.name} telah dicapai`);
      return;
    }

    // P-5: Check cross-kontingen — pelajar ini tidak boleh dalam kontingen lain untuk sukan yang sama
    const { data: existing } = await supabase
      .from('supsas_participants')
      .select('id, kontingen_id')
      .eq('edition_id', edition.id)
      .eq('sport_id', selectedSport)
      .eq('profile_id', person.id)
      .maybeSingle();

    if (existing) {
      if (existing.kontingen_id !== myKontingen.id) {
        toast.error(`${person.full_name} sudah didaftarkan dalam kontingen lain untuk sukan ini.`);
      } else {
        toast.error('Pelajar ini sudah didaftarkan dalam sukan ini.');
      }
      return;
    }

    setAdding(person.id);
    const { error } = await supabase.from('supsas_participants').insert({
      edition_id: edition.id,
      kontingen_id: myKontingen.id,
      sport_id: selectedSport,
      profile_id: person.id,
    });
    setAdding(null);
    if (error) {
      toast.error(error.message.includes('unique') ? 'Pelajar ini sudah didaftarkan dalam sukan ini' : 'Gagal daftar: ' + error.message);
      return;
    }
    toast.success(`${person.full_name} berjaya didaftarkan!`);
    fetchParticipants();
    setSearchTerm('');
    setSearchResults([]);
  };


  const handleRemove = async (part: Participant) => {
    if (!confirm('Padam peserta ini?')) return;
    const { error } = await supabase.from('supsas_participants').delete().eq('id', part.id);
    if (error) { toast.error('Gagal padam'); return; }
    toast.success('Peserta dipadam');
    fetchParticipants();
  };

  // Group participants by sport
  const bySport: Record<string, Participant[]> = {};
  participants.forEach(p => {
    if (!bySport[p.sport_id]) bySport[p.sport_id] = [];
    bySport[p.sport_id].push(p);
  });

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Sukan Disertai', value: Object.keys(bySport).length, icon: '🏅' },
          { label: 'Jumlah Peserta', value: participants.length, icon: '👥' },
          { label: 'Penyertaan Disahkan', value: participants.filter(p => p.is_confirmed).length, icon: '✅' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <span className="text-2xl">{icon}</span>
            <p className="text-2xl font-black text-white mt-2">{value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Senarai Peserta</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Daftar Peserta
        </button>
      </div>

      {/* Participants grouped by sport */}
      {loadingPart ? (
        <div className="flex justify-center py-12"><Loader className="w-8 h-8 text-amber-400 animate-spin" /></div>
      ) : Object.entries(bySport).length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-black uppercase tracking-widest">Belum ada peserta didaftarkan</p>
          <p className="text-xs mt-1">Klik "Daftar Peserta" untuk mula mendaftarkan ahli kontinjen anda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(bySport).map(([sportId, parts]) => {
            const sport = sports.find(s => s.id === sportId);
            return (
              <div key={sportId}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 rounded-full bg-amber-500" />
                  <h3 className="font-black text-white text-sm">{sport?.name ?? 'Sukan'}</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-auto">
                    {parts.length} / {sport?.max_per_team ?? '—'} peserta
                  </span>
                </div>
                <div className="space-y-2">
                  {parts.map((part, i) => (
                    <motion.div
                      key={part.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-white/40 flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-sm truncate">{(part as any).profiles?.full_name ?? '—'}</p>
                        <p className="text-[9px] text-white/30 font-bold">{(part as any).profiles?.matric_no ?? '—'}</p>
                      </div>
                      {part.is_confirmed
                        ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        : <span className="text-[9px] px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black uppercase tracking-widest flex-shrink-0">Menunggu</span>
                      }
                      <button onClick={() => handleRemove(part)} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Participant Modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)} className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-x-4 bottom-4 top-16 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[500px] z-50 bg-[#0A1628] border border-white/10 rounded-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.7)] overflow-y-auto"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-white">Daftar Peserta</h2>
                  <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sport picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Pilih Sukan</label>
                  <div className="flex flex-wrap gap-2">
                    {sports.map(s => (
                      <button key={s.id} onClick={() => setSelectedSport(s.id)}
                        className={cn('px-3 py-2 rounded-xl text-[10px] font-black border transition-all',
                          selectedSport === s.id ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                        )}>{s.name}</button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Cari Pelajar</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    {searching && <Loader className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 animate-spin" />}
                    <input
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Nama atau No. Matrik..."
                      className="w-full pl-11 pr-11 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all"
                    />
                  </div>

                  {/* Results */}
                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        className="space-y-1 max-h-60 overflow-y-auto pr-1"
                      >
                        {searchResults.map(person => (
                          <button key={person.id} onClick={() => handleAdd(person)} disabled={adding === person.id}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all text-left group"
                          >
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-black text-amber-400 flex-shrink-0">
                              {person.full_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-white text-sm truncate">{person.full_name}</p>
                              <p className="text-[9px] text-white/30">{person.matric_no ?? '—'}</p>
                            </div>
                            {adding === person.id
                              ? <Loader className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                              : <Plus className="w-4 h-4 text-white/20 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                            }
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {searchTerm.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-center text-white/20 text-xs py-3 font-medium">Tiada pelajar dijumpai</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
