import React from 'react';
import { Composition, Folder } from 'remotion';
import { JppIntroVideo } from './JppIntroVideo';
import { JppIntroVideoSchema, type JppIntroVideoProps } from './schema';
import { JppLaunchCinema, calculateLaunchMetadata } from './launch/JppLaunchCinema';
import { LAUNCH_TOTAL_FRAMES, LaunchShowcaseSchema } from './launch/schema';
import { LAUNCH_FPS, LAUNCH_HEIGHT, LAUNCH_WIDTH } from './launch/tokens';
import { OpeningHeroScene } from './launch/scenes/OpeningHeroScene';
import { PolyMapsCampusScene } from './launch/scenes/PolyMapsCampusScene';
import { PolyMartCommerceScene } from './launch/scenes/PolyMartCommerceScene';
import { PolySuaraVoiceScene } from './launch/scenes/PolySuaraVoiceScene';
import { WelfareCareScene } from './launch/scenes/WelfareCareScene';
import { ClubsEmsScene } from './launch/scenes/ClubsEmsScene';
import { ImpactNumbersScene } from './launch/scenes/ImpactNumbersScene';
import { ClosingVaultScene } from './launch/scenes/ClosingVaultScene';

const legacyIntroDefaultProps: JppIntroVideoProps = {
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
    <>
      <Folder name="Launch-Cinema">
        <Composition
          id="JppLaunchCinema"
          component={JppLaunchCinema}
          durationInFrames={LAUNCH_TOTAL_FRAMES}
          fps={LAUNCH_FPS}
          width={LAUNCH_WIDTH}
          height={LAUNCH_HEIGHT}
          schema={LaunchShowcaseSchema}
          calculateMetadata={calculateLaunchMetadata}
          defaultProps={{
            institutionName: 'POLITEKNIK SULTAN HAJI AHMAD SHAH',
            councilName: 'JAWATANKUASA PERWAKILAN PELAJAR',
            sessionLabel: 'SESI AKADEMIK 2026/2027',
            headlinePrimary: 'Baru Masuk POLISAS? Satu App Untuk Semua.',
            headlineItalic: 'Satu Kampus. Satu SuperApp Mahasiswa POLISAS.',
            portalUrl: 'https://jpp.polisas.edu.my',
            bgmSrc: '',
            bgmVolume: 0.35,
            stats: {
              clubsCount: 21,
              activitiesCount: 41,
              studentsCount: 1083,
              productsCount: 277,
              ordersCount: 344,
            },
          }}
        />
      </Folder>

      <Folder name="Launch-Scenes">
        <Composition
          id="OpeningHeroScene"
          component={OpeningHeroScene}
          durationInFrames={306}
          fps={LAUNCH_FPS}
          width={LAUNCH_WIDTH}
          height={LAUNCH_HEIGHT}
          defaultProps={{
            institutionName: 'POLITEKNIK SULTAN HAJI AHMAD SHAH',
            sessionLabel: 'SESI AKADEMIK 2026/2027',
            headlinePrimary: 'Baru Masuk POLISAS? Satu App Untuk Semua.',
          }}
        />
        <Composition
          id="PolyMapsCampusScene"
          component={PolyMapsCampusScene}
          durationInFrames={480}
          fps={LAUNCH_FPS}
          width={LAUNCH_WIDTH}
          height={LAUNCH_HEIGHT}
          defaultProps={{
            classCode: 'DIT3013',
            classTitle: 'Pembangunan Aplikasi Web',
            roomName: 'Makmal Komputer 3 • Blok JTMK',
            scheduleTime: '10:00 AM – 12:00 PM • 4 Min Berjalan',
          }}
        />
        <Composition
          id="PolyMartCommerceScene"
          component={PolyMartCommerceScene}
          durationInFrames={396}
          fps={LAUNCH_FPS}
          width={LAUNCH_WIDTH}
          height={LAUNCH_HEIGHT}
          defaultProps={{
            productsCount: 277,
            ordersCount: 344,
            headline: 'Lapar Lepas Kelas? Cari Bilik Sewa? Semua Di Sini.',
          }}
        />
        <Composition
          id="PolySuaraVoiceScene"
          component={PolySuaraVoiceScene}
          durationInFrames={366}
          fps={LAUNCH_FPS}
          width={LAUNCH_WIDTH}
          height={LAUNCH_HEIGHT}
          defaultProps={{
            pollTitle: 'Cadangan Kemudahan Siswa Semester Baharu',
            optionA: 'Tambah Meja Belajar & Plug Point Di Dataran Siswa',
            optionB: 'Lanjutkan Waktu Operasi Bilik Bacaan Kamsis',
            percentageA: 68,
            totalVotes: 412,
          }}
        />
        <Composition
          id="WelfareCareScene"
          component={WelfareCareScene}
          durationInFrames={366}
          fps={LAUNCH_FPS}
          width={LAUNCH_WIDTH}
          height={LAUNCH_HEIGHT}
          defaultProps={{
            ticketNo: 'KBJ-0842',
            slaLabel: '< 48 JAM',
            headline: 'Kamsis Bermasalah? Perlukan Food Bank? Kami Ada.',
          }}
        />
        <Composition
          id="ClubsEmsScene"
          component={ClubsEmsScene}
          durationInFrames={390}
          fps={LAUNCH_FPS}
          width={LAUNCH_WIDTH}
          height={LAUNCH_HEIGHT}
          defaultProps={{
            clubsCount: 21,
            activitiesCount: 41,
            certSerial: 'EMS-CERT-2026-9041',
          }}
        />
        <Composition
          id="ImpactNumbersScene"
          component={ImpactNumbersScene}
          durationInFrames={366}
          fps={LAUNCH_FPS}
          width={LAUNCH_WIDTH}
          height={LAUNCH_HEIGHT}
          defaultProps={{
            clubsCount: 21,
            studentsCount: 1083,
            activitiesCount: 41,
            productsCount: 277,
            ordersCount: 344,
          }}
        />
        <Composition
          id="ClosingVaultScene"
          component={ClosingVaultScene}
          durationInFrames={450}
          fps={LAUNCH_FPS}
          width={LAUNCH_WIDTH}
          height={LAUNCH_HEIGHT}
          defaultProps={{
            headlinePrimary: 'Imbas Sekarang. Mulakan Pengalaman Kampus Anda.',
            headlineItalic: 'Satu Kampus. Satu SuperApp Mahasiswa POLISAS.',
            portalUrl: 'https://jpp.polisas.edu.my',
          }}
        />
      </Folder>

      <Folder name="Legacy">
        <Composition
          id="JppIntroVideo"
          component={JppIntroVideo}
          durationInFrames={1200}
          fps={30}
          width={1920}
          height={1080}
          schema={JppIntroVideoSchema}
          defaultProps={legacyIntroDefaultProps}
        />
      </Folder>
    </>
  );
};
