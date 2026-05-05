import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Save, X, Shuffle, CheckCircle, Loader, ChevronRight, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas, SupsasSport } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { AdminBracketPanel } from './components/AdminBracketPanel';

const SPORT_ICONS = ['Trophy', 'Volleyball', 'Dumbbell', 'Bike', 'Waves', 'Target', 'Footprints', 'Sword', 'Shield', 'Zap', 'Activity', 'Flame'];
const FORMATS = [{ value: 'knockout', label: 'Sistem Gugur (KO)' }, { value: 'round_robin', label: 'Liga (Round Robin)' }, { value: 'group_knockout', label: 'Kumpulan + Gugur' }];
const GENDERS = [{ value: 'male', label: 'Lelaki' }, { value: 'female', label: 'Wanita' }, { value: 'mixed', label: 'Campur' }];
const CATEGORIES = [{ value: 'team', label: 'Berpasukan' }, { value: 'individual', label: 'Individu' }];

interface SportForm { name: string; category: string; gender: string; format: string; icon: string; venue: string; max_per_team: number; max_groups_per_kontingen: number; max_players_per_group: number; sort_order: number; }
const DEFAULT_FORM: SportForm = { name: '', category: 'team', gender: 'mixed', format: 'knockout', icon: 'Trophy', venue: '', max_per_team: 11, max_groups_per_kontingen: 1, max_players_per_group: 11, sort_order: 0 };

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SPORT_ICONS.map((icon) => {
        const Ic = (props: any) => <DynamicIcon name={icon} fallback="Trophy" {...props} />;
        return (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={cn(
              'w-10 h-10 rounded-xl border flex items-center justify-center transition-all',
              value === icon
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-white/5 border-white/10 text-white/30 hover:text-white hover:border-white/20'
            )}
          >
            <Ic className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{label}</label>
      {children}
    </div>
  );
}

function inputCls() {
  return 'w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-amber-500/40 focus:bg-white/8 transition-all';
}

export function AdminSukanPage() {
  const { sports, edition, refetch, kontingen, fixtures } = useSupsas();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<SupsasSport | null>(null);
  const [form, setForm] = useState<SportForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [drawSport, setDrawSport] = useState<SupsasSport | null>(null);

  const openNew = () => { setForm(DEFAULT_FORM); setEditTarget(null); setShowForm(true); };
  const openEdit = (s: SupsasSport) => { setForm({ name: s.name, category: s.category, gender: s.gender, format: s.format, icon: s.icon, venue: s.venue ?? '', max_per_team: s.max_per_team, max_groups_per_kontingen: (s as any).max_groups_per_kontingen ?? 1, max_players_per_group: (s as any).max_players_per_group ?? 11, sort_order: s.sort_order }); setEditTarget(s); setShowForm(true); };

  const handleSave = async () => {
    if (!edition) { toast.error('Tiada edisi ditemui. Cipta edisi dahulu dalam Tetapan.'); return; }
    if (!form.name.trim()) { toast.error('Sila isi nama sukan'); return; }
    setSaving(true);
    const payload = { ...form, edition_id: edition.id };
    const { error } = editTarget
      ? await supabase.from('supsas_sports').update(payload).eq('id', editTarget.id)
      : await supabase.from('supsas_sports').insert(payload);
    setSaving(false);
    if (error) { toast.error('Gagal simpan: ' + error.message); return; }
    toast.success(editTarget ? 'Sukan dikemas kini!' : 'Sukan ditambah!');
    setShowForm(false);
    refetch();
  };


  const handleToggle = async (sport: SupsasSport) => {
    const { error } = await supabase.from('supsas_sports').update({ is_active: !sport.is_active }).eq('id', sport.id);
    if (error) { toast.error('Gagal kemaskini'); return; }
    toast.success(sport.is_active ? 'Sukan dinonaktifkan' : 'Sukan diaktifkan');
    refetch();
  };

  const handleDelete = async (sport: SupsasSport) => {
    if (!confirm(`Padam sukan "${sport.name}"? Tindakan ini tidak boleh diundur.`)) return;
    const { error } = await supabase.from('supsas_sports').delete().eq('id', sport.id);
    if (error) { toast.error('Gagal padam'); return; }
    toast.success('Sukan dipadam');
    refetch();
  };

  const [advancing, setAdvancing] = useState<string | null>(null);

  // K-3: Advance group winners to SF or QF (depending on bracket format)
  const handleAdvanceGroupWinners = async (sport: SupsasSport) => {
    setAdvancing(sport.id + '_group');
    const { data, error } = await supabase.rpc('advance_group_winners', { p_sport_id: sport.id });
    setAdvancing(null);
    console.log('[advance_group_winners] data:', data, 'error:', error);
    if (error) { toast.error('Ralat RPC: ' + error.message); return; }
    if (!data) { toast.error('Tiada respons dari pelayan. Sila cuba semula.'); return; }
    if (data?.ok === false) { toast.error(data.error ?? 'Ralat tidak diketahui'); return; }
    toast.success('✅ Fasa seterusnya berjaya dijana!');
    refetch();
  };

  // K-3a: Advance QF winners to SF (only for 4-group format)
  const handleAdvanceQFWinners = async (sport: SupsasSport) => {
    setAdvancing(sport.id + '_qf');
    const { data, error } = await supabase.rpc('advance_qf_winners', { p_sport_id: sport.id });
    setAdvancing(null);
    if (error) { toast.error('Ralat RPC: ' + error.message); return; }
    if (!data) { toast.error('Tiada respons dari pelayan.'); return; }
    if (data?.ok === false) { toast.error(data.error ?? 'Ralat tidak diketahui'); return; }
    toast.success('⚔️ Separuh Akhir berjaya dijana dari Suku Akhir!');
    refetch();
  };

  const handleAdvanceSFWinners = async (sport: SupsasSport) => {
    setAdvancing(sport.id + '_sf');
    const { data, error } = await supabase.rpc('advance_sf_winners', { p_sport_id: sport.id });
    setAdvancing(null);
    console.log('[advance_sf_winners] data:', data, 'error:', error);
    if (error) { toast.error('Ralat RPC: ' + error.message); return; }
    if (!data) { toast.error('Tiada respons dari pelayan. Sila cuba semula.'); return; }
    if (data?.ok === false) { toast.error(data.error ?? 'Ralat tidak diketahui'); return; }
    toast.success('🏆 Final berjaya dijana!');
    refetch();
  };

  // Reset: Padam semua fixtures untuk sukan ini
  const handleResetBracket = async (sport: SupsasSport) => {
    const confirmStep1 = window.confirm(
      `⚠️ Reset bracket "${sport.name}"?\n\nSemua keputusan perlawanan dan jadual yang dijana akan DIPADAM sepenuhnya.\n\nTekan OK untuk teruskan.`
    );
    if (!confirmStep1) return;

    const confirmStep2 = window.confirm(
      `🔴 PENGESAHAN AKHIR\n\nAdakah anda PASTI ingin memadam bracket "${sport.name}"?\n\nTindakan ini TIDAK BOLEH diundur.`
    );
    if (!confirmStep2) return;

    setAdvancing(sport.id + '_reset');
    const { error } = await supabase
      .from('supsas_fixtures')
      .delete()
      .eq('sport_id', sport.id);
    setAdvancing(null);

    if (error) { toast.error('Gagal reset bracket: ' + error.message); return; }
    toast.success(`🔄 Bracket ${sport.name} telah direset. Sedia untuk jana semula.`);
    refetch();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Urus Sukan</h1>
          <p className="text-white/30 text-sm mt-1">{sports.length} sukan dalam edisi ini</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Sukan
        </button>
      </div>

      {/* Edition status warnings */}
      {!edition && (
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-center text-red-400/70 text-sm space-y-2">
          <p className="font-black">Tiada edisi ditemui</p>
          <p className="text-xs text-red-400/50">Pergi ke <strong>Tetapan Edisi</strong> untuk mencipta edisi SUPSAS baharu.</p>
        </div>
      )}
      {edition && !edition.is_active && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
          <span className="text-amber-400 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-amber-400 text-xs font-black">Edisi <strong>{edition.name}</strong> belum diaktifkan</p>
            <p className="text-amber-400/50 text-[10px] mt-0.5">Sukan boleh ditambah sekarang. Aktifkan edisi dalam <strong>Tetapan</strong> supaya scoreboard public hidup.</p>
          </div>
        </div>
      )}


      {/* Sports list */}
      <div className="space-y-3">
        {sports.map((sport, i) => {
          const Ic = (props: any) => <DynamicIcon name={sport.icon} fallback="Trophy" {...props} />;
          const sportFixtures = fixtures.filter(f => f.sport_id === sport.id);
          const groupFixtures  = sportFixtures.filter(f => f.group_name != null);
          const qfFixtures      = sportFixtures.filter(f => f.bracket_round === 3); // Suku Akhir
          const sfFixtures      = sportFixtures.filter(f => f.bracket_round === 2);
          const finalFixture    = sportFixtures.find(f => f.bracket_round === 1);
          const hasQF           = qfFixtures.length > 0; // 4-kumpulan format
          const groupDone       = groupFixtures.length > 0 && groupFixtures.every(f => f.status === 'completed');
          const qfDone          = qfFixtures.length > 0 && qfFixtures.every(f => f.status === 'completed') && qfFixtures.every(f => f.winner_id != null || (f as any).winner_team_id != null);
          const sfDone          = sfFixtures.length > 0 && sfFixtures.every(f => f.status === 'completed') && sfFixtures.every(f => f.winner_id != null || (f as any).winner_team_id != null);
          const qfHasTeams      = qfFixtures.some(f => f.kontingen_a_id != null || (f as any).team_a_id != null);
          const sfHasTeams      = sfFixtures.some(f => f.kontingen_a_id != null || (f as any).team_a_id != null);
          const finalHasTeams   = finalFixture != null && (finalFixture.kontingen_a_id != null || (finalFixture as any).team_a_id != null);
          const isGroupKO       = sport.format === 'group_knockout';

          return (
            <motion.div
              key={sport.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'rounded-2xl border transition-all',
                sport.is_active ? 'bg-white/[0.02] border-white/5' : 'bg-white/[0.01] border-white/[0.03] opacity-60'
              )}
            >
              {/* Main row */}
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Ic className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm">{sport.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{sport.format.replace(/_/g, ' ')}</span>
                    <span className="text-white/10">·</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{sport.gender}</span>
                    <span className="text-white/10">·</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{sport.category}</span>
                    {/* Progress badge */}
                    {isGroupKO && groupFixtures.length > 0 && (
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border',
                        finalHasTeams ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                        : sfHasTeams ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : groupDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-white/30'
                      )}>
                        {finalHasTeams ? '🏆 Final' : sfHasTeams ? '⚔️ SF' : groupDone ? '✅ Kumpulan Selesai' : `${sportFixtures.filter(f=>f.status==='completed').length}/${groupFixtures.length} match`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <span className={cn('px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border',
                    sport.is_active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-white/20 bg-white/5 border-white/10'
                  )}>
                    {sport.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  {/* Jana Bracket button */}
                  {(sport.format === 'knockout' || sport.format === 'group_knockout') && sport.is_active && (
                    <button
                      onClick={() => setDrawSport(sport)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/25 transition-all"
                    >
                      <Shuffle className="w-3 h-3" />
                      Jana Bracket
                    </button>
                  )}
                  <button onClick={() => openEdit(sport)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleToggle(sport)} className={cn('w-8 h-8 flex items-center justify-center rounded-xl border transition-all', sport.is_active ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20')}>
                    {sport.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(sport)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isGroupKO && groupFixtures.length > 0 && sport.is_active && (
                <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">

                  {/* Step 1: Kumpulan → QF atau SF */}
                  {!qfHasTeams && !sfHasTeams && (
                    <button
                      onClick={() => handleAdvanceGroupWinners(sport)}
                      disabled={!groupDone || advancing === sport.id + '_group'}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                        groupDone
                          ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed'
                      )}
                    >
                      {advancing === sport.id + '_group' ? <Loader className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                      {groupDone
                        ? (hasQF ? 'Jana Suku Akhir dari Kumpulan' : 'Jana Separuh Akhir dari Kumpulan')
                        : `Tunggu ${groupFixtures.filter(f => f.status !== 'completed').length} match lagi`}
                    </button>
                  )}

                  {/* Step 2 (4-group only): QF → SF */}
                  {hasQF && qfHasTeams && !sfHasTeams && (
                    <button
                      onClick={() => handleAdvanceQFWinners(sport)}
                      disabled={!qfDone || advancing === sport.id + '_qf'}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                        qfDone
                          ? 'bg-blue-500/15 border-blue-500/25 text-blue-400 hover:bg-blue-500/25'
                          : 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed'
                      )}
                    >
                      {advancing === sport.id + '_qf' ? <Loader className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                      {qfDone ? 'Jana Separuh Akhir dari Suku Akhir' : `Tunggu ${qfFixtures.filter(f => f.status !== 'completed').length} QF lagi`}
                    </button>
                  )}

                  {/* Step 3: SF → Final */}
                  {sfHasTeams && !finalHasTeams && (
                    <button
                      onClick={() => handleAdvanceSFWinners(sport)}
                      disabled={!sfDone || advancing === sport.id + '_sf'}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                        sfDone
                          ? 'bg-amber-500/15 border-amber-500/25 text-amber-400 hover:bg-amber-500/25'
                          : 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed'
                      )}
                    >
                      {advancing === sport.id + '_sf' ? <Loader className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3" />}
                      {sfDone ? 'Jana Akhir dari Separuh Akhir' : `Tunggu ${sfFixtures.filter(f => f.status !== 'completed' || !f.winner_id).length} SF lagi`}
                    </button>
                  )}

                  {/* Done */}
                  {finalHasTeams && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Final Bersedia</span>
                    </div>
                  )}

                  {/* Reset bracket — always visible once bracket exists */}
                  <button
                    onClick={() => handleResetBracket(sport)}
                    disabled={advancing === sport.id + '_reset'}
                    title="Padam semua fixtures dan mula semula"
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/5 border border-red-500/15 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/25 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
                  >
                    {advancing === sport.id + '_reset'
                      ? <Loader className="w-3 h-3 animate-spin" />
                      : <RotateCcw className="w-3 h-3" />}
                    Reset Bracket
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
        {sports.length === 0 && !edition && null}
        {sports.length === 0 && edition && (
          <div className="text-center py-12 text-white/20 text-sm font-black uppercase tracking-widest">
            Belum ada sukan. Tambah sukan pertama!
          </div>
        )}
      </div>

      {/* Modal / Drawer */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-[540px] max-h-[90vh] bg-[#0A1628] border border-white/10 rounded-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.7)] overflow-y-auto z-10"
            >
              <div className="p-6 space-y-5">
                {/* Modal Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-white">{editTarget ? 'Edit Sukan' : 'Tambah Sukan Baharu'}</h2>
                  <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <FormField label="Nama Sukan">
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="cth: Bola Sepak" className={inputCls()} />
                </FormField>

                <FormField label="Ikon">
                  <IconPicker value={form.icon} onChange={v => setForm(p => ({ ...p, icon: v }))} />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Kategori">
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls()}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Jantina">
                    <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className={inputCls()}>
                      {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </FormField>
                </div>

                <FormField label="Format Pertandingan">
                  <select value={form.format} onChange={e => setForm(p => ({ ...p, format: e.target.value }))} className={inputCls()}>
                    {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Gelanggang / Venue">
                    <input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="cth: Padang A" className={inputCls()} />
                  </FormField>
                  <FormField label="Max Pemain / Pasukan (lama)">
                    <input type="number" min={1} value={form.max_per_team} onChange={e => setForm(p => ({ ...p, max_per_team: +e.target.value }))} className={inputCls()} />
                  </FormField>
                </div>

                {/* Multi-group settings */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/70">Tetapan Kumpulan Per Kontingen</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Max Kumpulan / Kontingen">
                      <input type="number" min={1} max={10} value={form.max_groups_per_kontingen}
                        onChange={e => setForm(p => ({ ...p, max_groups_per_kontingen: +e.target.value }))}
                        className={inputCls()} />
                      <p className="text-[9px] text-white/25 mt-1">1 = sistem lama (1 unit/kontingen)</p>
                    </FormField>
                    <FormField label="Max Pemain / Kumpulan">
                      <input type="number" min={1} max={50} value={form.max_players_per_group}
                        onChange={e => setForm(p => ({ ...p, max_players_per_group: +e.target.value }))}
                        className={inputCls()} />
                      <p className="text-[9px] text-white/25 mt-1">Bilangan pemain dalam 1 kumpulan</p>
                    </FormField>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <span className="animate-spin">⟳</span> : <Save className="w-4 h-4" />}
                  {editTarget ? 'Simpan Perubahan' : 'Tambah Sukan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Draw Modal */}
      <AnimatePresence>
        {drawSport && edition && (
          <AdminBracketPanel
            sport={drawSport}
            editionId={edition.id}
            onClose={() => setDrawSport(null)}
            onConfirmed={() => setDrawSport(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
