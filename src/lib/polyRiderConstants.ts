// PolyRider — Shared Constants
// Diimport oleh PolyRiderHome.tsx dan PolyRiderDashboard.tsx

import i18n from '@/lib/i18n';

const t = (k: string, fb: string, opt?: any): string =>
  (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...opt }) as string) : fb);

export const POLYRIDER_ADDONS = [
  {
    key: 'BESAR' as const,
    label: t('gig:pref_large_cargo', 'Barang Besar/Berat'),
    emoji: '📦',
    hint: t('gig:pref_large_cargo_desc', 'Bagasi, dobi, barang beli-belah berat'),
  },
  {
    key: 'LEBIH_SEORANG' as const,
    label: t('gig:pref_more_than_one', 'Lebih dari 1 Orang'),
    emoji: '👥',
    hint: t('gig:pref_more_than_one_desc', 'Akan ada 2 orang atau lebih'),
  },
  {
    key: 'HUJAN' as const,
    label: t('gig:pref_need_shelter', 'Perlu Perlindungan'),
    emoji: '☂️',
    hint: t('gig:pref_need_shelter_desc', 'Lebih suka kereta semasa hujan'),
  },
];

export type AddonKey = (typeof POLYRIDER_ADDONS)[number]['key'];
