import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────
export interface SupsasEdition {
  id: string;
  name: string;
  tagline: string | null;
  edition_year: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  logo_url: string | null;
  banner_url: string | null;
}

export interface SupsasKontingen {
  id: string;
  edition_id: string;
  name: string;
  short_code: string;
  color: string;
  logo_url: string | null;
  leader_id: string | null;
  invite_code: string | null;
  invite_used: boolean;
  is_active: boolean;
}

export interface SupsasSport {
  id: string;
  edition_id: string;
  name: string;
  category: 'team' | 'individual';
  gender: 'male' | 'female' | 'mixed';
  format: 'knockout' | 'round_robin' | 'group_knockout';
  icon: string;
  venue: string | null;
  max_per_team: number;
  max_groups_per_kontingen: number; // NEW: berapa kumpulan max per kontingen (default 1)
  max_players_per_group: number;    // NEW: berapa pemain max per kumpulan
  is_active: boolean;
  sort_order: number;
}

export interface SupsasTeam {
  id: string;
  edition_id: string;
  sport_id: string;
  kontingen_id: string;
  name: string;
  group_number: number;
  is_confirmed: boolean;
  created_at: string;
}

export interface SupsasMedalTally {
  kontingen_id: string;
  edition_id: string;
  name: string;
  short_code: string;
  color: string;
  logo_url: string | null;
  gold: number;
  silver: number;
  bronze: number;
  total_medals: number;
}

export interface SupsasFixture {
  id: string;
  edition_id: string;
  sport_id: string;
  round: string | null;
  match_number: number | null;
  kontingen_a_id: string | null;
  kontingen_b_id: string | null;
  match_date: string | null;
  match_time: string | null;
  venue: string | null;
  status: 'upcoming' | 'live' | 'completed' | 'postponed';
  score_a: string | null;
  score_b: string | null;
  winner_id: string | null;
  notes: string | null;
  // Bracket fields (added in migration 37)
  bracket_round: number | null;    // 1=Final, 2=Semi. NULL = peringkat kumpulan
  bracket_position: number | null; // Kedudukan dalam round
  next_match_id: string | null;    // Pemenang masuk ke match ini
  group_name: string | null;       // 'A' atau 'B' — peringkat kumpulan sahaja
  is_bye: boolean;
  // Team-based fields (added for multi-group support)
  team_a_id: string | null;        // NULL untuk sukan single-group (guna kontingen_a_id)
  team_b_id: string | null;
  winner_team_id: string | null;
}

// ─── Context Shape ────────────────────────────────────────────
interface SupsasContextValue {
  edition: SupsasEdition | null;
  kontingen: SupsasKontingen[];
  sports: SupsasSport[];
  teams: SupsasTeam[];
  medalTally: SupsasMedalTally[];
  fixtures: SupsasFixture[];
  isLoading: boolean;
  isLive: boolean;
  isUpcoming: boolean;
  refetch: () => void;
}

const SupsasContext = createContext<SupsasContextValue>({
  edition: null,
  kontingen: [],
  sports: [],
  teams: [],
  medalTally: [],
  fixtures: [],
  isLoading: true,
  isLive: false,
  isUpcoming: false,
  refetch: () => {},
});

// ─── Provider ────────────────────────────────────────────────
export function SupsasProvider({ children }: { children: React.ReactNode }) {
  const [edition, setEdition] = useState<SupsasEdition | null>(null);
  const [kontingen, setKontingen] = useState<SupsasKontingen[]>([]);
  const [sports, setSports] = useState<SupsasSport[]>([]);
  const [teams, setTeams] = useState<SupsasTeam[]>([]);
  const [medalTally, setMedalTally] = useState<SupsasMedalTally[]>([]);
  const [fixtures, setFixtures] = useState<SupsasFixture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    // 1. Get the most recent edition (active OR inactive — admin needs to see it)
    //    Public scoreboard uses isLive flag, not is_active alone.
    const { data: editionData } = await supabase
      .from('supsas_editions')
      .select('*')
      .order('edition_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!editionData) {
      setEdition(null);
      setKontingen([]);
      setSports([]);
      setMedalTally([]);
      setFixtures([]);
      setIsLoading(false);
      return;
    }
    setEdition(editionData);

    // 2. Get all data in parallel
    const [kontingenRes, sportsRes, teamsRes, tallyRes, fixturesRes] = await Promise.all([
      supabase.from('supsas_kontingen').select('*').eq('edition_id', editionData.id).order('name'),
      supabase.from('supsas_sports').select('*').eq('edition_id', editionData.id).order('sort_order'),
      supabase.from('supsas_teams').select('*').eq('edition_id', editionData.id).order('group_number'),
      supabase.from('supsas_medal_tally').select('*').eq('edition_id', editionData.id),
      supabase.from('supsas_fixtures').select('*').eq('edition_id', editionData.id).order('match_date').order('match_time'),
    ]);

    if (kontingenRes.data) setKontingen(kontingenRes.data as SupsasKontingen[]);
    if (sportsRes.data) setSports(sportsRes.data as SupsasSport[]);
    if (teamsRes.data) setTeams(teamsRes.data as SupsasTeam[]);
    if (tallyRes.data) setMedalTally(tallyRes.data as SupsasMedalTally[]);
    if (fixturesRes.data) setFixtures(fixturesRes.data as SupsasFixture[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    // Realtime subscription — listen to changes for live scoreboard
    const resultsChannel = supabase
      .channel('supsas_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supsas_results' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supsas_fixtures' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supsas_kontingen' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supsas_sports' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supsas_teams' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supsas_editions' }, () => fetchAll())
      .subscribe();

    // Poll every 30 seconds as fallback (e.g. iOS PWA WebSocket sleep)
    const poll = setInterval(fetchAll, 30_000);

    return () => {
      supabase.removeChannel(resultsChannel);
      clearInterval(poll);
    };
  }, [fetchAll]);

  // isLive = edisi is_active=true DAN masa sekarang dalam range tarikh
  const now = new Date();
  const isLive = !!edition?.is_active && !!edition?.start_date && !!edition?.end_date &&
    new Date(edition.start_date) <= now && new Date(edition.end_date) >= now;

  // isUpcoming = edisi wujud tapi belum bermula
  const isUpcoming = !!edition && !!edition.start_date && new Date(edition.start_date) > now;

  return (
    <SupsasContext.Provider value={{ edition, kontingen, sports, teams, medalTally, fixtures, isLoading, isLive, isUpcoming, refetch: fetchAll }}>
      {children}
    </SupsasContext.Provider>
  );
}

export function useSupsas() {
  return useContext(SupsasContext);
}
