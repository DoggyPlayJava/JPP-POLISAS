import React from 'react';
import { AbsoluteFill, staticFile, useVideoConfig, type CalculateMetadataFunction } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import {
  LAUNCH_OVERLAY_FRAMES,
  LAUNCH_TOTAL_FRAMES,
  LAUNCH_TRANSITION_FRAMES,
  type LaunchShowcaseProps,
} from './schema';
import { LAUNCH_FPS, LAUNCH_HEIGHT, LAUNCH_PALETTE, LAUNCH_WIDTH } from './tokens';
import { probeMediaDurationSeconds } from './lib/mediaProbe';
import {
  EditorialShutterOverlay,
  WarmLightSweepOverlay,
  depthLiftMatch,
  editorialSplitCurtain,
  kineticCameraPush,
  orbitalIrisMatch,
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

      <TransitionSeries>
        <TransitionSeries.Sequence name="01 Opening Hero" durationInFrames={300} premountFor={fps}>
          <OpeningHeroScene
            name="Opening Hero"
            institutionName={institutionName}
            sessionLabel={sessionLabel}
            headlinePrimary={headlinePrimary}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={kineticCameraPush({ direction: 'from-right' })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: LAUNCH_TRANSITION_FRAMES })}
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

        <TransitionSeries.Sequence name="03 PolyMart Commerce" durationInFrames={390} premountFor={fps}>
          <PolyMartCommerceScene
            name="PolyMart Commerce"
            productsCount={stats.productsCount}
            ordersCount={stats.ordersCount}
            headline="Niaga Kampus Dalam Genggaman."
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={editorialSplitCurtain()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: LAUNCH_TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence name="04 PolySuara Voice" durationInFrames={360} premountFor={fps}>
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
          presentation={clockWipe({ width: LAUNCH_WIDTH, height: LAUNCH_HEIGHT })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: LAUNCH_TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence name="05 Welfare & Care" durationInFrames={360} premountFor={fps}>
          <WelfareCareScene
            name="Welfare & Care"
            ticketNo="KBJ-2026-0842"
            slaLabel="< 48 JAM"
            headline="Kebajikan Disantuni Dengan Telus."
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={depthLiftMatch()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: LAUNCH_TRANSITION_FRAMES })}
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

        <TransitionSeries.Sequence name="07 Impact Numbers" durationInFrames={360} premountFor={fps}>
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
          timing={springTiming({ config: { damping: 200 }, durationInFrames: LAUNCH_TRANSITION_FRAMES })}
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
    </AbsoluteFill>
  );
};
