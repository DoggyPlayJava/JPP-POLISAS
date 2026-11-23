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
import { Circle, Pie } from '@remotion/shapes';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Heart,
  MessageSquare,
  Share2,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Users,
  Vote,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import {
  EvolvingPath,
  GeometricSparkBurst,
  GhostCursor,
  type GhostCursorKeyframe,
} from '../motion/MotionActors';
import { WHIP_S_CURVE } from '../motion/transitions';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';
import { KineticWindow, PersonaMonogram, SpatialFloorGrid } from '../ui/KineticCard';

const ROSE = LAUNCH_MODULE_THEMES.polysuara.primary; // #F43F5E
const ROSE_DARK = LAUNCH_MODULE_THEMES.polysuara.dark; // #E11D48
const ROSE_INK = '#BE123C'; // WCAG AA+ Rose-700
const ROSE_SOFT = LAUNCH_MODULE_THEMES.polysuara.soft; // #FFF1F2
const ROSE_BORDER = LAUNCH_MODULE_THEMES.polysuara.border; // #FECDD3

const INDIGO = LAUNCH_MODULE_THEMES.takwim.primary; // #6366F1
const INDIGO_INK = '#4338CA';
const INDIGO_SOFT = LAUNCH_MODULE_THEMES.takwim.soft; // #EEF2FF
const INDIGO_BORDER = LAUNCH_MODULE_THEMES.takwim.border; // #C7D2FE

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0

const AMBER_INK = '#B45309';

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

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const CONFESSION_STACK = [
  {
    id: 'cat',
    alias: 'Kucing Kamsis #389',
    species: 'cat' as const,
    time: '45 min lalu',
    text: 'Lampu laluan blok asrama dah cerah lepas lapor dalam app. Terima kasih!',
    dx: 190,
    dy: 54,
    dz: -140,
    scale: 0.86,
    opacity: 0.56,
    accent: INDIGO,
    softBg: INDIGO_SOFT,
    border: INDIGO_BORDER,
  },
  {
    id: 'owl',
    alias: 'Burung Hantu Semambu #405',
    species: 'owl' as const,
    time: '18 min lalu',
    text: 'Harap kafe blok tengah buka kaunter ekspres sampai jam 10 malam waktu exam.',
    dx: -180,
    dy: -46,
    dz: -75,
    scale: 0.91,
    opacity: 0.72,
    accent: AMBER_INK,
    softBg: LAUNCH_MODULE_THEMES.polymart.soft,
    border: LAUNCH_MODULE_THEMES.polymart.border,
  },
  {
    id: 'fox',
    alias: 'Rubah Semambu #412',
    species: 'fox' as const,
    time: '2 min lalu • Trending #1',
    text: 'Boleh tambah meja belajar & plug point di Dataran Siswa tak? Ramai study waktu petang!',
    dx: 0,
    dy: 0,
    dz: 68,
    scale: 1,
    opacity: 1,
    accent: ROSE,
    softBg: ROSE_SOFT,
    border: ROSE_BORDER,
  },
] as const;

const REACTIONS = [
  { id: 'flame', label: 'Trending', count: 128, icon: 'flame' as const, color: ROSE_INK, bg: ROSE_SOFT, border: ROSE_BORDER },
  { id: 'thumbs', label: 'Sokong', count: 84, icon: 'thumbs' as const, color: INDIGO_INK, bg: INDIGO_SOFT, border: INDIGO_BORDER },
  { id: 'heart', label: 'Prihatin', count: 62, icon: 'heart' as const, color: EMERALD_INK, bg: EMERALD_SOFT, border: EMERALD_BORDER },
] as const;

// Cursor keyframes in global 1920x764 3D workspace coords:
// Shot 1 click occurs 154..184 (after QA still f=1900 / Local 142f!)
const SHOT1_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: 154, x: 960, y: 420 },
  { frame: 176, x: 1295, y: 576, click: true, label: 'ANGKAT JADI UNDIAN' },
  { frame: 186, x: 1295, y: 576 },
];

// Shot 2 vote click occurs cleanly inside right side of Option A bar and exits promptly before percentage fill finishes
const SHOT2_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: 224, x: 1240, y: 430 },
  { frame: 256, x: 1180, y: 368, click: true, label: 'UNDI PILIHAN A' },
  { frame: 272, x: 1180, y: 368 },
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

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safePctA = Math.min(95, Math.max(5, Math.round(Number.isFinite(percentageA) ? percentageA : 68)));
  const safeTotalVotes = Math.max(10, Math.round(Number.isFinite(totalVotes) ? totalVotes : 412));
  const timeSec = frame / safeFps;

  const resolvedTitle = resolveStudentText(pollTitle, LEGACY_POLL_TITLE, STUDENT_POLL_TITLE_DEFAULT);
  const resolvedOptionA = resolveStudentText(optionA, LEGACY_OPTION_A, STUDENT_OPTION_A_DEFAULT);
  const resolvedOptionB = resolveStudentText(optionB, LEGACY_OPTION_B, STUDENT_OPTION_B_DEFAULT);

  // Header timing
  const wordStagger = Math.max(2, Math.round(0.04 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.28 * safeFps));

  // SHOT 1 -> SHOT 2 camera handoff (184..230f)
  const toShot2T = interpolate(frame, [184, 230], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  // SHOT 2 -> SHOT 3 camera handoff (374..422f)
  const toShot3T = interpolate(frame, [374, 422], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });

  // Reactions count up smoothly before Local 142f (f=1900)
  const reactionFillProgress = interpolate(frame, [26, 118], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Confession stack dollies back-left into deep Z in Shot 2, fades away in Shot 3
  const stackGroupX = interpolate(toShot2T, [0, 1], [0, -475]);
  const stackGroupY = interpolate(toShot2T, [0, 1], [0, -14]);
  const stackGroupZ = interpolate(toShot2T, [0, 1], [0, -165]);
  const stackGroupScale = interpolate(toShot2T, [0, 1], [1, 0.7]);
  const stackGroupOpacity =
    interpolate(toShot2T, [0, 1], [1, 0.34]) *
    interpolate(toShot3T, [0, 0.45], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  // Poll Monolith sweeps dead center in Shot 2 (196..234), shifts cleanly left in Shot 3 (374..422)
  const pollEnterProgress = interpolate(frame, [192, 234], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const pollCenterX =
    interpolate(pollEnterProgress, [0, 1], [520, 0]) + interpolate(toShot3T, [0, 1], [0, -245]);
  const pollCenterY = interpolate(toShot3T, [0, 1], [0, 8]);
  const pollCenterZ =
    interpolate(pollEnterProgress, [0, 1], [-120, 62]) + interpolate(toShot3T, [0, 1], [0, -76]);
  const pollScale =
    interpolate(pollEnterProgress, [0, 1], [0.84, 1]) * interpolate(toShot3T, [0, 1], [1, 0.85]);
  const pollRotY = interpolate(toShot3T, [0, 1], [0, 4.5]);
  const pollOpacity = pollEnterProgress;

  // Poll vote percentages animate right after cursor click at 256f -> settled by 296f (before Local 322f / f=2080!)
  const voteGrowthT = interpolate(frame, [254, 294], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const livePctA = Math.round(interpolate(voteGrowthT, [0, 1], [38, safePctA]));
  const livePctB = 100 - livePctA;
  const liveTotalVotes = Math.round(
    interpolate(voteGrowthT, [0, 1], [Math.round(safeTotalVotes * 0.56), safeTotalVotes]),
  );
  const isUsulAccepted = frame >= 282;
  const stampSpring = isUsulAccepted
    ? spring({
        frame: frame - 282,
        fps: safeFps,
        config: { damping: 16, stiffness: 225, mass: 0.85 },
      })
    : 0;

  // Shot 3: 3D Smartphone IG Story Bezel rises on right (392..438f -> settled razor-sharp at Local 462f / f=2220!)
  const phoneEnterProgress = interpolate(frame, [388, 434], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const phoneRiseY = (1 - phoneEnterProgress) * 140;
  const phoneRotY = interpolate(phoneEnterProgress, [0, 1], [-18, -8]);
  const phoneSheenLeft = interpolate(frame, [428, 488], [-45, 135], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const phoneSheenOpacity = interpolate(frame, [428, 444, 476, 488], [0, 0.65, 0.65, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const liveDotScale = 0.86 + Math.sin(timeSec * 5.1) * 0.16;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.polysuara.tint} />

      <CameraStage
        zoomFrom={0.995}
        zoomTo={1.016}
        panXFrom={0}
        panXTo={0}
        panYFrom={3}
        panYTo={-3}
        tiltXFrom={0}
        tiltXTo={0}
        tiltYFrom={-0.35}
        tiltYTo={0.35}
        breathingAmplitude={0.35}
        entryZoomOffset={0.024}
        entryPanXOffset={24}
        entryFrames={Math.round(0.45 * safeFps)}
        exitZoomDelta={0.015}
        exitFrames={Math.round(0.35 * safeFps)}
        clip
      >
        <SpatialFloorGrid
          accentColor={ROSE}
          secondaryColor={INDIGO}
          gridOpacity={0.2}
          scrollSpeed={14}
        />

        {/* Top Editorial Header Lockup */}
        <div
          style={{
            position: 'absolute',
            left: 88,
            right: 88,
            top: 74,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 28,
            fontFamily: LAUNCH_FONTS.DISPLAY,
            zIndex: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1360 }}>
            <KineticReveal startFrame={4} durationFrames={18}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 14px',
                  borderRadius: 999,
                  backgroundColor: ROSE_SOFT,
                  border: `1.5px solid ${ROSE_BORDER}`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: ROSE,
                    transform: `scale(${liveDotScale.toFixed(3)})`,
                  }}
                />
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.14em',
                    color: ROSE_INK,
                  }}
                >
                  BAB 05 • POLYSUARA KOMUNITI • LUAH &amp; UNDI TANPA NAMA
                </span>
              </div>
            </KineticReveal>

            <KineticWords
              as="h1"
              text="Ada Pendapat? Luah Tanpa Nama & Undi Terus Bersama Siswa."
              startFrame={8}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              accentWords={['Luah', 'Undi']}
              accentColor={ROSE_INK}
              style={{
                margin: 0,
                fontSize: 40,
                fontWeight: 900,
                letterSpacing: '-0.032em',
                lineHeight: 1.07,
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            />
          </div>

          <KineticReveal startFrame={18} durationFrames={22}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px',
                borderRadius: 16,
                backgroundColor: isUsulAccepted ? EMERALD_SOFT : LAUNCH_PALETTE.CARD_BG,
                border: `1.5px solid ${isUsulAccepted ? EMERALD_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: '0 12px 26px rgba(31, 39, 32, 0.08)',
              }}
            >
              <ShieldCheck
                size={18}
                color={isUsulAccepted ? EMERALD_INK : ROSE_INK}
                strokeWidth={2.5}
              />
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: '0.07em',
                  color: isUsulAccepted ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY,
                  whiteSpace: 'nowrap',
                }}
              >
                {phoneEnterProgress > 0.35
                  ? 'IG STORY • 1-KLIK KONGSI SIAP'
                  : isUsulAccepted
                    ? 'USUL DITERIMA JPP ✓'
                    : 'IDENTITI PELAJAR 100% DILINDUNGI'}
              </span>
            </div>
          </KineticReveal>
        </div>

        {/* 3D Camera Stage Workspace (x=0..1920, y=204..968) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 204,
            height: 764,
            perspective: '1700px',
            transformStyle: 'preserve-3d',
            fontFamily: LAUNCH_FONTS.DISPLAY,
            zIndex: 8,
          }}
        >
          {/* Rose Vector Bridge Arc linking Shot 1 Confession -> Shot 2 Poll */}
          {frame >= 186 && toShot3T < 0.7 ? (
            <EvolvingPath
              d="M 520 390 Q 760 220 960 360"
              width={1920}
              height={764}
              startFrame={188}
              durationFrames={44}
              stroke={ROSE}
              strokeWidth={4.5}
              trackStroke="rgba(244, 63, 94, 0.16)"
              headDotColor="#FFFFFF"
              headDotRadius={7}
              hideDotWhenComplete
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 1 - toShot3T,
                pointerEvents: 'none',
              }}
            />
          ) : null}

          {/* SHOT 1 HERO (and Shot 2 Recessed Context): 3D Z-Depth Confession Stack */}
          {stackGroupOpacity > 0.01 ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 960,
                height: 530,
                transformStyle: 'preserve-3d',
                opacity: stackGroupOpacity,
                transform: `translate(-50%, -50%) translate3d(${stackGroupX.toFixed(1)}px, ${stackGroupY.toFixed(1)}px, ${stackGroupZ.toFixed(1)}px) scale(${stackGroupScale.toFixed(4)})`,
              }}
            >
              {CONFESSION_STACK.map((card, cIdx) => {
                const enterSpring = spring({
                  frame: Math.max(0, frame - (10 + cIdx * 7)),
                  fps: safeFps,
                  config: { damping: 18, stiffness: 200, mass: 0.9 },
                });
                const isFront = card.id === 'fox';
                return (
                  <div
                    key={card.id}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: card.opacity * enterSpring,
                      transformStyle: 'preserve-3d',
                      transform: `translate3d(${card.dx}px, ${(card.dy + (1 - enterSpring) * 28).toFixed(1)}px, ${card.dz}px) rotateX(3deg) scale(${card.scale})`,
                    }}
                  >
                    <KineticWindow
                      surface={isFront ? 'light' : 'sand'}
                      routeLabel={isFront ? '/portal/polysuara • #412' : `/portal/polysuara`}
                      statusPill={isFront ? 'TRENDING #1' : 'TANPA NAMA'}
                      statusAccent={isFront}
                      accentColor={card.accent}
                      accentSoftBg={card.softBg}
                      accentBorderColor={card.border}
                      width={960}
                      height={510}
                      sheenStartFrame={isFront ? 68 : undefined}
                      sheenDuration={36}
                      style={{
                        borderBottom: `6px solid ${card.accent}`,
                        boxShadow: isFront
                          ? '0 34px 72px rgba(190, 18, 60, 0.16)'
                          : '0 20px 44px rgba(31, 39, 32, 0.12)',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          padding: '26px 32px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 18,
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        {/* Author Persona Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <PersonaMonogram
                              species={card.species}
                              size={58}
                              accentColor={card.accent}
                              softBgColor={card.softBg}
                              borderColor={card.border}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span
                                style={{
                                  fontSize: 22,
                                  fontWeight: 900,
                                  color: LAUNCH_PALETTE.PRIMARY,
                                }}
                              >
                                {card.alias}
                              </span>
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: LAUNCH_PALETTE.INK_SOFT,
                                }}
                              >
                                {card.time} • IDENTITI TANPA NAMA
                              </span>
                            </div>
                          </div>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '7px 14px',
                              borderRadius: 999,
                              backgroundColor: INDIGO_SOFT,
                              border: `1.5px solid ${INDIGO_BORDER}`,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11.5,
                              fontWeight: 900,
                              color: INDIGO_INK,
                            }}
                          >
                            <MessageSquare size={13} color={INDIGO_INK} strokeWidth={2.5} />
                            SUARA SISWA POLISAS
                          </span>
                        </div>

                        {/* Confession Copy */}
                        <div
                          style={{
                            padding: '22px 26px',
                            borderRadius: 20,
                            backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                            border: `1.5px solid ${card.border}`,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: 29,
                              fontWeight: 800,
                              lineHeight: 1.32,
                              color: LAUNCH_PALETTE.PRIMARY,
                            }}
                          >
                            &ldquo;{card.text}&rdquo;
                          </p>
                        </div>

                        {/* Front Hero Reactions & Escalate CTA */}
                        {isFront ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 16,
                              transformStyle: 'preserve-3d',
                            }}
                          >
                            {/* Z-Parallax Lucide Reaction Pills */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, transformStyle: 'preserve-3d' }}>
                              {REACTIONS.map((rx, rIdx) => {
                                const popSpring = spring({
                                  frame: Math.max(0, frame - (36 + rIdx * 8)),
                                  fps: safeFps,
                                  config: { damping: 16, stiffness: 215, mass: 0.85 },
                                });
                                const rxCount = Math.round(rx.count * reactionFillProgress);
                                return (
                                  <div
                                    key={rx.id}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '10px 16px',
                                      borderRadius: 999,
                                      backgroundColor: rx.bg,
                                      border: `1.5px solid ${rx.border}`,
                                      color: rx.color,
                                      boxShadow: '0 12px 24px rgba(31, 39, 32, 0.1)',
                                      transform: `translateZ(${(18 + popSpring * 20).toFixed(1)}px) scale(${(0.86 + 0.14 * popSpring).toFixed(4)})`,
                                    }}
                                  >
                                    {rx.icon === 'flame' ? (
                                      <Flame size={16} color={rx.color} strokeWidth={2.5} />
                                    ) : rx.icon === 'thumbs' ? (
                                      <ThumbsUp size={16} color={rx.color} strokeWidth={2.5} />
                                    ) : (
                                      <Heart size={16} color={rx.color} strokeWidth={2.5} />
                                    )}
                                    <span
                                      style={{
                                        fontFamily: LAUNCH_FONTS.MONO,
                                        fontSize: 14.5,
                                        fontWeight: 900,
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      {rxCount}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Escalate Button */}
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '12px 20px',
                                borderRadius: 14,
                                backgroundColor: ROSE_DARK,
                                color: '#FFFFFF',
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 12.5,
                                fontWeight: 900,
                                letterSpacing: '0.07em',
                                boxShadow: '0 14px 28px rgba(225, 29, 72, 0.28)',
                              }}
                            >
                              <span>Angkat Jadi Undian Rasmi</span>
                              <ArrowRight size={15} strokeWidth={2.8} />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </KineticWindow>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* SHOT 2 HERO (and Shot 3 Left Context): Center Live Poll Monolith */}
          {pollOpacity > 0.01 ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 980,
                height: 550,
                transformStyle: 'preserve-3d',
                opacity: pollOpacity,
                transform: `translate(-50%, -50%) translate3d(${pollCenterX.toFixed(1)}px, ${pollCenterY.toFixed(1)}px, ${pollCenterZ.toFixed(1)}px) rotateX(3deg) rotateY(${pollRotY.toFixed(2)}deg) scale(${pollScale.toFixed(4)})`,
              }}
            >
              <KineticWindow
                surface="light"
                routeLabel="/portal/polysuara/undian"
                statusPill={isUsulAccepted ? 'USUL DILULUSKAN ✓' : 'UNDIAN DIBUKA'}
                statusAccent
                accentColor={isUsulAccepted ? EMERALD : ROSE}
                accentSoftBg={isUsulAccepted ? EMERALD_SOFT : ROSE_SOFT}
                accentBorderColor={isUsulAccepted ? EMERALD_BORDER : ROSE_BORDER}
                width={980}
                height={550}
                sheenStartFrame={284}
                sheenDuration={36}
                style={{
                  borderBottom: `7px solid ${isUsulAccepted ? EMERALD : ROSE}`,
                  boxShadow: '0 34px 76px rgba(190, 18, 60, 0.16)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '24px 30px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  {/* Poll Title Header + Live Participation Pie Ring */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Vote size={17} color={ROSE_INK} strokeWidth={2.5} />
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: '0.12em',
                            color: ROSE_INK,
                          }}
                        >
                          UNDIAN RASMI KAMPUS • 1 PELAJAR 1 UNDI
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 28,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        {resolvedTitle}
                      </span>
                    </div>

                    {/* @remotion/shapes <Circle> + <Pie> Participation Indicator */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                        borderRadius: 18,
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `1.5px solid ${ROSE_BORDER}`,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: 56,
                          height: 56,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Circle
                          radius={23}
                          fill="none"
                          stroke="rgba(244, 63, 94, 0.18)"
                          strokeWidth={5}
                          premountFor={safeFps}
                          showInTimeline={false}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                        <Pie
                          radius={23}
                          progress={livePctA / 100}
                          closePath={false}
                          fill="none"
                          stroke={ROSE}
                          strokeWidth={5}
                          strokeLinecap="round"
                          premountFor={safeFps}
                          showInTimeline={false}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                        <Users size={15} color={ROSE_INK} strokeWidth={2.5} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: LAUNCH_PALETTE.PRIMARY,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {liveTotalVotes} Undi
                        </span>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 800,
                            color: LAUNCH_PALETTE.INK_SOFT,
                          }}
                        >
                          KUORUM DICAPAI ✓
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Option A & Option B Animated Horizontal Vote Bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Option A (Winning) */}
                    <div
                      style={{
                        position: 'relative',
                        padding: '18px 22px',
                        borderRadius: 20,
                        backgroundColor: '#FFFFFF',
                        border: `2px solid ${ROSE}`,
                        boxShadow: '0 14px 32px rgba(244, 63, 94, 0.14)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${livePctA}%`,
                          backgroundColor: ROSE_SOFT,
                          borderRight: `3px solid ${ROSE}`,
                        }}
                      />
                      <div
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 999,
                              backgroundColor: ROSE_DARK,
                              color: '#FFFFFF',
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 13,
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            A
                          </span>
                          <span
                            style={{
                              fontSize: 20,
                              fontWeight: 900,
                              color: LAUNCH_PALETTE.PRIMARY,
                            }}
                          >
                            {resolvedOptionA}
                          </span>
                        </div>

                        <EditorialAnnotation
                          type="highlight"
                          startFrame={284}
                          durationFrames={24}
                          color="rgba(244, 63, 94, 0.2)"
                          padding={{ top: 2, right: 6, bottom: 2, left: 6 }}
                        >
                          <span
                            style={{
                              fontSize: 34,
                              fontWeight: 900,
                              color: ROSE_INK,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {livePctA}%
                          </span>
                        </EditorialAnnotation>
                      </div>
                    </div>

                    {/* Option B */}
                    <div
                      style={{
                        position: 'relative',
                        padding: '16px 22px',
                        borderRadius: 18,
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${livePctB}%`,
                          backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                        }}
                      />
                      <div
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              backgroundColor: LAUNCH_PALETTE.SECONDARY,
                              color: '#FFFFFF',
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 12.5,
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            B
                          </span>
                          <span
                            style={{
                              fontSize: 18,
                              fontWeight: 800,
                              color: LAUNCH_PALETTE.MUTED_OLIVE,
                            }}
                          >
                            {resolvedOptionB}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: 26,
                            fontWeight: 900,
                            color: LAUNCH_PALETTE.MUTED_OLIVE,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {livePctB}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stamp Footer Banner */}
                  <div
                    style={{
                      padding: '14px 20px',
                      borderRadius: 16,
                      backgroundColor: isUsulAccepted ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY_DARK,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transform: `scale(${(0.97 + 0.03 * stampSpring).toFixed(4)})`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={18} color={EMERALD_BORDER} strokeWidth={2.5} />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 13,
                          fontWeight: 900,
                          letterSpacing: '0.09em',
                        }}
                      >
                        USUL DITERIMA JPP: NAIK TARAF SEMESTER INI
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(255, 255, 255, 0.16)',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      TINDAKAN RASMI
                    </span>
                  </div>
                </div>
              </KineticWindow>
            </div>
          ) : null}

          {/* SHOT 3 HERO: 3D Smartphone Bezel Showcasing 1-Klik IG Story Export Card (settled crisp at f=2220 / Local 462f!) */}
          {phoneEnterProgress > 0.01 ? (
            <div
              style={{
                position: 'absolute',
                right: 132,
                top: 4,
                width: 454,
                height: 672,
                borderRadius: 46,
                backgroundColor: '#181820',
                border: '3px solid #353844',
                boxShadow: '0 40px 84px rgba(31, 39, 32, 0.34)',
                padding: 16,
                opacity: phoneEnterProgress,
                transformStyle: 'preserve-3d',
                transform: `translate3d(0px, ${phoneRiseY.toFixed(1)}px, 90px) rotateY(${phoneRotY.toFixed(2)}deg) rotateX(4deg)`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Dynamic Island Notch */}
              <div
                style={{
                  position: 'absolute',
                  top: 24,
                  left: '50%',
                  width: 116,
                  height: 24,
                  borderRadius: 999,
                  backgroundColor: '#0E0F14',
                  transform: 'translateX(-50%)',
                  zIndex: 6,
                }}
              />

              {/* IG STORY SCREEN CONTENT */}
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  borderRadius: 34,
                  backgroundColor: '#251724',
                  border: `1.5px solid ${ROSE_BORDER}`,
                  overflow: 'hidden',
                  padding: '54px 24px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                }}
              >
                {/* Top Story Progress Bar Segments */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ flex: 1, height: 3.5, borderRadius: 999, backgroundColor: ROSE }} />
                  <span style={{ flex: 1, height: 3.5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)' }} />
                  <span style={{ flex: 1, height: 3.5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)' }} />
                </div>

                {/* IG Story Pill Tag */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(244, 63, 94, 0.26)',
                      border: `1px solid ${ROSE}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: '0.1em',
                      color: '#FFE4E6',
                    }}
                  >
                    <Sparkles size={12} color={ROSE_BORDER} strokeWidth={2.5} />
                    IG STORY KAD RASMI
                  </span>
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'rgba(255, 255, 255, 0.72)',
                    }}
                  >
                    #POLYSUARA
                  </span>
                </div>

                {/* Inner Elevated Result Poster Card */}
                <div
                  style={{
                    flex: 1,
                    borderRadius: 24,
                    backgroundColor: '#FFFFFF',
                    padding: '22px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 22px 44px rgba(0, 0, 0, 0.35)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <PersonaMonogram
                      species="fox"
                      size={44}
                      accentColor={ROSE}
                      softBgColor={ROSE_SOFT}
                      borderColor={ROSE_BORDER}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 900,
                          color: ROSE_INK,
                        }}
                      >
                        SUARA KITA MENANG
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        JPP POLISAS · 2026
                      </span>
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 900,
                      lineHeight: 1.24,
                      color: LAUNCH_PALETTE.PRIMARY,
                    }}
                  >
                    {resolvedOptionA}
                  </p>

                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 16,
                      backgroundColor: ROSE_SOFT,
                      border: `1.5px solid ${ROSE_BORDER}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          fontSize: 34,
                          fontWeight: 900,
                          color: ROSE_INK,
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: 1,
                        }}
                      >
                        {safePctA}% SETUJU
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 800,
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        {safeTotalVotes} Mahasiswa Mengundi
                      </span>
                    </div>
                    <CheckCircle2 size={28} color={EMERALD_INK} strokeWidth={2.6} />
                  </div>
                </div>

                {/* Bottom Share CTA Pill */}
                <div
                  style={{
                    padding: '13px 18px',
                    borderRadius: 16,
                    backgroundColor: ROSE_DARK,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                  }}
                >
                  <Share2 size={16} strokeWidth={2.6} />
                  <span>1-KLIK KONGSI KE IG STORY ✓</span>
                </div>

                {/* Diagonal Light Sheen Sweep */}
                {phoneSheenOpacity > 0.01 ? (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: '-40%',
                      left: `${phoneSheenLeft.toFixed(1)}%`,
                      width: '34%',
                      height: '180%',
                      background:
                        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%)',
                      transform: 'rotate(22deg)',
                      opacity: phoneSheenOpacity,
                      pointerEvents: 'none',
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Spark bursts on Shot 2 Usul Accepted & Shot 3 IG Story Ready */}
          <GeometricSparkBurst
            triggerFrame={286}
            x={960}
            y={560}
            durationFrames={34}
            radius={108}
            count={12}
            seed="polysuara-poll-win"
            colors={[ROSE, EMERALD, '#FFFFFF']}
          />
          <GeometricSparkBurst
            triggerFrame={438}
            x={1575}
            y={380}
            durationFrames={30}
            radius={94}
            count={10}
            seed="polysuara-ig-story"
            colors={[ROSE, INDIGO, '#FFFFFF']}
          />

          {/* Ghost Cursors strictly scoped outside still target frames */}
          <GhostCursor
            keyframes={SHOT1_CURSOR_KEYFRAMES}
            appearFrame={154}
            disappearFrame={184}
            color={LAUNCH_PALETTE.PRIMARY_DARK}
            rippleColor={ROSE}
          />
          <GhostCursor
            keyframes={SHOT2_CURSOR_KEYFRAMES}
            appearFrame={224}
            disappearFrame={272}
            color={LAUNCH_PALETTE.PRIMARY_DARK}
            rippleColor={ROSE}
          />
        </div>
      </CameraStage>

      <EditorialFrameMarks
        chapterCode="05"
        chapterLabel="KOMUNITI SISWA • LUAH & UNDI TANPA NAMA"
      />
    </>
  );
};

const polySuaraSchema = {
  pollTitle: { type: 'string', default: STUDENT_POLL_TITLE_DEFAULT, description: 'Live Poll Title' },
  optionA: { type: 'string', default: STUDENT_OPTION_A_DEFAULT, description: 'Option A' },
  optionB: { type: 'string', default: STUDENT_OPTION_B_DEFAULT, description: 'Option B' },
  percentageA: {
    type: 'number',
    default: 68,
    min: 5,
    max: 95,
    integer: true,
    hiddenFromList: false,
    description: 'Option A Percentage',
  },
  totalVotes: {
    type: 'number',
    default: 412,
    min: 10,
    max: 9999,
    integer: true,
    hiddenFromList: false,
    description: 'Total Student Votes',
  },
} as const satisfies InteractivitySchema;

export const PolySuaraVoiceScene = Interactive.withSchema({
  Component: PolySuaraVoiceInner,
  componentName: 'PolySuaraVoiceScene',
  schema: polySuaraSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
