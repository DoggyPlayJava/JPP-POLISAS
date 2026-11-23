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
  Lock,
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
import { WHIP_S_CURVE } from '../motion/transitions';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE } from '../tokens';
import { DeterministicQrMatrix, KineticWindow } from '../ui/KineticCard';

const TEAL = LAUNCH_MODULE_THEMES.kebajikan.primary; // #14B8A6
const TEAL_DARK = LAUNCH_MODULE_THEMES.kebajikan.dark; // #0D9488
const TEAL_INK = '#0F766E'; // WCAG AA+ Teal-700
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
  readonly code: string;
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
  { code: '01', title: 'Laporan Dihantar', meta: '09:14 AM · Portal Pelajar', badge: 'DITERIMA' },
  { code: '02', title: 'Diterima JPP', meta: '09:42 AM · Semakan Serta-Merta', badge: 'DISAHKAN' },
  {
    code: '03',
    title: 'Juruteknik Dalam Perjalanan',
    meta: '11:15 AM · Blok B-204 Kamsis',
    badge: 'TINDAKAN',
  },
  {
    code: '04',
    title: 'Selesai < 48 Jam ✓',
    meta: '03:50 PM · Bilik Sedia & Selesa',
    badge: 'SELESAI ✓',
  },
];

const FOOD_BANK_STEPS: readonly FoodBankStepSpec[] = [
  { label: 'Dimohon', subLabel: '08:40 AM' },
  { label: 'Diluluskan', subLabel: '09:05 AM' },
  { label: 'Sedia Diambil', subLabel: 'Kaunter Rahsia' },
];

const PICKUP_SCHEDULE = [
  { label: 'Tarikh', value: 'Hari Ini', kind: 'date' as const },
  { label: 'Slot Masa', value: '2:00 PM – 4:00 PM', kind: 'time' as const },
  { label: 'Lokasi', value: 'Bilik Gerakan JPP', kind: 'location' as const },
];

const MANIFEST_ITEMS = ['Beras 5kg', 'Minyak Masak', 'Biskut Kering', 'Pek Minuman'] as const;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const LINEAR_SPINE = Easing.linear;
const TIMER_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const renderScheduleIcon = (kind: (typeof PICKUP_SCHEDULE)[number]['kind']) => {
  switch (kind) {
    case 'date':
      return <Calendar size={15} color={AMBER_INK} strokeWidth={2.4} />;
    case 'time':
      return <Clock size={15} color={AMBER_INK} strokeWidth={2.4} />;
    case 'location':
      return <MapPin size={15} color={TEAL_INK} strokeWidth={2.4} />;
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
  const f60 = (f: number) => Math.round((f / 60) * safeFps);

  const safeTicketNo = ticketNo.trim() || 'KBJ-0842';
  const safeSlaLabel = slaLabel.trim() || '< 48 JAM';
  const resolvedHeadline = resolveStudentHeadline(headline);

  // Beat timings
  const pillStart = 0;
  const pillDuration = Math.max(8, f60(22));
  const headlineStart = f60(5);
  const wordStagger = Math.max(2, f60(3));
  const wordDuration = Math.max(8, f60(20));
  const subStart = f60(20);
  const subDuration = Math.max(8, f60(20));

  const stageEnter = interpolate(frame, [f60(10), f60(34)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  // Left Panel: Upright Kebajikan SLA Spine & 4-Step Pulse Tracker
  const stageTriggerFrames = [f60(24), f60(58), f60(96), f60(134)] as const;
  const spineStart = f60(20);
  const spineEnd = stageTriggerFrames[STAGES.length - 1];
  const spineDuration = Math.max(20, spineEnd - spineStart);
  const allStagesComplete = frame >= spineEnd;

  const elapsedMinutes = Math.round(
    interpolate(frame, [spineStart, spineEnd], [14, 396], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: TIMER_EASING,
    }),
  );
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedMins = elapsedMinutes % 60;
  const elapsedDisplay = `${String(elapsedHours).padStart(2, '0')}j ${String(elapsedMins).padStart(2, '0')}m`;

  const highlightStart = f60(124);
  const highlightDuration = f60(24);
  const sealStart = f60(144);
  const sealSpring =
    frame >= sealStart
      ? spring({
          frame: frame - sealStart,
          fps: safeFps,
          config: { damping: 16, stiffness: 225, mass: 0.85 },
        })
      : 0;

  // Right Panel: 3-Step Approval + Mechanical Editorial Privacy Veil Lift (mid-open around Global f=1500 / Local 60f)
  const approvalTriggerFrames = [f60(18), f60(36), f60(68)] as const;
  const shutterStart = f60(38);
  const shutterEnd = f60(88);
  const shutterOpenT = interpolate(frame, [shutterStart, shutterEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const privacyProgressPct = Math.round(shutterOpenT * 100);

  // Continuous gentle vertical verification scan beam over uncovered Food Bank QR
  const scanPeriod = Math.max(36, f60(96));
  const scanPhase = ((Math.max(0, frame - shutterEnd)) % scanPeriod) / scanPeriod;
  const scanBeamY = frame >= shutterEnd ? 10 + 148 * Math.sin(scanPhase * Math.PI) : 10;

  return (
    <>
      <EditorialBackdrop ambientTint={LAUNCH_MODULE_THEMES.kebajikan.tint} />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.016}
        panXFrom={-3}
        panXTo={3}
        panYFrom={2}
        panYTo={-2}
        tiltXFrom={0}
        tiltXTo={0}
        tiltYFrom={0}
        tiltYTo={0}
        breathingAmplitude={0.22}
        entryPanXOffset={-18}
        entryZoomOffset={-0.018}
        exitPanYDelta={-16}
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
          {/* Centered Editorial Header */}
          <div
            style={{
              position: 'absolute',
              left: 76,
              right: 76,
              top: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              zIndex: 8,
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
                fontSize: 47,
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

          {/* UPRIGHT SYMMETRICAL 2-PANEL SWISS CARE WORKBENCH (left: 76, right: 76, top: 234, height: 704) */}
          <div
            style={{
              position: 'absolute',
              left: 76,
              top: 234,
              width: 1768,
              height: 704,
              display: 'flex',
              gap: 32,
              opacity: stageEnter,
              transform: `translate3d(0px, ${((1 - stageEnter) * 24).toFixed(2)}px, 0px)`,
            }}
          >
            {/* LEFT PANEL (width: 868px): Upright KebajikanLiveTrackerCard with Vertical Pulse Spine */}
            <Interactive.Div
              name="KebajikanLiveTrackerCard"
              premountFor={safeFps}
              style={{ width: 868, height: 704, flexShrink: 0 }}
            >
              <KineticWindow
                surface="light"
                routeLabel="jpp.polisas.edu.my/kebajikan"
                statusPill={allStagesComplete ? 'SELESAI < 48 JAM ✓' : 'JEJAK ADUAN LANGSUNG'}
                statusAccent
                accentColor={TEAL_INK}
                accentSoftBg={TEAL_SOFT}
                accentBorderColor={TEAL_BORDER}
                width="100%"
                height="100%"
                borderRadius={26}
                sheenStartFrame={f60(138)}
                sheenDuration={38}
                style={{
                  borderColor: allStagesComplete ? TEAL : TEAL_BORDER,
                  boxShadow: '0 22px 48px rgba(15, 118, 110, 0.1)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Ticket Header Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: 18,
                      backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                      border: `1.5px solid ${TEAL_BORDER}`,
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.12em',
                          color: TEAL_INK,
                        }}
                      >
                        E-KEBAJIKAN • JEJAK ADUAN KAMSIS
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 20,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          color: LAUNCH_PALETTE.PRIMARY,
                        }}
                      >
                        TIKET #{safeTicketNo} •{' '}
                        <span style={{ fontSize: 16, fontWeight: 700, color: LAUNCH_PALETTE.INK_SOFT }}>
                          Kipas &amp; Lampu Blok B-204
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '8px 14px',
                        borderRadius: 12,
                        backgroundColor: TEAL_SOFT,
                        border: `1.5px solid ${TEAL_BORDER}`,
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 13,
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
                  </div>

                  {/* Upright 4-Step Vertical Timeline Connected by Teal EvolvingPath Spine */}
                  <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
                    {/* Vertical Spine Positioned Directly Behind Stage Nodes */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 25,
                        top: 38,
                        width: 24,
                        height: 360,
                        pointerEvents: 'none',
                      }}
                    >
                      <EvolvingPath
                        d="M 12 0 L 12 360"
                        width={24}
                        height={360}
                        startFrame={spineStart}
                        durationFrames={spineDuration}
                        easing={LINEAR_SPINE}
                        stroke={TEAL}
                        trackStroke="rgba(153, 246, 228, 0.72)"
                        strokeWidth={4}
                        headDotColor={TEAL_INK}
                        headDotRadius={5}
                        hideDotWhenComplete={allStagesComplete}
                      />
                    </div>

                    {STAGES.map((stage, idx) => {
                      const stepTrigger = stageTriggerFrames[idx] ?? spineEnd;
                      const isDone = frame >= stepTrigger;
                      const stepSpring = isDone
                        ? spring({
                            frame: frame - stepTrigger,
                            fps: safeFps,
                            config: { damping: 16, stiffness: 250, mass: 0.78 },
                          })
                        : 0;
                      const focusPulse = isDone
                        ? interpolate(frame - stepTrigger, [0, 8, 22], [1, 1.018, 1], {
                            extrapolateLeft: 'clamp',
                            extrapolateRight: 'clamp',
                          })
                        : 1;
                      const isFinal = idx === STAGES.length - 1;

                      return (
                        <div
                          key={stage.code}
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            flex: 1,
                            borderRadius: 18,
                            padding: '0 18px',
                            backgroundColor: isDone
                              ? isFinal
                                ? TEAL_SOFT
                                : '#FFFFFF'
                              : LAUNCH_PALETTE.SURFACE_MUTED,
                            border: `1.8px solid ${isDone ? TEAL : LAUNCH_PALETTE.TERTIARY}`,
                            borderBottom: `4px solid ${isDone ? TEAL_INK : LAUNCH_PALETTE.TERTIARY}`,
                            boxShadow: isDone ? '0 10px 22px rgba(15, 118, 110, 0.1)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 14,
                            transform: `scale(${focusPulse.toFixed(4)})`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 999,
                                backgroundColor: isDone ? TEAL_INK : '#FFFFFF',
                                border: `2px solid ${isDone ? TEAL : TEAL_BORDER}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transform: `scale(${(0.9 + 0.1 * stepSpring).toFixed(4)})`,
                              }}
                            >
                              {isDone ? (
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
                                  {stage.code}
                                </span>
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 18.5,
                                  fontWeight: 900,
                                  color: LAUNCH_PALETTE.PRIMARY,
                                  lineHeight: 1.2,
                                }}
                              >
                                {stage.code}. {stage.title}
                              </div>
                              <div
                                style={{
                                  marginTop: 2,
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  color: isDone ? TEAL_INK : LAUNCH_PALETTE.MUTED_OLIVE,
                                }}
                              >
                                {stage.meta}
                              </div>
                            </div>
                          </div>

                          <span
                            style={{
                              padding: '6px 13px',
                              borderRadius: 999,
                              backgroundColor: isDone ? TEAL_INK : '#FFFFFF',
                              border: `1.5px solid ${isDone ? TEAL_DARK : TEAL_BORDER}`,
                              color: isDone ? '#FFFFFF' : TEAL_INK,
                              fontFamily: LAUNCH_FONTS.MONO,
                              fontSize: 11,
                              fontWeight: 900,
                              letterSpacing: '0.08em',
                              flexShrink: 0,
                            }}
                          >
                            {isDone ? stage.badge : 'MENUNGGU'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Telemetry & 100% Completed Seal */}
                  <div
                    style={{
                      padding: '12px 18px',
                      borderRadius: 16,
                      backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                      border: `1.5px solid ${TEAL}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        color: TEAL_BORDER,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      TEMPOH SELESAI : {elapsedDisplay} • 7x LEBIH PANTAS DARI SLA
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 13px',
                        borderRadius: 999,
                        backgroundColor: allStagesComplete ? TEAL_INK : 'rgba(20, 184, 166, 0.22)',
                        border: `1px solid ${TEAL}`,
                        color: '#FFFFFF',
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 900,
                        transform: `scale(${(0.95 + 0.05 * sealSpring).toFixed(4)})`,
                      }}
                    >
                      <Sparkles size={12} color={TEAL_BORDER} strokeWidth={2.5} />
                      <span>
                        {allStagesComplete ? '100% SELESAI & DISANTUNI ✓' : 'MEMPROSES SLA...'}
                      </span>
                    </span>
                  </div>
                </div>
              </KineticWindow>
            </Interactive.Div>

            {/* RIGHT PANEL (width: 868px): Upright Food Bank Confidential Pass + Editorial Privacy Veil */}
            <Interactive.Div
              name="Food Bank Upright Privacy Vault"
              premountFor={safeFps}
              style={{ width: 868, height: 704, flexShrink: 0 }}
            >
              <KineticWindow
                surface="dark"
                routeLabel="jpp.polisas.edu.my/foodbank"
                statusPill="100% RAHSIA & BERMARUAH ✓"
                statusAccent
                accentColor={AMBER}
                accentSoftBg="rgba(245, 158, 11, 0.2)"
                accentBorderColor={AMBER}
                width="100%"
                height="100%"
                borderRadius={26}
                sheenStartFrame={f60(104)}
                sheenDuration={38}
                style={{
                  borderColor: AMBER,
                  boxShadow: '0 24px 54px rgba(31, 39, 32, 0.2)',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Food Bank Header & 3-Step Horizontal Approval Strip */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '0.12em',
                            color: AMBER,
                          }}
                        >
                          <Package size={14} color={AMBER} strokeWidth={2.4} />
                          <span>FOOD BANK JPP • PAS PENGAMBILAN TERLINDUNG</span>
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 25,
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            color: '#FFFFFF',
                          }}
                        >
                          Kotak Rezeki Siswa #FB-2026-119
                        </div>
                      </div>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 13px',
                          borderRadius: 999,
                          backgroundColor: TEAL_INK,
                          border: `1.5px solid ${TEAL_BORDER}`,
                          fontFamily: LAUNCH_FONTS.MONO,
                          fontSize: 11,
                          fontWeight: 900,
                          color: '#FFFFFF',
                        }}
                      >
                        <ShieldCheck size={14} color={TEAL_BORDER} strokeWidth={2.5} />
                        <span>PRIVASI SISWA</span>
                      </span>
                    </div>

                    {/* Horizontal 3-Step Approval Pipeline */}
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: 16,
                        backgroundColor: 'rgba(248, 246, 238, 0.08)',
                        border: '1px solid rgba(253, 230, 138, 0.28)',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr auto 1fr',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {FOOD_BANK_STEPS.map((step, sIdx) => {
                        const isApproved = frame >= (approvalTriggerFrames[sIdx] ?? 0);
                        const isReady = sIdx === FOOD_BANK_STEPS.length - 1;
                        return (
                          <React.Fragment key={step.label}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                              <span
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 999,
                                  backgroundColor: isApproved
                                    ? isReady
                                      ? AMBER
                                      : TEAL
                                    : 'rgba(248, 246, 238, 0.14)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {isReady ? (
                                  <Sparkles size={14} color={LAUNCH_PALETTE.PRIMARY_DARK} strokeWidth={2.4} />
                                ) : (
                                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                )}
                              </span>
                              <span style={{ fontSize: 13.5, fontWeight: 900, color: '#FFFFFF' }}>
                                {isApproved ? `${step.label} ✓` : step.label}
                              </span>
                              <span
                                style={{
                                  fontFamily: LAUNCH_FONTS.MONO,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: AMBER_BORDER,
                                }}
                              >
                                {step.subLabel}
                              </span>
                            </div>
                            {sIdx < FOOD_BANK_STEPS.length - 1 ? (
                              <ArrowRight size={16} color={AMBER_BORDER} strokeWidth={2.3} />
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lower Protected Pass Vault (overflow: hidden contains the sliding Editorial Privacy Veil) */}
                  <div
                    style={{
                      position: 'relative',
                      flex: 1,
                      borderRadius: 22,
                      overflow: 'hidden',
                    }}
                  >
                    {/* REVEALED LAYER: Pure White Upright QR Pickup Pass */}
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        padding: '20px 22px',
                        borderRadius: 22,
                        backgroundColor: '#FFFFFF',
                        border: `2.5px solid ${AMBER_DARK}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
                        {/* QR Box with Smooth Verification Beam */}
                        <div
                          style={{
                            position: 'relative',
                            padding: 12,
                            borderRadius: 18,
                            backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                            border: `2px solid ${AMBER}`,
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          <DeterministicQrMatrix
                            seed={2026119}
                            size={156}
                            fgColor={LAUNCH_PALETTE.PRIMARY_DARK}
                            bgColor={LAUNCH_PALETTE.BACKGROUND}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              left: 8,
                              right: 8,
                              top: scanBeamY,
                              height: 3.5,
                              borderRadius: 999,
                              backgroundColor: AMBER_DARK,
                              boxShadow: '0 0 12px rgba(217, 119, 6, 0.78)',
                            }}
                          />
                        </div>

                        {/* Pass Metadata & Pickup Details */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: 999,
                                backgroundColor: TEAL_SOFT,
                                border: `1px solid ${TEAL_BORDER}`,
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 10.5,
                                fontWeight: 900,
                                color: TEAL_INK,
                              }}
                            >
                              <QrCode size={13} strokeWidth={2.5} />
                              <span>PAS PENGAMBILAN RAHSIA</span>
                            </span>

                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 12px',
                                borderRadius: 999,
                                backgroundColor: TEAL_INK,
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
                            <div style={{ fontSize: 20, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                              Pek Asas Makanan &amp; Keperluan Harian
                            </div>
                            <div
                              style={{
                                marginTop: 2,
                                fontFamily: LAUNCH_FONTS.MONO,
                                fontSize: 11.5,
                                fontWeight: 800,
                                color: LAUNCH_PALETTE.INK_SOFT,
                              }}
                            >
                              KOD PAS: FB-2026-119 • TANPA NAMA PEMOHON DIPAPAR
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                            {MANIFEST_ITEMS.map((item) => (
                              <span
                                key={item}
                                style={{
                                  padding: '5px 11px',
                                  borderRadius: 999,
                                  backgroundColor: AMBER_SOFT,
                                  border: `1px solid ${AMBER_BORDER}`,
                                  fontSize: 12,
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

                      {/* 3 Schedule Detail Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {PICKUP_SCHEDULE.map((row) => (
                          <div
                            key={row.label}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 14,
                              backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                              border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
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
                                color: LAUNCH_PALETTE.MUTED_OLIVE,
                              }}
                            >
                              {renderScheduleIcon(row.kind)}
                              <span>{row.label.toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
                              {row.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* MECHANICAL EDITORIAL PRIVACY VEIL (slides smoothly upward as identity verification clears) */}
                    {shutterOpenT < 0.995 ? (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 22,
                          padding: '28px 32px',
                          backgroundColor: '#18221D',
                          border: `2px solid ${TEAL}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          gap: 14,
                          boxSizing: 'border-box',
                          transform: `translate3d(0px, ${(-shutterOpenT * 104).toFixed(2)}%, 0px)`,
                          zIndex: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 58,
                            height: 58,
                            borderRadius: 18,
                            backgroundColor: 'rgba(20, 184, 166, 0.16)',
                            border: `2px solid ${TEAL}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Lock size={26} color={TEAL_BORDER} strokeWidth={2.4} />
                        </div>

                        <div
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 13.5,
                            fontWeight: 900,
                            letterSpacing: '0.14em',
                            color: TEAL_BORDER,
                          }}
                        >
                          MOD PRIVASI SISWA AKTIF
                        </div>

                        <div
                          style={{
                            fontSize: 19,
                            fontWeight: 800,
                            color: '#FFFFFF',
                            maxWidth: 480,
                            lineHeight: 1.35,
                          }}
                        >
                          Identiti pemohon dilindungi 100% secara rahsia &amp; bermaruah sebelum pas QR dibuka.
                        </div>

                        {/* Verification Progress Bar on Veil */}
                        <div
                          style={{
                            width: 340,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: 'rgba(248, 246, 238, 0.14)',
                            overflow: 'hidden',
                            marginTop: 4,
                          }}
                        >
                          <div
                            style={{
                              width: `${privacyProgressPct}%`,
                              height: '100%',
                              borderRadius: 999,
                              backgroundColor: TEAL,
                            }}
                          />
                        </div>

                        <span
                          style={{
                            fontFamily: LAUNCH_FONTS.MONO,
                            fontSize: 11,
                            fontWeight: 800,
                            color: AMBER_BORDER,
                          }}
                        >
                          MEMBUKA PAS RAHSIA • {privacyProgressPct}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </KineticWindow>
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
