import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { Check, MessageSquare, Users, Vote } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath, GhostCursor, type GhostCursorKeyframe } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type PolySuaraProps = {
  readonly pollTitle: string;
  readonly optionA: string;
  readonly optionB: string;
  readonly percentageA: number;
  readonly totalVotes: number;
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const RACE_EASE = Easing.bezier(0.25, 1, 0.5, 1);
const VOTES_SETTLE_EASE = Easing.bezier(0.22, 1, 0.36, 1);

type ReactionPillSpec = {
  readonly id: string;
  readonly text: string;
  readonly left: number;
  readonly baseTop: number;
  readonly phase: number;
  readonly accent: string;
};

const REACTION_PILLS: readonly ReactionPillSpec[] = [
  { id: 'fire', text: '🔥 +128', left: 1140, baseTop: 912, phase: 0.2, accent: LAUNCH_PALETTE.ACCENT },
  { id: 'clap', text: '👏 +84', left: 1352, baseTop: 922, phase: 1.7, accent: LAUNCH_PALETTE.SECONDARY },
  { id: 'spark', text: '✨ +62', left: 1564, baseTop: 910, phase: 3.1, accent: LAUNCH_PALETTE.PRIMARY },
];

const PolySuaraVoiceInner: React.FC<PolySuaraProps> = ({
  pollTitle,
  optionA,
  optionB,
  percentageA,
  totalVotes,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clampedA = Number.isFinite(percentageA) ? Math.min(100, Math.max(0, percentageA)) : 68;
  const clampedB = 100 - clampedA;
  const safeTotalVotes = Number.isFinite(totalVotes) ? Math.max(0, Math.round(totalVotes)) : 412;

  // Beat 1 (0..1.5s): EvolvingPath top divider + KineticWords headline + Poll Card expansion
  const dividerDuration = Math.max(10, Math.round(0.75 * fps));
  const pillStart = Math.round(0.06 * fps);
  const pillDuration = Math.max(8, Math.round(0.38 * fps));
  const headlineStart = Math.round(0.14 * fps);
  const wordStagger = Math.max(2, Math.round(0.065 * fps));
  const wordDuration = Math.max(8, Math.round(0.38 * fps));

  const cardEnterStart = Math.round(0.30 * fps);
  const cardEnterEnd = Math.max(cardEnterStart + 10, Math.round(1.05 * fps));
  const cardEnterProgress = interpolate(frame, [cardEnterStart, cardEnterEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const cardScale = interpolate(cardEnterProgress, [0, 1], [0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });
  const cardTranslateY = interpolate(cardEnterProgress, [0, 1], [24, 0]);
  const cardOpacity = interpolate(cardEnterProgress, [0, 0.35, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Beat 2 (1.4..4.2s): Live Voting Race + GhostCursor click on Option A + Floating reaction pills
  const racePhase1Start = Math.round(1.40 * fps);
  const cursorAppearFrame = Math.round(1.72 * fps);
  const clickFrame = Math.round(2.30 * fps);
  const cursorHoldEnd = clickFrame + Math.max(4, Math.round(0.24 * fps));
  const cursorLeaveFrame = Math.round(2.78 * fps);
  const cursorDisappearFrame = Math.round(2.96 * fps);

  const racePhase2Start = clickFrame + Math.max(2, Math.round(0.05 * fps));
  const racePhase2End = Math.round(4.05 * fps);
  const votesEndFrame = Math.round(4.65 * fps);

  // At default percentageA=68: Option B leads 0% -> 44% while Option A rises 0% -> 38%.
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

  // Exact Option A container bounds inside CameraStage (1920x1080):
  // Poll Card: left=104, top=306, width=1712, height=580, border=2, padding=44px 56px
  // Option A Row: x=162..1758 (w=1596), y=440..590 (h=150, vertical center=515)
  // GhostCursor clicks at (860, 525) cleanly centered inside Option A interactive row
  const cursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: cursorAppearFrame, x: 1260, y: 740 },
    { frame: Math.max(cursorAppearFrame + 2, clickFrame - Math.round(0.08 * fps)), x: 860, y: 525, label: 'Pilihan A' },
    { frame: clickFrame, x: 860, y: 525, click: true, label: 'Undi A!' },
    { frame: cursorHoldEnd, x: 860, y: 525, label: 'Disahkan ✓' },
    { frame: cursorLeaveFrame, x: 1120, y: 660 },
  ];

  const isOptionASelected = frame >= clickFrame;
  const optionAClickScale = interpolate(
    frame,
    [clickFrame - 2, clickFrame + Math.max(2, Math.round(0.05 * fps)), clickFrame + Math.max(6, Math.round(0.24 * fps))],
    [1, 0.986, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const optionARingFlash = interpolate(
    frame,
    [clickFrame, clickFrame + Math.max(2, Math.round(0.08 * fps)), clickFrame + Math.max(8, Math.round(0.55 * fps))],
    [0, 1, 0.35],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const selectedBadgeProgress = interpolate(
    frame,
    [clickFrame, clickFrame + Math.max(8, Math.round(0.3 * fps))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );

  // Beat 2B: Floating campus reaction pills
  const reactionBaseStart = Math.round(2.48 * fps);
  const reactionStagger = Math.max(4, Math.round(0.22 * fps));
  const reactionRiseDuration = Math.max(12, Math.round(0.65 * fps));
  const timeSec = frame / Math.max(1, fps);

  // Beat 3 (4.0..6.0s): Terracotta rough-notation <Circle> around winning percentageA
  const circleStart = Math.round(4.05 * fps);
  const circleDuration = Math.max(12, Math.round(0.68 * fps));

  const headerOpacity = interpolate(frame, [0, Math.max(8, Math.round(0.32 * fps))], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={0.98}
        zoomTo={1.04}
        panXFrom={6}
        panXTo={-6}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0.3}
        tiltXTo={-0.3}
        tiltYFrom={0.6}
        tiltYTo={-0.6}
        breathingAmplitude={0.45}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Beat 1A: EvolvingPath architectural top divider */}
          <div
            style={{
              position: 'absolute',
              left: 104,
              top: 96,
              width: 1712,
              height: 10,
              pointerEvents: 'none',
            }}
          >
            <EvolvingPath
              d="M 0 5 L 1712 5"
              width={1712}
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

          {/* Beat 1B: Header + Verified Votes Counter */}
          <Interactive.Div
            name="PolySuara Header"
            premountFor={fps}
            style={{
              position: 'absolute',
              left: 104,
              top: 122,
              width: 1712,
              height: 152,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              opacity: headerOpacity,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    alignSelf: 'flex-start',
                    padding: '8px 18px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(107, 127, 91, 0.14)',
                    border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                    color: LAUNCH_PALETTE.PRIMARY,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                  }}
                >
                  <MessageSquare size={16} color={LAUNCH_PALETTE.SECONDARY} />
                  POLYSUARA • KOMUNITI &amp; UNDIAN
                </div>
              </KineticReveal>

              <KineticWords
                as="h2"
                text="Suara Pelajar, Telus & Berimpak."
                startFrame={headlineStart}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['Telus', '&', 'Berimpak.']}
                accentColor={LAUNCH_PALETTE.ACCENT}
                style={{
                  margin: 0,
                  fontSize: 58,
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
                gap: 12,
                padding: '15px 26px',
                borderRadius: 18,
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                border: `1.5px solid ${isOptionASelected ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: '0 14px 32px rgba(46, 58, 47, 0.08)',
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 18,
                fontWeight: 800,
                color: LAUNCH_PALETTE.PRIMARY,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Users size={20} color={LAUNCH_PALETTE.ACCENT} />
              <span>{liveVotes} UNDI DISAHKAN</span>
            </div>
          </Interactive.Div>

          {/* Main Campus Poll Card: x=104..1816, y=306..886 (height=580) */}
          <Interactive.Div
            name="Live Campus Poll Card"
            premountFor={fps}
            style={{
              position: 'absolute',
              left: 104,
              top: 306,
              width: 1712,
              height: 580,
              boxSizing: 'border-box',
              backgroundColor: LAUNCH_PALETTE.CARD_BG,
              borderRadius: 32,
              border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
              padding: '44px 56px',
              boxShadow: '0 28px 64px rgba(46, 58, 47, 0.11)',
              display: 'flex',
              flexDirection: 'column',
              opacity: cardOpacity,
              transformOrigin: '50% 50%',
              transform: `translate3d(0px, ${cardTranslateY.toFixed(2)}px, 0px) scale(${cardScale.toFixed(4)})`,
            }}
          >
            {/* Row 1: Poll Header (height: 56px) */}
            <div
              style={{
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <Vote size={28} color={LAUNCH_PALETTE.ACCENT} />
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.PRIMARY,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {pollTitle}
                </span>
              </div>
              <span
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.PRIMARY,
                  color: LAUNCH_PALETTE.BACKGROUND,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  flexShrink: 0,
                }}
              >
                UNDIAN AKTIF • 5 JABATAN
              </span>
            </div>

            {/* Row 2: Option A Interactive Card (x=162..1758, y=440..590, height=150px) */}
            <div
              style={{
                marginTop: 32,
                height: 150,
                boxSizing: 'border-box',
                borderRadius: 22,
                padding: '22px 28px',
                backgroundColor: isOptionASelected ? 'rgba(201, 111, 79, 0.055)' : LAUNCH_PALETTE.BACKGROUND,
                border: `2px solid ${isOptionASelected ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.TERTIARY}`,
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
                  height: 44,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: `2px solid ${isOptionASelected ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.SECONDARY}`,
                      backgroundColor: isOptionASelected ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.CARD_BG,
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
                      fontSize: 24,
                      fontWeight: 800,
                      color: LAUNCH_PALETTE.PRIMARY,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {optionA}
                  </span>

                  {isOptionASelected ? (
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.ACCENT,
                        color: LAUNCH_PALETTE.CARD_BG,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        whiteSpace: 'nowrap',
                        opacity: selectedBadgeProgress,
                        transform: `scale(${(0.85 + 0.15 * selectedBadgeProgress).toFixed(3)})`,
                      }}
                    >
                      UNDI DIPILIH ✓
                    </span>
                  ) : null}
                </div>

                <div style={{ marginRight: 6, flexShrink: 0 }}>
                  <EditorialAnnotation
                    type="circle"
                    startFrame={circleStart}
                    durationFrames={circleDuration}
                    color={LAUNCH_PALETTE.ACCENT}
                    strokeWidth={3.5}
                    padding={{ top: 6, right: 14, bottom: 6, left: 14 }}
                    iterations={2}
                    seed={19}
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

              <div
                style={{
                  height: 36,
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
            </div>

            {/* Row 3: Option B Card (height=150px) */}
            <div
              style={{
                marginTop: 24,
                height: 150,
                boxSizing: 'border-box',
                borderRadius: 22,
                padding: '22px 28px',
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
                  height: 44,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
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
                      fontSize: 24,
                      fontWeight: 700,
                      color: LAUNCH_PALETTE.PRIMARY,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {optionB}
                  </span>
                </div>

                <span
                  style={{
                    marginRight: 6,
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
                  height: 36,
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
            </div>

            {/* Row 4: Footer Meta (height=48px) */}
            <div
              style={{
                marginTop: 28,
                height: 48,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                paddingTop: 14,
                borderTop: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                fontSize: 17,
                fontWeight: 600,
                color: LAUNCH_PALETTE.MUTED_OLIVE,
                flexShrink: 0,
              }}
            >
              <span>• Identiti Persona Kampus Selamat</span>
              <span>• Moderasi Beretika JPP</span>
              <span>• Eksport Kad Perkongsian Rasmi</span>
            </div>
          </Interactive.Div>

          {/* Beat 2B: Lower Editorial Reaction Bar + Floating Campus Reaction Pills */}
          <div
            style={{
              position: 'absolute',
              left: 104,
              top: 924,
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: LAUNCH_PALETTE.MUTED_OLIVE,
              opacity: interpolate(frame, [racePhase1Start, racePhase1Start + Math.max(8, Math.round(0.3 * fps))], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            REAKSI MAHASISWA LANGSUNG • POLISAS SEMAMBU
          </div>

          {REACTION_PILLS.map((pill, idx) => {
            const pillEnter = reactionBaseStart + idx * reactionStagger;
            const progress = interpolate(frame, [pillEnter, pillEnter + reactionRiseDuration], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: EXPO_OUT,
            });
            const opacity = interpolate(progress, [0, 0.25, 1], [0, 1, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            if (opacity <= 0.001) return null;

            const driftX = Math.sin(timeSec * 2.1 + pill.phase) * 11 * progress;
            const driftY = Math.cos(timeSec * 1.85 + pill.phase) * 6 * progress;
            const riseY = interpolate(progress, [0, 1], [62, 0]) + driftY;
            const pillScale = interpolate(progress, [0, 0.72, 1], [0.76, 1.05, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <div
                key={pill.id}
                style={{
                  position: 'absolute',
                  left: pill.left,
                  top: pill.baseTop,
                  padding: '10px 22px',
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.CARD_BG,
                  border: `1.5px solid ${pill.accent}`,
                  boxShadow: '0 14px 30px rgba(46, 58, 47, 0.14)',
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: LAUNCH_PALETTE.PRIMARY_DARK,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  opacity,
                  willChange: 'transform, opacity',
                  transform: `translate3d(${driftX.toFixed(2)}px, ${riseY.toFixed(2)}px, 0px) scale(${pillScale.toFixed(4)})`,
                }}
              >
                {pill.text}
              </div>
            );
          })}
        </div>

        {/* GhostCursor inside CameraStage coordinate space */}
        <GhostCursor
          keyframes={cursorKeyframes}
          appearFrame={cursorAppearFrame}
          disappearFrame={cursorDisappearFrame}
          color={LAUNCH_PALETTE.PRIMARY}
          rippleColor={LAUNCH_PALETTE.ACCENT}
          scale={1.08}
          style={{ zIndex: 25 }}
        />
      </CameraStage>

      <EditorialFrameMarks chapterCode="04" chapterLabel="PolySuara • Suara Mahasiswa" />
    </>
  );
};

const polySuaraSchema = {
  pollTitle: { type: 'string', default: 'Cadangan Menu Sihat Kafeteria Siswa 2026/2027', description: 'Poll Title' },
  optionA: { type: 'string', default: 'Set Ayam Percik & Salad Segar', description: 'Option A' },
  optionB: { type: 'string', default: 'Sandwic Telur Herba & Buah', description: 'Option B' },
  percentageA: { type: 'number', default: 68, min: 0, max: 100, integer: true, hiddenFromList: false, description: 'Option A Share %' },
  totalVotes: { type: 'number', default: 412, min: 0, max: 99999, integer: true, hiddenFromList: false, description: 'Total Votes' },
} as const satisfies InteractivitySchema;

export const PolySuaraVoiceScene = Interactive.withSchema({
  Component: PolySuaraVoiceInner,
  componentName: 'PolySuaraVoiceScene',
  schema: polySuaraSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
