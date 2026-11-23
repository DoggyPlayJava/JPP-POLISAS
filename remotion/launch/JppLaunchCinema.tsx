import React from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, type CalculateMetadataFunction } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import {
  LAUNCH_OVERLAY_FRAMES,
  LAUNCH_TOTAL_FRAMES,
  LAUNCH_TRANSITION_FRAMES,
  type LaunchShowcaseProps,
} from './schema';
import { LAUNCH_FPS, LAUNCH_HEIGHT, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE, LAUNCH_WIDTH } from './tokens';
import { probeMediaDurationSeconds } from './lib/mediaProbe';
import { CinemaChromeContext, GlobalCinemaGate } from './components/EditorialChrome';
import {
  EditorialShutterOverlay,
  WarmLightSweepOverlay,
  depthLiftMatch,
  editorialSplitCurtain,
  kineticCameraPush,
  orbitalIrisMatch,
  portalZoomMorph,
  swissLouversWipe,
} from './motion/transitions';
import { OpeningHeroScene, PORTAL_POLYMAPS_ORIGIN } from './scenes/OpeningHeroScene';
import { PolyMapsCampusScene } from './scenes/PolyMapsCampusScene';
import { PolyMartCommerceScene } from './scenes/PolyMartCommerceScene';
import { PolyRentHousingScene } from './scenes/PolyRentHousingScene';
import { PolySuaraVoiceScene } from './scenes/PolySuaraVoiceScene';
import { WelfareCareScene } from './scenes/WelfareCareScene';
import { ClubsEmsScene } from './scenes/ClubsEmsScene';
import { ImpactNumbersScene } from './scenes/ImpactNumbersScene';
import { ClosingVaultScene } from './scenes/ClosingVaultScene';

export const calculateLaunchMetadata: CalculateMetadataFunction<LaunchShowcaseProps> = async ({
  props,
}) => {
  const baseMetadata = {
    durationInFrames: LAUNCH_TOTAL_FRAMES,
    fps: LAUNCH_FPS,
    width: LAUNCH_WIDTH,
    height: LAUNCH_HEIGHT,
  };
  const trimmedBgm = props.bgmSrc.trim();
  if (trimmedBgm) {
    const resolvedSrc = trimmedBgm.startsWith('http') ? trimmedBgm : staticFile(trimmedBgm);
    const audioDurationSec = await probeMediaDurationSeconds(resolvedSrc);
    if (audioDurationSec === null) {
      return {
        ...baseMetadata,
        props: { ...props, bgmSrc: '' },
      };
    }
  } else if (props.bgmSrc) {
    return {
      ...baseMetadata,
      props: { ...props, bgmSrc: '' },
    };
  }
  return baseMetadata;
};

const CINEMA_CHROME_SUPPRESSED = { suppressLocalFrameMarks: true } as const;

export const JppLaunchCinema: React.FC<LaunchShowcaseProps> = ({
  institutionName,
  sessionLabel,
  headlinePrimary,
  headlineItalic,
  portalUrl,
  bgmSrc,
  bgmVolume,
  stats,
}) => {
  const { fps } = useVideoConfig();
  const resolvedBgmSrc = bgmSrc.trim();

  return (
    <AbsoluteFill style={{ backgroundColor: LAUNCH_PALETTE.BACKGROUND }}>
      {resolvedBgmSrc ? (
        <Audio
          name="Launch Background Music"
          src={resolvedBgmSrc.startsWith('http') ? resolvedBgmSrc : staticFile(resolvedBgmSrc)}
          volume={bgmVolume}
          premountFor={fps}
        />
      ) : null}

      <CinemaChromeContext.Provider value={CINEMA_CHROME_SUPPRESSED}>
        <TransitionSeries>
          <TransitionSeries.Sequence name="01 Opening Hero" durationInFrames={306} premountFor={fps}>
            <OpeningHeroScene
              name="Opening Hero"
              institutionName={institutionName}
              sessionLabel={sessionLabel}
              headlinePrimary={headlinePrimary}
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={portalZoomMorph({
              originXPercent: PORTAL_POLYMAPS_ORIGIN.xPercent,
              originYPercent: PORTAL_POLYMAPS_ORIGIN.yPercent,
              secondaryRingColor: LAUNCH_MODULE_THEMES.polymaps.primary,
            })}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="02 PolyMaps Campus" durationInFrames={480} premountFor={fps}>
            <PolyMapsCampusScene
              name="PolyMaps Campus"
              classCode="DIT3013"
              classTitle="Pembangunan Aplikasi Web"
              roomName="Makmal Komputer 3 • Blok JTMK"
              scheduleTime="10:00 AM – 12:00 PM • 4 Min Berjalan"
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Overlay durationInFrames={LAUNCH_OVERLAY_FRAMES} premountFor={fps}>
            <EditorialShutterOverlay
              chapterCode="03"
              chapterLabel="12:30 TGH HARI • KAFETERIA & JPP PAY"
              leadBladeColor={LAUNCH_MODULE_THEMES.polymart.dark}
              midBladeColor={LAUNCH_MODULE_THEMES.polymaps.dark}
              accentColor={LAUNCH_MODULE_THEMES.polymart.primary}
            />
          </TransitionSeries.Overlay>

          <TransitionSeries.Sequence name="03 PolyMart Commerce" durationInFrames={540} premountFor={fps}>
            <PolyMartCommerceScene
              name="PolyMart Commerce"
              productsCount={stats.productsCount}
              ordersCount={stats.ordersCount}
              headline="Lapar Lepas Kelas? Pesan Terus Tanpa Beratur."
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={kineticCameraPush({
              direction: 'from-right',
              accentColor: LAUNCH_MODULE_THEMES.polyrent.primary,
            })}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="04 PolyRent Housing" durationInFrames={540} premountFor={fps}>
            <PolyRentHousingScene
              name="PolyRent Housing"
              houseRentRm={680}
              walkMinutes={3}
              headline="Cari Bilik Sewa Sekitar Semambu? Kongsi Jimat Tanpa Scam."
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={editorialSplitCurtain({
              echoColor: LAUNCH_MODULE_THEMES.polysuara.primary,
            })}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="05 PolySuara Voice" durationInFrames={576} premountFor={fps}>
            <PolySuaraVoiceScene
              name="PolySuara Voice"
              pollTitle="Cadangan Kemudahan Siswa Semester Baharu"
              optionA="Tambah Meja Belajar & Plug Point Di Dataran Siswa"
              optionB="Lanjutkan Waktu Operasi Bilik Bacaan Kamsis"
              percentageA={68}
              totalVotes={412}
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={swissLouversWipe({
              palette: [
                LAUNCH_MODULE_THEMES.polysuara.primary,
                LAUNCH_MODULE_THEMES.kebajikan.primary,
                LAUNCH_MODULE_THEMES.foodbank.primary,
                LAUNCH_PALETTE.PRIMARY_DARK,
              ],
            })}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="06 Welfare & Care" durationInFrames={576} premountFor={fps}>
            <WelfareCareScene
              name="Welfare & Care"
              ticketNo="KBJ-0842"
              slaLabel="< 48 JAM"
              headline="Kamsis Bermasalah? Perlukan Food Bank? Kami Ada."
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={depthLiftMatch({
              accentColor: LAUNCH_MODULE_THEMES.kelab.primary,
            })}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="07 Clubs & EMS" durationInFrames={612} premountFor={fps}>
            <ClubsEmsScene
              name="Clubs & EMS"
              clubsCount={stats.clubsCount}
              activitiesCount={stats.activitiesCount}
              certSerial="EMS-CERT-2026-9041"
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Overlay durationInFrames={LAUNCH_OVERLAY_FRAMES} premountFor={fps}>
            <WarmLightSweepOverlay accentColor={LAUNCH_MODULE_THEMES.meritQr.primary} />
          </TransitionSeries.Overlay>

          <TransitionSeries.Sequence name="08 Impact Numbers" durationInFrames={426} premountFor={fps}>
            <ImpactNumbersScene
              name="Impact Numbers"
              clubsCount={stats.clubsCount}
              studentsCount={stats.studentsCount}
              activitiesCount={stats.activitiesCount}
              productsCount={stats.productsCount}
              ordersCount={stats.ordersCount}
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={orbitalIrisMatch({
              outerRingColor: LAUNCH_MODULE_THEMES.polymaps.primary,
            })}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="09 Closing Vault" durationInFrames={600} premountFor={fps}>
            <ClosingVaultScene
              name="Closing Vault"
              headlinePrimary="Imbas Sekarang. Mulakan Pengalaman Kampus Anda."
              headlineItalic={headlineItalic}
              portalUrl={portalUrl}
              studentsCount={stats.studentsCount}
            />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </CinemaChromeContext.Provider>

      <GlobalCinemaGate sessionLabel={sessionLabel} />
    </AbsoluteFill>
  );
};
