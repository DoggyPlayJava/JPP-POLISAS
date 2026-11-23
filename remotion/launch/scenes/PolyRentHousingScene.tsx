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
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  Home,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
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
import { KineticWindow, SpatialFloorGrid } from '../ui/KineticCard';

const CYAN = LAUNCH_MODULE_THEMES.polyrent.primary; // #06B6D4
const CYAN_DARK = LAUNCH_MODULE_THEMES.polyrent.dark; // #0891B2
const CYAN_INK = '#0E7490'; // WCAG AA+ Cyan-700
const CYAN_SOFT = LAUNCH_MODULE_THEMES.polyrent.soft; // #ECFEFF
const CYAN_BORDER = LAUNCH_MODULE_THEMES.polyrent.border; // #A5F3FC

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0

const INDIGO = LAUNCH_MODULE_THEMES.takwim.primary; // #6366F1
const OBSIDIAN = '#142329';

export type PolyRentHousingProps = {
  readonly houseRentRm: number;
  readonly walkMinutes: number;
  readonly headline: string;
};

const POLYRENT_HEADLINE_DEFAULT = 'Cari Bilik Sewa Sekitar Semambu? Kongsi Jimat Tanpa Scam.';

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const ROOMMATES = [
  { name: 'Aiman', dept: 'JTMK', color: CYAN, dark: CYAN_DARK },
  { name: 'Danial', dept: 'JP', color: EMERALD, dark: EMERALD_INK },
  { name: 'Haziq', dept: 'JKA', color: CYAN, dark: CYAN_DARK },
  { name: 'Faris', dept: 'JKM', color: EMERALD, dark: EMERALD_INK },
] as const;

type MapListingPin = {
  readonly id: string;
  readonly name: string;
  readonly tag: string;
  readonly pricePerPerson: number;
  readonly walkLabel: string;
  readonly x: number;
  readonly y: number;
  readonly isHero?: boolean;
  readonly delayFrames: number;
};

const MAP_LISTINGS: readonly MapListingPin[] = [
  {
    id: 'taman-pertama',
    name: 'Taman Pertama Semambu',
    tag: 'DISAHKAN JPP',
    pricePerPerson: 170,
    walkLabel: '300m • 3 Min',
    x: 616,
    y: 266,
    isHero: true,
    delayFrames: 42,
  },
  {
    id: 'semambu-baru',
    name: 'Taman Semambu Baru',
    tag: '4 BILIK',
    pricePerPerson: 190,
    walkLabel: '520m • 6 Min',
    x: 356,
    y: 128,
    delayFrames: 54,
  },
  {
    id: 'lorong-12',
    name: 'Lorong Semambu 12',
    tag: 'DEKAT KAMSIS',
    pricePerPerson: 160,
    walkLabel: '650m • 7 Min',
    x: 868,
    y: 196,
    delayFrames: 64,
  },
];

// Upright Left Card Dimensions (632x740 at screen position left: 88, top: 214)
// GhostCursor local coords live inside this crisp upright 0-deg focal card.
const LEFT_CARD_W = 632;
const LEFT_CARD_H = 740;

const RENT_SPLIT_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: 214, x: 132, y: 400, label: 'SEMAK SEWA' },
  { frame: 244, x: 316, y: 400, click: true, label: '2 PELAJAR' },
  { frame: 276, x: 498, y: 400, click: true, label: '4 PELAJAR • JIMAT' },
  { frame: 292, x: 498, y: 400 },
];

const EXTRUDED_ESTATE_BLOCKS = [
  { id: 'block-polisas', x: 76, y: 240, w: 224, h: 152, roof: '#059669', wall: '#064E3B', label: 'PINTU UTAMA POLISAS' },
  { id: 'block-pertama', x: 510, y: 190, w: 212, h: 146, roof: CYAN, wall: CYAN_INK, label: 'TAMAN PERTAMA' },
  { id: 'block-baru', x: 266, y: 58, w: 184, h: 118, roof: '#475569', wall: '#1E293B', label: 'SEMAMBU BARU' },
  { id: 'block-lorong', x: 768, y: 112, w: 196, h: 130, roof: '#556453', wall: '#2E3A2F', label: 'LORONG 12' },
] as const;

const ROOM_AMENITIES = [
  { id: 'wifi', label: 'WiFi Unifi 300Mbps', sub: 'Stabil Kelas Online', tone: 'cyan' as const },
  { id: 'washer', label: 'Mesin Basuh & Dapur', sub: 'Lengkap Sedia Guna', tone: 'emerald' as const },
  { id: 'beds', label: '4 Katil + Meja Study', sub: 'Privasi Terjamin', tone: 'indigo' as const },
  { id: 'safe', label: 'Verified Tuan Rumah', sub: 'Sifar Yuran Tersembunyi', tone: 'emerald' as const },
] as const;

const PolyRentHousingInner: React.FC<PolyRentHousingProps> = ({
  houseRentRm,
  walkMinutes,
  headline,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeHouseRent = Math.max(200, Math.round(Number.isFinite(houseRentRm) ? houseRentRm : 680));
  const safeWalkMins = Math.max(1, Math.round(Number.isFinite(walkMinutes) ? walkMinutes : 3));
  const safeHeadline = headline.trim() || POLYRENT_HEADLINE_DEFAULT;
  const timeSec = frame / safeFps;

  // Header timing (0.0s .. 1.0s)
  const wordStagger = Math.max(2, Math.round(0.04 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.28 * safeFps));

  // Left card entrance (0.12s)
  const leftCardSpring = spring({
    frame: Math.max(0, frame - 6),
    fps: safeFps,
    config: { damping: 18, stiffness: 210, mass: 0.92 },
  });
  const leftCardOpacity = interpolate(frame, [4, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const leftCardX = (1 - leftCardSpring) * -36;

  // Map 3D Stage entrance (0.18s)
  const mapStageSpring = spring({
    frame: Math.max(0, frame - 10),
    fps: safeFps,
    config: { damping: 18, stiffness: 190, mass: 0.96 },
  });
  const mapStageOpacity = interpolate(frame, [8, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Semambu 3D pitched map camera bearing sweeps gently from -14deg -> +12deg
  const mapBearingDeg = interpolate(frame, [0, 540], [-14, 12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });
  const mapPitchDeg = interpolate(frame, [0, 260, 540], [50, 54, 49], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Walking arc from Pintu Utama POLISAS to Taman Pertama completes by frame 86 (well before f=1400 / Local 146!)
  const routeDrawStart = 32;
  const routeDrawDuration = 48;

  // Beat 1 Room Cutaway Floating Spec Card (peaks 70..268, prominently visible at Local 146f -> f=1400)
  const cutawayEnterSpring = spring({
    frame: Math.max(0, frame - 66),
    fps: safeFps,
    config: { damping: 17, stiffness: 205, mass: 0.9 },
  });
  const cutawayBeat2Fade = interpolate(frame, [264, 304], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const cutawayOpacity = cutawayEnterSpring * cutawayBeat2Fade;
  const cutawayY = (1 - cutawayEnterSpring) * 28 + (1 - cutawayBeat2Fade) * -32;
  const cutawayZ = 48 + (1 - cutawayBeat2Fade) * -90;

  // Beat 2: Rent Split Morph (1 -> 2 -> 4 Roommates across 244f .. 316f, locked crisp by 320f — before Local 366f / f=1620!)
  const split2Progress = interpolate(frame, [242, 262], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const split4Progress = interpolate(frame, [274, 308], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });

  const activePillIndex = split4Progress >= 0.35 ? 2 : split2Progress >= 0.45 ? 1 : 0;
  const activeDivisor = 1 + split2Progress * 1 + split4Progress * 2; // smoothly transitions 1 -> 2 -> 4
  const liveRentPerPerson = Math.round(safeHouseRent / Math.max(1, activeDivisor));
  const fullFourRent = Math.round(safeHouseRent / 4);
  const monthlySavedPerStudent = Math.max(0, safeHouseRent - liveRentPerPerson);

  // Beat 2 Volumetric 3D Split Pillars on Right 3D Stage (rises 284..332 -> locked crisp at Local 366f!)
  const pillarsProgress = interpolate(frame, [282, 332], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const pillarsRiseY = (1 - pillarsProgress) * 34;

  // WhatsApp Zero-Scam confirmation lock on Left Card (292..326)
  const verifiedLockProgress = interpolate(frame, [292, 324], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  const livePulseScale = 0.86 + Math.sin(timeSec * 5.0) * 0.16;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.polyrent.tint} />

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
        entryPanXOffset={28}
        entryFrames={Math.round(0.45 * safeFps)}
        exitZoomDelta={0.015}
        exitFrames={Math.round(0.35 * safeFps)}
        clip
      >
        {/* Subtle 3D Architectural Horizon Grid grounded beneath Semambu Map */}
        <SpatialFloorGrid
          accentColor={CYAN}
          secondaryColor={EMERALD}
          gridOpacity={0.18}
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
            zIndex: 8,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1340 }}>
            <KineticReveal startFrame={4} durationFrames={18}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 14px',
                  borderRadius: 999,
                  backgroundColor: CYAN_SOFT,
                  border: `1.5px solid ${CYAN_BORDER}`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: CYAN,
                    transform: `scale(${livePulseScale.toFixed(3)})`,
                  }}
                />
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.14em',
                    color: CYAN_INK,
                  }}
                >
                  BAB 04 • POLYRENT KEDIAMAN • SEKITAR SEMAMBU
                </span>
              </div>
            </KineticReveal>

            <KineticWords
              as="h1"
              text={safeHeadline}
              startFrame={8}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              accentWords={['Semambu?', 'Jimat']}
              accentColor={CYAN_DARK}
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
                backgroundColor: activePillIndex === 2 ? EMERALD_SOFT : LAUNCH_PALETTE.CARD_BG,
                border: `1.5px solid ${activePillIndex === 2 ? EMERALD_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: '0 12px 26px rgba(31, 39, 32, 0.08)',
              }}
            >
              <ShieldCheck
                size={18}
                color={activePillIndex === 2 ? EMERALD_INK : CYAN_INK}
                strokeWidth={2.5}
              />
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: '0.07em',
                  color: activePillIndex === 2 ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY,
                  whiteSpace: 'nowrap',
                }}
              >
                {activePillIndex === 2
                  ? `KONGSI 4 ORANG • RM ${fullFourRent}/BLN`
                  : 'VERIFIED JPP • BEBAS SCAM'}
              </span>
            </div>
          </KineticReveal>
        </div>

        {/* Main Asymmetric 2-Zone Stage: Left Upright 0-deg Housing Card + Right Pitched 3D Semambu Neighborhood */}
        <div
          style={{
            position: 'absolute',
            left: 88,
            right: 88,
            top: 212,
            height: 750,
            display: 'flex',
            alignItems: 'center',
            gap: 34,
            fontFamily: LAUNCH_FONTS.DISPLAY,
            zIndex: 6,
          }}
        >
          {/* LEFT UPRIGHT FOCAL PANEL: 0-deg Crisp Student Housing & Roommate Rent-Split Card */}
          <div
            style={{
              position: 'relative',
              width: LEFT_CARD_W,
              height: LEFT_CARD_H,
              flexShrink: 0,
              opacity: leftCardOpacity,
              transform: `translate3d(${leftCardX.toFixed(2)}px, 0px, 0px)`,
            }}
          >
            <KineticWindow
              surface="light"
              routeLabel="/portal/polyrent"
              statusPill={activePillIndex === 2 ? `KONGSI 4 • RM ${fullFourRent}` : 'DISAHKAN JPP'}
              statusAccent
              accentColor={activePillIndex === 2 ? EMERALD : CYAN}
              accentSoftBg={activePillIndex === 2 ? EMERALD_SOFT : CYAN_SOFT}
              accentBorderColor={activePillIndex === 2 ? EMERALD_BORDER : CYAN_BORDER}
              width={LEFT_CARD_W}
              height={LEFT_CARD_H}
              sheenStartFrame={294}
              sheenDuration={38}
              style={{
                borderBottom: `6px solid ${activePillIndex === 2 ? EMERALD : CYAN}`,
                boxShadow: '0 28px 60px rgba(14, 116, 144, 0.14)',
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                }}
              >
                {/* Listing Title & Distance Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 14,
                    paddingBottom: 14,
                    borderBottom: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: CYAN_SOFT,
                        border: `1.5px solid ${CYAN_BORDER}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Home size={26} color={CYAN_INK} strokeWidth={2.3} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Taman Pertama Semambu
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: CYAN_INK,
                          }}
                        >
                          <MapPin size={14} color={CYAN_INK} strokeWidth={2.5} />
                          300m Ke Pintu Utama POLISAS
                        </span>
                        <span style={{ color: LAUNCH_PALETTE.TERTIARY }}>•</span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 13,
                            fontWeight: 800,
                            color: EMERALD_INK,
                          }}
                        >
                          <Clock size={13} color={EMERALD_INK} strokeWidth={2.5} />
                          {safeWalkMins} Min Jalan
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 11px',
                      borderRadius: 999,
                      backgroundColor: EMERALD_SOFT,
                      border: `1.5px solid ${EMERALD_BORDER}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                      color: EMERALD_INK,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <ShieldCheck size={13} color={EMERALD_INK} strokeWidth={2.6} />
                    VERIFIED JPP
                  </span>
                </div>

                {/* Animated Per-Student Price Display */}
                <div
                  style={{
                    padding: '18px 20px',
                    borderRadius: 20,
                    backgroundColor: activePillIndex === 2 ? EMERALD_SOFT : LAUNCH_PALETTE.BACKGROUND,
                    border: `2px solid ${activePillIndex === 2 ? EMERALD : CYAN_BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 900,
                        letterSpacing: '0.1em',
                        color: activePillIndex === 2 ? EMERALD_INK : CYAN_INK,
                      }}
                    >
                      {activePillIndex === 2
                        ? 'SELEPAS BAHAGI 4 RAKAN SERUMAH'
                        : 'KADAR SEWA KESELURUHAN RUMAH'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <EditorialAnnotation
                        type="highlight"
                        startFrame={296}
                        durationFrames={26}
                        color="rgba(16, 185, 129, 0.28)"
                        padding={{ top: 2, right: 6, bottom: 2, left: 6 }}
                      >
                        <span
                          style={{
                            fontSize: 48,
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            color: activePillIndex === 2 ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY,
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                          }}
                        >
                          RM {liveRentPerPerson}
                        </span>
                      </EditorialAnnotation>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                        }}
                      >
                        {activePillIndex === 0 ? '/ bulan rumah' : '/ bln seorang'}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 14,
                      backgroundColor: activePillIndex === 2 ? EMERALD_INK : CYAN_SOFT,
                      border: `1.5px solid ${activePillIndex === 2 ? EMERALD_INK : CYAN_BORDER}`,
                      color: activePillIndex === 2 ? '#FFFFFF' : CYAN_INK,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {activePillIndex === 0 ? 'SEWA PENUH' : 'PENJIMATAN'}
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {activePillIndex === 0
                        ? `RM ${safeHouseRent}`
                        : `Jimat RM ${monthlySavedPerStudent}`}
                    </span>
                  </div>
                </div>

                {/* Interactive Kongsi Sewa Rakan Segmented Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 900,
                        letterSpacing: '0.09em',
                        color: LAUNCH_PALETTE.PRIMARY,
                      }}
                    >
                      <Calculator size={14} color={CYAN_INK} strokeWidth={2.5} />
                      KALKULATOR KONGSI SEWA RAKAN
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: LAUNCH_PALETTE.MUTED_OLIVE,
                      }}
                    >
                      Rumah Teres 4 Bilik
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 10,
                      padding: 6,
                      borderRadius: 16,
                      backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                      border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    }}
                  >
                    {[
                      { label: '1 Pelajar', sub: `RM ${safeHouseRent}/org`, idx: 0 },
                      { label: '2 Pelajar', sub: `RM ${Math.round(safeHouseRent / 2)}/org`, idx: 1 },
                      { label: '4 Pelajar', sub: `RM ${fullFourRent}/org`, idx: 2 },
                    ].map((opt) => {
                      const isActive = opt.idx === activePillIndex;
                      const activeBg = opt.idx === 2 ? EMERALD_INK : CYAN_DARK;
                      return (
                        <div
                          key={opt.label}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 12,
                            backgroundColor: isActive ? activeBg : '#FFFFFF',
                            border: `1.5px solid ${isActive ? activeBg : LAUNCH_PALETTE.TERTIARY}`,
                            color: isActive ? '#FFFFFF' : LAUNCH_PALETTE.PRIMARY,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            boxShadow: isActive
                              ? '0 8px 18px rgba(14, 116, 144, 0.22)'
                              : 'none',
                          }}
                        >
                          <span style={{ fontSize: 15, fontWeight: 900 }}>{opt.label}</span>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11.5,
                              fontWeight: 800,
                              opacity: isActive ? 0.96 : 0.72,
                            }}
                          >
                            {opt.sub}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Spec Grid inside Left Card */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {ROOM_AMENITIES.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '11px 13px',
                        borderRadius: 14,
                        backgroundColor: '#FFFFFF',
                        border: `1.5px solid ${
                          item.tone === 'cyan' ? CYAN_BORDER : LAUNCH_PALETTE.TERTIARY
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor:
                            item.tone === 'cyan'
                              ? CYAN_SOFT
                              : item.tone === 'indigo'
                                ? LAUNCH_MODULE_THEMES.takwim.soft
                                : EMERALD_SOFT,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {item.id === 'wifi' ? (
                          <Wifi size={16} color={CYAN_INK} strokeWidth={2.4} />
                        ) : item.id === 'safe' ? (
                          <ShieldCheck size={16} color={EMERALD_INK} strokeWidth={2.4} />
                        ) : item.id === 'beds' ? (
                          <Users size={16} color={INDIGO} strokeWidth={2.4} />
                        ) : (
                          <CheckCircle2 size={16} color={EMERALD_INK} strokeWidth={2.4} />
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 900,
                            color: LAUNCH_PALETTE.PRIMARY,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.label}
                        </span>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: LAUNCH_PALETTE.INK_SOFT,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.sub}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Trust & Direct WhatsApp CTA Bar */}
                <div
                  style={{
                    padding: '13px 16px',
                    borderRadius: 16,
                    backgroundColor: activePillIndex === 2 ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY_DARK,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow:
                      verifiedLockProgress > 0.5
                        ? '0 14px 28px rgba(4, 120, 87, 0.28)'
                        : '0 10px 22px rgba(31, 39, 32, 0.16)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MessageCircle size={18} color={EMERALD_BORDER} strokeWidth={2.5} />
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 900,
                        letterSpacing: '0.07em',
                      }}
                    >
                      ✓ BEBAS SCAM • WHATSAPP TUAN RUMAH TERUS
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
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {activePillIndex === 2 ? 'JIMAT 75%' : 'EN. HAFIZ'}
                  </span>
                </div>
              </div>
            </KineticWindow>

            {/* Spark burst when 4 Pelajar split clicks */}
            <GeometricSparkBurst
              triggerFrame={278}
              x={498}
              y={400}
              durationFrames={32}
              radius={84}
              count={12}
              seed="polyrent-split-spark"
              colors={[CYAN, EMERALD, LAUNCH_PALETTE.CARD_BG]}
            />

            {/* Crisp GhostCursor confined inside Left Upright Card (exits well before Local 366f!) */}
            <GhostCursor
              keyframes={RENT_SPLIT_CURSOR_KEYFRAMES}
              appearFrame={214}
              disappearFrame={292}
              color={LAUNCH_PALETTE.PRIMARY_DARK}
              rippleColor={EMERALD}
            />
          </div>

          {/* RIGHT PURPOSEFUL 3D WORLD: Pitched 3D Semambu Neighborhood Map + Beat 1 Cutaway + Beat 2 Volumetric Pillars */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              height: LEFT_CARD_H,
              borderRadius: 28,
              backgroundColor: OBSIDIAN,
              border: `2px solid ${CYAN_DARK}`,
              boxShadow: '0 32px 72px rgba(20, 35, 41, 0.24)',
              overflow: 'hidden',
              perspective: '1550px',
              transformStyle: 'preserve-3d',
              opacity: mapStageOpacity,
              transform: `scale(${(0.95 + 0.05 * mapStageSpring).toFixed(4)})`,
            }}
          >
            {/* Subtle top HUD overlay inside 3D Neighborhood Viewport */}
            <div
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                top: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 14,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '8px 14px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(20, 35, 41, 0.94)',
                  border: `1.5px solid ${CYAN_BORDER}`,
                  color: '#FFFFFF',
                }}
              >
                <Navigation size={14} color={CYAN} strokeWidth={2.5} />
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 11.5,
                    fontWeight: 900,
                    letterSpacing: '0.11em',
                  }}
                >
                  PETA 3D SEMAMBU • RADIUS 1 KM POLISAS
                </span>
              </div>

              <div
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: `1.5px solid ${EMERALD}`,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 900,
                  color: EMERALD_BORDER,
                }}
              >
                {activePillIndex === 2
                  ? 'PECAHAN 4 PILAR SEWA AKTIF'
                  : '300M KE KAMPUS • JALAN KAKI'}
              </div>
            </div>

            {/* PITCHED 3D SEMAMBU WORLD PLANE */}
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: 42,
                width: 1040,
                height: 690,
                transformStyle: 'preserve-3d',
                transformOrigin: '50% 56%',
                transform: `translate3d(0px, 14px, -20px) rotateX(${mapPitchDeg.toFixed(2)}deg) rotateZ(${mapBearingDeg.toFixed(2)}deg)`,
              }}
            >
              {/* Crisp Dark Topographic Vector Road & Block Grid */}
              <svg
                width={1040}
                height={690}
                viewBox="0 0 1040 690"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 24,
                  backgroundColor: '#16282E',
                  border: '1.5px solid rgba(165, 243, 252, 0.22)',
                }}
              >
                {/* Quadrant Green Campus + Urban Semambu Zones */}
                <rect x={44} y={190} width={346} height={240} rx={22} fill="rgba(16, 185, 129, 0.12)" stroke="rgba(16, 185, 129, 0.32)" strokeWidth={1.6} />
                <rect x={426} y={36} width={570} height={374} rx={22} fill="rgba(6, 182, 212, 0.08)" stroke="rgba(165, 243, 252, 0.16)" strokeWidth={1.4} />

                {/* Main Jalan Semambu Arterial Road & Campus Junctions */}
                <path
                  d="M 48 410 L 410 410 L 410 42 M 410 264 L 990 264 M 642 42 L 642 410"
                  fill="none"
                  stroke="#0C171B"
                  strokeWidth={34}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 48 410 L 410 410 L 410 42 M 410 264 L 990 264 M 642 42 L 642 410"
                  fill="none"
                  stroke="rgba(165, 243, 252, 0.25)"
                  strokeWidth={2}
                  strokeDasharray="10 10"
                />

                {/* Road Label */}
                <text
                  x={435}
                  y={392}
                  fill="rgba(248, 246, 238, 0.56)"
                  fontFamily={LAUNCH_FONTS.MONO}
                  fontSize={13}
                  fontWeight={800}
                  letterSpacing="0.16em"
                >
                  JALAN SEMAMBU UTAMA
                </text>
              </svg>

              {/* Extruded 3D Architectural Landmark Blocks */}
              {EXTRUDED_ESTATE_BLOCKS.map((blk) => (
                <div
                  key={blk.id}
                  style={{
                    position: 'absolute',
                    left: blk.x,
                    top: blk.y,
                    width: blk.w,
                    height: blk.h,
                    borderRadius: 16,
                    backgroundColor: blk.wall,
                    border: '1.5px solid rgba(255, 255, 255, 0.18)',
                    transformStyle: 'preserve-3d',
                    boxShadow: '0 20px 34px rgba(0, 0, 0, 0.42)',
                  }}
                >
                  {/* Extruded top roof lifted along Z+ */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 16,
                      backgroundColor: blk.roof,
                      border: '1.5px solid rgba(255, 255, 255, 0.35)',
                      transform: 'translate3d(0px, 0px, 24px)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      padding: '10px 12px 14px',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12.5,
                        fontWeight: 900,
                        letterSpacing: '0.1em',
                        color: '#FFFFFF',
                      }}
                    >
                      {blk.label}
                    </span>
                  </div>
                </div>
              ))}

              {/* Animated Cyan/Emerald Walking Arc from Pintu Utama POLISAS -> Taman Pertama Semambu */}
              <EvolvingPath
                d="M 206 312 Q 368 264 410 264 L 580 264"
                width={1040}
                height={690}
                startFrame={routeDrawStart}
                durationFrames={routeDrawDuration}
                stroke={EMERALD}
                strokeWidth={5.5}
                trackStroke="rgba(16, 185, 129, 0.22)"
                headDotColor="#FFFFFF"
                headDotRadius={7}
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: 'translateZ(28px)',
                  pointerEvents: 'none',
                }}
              />

              {/* 3 Counter-Rotated Crisp 3D Floating Price Pins */}
              {MAP_LISTINGS.map((pin) => {
                const pinSpring = spring({
                  frame: Math.max(0, frame - pin.delayFrames),
                  fps: safeFps,
                  config: { damping: 16, stiffness: 215, mass: 0.85 },
                });
                const liftZ = 38 + pinSpring * 46;
                const displayPinPrice =
                  pin.isHero && activePillIndex === 2 ? fullFourRent : pin.pricePerPerson;
                return (
                  <div
                    key={pin.id}
                    style={{
                      position: 'absolute',
                      left: pin.x,
                      top: pin.y,
                      transformStyle: 'preserve-3d',
                      opacity: pinSpring,
                      transform: `translate(-50%, -122%) translateZ(${liftZ.toFixed(1)}px) rotateZ(${(-mapBearingDeg).toFixed(2)}deg) rotateX(${(-mapPitchDeg).toFixed(2)}deg)`,
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      style={{
                        padding: pin.isHero ? '9px 14px' : '7px 11px',
                        borderRadius: 14,
                        backgroundColor: pin.isHero ? '#FFFFFF' : 'rgba(20, 35, 41, 0.95)',
                        border: `2px solid ${pin.isHero ? EMERALD : CYAN_BORDER}`,
                        boxShadow: '0 16px 32px rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 9.5,
                          fontWeight: 900,
                          letterSpacing: '0.09em',
                          color: pin.isHero ? EMERALD_INK : CYAN_BORDER,
                        }}
                      >
                        {pin.tag} • {pin.walkLabel}
                      </span>
                      <span
                        style={{
                          fontSize: pin.isHero ? 19 : 15,
                          fontWeight: 900,
                          color: pin.isHero ? LAUNCH_PALETTE.PRIMARY : '#FFFFFF',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        RM {displayPinPrice}/bln
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BEAT 1 FLOATING UPRIGHT 3D ROOM CUTAWAY SPEC CARD (Peak visibility at Local 146f / f=1400) */}
            {cutawayOpacity > 0.01 ? (
              <div
                style={{
                  position: 'absolute',
                  right: 28,
                  bottom: 24,
                  width: 472,
                  padding: '18px 20px',
                  borderRadius: 22,
                  backgroundColor: 'rgba(248, 246, 238, 0.98)',
                  border: `2px solid ${CYAN}`,
                  boxShadow: '0 26px 56px rgba(0, 0, 0, 0.45)',
                  opacity: cutawayOpacity,
                  transform: `translate3d(0px, ${cutawayY.toFixed(2)}px, ${cutawayZ.toFixed(2)}px)`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  zIndex: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: '0.1em',
                      color: CYAN_INK,
                    }}
                  >
                    SPEK BILIK • TAMAN PERTAMA SEMAMBU
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 9px',
                      borderRadius: 999,
                      backgroundColor: EMERALD_SOFT,
                      border: `1px solid ${EMERALD_BORDER}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10,
                      fontWeight: 900,
                      color: EMERALD_INK,
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                    Verified JPP
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {[
                    'WiFi Unifi 300Mbps',
                    'Mesin Basuh Auto',
                    '4 Katil Lengkap',
                    '300m • 3 Min Kampus',
                  ].map((spec) => (
                    <div
                      key={spec}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 11,
                        backgroundColor: '#FFFFFF',
                        border: `1px solid ${CYAN_BORDER}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <CheckCircle2 size={14} color={EMERALD_INK} strokeWidth={2.5} />
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 800,
                          color: LAUNCH_PALETTE.PRIMARY,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {spec}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* BEAT 2 VOLUMETRIC 3D SPLIT PILLARS DIORAMA (1x RM 680 -> 4x RM 170, settled crisp at Local 366f / f=1620) */}
            {pillarsProgress > 0.01 ? (
              <div
                style={{
                  position: 'absolute',
                  left: 34,
                  right: 34,
                  bottom: 26,
                  padding: '20px 24px 22px',
                  borderRadius: 24,
                  backgroundColor: 'rgba(18, 32, 38, 0.96)',
                  border: `2px solid ${EMERALD}`,
                  boxShadow: '0 28px 64px rgba(0, 0, 0, 0.5)',
                  opacity: pillarsProgress,
                  transform: `translate3d(0px, ${pillarsRiseY.toFixed(2)}px, 36px)`,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 24,
                  zIndex: 18,
                }}
              >
                {/* Left summary chip inside diorama */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 280, flexShrink: 0 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 11px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${EMERALD}`,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Sparkles size={13} color={EMERALD_BORDER} strokeWidth={2.5} />
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 900,
                        letterSpacing: '0.1em',
                        color: EMERALD_BORDER,
                      }}
                    >
                      PECAHAN 3D KONGSI RAKAN
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'rgba(248, 246, 238, 0.72)',
                      }}
                    >
                      RM {safeHouseRent} ÷ 4 Rakan Serumah
                    </span>
                    <span
                      style={{
                        fontSize: 34,
                        fontWeight: 900,
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      RM {fullFourRent} × 4
                    </span>
                  </div>

                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: CYAN_BORDER,
                    }}
                  >
                    RINGAN BEBAN • JIMAT RM {safeHouseRent - fullFourRent}/BLN
                  </span>
                </div>

                {/* 4 Extruded 3D Isometric Cyan/Emerald Rent Pillars */}
                <div
                  style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    alignItems: 'end',
                  }}
                >
                  {ROOMMATES.map((mate, idx) => {
                    const barEnter = interpolate(
                      frame,
                      [292 + idx * 7, 326 + idx * 7],
                      [0, 1],
                      {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                        easing: EXPO_OUT,
                      },
                    );
                    const spreadX = (idx - 1.5) * (1 - pillarsProgress) * -28;
                    const pillarScaleY = 0.32 + 0.68 * barEnter;
                    return (
                      <div
                        key={mate.name}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 9,
                          opacity: barEnter,
                          transform: `translate3d(${spreadX.toFixed(1)}px, 0px, 0px)`,
                        }}
                      >
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            backgroundColor: '#FFFFFF',
                            color: mate.dark,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 13,
                            fontWeight: 900,
                            fontVariantNumeric: 'tabular-nums',
                            boxShadow: '0 8px 18px rgba(0, 0, 0, 0.35)',
                          }}
                        >
                          RM {fullFourRent}
                        </span>

                        {/* 3D Extruded Pillar Prism grown cleanly on GPU via scaleY */}
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: 112,
                            transformOrigin: '50% 100%',
                            transform: `scaleY(${pillarScaleY.toFixed(4)})`,
                            borderRadius: '14px 14px 8px 8px',
                            backgroundColor: mate.color,
                            border: '1.5px solid rgba(255, 255, 255, 0.42)',
                            borderRight: `9px solid ${mate.dark}`,
                            borderTop: '5px solid rgba(255, 255, 255, 0.55)',
                            boxShadow: '0 14px 26px rgba(6, 182, 212, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 900,
                              color: '#FFFFFF',
                              letterSpacing: '0.06em',
                            }}
                          >
                            25% SHARE
                          </span>
                        </div>

                        {/* Roommate Chip */}
                        <div
                          style={{
                            width: '100%',
                            padding: '7px 8px',
                            borderRadius: 12,
                            backgroundColor: 'rgba(255, 255, 255, 0.09)',
                            border: '1px solid rgba(165, 243, 252, 0.25)',
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
                              backgroundColor: mate.color,
                            }}
                          />
                          <span style={{ fontSize: 12.5, fontWeight: 900, color: '#FFFFFF' }}>
                            {mate.name}
                          </span>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 10,
                              fontWeight: 700,
                              color: CYAN_BORDER,
                            }}
                          >
                            {mate.dept}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="04" chapterLabel="14:00 PETANG • BILIK SEWA & KONGSI SEWA" />
    </>
  );
};

const polyRentSchema = {
  houseRentRm: {
    type: 'number',
    default: 680,
    min: 200,
    max: 5000,
    integer: true,
    hiddenFromList: false,
    description: 'Whole House Monthly Rent RM',
  },
  walkMinutes: {
    type: 'number',
    default: 3,
    min: 1,
    max: 30,
    integer: true,
    hiddenFromList: false,
    description: 'Walking Time Minutes',
  },
  headline: {
    type: 'string',
    default: POLYRENT_HEADLINE_DEFAULT,
    description: 'Headline',
  },
} as const satisfies InteractivitySchema;

export const PolyRentHousingScene = Interactive.withSchema({
  Component: PolyRentHousingInner,
  componentName: 'PolyRentHousingScene',
  schema: polyRentSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
