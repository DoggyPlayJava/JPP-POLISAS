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
import { LAUNCH_FPS, LAUNCH_HEIGHT, LAUNCH_PALETTE, LAUNCH_WIDTH } from './tokens';
import { probeMediaDurationSeconds } from './lib/mediaProbe';
import { CinemaChromeContext, GlobalCinemaGate } from './components/EditorialChrome';
import {
  EditorialShutterOverlay,
  WarmLightSweepOverlay,
  depthLiftMatch,
  editorialSplitCurtain,
  kineticCameraPush,
  orbitalIrisMatch,
  swissLouversWipe,
} from './motion/transitions';
import { OpeningHeroScene } from './scenes/OpeningHeroScene';
import { PolyMapsCampusScene } from './scenes/PolyMapsCampusScene';
import { PolyMartCommerceScene } from './scenes/PolyMartCommerceScene';
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
            presentation={kineticCameraPush({ direction: 'from-right' })}
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
            <EditorialShutterOverlay chapterCode="03" chapterLabel="EKONOMI KAMPUS" />
          </TransitionSeries.Overlay>

          <TransitionSeries.Sequence name="03 PolyMart Commerce" durationInFrames={396} premountFor={fps}>
            <PolyMartCommerceScene
              name="PolyMart Commerce"
              productsCount={stats.productsCount}
              ordersCount={stats.ordersCount}
              headline="Niaga Kampus Dalam Genggaman."
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={editorialSplitCurtain()}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="04 PolySuara Voice" durationInFrames={366} premountFor={fps}>
            <PolySuaraVoiceScene
              name="PolySuara Voice"
              pollTitle="Cadangan Menu Sihat Kafeteria Siswa 2026/2027"
              optionA="Set Ayam Percik & Salad Segar"
              optionB="Sandwic Telur Herba & Buah"
              percentageA={68}
              totalVotes={412}
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={swissLouversWipe()}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="05 Welfare & Care" durationInFrames={366} premountFor={fps}>
            <WelfareCareScene
              name="Welfare & Care"
              ticketNo="KBJ-2026-0842"
              slaLabel="< 48 JAM"
              headline="Kebajikan Disantuni Dengan Telus."
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={depthLiftMatch()}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="06 Clubs & EMS" durationInFrames={390} premountFor={fps}>
            <ClubsEmsScene
              name="Clubs & EMS"
              clubsCount={stats.clubsCount}
              activitiesCount={stats.activitiesCount}
              certSerial="EMS-CERT-2026-9041"
            />
          </TransitionSeries.Sequence>

          <TransitionSeries.Overlay durationInFrames={LAUNCH_OVERLAY_FRAMES} premountFor={fps}>
            <WarmLightSweepOverlay />
          </TransitionSeries.Overlay>

          <TransitionSeries.Sequence name="07 Impact Numbers" durationInFrames={366} premountFor={fps}>
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
            presentation={orbitalIrisMatch()}
            timing={linearTiming({ durationInFrames: LAUNCH_TRANSITION_FRAMES })}
          />

          <TransitionSeries.Sequence name="08 Closing Vault" durationInFrames={450} premountFor={fps}>
            <ClosingVaultScene
              name="Closing Vault"
              headlinePrimary={headlinePrimary}
              headlineItalic={headlineItalic}
              portalUrl={portalUrl}
            />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </CinemaChromeContext.Provider>

      <GlobalCinemaGate sessionLabel={sessionLabel} />
    </AbsoluteFill>
  );
};
