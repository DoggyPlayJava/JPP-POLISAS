import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, ShieldAlert, Play, Pause, RotateCcw, Plus, Minus, Trophy, CheckCircle, AlertTriangle, ArrowLeft, Clock, Activity, Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SupsasFixture, SupsasKontingen, MatchEvent } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export function SupsasScorekeeperPage() {
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fixture, setFixture] = useState<SupsasFixture | null>(null);
  const [teamA, setTeamA] = useState<SupsasKontingen | null>(null);
  const [teamB, setTeamB] = useState<SupsasKontingen | null>(null);
  const [sportName, setSportName] = useState<string>('Perlawanan Sukan');
  
  // Local match state
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'control' | 'timeline'>('control');
  const [saving, setSaving] = useState<boolean>(false);

  // Modal event recorder
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'foul' | 'note'>('goal');
  const [selectedSide, setSelectedSide] = useState<'A' | 'B'>('A');
  const [playerNameInput, setPlayerNameInput] = useState('');

  // Check saved session in localStorage
  useEffect(() => {
    const savedPin = localStorage.getItem('supsas_referee_pin');
    const savedFixtureId = localStorage.getItem('supsas_fixture_id');
    if (savedPin && savedFixtureId) {
      verifyAndLoadFixture(savedFixtureId, savedPin);
    }
  }, []);

  // Timer interval hook
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Sync to database periodically or on timer pause
  const syncToDatabase = async (overrideStatus?: string) => {
    if (!fixture || !pinInput) return;
    setSaving(true);

    const winnerId =
      scoreA > scoreB
        ? fixture.kontingen_a_id
        : scoreB > scoreA
        ? fixture.kontingen_b_id
        : null;

    const winnerTeamId =
      scoreA > scoreB
        ? fixture.team_a_id
        : scoreB > scoreA
        ? fixture.team_b_id
        : null;

    const currentStatus = overrideStatus || (isTimerRunning ? 'live' : fixture.status);

    const { data, error } = await supabase.rpc('update_supsas_fixture_via_pin', {
      p_fixture_id: fixture.id,
      p_pin: pinInput,
      p_score_a: scoreA.toString(),
      p_score_b: scoreB.toString(),
      p_status: currentStatus,
      p_elapsed_seconds: elapsedSeconds,
      p_timer_status: isTimerRunning ? 'running' : 'paused',
      p_events: JSON.stringify(events),
      p_winner_id: winnerId,
      p_winner_team_id: winnerTeamId,
    });

    setSaving(false);
    if (error) {
      toast.error('Gagal kemaskini: ' + error.message);
    } else if (data && !data.success) {
      toast.error(data.error || 'Gagal kemaskini skor');
    }
  };

  const verifyAndLoadFixture = async (fixtureId?: string, pinToUse?: string) => {
    const pin = pinToUse || pinInput.trim();
    if (!pin) {
      toast.error('Sila masukkan Kod PIN');
      return;
    }
    setLoading(true);

    let query = supabase.from('supsas_fixtures').select('*').eq('referee_pin', pin);
    if (fixtureId) {
      query = query.eq('id', fixtureId);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) {
      setLoading(false);
      toast.error('Kod PIN tidak sah atau perlawanan tidak dijumpai!');
      localStorage.removeItem('supsas_referee_pin');
      localStorage.removeItem('supsas_fixture_id');
      return;
    }

    // Load Teams & Sport info
    const [teamARes, teamBRes, sportRes] = await Promise.all([
      data.kontingen_a_id ? supabase.from('supsas_kontingen').select('*').eq('id', data.kontingen_a_id).single() : Promise.resolve({ data: null }),
      data.kontingen_b_id ? supabase.from('supsas_kontingen').select('*').eq('id', data.kontingen_b_id).single() : Promise.resolve({ data: null }),
      supabase.from('supsas_sports').select('name').eq('id', data.sport_id).single(),
    ]);

    setFixture(data);
    setPinInput(pin);
    setTeamA(teamARes.data);
    setTeamB(teamBRes.data);
    setSportName(sportRes.data?.name || 'Perlawanan Sukan');
    setScoreA(parseInt(data.score_a || '0') || 0);
    setScoreB(parseInt(data.score_b || '0') || 0);
    setElapsedSeconds(data.elapsed_seconds || 0);
    setIsTimerRunning(data.timer_status === 'running');
    setEvents(Array.isArray(data.timeline_events) ? data.timeline_events : []);

    localStorage.setItem('supsas_referee_pin', pin);
    localStorage.setItem('supsas_fixture_id', data.id);
    setLoading(false);
    toast.success('Pengesahan PIN berjaya! Selamat bertugas.');
  };

  const handleLogout = () => {
    localStorage.removeItem('supsas_referee_pin');
    localStorage.removeItem('supsas_fixture_id');
    setFixture(null);
    setPinInput('');
  };

  // Adjust score manually
  const modifyScore = (team: 'A' | 'B', delta: number) => {
    if (team === 'A') {
      const next = Math.max(0, scoreA + delta);
      setScoreA(next);
    } else {
      const next = Math.max(0, scoreB + delta);
      setScoreB(next);
    }
    setTimeout(() => syncToDatabase(), 300);
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Add Timeline Event
  const handleAddEvent = () => {
    const minute = Math.max(1, Math.ceil(elapsedSeconds / 60));
    const targetKontingen = selectedSide === 'A' ? teamA : teamB;
    
    const newEvent: MatchEvent = {
      id: Date.now().toString(),
      minute,
      type: eventType,
      team_id: selectedSide === 'A' ? fixture?.team_a_id || null : fixture?.team_b_id || null,
      kontingen_id: targetKontingen?.id || null,
      player_name: playerNameInput.trim() || undefined,
      description:
        eventType === 'goal'
          ? `Gol disumbangkan oleh ${playerNameInput || targetKontingen?.short_code}`
          : eventType === 'yellow_card'
          ? `Kad Kuning: ${playerNameInput || targetKontingen?.short_code}`
          : eventType === 'red_card'
          ? `Kad Merah: ${playerNameInput || targetKontingen?.short_code}`
          : `Catatan perlawanan oleh Pengadil`,
      created_at: new Date().toISOString(),
    };

    const updatedEvents = [newEvent, ...events];
    setEvents(updatedEvents);

    // If goal, auto increment score
    if (eventType === 'goal') {
      if (selectedSide === 'A') setScoreA((prev) => prev + 1);
      else setScoreB((prev) => prev + 1);
    }

    setShowEventModal(false);
    setPlayerNameInput('');
    toast.success('Acara perlawanan direkodkan!');
    setTimeout(() => syncToDatabase(), 300);
  };

  const handleFinishMatch = async () => {
    if (!confirm('Adakah anda pasti untuk TAMATKAN perlawanan ini?')) return;
    setIsTimerRunning(false);
    await syncToDatabase('completed');
    toast.success('Perlawanan telah ditamatkan secara rasmi!');
  };

  // ── PIN ENTRY SCREEN ───────────────────────────────────────
  if (!fixture) {
    return (
      <div className="min-h-screen bg-[#060D17] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm space-y-8 z-10">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <KeyRound className="w-8 h-8" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400/80">SUPSAS 2.0</p>
            <h1 className="text-2xl font-black text-white">Portal Juri & Pengadil</h1>
            <p className="text-xs text-white/50">Masukkan 4-digit PIN Perlawanan yang diberikan oleh Urus Setia/Admin</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="PIN (cth: 4829)"
                className="w-full text-center text-3xl font-black tracking-[0.3em] px-6 py-4 rounded-3xl bg-white/5 border border-white/15 text-amber-400 placeholder-white/10 focus:outline-none focus:border-amber-500 transition-all uppercase"
              />
            </div>

            <button
              onClick={() => verifyAndLoadFixture()}
              disabled={loading || !pinInput.trim()}
              className="w-full py-4 rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-widest text-sm transition-all shadow-[0_10px_30px_rgba(245,158,11,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Mengesahkan...' : 'Masuk Skrin Pengadil'}
            </button>
          </div>

          <div className="text-center">
            <a href="/supsas" className="text-xs text-white/30 hover:text-white/60 transition-all">← Kembali ke Utama SUP/SAS</a>
          </div>
        </div>
      </div>
    );
  }

  // ── REFEREE CONTROL ROOM ───────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060D17] text-white flex flex-col font-sans pb-12">
      {/* Header Bar */}
      <div className="bg-white/5 border-b border-white/10 px-4 py-3 sticky top-0 z-30 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/80">{sportName}</p>
            <h2 className="text-xs font-black text-white truncate max-w-[180px]">
              {fixture.group_name ? `Kumpulan ${fixture.group_name}` : fixture.round || 'Perlawanan'} #{fixture.match_number}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border',
            fixture.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            isTimerRunning ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' :
            'bg-amber-500/10 border-amber-500/30 text-amber-400'
          )}>
            {fixture.status === 'completed' ? '✅ Selesai' : isTimerRunning ? '🔴 LIVE' : '⏸ Rehat/Tangguh'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto w-full flex-1">
        {/* TIMER BAR */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-mono font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Masa Perlawanan</p>
              <span className="text-2xl font-black font-mono text-white tracking-wider">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !isTimerRunning;
                setIsTimerRunning(next);
                setTimeout(() => syncToDatabase(), 200);
              }}
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all shadow-lg',
                isTimerRunning
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-emerald-500 text-black hover:bg-emerald-400'
              )}
            >
              {isTimerRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => {
                if (confirm('Reset masa perlawanan ke 00:00?')) {
                  setElapsedSeconds(0);
                  setIsTimerRunning(false);
                  setTimeout(() => syncToDatabase(), 200);
                }
              }}
              className="w-10 h-10 rounded-2xl bg-white/5 text-white/40 hover:text-white border border-white/10 flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TEAM SCORE CARDS */}
        <div className="grid grid-cols-2 gap-3">
          {/* TEAM A */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-between space-y-3 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black text-base shadow-inner" style={{ borderColor: (teamA?.color || '#3B82F6') + '80', backgroundColor: (teamA?.color || '#3B82F6') + '20', color: teamA?.color || '#3B82F6' }}>
              {teamA?.short_code?.charAt(0) || 'A'}
            </div>
            <p className="text-xs font-black text-white text-center truncate max-w-full">
              {teamA?.name || 'Pasukan A'}
            </p>
            <span className="text-5xl font-black text-white font-mono tracking-tighter">
              {scoreA}
            </span>

            {/* TOUCH BUTTONS */}
            <div className="w-full space-y-1.5 pt-2">
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => modifyScore('A', 1)} className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +1
                </button>
                <button onClick={() => modifyScore('A', 2)} className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +2
                </button>
                <button onClick={() => modifyScore('A', 3)} className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +3
                </button>
              </div>
              <button onClick={() => modifyScore('A', -1)} className="w-full py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 font-black text-[10px] hover:text-white">
                -1 Mata
              </button>
            </div>
          </div>

          {/* TEAM B */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-between space-y-3 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black text-base shadow-inner" style={{ borderColor: (teamB?.color || '#EF4444') + '80', backgroundColor: (teamB?.color || '#EF4444') + '20', color: teamB?.color || '#EF4444' }}>
              {teamB?.short_code?.charAt(0) || 'B'}
            </div>
            <p className="text-xs font-black text-white text-center truncate max-w-full">
              {teamB?.name || 'Pasukan B'}
            </p>
            <span className="text-5xl font-black text-white font-mono tracking-tighter">
              {scoreB}
            </span>

            {/* TOUCH BUTTONS */}
            <div className="w-full space-y-1.5 pt-2">
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => modifyScore('B', 1)} className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +1
                </button>
                <button onClick={() => modifyScore('B', 2)} className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +2
                </button>
                <button onClick={() => modifyScore('B', 3)} className="py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +3
                </button>
              </div>
              <button onClick={() => modifyScore('B', -1)} className="w-full py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 font-black text-[10px] hover:text-white">
                -1 Mata
              </button>
            </div>
          </div>
        </div>

        {/* QUICK EVENT RECORD BUTTON */}
        <button
          onClick={() => setShowEventModal(true)}
          className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
        >
          <Activity className="w-4 h-4 text-amber-400" />
          Rekod Peristiwa (Gol / Kad / Nota)
        </button>

        {/* EVENT TIMELINE */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              Log Peristiwa Minit Demi Minit ({events.length})
            </h3>
          </div>

          {events.length === 0 ? (
            <p className="text-center text-xs text-white/30 py-4">Tiada peristiwa direkodkan lagi</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between text-xs bg-white/5 p-2.5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 font-black">{ev.minute}'</span>
                    <span className="text-white/80">{ev.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FINISH MATCH ACTION */}
        <button
          onClick={handleFinishMatch}
          disabled={saving}
          className="w-full py-4 rounded-3xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
        >
          <CheckCircle className="w-4 h-4" />
          Tamatkan Perlawanan Ini
        </button>
      </div>

      {/* EVENT RECORDER MODAL */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-sm bg-[#0A1628] border border-white/15 rounded-3xl p-6 space-y-4"
            >
              <h3 className="text-sm font-black text-white uppercase tracking-wider text-center">Rekod Acara Padang</h3>

              {/* Select Team Side */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedSide('A')}
                  className={cn(
                    'p-3 rounded-2xl border font-black text-xs transition-all',
                    selectedSide === 'A' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-white/40'
                  )}
                >
                  {teamA?.short_code || 'Pasukan A'}
                </button>
                <button
                  onClick={() => setSelectedSide('B')}
                  className={cn(
                    'p-3 rounded-2xl border font-black text-xs transition-all',
                    selectedSide === 'B' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-white/40'
                  )}
                >
                  {teamB?.short_code || 'Pasukan B'}
                </button>
              </div>

              {/* Event Type */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setEventType('goal')} className={cn('p-2.5 rounded-xl border text-xs font-black', eventType === 'goal' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60')}>⚽ Gol (+1)</button>
                <button onClick={() => setEventType('yellow_card')} className={cn('p-2.5 rounded-xl border text-xs font-black', eventType === 'yellow_card' ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/60')}>🟨 Kad Kuning</button>
                <button onClick={() => setEventType('red_card')} className={cn('p-2.5 rounded-xl border text-xs font-black', eventType === 'red_card' ? 'bg-red-500 text-white' : 'bg-white/5 text-white/60')}>🟥 Kad Merah</button>
                <button onClick={() => setEventType('note')} className={cn('p-2.5 rounded-xl border text-xs font-black', eventType === 'note' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60')}>📝 Catatan</button>
              </div>

              {/* Player Name */}
              <input
                type="text"
                placeholder="Nama Pemain / Jersi (Opsional)"
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
              />

              <div className="flex gap-2">
                <button onClick={() => setShowEventModal(false)} className="flex-1 py-3 rounded-2xl bg-white/5 text-white/60 font-black text-xs">Batal</button>
                <button onClick={handleAddEvent} className="flex-1 py-3 rounded-2xl bg-amber-500 text-black font-black text-xs">Simpan Peristiwa</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
