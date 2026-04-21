/**
 * useLiveDraw — Supabase Realtime Broadcast hook for SUPSAS Live Draw
 *
 * FORMAT: Peringkat Kumpulan + Knockout (Group Stage + KO)
 *
 * Untuk 6 pasukan:
 *   - Kumpulan A (3 pasukan): 3 perlawanan round-robin dalam kumpulan
 *   - Kumpulan B (3 pasukan): 3 perlawanan round-robin dalam kumpulan
 *   - Separuh Akhir: A1 vs B2, B1 vs A2 (4 pasukan terbaik)
 *   - Akhir: SF1 vs SF2
 *
 * Total: 6 + 2 + 1 = 9 perlawanan. Semua jabatan main minimum 2 match.
 *
 * Draw Animation:
 *   Admin broadcast → semua pelajar nampak animated reveal Kumpulan A & B
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { SupsasKontingen } from '@/contexts/SupsasContext';

// ─── Event Types ──────────────────────────────────────────────
export type DrawEvent =
  | { type: 'DRAW_START'; sportId: string; sportName: string; totalTeams: number }
  | { type: 'GROUP_REVEAL'; group: 'A' | 'B'; slot: number; kontingenId: string; name: string; shortCode: string; color: string }
  | { type: 'DRAW_COMPLETE'; groupA: string[]; groupB: string[] }  // arrays of kontingenId
  | { type: 'DRAW_CANCELLED' };

// ─── Slot State ───────────────────────────────────────────────
export interface GroupDrawSlot {
  group: 'A' | 'B';
  slot: number;   // 1,2,3 dalam kumpulan
  kontingenId: string | null;
  name: string | null;
  shortCode: string | null;
  color: string | null;
  revealed: boolean;
}

// ─── Draw Session State ───────────────────────────────────────
export interface LiveDrawState {
  status: 'idle' | 'drawing' | 'complete' | 'cancelled';
  sportId: string | null;
  sportName: string | null;
  totalTeams: number;
  groupA: GroupDrawSlot[];
  groupB: GroupDrawSlot[];
  finalGroupA: string[];  // kontingenId[] selepas draw selesai
  finalGroupB: string[];
}

const INITIAL_STATE: LiveDrawState = {
  status: 'idle',
  sportId: null,
  sportName: null,
  totalTeams: 0,
  groupA: [],
  groupB: [],
  finalGroupA: [],
  finalGroupB: [],
};

// ─── Fisher-Yates shuffle ─────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Helper: Build empty slots ────────────────────────────────
function makeSlots(group: 'A' | 'B', count: number): GroupDrawSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    group,
    slot: i + 1,
    kontingenId: null,
    name: null,
    shortCode: null,
    color: null,
    revealed: false,
  }));
}

// ─── Hook ─────────────────────────────────────────────────────
export function useLiveDraw(editionId: string | null | undefined, isAdmin: boolean) {
  const [drawState, setDrawState] = useState<LiveDrawState>(INITIAL_STATE);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Subscribe to channel ───────────────────────────────────
  useEffect(() => {
    if (!editionId) return;

    const ch = supabase.channel(`supsas-draw-${editionId}`, {
      config: { broadcast: { self: true } },
    });

    ch.on('broadcast', { event: 'draw' }, ({ payload }: { payload: DrawEvent }) => {
      handleIncoming(payload);
    }).subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        setTimeout(() => ch.subscribe(), 3000);
      }
    });

    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [editionId]);

  // ── Incoming event handler ─────────────────────────────────
  const handleIncoming = useCallback((event: DrawEvent) => {
    switch (event.type) {
      case 'DRAW_START': {
        const groupSize = Math.ceil(event.totalTeams / 2);
        const groupBSize = event.totalTeams - groupSize;
        setDrawState({
          status: 'drawing',
          sportId: event.sportId,
          sportName: event.sportName,
          totalTeams: event.totalTeams,
          groupA: makeSlots('A', groupSize),
          groupB: makeSlots('B', groupBSize),
          finalGroupA: [],
          finalGroupB: [],
        });
        break;
      }
      case 'GROUP_REVEAL':
        setDrawState(prev => ({
          ...prev,
          groupA: event.group === 'A'
            ? prev.groupA.map(s => s.slot === event.slot
                ? { ...s, kontingenId: event.kontingenId, name: event.name, shortCode: event.shortCode, color: event.color, revealed: true }
                : s)
            : prev.groupA,
          groupB: event.group === 'B'
            ? prev.groupB.map(s => s.slot === event.slot
                ? { ...s, kontingenId: event.kontingenId, name: event.name, shortCode: event.shortCode, color: event.color, revealed: true }
                : s)
            : prev.groupB,
        }));
        break;

      case 'DRAW_COMPLETE':
        setDrawState(prev => ({
          ...prev,
          status: 'complete',
          finalGroupA: event.groupA,
          finalGroupB: event.groupB,
        }));
        break;

      case 'DRAW_CANCELLED':
        setDrawState(INITIAL_STATE);
        break;
    }
  }, []);

  // ── Admin: Start draw ──────────────────────────────────────
  const startDraw = useCallback(async (
    sport: { id: string; name: string },
    kontingen: SupsasKontingen[],
  ) => {
    if (!isAdmin || !channelRef.current) return;

    broadcastTimersRef.current.forEach(clearTimeout);
    broadcastTimersRef.current = [];

    const active = kontingen.filter(k => k.is_active);
    const shuffled = shuffle(active);

    // Split into 2 groups as evenly as possible
    const groupASize = Math.ceil(shuffled.length / 2);
    const groupA = shuffled.slice(0, groupASize);
    const groupB = shuffled.slice(groupASize);

    await channelRef.current.send({
      type: 'broadcast', event: 'draw',
      payload: { type: 'DRAW_START', sportId: sport.id, sportName: sport.name, totalTeams: shuffled.length } as DrawEvent,
    });

    const DELAY = 1500; // ms between reveals
    let seq = 0;

    // Reveal Kumpulan A first, then Kumpulan B, interleaved for drama
    const reveals: Array<{ group: 'A' | 'B'; slot: number; team: SupsasKontingen }> = [];
    const maxLen = Math.max(groupA.length, groupB.length);
    for (let i = 0; i < maxLen; i++) {
      if (groupA[i]) reveals.push({ group: 'A', slot: i + 1, team: groupA[i] });
      if (groupB[i]) reveals.push({ group: 'B', slot: i + 1, team: groupB[i] });
    }

    reveals.forEach(({ group, slot, team }) => {
      seq++;
      const t = setTimeout(async () => {
        await channelRef.current?.send({
          type: 'broadcast', event: 'draw',
          payload: {
            type: 'GROUP_REVEAL',
            group,
            slot,
            kontingenId: team.id,
            name: team.name,
            shortCode: team.short_code,
            color: team.color,
          } as DrawEvent,
        });
      }, DELAY * seq);
      broadcastTimersRef.current.push(t);
    });

    // Complete
    const completeT = setTimeout(async () => {
      await channelRef.current?.send({
        type: 'broadcast', event: 'draw',
        payload: {
          type: 'DRAW_COMPLETE',
          groupA: groupA.map(t => t.id),
          groupB: groupB.map(t => t.id),
        } as DrawEvent,
      });
    }, DELAY * (reveals.length + 1));
    broadcastTimersRef.current.push(completeT);

    return { groupA, groupB };
  }, [isAdmin]);

  // ── Admin: Cancel / Re-draw ────────────────────────────────
  const cancelDraw = useCallback(async () => {
    if (!isAdmin || !channelRef.current) return;
    broadcastTimersRef.current.forEach(clearTimeout);
    broadcastTimersRef.current = [];
    await channelRef.current.send({
      type: 'broadcast', event: 'draw',
      payload: { type: 'DRAW_CANCELLED' } as DrawEvent,
    });
    setDrawState(INITIAL_STATE);
  }, [isAdmin]);

  const resetDraw = useCallback(() => setDrawState(INITIAL_STATE), []);

  return { drawState, startDraw, cancelDraw, resetDraw };
}

// ─── Fixture generation: Group + KO format ───────────────────
/**
 * Jana 9 fixture untuk 6 pasukan format Kumpulan+KO:
 *   Kumpulan A (3 match): A1vA2, A1vA3, A2vA3
 *   Kumpulan B (3 match): B1vB2, B1vB3, B2vB3
 *   Separuh Akhir (2 match): TBD (diisi bila kumpulan selesai)
 *   Akhir (1 match): TBD
 *
 * next_match_id dikaitkan selepas insert untuk auto-advance.
 */
export interface BracketFixtureInsert {
  edition_id: string;
  sport_id: string;
  round: string;
  match_number: number;
  kontingen_a_id: string | null;
  kontingen_b_id: string | null;
  status: 'upcoming';
  bracket_round: number | null;
  bracket_position: number | null;
  group_name: string | null;
  is_bye: boolean;
}

export function generateGroupKnockoutFixtures(
  editionId: string,
  sportId: string,
  groupA: SupsasKontingen[],  // 3 pasukan
  groupB: SupsasKontingen[],  // 3 pasukan
): BracketFixtureInsert[] {
  const fixtures: BracketFixtureInsert[] = [];
  let matchNum = 1;

  // ── Kumpulan A (round-robin) ──────────────────────────────
  for (let i = 0; i < groupA.length; i++) {
    for (let j = i + 1; j < groupA.length; j++) {
      fixtures.push({
        edition_id: editionId,
        sport_id: sportId,
        round: 'Kumpulan A',
        match_number: matchNum++,
        kontingen_a_id: groupA[i].id,
        kontingen_b_id: groupA[j].id,
        status: 'upcoming',
        bracket_round: null,   // group stage bukan KO round
        bracket_position: null,
        group_name: 'A',
        is_bye: false,
      });
    }
  }

  // ── Kumpulan B (round-robin) ──────────────────────────────
  for (let i = 0; i < groupB.length; i++) {
    for (let j = i + 1; j < groupB.length; j++) {
      fixtures.push({
        edition_id: editionId,
        sport_id: sportId,
        round: 'Kumpulan B',
        match_number: matchNum++,
        kontingen_a_id: groupB[i].id,
        kontingen_b_id: groupB[j].id,
        status: 'upcoming',
        bracket_round: null,
        bracket_position: null,
        group_name: 'B',
        is_bye: false,
      });
    }
  }

  // ── Separuh Akhir (2 match) — TBD, akan diisi oleh admin bila kumpulan selesai ──
  // SF1: A1 vs B2
  fixtures.push({
    edition_id: editionId,
    sport_id: sportId,
    round: 'Separuh Akhir',
    match_number: matchNum++,
    kontingen_a_id: null, // A1 — diisi bila kumpulan A selesai
    kontingen_b_id: null, // B2 — diisi bila kumpulan B selesai
    status: 'upcoming',
    bracket_round: 2,
    bracket_position: 1,
    group_name: null,
    is_bye: false,
  });

  // SF2: B1 vs A2
  fixtures.push({
    edition_id: editionId,
    sport_id: sportId,
    round: 'Separuh Akhir',
    match_number: matchNum++,
    kontingen_a_id: null, // B1
    kontingen_b_id: null, // A2
    status: 'upcoming',
    bracket_round: 2,
    bracket_position: 2,
    group_name: null,
    is_bye: false,
  });

  // ── Akhir (1 match) — TBD ────────────────────────────────
  fixtures.push({
    edition_id: editionId,
    sport_id: sportId,
    round: 'Akhir',
    match_number: matchNum++,
    kontingen_a_id: null,
    kontingen_b_id: null,
    status: 'upcoming',
    bracket_round: 1,
    bracket_position: 1,
    group_name: null,
    is_bye: false,
  });

  return fixtures;
}

// ─── Group standings calculation ─────────────────────────────
export interface GroupStanding {
  kontingenId: string;
  name: string;
  shortCode: string;
  color: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export function calculateGroupStandings(
  groupFixtures: Array<{
    kontingen_a_id: string | null;
    kontingen_b_id: string | null;
    score_a: string | null;
    score_b: string | null;
    winner_id: string | null;
    status: string;
  }>,
  teamsInGroup: SupsasKontingen[],
): GroupStanding[] {
  const map: Record<string, GroupStanding> = {};

  for (const t of teamsInGroup) {
    map[t.id] = {
      kontingenId: t.id,
      name: t.name,
      shortCode: t.short_code,
      color: t.color,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    };
  }

  for (const f of groupFixtures) {
    if (f.status !== 'completed') continue;
    const a = f.kontingen_a_id;
    const b = f.kontingen_b_id;
    if (!a || !b || !map[a] || !map[b]) continue;

    const ga = parseInt(f.score_a ?? '0') || 0;
    const gb = parseInt(f.score_b ?? '0') || 0;

    map[a].played++; map[b].played++;
    map[a].goalsFor += ga; map[a].goalsAgainst += gb;
    map[b].goalsFor += gb; map[b].goalsAgainst += ga;

    if (ga > gb) {
      map[a].won++; map[a].points += 3;
      map[b].lost++;
    } else if (ga < gb) {
      map[b].won++; map[b].points += 3;
      map[a].lost++;
    } else {
      map[a].drawn++; map[a].points += 1;
      map[b].drawn++; map[b].points += 1;
    }
  }

  for (const s of Object.values(map)) {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
  }

  return Object.values(map).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.goalDiff !== x.goalDiff) return y.goalDiff - x.goalDiff;
    return y.goalsFor - x.goalsFor;
  });
}
