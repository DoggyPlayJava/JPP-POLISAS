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
  Clock,
  Lock,
  MapPin,
  Package,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wrench,
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
const TEAL_INK = '#0F766E'; // WCAG AA+ Teal-700
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
  readonly badge: string;
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
  { code: '01', title: 'Laporan Dihantar', meta: '09:14 AM · Portal Pelajar', badge: 'DITERIMA', reachFrame: O + 34 },
  { code: '02', title: 'Disahkan JPP', meta: '09:42 AM · Semakan Segera', badge: 'AKTIF', reachFrame: O + 64 },
  { code: '03', title: 'Juruteknik Tiba', meta: '11:15 AM · Blok B-204 Kamsis', badge: 'TINDAKAN', reachFrame: O + 94 },
  { code: '04', title: 'Selesai < 48 Jam', meta: '03:50 PM · Bilik Sedia & Selesa', badge: 'SELESAI ✓', reachFrame: O + 126 },
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

  // Act 1 -> Act 2 Rack-Focus Spatial Shift (O+270 .. O+330 = 402..462f)
  const rackT = interpolate(frame, [O + 270, O + 330], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });

  // Entrance Spring for Act 1
  const entrySpring = spring({
    frame: Math.max(0, frame - (O + 6)),
    fps: safeFps,
    config: LUXURY_SPRING,
  });

  // Card 1: Kamsis Repair Stage
  const kamsisX = interpolate(rackT, [0, 1], [-58, -510]);
  const kamsisY = interpolate(rackT, [0, 1], [0, 20]) + (1 - entrySpring) * 28;
  const kamsisZ = interpolate(rackT, [0, 1], [58, -155]);
  const kamsisScale = interpolate(rackT, [0, 1], [1, 0.72]);
  const kamsisOpacity = entrySpring * interpolate(rackT, [0, 1], [1, 0.38]);
  const kamsisRotY = interpolate(rackT, [0, 1], [3, 5]);

  // Card 2: Confidential Food Bank Vault
  const vaultX = interpolate(rackT, [0, 1], [510, 48]);
  const vaultY = interpolate(rackT, [0, 1], [22, 0]) + (1 - entrySpring) * 32;
  const vaultZ = interpolate(rackT, [0, 1], [-155, 72]);
  const vaultScale = interpolate(rackT, [0, 1], [0.74, 1]);
  const vaultOpacity = entrySpring * interpolate(rackT, [0, 1], [0.36, 1]);
  const vaultRotY = interpolate(rackT, [0, 1], [-5, -4]);

  // Act 1 SLA Stopwatch Orb pops beside Stage 04 around O+128f
  const stopwatchSpring = spring({
    frame: Math.max(0, frame - (O + 130)),
    fps: safeFps,
    config: LUXURY_SPRING,
  });
  const slaCompleted = frame >= O + 126;

  // Act 2 Privacy Shield Unlock Visor glides upward (456..510f -> 100% open well before f_3650 / local 548f!)
  const shieldLiftProgress = interpolate(frame, [O + 324, O + 378], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const shieldTranslateY = interpolate(shieldLiftProgress, [0, 1], [0, -112]);
  const pickupStepsProgress = interpolate(frame, [O + 350, O + 402], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Live Amber laser beam over confidential Food Bank QR pass
  const laserCycle = ((frame - (O + 370)) % 72 + 72) % 72;
  const laserY = interpolate(laserCycle, [0, 36, 72], [12, 156, 12]);
  const liveDotScale = 0.86 + Math.sin(timeSec * 4.8) * 0.16;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.kebajikan.tint} />

      <Module3DIntroBumper
        moduleIndex="MODUL 06"
        moduleCategory="KEBAJIKAN & FOOD BANK"
        moduleName="E-Kebajikan"
        tagline="Aduan Kamsis Pantas & Bantuan Food Bank"
        accentColor={LAUNCH_MODULE_THEMES.kebajikan.primary}
        darkColor={LAUNCH_MODULE_THEMES.kebajikan.dark}
        softColor={LAUNCH_MODULE_THEMES.kebajikan.soft}
        borderColor={LAUNCH_MODULE_THEMES.kebajikan.border}
        icon={<Lock size={96} color="#FFFFFF" strokeWidth={2.1} />}
        features={[
          { icon: <Wrench size={15} strokeWidth={2.4} />, label: 'SLA < 48 Jam' },
          { icon: <Lock size={15} strokeWidth={2.4} />, label: '100% Privasi' },
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
            top: 74,
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
                fontSize: 44,
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
                {rackT > 0.5 ? 'MOD PRIVASI SISWA AKTIF ✓' : `TIKET #${safeTicketNo} • SLA ${safeSlaLabel}`}
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
          {/* HERO 1: 3D Z-Stepping Kamsis Repair Stage (980x572) */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 980,
              height: 572,
              transformStyle: 'preserve-3d',
              opacity: kamsisOpacity,
              zIndex: rackT < 0.5 ? 10 : 4,
              transform: `translate(-50%, -50%) translate3d(${kamsisX.toFixed(1)}px, ${kamsisY.toFixed(1)}px, ${kamsisZ.toFixed(1)}px) rotateX(2deg) rotateY(${kamsisRotY.toFixed(2)}deg) scale(${kamsisScale.toFixed(4)})`,
            }}
          >
            <KineticWindow
              surface="light"
              routeLabel="/portal/kebajikan/kamsis"
              statusPill={slaCompleted ? '100% SELESAI & DISANTUNI' : `SLA ${safeSlaLabel}`}
              statusAccent
              accentColor={slaCompleted ? EMERALD : TEAL}
              accentSoftBg={slaCompleted ? EMERALD_SOFT : TEAL_SOFT}
              accentBorderColor={slaCompleted ? EMERALD_BORDER : TEAL_BORDER}
              width={980}
              height={572}
              sheenStartFrame={O + 130}
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
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Ticket Header + Floating SLA Stopwatch Orb */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: TEAL_SOFT,
                        border: `1.5px solid ${TEAL_BORDER}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Wrench size={24} color={TEAL_INK} strokeWidth={2.4} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 12,
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          color: TEAL_INK,
                        }}
                      >
                        TIKET KAMSIS #{safeTicketNo} • PEMBAIKAN FASILITI
                      </span>
                      <span
                        style={{
                          fontSize: 23,
                          fontWeight: 900,
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        Paip Sink &amp; Suis Kipas Blok B-204 Kamsis
                      </span>
                    </div>
                  </div>

                  {/* Floating SLA Stopwatch Orb */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      borderRadius: 18,
                      backgroundColor: slaCompleted ? EMERALD_INK : TEAL_SOFT,
                      border: `2px solid ${slaCompleted ? EMERALD : TEAL_BORDER}`,
                      color: slaCompleted ? '#FFFFFF' : TEAL_INK,
                      boxShadow: '0 16px 32px rgba(4, 120, 87, 0.22)',
                      transform: `translateZ(${(24 * stopwatchSpring).toFixed(1)}px) scale(${(0.92 + 0.08 * stopwatchSpring).toFixed(4)})`,
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={18} strokeWidth={2.5} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: 1.05,
                        }}
                      >
                        06j 36m
                      </span>
                      <span
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 9.5,
                          fontWeight: 800,
                          opacity: 0.9,
                        }}
                      >
                        7x LEBIH PANTAS SLA
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Upright Stepping SLA Timeline Cards + Teal EvolvingPath Spine */}
                <div
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 14,
                    paddingTop: 10,
                    paddingBottom: 8,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Animated Teal SVG Spine Running Across the 4 Cards */}
                  <EvolvingPath
                    d="M 60 88 L 860 88"
                    width={924}
                    height={176}
                    startFrame={O + 26}
                    durationFrames={96}
                    stroke={TEAL}
                    strokeWidth={5}
                    trackStroke="rgba(20, 184, 166, 0.2)"
                    headDotColor="#FFFFFF"
                    headDotRadius={7}
                    hideDotWhenComplete
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />

                  {KAMSIS_STAGES.map((stage, idx) => {
                    const reached = frame >= stage.reachFrame;
                    const stageSpring = reached
                      ? spring({
                          frame: frame - stage.reachFrame,
                          fps: safeFps,
                          config: LUXURY_SPRING,
                        })
                      : 0;
                    const zElevate = reached ? 18 + stageSpring * 22 : 0;
                    const scalePop = reached ? 1 + 0.03 * stageSpring : 0.96;
                    const isFinal = idx === KAMSIS_STAGES.length - 1;
                    return (
                      <div
                        key={stage.code}
                        style={{
                          position: 'relative',
                          padding: '18px 16px',
                          borderRadius: 20,
                          backgroundColor: reached ? '#FFFFFF' : LAUNCH_PALETTE.BACKGROUND,
                          border: `2px solid ${
                            reached
                              ? isFinal
                                ? EMERALD
                                : TEAL
                              : LAUNCH_PALETTE.TERTIARY
                          }`,
                          borderBottom: `6px solid ${
                            reached
                              ? isFinal
                                ? EMERALD_INK
                                : TEAL_DARK
                              : LAUNCH_PALETTE.SECONDARY
                          }`,
                          boxShadow: reached
                            ? '0 22px 42px rgba(15, 118, 110, 0.16)'
                            : '0 8px 16px rgba(6, 23, 20, 0.06)',
                          transform: `translateZ(${zElevate.toFixed(1)}px) scale(${scalePop.toFixed(4)})`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 12,
                          minHeight: 196,
                          zIndex: reached ? 4 : 2,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 999,
                              backgroundColor: reached
                                ? isFinal
                                  ? EMERALD_INK
                                  : TEAL_INK
                                : LAUNCH_PALETTE.TERTIARY,
                              color: '#FFFFFF',
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 12,
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {reached ? <Check size={15} strokeWidth={3} /> : stage.code}
                          </span>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 999,
                              backgroundColor: reached
                                ? isFinal
                                  ? EMERALD_SOFT
                                  : TEAL_SOFT
                                : LAUNCH_PALETTE.SURFACE_MUTED,
                              color: reached
                                ? isFinal
                                  ? EMERALD_INK
                                  : TEAL_INK
                                : LAUNCH_PALETTE.INK_SOFT,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 9.5,
                              fontWeight: 900,
                            }}
                          >
                            {stage.badge}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span
                            style={{
                              fontSize: 18,
                              fontWeight: 900,
                              lineHeight: 1.2,
                              color: LAUNCH_PALETTE.PRIMARY,
                            }}
                          >
                            {stage.title}
                          </span>
                          <span
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: LAUNCH_PALETTE.INK_SOFT,
                            }}
                          >
                            {stage.meta}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Verified Resolution Ribbon */}
                <div
                  style={{
                    padding: '14px 20px',
                    borderRadius: 16,
                    backgroundColor: slaCompleted ? EMERALD_INK : TEAL_INK,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                      100% SELESAI &amp; DISANTUNI • REKOD ADUAN TELUS
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '4px 11px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    SLA {safeSlaLabel} DIPATUHI
                  </span>
                </div>
              </div>
            </KineticWindow>

            <GeometricSparkBurst
              triggerFrame={O + 132}
              x={820}
              y={320}
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
                {/* Top Header inside Food Bank Vault */}
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

                {/* Inner Unlocked Content Grid: Pickup Steps + Amber QR Pass */}
                <div
                  style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 0.8fr',
                    gap: 24,
                    alignItems: 'center',
                  }}
                >
                  {/* Left: 3-Step Confidential Pickup Flow */}
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

                  {/* Right: High-Contrast Anonymous QR Pickup Pass */}
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

                {/* Bottom Confirmed Badge */}
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

                {/* OPAQUE 3D PRIVACY SHIELD VISOR (lifts smoothly 456..510f; matte solid surface) */}
                {shieldLiftProgress < 0.999 ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: VAULT_OBSIDIAN,
                      border: `2px solid ${AMBER}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 14,
                      transform: `translate3d(0px, ${shieldTranslateY.toFixed(2)}%, 0px)`,
                      zIndex: 18,
                    }}
                  >
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
              triggerFrame={O + 384}
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
        chapterLabel="PRIHATIN SISWA • ADUAN KAMSIS & FOOD BANK"
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
