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
import type { SupsasKontingen, SupsasTeam } from '@/contexts/SupsasContext';

/**
 * DrawEntry — unit generik yang bertanding dalam draw.
 * Untuk sukan max_groups=1: satu kontingen = satu entry.
 * Untuk sukan max_groups>1: satu team = satu entry.
 */
export interface DrawEntry {
  id: string;           // kontingen.id ATAU team.id
  name: string;         // nama untuk papar
  shortCode: string;
  color: string;
  kontingenId: string;  // kontingen asal (untuk backward compat)
  teamId: string | null; // null jika bukan team-based
}

// ─── Event Types ──────────────────────────────────────────────
export type DrawEvent =
  | { type: 'DRAW_START'; sportId: string; sportName: string; totalTeams: number; slotDelay?: number }
  | { type: 'GROUP_REVEAL'; group: string; slot: number; entryId: string; kontingenId: string; name: string; shortCode: string; color: string; teamId: string | null }
  | { type: 'DRAW_COMPLETE'; groupA: string[]; groupB: string[] }
  | { type: 'DRAW_FINALIZED'; sportId: string; sportName: string }  // instant reveal
  | { type: 'DRAW_CANCELLED' };

// ─── Slot State ───────────────────────────────────────────────
export interface GroupDrawSlot {
  group: string;   // 'A' | 'B' | 'C' | 'D' — now any string
  slot: number;
  entryId: string | null;
  kontingenId: string | null;
  teamId: string | null;
  name: string | null;
  shortCode: string | null;
  color: string | null;
  revealed: boolean;
}

// ─── Draw Session State ───────────────────────────────────────
export interface LiveDrawState {
  status: 'idle' | 'drawing' | 'complete' | 'finalized' | 'cancelled';
  sportId: string | null;
  sportName: string | null;
  totalTeams: number;
  // Legacy: always present for backward compat
  groupA: GroupDrawSlot[];
  groupB: GroupDrawSlot[];
  finalGroupA: string[];
  finalGroupB: string[];
  // NEW: dynamic multi-group map (A/B/C/D)
  groups: Record<string, GroupDrawSlot[]>;
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
  groups: {},
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
function makeSlots(group: string, count: number): GroupDrawSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    group,
    slot: i + 1,
    entryId: null,
    kontingenId: null,
    teamId: null,
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
        // Dynamic: detect number of groups from totalTeams if slotDelay provided
        // For now keep legacy A/B slots; groups map filled by GROUP_REVEAL events
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
          groups: {},
        });
        break;
      }

      case 'GROUP_REVEAL': {
        const grp = event.group;
        setDrawState(prev => {
          // Update legacy groupA/groupB
          const newA = grp === 'A'
            ? prev.groupA.map(s => s.slot === event.slot
                ? { ...s, entryId: event.entryId, kontingenId: event.kontingenId, teamId: event.teamId, name: event.name, shortCode: event.shortCode, color: event.color, revealed: true }
                : s)
            : prev.groupA;
          const newB = grp === 'B'
            ? prev.groupB.map(s => s.slot === event.slot
                ? { ...s, entryId: event.entryId, kontingenId: event.kontingenId, teamId: event.teamId, name: event.name, shortCode: event.shortCode, color: event.color, revealed: true }
                : s)
            : prev.groupB;

          // Update dynamic groups map
          const prevSlots: GroupDrawSlot[] = prev.groups[grp] ?? [];
          // Ensure slot exists
          const existingSlot = prevSlots.find(s => s.slot === event.slot);
          let newSlots: GroupDrawSlot[];
          if (existingSlot) {
            newSlots = prevSlots.map(s => s.slot === event.slot
              ? { ...s, entryId: event.entryId, kontingenId: event.kontingenId, teamId: event.teamId, name: event.name, shortCode: event.shortCode, color: event.color, revealed: true }
              : s);
          } else {
            // Auto-grow: add new slot
            newSlots = [
              ...prevSlots,
              { group: grp, slot: event.slot, entryId: event.entryId, kontingenId: event.kontingenId, teamId: event.teamId, name: event.name, shortCode: event.shortCode, color: event.color, revealed: true },
            ].sort((a, b) => a.slot - b.slot);
          }

          return {
            ...prev,
            groupA: newA,
            groupB: newB,
            groups: { ...prev.groups, [grp]: newSlots },
          };
        });
        break;
      }

      case 'DRAW_COMPLETE':
        setDrawState(prev => ({
          ...prev,
          status: 'complete',
          finalGroupA: event.groupA,
          finalGroupB: event.groupB,
        }));
        break;

      case 'DRAW_FINALIZED':
        // Admin confirmed — instantly reveal all slots, skip pending animations
        setDrawState(prev => {
          const revealAll = (slots: GroupDrawSlot[]) =>
            slots.map(s => ({ ...s, revealed: true }));
          const newGroups: Record<string, GroupDrawSlot[]> = {};
          for (const [k, v] of Object.entries(prev.groups)) {
            newGroups[k] = revealAll(v);
          }
          return {
            ...prev,
            status: 'finalized' as const,
            sportId: event.sportId,
            sportName: event.sportName,
            groupA: revealAll(prev.groupA),
            groupB: revealAll(prev.groupB),
            groups: newGroups,
          };
        });
        break;

      case 'DRAW_CANCELLED':
        setDrawState(INITIAL_STATE);
        break;
    }
  }, []);

  // ── Admin: Start draw ──────────────────────────────────────
  // Accepts DrawEntry[] — works for both kontingen-based & team-based sports
  const startDraw = useCallback(async (
    sport: { id: string; name: string },
    entries: DrawEntry[],
  ) => {
    if (!isAdmin || !channelRef.current) return;

    broadcastTimersRef.current.forEach(clearTimeout);
    broadcastTimersRef.current = [];

    const shuffled = shuffle(entries);
    const groupASize = Math.ceil(shuffled.length / 2);
    const groupA = shuffled.slice(0, groupASize);
    const groupB = shuffled.slice(groupASize);

    await channelRef.current.send({
      type: 'broadcast', event: 'draw',
      payload: { type: 'DRAW_START', sportId: sport.id, sportName: sport.name, totalTeams: shuffled.length } as DrawEvent,
    });

    const DELAY = 1500;
    let seq = 0;

    const reveals: Array<{ group: 'A' | 'B'; slot: number; entry: DrawEntry }> = [];
    const maxLen = Math.max(groupA.length, groupB.length);
    for (let i = 0; i < maxLen; i++) {
      if (groupA[i]) reveals.push({ group: 'A', slot: i + 1, entry: groupA[i] });
      if (groupB[i]) reveals.push({ group: 'B', slot: i + 1, entry: groupB[i] });
    }

    reveals.forEach(({ group, slot, entry }) => {
      seq++;
      const t = setTimeout(async () => {
        await channelRef.current?.send({
          type: 'broadcast', event: 'draw',
          payload: {
            type: 'GROUP_REVEAL',
            group, slot,
            entryId: entry.id,
            kontingenId: entry.kontingenId,
            teamId: entry.teamId,
            name: entry.name,
            shortCode: entry.shortCode,
            color: entry.color,
          } as DrawEvent,
        });
      }, DELAY * seq);
      broadcastTimersRef.current.push(t);
    });

    const completeT = setTimeout(async () => {
      await channelRef.current?.send({
        type: 'broadcast', event: 'draw',
        payload: {
          type: 'DRAW_COMPLETE',
          groupA: groupA.map(e => e.id),
          groupB: groupB.map(e => e.id),
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
  team_a_id: string | null;  // NEW: untuk team-based sports
  team_b_id: string | null;  // NEW
  status: 'upcoming';
  bracket_round: number | null;
  bracket_position: number | null;
  group_name: string | null;
  is_bye: boolean;
}

/**
 * Versi baharu: accept DrawEntry[] supaya boleh guna untuk kontingen-based DAN team-based.
 */
export function generateGroupKnockoutFixtures(
  editionId: string,
  sportId: string,
  groupA: DrawEntry[],
  groupB: DrawEntry[],
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
        kontingen_a_id: groupA[i].kontingenId,
        kontingen_b_id: groupA[j].kontingenId,
        team_a_id: groupA[i].teamId,
        team_b_id: groupA[j].teamId,
        status: 'upcoming',
        bracket_round: null,
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
        kontingen_a_id: groupB[i].kontingenId,
        kontingen_b_id: groupB[j].kontingenId,
        team_a_id: groupB[i].teamId,
        team_b_id: groupB[j].teamId,
        status: 'upcoming',
        bracket_round: null,
        bracket_position: null,
        group_name: 'B',
        is_bye: false,
      });
    }
  }

  // ── Separuh Akhir: SF1 A1 vs B2, SF2 B1 vs A2 ───────────
  fixtures.push({
    edition_id: editionId, sport_id: sportId,
    round: 'Separuh Akhir', match_number: matchNum++,
    kontingen_a_id: null, kontingen_b_id: null,
    team_a_id: null, team_b_id: null,
    status: 'upcoming', bracket_round: 2, bracket_position: 1,
    group_name: null, is_bye: false,
  });
  fixtures.push({
    edition_id: editionId, sport_id: sportId,
    round: 'Separuh Akhir', match_number: matchNum++,
    kontingen_a_id: null, kontingen_b_id: null,
    team_a_id: null, team_b_id: null,
    status: 'upcoming', bracket_round: 2, bracket_position: 2,
    group_name: null, is_bye: false,
  });

  // ── Akhir ────────────────────────────────────────────────
  fixtures.push({
    edition_id: editionId, sport_id: sportId,
    round: 'Akhir', match_number: matchNum++,
    kontingen_a_id: null, kontingen_b_id: null,
    team_a_id: null, team_b_id: null,
    status: 'upcoming', bracket_round: 1, bracket_position: 1,
    group_name: null, is_bye: false,
  });

  return fixtures;
}

// ─── Group standings calculation ─────────────────────────────
export interface GroupStanding {
  entryId: string;      // team.id atau kontingen.id
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
    team_a_id?: string | null;
    team_b_id?: string | null;
    score_a: string | null;
    score_b: string | null;
    winner_id: string | null;
    status: string;
  }>,
  entries: DrawEntry[],
  isTeamBased: boolean = false,
): GroupStanding[] {
  const map: Record<string, GroupStanding> = {};

  for (const e of entries) {
    map[e.id] = {
      entryId: e.id,
      kontingenId: e.kontingenId,
      name: e.name,
      shortCode: e.shortCode,
      color: e.color,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    };
  }

  for (const f of groupFixtures) {
    if (f.status !== 'completed') continue;
    const a = isTeamBased ? (f.team_a_id ?? null) : f.kontingen_a_id;
    const b = isTeamBased ? (f.team_b_id ?? null) : f.kontingen_b_id;
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
