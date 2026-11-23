import React from 'react';
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Heart,
  Home,
  MessageCircle,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
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
import {
  MODULE_CONTENT_ENTER_OFFSET,
  Module3DIntroBumper,
} from '../motion/Module3DIntroBumper';
import { WHIP_S_CURVE } from '../motion/transitions';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE, LUXURY_SPRING } from '../tokens';
import { KineticWindow, LiveTypewriterText, SpatialFloorGrid } from '../ui/KineticCard';

const CYAN = LAUNCH_MODULE_THEMES.polyrent.primary; // #06B6D4
const CYAN_DARK = LAUNCH_MODULE_THEMES.polyrent.dark; // #0891B2
const CYAN_INK = '#0E7490'; // WCAG AA+ Cyan-700
const CYAN_SOFT = LAUNCH_MODULE_THEMES.polyrent.soft; // #ECFEFF
const CYAN_BORDER = LAUNCH_MODULE_THEMES.polyrent.border; // #A5F3FC

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0

const ROSE = LAUNCH_MODULE_THEMES.polysuara.primary; // #F43F5E
const OBSIDIAN = '#061714';

export type PolyRentHousingProps = {
  readonly houseRentRm: number;
  readonly walkMinutes: number;
  readonly headline: string;
};

const POLYRENT_HEADLINE_DEFAULT = 'Cari Bilik Sewa Sekitar Semambu? Kongsi Jimat Tanpa Scam.';

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const ROOMMATES = [
  { name: 'Aiman', dept: 'JKE', color: CYAN, dark: CYAN_DARK },
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

const O = MODULE_CONTENT_ENTER_OFFSET; // 132f bumper handoff

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
    delayFrames: O + 32,
  },
  {
    id: 'semambu-baru',
    name: 'Taman Semambu Baru',
    tag: '4 BILIK',
    pricePerPerson: 190,
    walkLabel: '520m • 6 Min',
    x: 378,
    y: 122,
    delayFrames: O + 44,
  },
  {
    id: 'lorong-12',
    name: 'Lorong Semambu 12',
    tag: 'SEBERANG KAMSIS',
    pricePerPerson: 160,
    walkLabel: '650m • 7 Min',
    x: 842,
    y: 332,
    delayFrames: O + 56,
  },
];

// Upright Left Card Dimensions (708x742 at screen position left: 88, top: 210)
const LEFT_CARD_W = 708;
const LEFT_CARD_H = 742;

// GhostCursor clicks 2 Pelajar -> 4 Pelajar well before f=2050 (local 334f / O+202f)
const RENT_SPLIT_CURSOR_KEYFRAMES: readonly GhostCursorKeyframe[] = [
  { frame: O + 84, x: 140, y: 612, label: 'KONGSI SEWA' },
  { frame: O + 120, x: 354, y: 612, click: true, label: '2 PELAJAR' },
  { frame: O + 156, x: 564, y: 612, click: true, label: '4 PELAJAR • RM 170' },
  { frame: O + 174, x: 564, y: 612 },
];

const EXTRUDED_ESTATE_BLOCKS = [
  { id: 'block-polisas', x: 58, y: 214, w: 238, h: 166, roof: '#059669', wall: '#064E3B', label: 'PINTU UTAMA POLISAS' },
  { id: 'block-pertama', x: 506, y: 192, w: 220, h: 148, roof: CYAN, wall: CYAN_INK, label: 'TAMAN PERTAMA' },
  { id: 'block-baru', x: 288, y: 54, w: 186, h: 112, roof: '#0D9488', wall: '#0B2420', label: 'TMN SEMAMBU BARU' },
  { id: 'block-lorong', x: 742, y: 274, w: 196, h: 120, roof: '#14B8A6', wall: '#0F766E', label: 'LORONG 12' },
] as const;

const PROPERTY_CARDS = [
  {
    id: 'taman-pertama',
    title: 'Taman Pertama Semambu',
    sub: '2 Kekosongan • Lelaki • 300m POLISAS',
    dealBadge: 'Pilihan Berbaloi',
    saved: true,
    isHero: true,
    fixedRent: null,
  },
  {
    id: 'semambu-baru',
    title: 'Taman Semambu Baru',
    sub: '4 Kekosongan • Perempuan • 520m',
    dealBadge: null,
    saved: false,
    isHero: false,
    fixedRent: 190,
  },
] as const;

const FILTER_PILLS = ['SEMUA', 'LELAKI', 'PEREMPUAN'] as const;

const POLYRENT_PHOTO_SRC: Record<string, string> = {
  'taman-pertama': staticFile('launch-photos/polyrent/taman-pertama.jpg'),
  'semambu-baru': staticFile('launch-photos/polyrent/semambu-baru.jpg'),
};

const renderPropertyArt = (id: string, frame: number, fps: number) => {
  const photoSrc = POLYRENT_PHOTO_SRC[id] ?? POLYRENT_PHOTO_SRC['taman-pertama'];
  const kenBurnsProgress = interpolate(frame, [O, O + 280], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const kenBurnsScale = 1.02 + kenBurnsProgress * 0.05;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 112,
        overflow: 'hidden',
        backgroundColor: OBSIDIAN,
      }}
    >
      <CanvasImage
        name={`polyrent-photo-${id}`}
        src={photoSrc}
        premountFor={fps}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transform: `scale(${kenBurnsScale.toFixed(4)})`,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(6, 23, 20, 0.24) 0%, rgba(6, 23, 20, 0) 48%, rgba(6, 23, 20, 0.34) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

const PolyRentHousingInner: React.FC<PolyRentHousingProps> = ({
  houseRentRm,
  walkMinutes: _walkMinutes,
  headline,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeHouseRent = Math.max(200, Math.round(Number.isFinite(houseRentRm) ? houseRentRm : 680));
  const safeHeadline = headline.trim() || POLYRENT_HEADLINE_DEFAULT;
  const timeSec = frame / safeFps;

  // Seamless zero-flash bumper handoff (132..168f)
  const contentRevealT = interpolate(frame, [O, O + 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Header timing (shifted +132f)
  const wordStagger = Math.max(2, Math.round(0.05 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.32 * safeFps));

  // Left panel entrance
  const leftCardSpring = spring({
    frame: Math.max(0, frame - (O + 6)),
    fps: safeFps,
    config: LUXURY_SPRING,
  });
  const leftCardOpacity = interpolate(frame, [O + 4, O + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const leftCardX = (1 - leftCardSpring) * -36;

  // Right 3D Semambu Map entrance
  const mapStageSpring = spring({
    frame: Math.max(0, frame - (O + 10)),
    fps: safeFps,
    config: LUXURY_SPRING,
  });
  const mapStageOpacity = interpolate(frame, [O + 8, O + 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Gentle 3D camera panning across Semambu corridor
  const mapBearingDeg = interpolate(frame, [O, 720], [-12, 10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });
  const mapPitchDeg = interpolate(frame, [O, 420, 720], [50, 54, 49], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const routeDrawStart = O + 30;
  const routeDrawDuration = 54;

  // Rent Split Morph (1 -> 2 -> 4 Roommates across O+120 .. O+186 = 252..318f, locked BEFORE f_2050!)
  const split2Progress = interpolate(frame, [O + 118, O + 140], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const split4Progress = interpolate(frame, [O + 154, O + 186], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });

  const activePillIndex = split4Progress >= 0.35 ? 2 : split2Progress >= 0.45 ? 1 : 0;
  const activeDivisor = 1 + split2Progress * 1 + split4Progress * 2;
  const liveRentPerPerson = Math.round(safeHouseRent / Math.max(1, activeDivisor));
  const fullFourRent = Math.round(safeHouseRent / 4);
  const monthlySavedPerStudent = Math.max(0, safeHouseRent - liveRentPerPerson);

  // Beat 2 Volumetric 3D Split Pillars (rises O+160..O+196 -> 292..328f, sharp at f=2050!)
  const pillarsProgress = interpolate(frame, [O + 160, O + 196], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const pillarsRiseY = (1 - pillarsProgress) * 34;

  // Brief cutaway spec toast fades cleanly as 4 Pillars rise
  const cutawayEnterSpring = spring({
    frame: Math.max(0, frame - (O + 48)),
    fps: safeFps,
    config: LUXURY_SPRING,
  });
  const cutawayExitFade = interpolate(frame, [O + 146, O + 178], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cutawayOpacity = cutawayEnterSpring * cutawayExitFade;

  const livePulseScale = 0.86 + Math.sin(timeSec * 4.8) * 0.16;
  const trafficDotA = ((timeSec * 0.24) % 1 + 1) % 1;
  const trafficDotB = ((timeSec * 0.24 + 0.5) % 1 + 1) % 1;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.polyrent.tint} />

      <Module3DIntroBumper
        moduleIndex="MODUL 04"
        moduleCategory="KEDIAMAN PELAJAR"
        moduleName="PolyRent"
        tagline="Cari Rumah Sewa Sah & Kongsi Bilik Jimat"
        morphMode="roof-drop-to-3d-map"
        accentColor={LAUNCH_MODULE_THEMES.polyrent.primary}
        darkColor={LAUNCH_MODULE_THEMES.polyrent.dark}
        softColor={LAUNCH_MODULE_THEMES.polyrent.soft}
        borderColor={LAUNCH_MODULE_THEMES.polyrent.border}
        icon={<Home size={96} color="#FFFFFF" strokeWidth={2.1} />}
        features={[
          { icon: <Home size={15} strokeWidth={2.4} />, label: 'Taman Pertama' },
          { icon: <Calculator size={15} strokeWidth={2.4} />, label: 'Kongsi RM170' },
          { icon: <ShieldCheck size={15} strokeWidth={2.4} />, label: 'Bebas Scam' },
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
        entryPanXOffset={28}
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
              top: 72,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 28,
              fontFamily: LAUNCH_FONTS.DISPLAY,
              zIndex: 8,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1320 }}>
              <KineticReveal startFrame={O + 4} durationFrames={18}>
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
                startFrame={O + 8}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['Semambu?', 'Jimat']}
                accentColor={CYAN_DARK}
                style={{
                  margin: 0,
                  fontSize: 38,
                  fontWeight: 900,
                  letterSpacing: '-0.032em',
                  lineHeight: 1.07,
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />
            </div>

            <KineticReveal startFrame={O + 16} durationFrames={20}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 18px',
                  borderRadius: 16,
                  backgroundColor: activePillIndex === 2 ? EMERALD_SOFT : LAUNCH_PALETTE.CARD_BG,
                  border: `1.5px solid ${activePillIndex === 2 ? EMERALD_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                  boxShadow: '0 12px 26px rgba(6, 23, 20, 0.08)',
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
                    : 'DISAHKAN KLK/JPP • BEBAS SCAM'}
                </span>
              </div>
            </KineticReveal>
          </div>

          {/* Main 2-Zone Stage: Left Authentic PolyRentPage.tsx Replica + Right Accurate 3D Semambu Map */}
          <div
            style={{
              position: 'absolute',
              left: 88,
              right: 88,
              top: 208,
              height: 752,
              display: 'flex',
              alignItems: 'center',
              gap: 30,
              fontFamily: LAUNCH_FONTS.DISPLAY,
              zIndex: 6,
            }}
          >
            {/* LEFT UPRIGHT PANEL: Faithful Replica of src/pages/polyrent/PolyRentPage.tsx */}
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
                statusPill={activePillIndex === 2 ? `KONGSI 4 • RM ${fullFourRent}` : 'DISAHKAN KLK/JPP'}
                statusAccent
                accentColor={activePillIndex === 2 ? EMERALD : CYAN}
                accentSoftBg={activePillIndex === 2 ? EMERALD_SOFT : CYAN_SOFT}
                accentBorderColor={activePillIndex === 2 ? EMERALD_BORDER : CYAN_BORDER}
                width={LEFT_CARD_W}
                height={LEFT_CARD_H}
                sheenStartFrame={O + 186}
                sheenDuration={36}
                style={{
                  borderBottom: `6px solid ${activePillIndex === 2 ? EMERALD : CYAN}`,
                  boxShadow: '0 28px 60px rgba(14, 116, 144, 0.14)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '14px 18px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  {/* PolyRentPage Dark Teal Hero Header + Search Bar */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 18,
                      background: 'linear-gradient(135deg, #0B2420 0%, #0E352E 58%, #061714 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: '0.14em',
                            color: '#5EEAD4',
                          }}
                        >
                          POLYRENT • CARI KAWAN SEWA
                        </span>
                        <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em' }}>
                          Cari Kawan Sewa. <span style={{ color: '#5EEAD4' }}>Lebih Jimat.</span>
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            backgroundColor: 'rgba(20, 184, 166, 0.2)',
                            border: '1px solid rgba(94, 234, 212, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Calculator size={15} color="#5EEAD4" strokeWidth={2.4} />
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '7px 12px',
                            borderRadius: 999,
                            backgroundColor: LAUNCH_PALETTE.SECONDARY,
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          <Plus size={13} strokeWidth={3} />
                          Iklan
                        </span>
                      </div>
                    </div>

                    {/* Glass Search Input Pill */}
                    <div
                      style={{
                        padding: '7px 8px 7px 14px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.22)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Search size={14} color="#FFFFFF" strokeWidth={2.5} />
                        <LiveTypewriterText
                          text="Cari kawasan: Taman Pertama, Semambu..."
                          startFrame={O + 10}
                          charsPerSecond={34}
                          cursorColor="#5EEAD4"
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#FFFFFF',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          backgroundColor: '#FFFFFF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ArrowRight size={14} color={OBSIDIAN} strokeWidth={2.6} />
                      </span>
                    </div>
                  </div>

                  {/* Authentic Dual-Tab Switcher & Filter Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 6,
                        width: 390,
                        padding: 4,
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                        border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                      }}
                    >
                      <div
                        style={{
                          padding: '7px 12px',
                          borderRadius: 999,
                          backgroundColor: LAUNCH_PALETTE.SECONDARY,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        <Home size={13} strokeWidth={2.5} />
                        Iklan Rumah
                      </div>
                      <div
                        style={{
                          padding: '7px 12px',
                          borderRadius: 999,
                          color: LAUNCH_PALETTE.MUTED_OLIVE,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        <Users size={13} strokeWidth={2.3} />
                        Pelajar Mencari
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'nowrap' }}>
                      {FILTER_PILLS.map((pill, pIdx) => (
                        <span
                          key={pill}
                          style={{
                            padding: '5px 15px',
                            borderRadius: 999,
                            backgroundColor: pIdx === 0 ? OBSIDIAN : '#FFFFFF',
                            border: `1px solid ${pIdx === 0 ? OBSIDIAN : LAUNCH_PALETTE.TERTIARY}`,
                            color: pIdx === 0 ? '#FFFFFF' : LAUNCH_PALETTE.MUTED_OLIVE,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10.5,
                            fontWeight: 900,
                          }}
                        >
                          {pill}
                        </span>
                      ))}
                      <span
                        style={{
                          padding: '5px 14px',
                          borderRadius: 999,
                          backgroundColor: '#FFF1F2',
                          border: '1px solid #FECDD3',
                          color: '#BE123C',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 900,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Heart size={11} fill={ROSE} color={ROSE} strokeWidth={2.4} />
                        Tersimpan (3)
                      </span>
                    </div>
                  </div>

                  {/* Authentic 2-Column Airbnb-Style House Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {PROPERTY_CARDS.map((card) => {
                      const shownPrice = card.isHero ? liveRentPerPerson : card.fixedRent ?? 190;
                      return (
                        <div
                          key={card.id}
                          style={{
                            borderRadius: 18,
                            backgroundColor: '#FFFFFF',
                            border: `1.5px solid ${card.isHero ? CYAN : LAUNCH_PALETTE.TERTIARY}`,
                            boxShadow: card.isHero
                              ? '0 14px 28px rgba(6, 182, 212, 0.14)'
                              : '0 8px 18px rgba(6, 23, 20, 0.06)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ position: 'relative' }}>
                            {renderPropertyArt(card.id, frame, safeFps)}
                            {card.dealBadge ? (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  left: 8,
                                  padding: '4px 9px',
                                  borderRadius: 999,
                                  backgroundColor: '#FFFFFF',
                                  boxShadow: '0 4px 12px rgba(6, 23, 20, 0.18)',
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 9.5,
                                  fontWeight: 900,
                                  color: OBSIDIAN,
                                }}
                              >
                                {card.dealBadge}
                              </span>
                            ) : null}
                            <span
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: 26,
                                height: 26,
                                borderRadius: 999,
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Heart
                                size={13}
                                fill={card.saved ? ROSE : 'none'}
                                color={card.saved ? ROSE : OBSIDIAN}
                                strokeWidth={2.4}
                              />
                            </span>
                          </div>

                          <div style={{ padding: '9px 11px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span
                                style={{
                                  fontSize: 13.5,
                                  fontWeight: 900,
                                  color: LAUNCH_PALETTE.PRIMARY,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {card.title}
                              </span>
                              <ShieldCheck size={14} color={EMERALD_INK} strokeWidth={2.6} />
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: LAUNCH_PALETTE.MUTED_OLIVE,
                              }}
                            >
                              {card.sub}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                              {card.isHero ? (
                                <EditorialAnnotation
                                  type="highlight"
                                  startFrame={O + 184}
                                  durationFrames={26}
                                  color="rgba(16, 185, 129, 0.28)"
                                  padding={{ top: 1, right: 4, bottom: 1, left: 4 }}
                                >
                                  <span
                                    style={{
                                      fontSize: 17,
                                      fontWeight: 900,
                                      color: activePillIndex === 2 ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY,
                                      fontVariantNumeric: 'tabular-nums',
                                    }}
                                  >
                                    RM {shownPrice}
                                  </span>
                                </EditorialAnnotation>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 16,
                                    fontWeight: 900,
                                    color: LAUNCH_PALETTE.PRIMARY,
                                    fontVariantNumeric: 'tabular-nums',
                                  }}
                                >
                                  RM {shownPrice}
                                </span>
                              )}
                              <span style={{ fontSize: 11, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                                {card.isHero && activePillIndex > 0 ? '/ bln seorang' : '/ bulan'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Kongsi Sewa Calculator Drawer */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 16,
                      backgroundColor: activePillIndex === 2 ? EMERALD_SOFT : LAUNCH_PALETTE.BACKGROUND,
                      border: `1.5px solid ${activePillIndex === 2 ? EMERALD_BORDER : LAUNCH_PALETTE.TERTIARY}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 900,
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        <Calculator size={13} color={CYAN_INK} strokeWidth={2.5} />
                        KALKULATOR KONGSI SEWA RAKAN
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 900,
                          color: activePillIndex === 2 ? EMERALD_INK : CYAN_INK,
                        }}
                      >
                        {activePillIndex === 0
                          ? `RM ${safeHouseRent} SEWA PENUH`
                          : `JIMAT RM ${monthlySavedPerStudent}/BLN`}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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
                              padding: '7px 10px',
                              borderRadius: 11,
                              backgroundColor: isActive ? activeBg : '#FFFFFF',
                              border: `1.5px solid ${isActive ? activeBg : LAUNCH_PALETTE.TERTIARY}`,
                              color: isActive ? '#FFFFFF' : LAUNCH_PALETTE.PRIMARY,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <span style={{ fontSize: 13.5, fontWeight: 900 }}>{opt.label}</span>
                            <span style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 10.5, fontWeight: 800 }}>
                              {opt.sub}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Zero-Scam Direct WhatsApp Bar */}
                  <div
                    style={{
                      padding: '11px 15px',
                      borderRadius: 14,
                      backgroundColor: activePillIndex === 2 ? EMERALD_INK : LAUNCH_PALETTE.PRIMARY_DARK,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <MessageCircle size={16} color={EMERALD_BORDER} strokeWidth={2.5} />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 900,
                          letterSpacing: '0.07em',
                        }}
                      >
                        ✓ BEBAS SCAM • WHATSAPP TUAN RUMAH TERUS
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(255, 255, 255, 0.16)',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10.5,
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activePillIndex === 2 ? 'JIMAT 75%' : 'VERIFIED JPP'}
                    </span>
                  </div>
                </div>
              </KineticWindow>

              <GeometricSparkBurst
                triggerFrame={O + 158}
                x={564}
                y={612}
                durationFrames={34}
                radius={82}
                count={12}
                seed="polyrent-split-spark"
                colors={[CYAN, EMERALD, LAUNCH_PALETTE.CARD_BG]}
              />

              <GhostCursor
                keyframes={RENT_SPLIT_CURSOR_KEYFRAMES}
                appearFrame={O + 84}
                disappearFrame={O + 174}
                color={LAUNCH_PALETTE.PRIMARY_DARK}
                rippleColor={EMERALD}
              />
            </div>

            {/* RIGHT 3D WORLD: Geographically Accurate Pitched 3D Semambu Neighborhood Map */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                height: LEFT_CARD_H,
                borderRadius: 28,
                backgroundColor: OBSIDIAN,
                border: `2px solid ${CYAN_DARK}`,
                boxShadow: '0 32px 72px rgba(6, 23, 20, 0.26)',
                overflow: 'hidden',
                perspective: '1550px',
                transformStyle: 'preserve-3d',
                opacity: mapStageOpacity,
                transform: `scale(${(0.95 + 0.05 * mapStageSpring).toFixed(4)})`,
              }}
            >
              {/* Top HUD inside Map Viewport */}
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
                    backgroundColor: 'rgba(6, 23, 20, 0.94)',
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
                    PETA 3D SEMAMBU • JALAN SEMAMBU & KAMPUS
                  </span>
                </div>

                <div
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    backgroundColor: 'rgba(16, 185, 129, 0.22)',
                    border: `1.5px solid ${EMERALD}`,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 11.5,
                    fontWeight: 900,
                    color: EMERALD_BORDER,
                  }}
                >
                  {activePillIndex === 2
                    ? 'PECAHAN 4 PILAR SEWA AKTIF'
                    : '300M KE PINTU UTAMA • JALAN KAKI'}
                </div>
              </div>

              {/* PITCHED 3D SEMAMBU WORLD PLANE */}
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 42,
                  width: 980,
                  height: 690,
                  transformStyle: 'preserve-3d',
                  transformOrigin: '50% 56%',
                  transform: `translate3d(0px, 14px, -20px) rotateX(${mapPitchDeg.toFixed(2)}deg) rotateZ(${mapBearingDeg.toFixed(2)}deg)`,
                }}
              >
                {/* Semambu Arterial Road Network & Campus/Residential Geo Zones */}
                <svg
                  width={980}
                  height={690}
                  viewBox="0 0 980 690"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 24,
                    backgroundColor: '#0A1E1B',
                    border: '1.5px solid rgba(165, 243, 252, 0.22)',
                  }}
                >
                  {/* West Side: Campus Grounds | East Side: Semambu Housing Estates */}
                  <rect
                    x={36}
                    y={168}
                    width={310}
                    height={286}
                    rx={22}
                    fill="rgba(16, 185, 129, 0.14)"
                    stroke="rgba(16, 185, 129, 0.36)"
                    strokeWidth={1.8}
                  />
                  <rect
                    x={430}
                    y={32}
                    width={520}
                    height={402}
                    rx={22}
                    fill="rgba(6, 182, 212, 0.08)"
                    stroke="rgba(165, 243, 252, 0.18)"
                    strokeWidth={1.5}
                  />

                  {/* Main Arterial Highway: JALAN SEMAMBU (Kuantan - Indera Mahkota) */}
                  <path
                    d="M 390 18 Q 396 220 390 420 Q 386 520 340 660"
                    fill="none"
                    stroke="#04100E"
                    strokeWidth={44}
                    strokeLinecap="round"
                  />
                  <path
                    d="M 390 18 Q 396 220 390 420 Q 386 520 340 660"
                    fill="none"
                    stroke="rgba(20, 184, 166, 0.45)"
                    strokeWidth={2.5}
                    strokeDasharray="12 12"
                  />

                  {/* Residential Connecting Access Roads + Laluan Beserah Spur */}
                  <path
                    d="M 392 268 L 885 268 M 392 126 L 676 126 M 676 126 L 676 410"
                    fill="none"
                    stroke="#061714"
                    strokeWidth={24}
                    strokeLinecap="round"
                  />
                  <path
                    d="M 392 268 L 885 268 M 392 126 L 676 126"
                    fill="none"
                    stroke="rgba(165, 243, 252, 0.25)"
                    strokeWidth={1.5}
                    strokeDasharray="8 8"
                  />

                  {/* Portal Walking Start & Taman Pertama Arrival Anchor Nodes */}
                  <circle cx={304} cy={268} r={8.5} fill="rgba(16, 185, 129, 0.28)" stroke="#10B981" strokeWidth={2.5} />
                  <circle cx={498} cy={268} r={8.5} fill="rgba(16, 185, 129, 0.28)" stroke="#10B981" strokeWidth={2.5} />

                  {/* Deterministic Highway Traffic Pulses along Jalan Semambu */}
                  <circle cx={392} cy={40 + trafficDotA * 440} r={4.5} fill="#5EEAD4" opacity={0.85} />
                  <circle cx={390} cy={40 + trafficDotB * 440} r={4.5} fill={CYAN} opacity={0.85} />

                  {/* Geographic Road Labels */}
                  <text
                    x={366}
                    y={156}
                    fill="rgba(94, 234, 212, 0.78)"
                    fontFamily={LAUNCH_FONTS.MONO}
                    fontSize={12}
                    fontWeight={900}
                    letterSpacing="0.16em"
                    transform="rotate(-90 366 156)"
                  >
                    JALAN SEMAMBU (KUANTAN)
                  </text>
                  <text
                    x={748}
                    y={254}
                    fill="rgba(246, 251, 249, 0.62)"
                    fontFamily={LAUNCH_FONTS.MONO}
                    fontSize={11}
                    fontWeight={800}
                    letterSpacing="0.14em"
                  >
                    LALUAN BESERAH
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
                          fontSize: 12,
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

                {/* Animated Emerald Walking Arc across Jalan Semambu -> Taman Pertama Semambu */}
                <EvolvingPath
                  d="M 304 268 L 392 268 L 498 268"
                  width={980}
                  height={690}
                  startFrame={routeDrawStart}
                  durationFrames={routeDrawDuration}
                  stroke={EMERALD}
                  strokeWidth={5.5}
                  trackStroke="rgba(16, 185, 129, 0.24)"
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
                    config: LUXURY_SPRING,
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
                          backgroundColor: pin.isHero ? '#FFFFFF' : 'rgba(6, 23, 20, 0.95)',
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

              {/* Brief Initial Cutaway Before Beat 2 Pillars Rise */}
              {cutawayOpacity > 0.01 ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 28,
                    bottom: 24,
                    padding: '12px 18px',
                    borderRadius: 16,
                    backgroundColor: 'rgba(246, 251, 249, 0.96)',
                    border: `2px solid ${CYAN}`,
                    opacity: cutawayOpacity,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    zIndex: 16,
                  }}
                >
                  <CheckCircle2 size={16} color={EMERALD_INK} strokeWidth={2.5} />
                  <span style={{ fontSize: 13, fontWeight: 900, color: OBSIDIAN }}>
                    LALUAN SELAMAT KE TAMAN PERTAMA (300M)
                  </span>
                </div>
              ) : null}

              {/* BEAT 2 VOLUMETRIC 3D SPLIT PILLARS DIORAMA */}
              {pillarsProgress > 0.01 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 30,
                    right: 30,
                    bottom: 24,
                    padding: '18px 22px 20px',
                    borderRadius: 24,
                    backgroundColor: 'rgba(6, 23, 20, 0.96)',
                    border: `2px solid ${EMERALD}`,
                    boxShadow: '0 28px 64px rgba(0, 0, 0, 0.52)',
                    opacity: pillarsProgress,
                    transform: `translate3d(0px, ${pillarsRiseY.toFixed(2)}px, 36px)`,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 20,
                    zIndex: 18,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: 256, flexShrink: 0 }}>
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(246, 251, 249, 0.72)' }}>
                        RM {safeHouseRent} ÷ 4 Rakan Serumah
                      </span>
                      <span
                        style={{
                          fontSize: 32,
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
                        fontSize: 11,
                        fontWeight: 800,
                        color: CYAN_BORDER,
                      }}
                    >
                      RINGAN BEBAN • JIMAT RM {safeHouseRent - fullFourRent}/BLN
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 14,
                      alignItems: 'end',
                    }}
                  >
                    {ROOMMATES.map((mate, idx) => {
                      const barEnter = interpolate(
                        frame,
                        [O + 168 + idx * 6, O + 196 + idx * 6],
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
                            gap: 8,
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
                              fontSize: 12.5,
                              fontWeight: 900,
                              fontVariantNumeric: 'tabular-nums',
                              boxShadow: '0 8px 18px rgba(0, 0, 0, 0.35)',
                            }}
                          >
                            RM {fullFourRent}
                          </span>

                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: 102,
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

                          <div
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: 11,
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
                            <span style={{ fontSize: 12, fontWeight: 900, color: '#FFFFFF' }}>
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
