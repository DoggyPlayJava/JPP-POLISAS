/**
 * useBracket — Jana bracket fixtures terus ke DB.
 *
 * DYNAMIC BRACKET FORMAT:
 *   N ≤ 8 entries → 2 kumpulan → top 2 each → SF (4 teams) → Final
 *   N > 8 entries → 4 kumpulan → top 2 each → QF (8 teams) → SF → Final
 *
 * Tidak bergantung pada Supabase Realtime channel.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DrawEntry } from './useLiveDraw';
import type { SupsasSport } from '@/contexts/SupsasContext';

/** Array of groups — 2 groups jika N ≤ 8, 4 groups jika N > 8 */
export interface BracketGroups {
  groups: DrawEntry[][];    // groups[0] = Kumpulan A, groups[1] = B, dst
  numGroups: number;        // 2 atau 4
}

export const GROUP_LABELS = ['A', 'B', 'C', 'D'] as const;
export const GROUP_COLORS = ['#F59E0B', '#8B5CF6', '#10B981', '#EF4444'] as const;

// ─── Fisher-Yates shuffle ─────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Build fixture rows ───────────────────────────────────────
export function buildFixtures(
  editionId: string,
  sportId: string,
  groups: DrawEntry[][],
): Record<string, unknown>[] {
  const fixtures: Record<string, unknown>[] = [];
  let matchNum = 1;
  const numGroups = groups.length; // 2 or 4

  // ── Group stage: round-robin within each group ──────────────
  for (let g = 0; g < numGroups; g++) {
    const group = groups[g];
    const label = GROUP_LABELS[g];
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        fixtures.push({
          edition_id: editionId, sport_id: sportId,
          round: `Kumpulan ${label}`, match_number: matchNum++,
          kontingen_a_id: group[i].kontingenId,
          kontingen_b_id: group[j].kontingenId,
          team_a_id: group[i].teamId ?? null,
          team_b_id: group[j].teamId ?? null,
          status: 'upcoming',
          bracket_round: null, bracket_position: null,
          group_name: label, is_bye: false,
        });
      }
    }
  }

  if (numGroups === 2) {
    // ── 2-group format: SF (bracket_round=2) + Final ─────────
    // SF1: A1 vs B2, SF2: B1 vs A2
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

  } else {
    // ── 4-group format: QF (bracket_round=3) ─────────────────
    // QF1: A1 vs B2, QF2: B1 vs A2, QF3: C1 vs D2, QF4: D1 vs C2
    for (let pos = 1; pos <= 4; pos++) {
      fixtures.push({
        edition_id: editionId, sport_id: sportId,
        round: 'Suku Akhir', match_number: matchNum++,
        kontingen_a_id: null, kontingen_b_id: null,
        team_a_id: null, team_b_id: null,
        status: 'upcoming', bracket_round: 3, bracket_position: pos,
        group_name: null, is_bye: false,
      });
    }

    // SF (bracket_round=2): QF1/QF2 winner, QF3/QF4 winner
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
  }

  // ── Final (bracket_round=1) — always last ───────────────────
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

// ─── Hook ─────────────────────────────────────────────────────
export function useBracket() {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /**
   * Shuffle entries dan bahagi kepada 2 atau 4 kumpulan.
   * Distribusi seragam menggunakan round-robin assignment.
   */
  const generateGroups = useCallback((entries: DrawEntry[]): BracketGroups => {
    const shuffled = shuffle(entries);
    const numGroups = shuffled.length > 8 ? 4 : 2;
    const groups: DrawEntry[][] = Array.from({ length: numGroups }, () => []);

    // Round-robin distribution: entry ke-i masuk ke groups[i % numGroups]
    // Ini pastikan setiap kumpulan dapat bilangan yang hampir sama
    shuffled.forEach((entry, i) => {
      groups[i % numGroups].push(entry);
    });

    return { groups, numGroups };
  }, []);

  /** Simpan fixtures ke DB (hapus lama dulu). */
  const saveFixtures = useCallback(async (
    editionId: string,
    sport: SupsasSport,
    bracketGroups: BracketGroups,
  ): Promise<boolean> => {
    setSaving(true);
    setErrorMsg(null);

    try {
      // Padam fixtures lama
      const { error: delErr } = await supabase
        .from('supsas_fixtures')
        .delete()
        .eq('sport_id', sport.id);
      if (delErr) throw new Error('Gagal padam fixture lama: ' + delErr.message);

      const fixtures = buildFixtures(editionId, sport.id, bracketGroups.groups);

      const { data: inserted, error: insErr } = await supabase
        .from('supsas_fixtures')
        .insert(fixtures)
        .select('id, bracket_round, bracket_position');

      if (insErr || !inserted) throw new Error(insErr?.message ?? 'Ralat insert fixture');

      // ── Kait next_match_id ──────────────────────────────────
      const rows = inserted as Array<{ id: string; bracket_round: number; bracket_position: number }>;
      const finalMatch = rows.find(f => f.bracket_round === 1);
      const sfMatches = rows.filter(f => f.bracket_round === 2).sort((a, b) => a.bracket_position - b.bracket_position);
      const qfMatches = rows.filter(f => f.bracket_round === 3).sort((a, b) => a.bracket_position - b.bracket_position);

      // SF → Final
      if (finalMatch) {
        await Promise.all(
          sfMatches.map(sf =>
            supabase.from('supsas_fixtures').update({ next_match_id: finalMatch.id }).eq('id', sf.id),
          ),
        );
      }

      // QF → SF (QF1+QF2 → SF1, QF3+QF4 → SF2)
      if (qfMatches.length === 4 && sfMatches.length === 2) {
        await Promise.all([
          supabase.from('supsas_fixtures').update({ next_match_id: sfMatches[0].id }).eq('id', qfMatches[0].id),
          supabase.from('supsas_fixtures').update({ next_match_id: sfMatches[0].id }).eq('id', qfMatches[1].id),
          supabase.from('supsas_fixtures').update({ next_match_id: sfMatches[1].id }).eq('id', qfMatches[2].id),
          supabase.from('supsas_fixtures').update({ next_match_id: sfMatches[1].id }).eq('id', qfMatches[3].id),
        ]);
      }

      setSaving(false);
      return true;
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Ralat tidak diketahui');
      setSaving(false);
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setSaving(false);
    setErrorMsg(null);
  }, []);

  return { saving, errorMsg, generateGroups, saveFixtures, reset };
}
