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
  ArrowRight,
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
import { KineticWindow, PersonaMonogram } from '../ui/KineticCard';

const ROSE = LAUNCH_MODULE_THEMES.polysuara.primary; // #F43F5E
const ROSE_DARK = LAUNCH_MODULE_THEMES.polysuara.dark; // #E11D48
const ROSE_INK = '#BE123C'; // WCAG AA+ Rose-700
const ROSE_SOFT = LAUNCH_MODULE_THEMES.polysuara.soft; // #FFF1F2
const ROSE_BORDER = LAUNCH_MODULE_THEMES.polysuara.border; // #FECDD3

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft;

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

// Upright Poll Workbench Dimensions (GhostCursor coordinates live directly in this 2D plane)
const POLL_W = 652;
const POLL_H = 706;

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
      return <Flame size={16} color={color} strokeWidth={2.5} />;
    case 'thumbsup':
      return <ThumbsUp size={16} color={color} strokeWidth={2.5} />;
    case 'heart':
      return <Heart size={16} color={color} strokeWidth={2.5} />;
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
  const s = (secs: number) => Math.round(secs * safeFps);
  const f60 = (f: number) => Math.round((f / 60) * safeFps);

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

  // Beat timings
  const pillStart = 0;
  const pillDuration = Math.max(8, s(0.35));
  const headlineStart = s(0.08);
  const wordStagger = Math.max(2, s(0.05));
  const wordDuration = Math.max(8, s(0.32));
  const ruleStart = s(0.2);
  const ruleDuration = Math.max(10, s(0.5));

  // BEAT 1 (Left Upright Column): Anonymous Confession + Reaction Pop
  const leftEnter = interpolate(frame, [f60(10), f60(34)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const quoteReveal = interpolate(frame, [f60(20), f60(40)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const reactionBase = f60(38);
  const reactionStagger = Math.max(3, f60(6));
  const pollConvertTrigger = f60(54);
  const convertPillLit = frame >= pollConvertTrigger;

  // Connector 1: Confession -> Poll (58..78f)
  const conn1Start = f60(58);
  const conn1Duration = Math.max(10, f60(20));

  // BEAT 2 (Center Upright Poll Column): Wakes smoothly as Connector 1 arrives
  const pollWake = interpolate(frame, [f60(68), f60(88)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const pollOpacity = 0.5 + 0.5 * pollWake;
  const pollScale = 0.985 + 0.015 * pollWake;

  const clickOptionAFrame = f60(104);
  const exportClickFrame = f60(138);
  const pollVoted = frame >= clickOptionAFrame;
  const storyExportTriggered = frame >= exportClickFrame;

  const cursorKeyframes: readonly GhostCursorKeyframe[] = [
    { frame: f60(78), x: 520, y: 120 },
    { frame: clickOptionAFrame, x: 320, y: 278, click: true, label: 'Undi Pilihan A' },
    { frame: exportClickFrame, x: 530, y: 649, click: true, label: 'Eksport IG Story' },
    { frame: f60(162), x: 560, y: 580 },
  ];

  const barProgress = interpolate(
    frame,
    [clickOptionAFrame + 2, clickOptionAFrame + f60(32)],
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
    interpolate(frame, [clickOptionAFrame, clickOptionAFrame + f60(34)], [0, safeTotalVotes], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: VOTES_SETTLE_EASE,
    }),
  );
  const votesA = Math.round((currentPctA / 100) * headerVotes);
  const votesB = Math.max(0, headerVotes - votesA);

  const resolutionBannerFrame = f60(124);
  const resolutionSpring =
    frame >= resolutionBannerFrame
      ? spring({
          frame: frame - resolutionBannerFrame,
          fps: safeFps,
          config: { damping: 16, stiffness: 225, mass: 0.85 },
        })
      : 0;

  // Connector 2: Poll Export -> IG Story Phone (140..160f)
  const conn2Start = f60(140);
  const conn2Duration = Math.max(10, f60(20));

  // BEAT 3 (Right Upright Column): Smartphone IGStoryExportCard wakes on export click
  const phoneWake = interpolate(frame, [f60(144), f60(174)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const phoneOpacity = 0.48 + 0.52 * phoneWake;
  const phoneRiseY = (1 - phoneWake) * 20;
  const phoneScale = 0.985 + 0.015 * phoneWake;

  const phoneGlintLeft = interpolate(frame, [f60(168), f60(214)], [-40, 130], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const phoneGlintOpacity = interpolate(
    frame,
    [f60(168), f60(180), f60(202), f60(214)],
    [0, 0.45, 0.45, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const liveDotScale = 0.85 + Math.sin((frame / safeFps) * 5.2) * 0.16;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.polysuara.tint} />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.016}
        panXFrom={3}
        panXTo={-3}
        panYFrom={2}
        panYTo={-2}
        tiltXFrom={0}
        tiltXTo={0}
        tiltYFrom={0}
        tiltYTo={0}
        breathingAmplitude={0.22}
        entryPanXOffset={20}
        entryZoomOffset={-0.018}
        exitPanXDelta={-18}
        exitZoomDelta={0.024}
        exitFrames={Math.round(0.32 * safeFps)}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Editorial Top Row */}
          <div
            style={{
              position: 'absolute',
              left: 72,
              right: 72,
              top: 64,
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
                  fontSize: 48,
                  fontWeight: 900,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.07,
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 999,
                backgroundColor: '#FFFFFF',
                border: `1.5px solid ${ROSE_BORDER}`,
                boxShadow: '0 8px 20px rgba(244, 63, 94, 0.1)',
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 13.5,
                fontWeight: 900,
                color: ROSE_INK,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              <Users size={15} color={ROSE_INK} strokeWidth={2.4} />
              <span>{headerVotes} UNDI PELAJAR</span>
            </div>
          </div>

          {/* Crisp Header Divider Hairline */}
          <div style={{ position: 'absolute', left: 72, top: 204, width: 1776, height: 10 }}>
            <EvolvingPath
              d="M 0 5 L 1776 5"
              width={1776}
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

          {/* UPRIGHT 3-STEP CAUSAL CHAIN (left: 72, width: 1776, height: 706 — ZERO crooked tilts!) */}
          <div
            style={{
              position: 'absolute',
              left: 72,
              top: 230,
              width: 1776,
              height: 706,
            }}
          >
            {/* BEAT 1 — LEFT COLUMN: Anonymous Persona Confession -> Reaction Burst -> Trigger Undian */}
            <Interactive.Div
              name="PolySuara Anonymous Confession"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 556,
                height: 706,
                opacity: leftEnter,
                transform: `translate3d(0px, ${((1 - leftEnter) * 20).toFixed(2)}px, 0px)`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              {/* Main Upright Fox Confession Card */}
              <div
                style={{
                  borderRadius: 24,
                  padding: '20px 22px',
                  backgroundColor: '#FFFFFF',
                  border: `2px solid ${ROSE}`,
                  borderBottom: `5px solid ${ROSE_INK}`,
                  boxShadow: '0 22px 46px rgba(244, 63, 94, 0.14), 0 8px 20px rgba(31, 39, 32, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <PersonaMonogram
                      species="fox"
                      size={46}
                      accentColor={ROSE}
                      softBgColor={ROSE_SOFT}
                      borderColor={ROSE_BORDER}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 17.5, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Rubah Semambu (#409)
                      </div>
                      <div
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 700,
                          color: LAUNCH_PALETTE.INK_SOFT,
                        }}
                      >
                        100% Anonim • Identiti Rahsia
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      borderRadius: 999,
                      backgroundColor: ROSE_SOFT,
                      border: `1px solid ${ROSE_BORDER}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: ROSE_INK,
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={12} color={ROSE_INK} strokeWidth={2.5} />
                    <span>#FASILITI</span>
                  </span>
                </div>

                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 16,
                    backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                    border: `1px solid ${ROSE_BORDER}`,
                    fontSize: 15.5,
                    fontWeight: 700,
                    lineHeight: 1.42,
                    color: LAUNCH_PALETTE.PRIMARY,
                    opacity: quoteReveal,
                    transform: `translate3d(0px, ${((1 - quoteReveal) * 8).toFixed(2)}px, 0px)`,
                  }}
                >
                  “Harap dapat tambah meja belajar &amp; plug point di Dataran Siswa — senang nak siapkan tugasan berkumpulan!”
                </div>

                {/* Tactile Lucide Reaction Cluster */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {REACTION_SPECS.map((rx, idx) => {
                      const rxStart = reactionBase + idx * reactionStagger;
                      const rxSpring =
                        frame >= rxStart
                          ? spring({
                              frame: frame - rxStart,
                              fps: safeFps,
                              config: { damping: 14, stiffness: 250, mass: 0.75 },
                            })
                          : 0;
                      const countVal = Math.round(rx.target * rxSpring);

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
                            transform: `scale(${(0.88 + 0.12 * rxSpring).toFixed(4)})`,
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
                      backgroundColor: convertPillLit ? ROSE_INK : LAUNCH_PALETTE.SURFACE_MUTED,
                      color: convertPillLit ? '#FFFFFF' : LAUNCH_PALETTE.MUTED_OLIVE,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>Jadi Undian Rasmi</span>
                    <ArrowRight size={12} strokeWidth={2.5} />
                  </span>
                </div>
              </div>

              {/* 2 Aligned Upright Mini-Confession Cards */}
              <div
                style={{
                  borderRadius: 20,
                  padding: '14px 18px',
                  backgroundColor: INDIGO_SOFT,
                  border: `1.5px solid ${INDIGO_BORDER}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PersonaMonogram
                      species="owl"
                      size={36}
                      accentColor={INDIGO}
                      softBgColor="#FFFFFF"
                      borderColor={INDIGO_BORDER}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Burung Hantu Semambu (Anon #118)
                      </div>
                      <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 10, fontWeight: 700, color: INDIGO_INK }}>
                        #AKADEMIK • Nota Kuliah
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: 999,
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${INDIGO_BORDER}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10,
                      fontWeight: 800,
                      color: INDIGO_INK,
                    }}
                  >
                    8m lalu
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: LAUNCH_PALETTE.INK_SOFT }}>
                  “Bilik bacaan blok kejuruteraan sangat selesa lepas waktu petang, plug point pun cukup.”
                </p>
              </div>

              <div
                style={{
                  borderRadius: 20,
                  padding: '14px 18px',
                  backgroundColor: LAUNCH_MODULE_THEMES.polymart.soft,
                  border: `1.5px solid ${LAUNCH_MODULE_THEMES.polymart.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PersonaMonogram
                      species="cat"
                      size={36}
                      accentColor={AMBER}
                      softBgColor="#FFFFFF"
                      borderColor={LAUNCH_MODULE_THEMES.polymart.border}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Kucing Kamsis (Anon #274)
                      </div>
                      <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 10, fontWeight: 700, color: AMBER_INK }}>
                        #KAMSIS • Sokongan Siswa
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: 999,
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${LAUNCH_MODULE_THEMES.polymart.border}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10,
                      fontWeight: 800,
                      color: AMBER_INK,
                    }}
                  >
                    19m lalu
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: LAUNCH_PALETTE.INK_SOFT }}>
                  “Terima kasih JPP bantu sampaikan isu mesin air kamsis, terus dibaiki dalam sehari!”
                </p>
              </div>
            </Interactive.Div>

            {/* Swiss Architectural Connector 1: Confession -> Live Poll */}
            <div
              style={{
                position: 'absolute',
                left: 556,
                top: 204,
                width: 56,
                height: 48,
                pointerEvents: 'none',
              }}
            >
              <EvolvingPath
                d="M 4 24 L 48 24 M 38 15 L 48 24 L 38 33"
                width={56}
                height={48}
                startFrame={conn1Start}
                durationFrames={conn1Duration}
                stroke={ROSE_DARK}
                trackStroke="rgba(254, 205, 211, 0.72)"
                strokeWidth={2.5}
                headDotColor={ROSE_INK}
                headDotRadius={4}
                hideDotWhenComplete
              />
            </div>

            {/* BEAT 2 — CENTER COLUMN: Upright Community Poll & Instant JPP Resolution */}
            <Interactive.Div
              name="PolySuara Upright Poll Workbench"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 612,
                top: 0,
                width: POLL_W,
                height: POLL_H,
                opacity: pollOpacity,
                transform: `scale(${pollScale.toFixed(4)})`,
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
                sheenStartFrame={f60(132)}
                sheenDuration={38}
                style={{
                  borderColor: pollWake >= 0.9 ? ROSE : ROSE_BORDER,
                  boxShadow: '0 24px 52px rgba(31, 39, 32, 0.1)',
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
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 27,
                        fontWeight: 900,
                        letterSpacing: '-0.025em',
                        lineHeight: 1.15,
                        color: LAUNCH_PALETTE.PRIMARY,
                      }}
                    >
                      {resolvedPollTitle}
                    </div>
                  </div>

                  {/* Option A */}
                  <div
                    style={{
                      position: 'relative',
                      padding: '18px 20px',
                      borderRadius: 20,
                      backgroundColor: pollVoted ? '#FFFFFF' : LAUNCH_PALETTE.BACKGROUND,
                      border: `2px solid ${pollVoted ? ROSE : ROSE_BORDER}`,
                      boxShadow: pollVoted ? '0 18px 36px rgba(244, 63, 94, 0.14)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 999,
                            backgroundColor: pollVoted ? ROSE_INK : '#FFFFFF',
                            border: `2px solid ${pollVoted ? ROSE_INK : ROSE_BORDER}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {pollVoted ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
                        </span>
                        <span style={{ fontSize: 17.5, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                          {resolvedOptionA}
                        </span>
                      </div>

                      <EditorialAnnotation
                        type="circle"
                        startFrame={f60(120)}
                        durationFrames={20}
                        color={ROSE_DARK}
                        strokeWidth={2.8}
                        padding={5}
                        iterations={1}
                        seed={55}
                      >
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 27,
                            fontWeight: 900,
                            color: ROSE_INK,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {currentPctA}%
                        </span>
                      </EditorialAnnotation>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: 12,
                        borderRadius: 999,
                        backgroundColor: ROSE_SOFT,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${currentPctA}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: ROSE_DARK,
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: LAUNCH_PALETTE.INK_SOFT,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {votesA} undi pelajar
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
                        }}
                      >
                        PILIHAN ANDA ✓
                      </span>
                    </div>
                  </div>

                  {/* Option B */}
                  <div
                    style={{
                      padding: '15px 18px',
                      borderRadius: 18,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 15.5, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                        {resolvedOptionB}
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 21,
                          fontWeight: 800,
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {currentPctB}%
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 9,
                        borderRadius: 999,
                        backgroundColor: 'rgba(217, 201, 178, 0.5)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${currentPctB}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 700,
                        color: LAUNCH_PALETTE.MUTED_OLIVE,
                      }}
                    >
                      <span>{votesB} undi pelajar</span>
                      <span>Sokongan Ruang Belajar Kamsis</span>
                    </div>
                  </div>

                  {/* Causal Resolution Banner -> Triggers Right IG Story Export */}
                  <div
                    style={{
                      padding: '13px 16px',
                      borderRadius: 16,
                      backgroundColor: frame >= resolutionBannerFrame ? EMERALD_SOFT : LAUNCH_PALETTE.BACKGROUND,
                      border: `1.5px solid ${
                        frame >= resolutionBannerFrame ? EMERALD : LAUNCH_PALETTE.TERTIARY
                      }`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      transform: `scale(${(0.97 + 0.03 * resolutionSpring).toFixed(4)})`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <CheckCircle2
                        size={17}
                        color={frame >= resolutionBannerFrame ? EMERALD_INK : LAUNCH_PALETTE.MUTED_OLIVE}
                        strokeWidth={2.5}
                      />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 900,
                          color:
                            frame >= resolutionBannerFrame
                              ? EMERALD_INK
                              : LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        USUL DITERIMA JPP: NAIK TARAF RUANG SISWA SEMESTER INI
                      </span>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 999,
                        backgroundColor: storyExportTriggered ? ROSE_INK : LAUNCH_PALETTE.PRIMARY_DARK,
                        color: '#FFFFFF',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 900,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Share2 size={12} strokeWidth={2.5} />
                      <span>Eksport IG Story</span>
                    </span>
                  </div>
                </div>
              </KineticWindow>

              <GhostCursor
                keyframes={cursorKeyframes}
                appearFrame={f60(78)}
                disappearFrame={f60(162)}
                color={LAUNCH_PALETTE.PRIMARY}
                rippleColor={ROSE}
              />
            </Interactive.Div>

            {/* Swiss Architectural Connector 2: Poll Export -> IG Story Phone */}
            <div
              style={{
                position: 'absolute',
                left: 1264,
                top: 344,
                width: 56,
                height: 48,
                pointerEvents: 'none',
              }}
            >
              <EvolvingPath
                d="M 4 24 L 48 24 M 38 15 L 48 24 L 38 33"
                width={56}
                height={48}
                startFrame={conn2Start}
                durationFrames={conn2Duration}
                stroke={ROSE_DARK}
                trackStroke="rgba(254, 205, 211, 0.72)"
                strokeWidth={2.5}
                headDotColor={ROSE_INK}
                headDotRadius={4}
                hideDotWhenComplete
              />
            </div>

            {/* BEAT 3 — RIGHT COLUMN: Upright Vertical Smartphone IGStoryExportCard (0 deg) */}
            <Interactive.Div
              name="IGStory Upright Smartphone Frame"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 1320,
                top: 0,
                width: 456,
                height: 706,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: phoneOpacity,
                transform: `translate3d(0px, ${phoneRiseY.toFixed(2)}px, 0px) scale(${phoneScale.toFixed(4)})`,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 424,
                  height: 706,
                  borderRadius: 40,
                  padding: '18px 20px 22px',
                  backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                  border: `2.5px solid ${ROSE}`,
                  boxShadow: '0 26px 56px rgba(31, 39, 32, 0.24)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                {/* Sweeping Diagonal Foil Glint inside Phone */}
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

                {/* Top Smartphone Notch + Story Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 124,
                      height: 24,
                      borderRadius: 999,
                      backgroundColor: '#111612',
                      border: '1px solid rgba(254, 205, 211, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
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
                        fontSize: 9.5,
                        fontWeight: 800,
                        color: ROSE_BORDER,
                        letterSpacing: '0.12em',
                      }}
                    >
                      IG STORY
                    </span>
                  </div>

                  <div style={{ width: '100%', display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: ROSE }} />
                    <div style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: 'rgba(254, 205, 211, 0.32)' }} />
                    <div style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: 'rgba(254, 205, 211, 0.32)' }} />
                  </div>
                </div>

                {/* Brand Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 18,
                    backgroundColor: 'rgba(255, 241, 242, 0.08)',
                    border: '1px solid rgba(254, 205, 211, 0.24)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PersonaMonogram
                      species="fox"
                      size={40}
                      accentColor={ROSE}
                      softBgColor={ROSE_SOFT}
                      borderColor={ROSE_BORDER}
                    />
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#FFFFFF' }}>
                        Poly<span style={{ color: ROSE }}>Suara</span>
                      </div>
                      <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 10, fontWeight: 800, color: ROSE_BORDER }}>
                        RUBAH SEMAMBU • #409
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(244, 63, 94, 0.25)',
                      border: `1px solid ${ROSE}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10,
                      fontWeight: 800,
                      color: ROSE_BORDER,
                    }}
                  >
                    1 KLIK
                  </span>
                </div>

                {/* Featured Quote Card */}
                <div
                  style={{
                    padding: '18px 18px',
                    borderRadius: 20,
                    backgroundColor: '#FFFFFF',
                    border: `1.5px solid ${ROSE_BORDER}`,
                    boxShadow: '0 14px 28px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 10.5, fontWeight: 800, color: ROSE_INK, letterSpacing: '0.1em' }}>
                    LUAHAN PILIHAN MINGGU INI • {clampedA}% SOKONGAN
                  </div>
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 16,
                      fontWeight: 800,
                      lineHeight: 1.4,
                      color: LAUNCH_PALETTE.PRIMARY,
                    }}
                  >
                    “Harap dapat tambah meja belajar &amp; plug point di Dataran Siswa!”
                  </p>
                </div>

                {/* Official Action Card */}
                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: 20,
                    backgroundColor: 'rgba(244, 63, 94, 0.16)',
                    border: `1.5px solid ${ROSE}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: ROSE_BORDER,
                    }}
                  >
                    <CheckCircle2 size={14} color={ROSE} strokeWidth={2.5} />
                    <span>TINDAKAN PANTAS JPP ✓</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.4 }}>
                    “Cadangan dimasukkan ke senarai naik taraf ruang siswa semester ini.”
                  </span>
                </div>

                {/* Bottom Share CTA */}
                <div
                  style={{
                    padding: '13px 16px',
                    borderRadius: 999,
                    backgroundColor: ROSE_INK,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                  }}
                >
                  <Share2 size={14} strokeWidth={2.5} />
                  <span>KONGSI KE IG STORY • 1 KLIK ✓</span>
                </div>
              </div>
            </Interactive.Div>
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
