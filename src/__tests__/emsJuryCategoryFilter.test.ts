import { describe, it, expect } from 'vitest';

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
