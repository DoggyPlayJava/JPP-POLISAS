import { describe, it, expect } from 'vitest';
import {
  getApplicableRubrics,
  getJuryParticipantScoreInfo,
  isParticipantAssignedToJury,
} from '@/components/ems/EmsJuryAuditMatrix';
import type { EmsParticipant, EmsJuryCode, EmsRubricCriteria, EmsScore } from '@/types';

describe('EMS Jury Portal Category Filtering Logic', () => {
  const makmpParticipants = [
    { id: '1', team_name: 'AGROSAS', category_name: 'Anugerah Projek Keusahawanan Terbaik' },
    { id: '2', team_name: 'AIAIZ ENTERPRISE', category_name: 'Anugerah Projek Keusahawanan Terbaik' },
    { id: '3', team_name: 'DANISH BONGSU ENTERPRISE', category_name: 'Anugerah Projek Keusahawanan Terbaik' },
    { id: '4', team_name: 'AIAIZ ENTERPRISE', category_name: 'Anugerah Perusahaan Pelajar Terbaik' },
    { id: '5', team_name: 'JAWATANKUASA PERWAKILAN PELAJAR', category_name: 'Anugerah Perusahaan Pelajar Terbaik' },
    { id: '6', team_name: 'COFFIVATORS ECOWORKS', category_name: 'Anugerah Perusahaan Pelajar Terbaik' },
    { id: '7', team_name: 'DANISH BONGSU ENTERPRISE', category_name: 'Anugerah Perusahaan Pelajar Terbaik' },
  ];

  const filterByCategory = (
    participants: typeof makmpParticipants,
    category: string
  ) => {
    const catLower = category.trim().toLowerCase();
    const hasSpecificParticipants = participants.some(
      (p) => (p.category_name || '').trim().toLowerCase() === catLower
    );

    return participants.filter((p) => {
      const pCat = (p.category_name || '').trim().toLowerCase();
      if (hasSpecificParticipants) {
        return pCat === catLower;
      }
      return true;
    });
  };

  it('filters Anugerah Projek Keusahawanan Terbaik to exactly 3 participants', () => {
    const results = filterByCategory(makmpParticipants, 'Anugerah Projek Keusahawanan Terbaik');
    expect(results).toHaveLength(3);
    expect(results.map((p) => p.team_name)).toEqual([
      'AGROSAS',
      'AIAIZ ENTERPRISE',
      'DANISH BONGSU ENTERPRISE',
    ]);
  });

  it('filters Anugerah Perusahaan Pelajar Terbaik to exactly 4 participants', () => {
    const results = filterByCategory(makmpParticipants, 'Anugerah Perusahaan Pelajar Terbaik');
    expect(results).toHaveLength(4);
    expect(results.map((p) => p.team_name)).toEqual([
      'AIAIZ ENTERPRISE',
      'JAWATANKUASA PERWAKILAN PELAJAR',
      'COFFIVATORS ECOWORKS',
      'DANISH BONGSU ENTERPRISE',
    ]);
  });

  it('retains all participants for generic bazaar event rubrics without matching participant category', () => {
    const carnivalParticipants = [
      { id: '1', team_name: 'Gerai Burger', category_name: 'MAKANAN' },
      { id: '2', team_name: 'Gerai Air Balang', category_name: 'MINUMAN' },
      { id: '3', team_name: 'Kraf Tangan', category_name: 'KRAF' },
    ];
    const results = filterByCategory(carnivalParticipants, 'Best Pitching Award');
    expect(results).toHaveLength(3);
  });
});

describe('EMS Jury Audit Matrix Rubric Scoping & Score Completion', () => {
  // 5 criteria for Projek, each weight 20%
  const projectRubrics: EmsRubricCriteria[] = [
    { id: 'r1', event_id: 'ev-1', criteria_name: 'Inovasi', max_score: 5, weight: 20, sort_order: 1, category_name: 'Anugerah Projek Keusahawanan Terbaik', section_name: 'Impak' },
    { id: 'r2', event_id: 'ev-1', criteria_name: 'Impak Komuniti', max_score: 5, weight: 20, sort_order: 2, category_name: 'Anugerah Projek Keusahawanan Terbaik', section_name: 'Impak' },
    { id: 'r3', event_id: 'ev-1', criteria_name: 'Kebolehlaksanaan', max_score: 5, weight: 20, sort_order: 3, category_name: 'Anugerah Projek Keusahawanan Terbaik', section_name: 'Kelestarian' },
    { id: 'r4', event_id: 'ev-1', criteria_name: 'Kelestarian', max_score: 5, weight: 20, sort_order: 4, category_name: 'Anugerah Projek Keusahawanan Terbaik', section_name: 'Kelestarian' },
    { id: 'r5', event_id: 'ev-1', criteria_name: 'Pembentangan', max_score: 5, weight: 20, sort_order: 5, category_name: 'Anugerah Projek Keusahawanan Terbaik', section_name: 'Pitching' },
  ];

  // 7 criteria for Perusahaan, total weight 100%
  const enterpriseRubrics: EmsRubricCriteria[] = [
    { id: 'r6', event_id: 'ev-1', criteria_name: 'Pendaftaran SSM', max_score: 5, weight: 10, sort_order: 6, category_name: 'Anugerah Perusahaan Pelajar Terbaik', section_name: 'Tadbir Urus' },
    { id: 'r7', event_id: 'ev-1', criteria_name: 'Penyata Kewangan', max_score: 5, weight: 15, sort_order: 7, category_name: 'Anugerah Perusahaan Pelajar Terbaik', section_name: 'Kewangan' },
    { id: 'r8', event_id: 'ev-1', criteria_name: 'Pertumbuhan Jualan', max_score: 5, weight: 15, sort_order: 8, category_name: 'Anugerah Perusahaan Pelajar Terbaik', section_name: 'Kewangan' },
    { id: 'r9', event_id: 'ev-1', criteria_name: 'Pemasaran Digital', max_score: 5, weight: 15, sort_order: 9, category_name: 'Anugerah Perusahaan Pelajar Terbaik', section_name: 'Operasi' },
    { id: 'r10', event_id: 'ev-1', criteria_name: 'Kualiti Produk', max_score: 5, weight: 15, sort_order: 10, category_name: 'Anugerah Perusahaan Pelajar Terbaik', section_name: 'Operasi' },
    { id: 'r11', event_id: 'ev-1', criteria_name: 'Peluang Pekerjaan', max_score: 5, weight: 15, sort_order: 11, category_name: 'Anugerah Perusahaan Pelajar Terbaik', section_name: 'Impak' },
    { id: 'r12', event_id: 'ev-1', criteria_name: 'Inovasi Perniagaan', max_score: 5, weight: 15, sort_order: 12, category_name: 'Anugerah Perusahaan Pelajar Terbaik', section_name: 'Inovasi' },
  ];

  const allRubrics = [...projectRubrics, ...enterpriseRubrics];

  // External Jury assigned to evaluate both categories
  const dualCategoryJury: EmsJuryCode = {
    id: 'jury-1',
    event_id: 'ev-1',
    code: '839402',
    jury_name: 'Dr. External Jury',
    organization: 'Kolej Komuniti',
    is_active: true,
    assigned_categories: [
      'Anugerah Projek Keusahawanan Terbaik',
      'Anugerah Perusahaan Pelajar Terbaik',
    ],
    assigned_booths: [],
  };

  const projectParticipant: EmsParticipant = {
    id: 'p-agrosas',
    event_id: 'ev-1',
    participant_type: 'STUDENT',
    entity_mode: 'TEAM',
    team_name: 'AGROSAS',
    leader_name: 'Ahmad',
    category_name: 'Anugerah Projek Keusahawanan Terbaik',
    booth_no: 'PK-01',
    is_checked_in: true,
  };

  const enterpriseParticipant: EmsParticipant = {
    id: 'p-coffivators',
    event_id: 'ev-1',
    participant_type: 'STUDENT',
    entity_mode: 'TEAM',
    team_name: 'COFFIVATORS ECOWORKS',
    leader_name: 'Siti',
    category_name: 'Anugerah Perusahaan Pelajar Terbaik',
    booth_no: 'PP-01',
    is_checked_in: true,
  };

  it('correctly assigns dual-category jury to both categories', () => {
    expect(isParticipantAssignedToJury(projectParticipant, dualCategoryJury, allRubrics)).toBe(true);
    expect(isParticipantAssignedToJury(enterpriseParticipant, dualCategoryJury, allRubrics)).toBe(true);
  });

  it('scopes applicable rubrics to exactly 5 for project participant even when jury has 2 assigned categories', () => {
    const applicable = getApplicableRubrics(projectParticipant, dualCategoryJury, allRubrics);
    expect(applicable).toHaveLength(5);
    expect(applicable.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
  });

  it('scopes applicable rubrics to exactly 7 for enterprise participant even when jury has 2 assigned categories', () => {
    const applicable = getApplicableRubrics(enterpriseParticipant, dualCategoryJury, allRubrics);
    expect(applicable).toHaveLength(7);
    expect(applicable.map((r) => r.id)).toEqual(['r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12']);
  });

  it('marks participant as COMPLETED (not PARTIAL) when all 5 project criteria are scored', () => {
    // 5 scores submitted by dualCategoryJury for AGROSAS (4/5 for each)
    const scores: EmsScore[] = projectRubrics.map((r) => ({
      id: `score-${r.id}`,
      event_id: 'ev-1',
      participant_id: projectParticipant.id,
      jury_code_id: dualCategoryJury.id,
      rubric_id: r.id,
      score: 4,
    }));

    const info = getJuryParticipantScoreInfo(projectParticipant, dualCategoryJury, allRubrics, scores);
    expect(info.status).toBe('COMPLETED');
    expect(info.submittedCount).toBe(5);
    expect(info.totalRequired).toBe(5);
    // 4/5 = 80% on all 5 rubrics -> 80% total
    expect(info.percentage).toBe(80.0);
  });

  it('marks enterprise participant as PARTIAL if only 5 out of 7 criteria scored, and COMPLETED when all 7 scored', () => {
    // Only 5 scores for enterprise participant
    const partialScores: EmsScore[] = enterpriseRubrics.slice(0, 5).map((r) => ({
      id: `score-${r.id}`,
      event_id: 'ev-1',
      participant_id: enterpriseParticipant.id,
      jury_code_id: dualCategoryJury.id,
      rubric_id: r.id,
      score: 5,
    }));

    const partialInfo = getJuryParticipantScoreInfo(enterpriseParticipant, dualCategoryJury, allRubrics, partialScores);
    expect(partialInfo.status).toBe('PARTIAL');
    expect(partialInfo.submittedCount).toBe(5);
    expect(partialInfo.totalRequired).toBe(7);

    // All 7 scores submitted
    const fullScores: EmsScore[] = enterpriseRubrics.map((r) => ({
      id: `score-${r.id}`,
      event_id: 'ev-1',
      participant_id: enterpriseParticipant.id,
      jury_code_id: dualCategoryJury.id,
      rubric_id: r.id,
      score: 5,
    }));

    const fullInfo = getJuryParticipantScoreInfo(enterpriseParticipant, dualCategoryJury, allRubrics, fullScores);
    expect(fullInfo.status).toBe('COMPLETED');
    expect(fullInfo.submittedCount).toBe(7);
    expect(fullInfo.totalRequired).toBe(7);
    expect(fullInfo.percentage).toBe(100.0);
  });

  it('reads participant category from custom_responses fallback when category_name is empty', () => {
    const customResponseParticipant: EmsParticipant = {
      id: 'p-custom',
      event_id: 'ev-1',
      participant_type: 'STUDENT',
      entity_mode: 'TEAM',
      team_name: 'Custom Team',
      leader_name: 'Ali',
      category_name: null as any,
      custom_responses: {
        category: 'Anugerah Projek Keusahawanan Terbaik',
      },
      is_checked_in: true,
    };

    const applicable = getApplicableRubrics(customResponseParticipant, dualCategoryJury, allRubrics);
    expect(applicable).toHaveLength(5);
  });
});

