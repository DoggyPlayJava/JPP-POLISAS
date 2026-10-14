import React from 'react';
import { Composition } from 'remotion';
import { JppIntroVideo } from './JppIntroVideo';
import { JppIntroVideoSchema, type JppIntroVideoProps } from './schema';

const defaultProps: JppIntroVideoProps = {
  institutionName: 'POLITEKNIK SULTAN HAJI AHMAD SHAH',
  councilName: 'JAWATANKUASA PERWAKILAN PELAJAR',
  sessionLabel: 'SESI AKADEMIK 2026/2027',
  sloganLine1: 'Perpaduan Progresif',
  sloganLine2: 'Demi Mahasiswa.',
  portalUrl: 'jpp.polisas.edu.my',
  nextClass: {
    code: 'DIT3013',
    name: 'Pembangunan Aplikasi Web',
    time: '10:00 AM – 12:00 PM',
    room: 'Makmal Komputer 3 (Aras 2)',
    department: 'Jabatan Teknologi Maklumat & Komunikasi',
  },
  polyMart: {
    featuredProduct: 'CHICKEN POPCORN CRISPY',
    vendorName: 'QUADRA H ENTERPRISE',
    price: 'RM 9.00',
    productsCount: 277,
    ordersCount: 344,
  },
  polySuara: {
    pollTitle: 'Menu Sihat Kafeteria Siswa',
    optionA: 'Set Ayam Percik Salad',
    percentageA: 68,
    optionB: 'Sandwic Telur Herba',
    percentageB: 32,
    totalVotes: 412,
  },
  eAduan: {
    ticketNo: 'KBJ-2026-0842',
    category: 'Penyelenggaraan Dewan Kuliah Utama',
    slaHours: '< 48 Jam',
    statusStep: 3,
  },
  ems: {
    eventTitle: 'Malam Anugerah Kecemerlangan Mahasiswa (MAKMP)',
    studentName: 'AMIRUL HAKIM BIN AZMAN',
    matricNo: '04DAT24F1022',
    certSerial: 'EMS-CERT-2026-9041',
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="JppIntroVideo"
      component={JppIntroVideo}
      durationInFrames={1200}
      fps={30}
      width={1920}
      height={1080}
      schema={JppIntroVideoSchema}
      defaultProps={defaultProps}
    />
  );
};
