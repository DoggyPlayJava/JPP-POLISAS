import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, ShieldAlert, Play, Pause, RotateCcw, Plus, Minus, Trophy, CheckCircle, AlertTriangle, ArrowLeft, Clock, Activity, Flag, Sun, Moon, Wifi, WifiOff } from 'lucide-react';
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
  
  // Players
  const [playersA, setPlayersA] = useState<any[]>([]);
  const [playersB, setPlayersB] = useState<any[]>([]);
  
  // Offline status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Sun-Glare mode
  const [sunGlareMode, setSunGlareMode] = useState<boolean>(false);

  // Local match state
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'control' | 'timeline'>('control');
  const [saving, setSaving] = useState<boolean>(false);
  
  // Sets detail if score_type === 'sets'
  const [setsDetail, setSetsDetail] = useState<any>({ current_set: 1, scores: { 1: { A: 0, B: 0 } } });

  // ── REFS FOR SYNC RACE CONDITION ──
  const scoreARef = useRef(0);
  const scoreBRef = useRef(0);
  const eventsRef = useRef<MatchEvent[]>([]);
  const elapsedSecondsRef = useRef(0);
  const setsDetailRef = useRef<any>(null);

  useEffect(() => { scoreARef.current = scoreA; }, [scoreA]);
  useEffect(() => { scoreBRef.current = scoreB; }, [scoreB]);
  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
  useEffect(() => { setsDetailRef.current = setsDetail; }, [setsDetail]);

  // Modal event recorder
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'foul' | 'note'>('goal');
  const [selectedSide, setSelectedSide] = useState<'A' | 'B'>('A');
  const [playerNameInput, setPlayerNameInput] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check saved session in localStorage
  useEffect(() => {
    const savedPin = localStorage.getItem('supsas_referee_pin');
    const savedFixtureId = localStorage.getItem('supsas_fixture_id');
    if (savedPin && savedFixtureId) {
      verifyAndLoadFixture(savedFixtureId, savedPin);
    }
  }, []);

  // ── TIMER DRIFT FIX ──
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      startTimeRef.current = Date.now();
      interval = setInterval(() => {
        const delta = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
        setElapsedSeconds(accumulatedTimeRef.current + delta);
      }, 1000);
    } else {
      if (startTimeRef.current) {
        const delta = Math.floor((Date.now() - startTimeRef.current) / 1000);
        accumulatedTimeRef.current += delta;
      }
      startTimeRef.current = null;
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Sync to database periodically or on timer pause
  const syncToDatabase = async (overrideStatus?: string) => {
    if (!fixture || !pinInput) return;
    if (!isOnline) {
      toast('Luar talian: Data disimpan di peranti', { icon: '🟡' });
      return;
    }
    setSaving(true);

    const currentScoreA = scoreARef.current;
    const currentScoreB = scoreBRef.current;
    const currentEvents = eventsRef.current;
    const currentElapsed = elapsedSecondsRef.current;
    const currentSetsDetail = setsDetailRef.current;

    const winnerId =
      currentScoreA > currentScoreB
        ? fixture.kontingen_a_id
        : currentScoreB > currentScoreA
        ? fixture.kontingen_b_id
        : null;

    const winnerTeamId =
      currentScoreA > currentScoreB
        ? fixture.team_a_id
        : currentScoreB > currentScoreA
        ? fixture.team_b_id
        : null;

    const currentStatus = overrideStatus || (isTimerRunning ? 'live' : fixture.status);

    const rpcArgs: any = {
      p_fixture_id: fixture.id,
      p_pin: pinInput,
      p_score_a: currentScoreA.toString(),
      p_score_b: currentScoreB.toString(),
      p_status: currentStatus,
      p_elapsed_seconds: currentElapsed,
      p_timer_status: isTimerRunning ? 'running' : 'paused',
      p_events: currentEvents, // Use array directly, not JSON.stringify
      p_winner_id: winnerId,
      p_winner_team_id: winnerTeamId,
    };

    if (fixture.score_type === 'sets') {
      rpcArgs.p_sets_detail = currentSetsDetail;
    }

    const { data, error } = await supabase.rpc('update_supsas_fixture_via_pin', rpcArgs);

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

    // Load Teams, Sport, and Players if possible
    const [teamARes, teamBRes, sportRes] = await Promise.all([
      data.kontingen_a_id ? supabase.from('supsas_kontingen').select('*').eq('id', data.kontingen_a_id).single() : Promise.resolve({ data: null }),
      data.kontingen_b_id ? supabase.from('supsas_kontingen').select('*').eq('id', data.kontingen_b_id).single() : Promise.resolve({ data: null }),
      supabase.from('supsas_sports').select('name').eq('id', data.sport_id).single(),
    ]);

    if (data.team_a_id) {
      supabase.from('supsas_players').select('*').eq('team_id', data.team_a_id).then(res => {
        if (res.data) setPlayersA(res.data);
      });
    }
    if (data.team_b_id) {
      supabase.from('supsas_players').select('*').eq('team_id', data.team_b_id).then(res => {
        if (res.data) setPlayersB(res.data);
      });
    }

    setFixture(data);
    setPinInput(pin);
    setTeamA(teamARes.data);
    setTeamB(teamBRes.data);
    setSportName(sportRes.data?.name || 'Perlawanan Sukan');
    setScoreA(parseInt(data.score_a || '0') || 0);
    setScoreB(parseInt(data.score_b || '0') || 0);
    setElapsedSeconds(data.elapsed_seconds || 0);
    accumulatedTimeRef.current = data.elapsed_seconds || 0;
    setIsTimerRunning(data.timer_status === 'running');
    setEvents(Array.isArray(data.timeline_events) ? data.timeline_events : []);
    
    if (data.score_type === 'sets') {
      setSetsDetail(data.sets_detail || { current_set: 1, scores: { 1: { A: 0, B: 0 } } });
    }

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
    if (fixture?.score_type === 'sets') {
      const currentSet = setsDetail.current_set;
      setSetsDetail((prev: any) => {
        const clone = { ...prev };
        if (!clone.scores) clone.scores = {};
        if (!clone.scores[currentSet]) clone.scores[currentSet] = { A: 0, B: 0 };
        clone.scores[currentSet][team] = Math.max(0, clone.scores[currentSet][team] + delta);
        return clone;
      });
      // Also update overall if needed, or rely on sets logic
    }

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
    const minute = Math.max(1, Math.ceil(elapsedSecondsRef.current / 60));
    const targetKontingen = selectedSide === 'A' ? teamA : teamB;
    
    const newEvent: MatchEvent = {
      id: Date.now().toString(),
      minute,
      type: eventType as any,
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
          : eventType === 'foul'
          ? `Foul: ${playerNameInput || targetKontingen?.short_code}`
          : `Catatan perlawanan oleh Pengadil`,
      created_at: new Date().toISOString(),
    };

    const updatedEvents = [newEvent, ...eventsRef.current];
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
    localStorage.removeItem('supsas_referee_pin');
    localStorage.removeItem('supsas_fixture_id');
    setFixture(null);
  };

  // Theme styles for Sun-Glare Mode
  const bgClass = sunGlareMode ? "bg-[#FFFFFF]" : "bg-[#060D17]";
  const textClass = sunGlareMode ? "text-black" : "text-white";
  const cardBgClass = sunGlareMode ? "bg-gray-100 border-gray-300" : "bg-white/5 border-white/10";
  const subTextClass = sunGlareMode ? "text-gray-600" : "text-white/40";

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
    <div className={cn(`min-h-screen flex flex-col font-sans pb-12 transition-colors`, bgClass, textClass)}>
      {/* Header Bar */}
      <div className={cn("border-b px-4 py-3 sticky top-0 z-30 flex flex-col gap-2", sunGlareMode ? "bg-white border-gray-200" : "bg-[#060D17]/80 backdrop-blur-xl border-white/10")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className={cn("p-2 rounded-xl transition-all", sunGlareMode ? "bg-gray-100 text-black hover:bg-gray-200" : "bg-white/5 text-white/40 hover:text-white")}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">{sportName}</p>
              <h2 className={cn("text-xs font-black truncate max-w-[180px]", textClass)}>
                {fixture.group_name ? `Kumpulan ${fixture.group_name}` : fixture.round || 'Perlawanan'} #{fixture.match_number}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSunGlareMode(!sunGlareMode)} 
              className={cn("p-1.5 rounded-lg border", sunGlareMode ? "bg-amber-500 text-black border-amber-600" : "bg-white/5 text-white/40 border-white/10")}
              title="Mod Padang (Sun-Glare Mode)"
            >
              {sunGlareMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span className={cn(
              'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border',
              fixture.status === 'completed' ? (sunGlareMode ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400') :
              isTimerRunning ? (sunGlareMode ? 'bg-red-100 border-red-300 text-red-700 animate-pulse' : 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse') :
              (sunGlareMode ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-amber-500/10 border-amber-500/30 text-amber-400')
            )}>
              {fixture.status === 'completed' ? '✅ Selesai' : isTimerRunning ? '🔴 LIVE' : '⏸ Rehat'}
            </span>
          </div>
        </div>
        
        {/* Connection Status Badge */}
        <div className="flex justify-between items-center text-[10px] font-bold">
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-500"><Wifi className="w-3 h-3" /> 🟢 Talian Stabil</span>
            ) : (
              <span className="flex items-center gap-1 text-red-500"><WifiOff className="w-3 h-3" /> 🔴 Luar Talian (Simpan Lokal)</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto w-full flex-1">
        {/* TIMER BAR */}
        <div className={cn("border rounded-3xl p-4 flex items-center justify-between", cardBgClass)}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-bold", sunGlareMode ? "bg-amber-100 border border-amber-300 text-amber-700" : "bg-amber-500/10 border border-amber-500/20 text-amber-400")}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className={cn("text-[9px] font-black uppercase tracking-widest", subTextClass)}>Masa Perlawanan</p>
              <span className={cn("text-2xl font-black font-mono tracking-wider", textClass)}>
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
                  accumulatedTimeRef.current = 0;
                  startTimeRef.current = isTimerRunning ? Date.now() : null;
                  setElapsedSeconds(0);
                  setIsTimerRunning(false);
                  setTimeout(() => syncToDatabase(), 200);
                }
              }}
              className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center", sunGlareMode ? "bg-white text-black border-gray-300 hover:bg-gray-100" : "bg-white/5 text-white/40 hover:text-white border-white/10")}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SETS BAR IF score_type === 'sets' */}
        {fixture.score_type === 'sets' && (
          <div className={cn("border rounded-2xl p-3 flex flex-col gap-2", cardBgClass)}>
            <div className="flex justify-between items-center">
              <span className={cn("text-xs font-bold", textClass)}>Pengurusan Set</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(setNum => (
                  <button 
                    key={setNum}
                    onClick={() => setSetsDetail((prev: any) => ({ ...prev, current_set: setNum }))}
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center",
                      setsDetail.current_set === setNum ? "bg-amber-500 text-black" : (sunGlareMode ? "bg-white border border-gray-300" : "bg-white/10 text-white/50")
                    )}
                  >
                    {setNum}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="text-center font-mono font-bold">
                A: {setsDetail.scores?.[setsDetail.current_set]?.A || 0}
              </div>
              <div className={cn("text-[9px] uppercase font-bold", subTextClass)}>Set {setsDetail.current_set}</div>
              <div className="text-center font-mono font-bold">
                B: {setsDetail.scores?.[setsDetail.current_set]?.B || 0}
              </div>
            </div>
          </div>
        )}

        {/* TEAM SCORE CARDS */}
        <div className="grid grid-cols-2 gap-3">
          {/* TEAM A */}
          <div className={cn("border rounded-3xl p-4 flex flex-col items-center justify-between space-y-3 relative overflow-hidden", cardBgClass)}>
            <div className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black text-base shadow-inner" style={{ borderColor: (teamA?.color || '#3B82F6') + (sunGlareMode?'':'80'), backgroundColor: (teamA?.color || '#3B82F6') + '20', color: sunGlareMode ? (teamA?.color || '#1D4ED8') : (teamA?.color || '#3B82F6') }}>
              {teamA?.short_code?.charAt(0) || 'A'}
            </div>
            <p className={cn("text-xs font-black text-center truncate max-w-full", textClass)}>
              {teamA?.name || 'Pasukan A'}
            </p>
            <span className={cn("text-5xl font-black font-mono tracking-tighter", textClass)}>
              {scoreA}
            </span>

            {/* TOUCH BUTTONS */}
            <div className="w-full space-y-1.5 pt-2">
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => modifyScore('A', 1)} className="py-3.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +1
                </button>
                <button onClick={() => modifyScore('A', 2)} className="py-3.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +2
                </button>
                <button onClick={() => modifyScore('A', 3)} className="py-3.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +3
                </button>
              </div>
              <button onClick={() => modifyScore('A', -1)} className={cn("w-full py-3 rounded-xl border font-black text-xs", sunGlareMode ? "bg-white border-gray-300 text-gray-500 hover:text-black hover:bg-gray-50" : "bg-white/5 border-white/10 text-white/40 hover:text-white")}>
                -1 Mata
              </button>
            </div>
          </div>

          {/* TEAM B */}
          <div className={cn("border rounded-3xl p-4 flex flex-col items-center justify-between space-y-3 relative overflow-hidden", cardBgClass)}>
            <div className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black text-base shadow-inner" style={{ borderColor: (teamB?.color || '#EF4444') + (sunGlareMode?'':'80'), backgroundColor: (teamB?.color || '#EF4444') + '20', color: sunGlareMode ? (teamB?.color || '#B91C1C') : (teamB?.color || '#EF4444') }}>
              {teamB?.short_code?.charAt(0) || 'B'}
            </div>
            <p className={cn("text-xs font-black text-center truncate max-w-full", textClass)}>
              {teamB?.name || 'Pasukan B'}
            </p>
            <span className={cn("text-5xl font-black font-mono tracking-tighter", textClass)}>
              {scoreB}
            </span>

            {/* TOUCH BUTTONS */}
            <div className="w-full space-y-1.5 pt-2">
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => modifyScore('B', 1)} className="py-3.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +1
                </button>
                <button onClick={() => modifyScore('B', 2)} className="py-3.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +2
                </button>
                <button onClick={() => modifyScore('B', 3)} className="py-3.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs hover:bg-amber-500 hover:text-black transition-all">
                  +3
                </button>
              </div>
              <button onClick={() => modifyScore('B', -1)} className={cn("w-full py-3 rounded-xl border font-black text-xs", sunGlareMode ? "bg-white border-gray-300 text-gray-500 hover:text-black hover:bg-gray-50" : "bg-white/5 border-white/10 text-white/40 hover:text-white")}>
                -1 Mata
              </button>
            </div>
          </div>
        </div>

        {/* QUICK EVENT RECORD BUTTON */}
        <button
          onClick={() => setShowEventModal(true)}
          className={cn("w-full py-3.5 rounded-2xl border font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all", sunGlareMode ? "bg-white hover:bg-gray-50 border-gray-300 text-black shadow-sm" : "bg-white/10 hover:bg-white/15 border-white/15 text-white")}
        >
          <Activity className="w-4 h-4 text-amber-500" />
          Rekod Peristiwa (Gol / Kad / Foul / Nota)
        </button>

        {/* EVENT TIMELINE */}
        <div className={cn("border rounded-3xl p-4 space-y-3", cardBgClass)}>
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
            <h3 className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-2", textClass)}>
              <Flag className="w-3.5 h-3.5 text-amber-500" />
              Log Peristiwa Minit Demi Minit ({events.length})
            </h3>
          </div>

          {events.length === 0 ? (
            <p className={cn("text-center text-xs py-4", subTextClass)}>Tiada peristiwa direkodkan lagi</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {events.map((ev) => (
                <div key={ev.id} className={cn("flex items-center justify-between text-xs p-2.5 rounded-2xl border", sunGlareMode ? "bg-white border-gray-200" : "bg-white/5 border-white/5")}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-black">{ev.minute}'</span>
                    <span className={cn(sunGlareMode ? "text-black" : "text-white/80")}>{ev.description}</span>
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
          className="w-full py-4 rounded-3xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Tamatkan Perlawanan Ini'}
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
              className={cn("w-full max-w-sm border rounded-3xl p-6 space-y-4", sunGlareMode ? "bg-white border-gray-300" : "bg-[#0A1628] border-white/15")}
            >
              <h3 className={cn("text-sm font-black uppercase tracking-wider text-center", textClass)}>Rekod Acara Padang</h3>

              {/* Select Team Side */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedSide('A')}
                  className={cn(
                    'p-3 rounded-2xl border font-black text-xs transition-all',
                    selectedSide === 'A' 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400' 
                      : (sunGlareMode ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white/5 border-white/10 text-white/40')
                  )}
                >
                  {teamA?.short_code || 'Pasukan A'}
                </button>
                <button
                  onClick={() => setSelectedSide('B')}
                  className={cn(
                    'p-3 rounded-2xl border font-black text-xs transition-all',
                    selectedSide === 'B' 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400' 
                      : (sunGlareMode ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white/5 border-white/10 text-white/40')
                  )}
                >
                  {teamB?.short_code || 'Pasukan B'}
                </button>
              </div>

              {/* Event Type */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setEventType('goal')} className={cn('p-2.5 rounded-xl border text-xs font-black', eventType === 'goal' ? 'bg-amber-500 text-black border-amber-600' : (sunGlareMode ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-white/60'))}>⚽ Gol (+1)</button>
                <button onClick={() => setEventType('yellow_card')} className={cn('p-2.5 rounded-xl border text-xs font-black', eventType === 'yellow_card' ? 'bg-yellow-500 text-black border-yellow-600' : (sunGlareMode ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-white/60'))}>🟨 Kad Kuning</button>
                <button onClick={() => setEventType('red_card')} className={cn('p-2.5 rounded-xl border text-xs font-black', eventType === 'red_card' ? 'bg-red-500 text-white border-red-600' : (sunGlareMode ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-white/60'))}>🟥 Kad Merah</button>
                <button onClick={() => setEventType('foul')} className={cn('p-2.5 rounded-xl border text-xs font-black', eventType === 'foul' ? 'bg-orange-500 text-white border-orange-600' : (sunGlareMode ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-white/60'))}>🤬 Foul</button>
                <button onClick={() => setEventType('note')} className={cn('col-span-2 p-2.5 rounded-xl border text-xs font-black', eventType === 'note' ? 'bg-blue-500 text-white border-blue-600' : (sunGlareMode ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-white/60'))}>📝 Catatan Lain</button>
              </div>

              {/* Player Name / Quick Chips */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nama Pemain / Jersi (Opsional)"
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  className={cn("w-full px-4 py-3 rounded-2xl border text-xs font-bold focus:outline-none focus:border-amber-500", sunGlareMode ? "bg-white border-gray-300 text-black" : "bg-white/5 border-white/10 text-white")}
                />
                
                {/* Player Quick Chips if available */}
                {(selectedSide === 'A' ? playersA : playersB).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {(selectedSide === 'A' ? playersA : playersB).map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPlayerNameInput(p.name)}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors",
                          playerNameInput === p.name 
                            ? "bg-amber-500 text-black border-amber-600" 
                            : (sunGlareMode ? "bg-gray-100 border-gray-200 text-gray-700" : "bg-white/10 border-white/10 text-white/70")
                        )}
                      >
                        {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name.substring(0, 15)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowEventModal(false)} className={cn("flex-1 py-3 rounded-2xl font-black text-xs border", sunGlareMode ? "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200" : "bg-white/5 text-white/60 border-transparent")}>Batal</button>
                <button onClick={handleAddEvent} className="flex-1 py-3 rounded-2xl bg-amber-500 text-black font-black text-xs shadow-md">Simpan Peristiwa</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
