import { z } from 'zod';

export const JppIntroVideoSchema = z.object({
  institutionName: z.string().default('POLITEKNIK SULTAN HAJI AHMAD SHAH'),
  councilName: z.string().default('JAWATANKUASA PERWAKILAN PELAJAR'),
  sessionLabel: z.string().default('SESI AKADEMIK 2026/2027'),
  sloganLine1: z.string().default('Perpaduan Progresif'),
  sloganLine2: z.string().default('Demi Mahasiswa.'),
  portalUrl: z.string().default('jpp.polisas.edu.my'),

  // Scene 1: PolyMaps & Jadual
  nextClass: z
    .object({
      code: z.string().default('DIT3013'),
      name: z.string().default('Pembangunan Aplikasi Web'),
      time: z.string().default('10:00 AM – 12:00 PM'),
      room: z.string().default('Makmal Komputer 3 (Aras 2)'),
      department: z.string().default('Jabatan Teknologi Maklumat & Komunikasi'),
    })
    .default({
      code: 'DIT3013',
      name: 'Pembangunan Aplikasi Web',
      time: '10:00 AM – 12:00 PM',
      room: 'Makmal Komputer 3 (Aras 2)',
      department: 'Jabatan Teknologi Maklumat & Komunikasi',
    }),

  // Scene 2: PolyMart
  polyMart: z
    .object({
      featuredProduct: z.string().default('CHICKEN POPCORN CRISPY'),
      vendorName: z.string().default('QUADRA H ENTERPRISE'),
      price: z.string().default('RM 9.00'),
      productsCount: z.number().default(277),
      ordersCount: z.number().default(344),
    })
    .default({
      featuredProduct: 'CHICKEN POPCORN CRISPY',
      vendorName: 'QUADRA H ENTERPRISE',
      price: 'RM 9.00',
      productsCount: 277,
      ordersCount: 344,
    }),

  // Scene 3: PolySuara
  polySuara: z
    .object({
      pollTitle: z.string().default('Menu Sihat Kafeteria Siswa'),
      optionA: z.string().default('Set Ayam Percik Salad'),
      percentageA: z.number().default(68),
      optionB: z.string().default('Sandwic Telur Herba'),
      percentageB: z.number().default(32),
      totalVotes: z.number().default(412),
    })
    .default({
      pollTitle: 'Menu Sihat Kafeteria Siswa',
      optionA: 'Set Ayam Percik Salad',
      percentageA: 68,
      optionB: 'Sandwic Telur Herba',
      percentageB: 32,
      totalVotes: 412,
    }),

  // Scene 4: E-Aduan Kebajikan
  eAduan: z
    .object({
      ticketNo: z.string().default('KBJ-2026-0842'),
      category: z.string().default('Penyelenggaraan Dewan Kuliah Utama'),
      slaHours: z.string().default('< 48 Jam'),
      statusStep: z.number().default(3), // 1: Dihantar, 2: Disemak, 3: Tindakan, 4: Selesai
    })
    .default({
      ticketNo: 'KBJ-2026-0842',
      category: 'Penyelenggaraan Dewan Kuliah Utama',
      slaHours: '< 48 Jam',
      statusStep: 3,
    }),

  // Scene 5: EMS (Event Management System)
  ems: z
    .object({
      eventTitle: z.string().default('Malam Anugerah Kecemerlangan Mahasiswa (MAKMP)'),
      studentName: z.string().default('AMIRUL HAKIM BIN AZMAN'),
      matricNo: z.string().default('04DAT24F1022'),
      certSerial: z.string().default('EMS-CERT-2026-9041'),
    })
    .default({
      eventTitle: 'Malam Anugerah Kecemerlangan Mahasiswa (MAKMP)',
      studentName: 'AMIRUL HAKIM BIN AZMAN',
      matricNo: '04DAT24F1022',
      certSerial: 'EMS-CERT-2026-9041',
    }),
});

export type JppIntroVideoProps = z.infer<typeof JppIntroVideoSchema>;
