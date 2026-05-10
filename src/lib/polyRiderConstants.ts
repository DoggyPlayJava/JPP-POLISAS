// PolyRider — Shared Constants
// Diimport oleh PolyRiderHome.tsx dan PolyRiderDashboard.tsx

export const POLYRIDER_ADDONS = [
  {
    key: 'BESAR',
    label: 'Barang Besar/Berat',
    emoji: '📦',
    hint: 'Bagasi, dobi, barang beli-belah berat',
  },
  {
    key: 'LEBIH_SEORANG',
    label: 'Lebih dari 1 Orang',
    emoji: '👥',
    hint: 'Akan ada 2 orang atau lebih',
  },
  {
    key: 'HUJAN',
    label: 'Perlu Perlindungan',
    emoji: '☂️',
    hint: 'Lebih suka kereta semasa hujan',
  },
] as const;

export type AddonKey = (typeof POLYRIDER_ADDONS)[number]['key'];
