import { describe, it, expect } from 'vitest';
import {
  findNextUnscoredParticipant,
  calculateBoothAuditSummary,
  EMS_LIKERT_OPTIONS,
  getParticipantCategory,
  isParticipantAssignedToJury,
  getApplicableRubrics,
  getJuryParticipantScoreInfo,
  type BoothAuditSummary,
  type EmsLikertOption,
} from '@/lib/ems';
import fs from 'fs';
import path from 'path';
import {
  Mic,
  Package,
  Image as ImageIcon,
  Video,
  Rocket,
  Award,
  XCircle,
  AlertCircle,
  MinusCircle,
  ThumbsUp,
  Sparkles,
} from 'lucide-react';
import { LIKERT_OPTIONS, getCategoryIcon } from '@/pages/ems/EmsJuryPortalPage';
import type {
  EmsParticipant,
  EmsJuryCode,
  EmsRubricCriteria,
  EmsScore,
} from '@/types';

// Regular expression to detect Unicode emojis and symbol pictographs
const BANNED_EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

describe('EMS Scoring Helpers — findNextUnscoredParticipant', () => {
  const participants: EmsParticipant[] = [
    {
      id: 'p-1',
      event_id: 'ev-1',
      participant_type: 'STUDENT',
      entity_mode: 'TEAM',
      team_name: 'Alpha Team',
      leader_name: 'Ahmad',
      category_name: 'Inovasi',
      booth_no: 'B01',
      is_checked_in: true,
      created_at: '2026-10-06T00:00:00Z',
    },
    {
      id: 'p-2',
      event_id: 'ev-1',
      participant_type: 'STUDENT',
      entity_mode: 'TEAM',
      team_name: 'Beta Team',
      leader_name: 'Badrul',
      category_name: 'Inovasi',
      booth_no: 'B02',
      is_checked_in: true,
      created_at: '2026-10-06T00:00:00Z',
    },
    {
      id: 'p-3',
      event_id: 'ev-1',
      participant_type: 'STUDENT',
      entity_mode: 'TEAM',
      team_name: 'Gamma Team',
      leader_name: 'Chong',
      category_name: 'Inovasi',
      booth_no: 'B03',
      is_checked_in: true,
      created_at: '2026-10-06T00:00:00Z',
    },
    {
      id: 'p-4',
      event_id: 'ev-1',
      participant_type: 'STUDENT',
      entity_mode: 'TEAM',
      team_name: 'Delta Food',
      leader_name: 'Danial',
      category_name: 'Makanan',
      booth_no: 'B04',
      is_checked_in: true,
      created_at: '2026-10-06T00:00:00Z',
    },
  ];

  it('finds the immediate next unscored participant in the same category', () => {
    // Only p-1 is scored
    const scores: EmsScore[] = [
      {
        id: 's-1',
        event_id: 'ev-1',
        participant_id: 'p-1',
        jury_code_id: 'j-1',
        rubric_id: 'r-1',
        score: 5,
        created_at: '2026-10-06T00:00:00Z',
      },
    ];

    const next = findNextUnscoredParticipant(participants, scores, 'p-1', 'Inovasi');
    expect(next).not.toBeNull();
    expect(next?.id).toBe('p-2');
  });

  it('skips scored participants and picks the next unscored participant', () => {
    // p-1 and p-2 scored, p-3 unscored
    const scores: EmsScore[] = [
      { id: 's-1', event_id: 'ev-1', participant_id: 'p-1', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
      { id: 's-2', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-1', rubric_id: 'r-1', score: 4, created_at: '' },
    ];

    const next = findNextUnscoredParticipant(participants, scores, 'p-1', 'Inovasi');
    expect(next?.id).toBe('p-3');
  });

  it('wraps around to earlier participants if only earlier booths are unscored', () => {
    // p-2 and p-3 scored, p-1 unscored; currently at p-3
    const scores: EmsScore[] = [
      { id: 's-2', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-1', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-3', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
    ];

    const next = findNextUnscoredParticipant(participants, scores, 'p-3', 'Inovasi');
    expect(next?.id).toBe('p-1');
  });

  it('filters participants by category strictly when category is specified', () => {
    // Inovasi: p-1, p-2, p-3 all scored.
    // Makanan: p-4 unscored.
    const scores: EmsScore[] = [
      { id: 's-1', event_id: 'ev-1', participant_id: 'p-1', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
      { id: 's-2', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-1', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-3', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
    ];

    // For Inovasi: none unscored -> null
    const nextInovasi = findNextUnscoredParticipant(participants, scores, 'p-1', 'Inovasi');
    expect(nextInovasi).toBeNull();

    // For ALL: finds p-4
    const nextAll = findNextUnscoredParticipant(participants, scores, 'p-1', 'ALL');
    expect(nextAll?.id).toBe('p-4');
  });

  it('returns null if all participants are scored', () => {
    const scores: EmsScore[] = [
      { id: 's-1', event_id: 'ev-1', participant_id: 'p-1', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
      { id: 's-2', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-1', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-3', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
      { id: 's-4', event_id: 'ev-1', participant_id: 'p-4', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
    ];

    const next = findNextUnscoredParticipant(participants, scores, 'p-1', null);
    expect(next).toBeNull();
  });

  it('excludes currentParticipantId even when it has no scores', () => {
    // Only 1 participant in list, unscored
    const singleParticipant: EmsParticipant[] = [participants[0]];
    const next = findNextUnscoredParticipant(singleParticipant, [], 'p-1', 'Inovasi');
    expect(next).toBeNull();
  });

  it('handles empty participants array gracefully', () => {
    expect(findNextUnscoredParticipant([], [], 'p-1')).toBeNull();
  });

  it('finds the first unscored participant if currentParticipantId is unknown or empty', () => {
    const next = findNextUnscoredParticipant(participants, [], '');
    expect(next?.id).toBe('p-1');
  });
});

describe('EMS Scoring Helpers — calculateBoothAuditSummary', () => {
  const participants: EmsParticipant[] = [
    { id: 'p-1', event_id: 'ev-1', participant_type: 'STUDENT', entity_mode: 'TEAM', leader_name: 'P1', booth_no: 'B01', is_checked_in: true, created_at: '' },
    { id: 'p-2', event_id: 'ev-1', participant_type: 'STUDENT', entity_mode: 'TEAM', leader_name: 'P2', booth_no: 'B02', is_checked_in: true, created_at: '' },
    { id: 'p-3', event_id: 'ev-1', participant_type: 'STUDENT', entity_mode: 'TEAM', leader_name: 'P3', booth_no: 'B03', is_checked_in: true, created_at: '' },
    { id: 'p-4', event_id: 'ev-1', participant_type: 'STUDENT', entity_mode: 'TEAM', leader_name: 'P4', booth_no: 'B04', is_checked_in: true, created_at: '' },
  ];

  const activeJuries: EmsJuryCode[] = [
    { id: 'j-1', event_id: 'ev-1', code: 'JURI-1', jury_name: 'Juri 1', is_active: true, created_at: '' },
    { id: 'j-2', event_id: 'ev-1', code: 'JURI-2', jury_name: 'Juri 2', is_active: true, created_at: '' },
    { id: 'j-3', event_id: 'ev-1', code: 'JURI-3', jury_name: 'Juri 3', is_active: true, created_at: '' },
    { id: 'j-inactive', event_id: 'ev-1', code: 'JURI-INACT', jury_name: 'Inactive', is_active: false, created_at: '' },
  ];

  const rubrics: EmsRubricCriteria[] = [
    { id: 'r-1', event_id: 'ev-1', criteria_name: 'Kualiti', max_score: 5, weight: 50, sort_order: 1 },
    { id: 'r-2', event_id: 'ev-1', criteria_name: 'Inovasi', max_score: 5, weight: 50, sort_order: 2 },
  ];

  it('correctly calculates deficit, surplus, and balanced booths', () => {
    // Setup scoring scenario:
    // Target average: 2 juries
    // p-1 has 1 jury (j-1 completed) -> DEFICIT (< 2)
    // p-2 has 2 juries (j-1, j-2 completed) -> BALANCED (== 2)
    // p-3 has 3 juries (j-1, j-2, j-3 completed) -> SURPLUS (> 2)
    // p-4 has 2 juries (j-1, j-2 completed) -> BALANCED (== 2)
    // Total completed evaluations: 1 + 2 + 3 + 2 = 8 across 4 booths -> avg = 2

    const scores: EmsScore[] = [
      // p-1 by j-1 (both rubrics)
      { id: 's-1', event_id: 'ev-1', participant_id: 'p-1', jury_code_id: 'j-1', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-2', event_id: 'ev-1', participant_id: 'p-1', jury_code_id: 'j-1', rubric_id: 'r-2', score: 4, created_at: '' },

      // p-2 by j-1 & j-2
      { id: 's-3', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
      { id: 's-4', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-1', rubric_id: 'r-2', score: 5, created_at: '' },
      { id: 's-5', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-2', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-6', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-2', rubric_id: 'r-2', score: 4, created_at: '' },

      // p-3 by j-1, j-2, j-3
      { id: 's-7', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
      { id: 's-8', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-1', rubric_id: 'r-2', score: 5, created_at: '' },
      { id: 's-9', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-2', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-10', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-2', rubric_id: 'r-2', score: 4, created_at: '' },
      { id: 's-11', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-3', rubric_id: 'r-1', score: 3, created_at: '' },
      { id: 's-12', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-3', rubric_id: 'r-2', score: 3, created_at: '' },

      // p-4 by j-1 & j-2
      { id: 's-13', event_id: 'ev-1', participant_id: 'p-4', jury_code_id: 'j-1', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-14', event_id: 'ev-1', participant_id: 'p-4', jury_code_id: 'j-1', rubric_id: 'r-2', score: 4, created_at: '' },
      { id: 's-15', event_id: 'ev-1', participant_id: 'p-4', jury_code_id: 'j-2', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-16', event_id: 'ev-1', participant_id: 'p-4', jury_code_id: 'j-2', rubric_id: 'r-2', score: 4, created_at: '' },
    ];

    const summary: BoothAuditSummary = calculateBoothAuditSummary(
      participants,
      activeJuries,
      rubrics,
      scores
    );

    expect(summary.totalBooths).toBe(4);
    expect(summary.activeJuriesCount).toBe(3); // Inactive excluded
    expect(summary.avgJuriesCount).toBe(2);
    expect(summary.scoredBooths).toBe(4);
    expect(summary.unscoredBooths).toBe(0);
    expect(summary.deficitCount).toBe(1); // p-1 has 1 < 2
    expect(summary.surplusCount).toBe(1); // p-3 has 3 > 2
    expect(summary.balancedCount).toBe(2); // p-2 and p-4 have 2 == 2

    // Conservation invariant
    expect(summary.deficitCount + summary.surplusCount + summary.balancedCount).toBe(summary.totalBooths);
  });

  it('respects ignoredFlags by counting ignored deficit/surplus as balanced', () => {
    const scores: EmsScore[] = [
      // p-1: 1 jury (< 2)
      { id: 's-1', event_id: 'ev-1', participant_id: 'p-1', jury_code_id: 'j-1', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-2', event_id: 'ev-1', participant_id: 'p-1', jury_code_id: 'j-1', rubric_id: 'r-2', score: 4, created_at: '' },

      // p-2: 2 juries (== 2)
      { id: 's-3', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
      { id: 's-4', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-1', rubric_id: 'r-2', score: 5, created_at: '' },
      { id: 's-5', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-2', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-6', event_id: 'ev-1', participant_id: 'p-2', jury_code_id: 'j-2', rubric_id: 'r-2', score: 4, created_at: '' },

      // p-3: 3 juries (> 2)
      { id: 's-7', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-1', rubric_id: 'r-1', score: 5, created_at: '' },
      { id: 's-8', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-1', rubric_id: 'r-2', score: 5, created_at: '' },
      { id: 's-9', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-2', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-10', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-2', rubric_id: 'r-2', score: 4, created_at: '' },
      { id: 's-11', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-3', rubric_id: 'r-1', score: 3, created_at: '' },
      { id: 's-12', event_id: 'ev-1', participant_id: 'p-3', jury_code_id: 'j-3', rubric_id: 'r-2', score: 3, created_at: '' },

      // p-4: 2 juries (== 2)
      { id: 's-13', event_id: 'ev-1', participant_id: 'p-4', jury_code_id: 'j-1', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-14', event_id: 'ev-1', participant_id: 'p-4', jury_code_id: 'j-1', rubric_id: 'r-2', score: 4, created_at: '' },
      { id: 's-15', event_id: 'ev-1', participant_id: 'p-4', jury_code_id: 'j-2', rubric_id: 'r-1', score: 4, created_at: '' },
      { id: 's-16', event_id: 'ev-1', participant_id: 'p-4', jury_code_id: 'j-2', rubric_id: 'r-2', score: 4, created_at: '' },
    ];

    // Ignore deficit for p-1 and surplus for p-3
    const ignoredFlags = {
      'p-1': true,
      'p-3': true,
    };

    const summary = calculateBoothAuditSummary(
      participants,
      activeJuries,
      rubrics,
      scores,
      ignoredFlags
    );

    expect(summary.deficitCount).toBe(0); // Ignored -> no active deficit
    expect(summary.surplusCount).toBe(0); // Ignored -> no active surplus
    expect(summary.balancedCount).toBe(4); // All 4 now treated as balanced
  });

  it('handles empty participants list without NaN or division by zero', () => {
    const summary = calculateBoothAuditSummary([], activeJuries, rubrics, []);
    expect(summary.totalBooths).toBe(0);
    expect(summary.scoredBooths).toBe(0);
    expect(summary.unscoredBooths).toBe(0);
    expect(summary.avgJuriesCount).toBe(0);
    expect(summary.deficitCount).toBe(0);
    expect(summary.surplusCount).toBe(0);
    expect(summary.balancedCount).toBe(0);
    expect(summary.activeJuriesCount).toBe(3);
  });

  it('handles completely unscored event correctly', () => {
    const summary = calculateBoothAuditSummary(participants, activeJuries, rubrics, []);
    expect(summary.totalBooths).toBe(4);
    expect(summary.scoredBooths).toBe(0);
    expect(summary.unscoredBooths).toBe(4);
    expect(summary.avgJuriesCount).toBe(0);
    expect(summary.deficitCount).toBe(0);
    expect(summary.surplusCount).toBe(0);
    expect(summary.balancedCount).toBe(4); // All 4 booths have 0 == avg (0)
  });
});

describe('EMS Likert Scale Specifications & Vector Icon Compliance', () => {
  it('contains exactly 5 options with values 1 through 5', () => {
    expect(EMS_LIKERT_OPTIONS).toHaveLength(5);
    const values = EMS_LIKERT_OPTIONS.map((opt) => opt.value).sort((a, b) => a - b);
    expect(values).toEqual([1, 2, 3, 4, 5]);
  });

  it('contains zero banned Unicode emojis in labels, short texts, and descriptors', () => {
    EMS_LIKERT_OPTIONS.forEach((opt: EmsLikertOption) => {
      expect(opt.label).not.toMatch(BANNED_EMOJI_REGEX);
      expect(opt.shortText).not.toMatch(BANNED_EMOJI_REGEX);
      expect(opt.defaultDescriptor).not.toMatch(BANNED_EMOJI_REGEX);
      expect(opt.iconName).not.toMatch(BANNED_EMOJI_REGEX);
    });
  });

  it('specifies valid Lucide icon references for all options', () => {
    const expectedIconNames = ['Sparkles', 'ThumbsUp', 'MinusCircle', 'AlertCircle', 'XCircle'];
    const actualIconNames = EMS_LIKERT_OPTIONS.map((opt) => opt.iconName);

    expectedIconNames.forEach((expected) => {
      expect(actualIconNames).toContain(expected);
    });
  });

  it('provides accessible color styling and descriptors', () => {
    EMS_LIKERT_OPTIONS.forEach((opt) => {
      expect(opt.badgeColor).toContain('dark:');
      expect(opt.activeBg).toContain('text-white');
      expect(opt.defaultDescriptor.length).toBeGreaterThan(10);
    });
  });
});

describe('EMS Helper Re-exports & Category Utilities', () => {
  it('correctly extracts participant category from various schema structures', () => {
    const p1: EmsParticipant = { id: '1', category_name: 'Inovasi', leader_name: 'Test', event_id: 'e', participant_type: 'STUDENT', entity_mode: 'INDIVIDUAL', is_checked_in: false, created_at: '' };
    const p2: EmsParticipant = { id: '2', custom_responses: { category: 'Makanan' }, leader_name: 'Test', event_id: 'e', participant_type: 'STUDENT', entity_mode: 'INDIVIDUAL', is_checked_in: false, created_at: '' };
    const p3: EmsParticipant = { id: '3', custom_responses: { category_name: 'Teknologi' }, leader_name: 'Test', event_id: 'e', participant_type: 'STUDENT', entity_mode: 'INDIVIDUAL', is_checked_in: false, created_at: '' };
    const p4: EmsParticipant = { id: '4', leader_name: 'Test', event_id: 'e', participant_type: 'STUDENT', entity_mode: 'INDIVIDUAL', is_checked_in: false, created_at: '' };

    expect(getParticipantCategory(p1)).toBe('Inovasi');
    expect(getParticipantCategory(p2)).toBe('Makanan');
    expect(getParticipantCategory(p3)).toBe('Teknologi');
    expect(getParticipantCategory(p4)).toBe('');
  });

  it('exports all required functions and types from @/lib/ems', () => {
    expect(typeof findNextUnscoredParticipant).toBe('function');
    expect(typeof calculateBoothAuditSummary).toBe('function');
    expect(typeof getParticipantCategory).toBe('function');
    expect(typeof isParticipantAssignedToJury).toBe('function');
    expect(typeof getApplicableRubrics).toBe('function');
    expect(typeof getJuryParticipantScoreInfo).toBe('function');
  });
});

describe('EMS Jury Portal SuperApp Revamp — EmsJuryPortalPage.tsx Compliance', () => {
  const portalPath = path.resolve(__dirname, '../pages/ems/EmsJuryPortalPage.tsx');
  const portalContent = fs.readFileSync(portalPath, 'utf-8');

  it('contains zero banned Unicode emojis in EmsJuryPortalPage.tsx', () => {
    const hasBannedEmoji = BANNED_EMOJI_REGEX.test(portalContent);
    expect(hasBannedEmoji).toBe(false);
  });

  it('imports and uses findNextUnscoredParticipant from @/lib/ems', () => {
    expect(portalContent).toContain('findNextUnscoredParticipant');
    expect(portalContent).toMatch(/import\s*\{[^}]*findNextUnscoredParticipant[^}]*\}\s*from\s*['"]@\/lib\/ems['"]/);
    expect(portalContent).toContain('findNextUnscoredParticipant(');
  });

  it('integrates draft persistence helpers createJuryDraftKey, serializeJuryDraft, deserializeJuryDraft', () => {
    expect(portalContent).toContain('createJuryDraftKey');
    expect(portalContent).toContain('serializeJuryDraft');
    expect(portalContent).toContain('deserializeJuryDraft');
    expect(portalContent).toContain('Draf Disimpan');
  });

  it('includes Sticky Bottom Action Bar tokens and Sahkan & Hantar Markah button', () => {
    expect(portalContent).toContain('fixed bottom-0 left-0 right-0 z-40');
    expect(portalContent).toContain('Sahkan & Hantar Markah');
    expect(portalContent).toContain('Batal / Tutup');
    expect(portalContent).toContain('Kriteria Dilengkapkan');
  });

  it('has removed the old gateway screen and duplicate next-category buttons', () => {
    expect(portalContent).not.toContain('Hub Pemilihan Kategori Penilaian Juri');
    expect(portalContent).not.toContain('Penilaian Kategori Seterusnya:');
    expect(portalContent).not.toContain('Tukar Kategori Cepat:');
  });

  it('uses Lucide vector icons for LIKERT_OPTIONS and getCategoryIcon instead of raw emojis', () => {
    // Vector Likert scale icons
    expect(portalContent).toContain('XCircle');
    expect(portalContent).toContain('AlertCircle');
    expect(portalContent).toContain('MinusCircle');
    expect(portalContent).toContain('ThumbsUp');
    expect(portalContent).toContain('Sparkles');

    // Vector category icons
    expect(portalContent).toContain('Mic');
    expect(portalContent).toContain('Package');
    expect(portalContent).toContain('ImageIcon');
    expect(portalContent).toContain('Video');
    expect(portalContent).toContain('Rocket');
    expect(portalContent).toContain('Award');
  });

  it('provides getCategoryIcon returning Lucide icon components', () => {
    expect(getCategoryIcon('Pitching')).toBe(Mic);
    expect(getCategoryIcon('Persembahan')).toBe(Mic);
    expect(getCategoryIcon('Showcase')).toBe(Package);
    expect(getCategoryIcon('Poster Grafik')).toBe(ImageIcon);
    expect(getCategoryIcon('Video Media')).toBe(Video);
    expect(getCategoryIcon('Inovasi Produk')).toBe(Rocket);
    expect(getCategoryIcon('Umum')).toBe(Award);
  });

  it('exports clean LIKERT_OPTIONS without raw emoji characters', () => {
    expect(LIKERT_OPTIONS).toHaveLength(5);
    LIKERT_OPTIONS.forEach((opt) => {
      expect(opt.label).not.toMatch(BANNED_EMOJI_REGEX);
      expect(opt.shortText).not.toMatch(BANNED_EMOJI_REGEX);
      expect(opt.defaultDescriptor).not.toMatch(BANNED_EMOJI_REGEX);
      expect(typeof opt.icon).toBe('object'); // React component (ForwardRef / component object)
    });
  });

  it('implements post-scoring celebration and next booth transition drawer', () => {
    expect(portalContent).toContain('Tahniah & Terima Kasih!');
    expect(portalContent).toContain('Tahniah! Semua booth dalam kategori ini telah selesai dinilai.');
    expect(portalContent).toContain('Nilai Booth Seterusnya:');
    expect(portalContent).toContain('Kembali ke Senarai');
  });
});

describe('EMS Jury Audit Control Board — EmsJuryAuditMatrix.tsx Compliance', () => {
  const matrixPath = path.resolve(__dirname, '../components/ems/EmsJuryAuditMatrix.tsx');
  const matrixContent = fs.readFileSync(matrixPath, 'utf-8');

  it('contains zero banned Unicode emojis in EmsJuryAuditMatrix.tsx', () => {
    const hasBannedEmoji = BANNED_EMOJI_REGEX.test(matrixContent);
    expect(hasBannedEmoji).toBe(false);
  });

  it('implements 4 Executive Telemetry KPI Cards with calculateBoothAuditSummary', () => {
    expect(matrixContent).toContain('Liputan Penjurian Booth');
    expect(matrixContent).toContain('Status Kemajuan Juri');
    expect(matrixContent).toContain('Anomali Terkurang Juri');
    expect(matrixContent).toContain('Anomali Terlebih Juri');
    expect(matrixContent).toContain('calculateBoothAuditSummary');
  });

  it('supports interactive quick-filtering from telemetry KPI cards', () => {
    expect(matrixContent).toContain('anomalyFilter');
    expect(matrixContent).toContain('setAnomalyFilter');
    expect(matrixContent).toContain('DEFICIT');
    expect(matrixContent).toContain('SURPLUS');
    expect(matrixContent).toContain('UNSCORED');
  });

  it('implements Bulk Anomaly Actions with localStorage persistence', () => {
    expect(matrixContent).toContain('Abaikan Semua Amaran');
    expect(matrixContent).toContain('Set Semula Semua Amaran');
    expect(matrixContent).toContain('ems_audit_ignored_flags_');
    expect(matrixContent).toContain('localStorage.getItem');
    expect(matrixContent).toContain('localStorage.setItem');
  });

  it('implements responsive matrix grid with sticky left columns and standardized cell badges', () => {
    expect(matrixContent).toContain('sticky left-0');
    expect(matrixContent).toContain('border-r');
    expect(matrixContent).toContain('Separuh');
    expect(matrixContent).toContain('Belum');
    expect(matrixContent).toContain('Edit3');
    expect(matrixContent).toContain('bg-emerald-50');
    expect(matrixContent).toContain('bg-amber-50');
    expect(matrixContent).toContain('bg-rose-50');
  });

  it('implements Director Score Override Modal with Obsidian styling and required audit comments', () => {
    expect(matrixContent).toContain('Pindaan Markah Juri (Pengarah Program)');
    expect(matrixContent).toContain('Catatan Audit Pengarah');
    expect(matrixContent).toContain('modalLivePercentage');
    expect(matrixContent).toContain('overrideJuryScore');
    expect(matrixContent).toContain('Sliders');
    expect(matrixContent).toContain('Simpan Pindaan Markah');
  });

  it('uses Lucide vector icons for anomaly badges and status indicators instead of raw emojis', () => {
    expect(matrixContent).toContain('ShieldCheck');
    expect(matrixContent).toContain('AlertTriangle');
    expect(matrixContent).toContain('ShieldAlert');
    expect(matrixContent).toContain('EyeOff');
    expect(matrixContent).toContain('Eye');
    expect(matrixContent).toContain('Scale');
    expect(matrixContent).toContain('RotateCcw');
    expect(matrixContent).toContain('CheckCircle2');
  });

  it('re-exports helper functions for backward compatibility', () => {
    expect(matrixContent).toContain('export {');
    expect(matrixContent).toContain('getParticipantCategory,');
    expect(matrixContent).toContain('isParticipantAssignedToJury,');
    expect(matrixContent).toContain('getApplicableRubrics,');
    expect(matrixContent).toContain('getJuryParticipantScoreInfo,');
  });
});

