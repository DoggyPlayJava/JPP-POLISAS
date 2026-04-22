import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Users, Plus, Search, Trash2, CheckCircle, X, Loader, ChevronDown, ChevronUp, Edit2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas, SupsasKontingen, SupsasTeam } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Profile { id: string; full_name: string; matric_no: string | null; avatar_url: string | null; }
interface Participant { id: string; profile_id: string; sport_id: string; team_id: string | null; position: string | null; is_confirmed: boolean; profiles?: Profile; }

// ─── Sub-component: TeamCard ──────────────────────────────────
function TeamCard({
  team, maxPlayers, participants, onAddPlayer, onRemovePlayer, onRenameTeam, onDeleteTeam,
}: {
  team: SupsasTeam;
  maxPlayers: number;
  participants: Participant[];
  onAddPlayer: (team: SupsasTeam) => void;
  onRemovePlayer: (part: Participant) => void;
  onRenameTeam: (team: SupsasTeam, newName: string) => void;
  onDeleteTeam: (team: SupsasTeam) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(team.name);
  const isFull = participants.length >= maxPlayers;

  const handleRename = async () => {
    if (!nameInput.trim() || nameInput === team.name) { setRenaming(false); return; }
    await onRenameTeam(team, nameInput.trim());
    setRenaming(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden"
    >
      {/* Team Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0',
          isFull ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
        )}>
          {team.group_number}
        </div>

        {renaming ? (
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="flex-1 bg-white/5 border border-amber-500/30 rounded-xl px-3 py-1 text-sm font-black text-white focus:outline-none"
          />
        ) : (
          <span className="flex-1 text-sm font-black text-white truncate">{team.name}</span>
        )}

        {/* Pemain count badge */}
        <span className={cn(
          'text-[9px] font-black px-2 py-0.5 rounded-lg border',
          isFull ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/30'
        )}>
          {participants.length}/{maxPlayers}
          {isFull ? ' ✓' : ''}
        </span>

        {/* Actions */}
        {renaming ? (
          <button onClick={handleRename} className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
            <Save className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={() => { setRenaming(true); setNameInput(team.name); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all">
            <Edit2 className="w-3 h-3" />
          </button>
        )}
        <button onClick={() => onDeleteTeam(team)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 className="w-3 h-3" />
        </button>
        <button onClick={() => setExpanded(p => !p)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-white transition-all">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Players List */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="px-4 py-3 space-y-2">
              {participants.length === 0 && (
                <p className="text-xs text-white/20 text-center py-2">Tiada pemain lagi</p>
              )}
              {participants.map((part, i) => (
                <div key={part.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.015]">
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-black text-white/30 flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate">{(part as any).profiles?.full_name ?? '—'}</p>
                    <p className="text-[9px] text-white/30">{(part as any).profiles?.matric_no ?? '—'}</p>
                  </div>
                  {part.is_confirmed
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    : <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black">Menunggu</span>
                  }
                  <button onClick={() => onRemovePlayer(part)} className="w-6 h-6 flex items-center justify-center rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add player button inside card */}
              {!isFull && (
                <button
                  onClick={() => onAddPlayer(team)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-amber-400 hover:border-amber-500/30 text-xs font-black transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Pemain
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Add Player Modal ─────────────────────────────────────────
function AddPlayerModal({ team, sport, editionId, kontingenId, allParticipants, onClose, onAdded }: {
  team: SupsasTeam;
  sport: { id: string; name: string; max_players_per_group: number };
  editionId: string;
  kontingenId: string;
  allParticipants: Participant[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from('profiles').select('id, full_name, matric_no, avatar_url')
        .or(`full_name.ilike.%${searchTerm}%,matric_no.ilike.%${searchTerm}%`).limit(10);
      setSearching(false);
      setSearchResults(data as Profile[] ?? []);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleAdd = async (person: Profile) => {
    // Check if already registered for this sport anywhere (any team/kumpulan)
    const alreadyInSport = allParticipants.find(p => p.profile_id === person.id && p.sport_id === sport.id);
    if (alreadyInSport) {
      toast.error(`${person.full_name} sudah didaftarkan dalam sukan ini (kumpulan lain).`);
      return;
    }

    // Check cross-kontingen
    const { data: crossKont } = await supabase.from('supsas_participants')
      .select('id, kontingen_id').eq('edition_id', editionId).eq('sport_id', sport.id).eq('profile_id', person.id).maybeSingle();
    if (crossKont && crossKont.kontingen_id !== kontingenId) {
      toast.error(`${person.full_name} sudah dalam kontingen lain untuk sukan ini.`);
      return;
    }

    setAdding(person.id);
    const { error } = await supabase.from('supsas_participants').insert({
      edition_id: editionId,
      kontingen_id: kontingenId,
      sport_id: sport.id,
      team_id: team.id,
      profile_id: person.id,
    });
    setAdding(null);
    if (error) { toast.error('Gagal daftar: ' + error.message); return; }
    toast.success(`${person.full_name} ditambah ke ${team.name}!`);
    onAdded();
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="fixed inset-x-4 bottom-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[480px] z-50 bg-[#0A1628] border border-white/10 rounded-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.7)] overflow-y-auto"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Tambah Pemain</h2>
              <p className="text-[11px] text-white/30 mt-0.5">{team.name} — {sport.name}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            {searching && <Loader className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 animate-spin" />}
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari nama atau no. matrik..."
              className="w-full pl-11 pr-11 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all" />
          </div>

          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1">
                {searchResults.map(person => (
                  <button key={person.id} onClick={() => handleAdd(person)} disabled={adding === person.id}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/6 hover:border-white/10 transition-all text-left group">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-black text-amber-400 flex-shrink-0">
                      {person.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm truncate">{person.full_name}</p>
                      <p className="text-[9px] text-white/30">{person.matric_no ?? '—'}</p>
                    </div>
                    {adding === person.id
                      ? <Loader className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                      : <Plus className="w-4 h-4 text-white/20 group-hover:text-amber-400 transition-colors flex-shrink-0" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {searchTerm.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-center text-white/20 text-xs py-3">Tiada pelajar dijumpai</p>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function KetuaDashboard() {
  const { myKontingen } = useOutletContext<{ myKontingen: SupsasKontingen }>();
  const { sports, teams: allTeams, edition, refetch } = useSupsas();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingPart, setLoadingPart] = useState(true);
  const [selectedSportId, setSelectedSportId] = useState<string>('');
  const [addPlayerTarget, setAddPlayerTarget] = useState<SupsasTeam | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Filter teams for this kontingen
  const myTeams = allTeams.filter(t => t.kontingen_id === myKontingen.id);

  const fetchParticipants = async () => {
    setLoadingPart(true);
    const { data } = await supabase.from('supsas_participants')
      .select('*, profiles:profile_id(id, full_name, matric_no, avatar_url)')
      .eq('kontingen_id', myKontingen.id);
    setLoadingPart(false);
    if (data) setParticipants(data as Participant[]);
  };

  useEffect(() => { fetchParticipants(); }, [myKontingen.id]);

  // Auto-select first sport
  useEffect(() => {
    if (sports.length > 0 && !selectedSportId) setSelectedSportId(sports[0].id);
  }, [sports]);

  const selectedSport = sports.find(s => s.id === selectedSportId);
  const teamsForSport = myTeams.filter(t => t.sport_id === selectedSportId);
  const maxGroups = selectedSport?.max_groups_per_kontingen ?? 1;
  const maxPlayersPerGroup = selectedSport?.max_players_per_group ?? 11;
  const canAddTeam = teamsForSport.length < maxGroups;
  const isSingleGroup = maxGroups === 1; // NEW: hide team complexity for single-group sports

  const handleCreateTeam = async () => {
    if (!edition || !selectedSport || !canAddTeam) return;
    setCreatingTeam(true);
    const nextNum = teamsForSport.length + 1;
    const defaultName = `${myKontingen.short_code} Kumpulan ${nextNum}`;
    const { error } = await supabase.from('supsas_teams').insert({
      edition_id: edition.id,
      sport_id: selectedSport.id,
      kontingen_id: myKontingen.id,
      name: defaultName,
      group_number: nextNum,
    });
    setCreatingTeam(false);
    if (error) { toast.error('Gagal cipta kumpulan: ' + error.message); return; }
    toast.success(`Kumpulan ${nextNum} berjaya dicipta!`);
    refetch();
  };

  // NEW: Auto-cipta team untuk single-group sport, then open add player modal
  const handleAddPlayerSingleGroup = async () => {
    if (!edition || !selectedSport) return;
    let team = teamsForSport[0];
    if (!team) {
      // Auto-cipta team
      setCreatingTeam(true);
      const { data, error } = await supabase.from('supsas_teams').insert({
        edition_id: edition.id,
        sport_id: selectedSport.id,
        kontingen_id: myKontingen.id,
        name: `${myKontingen.short_code}`,
        group_number: 1,
      }).select().maybeSingle();
      setCreatingTeam(false);
      if (error || !data) { toast.error('Gagal sedia pasukan: ' + (error?.message ?? '')); return; }
      team = data as any;
      await refetch();
    }
    setAddPlayerTarget(team);
  };

  const handleRenameTeam = async (team: SupsasTeam, newName: string) => {
    const { error } = await supabase.from('supsas_teams').update({ name: newName }).eq('id', team.id);
    if (error) { toast.error('Gagal ubah nama'); return; }
    toast.success('Nama kumpulan dikemas kini');
    refetch();
  };

  const handleDeleteTeam = async (team: SupsasTeam) => {
    const hasPlayers = participants.some(p => p.team_id === team.id);
    if (hasPlayers) { toast.error('Keluarkan semua pemain dahulu sebelum padam kumpulan.'); return; }
    const { error } = await supabase.from('supsas_teams').delete().eq('id', team.id);
    if (error) { toast.error('Gagal padam kumpulan'); return; }
    toast.success('Kumpulan dipadam');
    refetch();
  };

  const handleRemovePlayer = async (part: Participant) => {
    const { error } = await supabase.from('supsas_participants').delete().eq('id', part.id);
    if (error) { toast.error('Gagal padam pemain'); return; }
    toast.success('Pemain dikeluarkan');
    fetchParticipants();
  };

  // Stats
  const totalPlayers = participants.length;
  const totalTeams = myTeams.length;
  const totalSports = [...new Set(myTeams.map(t => t.sport_id))].length;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sukan Disertai', value: totalSports, icon: '🏅' },
          { label: 'Jumlah Kumpulan', value: totalTeams, icon: '🏸' },
          { label: 'Jumlah Pemain', value: totalPlayers, icon: '👥' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <span className="text-2xl">{icon}</span>
            <p className="text-2xl font-black text-white mt-2">{value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Sport Tabs */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3">Pilih Sukan</p>
        <div className="flex flex-wrap gap-2">
          {sports.map(s => {
            const myTeamsForSport = myTeams.filter(t => t.sport_id === s.id);
            return (
              <button key={s.id} onClick={() => setSelectedSportId(s.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2',
                  selectedSportId === s.id
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                )}>
                {s.name}
                {myTeamsForSport.length > 0 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-white/10">{myTeamsForSport.length}/{s.max_groups_per_kontingen}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Teams for selected sport */}
      {selectedSport && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">{selectedSport.name}</h2>
              <p className="text-[10px] text-white/30 mt-0.5">
                {isSingleGroup
                  ? `Max ${maxPlayersPerGroup} pemain`
                  : `Max ${maxGroups} kumpulan · ${maxPlayersPerGroup} pemain/kumpulan`}
              </p>
            </div>
            {/* Single-group: butang tambah pemain terus */}
            {isSingleGroup && (
              <button
                onClick={handleAddPlayerSingleGroup}
                disabled={creatingTeam || (teamsForSport[0] && participants.filter(p => p.team_id === teamsForSport[0]?.id).length >= maxPlayersPerGroup)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/25 transition-all disabled:opacity-50"
              >
                {creatingTeam ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Tambah Pemain
              </button>
            )}
            {/* Multi-group: butang tambah kumpulan */}
            {!isSingleGroup && canAddTeam && (
              <button
                onClick={handleCreateTeam}
                disabled={creatingTeam}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/25 transition-all disabled:opacity-50"
              >
                {creatingTeam ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Tambah Kumpulan
              </button>
            )}
          </div>

          {loadingPart ? (
            <div className="flex justify-center py-8"><Loader className="w-7 h-7 text-amber-400 animate-spin" /></div>
          ) : isSingleGroup ? (
            // ─── Single-group UI: senarai pemain terus ───────────
            <div className="space-y-2">
              {participants.filter(p => !teamsForSport[0] || p.team_id === teamsForSport[0].id).length === 0 ? (
                <div className="text-center py-14 rounded-2xl border border-dashed border-white/8">
                  <Users className="w-9 h-9 mx-auto mb-3 text-white/15" />
                  <p className="text-sm font-black text-white/20 uppercase tracking-widest">Belum ada pemain</p>
                  <p className="text-xs text-white/15 mt-1">Klik "Tambah Pemain" untuk mula</p>
                </div>
              ) : (
                (teamsForSport[0]
                  ? participants.filter(p => p.team_id === teamsForSport[0].id)
                  : []
                ).map((part, i) => (
                  <div key={part.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-black text-white/30 flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white truncate">{(part as any).profiles?.full_name ?? '—'}</p>
                      <p className="text-[9px] text-white/30">{(part as any).profiles?.matric_no ?? '—'}</p>
                    </div>
                    {part.is_confirmed
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      : <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black">Menunggu</span>
                    }
                    <button onClick={() => handleRemovePlayer(part)} className="w-6 h-6 flex items-center justify-center rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            // ─── Multi-group UI: TeamCard per kumpulan ────────────
            teamsForSport.length === 0 ? (
              <div className="text-center py-14 rounded-2xl border border-dashed border-white/8">
                <Users className="w-9 h-9 mx-auto mb-3 text-white/15" />
                <p className="text-sm font-black text-white/20 uppercase tracking-widest">Belum ada kumpulan</p>
                <p className="text-xs text-white/15 mt-1">Klik "Tambah Kumpulan" untuk mula</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamsForSport.map(team => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    maxPlayers={maxPlayersPerGroup}
                    participants={participants.filter(p => p.team_id === team.id)}
                    onAddPlayer={t => setAddPlayerTarget(t)}
                    onRemovePlayer={handleRemovePlayer}
                    onRenameTeam={handleRenameTeam}
                    onDeleteTeam={handleDeleteTeam}
                  />
                ))}
              </div>
            )
          )}

          {!isSingleGroup && !canAddTeam && teamsForSport.length > 0 && (
            <p className="text-center text-[10px] text-white/25 font-black uppercase tracking-widest">
              Had maksimum {maxGroups} kumpulan untuk sukan ini telah dicapai
            </p>
          )}
        </div>
      )}

      {/* Add Player Modal */}
      <AnimatePresence>
        {addPlayerTarget && selectedSport && edition && (
          <AddPlayerModal
            team={addPlayerTarget}
            sport={{ id: selectedSport.id, name: selectedSport.name, max_players_per_group: maxPlayersPerGroup }}
            editionId={edition.id}
            kontingenId={myKontingen.id}
            allParticipants={participants}
            onClose={() => setAddPlayerTarget(null)}
            onAdded={() => { fetchParticipants(); setAddPlayerTarget(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
