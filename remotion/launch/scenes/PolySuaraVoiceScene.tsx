import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import {
  Check,
  CheckCircle2,
  Flame,
  Heart,
  MessageSquare,
  Share2,
  ShieldCheck,
  ThumbsUp,
  Users,
  Vote,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath, GhostCursor, type GhostCursorKeyframe } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';
import { ExplodedLayer, KineticWindow, PersonaMonogram } from '../ui/KineticCard';

export type PolySuaraProps = {
  readonly pollTitle: string;
  readonly optionA: string;
  readonly optionB: string;
  readonly percentageA: number;
  readonly totalVotes: number;
};

const STUDENT_POLL_TITLE_DEFAULT = 'Cadangan Kemudahan Siswa Semester Baharu';
const STUDENT_OPTION_A_DEFAULT = 'Tambah Meja Belajar & Plug Point Di Dataran Siswa';
const STUDENT_OPTION_B_DEFAULT = 'Lanjutkan Waktu Operasi Bilik Bacaan Kamsis';

const LEGACY_POLL_TITLE = 'cadangan menu sihat kafeteria siswa 2026/2027';
const LEGACY_OPTION_A = 'set ayam percik & salad segar';
const LEGACY_OPTION_B = 'sandwic telur herba & buah';

const resolveStudentText = (value: string, legacyLower: string, studentDefault: string): string => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === legacyLower) {
    return studentDefault;
  }
  return trimmed;
};

// Exact 1920x1080 Twin-Column Workbench geometry for pixel-locked GhostCursor alignment
const HEADER_RULE_LEFT = 64;
const HEADER_RULE_WIDTH = 1792;
const LEFT_COL_LEFT = 64;
const LEFT_COL_WIDTH = 840;
const CONFESSION_TOP = 236;
const CONFESSION_HEIGHT = 348;
const SHARE_CARD_LEFT = 96;
const SHARE_CARD_TOP = 604;
const SHARE_CARD_WIDTH = 776;
const SHARE_CARD_HEIGHT = 312;

const POLL_LEFT = 976;
const POLL_TOP = 236;
const POLL_WIDTH = 880;
const POLL_HEIGHT = 676;
const POLL_BORDER = 1.5;
const POLL_TOPBAR_H = 40;
const POLL_BODY_PAD_TOP = 24;
const POLL_BODY_PAD_X = 32;
const POLL_HEADER_H = 82;
const OPT_A_MARGIN_TOP = 18;
const OPT_A_HEIGHT = 196;

const OPT_A_INNER_W = POLL_WIDTH - POLL_BORDER * 2 - POLL_BODY_PAD_X * 2; // 813
const OPT_A_TOP =
  POLL_TOP +
  POLL_BORDER +
  POLL_TOPBAR_H +
  POLL_BODY_PAD_TOP +
  POLL_HEADER_H +
  OPT_A_MARGIN_TOP; // 401.5
const OPT_A_CENTER_X = Number(
  (POLL_LEFT + POLL_BORDER + POLL_BODY_PAD_X + OPT_A_INNER_W / 2).toFixed(1),
); // 1416
const OPT_A_CENTER_Y = Number((OPT_A_TOP + OPT_A_HEIGHT / 2).toFixed(1)); // 499.5

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const RACE_EASE = Easing.bezier(0.25, 1, 0.5, 1);
const VOTES_SETTLE_EASE = Easing.bezier(0.22, 1, 0.36, 1);

const REACTION_SPECS = [
  { id: 'flame', target: 128, icon: 'flame' as const, color: LAUNCH_PALETTE.ACCENT },
  { id: 'thumbsup', target: 84, icon: 'thumbsup' as const, color: LAUNCH_PALETTE.SECONDARY },
  { id: 'heart', target: 62, icon: 'heart' as const, color: LAUNCH_PALETTE.ACCENT },
] as const;

const renderReactionIcon = (kind: (typeof REACTION_SPECS)[number]['icon'], color: string) => {
  switch (kind) {
    case 'flame':
      return <Flame size={16} color={color} strokeWidth={2.4} />;
    case 'thumbsup':
      return <ThumbsUp size={16} color={color} strokeWidth={2.4} />;
    case 'heart':
      return <Heart size={16} color={color} strokeWidth={2.4} />;
  }
};

const PolySuaraVoiceInner: React.FC<PolySuaraProps> = ({
  pollTitle,
  optionA,
  optionB,
  percentageA,
  totalVotes,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeDuration = Math.max(30, Number.isFinite(durationInFrames) ? durationInFrames : 366);
  const timeSec = frame / safeFps;

  const resolvedPollTitle = resolveStudentText(
    pollTitle,
    LEGACY_POLL_TITLE,
    STUDENT_POLL_TITLE_DEFAULT,
  );
  const resolvedOptionA = resolveStudentText(optionA, LEGACY_OPTION_A, STUDENT_OPTION_A_DEFAULT);
  const resolvedOptionB = resolveStudentText(optionB, LEGACY_OPTION_B, STUDENT_OPTION_B_DEFAULT);

  const clampedA = Number.isFinite(percentageA) ? Math.min(100, Math.max(0, percentageA)) : 68;
  const clampedB = 100 - clampedA;
  const safeTotalVotes = Number.isFinite(totalVotes) ? Math.max(0, Math.round(totalVotes)) : 412;

  // Beat 1 (0..1.4s): EvolvingPath rule + Student Header + Left Confession & Right Poll Windows
  const dividerDuration = Math.max(10, Math.round(0.72 * safeFps));
  const pillStart = Math.round(0.05 * safeFps);
  const pillDuration = Math.max(8, Math.round(0.36 * safeFps));
  const headlineStart = Math.round(0.12 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.06 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.35 * safeFps));

  const headerOpacity = interpolate(frame, [0, Math.max(8, Math.round(0.3 * safeFps))], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const leftCardEnter = interpolate(
    frame,
    [Math.round(0.26 * safeFps), Math.round(0.88 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const leftCardOpacity = interpolate(leftCardEnter, [0, 0.35, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const leftCardY = interpolate(leftCardEnter, [0, 1], [28, 0]);
  const leftCardFloat = Math.sin(timeSec * 1.35) * 2.4 * leftCardEnter;

  const pollEnterProgress = interpolate(
    frame,
    [Math.round(0.34 * safeFps), Math.round(1.0 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const pollScale = interpolate(pollEnterProgress, [0, 1], [0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });
  const pollTranslateY = interpolate(pollEnterProgress, [0, 1], [24, 0]);
  const pollOpacity = interpolate(pollEnterProgress, [0, 0.35, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pollFloatY = Math.cos(timeSec * 1.2 + 0.8) * 2.2 * pollEnterProgress;

  // Beat 2 (1.15..3.7s): Live Voting Race + GhostCursor click on Option A + Reaction Counter Pops
  const racePhase1Start = Math.round(1.15 * safeFps); // 69f
  const cursorAppearFrame = Math.round(1.65 * safeFps); // 99f
  const clickFrame = Math.round(2.25 * safeFps); // 135f
  const cursorHoldEnd = clickFrame + Math.max(4, Math.round(0.24 * safeFps)); // 149f
  const cursorLeaveFrame = Math.round(2.72 * safeFps); // 163f
  const cursorDisappearFrame = Math.round(2.92 * safeFps); // 175f

  const racePhase2Start = clickFrame + Math.max(2, Math.round(0.05 * safeFps)); // 138f
  const racePhase2End = Math.round(3.65 * safeFps); // 219f
  const votesEndFrame = Math.round(4.05 * safeFps); // 243f

  // Guard preClickA <= clampedA so low percentageA (< 12) never dips backward post-click.
  const preClickA = Math.min(clampedA, Math.min(38, Math.max(12, Math.round(clampedA * 0.56))));
  const preClickB = Math.min(48, Math.max(44, Math.round(clampedB * 0.9)));

  const phase1A = interpolate(frame, [racePhase1Start, clickFrame], [0, preClickA], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: RACE_EASE,
  });
  const phase1B = interpolate(frame, [racePhase1Start, clickFrame], [0, preClickB], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: RACE_EASE,
  });

  const phase2Surge = interpolate(frame, [racePhase2Start, racePhase2End], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  const barA = frame <= clickFrame ? phase1A : preClickA + (clampedA - preClickA) * phase2Surge;
  const barB = frame <= clickFrame ? phase1B : preClickB + (clampedB - preClickB) * phase2Surge;

  const midVotes = Math.round(safeTotalVotes * 0.58);
  const votesPhase1 = interpolate(frame, [racePhase1Start, clickFrame], [0, midVotes], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: RACE_EASE,
  });
  const votesPhase2Progress = interpolate(frame, [racePhase2Start, votesEndFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: VOTES_SETTLE_EASE,
  });
  const liveVotes =
    frame <= clickFrame
      ? Math.round(votesPhase1)
      : Math.round(midVotes + (safeTotalVotes - midVotes) * votesPhase2Progress);

  const optionAVotes = Math.round(liveVotes * (Math.round(barA) / 100));
  const optionBVotes = Math.max(0, liveVotes - optionAVotes);

  // Exact Option A center inside CameraStage coordinate space (1416, 499.5)
  const cursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: cursorAppearFrame, x: 1640, y: 740 },
    {
      frame: Math.max(cursorAppearFrame + 2, clickFrame - Math.round(0.08 * safeFps)),
      x: OPT_A_CENTER_X,
      y: OPT_A_CENTER_Y,
      label: 'Pilihan A',
    },
    { frame: clickFrame, x: OPT_A_CENTER_X, y: OPT_A_CENTER_Y, click: true, label: 'Undi A!' },
    { frame: cursorHoldEnd, x: OPT_A_CENTER_X, y: OPT_A_CENTER_Y, label: 'Diundi ✓' },
    { frame: cursorLeaveFrame, x: 1580, y: 650 },
  ];

  const isOptionASelected = frame >= clickFrame;
  const optionAClickScale = interpolate(
    frame,
    [
      clickFrame - 2,
      clickFrame + Math.max(2, Math.round(0.05 * safeFps)),
      clickFrame + Math.max(6, Math.round(0.24 * safeFps)),
    ],
    [1, 0.986, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const optionARingFlash = interpolate(
    frame,
    [
      clickFrame,
      clickFrame + Math.max(2, Math.round(0.08 * safeFps)),
      clickFrame + Math.max(8, Math.round(0.55 * safeFps)),
    ],
    [0, 1, 0.35],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const selectedBadgeProgress = interpolate(
    frame,
    [clickFrame, clickFrame + Math.max(8, Math.round(0.3 * safeFps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );

  // Beat 2–3 (2.4..6.1s): Elevated 3D Pop-Out IGStoryExportCard Preview
  const shareCardEnterFrame = Math.round(2.4 * safeFps); // 144f
  const shareBadgeActive = frame >= shareCardEnterFrame - Math.round(0.15 * safeFps);

  // Beat 3 (3.5..6.1s): Terracotta Rough-Notation <Circle> around winning percentageA
  const circleStart = Math.round(3.5 * safeFps); // 210f
  const circleDuration = Math.max(12, Math.round(0.5 * safeFps)); // 30f -> settles by 240f

  // Subtle exit lead on outer header
  const exitWindowFrames = Math.max(2, Math.round(0.35 * safeFps));
  const sceneEnd = Math.max(1, safeDuration - 1);
  const exitLeadStart = Math.max(0, Math.min(sceneEnd - 1, safeDuration - exitWindowFrames));
  const exitLeadFactor = interpolate(frame, [exitLeadStart, sceneEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.55, 0, 1, 0.45),
  });
  const headerExitX = -8 * exitLeadFactor;

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={0.99}
        zoomTo={1.028}
        panXFrom={6}
        panXTo={-6}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0.3}
        tiltXTo={-0.3}
        tiltYFrom={0.6}
        tiltYTo={-0.6}
        breathingAmplitude={0.45}
        entryZoomOffset={0.034}
        exitPanXDelta={-30}
        exitPanYDelta={-16}
        exitZoomDelta={0.022}
        exitFrames={Math.round(0.35 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: LAUNCH_FONTS.DISPLAY,
            perspective: '1800px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Beat 1A: Student Header + Live Student Votes Counter */}
          <Interactive.Div
            name="PolySuara Header"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: HEADER_RULE_LEFT,
              top: 86,
              width: HEADER_RULE_WIDTH,
              height: 112,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              opacity: headerOpacity,
              transform: `translate3d(${headerExitX.toFixed(2)}px, 0px, 0px)`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    alignSelf: 'flex-start',
                    padding: '6px 16px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(107, 127, 91, 0.14)',
                    border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                    color: LAUNCH_PALETTE.PRIMARY,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  <MessageSquare size={15} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.4} />
                  <span>KOMUNITI SISWA • LUAH &amp; UNDI TANPA NAMA</span>
                </div>
              </KineticReveal>

              <KineticWords
                as="h2"
                text="Suara Siswa. Undi & Luah Tanpa Nama."
                startFrame={headlineStart}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['Luah', 'Tanpa', 'Nama.']}
                accentColor={LAUNCH_PALETTE.ACCENT}
                style={{
                  margin: 0,
                  fontSize: 49,
                  fontWeight: 900,
                  lineHeight: 1.06,
                  letterSpacing: '-0.03em',
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '13px 22px',
                borderRadius: 18,
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                border: `1.5px solid ${
                  isOptionASelected ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY
                }`,
                boxShadow: '0 14px 32px rgba(46, 58, 47, 0.08)',
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 17,
                fontWeight: 800,
                color: LAUNCH_PALETTE.PRIMARY,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              <Users size={19} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
              <span>{liveVotes} UNDI PELAJAR</span>
            </div>
          </Interactive.Div>

          {/* Beat 1B: EvolvingPath architectural divider between header and twin workbench */}
          <div
            style={{
              position: 'absolute',
              left: HEADER_RULE_LEFT,
              top: 212,
              width: HEADER_RULE_WIDTH,
              height: 10,
              pointerEvents: 'none',
            }}
          >
            <EvolvingPath
              d={`M 0 5 L ${HEADER_RULE_WIDTH} 5`}
              width={HEADER_RULE_WIDTH}
              height={10}
              startFrame={0}
              durationFrames={dividerDuration}
              stroke={LAUNCH_PALETTE.TERTIARY}
              strokeWidth={2}
              headDotColor={LAUNCH_PALETTE.ACCENT}
              headDotRadius={4.5}
              hideDotWhenComplete
              style={{ position: 'absolute', inset: 0 }}
            />
          </div>

          {/* LEFT COLUMN (width=840px): Live Anonymous Confession Card + 3D Pop-Out IGStoryExportCard */}
          <Interactive.Div
            name="PolySuara Confession Card"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: LEFT_COL_LEFT,
              top: CONFESSION_TOP,
              width: LEFT_COL_WIDTH,
              height: CONFESSION_HEIGHT,
              zIndex: 10,
              opacity: leftCardOpacity,
              transform: `translate3d(0px, ${(leftCardY + leftCardFloat).toFixed(2)}px, 0px)`,
              transformStyle: 'preserve-3d',
            }}
          >
            <KineticWindow
              surface="light"
              routeLabel="jpp.polisas.edu.my/polysuara"
              statusPill="ANONIM AKTIF"
              statusAccent
              width={LEFT_COL_WIDTH}
              height={CONFESSION_HEIGHT}
              borderRadius={26}
              sheenStartFrame={Math.round(0.8 * safeFps)}
              sheenDuration={42}
              style={{
                boxShadow:
                  '0 24px 54px rgba(31, 39, 32, 0.11), 0 6px 16px rgba(31, 39, 32, 0.05)',
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '18px 24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxSizing: 'border-box',
                }}
              >
                {/* Anonymous Persona Header with Origami Fox Monogram */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <PersonaMonogram size={46} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          letterSpacing: '-0.015em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        Rubah Semambu (Anon #409)
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        Identiti 100% Anonim · 2 min lalu
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '6px 13px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(107, 127, 91, 0.14)',
                      border: '1px solid rgba(107, 127, 91, 0.36)',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      color: LAUNCH_PALETTE.PRIMARY,
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={14} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={2.5} />
                    <span>#FASILITI · #KAMSIS</span>
                  </div>
                </div>

                {/* Student Confession Quote Block */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 18,
                    backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                    border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 600,
                      lineHeight: 1.42,
                      color: LAUNCH_PALETTE.PRIMARY,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    &ldquo;Harap dapat tambah meja belajar &amp; plug point di Dataran Siswa — senang nak siapkan tugasan berkumpulan antara waktu kuliah.&rdquo;
                  </p>
                </div>

                {/* Tactile Lucide Reaction Footer Bar (ZERO OS emojis) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {REACTION_SPECS.map((spec, idx) => {
                      const popStart = Math.round((1.55 + idx * 0.22) * safeFps);
                      const popEnd = popStart + Math.round(0.85 * safeFps);
                      const popSpring =
                        frame >= popStart
                          ? spring({
                              frame: frame - popStart,
                              fps: safeFps,
                              config: { damping: 14, stiffness: 220, mass: 0.85 },
                            })
                          : 0;
                      const countValue = Math.round(
                        interpolate(frame, [popStart, popEnd], [0, spec.target], {
                          extrapolateLeft: 'clamp',
                          extrapolateRight: 'clamp',
                          easing: VOTES_SETTLE_EASE,
                        }),
                      );
                      const pillScale = 0.88 + 0.12 * popSpring;

                      return (
                        <div
                          key={spec.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '7px 15px',
                            borderRadius: 999,
                            backgroundColor:
                              idx === 0 ? LAUNCH_PALETTE.SURFACE_MUTED : LAUNCH_PALETTE.CARD_BG,
                            border: `1.5px solid ${
                              idx === 0 ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY
                            }`,
                            boxShadow: '0 6px 16px rgba(46, 58, 47, 0.06)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 13.5,
                            fontWeight: 900,
                            color: LAUNCH_PALETTE.PRIMARY_DARK,
                            fontVariantNumeric: 'tabular-nums',
                            transform: `scale(${pillScale.toFixed(4)})`,
                          }}
                        >
                          {renderReactionIcon(spec.icon, spec.color)}
                          <span>{countValue}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 14px',
                      borderRadius: 999,
                      backgroundColor: shareBadgeActive
                        ? LAUNCH_PALETTE.PRIMARY
                        : LAUNCH_PALETTE.SURFACE_MUTED,
                      border: `1.5px solid ${
                        shareBadgeActive ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.TERTIARY
                      }`,
                      color: shareBadgeActive ? LAUNCH_PALETTE.BACKGROUND : LAUNCH_PALETTE.PRIMARY,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Share2 size={13} strokeWidth={2.5} />
                    <span>Kongsi Ke IG Story • 1 Klik</span>
                  </div>
                </div>
              </div>
            </KineticWindow>
          </Interactive.Div>

          {/* Beat 2–3 (2.4..6.1s): Elevated 3D Pop-Out IGStoryExportCard (Deep Forest + Terracotta + Warm Sand) */}
          <Interactive.Div
            name="PolySuara IG Story Export Card"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: SHARE_CARD_LEFT,
              top: SHARE_CARD_TOP,
              width: SHARE_CARD_WIDTH,
              height: SHARE_CARD_HEIGHT,
              zIndex: 18,
              transformStyle: 'preserve-3d',
            }}
          >
            <ExplodedLayer
              zDepth={34}
              enterFrame={shareCardEnterFrame}
              enterOffsetY={28}
              enterOffsetX={-12}
              floatAmplitude={2.0}
              floatPhase={0.9}
            >
              <div
                style={{
                  transform: 'rotate(-2.0deg)',
                  transformOrigin: '50% 50%',
                  transformStyle: 'preserve-3d',
                }}
              >
                <KineticWindow
                  surface="dark"
                  width={SHARE_CARD_WIDTH}
                  height={SHARE_CARD_HEIGHT}
                  borderRadius={24}
                  sheenStartFrame={Math.round(3.0 * safeFps)}
                  sheenDuration={46}
                  style={{
                    boxShadow:
                      '0 32px 68px rgba(31, 39, 32, 0.34), 0 10px 24px rgba(31, 39, 32, 0.18)',
                    border: '1.5px solid rgba(217, 201, 178, 0.35)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Subtle Earthy Minimal corner ambient accent */}
                  <div
                    style={{
                      position: 'absolute',
                      right: -60,
                      top: -60,
                      width: 240,
                      height: 240,
                      borderRadius: 999,
                      background:
                        'radial-gradient(circle, rgba(201, 111, 79, 0.18) 0%, rgba(201, 111, 79, 0) 70%)',
                      pointerEvents: 'none',
                    }}
                  />

                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      flex: 1,
                      padding: '18px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 10,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Header: PolySuara · KONGSI KE IG STORY • 1 KLIK + #FASILITI */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                        <span
                          style={{
                            fontSize: 22,
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            color: LAUNCH_PALETTE.BACKGROUND,
                          }}
                        >
                          Poly<span style={{ color: LAUNCH_PALETTE.ACCENT }}>Suara</span>
                        </span>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.11em',
                            color: LAUNCH_PALETTE.TERTIARY,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          · KONGSI KE IG STORY • 1 KLIK
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span
                          style={{
                            padding: '4px 11px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(201, 111, 79, 0.22)',
                            border: '1px solid rgba(201, 111, 79, 0.5)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            color: LAUNCH_PALETTE.BACKGROUND,
                          }}
                        >
                          #FASILITI
                        </span>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            backgroundColor: 'rgba(248, 246, 238, 0.08)',
                            border: '1px solid rgba(217, 201, 178, 0.28)',
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: LAUNCH_PALETTE.TERTIARY,
                          }}
                        >
                          Anon #409
                        </span>
                      </div>
                    </div>

                    {/* Quote preview strip */}
                    <div
                      style={{
                        padding: '11px 15px',
                        borderRadius: 14,
                        backgroundColor: 'rgba(248, 246, 238, 0.06)',
                        border: '1px solid rgba(217, 201, 178, 0.2)',
                        fontSize: 14.5,
                        fontWeight: 500,
                        lineHeight: 1.4,
                        color: 'rgba(248, 246, 238, 0.92)',
                      }}
                    >
                      &ldquo;Harap dapat tambah meja belajar &amp; plug point di Dataran Siswa — senang nak siapkan tugasan berkumpulan antara waktu kuliah.&rdquo;
                    </div>

                    {/* Quick Action Block: TINDAKAN PANTAS JPP ✓ */}
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 16,
                        backgroundColor: 'rgba(107, 127, 91, 0.24)',
                        border: '1.5px solid rgba(217, 201, 178, 0.38)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: '0.13em',
                          color: LAUNCH_PALETTE.TERTIARY,
                        }}
                      >
                        <CheckCircle2 size={14} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.8} />
                        <span>TINDAKAN PANTAS JPP ✓</span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 700,
                          lineHeight: 1.38,
                          color: LAUNCH_PALETTE.BACKGROUND,
                        }}
                      >
                        &ldquo;Cadangan dimasukkan ke senarai naik taraf ruang siswa semester ini.&rdquo;
                      </p>
                    </div>
                  </div>
                </KineticWindow>
              </div>
            </ExplodedLayer>
          </Interactive.Div>

          {/* RIGHT COLUMN (width=880px): Live Interactive Campus Poll Workbench */}
          <Interactive.Div
            name="Live Campus Poll Workbench"
            premountFor={safeFps}
            style={{
              position: 'absolute',
              left: POLL_LEFT,
              top: POLL_TOP,
              width: POLL_WIDTH,
              height: POLL_HEIGHT,
              zIndex: 14,
              opacity: pollOpacity,
              transformOrigin: '50% 50%',
              transform: `translate3d(0px, ${(pollTranslateY + pollFloatY).toFixed(2)}px, 0px) scale(${pollScale.toFixed(4)})`,
            }}
          >
            <KineticWindow
              surface="light"
              routeLabel="jpp.polisas.edu.my/undian"
              statusPill="UNDIAN SISWA AKTIF"
              width={POLL_WIDTH}
              height={POLL_HEIGHT}
              borderRadius={26}
              sheenStartFrame={Math.round(4.45 * safeFps)}
              sheenDuration={44}
              style={{
                boxShadow: '0 28px 64px rgba(46, 58, 47, 0.12)',
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: `${POLL_BODY_PAD_TOP}px ${POLL_BODY_PAD_X}px 22px`,
                  display: 'flex',
                  flexDirection: 'column',
                  boxSizing: 'border-box',
                  overflow: 'visible',
                }}
              >
                {/* Poll Header (height = 82px) */}
                <div
                  style={{
                    height: POLL_HEADER_H,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Vote size={17} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.4} />
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.13em',
                        color: LAUNCH_PALETTE.ACCENT,
                      }}
                    >
                      UNDIAN KOMUNITI SISWA
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 23,
                      fontWeight: 900,
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                      color: LAUNCH_PALETTE.PRIMARY,
                    }}
                  >
                    {resolvedPollTitle}
                  </div>
                </div>

                {/* Option A Interactive Card (center @ 1416, 499.5) */}
                <div
                  style={{
                    marginTop: OPT_A_MARGIN_TOP,
                    height: OPT_A_HEIGHT,
                    boxSizing: 'border-box',
                    borderRadius: 22,
                    padding: '18px 24px',
                    backgroundColor: isOptionASelected
                      ? 'rgba(201, 111, 79, 0.06)'
                      : LAUNCH_PALETTE.BACKGROUND,
                    border: `2px solid ${
                      isOptionASelected ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY
                    }`,
                    boxShadow: isOptionASelected
                      ? `0 0 0 5px rgba(201, 111, 79, ${(0.18 * optionARingFlash).toFixed(3)}), 0 14px 30px rgba(201, 111, 79, ${(0.14 * optionARingFlash).toFixed(3)})`
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    overflow: 'visible',
                    transformOrigin: '50% 50%',
                    transform: `scale(${optionAClickScale.toFixed(4)})`,
                  }}
                >
                  <div
                    style={{
                      minHeight: 52,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 18,
                      overflow: 'visible',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 13,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          border: `2px solid ${
                            isOptionASelected ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.SECONDARY
                          }`,
                          backgroundColor: isOptionASelected
                            ? LAUNCH_PALETTE.ACCENT
                            : LAUNCH_PALETTE.CARD_BG,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isOptionASelected ? (
                          <Check size={14} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={3} />
                        ) : null}
                      </span>

                      <span
                        style={{
                          fontSize: 19.5,
                          fontWeight: 800,
                          lineHeight: 1.24,
                          letterSpacing: '-0.015em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        {resolvedOptionA}
                      </span>
                    </div>

                    <div style={{ marginRight: 8, flexShrink: 0, overflow: 'visible' }}>
                      <EditorialAnnotation
                        type="circle"
                        startFrame={circleStart}
                        durationFrames={circleDuration}
                        color={LAUNCH_PALETTE.ACCENT}
                        strokeWidth={3.5}
                        padding={{ top: 6, right: 14, bottom: 6, left: 14 }}
                        iterations={2}
                        seed={19}
                        style={{ display: 'inline-block', overflow: 'visible' }}
                      >
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 28,
                            fontWeight: 900,
                            color: LAUNCH_PALETTE.ACCENT,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {Math.round(barA)}%
                        </span>
                      </EditorialAnnotation>
                    </div>
                  </div>

                  {/* Progress Track */}
                  <div
                    style={{
                      height: 28,
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, barA)).toFixed(2)}%`,
                        height: '100%',
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.ACCENT,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: LAUNCH_PALETTE.MUTED_OLIVE,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <span>{optionAVotes} undi pelajar</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isOptionASelected ? (
                        <span
                          style={{
                            padding: '4px 11px',
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.ACCENT,
                            color: LAUNCH_PALETTE.CARD_BG,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            whiteSpace: 'nowrap',
                            opacity: selectedBadgeProgress,
                            transform: `scale(${(0.85 + 0.15 * selectedBadgeProgress).toFixed(3)})`,
                          }}
                        >
                          PILIHAN ANDA ✓
                        </span>
                      ) : null}
                      <span>{isOptionASelected ? 'Pilihan Utama Siswa' : 'Mendahului Sementara'}</span>
                    </div>
                  </div>
                </div>

                {/* Option B Card */}
                <div
                  style={{
                    marginTop: 16,
                    height: 174,
                    boxSizing: 'border-box',
                    borderRadius: 22,
                    padding: '16px 24px',
                    backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      minHeight: 48,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 18,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 13,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          backgroundColor: LAUNCH_PALETTE.CARD_BG,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 19,
                          fontWeight: 700,
                          lineHeight: 1.24,
                          letterSpacing: '-0.01em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        {resolvedOptionB}
                      </span>
                    </div>

                    <span
                      style={{
                        marginRight: 8,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 26,
                        fontWeight: 800,
                        color: LAUNCH_PALETTE.SECONDARY,
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      }}
                    >
                      {Math.round(barB)}%
                    </span>
                  </div>

                  <div
                    style={{
                      height: 26,
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, barB)).toFixed(2)}%`,
                        height: '100%',
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.SECONDARY,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: LAUNCH_PALETTE.MUTED_OLIVE,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <span>{optionBVotes} undi pelajar</span>
                    <span>Sokongan Ruang Belajar Kamsis</span>
                  </div>
                </div>

                {/* Footer Meta Strip */}
                <div
                  style={{
                    marginTop: 'auto',
                    height: 44,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    paddingTop: 12,
                    borderTop: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: LAUNCH_PALETTE.MUTED_OLIVE,
                    flexShrink: 0,
                  }}
                >
                  <span>• Identiti 100% Tanpa Nama</span>
                  <span>• Suara Terus Ke JPP</span>
                  <span>• Kiraan Undi Langsung</span>
                </div>
              </div>
            </KineticWindow>
          </Interactive.Div>
        </div>

        {/* GhostCursor inside CameraStage coordinate space */}
        <GhostCursor
          keyframes={cursorKeyframes}
          appearFrame={cursorAppearFrame}
          disappearFrame={cursorDisappearFrame}
          color={LAUNCH_PALETTE.PRIMARY}
          rippleColor={LAUNCH_PALETTE.ACCENT}
          scale={1.08}
          style={{ zIndex: 28 }}
        />
      </CameraStage>

      <EditorialFrameMarks
        chapterCode="04"
        chapterLabel="KOMUNITI SISWA • LUAH & UNDI TANPA NAMA"
      />
    </>
  );
};

const polySuaraSchema = {
  pollTitle: {
    type: 'string',
    default: STUDENT_POLL_TITLE_DEFAULT,
    description: 'Poll Title',
  },
  optionA: {
    type: 'string',
    default: STUDENT_OPTION_A_DEFAULT,
    description: 'Option A',
  },
  optionB: {
    type: 'string',
    default: STUDENT_OPTION_B_DEFAULT,
    description: 'Option B',
  },
  percentageA: {
    type: 'number',
    default: 68,
    min: 0,
    max: 100,
    integer: true,
    hiddenFromList: false,
    description: 'Option A Share %',
  },
  totalVotes: {
    type: 'number',
    default: 412,
    min: 0,
    max: 99999,
    integer: true,
    hiddenFromList: false,
    description: 'Total Votes',
  },
} as const satisfies InteractivitySchema;

export const PolySuaraVoiceScene = Interactive.withSchema({
  Component: PolySuaraVoiceInner,
  componentName: 'PolySuaraVoiceScene',
  schema: polySuaraSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
