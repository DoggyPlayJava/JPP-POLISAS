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
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Home,
  Lock,
  MapPin,
  MessageSquare,
  Package,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath, GeometricSparkBurst } from '../motion/MotionActors';
import {
  MODULE_CONTENT_ENTER_OFFSET,
  Module3DIntroBumper,
} from '../motion/Module3DIntroBumper';
import { WHIP_S_CURVE } from '../motion/transitions';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE, LUXURY_SPRING } from '../tokens';
import { DeterministicQrMatrix, KineticWindow, SpatialFloorGrid } from '../ui/KineticCard';

const TEAL = LAUNCH_MODULE_THEMES.kebajikan.primary; // #14B8A6
const TEAL_DARK = LAUNCH_MODULE_THEMES.kebajikan.dark; // #0F766E
const TEAL_INK = '#0F766E';
const TEAL_SOFT = LAUNCH_MODULE_THEMES.kebajikan.soft; // #CCFBF1
const TEAL_BORDER = LAUNCH_MODULE_THEMES.kebajikan.border; // #99F6E4

const AMBER = LAUNCH_MODULE_THEMES.foodbank.primary; // #F59E0B
const AMBER_DARK = LAUNCH_MODULE_THEMES.foodbank.dark; // #D97706
const AMBER_INK = '#B45309';
const AMBER_SOFT = LAUNCH_MODULE_THEMES.foodbank.soft; // #FFFBEB
const AMBER_BORDER = LAUNCH_MODULE_THEMES.foodbank.border; // #FDE68A

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_INK = '#047857';
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0

const VAULT_OBSIDIAN = '#061714';
const O = MODULE_CONTENT_ENTER_OFFSET; // 132f bumper handoff

export type WelfareCareProps = {
  readonly ticketNo: string;
  readonly slaLabel: string;
  readonly headline: string;
};

type ComplaintStageSpec = {
  readonly code: string;
  readonly title: string;
  readonly meta: string;
  readonly reachFrame: number;
};

const STUDENT_HEADLINE_DEFAULT = 'Kamsis Bermasalah? Perlukan Food Bank? Kami Ada.';
const LEGACY_HEADLINE = 'kebajikan disantuni dengan telus.';

const resolveStudentHeadline = (headline: string): string => {
  const trimmed = headline.trim();
  if (!trimmed || trimmed.toLowerCase() === LEGACY_HEADLINE) {
    return STUDENT_HEADLINE_DEFAULT;
  }
  return trimmed;
};

const KAMSIS_STAGES: readonly ComplaintStageSpec[] = [
  { code: '01', title: 'Tiket Diterima', meta: '09:14 AM', reachFrame: O + 24 },
  { code: '02', title: 'Pegawai Ditugaskan', meta: '09:20 AM', reachFrame: O + 54 },
  { code: '03', title: 'Dalam Tindakan', meta: '11:15 AM', reachFrame: O + 88 },
  { code: '04', title: 'Selesai < 48 Jam ✓', meta: '03:50 PM', reachFrame: O + 124 },
];

const FOOD_BANK_STEPS = [
  { label: 'Dimohon', subLabel: '08:40 AM', threshold: 0.2 },
  { label: 'Diluluskan Rahsia', subLabel: '09:05 AM', threshold: 0.55 },
  { label: 'Sedia Diambil ✓', subLabel: 'Loker Privasi B2', threshold: 0.85 },
] as const;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const WelfareCareInner: React.FC<WelfareCareProps> = ({
  ticketNo,
  slaLabel,
  headline,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeTicketNo = ticketNo.trim() || 'KBJ-0842';
  const safeSlaLabel = slaLabel.trim() || '< 48 JAM';
  const resolvedHeadline = resolveStudentHeadline(headline);
  const timeSec = frame / safeFps;

  // Seamless zero-flash bumper handoff (132..168f)
  const contentRevealT = interpolate(frame, [O, O + 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Header timing
  const wordStagger = Math.max(2, Math.round(0.05 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.32 * safeFps));

  // Act 1 -> Act 2 Rack-Focus Spatial Shift (O+272 .. O+332 = 404..464f -> well AFTER f=3450 / local 348f!)
  const rackT = interpolate(frame, [O + 272, O + 332], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });

  const entrySpring = spring({
    frame: Math.max(0, frame - (O + 6)),
    fps: safeFps,
    config: LUXURY_SPRING,
  });

  // Card 1: Smart Ticket & 2-Way Direct Live Chat Hub (width 1060x576)
  const ticketX = interpolate(rackT, [0, 1], [-42, -525]);
  const ticketY = interpolate(rackT, [0, 1], [0, 22]) + (1 - entrySpring) * 26;
  const ticketZ = interpolate(rackT, [0, 1], [58, -160]);
  const ticketScale = interpolate(rackT, [0, 1], [1, 0.72]);
  const ticketOpacity = entrySpring * interpolate(rackT, [0, 1], [1, 0.36]);
  const ticketRotY = interpolate(rackT, [0, 1], [2.5, 5]);

  // Card 2: Confidential Food Bank Vault
  const vaultX = interpolate(rackT, [0, 1], [540, 42]);
  const vaultY = interpolate(rackT, [0, 1], [24, 0]) + (1 - entrySpring) * 30;
  const vaultZ = interpolate(rackT, [0, 1], [-160, 72]);
  const vaultScale = interpolate(rackT, [0, 1], [0.74, 1]);
  const vaultOpacity = entrySpring * interpolate(rackT, [0, 1], [0.34, 1]);
  const vaultRotY = interpolate(rackT, [0, 1], [-5, -3.5]);

  // Live 2-Way Chat message progression (all settle well BEFORE f=3450 / local 348f / O+216f!)
  const msg1Spring =
    frame >= O + 36
      ? spring({ frame: frame - (O + 36), fps: safeFps, config: LUXURY_SPRING })
      : 0;
  const msg2Spring =
    frame >= O + 86
      ? spring({ frame: frame - (O + 86), fps: safeFps, config: LUXURY_SPRING })
      : 0;
  const liveToastSpring =
    frame >= O + 146
      ? spring({ frame: frame - (O + 146), fps: safeFps, config: LUXURY_SPRING })
      : 0;
  const slaCompleted = frame >= O + 124;

  // Act 2 Privacy Shield Unlock Visor glides upward (`460..514f` -> open before Act 2 settles)
  const shieldLiftProgress = interpolate(frame, [O + 328, O + 382], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const shieldTranslateY = interpolate(shieldLiftProgress, [0, 1], [0, -112]);
  const pickupStepsProgress = interpolate(frame, [O + 354, O + 406], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  const laserCycle = ((frame - (O + 372)) % 72 + 72) % 72;
  const laserY = interpolate(laserCycle, [0, 36, 72], [12, 156, 12]);
  const liveDotScale = 0.86 + Math.sin(timeSec * 4.8) * 0.16;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.kebajikan.tint} />

      <Module3DIntroBumper
        moduleIndex="MODUL 06"
        moduleCategory="KEBAJIKAN & FOOD BANK"
        moduleName="E-Kebajikan"
        tagline="Tiket 2-Hala & Bantuan Food Bank Rahsia"
        morphMode="split-twin-pillars"
        accentColor={LAUNCH_MODULE_THEMES.kebajikan.primary}
        darkColor={LAUNCH_MODULE_THEMES.kebajikan.dark}
        softColor={LAUNCH_MODULE_THEMES.kebajikan.soft}
        borderColor={LAUNCH_MODULE_THEMES.kebajikan.border}
        secondaryAccentColor={AMBER}
        secondaryDarkColor={AMBER_DARK}
        icon={<Lock size={96} color="#FFFFFF" strokeWidth={2.1} />}
        features={[
          { icon: <Wrench size={15} strokeWidth={2.4} />, label: 'Dalam & Luar Kampus' },
          { icon: <MessageSquare size={15} strokeWidth={2.4} />, label: 'Direct Chat JPP' },
          { icon: <Package size={15} strokeWidth={2.4} />, label: 'Food Bank QR' },
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
            accentColor={TEAL}
            secondaryColor={AMBER}
            gridOpacity={0.2}
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
              zIndex: 12,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1240 }}>
              <KineticReveal startFrame={O + 4} durationFrames={18}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 14px',
                    borderRadius: 999,
                    backgroundColor: rackT > 0.5 ? AMBER_SOFT : TEAL_SOFT,
                    border: `1.5px solid ${rackT > 0.5 ? AMBER_BORDER : TEAL_BORDER}`,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: rackT > 0.5 ? AMBER : TEAL,
                      transform: `scale(${liveDotScale.toFixed(3)})`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: '0.14em',
                      color: rackT > 0.5 ? AMBER_INK : TEAL_INK,
                    }}
                  >
                    BAB 06 • E-KEBAJIKAN &amp; FOOD BANK • JAMINAN {safeSlaLabel}
                  </span>
                </div>
              </KineticReveal>

              <KineticWords
                as="h1"
                text={resolvedHeadline}
                startFrame={O + 8}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['Food', 'Bank?', 'Kami', 'Ada.']}
                accentColor={rackT > 0.5 ? AMBER_INK : TEAL_INK}
                style={{
                  margin: 0,
                  fontSize: 42,
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
                  backgroundColor: rackT > 0.5 ? VAULT_OBSIDIAN : LAUNCH_PALETTE.CARD_BG,
                  border: `1.5px solid ${rackT > 0.5 ? AMBER : TEAL_BORDER}`,
                  boxShadow: '0 12px 26px rgba(6, 23, 20, 0.1)',
                }}
              >
                <ShieldCheck
                  size={18}
                  color={rackT > 0.5 ? AMBER : TEAL_INK}
                  strokeWidth={2.5}
                />
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: '0.07em',
                    color: rackT > 0.5 ? '#FFFBEB' : LAUNCH_PALETTE.PRIMARY,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {rackT > 0.5
                    ? 'MOD PRIVASI SISWA AKTIF ✓'
                    : `TIKET #${safeTicketNo} • LIVE CHAT 2-HALA`}
                </span>
              </div>
            </KineticReveal>
          </div>

          {/* 3D Spatial Rack-Focus Stage */}
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
            {/* HERO 1: Smart Ticket Status & 2-Way Direct Officer Live Chat (1060x580) */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 1060,
                height: 580,
                transformStyle: 'preserve-3d',
                opacity: ticketOpacity,
                zIndex: rackT < 0.5 ? 10 : 4,
                transform: `translate(-50%, -50%) translate3d(${ticketX.toFixed(1)}px, ${ticketY.toFixed(1)}px, ${ticketZ.toFixed(1)}px) rotateX(2deg) rotateY(${ticketRotY.toFixed(2)}deg) scale(${ticketScale.toFixed(4)})`,
              }}
            >
              <KineticWindow
                surface="light"
                routeLabel={`/portal/kebajikan/tiket/${safeTicketNo.toLowerCase()}`}
                statusPill={slaCompleted ? '100% SELESAI & DISANTUNI' : `SLA ${safeSlaLabel}`}
                statusAccent
                accentColor={slaCompleted ? EMERALD : TEAL}
                accentSoftBg={slaCompleted ? EMERALD_SOFT : TEAL_SOFT}
                accentBorderColor={slaCompleted ? EMERALD_BORDER : TEAL_BORDER}
                width={1060}
                height={580}
                sheenStartFrame={O + 150}
                sheenDuration={36}
                style={{
                  borderBottom: `7px solid ${slaCompleted ? EMERALD : TEAL}`,
                  boxShadow: '0 34px 76px rgba(15, 118, 110, 0.16)',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    flex: 1,
                    padding: '18px 24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  {/* Top Scope Banner: Dalam & Luar Kampus + No Dead Form Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      paddingBottom: 12,
                      borderBottom: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 999,
                          backgroundColor: TEAL_SOFT,
                          border: `1.5px solid ${TEAL_BORDER}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 900,
                          color: TEAL_INK,
                        }}
                      >
                        <Building2 size={13} strokeWidth={2.5} />
                        DALAM KAMPUS (Kamsis &amp; Fasiliti)
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 999,
                          backgroundColor: EMERALD_SOFT,
                          border: `1.5px solid ${EMERALD_BORDER}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 900,
                          color: EMERALD_INK,
                        }}
                      >
                        <Home size={13} strokeWidth={2.5} />
                        LUAR KAMPUS (Rumah Sewa &amp; Kecemasan Luar)
                      </span>
                    </div>

                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        backgroundColor: VAULT_OBSIDIAN,
                        color: '#5EEAD4',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: '0.07em',
                      }}
                    >
                      BUKAN BORANG SENYAP • STATUS MASA NYATA
                    </span>
                  </div>

                  {/* Two-Column Body: Left Ticket Status & Officer | Right Live 2-Way Direct Chat */}
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: '0.88fr 1.12fr',
                      gap: 18,
                    }}
                  >
                    {/* LEFT COLUMN: Real-Time Status & Assigned Officer */}
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: 20,
                        backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                        border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 900,
                            color: TEAL_INK,
                          }}
                        >
                          TIKET #{safeTicketNo} • TINDAKAN PANTAS
                        </span>
                        <span
                          style={{
                            fontSize: 17.5,
                            fontWeight: 900,
                            lineHeight: 1.2,
                            color: LAUNCH_PALETTE.PRIMARY,
                          }}
                        >
                          Paip Sink &amp; Suis Kipas Blok B-204 Kamsis
                        </span>
                      </div>

                      {/* Assigned Officer Strip */}
                      <div
                        style={{
                          padding: '9px 12px',
                          borderRadius: 14,
                          backgroundColor: '#FFFFFF',
                          border: `1.5px solid ${TEAL_BORDER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ShieldCheck size={16} color={TEAL_INK} strokeWidth={2.5} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 12, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                              En. Hafiz &amp; Exco Kebajikan JPP
                            </span>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                              Pegawai Kebajikan Bertugas
                            </span>
                          </div>
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10,
                            fontWeight: 900,
                            color: EMERALD_INK,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 999,
                              backgroundColor: EMERALD,
                              transform: `scale(${liveDotScale.toFixed(3)})`,
                            }}
                          />
                          AKTIF
                        </span>
                      </div>

                      {/* Vertical Status Spine + 4 Steps */}
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <EvolvingPath
                          d="M 13 10 L 13 94"
                          width={26}
                          height={104}
                          startFrame={O + 24}
                          durationFrames={100}
                          stroke={TEAL}
                          strokeWidth={3.5}
                          trackStroke="rgba(20, 184, 166, 0.22)"
                          hideDotWhenComplete
                          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
                        />
                        {KAMSIS_STAGES.map((stage, idx) => {
                          const reached = frame >= stage.reachFrame;
                          const isFinal = idx === KAMSIS_STAGES.length - 1;
                          return (
                            <div
                              key={stage.code}
                              style={{
                                paddingLeft: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                  style={{
                                    position: 'absolute',
                                    left: 4,
                                    width: 18,
                                    height: 18,
                                    borderRadius: 999,
                                    backgroundColor: reached
                                      ? isFinal
                                        ? EMERALD_INK
                                        : TEAL_INK
                                      : LAUNCH_PALETTE.TERTIARY,
                                    color: '#FFFFFF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {reached ? <Check size={11} strokeWidth={3} /> : null}
                                </span>
                                <span
                                  style={{
                                    fontSize: 13.5,
                                    fontWeight: reached ? 900 : 700,
                                    color: reached ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.INK_SOFT,
                                  }}
                                >
                                  {stage.title}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  color: reached ? TEAL_INK : LAUNCH_PALETTE.INK_SOFT,
                                }}
                              >
                                {stage.meta}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Live 2-Way Direct Chat Thread (KebajikanStudentChat.tsx) */}
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: 20,
                        backgroundColor: '#FFFFFF',
                        border: `1.5px solid ${TEAL_BORDER}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <MessageSquare size={15} color={TEAL_INK} strokeWidth={2.5} />
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 900,
                              letterSpacing: '0.09em',
                              color: TEAL_INK,
                            }}
                          >
                            RUANG LIVE CHAT 2-HALA TERUS DI TIKET
                          </span>
                        </div>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: 999,
                            backgroundColor: EMERALD_SOFT,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 10,
                            fontWeight: 900,
                            color: EMERALD_INK,
                          }}
                        >
                          SEGERA DIBALAS
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
                        {/* Student Message Bubble (Right) */}
                        <div
                          style={{
                            alignSelf: 'flex-end',
                            maxWidth: '88%',
                            padding: '11px 14px',
                            borderRadius: '18px 18px 4px 18px',
                            backgroundColor: LAUNCH_PALETTE.SECONDARY,
                            color: '#FFFFFF',
                            opacity: msg1Spring,
                            transform: `translate3d(0px, ${((1 - msg1Spring) * 16).toFixed(1)}px, 0px)`,
                          }}
                        >
                          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, lineHeight: 1.38 }}>
                            Salam JPP, saya dah hantar aduan #{safeTicketNo}. Kalau kes dekat rumah sewa luar kampus pun boleh adu di sini ke?
                          </p>
                          <span
                            style={{
                              display: 'block',
                              textAlign: 'right',
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 9.5,
                              opacity: 0.85,
                              marginTop: 4,
                            }}
                          >
                            09:15 AM • Dibaca Exco ✓✓
                          </span>
                        </div>

                        {/* Exco & Officer Verified Reply Bubble (Left) */}
                        <div
                          style={{
                            alignSelf: 'flex-start',
                            maxWidth: '90%',
                            padding: '11px 14px',
                            borderRadius: '18px 18px 18px 4px',
                            backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                            border: `1.5px solid ${TEAL_BORDER}`,
                            color: LAUNCH_PALETTE.PRIMARY,
                            opacity: msg2Spring,
                            transform: `translate3d(0px, ${((1 - msg2Spring) * 16).toFixed(1)}px, 0px)`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <ShieldCheck size={13} color={TEAL_INK} strokeWidth={2.6} />
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 10,
                                fontWeight: 900,
                                color: TEAL_INK,
                              }}
                            >
                              EXCO KEBAJIKAN JPP &amp; PEGAWAI
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, lineHeight: 1.38 }}>
                            Waalaikumussalam Aiman! Ya, dalam Kamsis ATAU rumah sewa luar Politeknik semua kami jaga. Juruteknik &amp; Exco dah bergerak ke lokasi awak sekarang ✓
                          </p>
                        </div>

                        {/* Live Status Resolution Toast Inside Thread */}
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: 14,
                            backgroundColor: EMERALD_INK,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            opacity: liveToastSpring,
                            transform: `scale(${(0.94 + 0.06 * liveToastSpring).toFixed(4)})`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Zap size={15} color="#A7F3D0" strokeWidth={2.6} />
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            >
                              STATUS DIKEMAS KINI LANGSUNG: SELESAI DALAM 06j 36m ✓
                            </span>
                          </div>
                          <Clock size={14} color="#A7F3D0" strokeWidth={2.5} />
                        </div>
                      </div>

                      {/* Mock Chat Input Bar */}
                      <div
                        style={{
                          padding: '8px 10px 8px 14px',
                          borderRadius: 14,
                          backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                          border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: LAUNCH_PALETTE.INK_SOFT }}>
                          Taip mesej terus kepada Exco JPP &amp; Pegawai...
                        </span>
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 9,
                            backgroundColor: TEAL_DARK,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Send size={13} color="#FFFFFF" strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </KineticWindow>

              <GeometricSparkBurst
                triggerFrame={O + 150}
                x={840}
                y={340}
                durationFrames={34}
                radius={108}
                count={12}
                seed="kebajikan-sla-done"
                colors={[TEAL, EMERALD, '#FFFFFF']}
              />
            </div>

            {/* HERO 2: Confidential Food Bank Vault */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 980,
                height: 572,
                transformStyle: 'preserve-3d',
                opacity: vaultOpacity,
                zIndex: rackT >= 0.5 ? 11 : 4,
                transform: `translate(-50%, -50%) translate3d(${vaultX.toFixed(1)}px, ${vaultY.toFixed(1)}px, ${vaultZ.toFixed(1)}px) rotateX(3deg) rotateY(${vaultRotY.toFixed(2)}deg) scale(${vaultScale.toFixed(4)})`,
              }}
            >
              <KineticWindow
                surface="dark"
                routeLabel="/portal/kebajikan/food-bank"
                statusPill="MOD PRIVASI SISWA AKTIF"
                statusAccent
                accentColor={AMBER}
                accentSoftBg="rgba(245, 158, 11, 0.22)"
                accentBorderColor={AMBER_BORDER}
                width={980}
                height={572}
                sheenStartFrame={O + 382}
                sheenDuration={38}
                style={{
                  backgroundColor: VAULT_OBSIDIAN,
                  border: `2px solid ${AMBER}`,
                  borderBottom: `7px solid ${AMBER_DARK}`,
                  boxShadow: '0 36px 84px rgba(6, 23, 20, 0.36)',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    flex: 1,
                    padding: '24px 30px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 15,
                          backgroundColor: 'rgba(245, 158, 11, 0.2)',
                          border: `1.5px solid ${AMBER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Package size={24} color={AMBER_BORDER} strokeWidth={2.3} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: '0.11em',
                            color: AMBER_BORDER,
                          }}
                        >
                          PAKEJ FOOD BANK #FB-2026-119 • SULIT 100%
                        </span>
                        <span style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF' }}>
                          Pek Keperluan Asas Mahasiswa · Loker Privasi B2
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '8px 14px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        border: `1.5px solid ${EMERALD}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11.5,
                        fontWeight: 900,
                        color: EMERALD_BORDER,
                      }}
                    >
                      <Lock size={13} color={EMERALD_BORDER} strokeWidth={2.6} />
                      TANPA NAMA DIPAPAR
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 0.8fr',
                      gap: 24,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {FOOD_BANK_STEPS.map((step) => {
                        const active = pickupStepsProgress >= step.threshold;
                        return (
                          <div
                            key={step.label}
                            style={{
                              padding: '13px 16px',
                              borderRadius: 16,
                              backgroundColor: active
                                ? 'rgba(246, 251, 249, 0.1)'
                                : 'rgba(246, 251, 249, 0.04)',
                              border: `1.5px solid ${active ? AMBER : 'rgba(184, 228, 220, 0.22)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                              <CheckCircle2
                                size={18}
                                color={active ? EMERALD_BORDER : 'rgba(255,255,255,0.38)'}
                                strokeWidth={2.5}
                              />
                              <span style={{ fontSize: 16.5, fontWeight: 900, color: '#FFFFFF' }}>
                                {step.label}
                              </span>
                            </div>
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 12,
                                fontWeight: 800,
                                color: AMBER_BORDER,
                              }}
                            >
                              {step.subLabel}
                            </span>
                          </div>
                        );
                      })}

                      <div
                        style={{
                          padding: '11px 16px',
                          borderRadius: 14,
                          backgroundColor: 'rgba(245, 158, 11, 0.14)',
                          border: `1px solid ${AMBER_BORDER}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                        }}
                      >
                        <MapPin size={16} color={AMBER_BORDER} strokeWidth={2.4} />
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFBEB' }}>
                          Ambil Sendiri di Loker Pintar Kafeteria • Tiada Kaunter Beratur
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '18px 20px',
                        borderRadius: 22,
                        backgroundColor: '#FFFBEB',
                        border: `2px solid ${AMBER}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          padding: 12,
                          borderRadius: 16,
                          backgroundColor: '#FFFFFF',
                          border: `1.5px solid ${AMBER_BORDER}`,
                          overflow: 'hidden',
                        }}
                      >
                        <DeterministicQrMatrix
                          seed={119}
                          size={164}
                          fgColor={VAULT_OBSIDIAN}
                          bgColor="#FFFFFF"
                        />
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            left: 8,
                            right: 8,
                            top: laserY,
                            height: 3.5,
                            borderRadius: 999,
                            backgroundColor: AMBER,
                            boxShadow: '0 0 12px rgba(245, 158, 11, 0.85)',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <QrCode size={14} color={AMBER_INK} strokeWidth={2.5} />
                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 12,
                            fontWeight: 900,
                            color: VAULT_OBSIDIAN,
                          }}
                        >
                          IMBAS LOKER #B2 • SULIT
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '13px 20px',
                      borderRadius: 16,
                      backgroundColor: AMBER_DARK,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Sparkles size={17} color="#FFFBEB" strokeWidth={2.5} />
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 13,
                          fontWeight: 900,
                          letterSpacing: '0.09em',
                        }}
                      >
                        ✓ SEDIA DIAMBIL TANPA NAMA DIPAPAR • MARUAH SISWA TERJAGA
                      </span>
                    </div>
                    <EditorialAnnotation
                      type="highlight"
                      startFrame={O + 390}
                      durationFrames={22}
                      color="rgba(255, 255, 255, 0.25)"
                    >
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        24/7 AKTIF
                      </span>
                    </EditorialAnnotation>
                  </div>

                  {shieldLiftProgress < 0.999 ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: VAULT_OBSIDIAN,
                        border: `2px solid ${AMBER}`,
                        borderBottom: `4px solid ${AMBER}`,
                        boxShadow: '0 24px 48px rgba(245, 158, 11, 0.28)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 14,
                        transform: `perspective(1200px) translate3d(0px, ${shieldTranslateY.toFixed(2)}%, ${(shieldLiftProgress * 36).toFixed(1)}px) rotateX(${(shieldLiftProgress * 18).toFixed(2)}deg)`,
                        transformOrigin: 'top center',
                        zIndex: 18,
                      }}
                    >
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 6,
                          background: `linear-gradient(90deg, transparent 0%, ${AMBER} 50%, transparent 100%)`,
                          opacity: 0.45 + shieldLiftProgress * 0.55,
                        }}
                      />
                      <div
                        style={{
                          width: 78,
                          height: 78,
                          borderRadius: 24,
                          backgroundColor: 'rgba(245, 158, 11, 0.2)',
                          border: `2px solid ${AMBER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Lock size={38} color={AMBER_BORDER} strokeWidth={2.4} />
                      </div>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 14,
                          fontWeight: 900,
                          letterSpacing: '0.16em',
                          color: AMBER_BORDER,
                        }}
                      >
                        MOD PRIVASI SISWA • IDENTITI 100% DILINDUNGI
                      </span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>
                        Membuka Loker Pengambilan Tanpa Nama...
                      </span>
                    </div>
                  ) : null}
                </div>
              </KineticWindow>

              <GeometricSparkBurst
                triggerFrame={O + 388}
                x={680}
                y={280}
                durationFrames={34}
                radius={112}
                count={14}
                seed="foodbank-privacy-unlocked"
                colors={[AMBER, EMERALD, '#FFFBEB']}
              />
            </div>
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks
        chapterCode="06"
        chapterLabel="PRIHATIN SISWA • LIVE CHAT TIKET & FOOD BANK"
      />
    </>
  );
};

const welfareCareSchema = {
  ticketNo: { type: 'string', default: 'KBJ-0842', description: 'Sample Student Ticket Number' },
  slaLabel: { type: 'string', default: '< 48 JAM', description: 'Resolution Guarantee SLA' },
  headline: {
    type: 'string',
    default: STUDENT_HEADLINE_DEFAULT,
    description: 'Headline',
  },
} as const satisfies InteractivitySchema;

export const WelfareCareScene = Interactive.withSchema({
  Component: WelfareCareInner,
  componentName: 'WelfareCareScene',
  schema: welfareCareSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
