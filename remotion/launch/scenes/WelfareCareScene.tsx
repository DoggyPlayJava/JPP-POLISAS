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
  Calendar,
  Check,
  Clock,
  MapPin,
  Package,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';
import { DeterministicQrMatrix, KineticWindow, SpatialFloorGrid } from '../ui/KineticCard';

const TEAL = LAUNCH_MODULE_THEMES.kebajikan.primary; // #14B8A6
const TEAL_DARK = LAUNCH_MODULE_THEMES.kebajikan.dark; // #0D9488
const TEAL_INK = '#0F766E'; // WCAG AA+ Teal-700 for white text badges & physical 3D platform depth lip
const TEAL_SOFT = LAUNCH_MODULE_THEMES.kebajikan.soft; // #F0FDFA
const TEAL_BORDER = LAUNCH_MODULE_THEMES.kebajikan.border; // #99F6E4

const AMBER = LAUNCH_MODULE_THEMES.foodbank.primary; // #F59E0B
const AMBER_DARK = LAUNCH_MODULE_THEMES.foodbank.dark; // #D97706
const AMBER_INK = '#B45309';
const AMBER_SOFT = LAUNCH_MODULE_THEMES.foodbank.soft; // #FFFBEB
const AMBER_BORDER = LAUNCH_MODULE_THEMES.foodbank.border; // #FDE68A

export type WelfareCareProps = {
  readonly ticketNo: string;
  readonly slaLabel: string;
  readonly headline: string;
};

type ComplaintStageSpec = {
  readonly title: string;
  readonly meta: string;
  readonly badge: string;
};

type FoodBankStepSpec = {
  readonly label: string;
  readonly subLabel: string;
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

const STAGES: readonly ComplaintStageSpec[] = [
  { title: 'Laporan Dihantar', meta: '09:14 AM · Portal Pelajar', badge: 'DITERIMA' },
  { title: 'Diterima JPP', meta: '09:42 AM · Semakan Serta-Merta', badge: 'DISAHKAN' },
  { title: 'Juruteknik Dalam Perjalanan', meta: '11:15 AM · Blok B-204 Kamsis', badge: 'TINDAKAN' },
  { title: 'Selesai < 48 Jam ✓', meta: '03:50 PM · Bilik Sedia & Selesa', badge: 'SELESAI ✓' },
];

const FOOD_BANK_STEPS: readonly FoodBankStepSpec[] = [
  { label: 'Dimohon ✓', subLabel: '08:40 AM' },
  { label: 'Diluluskan ✓', subLabel: '09:05 AM' },
  { label: 'Sedia Diambil ✓', subLabel: 'Kaunter Rahsia' },
];

const PICKUP_SCHEDULE = [
  { label: 'Tarikh', value: 'Hari Ini', kind: 'date' as const },
  { label: 'Slot Masa', value: '2:00 PM – 4:00 PM', kind: 'time' as const },
  { label: 'Lokasi', value: 'Bilik Gerakan JPP', kind: 'location' as const },
];

const MANIFEST_ITEMS = ['Beras 5kg', 'Minyak Masak', 'Biskut Kering', 'Pek Minuman'] as const;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const SPINE_EASING = Easing.bezier(0.37, 0, 0.63, 1);
const TIMER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const SHEEN_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

// Isometric 4-platform escalator Z-tiers well inside safe perspective bounds
const ESCALATOR_BASE_Z = [16, 40, 66, 92] as const;

const renderScheduleIcon = (kind: (typeof PICKUP_SCHEDULE)[number]['kind']) => {
  switch (kind) {
    case 'date':
      return <Calendar size={14} color={AMBER} strokeWidth={2.4} />;
    case 'time':
      return <Clock size={14} color={AMBER} strokeWidth={2.4} />;
    case 'location':
      return <MapPin size={14} color={TEAL} strokeWidth={2.4} />;
  }
};

const WelfareCareInner: React.FC<WelfareCareProps> = ({
  ticketNo,
  slaLabel,
  headline,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const timeSec = frame / safeFps;

  const safeTicketNo = ticketNo.trim() || 'KBJ-0842';
  const safeSlaLabel = slaLabel.trim() || '< 48 JAM';
  const resolvedHeadline = resolveStudentHeadline(headline);

  // Beat 1 (0..1.4s): Centered Editorial Headline + Left Escalator Entry
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.36 * safeFps));
  const headlineStart = Math.round(0.08 * safeFps);
  const wordStagger = Math.max(2, Math.round(0.055 * safeFps));
  const wordDuration = Math.max(8, Math.round(0.34 * safeFps));
  const subStart = Math.round(0.35 * safeFps);
  const subDuration = Math.max(8, Math.round(0.35 * safeFps));

  const stageEnter = interpolate(frame, [Math.round(0.18 * safeFps), Math.round(0.75 * safeFps)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // 4 Isometric Platforms elevate step-by-step & lock solidly before Global f=1620 (Local f=180)
  const conduitStart = Math.round(0.42 * safeFps); // 25f
  const conduitDuration = Math.max(36, Math.round(1.65 * safeFps)); // 99f -> finishes 124f
  const stageTriggerFrames = [
    Math.round(0.42 * safeFps), // 25f
    Math.round(0.92 * safeFps), // 55f
    Math.round(1.42 * safeFps), // 85f
    Math.round(1.92 * safeFps), // 115f
  ] as const;

  const finalCompleteFrame = stageTriggerFrames[STAGES.length - 1];
  const allStagesComplete = frame >= finalCompleteFrame;

  const elapsedMinutes = Math.round(
    interpolate(frame, [conduitStart, finalCompleteFrame], [12, 396], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: TIMER_EASING,
    }),
  );
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedMins = elapsedMinutes % 60;
  const elapsedDisplay = `${String(elapsedHours).padStart(2, '0')}j ${String(elapsedMins).padStart(2, '0')}m`;

  const highlightStart = Math.round(1.78 * safeFps); // 107f
  const highlightDuration = Math.round(0.45 * safeFps); // 27f -> completed by 134f
  const sealStart = Math.round(2.3 * safeFps); // 138f -> stamps before Global 1620 (Local 180)
  const sealSpring =
    frame >= sealStart
      ? spring({
          frame: frame - sealStart,
          fps: safeFps,
          config: { damping: 14, stiffness: 235, mass: 0.85 },
        })
      : 0;
  const sealOpacity =
    frame >= sealStart
      ? interpolate(frame, [sealStart, sealStart + Math.round(0.18 * safeFps)], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const sealFloatY = Math.sin(timeSec * 2.1 + 0.6) * 2.5 * sealSpring;

  // Right Stage: Exploded 3-Plane Food Bank Vault (Base +20px, Shield +46px, QR Ration Token +54px Z)
  const vaultBaseStart = Math.round(0.42 * safeFps); // 25f
  const vaultProgress = interpolate(
    frame,
    [vaultBaseStart, vaultBaseStart + Math.round(0.65 * safeFps)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );
  const shieldStart = Math.round(1.45 * safeFps); // 87f
  const shieldSpring =
    frame >= shieldStart
      ? spring({
          frame: frame - shieldStart,
          fps: safeFps,
          config: { damping: 15, stiffness: 220, mass: 0.85 },
        })
      : 0;

  const tokenStart = Math.round(1.8 * safeFps); // 108f
  const tokenSpring =
    frame >= tokenStart
      ? spring({
          frame: frame - tokenStart,
          fps: safeFps,
          config: { damping: 15, stiffness: 205, mass: 0.9 },
        })
      : 0;
  const tokenFloatY = Math.sin(timeSec * 1.55) * 4 * tokenSpring;

  const scanBeamPeriod = Math.max(36, Math.round(1.65 * safeFps));
  const scanPhase = ((frame - tokenStart) % scanBeamPeriod) / scanBeamPeriod;
  const scanBeamY =
    frame >= tokenStart + 10 ? 12 + 124 * Math.sin(Math.max(0, scanPhase) * Math.PI) : 12;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.kebajikan.tint} />

      <CameraStage
        perspective={1500}
        zoomFrom={0.965}
        zoomTo={1.0}
        panXFrom={-4}
        panXTo={4}
        panYFrom={3}
        panYTo={-3}
        tiltXFrom={5}
        tiltXTo={2}
        tiltYFrom={-3.5}
        tiltYTo={3.5}
        breathingAmplitude={0.35}
        entryPanXOffset={-20}
        entryZoomOffset={-0.02}
        exitPanYDelta={-16}
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
          {/* 3D Perspective Architectural Floor Grid with Teal & Amber Radial Glows */}
          <SpatialFloorGrid accentColor={TEAL} secondaryColor={AMBER} gridOpacity={0.22} scrollSpeed={15} />

          {/* Beat 1: Centered Editorial Headline */}
          <div
            style={{
              position: 'absolute',
              left: 72,
              right: 72,
              top: 64,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 18px',
                  borderRadius: 999,
                  backgroundColor: TEAL_SOFT,
                  border: `1.5px solid ${TEAL}`,
                  color: TEAL_INK,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 12.5,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                }}
              >
                <ShieldCheck size={14} color={TEAL_INK} strokeWidth={2.5} />
                <span>PRIHATIN SISWA • ADUAN KAMSIS &amp; FOOD BANK</span>
              </div>
            </KineticReveal>

            <KineticWords
              as="h2"
              text={resolvedHeadline}
              startFrame={headlineStart}
              staggerFrames={wordStagger}
              wordDurationFrames={wordDuration}
              accentWords={['Kami', 'Ada.']}
              accentColor={TEAL_DARK}
              align="center"
              style={{
                margin: '10px 0 0',
                fontSize: 48,
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.07,
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            />

            <KineticReveal startFrame={subStart} durationFrames={subDuration}>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 16.5,
                  fontWeight: 500,
                  lineHeight: 1.4,
                  color: LAUNCH_PALETTE.INK_SOFT,
                }}
              >
                Jejak aduan kerosakan kamsis terus di telefon dan mohon bantuan Food Bank secara rahsia serta bermaruah.
              </p>
            </KineticReveal>
          </div>

          {/* SPLIT-LEVEL 3D CARE DIORAMA STAGE (y: 214..986) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 214,
              height: 760,
              perspective: '1450px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* LEFT STAGE: 3D Ascending 4-Step Isometric SLA Escalator (Inset Safe Bounds) */}
            <Interactive.Div
              name="Kebajikan 3D Isometric Escalator"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 164,
                top: 20,
                width: 690,
                height: 650,
                opacity: stageEnter,
                transformStyle: 'preserve-3d',
                transform: `translate3d(0px, ${((1 - stageEnter) * 24).toFixed(2)}px, 0px) rotateX(8deg) rotateY(8deg)`,
              }}
            >
              {/* Floating 3D Ticket Header Plate (+20px Z) */}
              <div
                style={{
                  position: 'relative',
                  left: 0,
                  top: 4,
                  width: 644,
                  padding: '13px 18px',
                  borderRadius: 20,
                  backgroundColor: '#FFFFFF',
                  border: `2px solid ${allStagesComplete ? TEAL : TEAL_BORDER}`,
                  boxShadow: '0 20px 42px rgba(15, 118, 110, 0.16), 0 8px 18px rgba(31, 39, 32, 0.08)',
                  borderBottom: `6px solid ${TEAL_INK}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  transformStyle: 'preserve-3d',
                  transform: 'translate3d(0px, 0px, 20px)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: '0.13em',
                      color: TEAL_INK,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        backgroundColor: TEAL,
                      }}
                    />
                    <span>E-KEBAJIKAN • JEJAK ADUAN KAMSIS</span>
                  </div>
                  <div style={{ fontSize: 19.5, fontWeight: 900, letterSpacing: '-0.025em', color: LAUNCH_PALETTE.PRIMARY }}>
                    TIKET #{safeTicketNo} •{' '}
                    <span style={{ fontSize: 15, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                      Kipas &amp; Lampu Blok B-204
                    </span>
                  </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, transformStyle: 'preserve-3d' }}>
                  <div
                    style={{
                      padding: '7px 12px',
                      borderRadius: 12,
                      backgroundColor: TEAL_SOFT,
                      border: `1.5px solid ${TEAL_BORDER}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 12.5,
                      fontWeight: 900,
                      color: LAUNCH_PALETTE.PRIMARY_DARK,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    SLA{' '}
                    <EditorialAnnotation
                      type="highlight"
                      startFrame={highlightStart}
                      durationFrames={highlightDuration}
                      color="rgba(20, 184, 166, 0.36)"
                      strokeWidth={11}
                      padding={3}
                      iterations={1}
                      seed={19}
                    >
                      <span style={{ fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY_DARK }}>
                        {safeSlaLabel}
                      </span>
                    </EditorialAnnotation>
                  </div>

                  {sealOpacity > 0.01 ? (
                    <div
                      style={{
                        padding: '7px 12px',
                        borderRadius: 11,
                        backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                        border: `2px solid ${TEAL}`,
                        color: '#FFFFFF',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: '0.07em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 20px 40px rgba(13, 148, 136, 0.3)',
                        opacity: sealOpacity,
                        transform: `translate3d(0px, ${sealFloatY.toFixed(2)}px, ${(62 * sealSpring).toFixed(2)}px) scale(${(0.92 + 0.08 * sealSpring).toFixed(4)})`,
                      }}
                    >
                      <Sparkles size={12} color={TEAL} strokeWidth={2.5} />
                      <span>SELESAI &lt; 48 JAM ✓</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Diagonal Teal Architectural EvolvingPath Conduit connecting Escalator Platforms */}
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 108,
                  width: 720,
                  height: 460,
                  pointerEvents: 'none',
                  transform: 'translate3d(0px, 0px, 10px)',
                }}
              >
                <EvolvingPath
                  d="M 32 34 L 60 134 L 88 234 L 116 334"
                  width={720}
                  height={460}
                  startFrame={conduitStart}
                  durationFrames={conduitDuration}
                  easing={SPINE_EASING}
                  stroke={TEAL}
                  trackStroke="rgba(153, 246, 228, 0.72)"
                  strokeWidth={4}
                  headDotColor={TEAL_INK}
                  headDotRadius={5}
                  hideDotWhenComplete={allStagesComplete}
                />
              </div>

              {/* 4 Physical Isometric Ascending Escalator Platforms */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 520,
                  marginTop: 18,
                  transformStyle: 'preserve-3d',
                }}
              >
                {STAGES.map((stage, idx) => {
                  const stepTrigger = stageTriggerFrames[idx] ?? finalCompleteFrame;
                  const isStepDone = frame >= stepTrigger;
                  const popSpring = isStepDone
                    ? spring({
                        frame: frame - stepTrigger,
                        fps: safeFps,
                        config: { damping: 14, stiffness: 250, mass: 0.78 },
                      })
                    : 0;
                  const zDepth = ESCALATOR_BASE_Z[idx] + 14 * popSpring;
                  const isFinalStage = idx === STAGES.length - 1;
                  const stepLeft = 10 + idx * 28;
                  const stepTop = 4 + idx * 100;

                  return (
                    <div
                      key={stage.title}
                      style={{
                        position: 'absolute',
                        left: stepLeft,
                        top: stepTop,
                        width: 516,
                        height: 84,
                        borderRadius: 18,
                        padding: '0 20px',
                        backgroundColor: isStepDone
                          ? isFinalStage
                            ? TEAL_SOFT
                            : '#FFFFFF'
                          : LAUNCH_PALETTE.SURFACE_MUTED,
                        border: `1.8px solid ${isStepDone ? TEAL : LAUNCH_PALETTE.TERTIARY}`,
                        borderBottom: `6px solid ${isStepDone ? TEAL_INK : LAUNCH_PALETTE.TERTIARY}`,
                        boxShadow: isStepDone
                          ? `0 ${(14 + idx * 6).toFixed(0)}px ${(30 + idx * 7).toFixed(0)}px rgba(15, 118, 110, 0.2), 0 6px 14px rgba(31, 39, 32, 0.08)`
                          : '0 8px 18px rgba(31, 39, 32, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        boxSizing: 'border-box',
                        transform: `translate3d(0px, ${(-5 * popSpring).toFixed(2)}px, ${zDepth.toFixed(2)}px)`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            backgroundColor: isStepDone ? TEAL_INK : TEAL_SOFT,
                            border: `2px solid ${isStepDone ? TEAL : TEAL_BORDER}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isStepDone ? (
                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                          ) : (
                            <span
                              style={{
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 12.5,
                                fontWeight: 900,
                                color: TEAL_INK,
                              }}
                            >
                              {idx + 1}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 16.5,
                              fontWeight: 900,
                              letterSpacing: '-0.02em',
                              color: LAUNCH_PALETTE.PRIMARY,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            0{idx + 1}. {stage.title}
                          </span>
                          <span
                            style={{
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: LAUNCH_PALETTE.INK_SOFT,
                            }}
                          >
                            {stage.meta}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '6px 12px',
                          borderRadius: 999,
                          backgroundColor: isStepDone ? TEAL_INK : '#FFFFFF',
                          border: `1.5px solid ${isStepDone ? TEAL_DARK : TEAL_BORDER}`,
                          color: isStepDone ? '#FFFFFF' : TEAL_INK,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: '0.09em',
                          flexShrink: 0,
                        }}
                      >
                        {isStepDone ? stage.badge : 'MENUNGGU'}
                      </span>
                    </div>
                  );
                })}

                {/* Bottom Escalator Elapsed Telemetry Slab (+56px Z, stays well above GlobalCinemaGate footer!) */}
                <div
                  style={{
                    position: 'absolute',
                    left: 94,
                    top: 416,
                    width: 516,
                    padding: '10px 18px',
                    borderRadius: 14,
                    backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                    border: `1.5px solid ${TEAL}`,
                    boxShadow: '0 18px 36px rgba(15, 118, 110, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transform: 'translate3d(0px, 0px, 56px)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 800,
                      letterSpacing: '0.09em',
                      color: TEAL_BORDER,
                    }}
                  >
                    TEMPOH SELESAI : {elapsedDisplay} • PANTAS
                  </span>
                  <span
                    style={{
                      padding: '4px 11px',
                      borderRadius: 999,
                      backgroundColor: TEAL_INK,
                      color: '#FFFFFF',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {allStagesComplete ? '100% SELESAI ✓' : 'MEMPROSES...'}
                  </span>
                </div>
              </div>
            </Interactive.Div>

            {/* RIGHT STAGE: 3D Exploded Food Bank Care Vault (Inset Safe Bounds) */}
            <Interactive.Div
              name="Food Bank 3D Care Vault"
              premountFor={safeFps}
              style={{
                position: 'absolute',
                left: 912,
                top: 20,
                width: 696,
                height: 640,
                opacity: vaultProgress,
                transformStyle: 'preserve-3d',
                transform: `translate3d(0px, ${((1 - vaultProgress) * 28).toFixed(2)}px, 0px) rotateX(8deg) rotateY(-9deg)`,
              }}
            >
              {/* PLANE 1 (+20px Z): Dark Editorial Food Bank Base Deck */}
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 18,
                  width: 676,
                  height: 376,
                  transformStyle: 'preserve-3d',
                  transform: 'translate3d(0px, 0px, 20px)',
                }}
              >
                <KineticWindow
                  surface="dark"
                  routeLabel="foodbank · pas rahsia siswa"
                  statusPill="RAHSIA ✓"
                  statusAccent
                  accentColor={AMBER}
                  accentSoftBg="rgba(245, 158, 11, 0.2)"
                  accentBorderColor={AMBER}
                  width="100%"
                  height="100%"
                  borderRadius={26}
                  sheenStartFrame={Math.round(1.65 * safeFps)}
                  sheenDuration={44}
                  style={{
                    borderColor: AMBER,
                    boxShadow:
                      '0 42px 88px rgba(31, 39, 32, 0.34), 0 14px 34px rgba(245, 158, 11, 0.14)',
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.14em',
                          color: AMBER_BORDER,
                        }}
                      >
                        <Package size={14} color={AMBER} strokeWidth={2.4} />
                        <span>FOOD BANK JPP • PAS PENGAMBILAN TERLINDUNG</span>
                      </div>

                      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.025em', color: LAUNCH_PALETTE.BACKGROUND }}>
                        Kotak Rezeki Siswa #FB-2026-119
                      </div>

                      <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 12.5, fontWeight: 700, color: TEAL_BORDER }}>
                        Aiman Hakim • Kamsis Blok B • Pek Bulanan
                      </div>
                    </div>

                    {/* 3 Horizontal Amber & Teal Approval Orbs */}
                    <div
                      style={{
                        borderRadius: 18,
                        padding: '16px 20px',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: '1.5px solid rgba(253, 230, 138, 0.28)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 14,
                      }}
                    >
                      {FOOD_BANK_STEPS.map((fbStep, idx) => {
                        const isLast = idx === FOOD_BANK_STEPS.length - 1;
                        return (
                          <div
                            key={fbStep.label}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: 6,
                              position: 'relative',
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 999,
                                backgroundColor: isLast ? AMBER : TEAL_INK,
                                border: `2px solid ${isLast ? AMBER_BORDER : TEAL_BORDER}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isLast ? (
                                <Sparkles size={15} color={LAUNCH_PALETTE.PRIMARY_DARK} strokeWidth={2.6} />
                              ) : (
                                <Check size={16} color="#FFFFFF" strokeWidth={3} />
                              )}
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 900, color: isLast ? AMBER_BORDER : '#FFFFFF' }}>
                              {fbStep.label}
                            </span>
                            <span style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 11, fontWeight: 700, color: LAUNCH_PALETTE.TERTIARY }}>
                              {fbStep.subLabel}
                            </span>
                            {idx < FOOD_BANK_STEPS.length - 1 ? (
                              <span style={{ position: 'absolute', right: -14, top: 7 }}>
                                <ArrowRight size={14} color={AMBER_BORDER} strokeWidth={2.4} />
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* Schedule 3-Column Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.15fr 1.15fr', gap: 12 }}>
                      {PICKUP_SCHEDULE.map((item) => (
                        <div
                          key={item.label}
                          style={{
                            borderRadius: 14,
                            padding: '10px 14px',
                            backgroundColor: 'rgba(248, 246, 238, 0.08)',
                            border: '1px solid rgba(253, 230, 138, 0.24)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
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
                              color: LAUNCH_PALETTE.TERTIARY,
                              letterSpacing: '0.1em',
                            }}
                          >
                            {renderScheduleIcon(item.kind)}
                            <span>{item.label.toUpperCase()}</span>
                          </div>
                          <span style={{ fontSize: 15.5, fontWeight: 900, color: '#FFFFFF' }}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </KineticWindow>
              </div>

              {/* PLANE 2 (+46px Z): Floating 100% RAHSIA & BERMARUAH Privacy Shield */}
              <div
                style={{
                  position: 'absolute',
                  right: 20,
                  top: -12,
                  padding: '10px 18px',
                  borderRadius: 999,
                  backgroundColor: TEAL_INK,
                  border: `2px solid ${TEAL_BORDER}`,
                  boxShadow: '0 24px 44px rgba(15, 118, 110, 0.34)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: '0.09em',
                  color: '#FFFFFF',
                  opacity: shieldSpring,
                  transform: `translate3d(0px, ${((1 - shieldSpring) * -16).toFixed(2)}px, ${(46 * shieldSpring).toFixed(2)}px) scale(${(0.9 + 0.1 * shieldSpring).toFixed(4)})`,
                  zIndex: 14,
                }}
              >
                <ShieldCheck size={15} color={TEAL_BORDER} strokeWidth={2.6} />
                <span>100% RAHSIA &amp; BERMARUAH</span>
              </div>

              {/* PLANE 3 (+54px Z): Floating 3D Ration QR Pickup Token hovering out toward camera */}
              {tokenSpring > 0.01 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: 376,
                    width: 668,
                    height: 210,
                    borderRadius: 24,
                    padding: '15px 18px',
                    backgroundColor: '#FFFFFF',
                    border: `2.5px solid ${AMBER_DARK}`,
                    borderBottom: `7px solid ${AMBER_INK}`,
                    boxShadow:
                      '0 44px 86px rgba(180, 83, 9, 0.28), 0 18px 36px rgba(31, 39, 32, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    boxSizing: 'border-box',
                    opacity: tokenSpring,
                    transform: `translate3d(0px, ${((1 - tokenSpring) * 32 + tokenFloatY).toFixed(2)}px, ${(54 * tokenSpring).toFixed(2)}px)`,
                    zIndex: 16,
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      padding: 10,
                      borderRadius: 16,
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `1.5px solid ${AMBER}`,
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <DeterministicQrMatrix
                      seed={2026119}
                      size={134}
                      fgColor={LAUNCH_PALETTE.PRIMARY_DARK}
                      bgColor={LAUNCH_PALETTE.BACKGROUND}
                    />
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 10,
                        right: 10,
                        top: 0,
                        height: 3,
                        borderRadius: 999,
                        backgroundColor: AMBER,
                        boxShadow: '0 0 14px rgba(245, 158, 11, 0.9)',
                        transform: `translate3d(0px, ${scanBeamY.toFixed(2)}px, 0px)`,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 11px',
                          borderRadius: 999,
                          backgroundColor: TEAL_SOFT,
                          border: `1px solid ${TEAL_BORDER}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 10.5,
                          fontWeight: 900,
                          color: TEAL_INK,
                        }}
                      >
                        <QrCode size={12} color={TEAL_INK} strokeWidth={2.5} />
                        <span>PAS PENGAMBILAN RAHSIA</span>
                      </span>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 12px',
                          borderRadius: 999,
                          backgroundColor: '#047857',
                          color: '#FFFFFF',
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        <Check size={13} strokeWidth={3} />
                        <span>SEDIA DIAMBIL ✓</span>
                      </span>
                    </div>

                    <div>
                      <div style={{ fontSize: 16.5, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                        Kotak Rezeki Siswa — Pek Asas Harian
                      </div>
                      <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 11, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                        KOD PAS: FB-2026-119 • PRIVASI TANPA NAMA DIPAPAR
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {MANIFEST_ITEMS.map((item) => (
                        <span
                          key={item}
                          style={{
                            padding: '4px 9px',
                            borderRadius: 999,
                            backgroundColor: AMBER_SOFT,
                            border: `1px solid ${AMBER_BORDER}`,
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: AMBER_INK,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </Interactive.Div>
          </div>
        </div>
      </CameraStage>

      <EditorialFrameMarks
        chapterCode="05"
        chapterLabel="PRIHATIN SISWA • ADUAN KAMSIS & FOOD BANK"
      />
    </>
  );
};

const welfareCareSchema = {
  ticketNo: { type: 'string', default: 'KBJ-0842', description: 'Ticket Number' },
  slaLabel: { type: 'string', default: '< 48 JAM', description: 'Resolution Guarantee' },
  headline: {
    type: 'string',
    default: STUDENT_HEADLINE_DEFAULT,
    description: 'Section Headline',
  },
} as const satisfies InteractivitySchema;

export const WelfareCareScene = Interactive.withSchema({
  Component: WelfareCareInner,
  componentName: 'WelfareCareScene',
  schema: welfareCareSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
