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
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';
import { KineticWindow, PersonaMonogram, SpatialFloorGrid } from '../ui/KineticCard';

const ROSE = LAUNCH_MODULE_THEMES.polysuara.primary; // #F43F5E
const ROSE_DARK = LAUNCH_MODULE_THEMES.polysuara.dark; // #E11D48
const ROSE_INK = '#BE123C'; // WCAG AA+ Rose-700
const ROSE_SOFT = LAUNCH_MODULE_THEMES.polysuara.soft; // #FFF1F2
const ROSE_BORDER = LAUNCH_MODULE_THEMES.polysuara.border; // #FECDD3
const AMBER = LAUNCH_MODULE_THEMES.polymart.primary; // #F59E0B
const AMBER_INK = '#B45309';
const INDIGO = LAUNCH_MODULE_THEMES.takwim.primary; // #6366F1
const INDIGO_INK = '#4338CA';
const INDIGO_SOFT = LAUNCH_MODULE_THEMES.takwim.soft;
const INDIGO_BORDER = LAUNCH_MODULE_THEMES.takwim.border;

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

// Local Poll Card Geometry so GhostCursor coordinates lock exactly in Option A 3D plane
const POLL_W = 602;
const POLL_H = 598;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const RACE_EASE = Easing.bezier(0.25, 1, 0.5, 1);
const VOTES_SETTLE_EASE = Easing.bezier(0.22, 1, 0.36, 1);

const REACTION_SPECS = [
  {
    id: 'flame',
    target: 128,
    icon: 'flame' as const,
    color: ROSE_INK,
    softBg: ROSE_SOFT,
    border: ROSE_BORDER,
  },
  {
    id: 'thumbsup',
    target: 84,
    icon: 'thumbsup' as const,
    color: AMBER_INK,
    softBg: LAUNCH_MODULE_THEMES.polymart.soft,
    border: LAUNCH_MODULE_THEMES.polymart.border,
  },
  {
    id: 'heart',
    target: 62,
    icon: 'heart' as const,
    color: ROSE_DARK,
    softBg: ROSE_SOFT,
    border: ROSE_BORDER,
  },
] as const;

const renderReactionIcon = (kind: (typeof REACTION_SPECS)[number]['icon'], color: string) => {
  switch (kind) {
    case 'flame':
      return <Flame size={17} color={color} strokeWidth={2.5} />;
    case 'thumbsup':
      return <ThumbsUp size={17} color={color} strokeWidth={2.5} />;
    case 'heart':
      return <Heart size={17} color={color} strokeWidth={2.5} />;
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
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
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
  const safeTotalVotes = Number.isFinite(totalVotes) ? Math.max(1, Math.round(totalVotes)) : 412;

  // Beat 1 (0..1.4s): Header + 3D Fanned Persona Cards
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.36 * safeFps));
  const headlineStart = Math.round(0.08 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.055 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.34 * safeFps));
  const ruleStart = Math.round(0.24 * safeFps);
  const ruleDuration = Math.max(10, Math.round(0.55 * safeFps));

  const fanEnter = interpolate(frame, [Math.round(0.18 * safeFps), Math.round(0.85 * safeFps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // 3D Reaction cluster bursts at +46px relative Z (+74px world Z)
  const reactionBase = Math.round(0.75 * safeFps); // 45f
  const reactionStagger = Math.max(3, Math.round((7 / 60) * safeFps));

  // Center Poll Monolith + GhostCursor click lock at f=86 (~1.43s) -> extruded 68% by Global f=1290 (Local 180)
  const pollEnter = interpolate(frame, [Math.round(0.3 * safeFps), Math.round(0.9 * safeFps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const clickFrame = Math.round(1.42 * safeFps); // 85f
  const pollVoted = frame >= clickFrame;
  const optionALiftSpring = pollVoted
    ? spring({
        frame: frame - clickFrame,
        fps: safeFps,
        config: { damping: 14, stiffness: 230, mass: 0.8 },
      })
    : 0;

  const cursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: Math.round(0.95 * safeFps), x: 520, y: 120 },
    { frame: Math.round(1.32 * safeFps), x: 320, y: 245 },
    { frame: clickFrame, x: 320, y: 245, click: true },
    { frame: clickFrame + Math.round(0.45 * safeFps), x: 380, y: 270 },
  ];

  const barProgress = interpolate(
    frame,
    [clickFrame + 2, clickFrame + Math.round(1.05 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: RACE_EASE,
    },
  );
  const currentPctA = Math.round(clampedA * barProgress);
  const currentPctB = Math.round(clampedB * barProgress);
  const headerVotes = Math.round(
    interpolate(
      frame,
      [clickFrame - 2, clickFrame + Math.round(1.1 * safeFps)],
      [0, safeTotalVotes],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: VOTES_SETTLE_EASE,
      },
    ),
  );
  const votesA = Math.round((currentPctA / 100) * headerVotes);
  const votesB = Math.max(0, headerVotes - votesA);

  const circleStart = clickFrame + Math.round(0.75 * safeFps); // 130f
  const circleDuration = Math.round(0.5 * safeFps); // 30f -> completed at 160f!

  // Right Foreground 3D Smartphone Frame (IGStoryExportCard) soaring in (f=100..158)
  const phoneStart = Math.round(1.65 * safeFps); // 99f
  const phoneSpring =
    frame >= phoneStart
      ? spring({
          frame: frame - phoneStart,
          fps: safeFps,
          config: { damping: 15, stiffness: 205, mass: 0.9 },
        })
      : 0;
  const phoneOpacity =
    frame >= phoneStart
      ? interpolate(frame, [phoneStart, phoneStart + Math.round(0.22 * safeFps)], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const phoneFloatY = Math.sin(timeSec * 1.45 + 0.5) * 4.5 * phoneSpring;
  const phoneGlintLeft = interpolate(
    frame,
    [phoneStart + 18, phoneStart + 64],
    [-40, 130],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    },
  );
  const phoneGlintOpacity = interpolate(
    frame,
    [phoneStart + 18, phoneStart + 30, phoneStart + 54, phoneStart + 64],
    [0, 0.45, 0.45, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const liveDotScale = 0.85 + Math.sin(timeSec * 5.2) * 0.16;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.polysuara.tint} />

      <CameraStage
        perspective={1500}
        zoomFrom={0.965}
        zoomTo={1.0}
        panXFrom={4}
        panXTo={-4}
        panYFrom={3}
        panYTo={-3}
        tiltXFrom={4}
        tiltXTo={-1}
        tiltYFrom={4}
        tiltYTo={-4}
        breathingAmplitude={0.35}
        entryPanXOffset={24}
        entryZoomOffset={-0.02}
        exitPanXDelta={-20}
        exitZoomDelta={0.03}
        exitFrames={Math.round(0.32 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: LAUNCH_FONTS.DISPLAY,
            perspective: '1500px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 3D Architectural Perspective Floor Grid with Rose & Amber Radial Wash */}
          <SpatialFloorGrid accentColor={ROSE} secondaryColor={AMBER} gridOpacity={0.22} scrollSpeed={14} />

          {/* Beat 1: Editorial Header Row + Live Vote Counter Pill */}
          <div
            style={{
              position: 'absolute',
              left: 64,
              right: 64,
              top: 66,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 24,
              zIndex: 8,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    alignSelf: 'flex-start',
                    padding: '6px 16px',
                    borderRadius: 999,
                    backgroundColor: ROSE_SOFT,
                    border: `1.5px solid ${ROSE}`,
                    color: ROSE_INK,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12.5,
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                  }}
                >
                  <MessageSquare size={14} color={ROSE_INK} strokeWidth={2.5} />
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
                accentColor={ROSE_DARK}
                style={{
                  margin: 0,
                  fontSize: 50,
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.06,
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                borderRadius: 999,
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                border: `1.5px solid ${ROSE}`,
                boxShadow: '0 10px 26px rgba(244, 63, 94, 0.14)',
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: LAUNCH_PALETTE.PRIMARY,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
                marginBottom: 8,
              }}
            >
              <Users size={16} color={ROSE_INK} strokeWidth={2.4} />
              <span>{headerVotes.toLocaleString('en-US')} UNDI PELAJAR</span>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 64,
              top: 196,
              width: 1792,
              height: 10,
              pointerEvents: 'none',
            }}
          >
            <EvolvingPath
              d="M 0 5 L 1792 5"
              width={1792}
              height={10}
              startFrame={ruleStart}
              durationFrames={ruleDuration}
              stroke={ROSE}
              trackStroke="rgba(254, 205, 211, 0.55)"
              strokeWidth={2}
              headDotColor={ROSE_INK}
              headDotRadius={3.5}
              hideDotWhenComplete
            />
          </div>

          {/* 3-Zone 3D VisionOS Spatial Community Atrium (y: 220..975) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 222,
              height: 752,
              perspective: '1450px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* ZONE 1 (Left-Arc, x=160..628): 3D Fanned Anonymous Animal Persona Deck */}
            <div
              style={{
                position: 'absolute',
                left: 160,
                top: 22,
                width: 468,
                height: 676,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Back-Left Card: Owl Monogram (#AKADEMIK) */}
              <div
                style={{
                  position: 'absolute',
                  left: 6,
                  top: 0,
                  width: 446,
                  padding: '14px 16px',
                  borderRadius: 22,
                  backgroundColor: INDIGO_SOFT,
                  border: `1.5px solid ${INDIGO_BORDER}`,
                  boxShadow: '0 22px 46px rgba(99, 102, 241, 0.14)',
                  opacity: fanEnter,
                  transform: `translate3d(${(-2 * fanEnter).toFixed(2)}px, ${(Math.sin(timeSec * 1.1) * 3).toFixed(2)}px, -24px) rotateY(10deg) rotateZ(-4deg)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <PersonaMonogram
                      species="owl"
                      size={40}
                      accentColor={INDIGO}
                      softBgColor="#FFFFFF"
                      borderColor={INDIGO_BORDER}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Burung Hantu Semambu (Anon #118)
                      </div>
                      <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 10.5, fontWeight: 700, color: INDIGO_INK }}>
                        #AKADEMIK • Nota Kuliah
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 9px',
                      borderRadius: 999,
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${INDIGO_BORDER}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10,
                      fontWeight: 800,
                      color: INDIGO_INK,
                      flexShrink: 0,
                    }}
                  >
                    8m lalu
                  </span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600, color: LAUNCH_PALETTE.INK_SOFT }}>
                  “Bilik bacaan blok kejuruteraan sangat selesa lepas waktu petang, plug point pun cukup.”
                </p>
              </div>

              {/* Back-Right Card: Cat Monogram (#KAMSIS) */}
              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  top: 400,
                  width: 446,
                  padding: '14px 16px',
                  borderRadius: 22,
                  backgroundColor: LAUNCH_MODULE_THEMES.polymart.soft,
                  border: `1.5px solid ${LAUNCH_MODULE_THEMES.polymart.border}`,
                  boxShadow: '0 22px 46px rgba(245, 158, 11, 0.14)',
                  opacity: fanEnter,
                  transform: `translate3d(${(6 * fanEnter).toFixed(2)}px, ${(Math.cos(timeSec * 1.2 + 0.7) * 3).toFixed(2)}px, -10px) rotateY(10deg) rotateZ(3.5deg)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <PersonaMonogram
                      species="cat"
                      size={40}
                      accentColor={AMBER}
                      softBgColor="#FFFFFF"
                      borderColor={LAUNCH_MODULE_THEMES.polymart.border}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Kucing Kamsis (Anon #274)
                      </div>
                      <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 10.5, fontWeight: 700, color: AMBER_INK }}>
                        #KAMSIS • Sokongan Siswa
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 9px',
                      borderRadius: 999,
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${LAUNCH_MODULE_THEMES.polymart.border}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10,
                      fontWeight: 800,
                      color: AMBER_INK,
                      flexShrink: 0,
                    }}
                  >
                    19m lalu
                  </span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600, color: LAUNCH_PALETTE.INK_SOFT }}>
                  “Terima kasih JPP bantu sampaikan isu mesin air kamsis, terus dibaiki dalam sehari!”
                </p>
              </div>

              {/* HERO Front Confession Card: Rubah Semambu (Anon #409) hovering forward at +28px Z */}
              <div
                style={{
                  position: 'absolute',
                  left: 10,
                  top: 132,
                  width: 454,
                  borderRadius: 24,
                  backgroundColor: '#FFFFFF',
                  border: `2px solid ${ROSE}`,
                  padding: '16px 18px',
                  boxShadow:
                    '0 34px 72px rgba(244, 63, 94, 0.22), 0 12px 26px rgba(31, 39, 32, 0.14)',
                  boxSizing: 'border-box',
                  transformStyle: 'preserve-3d',
                  opacity: fanEnter,
                  transform: `translate3d(0px, ${(Math.sin(timeSec * 1.45) * 3.5).toFixed(2)}px, ${(28 * fanEnter).toFixed(2)}px) rotateX(6deg) rotateY(10deg)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <PersonaMonogram
                      species="fox"
                      size={44}
                      accentColor={ROSE}
                      softBgColor={ROSE_SOFT}
                      borderColor={ROSE_BORDER}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Rubah Semambu (#409)
                      </div>
                      <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 10.5, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                        100% Anonim • 2 min lalu
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 9px',
                      borderRadius: 999,
                      backgroundColor: ROSE_SOFT,
                      border: `1px solid ${ROSE_BORDER}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10,
                      fontWeight: 800,
                      color: ROSE_INK,
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={11} color={ROSE_INK} strokeWidth={2.5} />
                    <span>#FASILITI</span>
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: '12px 14px',
                    borderRadius: 16,
                    backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                    border: `1px solid ${ROSE_BORDER}`,
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.38,
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                >
                  “Harap dapat tambah meja belajar &amp; plug point di Dataran Siswa — senang nak siapkan tugasan berkumpulan.”
                </div>

                {/* 3D Extruded Reaction Badges floating at +46px relative Z */}
                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, transformStyle: 'preserve-3d' }}>
                    {REACTION_SPECS.map((rx, idx) => {
                      const rxStart = reactionBase + idx * reactionStagger;
                      const rxSpring =
                        frame >= rxStart
                          ? spring({
                              frame: frame - rxStart,
                              fps: safeFps,
                              config: { damping: 13, stiffness: 250, mass: 0.72 },
                            })
                          : 0;
                      const countVal = Math.round(rx.target * rxSpring);
                      const popZ = 46 * rxSpring;

                      return (
                        <div
                          key={rx.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 11px',
                            borderRadius: 999,
                            backgroundColor: rx.softBg,
                            border: `1.5px solid ${rx.border}`,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12.5,
                            fontWeight: 900,
                            color: rx.color,
                            fontVariantNumeric: 'tabular-nums',
                            boxShadow: '0 12px 24px rgba(244, 63, 94, 0.18)',
                            transform: `translate3d(0px, ${(-2 * rxSpring).toFixed(2)}px, ${popZ.toFixed(2)}px) scale(${(0.86 + 0.14 * rxSpring).toFixed(4)})`,
                          }}
                        >
                          {renderReactionIcon(rx.icon, rx.color)}
                          <span>{countVal}</span>
                        </div>
                      );
                    })}
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '7px 12px',
                      borderRadius: 999,
                      backgroundColor: ROSE_INK,
                      color: '#FFFFFF',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      boxShadow: '0 10px 22px rgba(190, 18, 60, 0.26)',
                      transform: 'translate3d(0px, 0px, 28px)',
                      flexShrink: 0,
                    }}
                  >
                    <Share2 size={12} strokeWidth={2.5} />
                    <span>IG Story</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ZONE 2 (Center, x=652..1254): 3D Volumetric Live Poll Monolith + Locked GhostCursor */}
            <Interactive.Div
              name="PolySuara 3D Poll Monolith"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 652,
                top: 24,
                width: POLL_W,
                height: POLL_H,
                opacity: pollEnter,
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity',
                transform: `translate3d(0px, ${((1 - pollEnter) * 30 + Math.cos(timeSec * 1.25 + 0.5) * 3).toFixed(2)}px, ${(30 * pollEnter).toFixed(2)}px) rotateX(7deg) rotateY(-3deg)`,
              }}
            >
              <KineticWindow
                surface="light"
                routeLabel="jpp.polisas.edu.my/undian"
                statusPill={pollVoted ? 'UNDIAN DIREKOD ✓' : 'UNDIAN LANGSUNG'}
                statusAccent
                accentColor={ROSE_INK}
                accentSoftBg={ROSE_SOFT}
                accentBorderColor={ROSE}
                width="100%"
                height="100%"
                borderRadius={26}
                sheenStartFrame={Math.round(2.4 * safeFps)}
                sheenDuration={44}
                style={{
                  borderColor: ROSE_BORDER,
                  boxShadow:
                    '0 42px 86px rgba(244, 63, 94, 0.18), 0 16px 34px rgba(31, 39, 32, 0.12)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '22px 26px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    boxSizing: 'border-box',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        color: ROSE_INK,
                      }}
                    >
                      <Vote size={14} color={ROSE_INK} strokeWidth={2.4} />
                      <span>UNDIAN KOMUNITI SISWA</span>
                    </div>

                    <h3
                      style={{
                        margin: '8px 0 0',
                        fontSize: 25,
                        fontWeight: 900,
                        letterSpacing: '-0.025em',
                        lineHeight: 1.18,
                        color: LAUNCH_PALETTE.PRIMARY,
                      }}
                    >
                      {resolvedPollTitle}
                    </h3>
                  </div>

                  {/* Option A Extrudes Physically Forward (+34px relative Z) on Click */}
                  <div
                    style={{
                      position: 'relative',
                      padding: '18px 20px',
                      borderRadius: 20,
                      backgroundColor: pollVoted ? '#FFFFFF' : LAUNCH_PALETTE.BACKGROUND,
                      border: `2px solid ${pollVoted ? ROSE : LAUNCH_PALETTE.TERTIARY}`,
                      boxShadow: pollVoted
                        ? '0 24px 52px rgba(225, 29, 72, 0.24), 0 8px 18px rgba(31, 39, 32, 0.08)'
                        : 'none',
                      transform: `translate3d(0px, ${(-4 * optionALiftSpring).toFixed(2)}px, ${(34 * optionALiftSpring).toFixed(2)}px) scale(${(1 + 0.02 * optionALiftSpring).toFixed(4)})`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 999,
                            backgroundColor: pollVoted ? ROSE_INK : '#FFFFFF',
                            border: `2px solid ${pollVoted ? ROSE_INK : LAUNCH_PALETTE.TERTIARY}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {pollVoted ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                        </span>
                        <span style={{ fontSize: 17, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY, lineHeight: 1.24 }}>
                          {resolvedOptionA}
                        </span>
                      </div>

                      <div style={{ position: 'relative', minWidth: 74, textAlign: 'right' }}>
                        <EditorialAnnotation
                          type="circle"
                          startFrame={circleStart}
                          durationFrames={circleDuration}
                          color={ROSE_DARK}
                          strokeWidth={3.5}
                          padding={10}
                          iterations={2}
                          seed={22}
                          style={{ display: 'inline-block' }}
                        >
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 28,
                              fontWeight: 900,
                              color: pollVoted ? ROSE_INK : LAUNCH_PALETTE.PRIMARY,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {currentPctA}%
                          </span>
                        </EditorialAnnotation>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        height: 16,
                        width: '100%',
                        borderRadius: 999,
                        backgroundColor: ROSE_SOFT,
                        border: `1px solid ${ROSE_BORDER}`,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${clampedA}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: ROSE_INK,
                          transformOrigin: 'left center',
                          transform: `scaleX(${Math.max(0.001, barProgress).toFixed(4)})`,
                        }}
                      />
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 12, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                        {votesA.toLocaleString('en-US')} undi pelajar
                      </span>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          backgroundColor: ROSE_INK,
                          color: '#FFFFFF',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 800,
                          opacity: pollVoted ? 1 : 0,
                        }}
                      >
                        PILIHAN ANDA ✓
                      </span>
                    </div>
                  </div>

                  {/* Option B Comparison Bar */}
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: 18,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 15.5, fontWeight: 800, color: LAUNCH_PALETTE.PRIMARY, lineHeight: 1.24 }}>
                        {resolvedOptionB}
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 22,
                          fontWeight: 900,
                          color: LAUNCH_PALETTE.INK_SOFT,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {currentPctB}%
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        height: 12,
                        width: '100%',
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${clampedB}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SECONDARY,
                          transformOrigin: 'left center',
                          transform: `scaleX(${Math.max(0.001, barProgress).toFixed(4)})`,
                        }}
                      />
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: LAUNCH_FONTS.MONO, fontSize: 11.5, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                      <span>{votesB.toLocaleString('en-US')} undi pelajar</span>
                      <span>Sokongan Ruang Belajar Kamsis</span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: LAUNCH_PALETTE.INK_SOFT,
                    }}
                  >
                    <span>• Identiti 100% Tanpa Nama</span>
                    <span>• Suara Terus Ke JPP</span>
                    <span>• Kiraan Langsung</span>
                  </div>
                </div>
              </KineticWindow>

              {/* GhostCursor mounted inside Poll Monolith 3D coordinate space so click lands accurately */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  transform: 'translate3d(0px, 0px, 72px)',
                  zIndex: 20,
                }}
              >
                <GhostCursor
                  keyframes={cursorKeyframes}
                  appearFrame={Math.round(0.9 * safeFps)}
                  disappearFrame={clickFrame + Math.round(0.7 * safeFps)}
                  color={LAUNCH_PALETTE.PRIMARY}
                  rippleColor={ROSE}
                />
              </div>
            </Interactive.Div>

            {/* ZONE 3 (Right-Foreground, x=1280..1624): 3D Floating Smartphone IGStoryExportCard (+46px Z) */}
            {phoneOpacity > 0.005 ? (
              <Interactive.Div
                name="IGStory 3D Smartphone Frame"
                premountFor={safeFps}
                style={{
                  position: 'absolute',
                  left: 1280,
                  top: 22,
                  width: 344,
                  height: 576,
                  opacity: phoneOpacity,
                  transformOrigin: '50% 50%',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity',
                  transform: `translate3d(0px, ${((1 - phoneSpring) * 34 + phoneFloatY).toFixed(2)}px, ${(46 * phoneSpring).toFixed(2)}px) rotateY(-13deg) rotateX(7deg) rotateZ(1.2deg) scale(${(0.9 + 0.1 * phoneSpring).toFixed(4)})`,
                  zIndex: 18,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    borderRadius: 40,
                    padding: '14px 14px 16px',
                    backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                    border: `2.5px solid ${ROSE}`,
                    boxShadow:
                      '0 42px 92px rgba(244, 63, 94, 0.28), 0 18px 40px rgba(31, 39, 32, 0.34)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  {/* Sweeping Holographic Foil Glint */}
                  {phoneGlintOpacity > 0.004 ? (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: '-45%',
                        left: `${phoneGlintLeft.toFixed(2)}%`,
                        width: '36%',
                        height: '190%',
                        opacity: phoneGlintOpacity,
                        background:
                          'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(254, 205, 211, 0.55) 50%, rgba(255,255,255,0) 100%)',
                        transform: 'rotate(24deg)',
                        pointerEvents: 'none',
                        zIndex: 6,
                      }}
                    />
                  ) : null}

                  {/* Top Smartphone Notch Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 112,
                        height: 22,
                        borderRadius: 999,
                        backgroundColor: '#111612',
                        border: '1px solid rgba(254, 205, 211, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          backgroundColor: ROSE,
                          transform: `scale(${liveDotScale.toFixed(3)})`,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 9,
                          fontWeight: 800,
                          color: ROSE_BORDER,
                          letterSpacing: '0.12em',
                        }}
                      >
                        IG STORY
                      </span>
                    </div>

                    {/* Progress Bars typical of IG Story */}
                    <div style={{ width: '100%', display: 'flex', gap: 5 }}>
                      <div style={{ flex: 1, height: 3.5, borderRadius: 999, backgroundColor: ROSE }} />
                      <div style={{ flex: 1, height: 3.5, borderRadius: 999, backgroundColor: 'rgba(254, 205, 211, 0.32)' }} />
                      <div style={{ flex: 1, height: 3.5, borderRadius: 999, backgroundColor: 'rgba(254, 205, 211, 0.32)' }} />
                    </div>
                  </div>

                  {/* Story Card Main Brand Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 16,
                      backgroundColor: 'rgba(255, 241, 242, 0.08)',
                      border: '1px solid rgba(254, 205, 211, 0.24)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <PersonaMonogram
                        species="fox"
                        size={38}
                        accentColor={ROSE}
                        softBgColor={ROSE_SOFT}
                        borderColor={ROSE_BORDER}
                      />
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF' }}>
                          Poly<span style={{ color: ROSE }}>Suara</span>
                        </div>
                        <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 9.5, fontWeight: 800, color: ROSE_BORDER }}>
                          RUBAH SEMAMBU • #409
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(244, 63, 94, 0.25)',
                        border: `1px solid ${ROSE}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 9.5,
                        fontWeight: 800,
                        color: ROSE_BORDER,
                      }}
                    >
                      1 KLIK
                    </span>
                  </div>

                  {/* Story Confession Quote */}
                  <div
                    style={{
                      padding: '13px 14px',
                      borderRadius: 16,
                      backgroundColor: '#FFFFFF',
                      border: `1.5px solid ${ROSE_BORDER}`,
                      boxShadow: '0 14px 28px rgba(0, 0, 0, 0.22)',
                    }}
                  >
                    <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 9.5, fontWeight: 800, color: ROSE_INK, letterSpacing: '0.1em' }}>
                      LUAHAN PILIHAN MINGGU INI
                    </div>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 14,
                        fontWeight: 800,
                        lineHeight: 1.35,
                        color: LAUNCH_PALETTE.PRIMARY,
                      }}
                    >
                      “Harap dapat tambah meja belajar &amp; plug point di Dataran Siswa!”
                    </p>
                  </div>

                  {/* Story Official Fast Response Badge */}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 16,
                      backgroundColor: 'rgba(244, 63, 94, 0.18)',
                      border: `1.5px solid ${ROSE}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10,
                        fontWeight: 800,
                        color: ROSE_BORDER,
                      }}
                    >
                      <CheckCircle2 size={13} color={ROSE} strokeWidth={2.5} />
                      <span>TINDAKAN PANTAS JPP ✓</span>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.32 }}>
                      “Cadangan dimasukkan ke senarai naik taraf ruang siswa semester ini.”
                    </span>
                  </div>

                  {/* Bottom IG Story CTA */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 999,
                      backgroundColor: ROSE_INK,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                    }}
                  >
                    <Share2 size={13} strokeWidth={2.5} />
                    <span>KONGSI KE IG STORY</span>
                  </div>
                </div>
              </Interactive.Div>
            ) : null}
          </div>
        </div>
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
