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
  CheckCircle2,
  Flame,
  Heart,
  Lock,
  Megaphone,
  Share2,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  UserCheck,
  Users,
  Vote,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import {
  GeometricSparkBurst,
  GhostCursor,
  type GhostCursorKeyframe,
} from '../motion/MotionActors';
import {
  MODULE_CONTENT_ENTER_OFFSET,
  Module3DIntroBumper,
} from '../motion/Module3DIntroBumper';
import { WHIP_S_CURVE } from '../motion/transitions';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE, LUXURY_SPRING } from '../tokens';
import {
  KineticWindow,
  LiveTypewriterText,
  PersonaMonogram,
  SpatialFloorGrid,
} from '../ui/KineticCard';

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

const AMBER = LAUNCH_MODULE_THEMES.polymart.primary; // #F59E0B
const AMBER_INK = '#B45309';
const AMBER_SOFT = LAUNCH_MODULE_THEMES.polymart.soft; // #FFFBEB
const AMBER_BORDER = LAUNCH_MODULE_THEMES.polymart.border; // #FDE68A

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

const SCRAMBLE_GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#@$%&*';

/**
 * Deterministic character-roll scramble transitioning real student identity
 * cleanly into their anonymous persona alias using modulo indexing.
 */
export const scrambleIdentityText = (
  realText: string,
  anonText: string,
  progress: number,
): string => {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  if (clamped <= 0.01) return realText;
  if (clamped >= 0.99) return anonText;

  const targetLen = Math.round(realText.length + (anonText.length - realText.length) * clamped);
  const lockedCount = Math.floor(clamped * anonText.length);
  const step = Math.floor(clamped * 32);

  let out = '';
  for (let i = 0; i < targetLen; i++) {
    if (i < lockedCount) {
      out += anonText[i] ?? ' ';
    } else if (i < anonText.length && anonText[i] === ' ') {
      out += ' ';
    } else {
      const glyphIdx = (i * 19 + step * 7) % SCRAMBLE_GLYPHS.length;
      out += SCRAMBLE_GLYPHS[glyphIdx];
    }
  }
  return out;
};

const REAL_AUTHOR_NAME = 'Aiman Hakim Bin Azman';
const ANON_AUTHOR_NAME = 'Rubah Semambu (Anon #409)';
const REAL_MATRIC_TAG = '02DTK24F1012 (JKE) • IDENTITI SEBENAR';
const ANON_STATUS_TAG = '100% TANPA NAMA • IDENTITI SEBENAR DIPADAM';

const CONFESSION_DRAFT_TEXT =
  'Boleh tambah meja belajar & plug point dekat Dataran Siswa tak? Ramai student nak buat assignment lepas kelas...';

const REACTIONS = [
  { id: 'flame', label: 'Trending', count: 128, icon: 'flame' as const, color: ROSE_INK, bg: ROSE_SOFT, border: ROSE_BORDER },
  { id: 'thumbs', label: 'Sokong', count: 84, icon: 'thumbs' as const, color: INDIGO_INK, bg: INDIGO_SOFT, border: INDIGO_BORDER },
  { id: 'heart', label: 'Prihatin', count: 62, icon: 'heart' as const, color: EMERALD_INK, bg: EMERALD_SOFT, border: EMERALD_BORDER },
] as const;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const O = MODULE_CONTENT_ENTER_OFFSET; // 132f bumper handoff

// Cursor clicks "Aktifkan Mod Tanpa Nama & Hantar" at O+76 (local 208f) -> fades out cleanly before f_2620 (local 226f)!
const SHOT1_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: O + 54, x: 960, y: 420 },
  { frame: O + 76, x: 1245, y: 562, click: true, label: 'AKTIFKAN MOD TANPA NAMA' },
  { frame: O + 80, x: 1245, y: 562 },
];

// Shot 2 Closed Poll cursor clicks Option A -> fades cleanly before f_3000 (local 606f)
const SHOT2_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: O + 306, x: 1240, y: 430 },
  { frame: O + 332, x: 1180, y: 368, click: true, label: 'UNDI RAHSIA A' },
  { frame: O + 348, x: 1180, y: 368 },
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

  // Seamless zero-flash bumper handoff (132..168f)
  const contentRevealT = interpolate(frame, [O, O + 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Header timing
  const wordStagger = Math.max(2, Math.round(0.05 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.32 * safeFps));

  // Real-Name -> Anonymous Cryptographic Scramble Window (local 210..260f -> f=2620/local 226f is mid-scramble!)
  const scrambleStart = O + 78; // 210f
  const scrambleEnd = O + 128; // 260f
  const scrambleT = interpolate(frame, [scrambleStart, scrambleEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const isScrambling = scrambleT > 0.01 && scrambleT < 0.99;
  const isAnonymousLocked = scrambleT >= 0.99;

  const displayAuthor = scrambleIdentityText(REAL_AUTHOR_NAME, ANON_AUTHOR_NAME, scrambleT);
  const displayMetaTag = isAnonymousLocked
    ? ANON_STATUS_TAG
    : isScrambling
      ? 'ENKRIPSI IDENTITI SEDANG BERJALAN...'
      : REAL_MATRIC_TAG;

  // Avatar 3D Y-axis coin-flip (`AH` student badge <-> `PersonaMonogram fox`)
  const avatarFlipDeg = interpolate(scrambleT, [0, 1], [0, 180]);
  const shieldSweepPct = interpolate(scrambleT, [0, 1], [-18, 118]);

  // Locked callout & reaction pop right after scramble locks (O+132 .. O+182 = 264..314f, sharp at f=2750 / local 356f!)
  const trustCalloutSpring = isAnonymousLocked
    ? spring({
        frame: frame - scrambleEnd,
        fps: safeFps,
        config: LUXURY_SPRING,
      })
    : 0;
  const reactionFillProgress = interpolate(frame, [scrambleEnd, scrambleEnd + 54], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // SHOT 1 -> SHOT 2 Dolly (local 392..444f = O+260 .. O+312)
  const toShot2T = interpolate(frame, [O + 260, O + 312], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  // SHOT 2 -> SHOT 3 Split for IG Story (local 510..566f = O+378 .. O+434 -> settled BEFORE f_3000 / local 606f!)
  const toShot3T = interpolate(frame, [O + 378, O + 434], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });

  // Shot 1 Confession Stage dollies left-back in Shot 2, fades out in Shot 3
  const stackGroupX = interpolate(toShot2T, [0, 1], [0, -490]);
  const stackGroupY = interpolate(toShot2T, [0, 1], [0, -14]);
  const stackGroupZ = interpolate(toShot2T, [0, 1], [0, -175]);
  const stackGroupScale = interpolate(toShot2T, [0, 1], [1, 0.68]);
  const stackGroupOpacity =
    interpolate(toShot2T, [0, 1], [1, 0.32]) *
    interpolate(toShot3T, [0, 0.45], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  // Shot 2 Closed Poll Monolith
  const pollEnterProgress = interpolate(frame, [O + 264, O + 314], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const pollCenterX =
    interpolate(pollEnterProgress, [0, 1], [520, 0]) + interpolate(toShot3T, [0, 1], [0, -345]);
  const pollCenterY = interpolate(toShot3T, [0, 1], [0, 8]);
  const pollCenterZ =
    interpolate(pollEnterProgress, [0, 1], [-120, 42]) + interpolate(toShot3T, [0, 1], [0, -145]);
  const pollScale =
    interpolate(pollEnterProgress, [0, 1], [0.84, 1]) * interpolate(toShot3T, [0, 1], [1, 0.84]);
  const pollRotY = interpolate(toShot3T, [0, 1], [0, 4.5]);
  const pollOpacity = pollEnterProgress;

  // Poll percentages surge right after cursor click at O+332
  const voteGrowthT = interpolate(frame, [O + 332, O + 374], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const livePctA = Math.round(interpolate(voteGrowthT, [0, 1], [38, safePctA]));
  const livePctB = 100 - livePctA;
  const liveTotalVotes = Math.round(
    interpolate(voteGrowthT, [0, 1], [Math.round(safeTotalVotes * 0.56), safeTotalVotes]),
  );
  const isUsulAccepted = frame >= O + 366;
  const stampSpring = isUsulAccepted
    ? spring({
        frame: frame - (O + 366),
        fps: safeFps,
        config: LUXURY_SPRING,
      })
    : 0;

  // Shot 3: 3D Smartphone IG Story Bezel rises (O+384..O+438 -> settled before f=3000 / local 606f!)
  const phoneEnterProgress = interpolate(frame, [O + 384, O + 438], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const phoneRiseY = (1 - phoneEnterProgress) * 140;
  const phoneRotY = interpolate(phoneEnterProgress, [0, 1], [-18, -8]);
  const phoneSheenLeft = interpolate(frame, [O + 434, O + 492], [-45, 135], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const phoneSheenOpacity = interpolate(frame, [O + 434, O + 448, O + 478, O + 492], [0, 0.65, 0.65, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const liveDotScale = 0.86 + Math.sin(timeSec * 4.8) * 0.16;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.polysuara.tint} />

      <Module3DIntroBumper
        moduleIndex="MODUL 05"
        moduleCategory="KOMUNITI & UNDIAN"
        moduleName="PolySuara"
        tagline="Luah Idea & Undi Kemudahan Kampus"
        morphMode="flip-into-chat-composer"
        accentColor={LAUNCH_MODULE_THEMES.polysuara.primary}
        darkColor={LAUNCH_MODULE_THEMES.polysuara.dark}
        softColor={LAUNCH_MODULE_THEMES.polysuara.soft}
        borderColor={LAUNCH_MODULE_THEMES.polysuara.border}
        icon={<Megaphone size={96} color="#FFFFFF" strokeWidth={2.1} />}
        features={[
          {
            icon: (
              <PersonaMonogram
                species="fox"
                size={16}
                accentColor={ROSE}
                softBgColor={ROSE_SOFT}
                borderColor={ROSE_BORDER}
              />
            ),
            label: 'Persona Tanpa Nama',
          },
          { icon: <Vote size={15} strokeWidth={2.4} />, label: 'Undian Tertutup' },
          { icon: <Share2 size={15} strokeWidth={2.4} />, label: 'Kongsi IG Story' },
        ]}
      />

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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: contentRevealT,
            transform: `translate3d(0px, ${((1 - contentRevealT) * 22).toFixed(2)}px, 0px) scale(${interpolate(contentRevealT, [0, 1], [0.96, 1]).toFixed(4)})`,
          }}
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
              <KineticReveal startFrame={O + 4} durationFrames={18}>
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
                startFrame={O + 8}
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

            <KineticReveal startFrame={O + 18} durationFrames={22}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 18px',
                  borderRadius: 16,
                  backgroundColor: isUsulAccepted ? EMERALD_SOFT : LAUNCH_PALETTE.CARD_BG,
                  border: `1.5px solid ${isUsulAccepted ? EMERALD_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                  boxShadow: '0 12px 26px rgba(6, 23, 20, 0.08)',
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
                      : isAnonymousLocked
                        ? 'IDENTITI ASAL DIPADAM 100% ✓'
                        : 'ENKRIPSI IDENTITI AKTIF'}
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
            {/* SHOT 1 HERO (and Shot 2 Recessed Context): Live Typing -> Name-Scramble Anonymizer */}
            {stackGroupOpacity > 0.01 ? (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 1020,
                  height: 552,
                  transformStyle: 'preserve-3d',
                  opacity: stackGroupOpacity,
                  transform: `translate(-50%, -50%) translate3d(${stackGroupX.toFixed(1)}px, ${stackGroupY.toFixed(1)}px, ${stackGroupZ.toFixed(1)}px) scale(${stackGroupScale.toFixed(4)})`,
                }}
              >
                {/* Recessed Context Feed Cards Behind Center Composer */}
                {[
                  {
                    id: 'owl',
                    alias: 'Burung Hantu Semambu #405',
                    species: 'owl' as const,
                    dx: -175,
                    dy: -38,
                    dz: -86,
                    color: AMBER,
                    bg: AMBER_SOFT,
                    border: AMBER_BORDER,
                  },
                  {
                    id: 'cat',
                    alias: 'Kucing Kamsis #389',
                    species: 'cat' as const,
                    dx: 178,
                    dy: 40,
                    dz: -145,
                    color: INDIGO,
                    bg: INDIGO_SOFT,
                    border: INDIGO_BORDER,
                  },
                ].map((bgCard) => (
                  <div
                    key={bgCard.id}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 24,
                      backgroundColor: '#FFFFFF',
                      border: `1.5px solid ${bgCard.border}`,
                      padding: '20px 26px',
                      opacity: 0.65,
                      transform: `translate3d(${bgCard.dx}px, ${bgCard.dy}px, ${bgCard.dz}px) scale(0.92)`,
                      boxShadow: '0 20px 42px rgba(6, 23, 20, 0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <PersonaMonogram
                        species={bgCard.species}
                        size={42}
                        accentColor={bgCard.color}
                        softBgColor={bgCard.bg}
                        borderColor={bgCard.border}
                      />
                      <span style={{ fontSize: 16, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        {bgCard.alias}
                      </span>
                    </div>
                  </div>
                ))}

                {/* FOREGROUND HERO CARD: Live Composer + Cryptographic Identity Scramble */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: 'translate3d(0px, 0px, 68px) rotateX(3deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <KineticWindow
                    surface="light"
                    routeLabel="/portal/polysuara • komposer rahsia"
                    statusPill={
                      isAnonymousLocked
                        ? 'TANPA NAMA ✓'
                        : isScrambling
                          ? 'MENYULITKAN...'
                          : 'DRAF PELAJAR'
                    }
                    statusAccent={isAnonymousLocked}
                    accentColor={isAnonymousLocked ? ROSE : isScrambling ? INDIGO : AMBER}
                    accentSoftBg={isAnonymousLocked ? ROSE_SOFT : AMBER_SOFT}
                    accentBorderColor={isAnonymousLocked ? ROSE_BORDER : AMBER_BORDER}
                    width={1020}
                    height={540}
                    sheenStartFrame={scrambleEnd + 6}
                    sheenDuration={36}
                    style={{
                      borderBottom: `7px solid ${isAnonymousLocked ? ROSE : AMBER}`,
                      boxShadow: isAnonymousLocked
                        ? '0 36px 78px rgba(225, 29, 72, 0.2)'
                        : '0 28px 60px rgba(6, 23, 20, 0.15)',
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
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {/* AUTHOR IDENTITY BAR WITH LIVE COIN-FLIP AVATAR & PRIVACY SHIELD SCRAMBLE */}
                      <div
                        style={{
                          position: 'relative',
                          padding: '14px 18px',
                          borderRadius: 20,
                          backgroundColor: isAnonymousLocked ? ROSE_SOFT : isScrambling ? '#EEF2FF' : AMBER_SOFT,
                          border: `2px solid ${isAnonymousLocked ? ROSE : isScrambling ? INDIGO : AMBER_BORDER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Sweeping Privacy Shield Scanner Bar across name strip during scramble */}
                        {isScrambling ? (
                          <div
                            aria-hidden
                            style={{
                              position: 'absolute',
                              top: 0,
                              bottom: 0,
                              left: `${shieldSweepPct.toFixed(1)}%`,
                              width: 120,
                              background:
                                'linear-gradient(90deg, rgba(244, 63, 94, 0) 0%, rgba(244, 63, 94, 0.32) 50%, rgba(244, 63, 94, 0) 100%)',
                              borderRight: `3px solid ${ROSE}`,
                              pointerEvents: 'none',
                            }}
                          />
                        ) : null}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 2 }}>
                          {/* 3D Y-Axis Coin-Flip Avatar (Student AH <-> PersonaMonogram Fox) */}
                          <div
                            style={{
                              position: 'relative',
                              width: 58,
                              height: 58,
                              perspective: '800px',
                              transformStyle: 'preserve-3d',
                              flexShrink: 0,
                            }}
                          >
                            {/* Front: Real Student AH Monogram */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: 999,
                                backgroundColor: '#FFFFFF',
                                border: `2px solid ${AMBER}`,
                                color: AMBER_INK,
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 18,
                                fontWeight: 900,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backfaceVisibility: 'hidden',
                                transform: `rotateY(${avatarFlipDeg.toFixed(1)}deg)`,
                              }}
                            >
                              AH
                            </div>
                            {/* Back: Anonymous Fox Persona */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                backfaceVisibility: 'hidden',
                                transform: `rotateY(${(avatarFlipDeg - 180).toFixed(1)}deg)`,
                              }}
                            >
                              <PersonaMonogram
                                species="fox"
                                size={58}
                                accentColor={ROSE}
                                softBgColor={ROSE_SOFT}
                                borderColor={ROSE_BORDER}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span
                              style={{
                                fontFamily: isScrambling ? LAUNCH_FONTS.MONO : LAUNCH_FONTS.DISPLAY,
                                fontSize: 22,
                                fontWeight: 900,
                                color: isAnonymousLocked ? ROSE_INK : LAUNCH_PALETTE.PRIMARY,
                                letterSpacing: isScrambling ? '0.04em' : '-0.02em',
                              }}
                            >
                              {displayAuthor}
                            </span>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 11.5,
                                fontWeight: 900,
                                letterSpacing: '0.08em',
                                color: isAnonymousLocked ? ROSE_INK : isScrambling ? INDIGO_INK : AMBER_INK,
                              }}
                            >
                              {displayMetaTag}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '8px 14px',
                            borderRadius: 999,
                            backgroundColor: '#FFFFFF',
                            border: `1.5px solid ${isAnonymousLocked ? ROSE_BORDER : AMBER_BORDER}`,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11.5,
                            fontWeight: 900,
                            color: isAnonymousLocked ? ROSE_INK : AMBER_INK,
                          }}
                        >
                          {isAnonymousLocked ? (
                            <>
                              <Lock size={14} strokeWidth={2.6} />
                              <span>100% TANPA NAMA</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={14} strokeWidth={2.5} />
                              <span>IDENTITI SEBENAR</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Typed Confession Draft Box */}
                      <div
                        style={{
                          padding: '20px 24px',
                          borderRadius: 20,
                          backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                          border: `1.5px solid ${isAnonymousLocked ? ROSE_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                        }}
                      >
                        <LiveTypewriterText
                          text={`"${CONFESSION_DRAFT_TEXT}"`}
                          startFrame={O + 4}
                          charsPerSecond={105}
                          cursorColor={ROSE}
                          style={{
                            fontSize: 25,
                            fontWeight: 800,
                            lineHeight: 1.34,
                            color: LAUNCH_PALETTE.PRIMARY,
                          }}
                        />
                      </div>

                      {/* Floating Trust Callout / Action Footer */}
                      {isAnonymousLocked ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 14,
                            transformStyle: 'preserve-3d',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {REACTIONS.map((rx, rIdx) => {
                              const popSpring = spring({
                                frame: Math.max(0, frame - (scrambleEnd + rIdx * 6)),
                                fps: safeFps,
                                config: LUXURY_SPRING,
                              });
                              const rxCount = Math.round(rx.count * reactionFillProgress);
                              return (
                                <div
                                  key={rx.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 7,
                                    padding: '9px 14px',
                                    borderRadius: 999,
                                    backgroundColor: rx.bg,
                                    border: `1.5px solid ${rx.border}`,
                                    color: rx.color,
                                    transform: `translateZ(${(16 + popSpring * 18).toFixed(1)}px) scale(${(0.86 + 0.14 * popSpring).toFixed(4)})`,
                                  }}
                                >
                                  {rx.icon === 'flame' ? (
                                    <Flame size={15} color={rx.color} strokeWidth={2.5} />
                                  ) : rx.icon === 'thumbs' ? (
                                    <ThumbsUp size={15} color={rx.color} strokeWidth={2.5} />
                                  ) : (
                                    <Heart size={15} color={rx.color} strokeWidth={2.5} />
                                  )}
                                  <span
                                    style={{
                                      fontFamily: LAUNCH_FONTS.MONO,
                                      fontSize: 13.5,
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

                          <div
                            style={{
                              padding: '11px 18px',
                              borderRadius: 14,
                              backgroundColor: EMERALD_INK,
                              color: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 12,
                              fontWeight: 900,
                              letterSpacing: '0.06em',
                              boxShadow: '0 14px 28px rgba(4, 120, 87, 0.28)',
                              transform: `translateZ(36px) scale(${(0.92 + 0.08 * trustCalloutSpring).toFixed(4)})`,
                            }}
                          >
                            <ShieldCheck size={16} strokeWidth={2.6} />
                            <span>✓ TIADA SIAPA TAHU NAMA ANDA — SELAMAT</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
                            Klik untuk hapuskan nama &amp; nombor matrik sebelum dipaparkan:
                          </span>
                          <div
                            style={{
                              padding: '12px 20px',
                              borderRadius: 14,
                              backgroundColor: isScrambling ? INDIGO : ROSE_DARK,
                              color: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 12.5,
                              fontWeight: 900,
                              letterSpacing: '0.06em',
                              boxShadow: '0 14px 28px rgba(225, 29, 72, 0.28)',
                            }}
                          >
                            <Lock size={15} strokeWidth={2.6} />
                            <span>Aktifkan Mod Tanpa Nama &amp; Hantar</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </KineticWindow>
                </div>
              </div>
            ) : null}

            {/* SHOT 2 HERO (and Shot 3 Left Context): Closed Poll Monolith */}
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
                  sheenStartFrame={O + 368}
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
                            UNDIAN TERTUTUP • 1 PELAJAR 1 UNDI • UNDI ANDA RAHSIA
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

                    {/* Option A & Option B */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                            <span style={{ fontSize: 20, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                              {resolvedOptionA}
                            </span>
                          </div>

                          <EditorialAnnotation
                            type="highlight"
                            startFrame={O + 368}
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
                            <span style={{ fontSize: 18, fontWeight: 800, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
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

                    {/* Stamp Footer */}
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

            {/* SHOT 3 HERO: 3D Smartphone IG Story Pop-Out */}
            {phoneEnterProgress > 0.01 ? (
              <div
                style={{
                  position: 'absolute',
                  right: 96,
                  top: 4,
                  width: 454,
                  height: 672,
                  borderRadius: 46,
                  backgroundColor: '#181820',
                  border: '3px solid #353844',
                  boxShadow: '0 40px 84px rgba(6, 23, 20, 0.34)',
                  padding: 16,
                  opacity: phoneEnterProgress,
                  transformStyle: 'preserve-3d',
                  transform: `translate3d(0px, ${phoneRiseY.toFixed(1)}px, 165px) rotateY(${phoneRotY.toFixed(2)}deg) rotateX(4deg)`,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
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
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ flex: 1, height: 3.5, borderRadius: 999, backgroundColor: ROSE }} />
                    <span style={{ flex: 1, height: 3.5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)' }} />
                    <span style={{ flex: 1, height: 3.5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)' }} />
                  </div>

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

            {/* Spark bursts on Anonymous Lock, Shot 2 Usul Accepted & Shot 3 IG Story Ready */}
            <GeometricSparkBurst
              triggerFrame={scrambleEnd}
              x={960}
              y={260}
              durationFrames={30}
              radius={92}
              count={10}
              seed="polysuara-anon-lock"
              colors={[ROSE, INDIGO, EMERALD]}
            />
            <GeometricSparkBurst
              triggerFrame={O + 368}
              x={960}
              y={560}
              durationFrames={34}
              radius={108}
              count={12}
              seed="polysuara-poll-win"
              colors={[ROSE, EMERALD, '#FFFFFF']}
            />
            <GeometricSparkBurst
              triggerFrame={O + 440}
              x={1575}
              y={380}
              durationFrames={30}
              radius={94}
              count={10}
              seed="polysuara-ig-story"
              colors={[ROSE, INDIGO, '#FFFFFF']}
            />

            <GhostCursor
              keyframes={SHOT1_CURSOR_KEYFRAMES}
              appearFrame={O + 54}
              disappearFrame={O + 80}
              color={LAUNCH_PALETTE.PRIMARY_DARK}
              rippleColor={ROSE}
            />
            <GhostCursor
              keyframes={SHOT2_CURSOR_KEYFRAMES}
              appearFrame={O + 306}
              disappearFrame={O + 348}
              color={LAUNCH_PALETTE.PRIMARY_DARK}
              rippleColor={ROSE}
            />
          </div>
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
