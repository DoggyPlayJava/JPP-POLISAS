import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { Award, Check, QrCode, ScanLine, ShieldCheck } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { Device3DRig } from '../motion/Device3DRig';
import { KineticReveal, KineticWords } from '../motion/KineticTypography';
import { GeometricSparkBurst } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type ClubsEmsProps = {
  readonly clubsCount: number;
  readonly activitiesCount: number;
  readonly certSerial: string;
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const COUNTER_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const LASER_EASE = Easing.bezier(0.45, 0, 0.55, 1);
const SHEEN_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

const QR_SIZE = 21;

const isFinderCell = (r: number, c: number, top: number, left: number): boolean | null => {
  const dr = r - top;
  const dc = c - left;
  if (dr < -1 || dr > 7 || dc < -1 || dc > 7) return null;
  if (dr === -1 || dr === 7 || dc === -1 || dc === 7) return false;
  if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
  if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
  return false;
};

const buildDeterministicQrCells = (): readonly { readonly r: number; readonly c: number }[] => {
  const cells: { readonly r: number; readonly c: number }[] = [];
  for (let r = 0; r < QR_SIZE; r++) {
    for (let c = 0; c < QR_SIZE; c++) {
      const f1 = isFinderCell(r, c, 0, 0);
      const f2 = isFinderCell(r, c, 0, QR_SIZE - 7);
      const f3 = isFinderCell(r, c, QR_SIZE - 7, 0);
      if (f1 !== null) {
        if (f1) cells.push({ r, c });
        continue;
      }
      if (f2 !== null) {
        if (f2) cells.push({ r, c });
        continue;
      }
      if (f3 !== null) {
        if (f3) cells.push({ r, c });
        continue;
      }
      if (r === 6 || c === 6) {
        if ((r + c) % 2 === 0) cells.push({ r, c });
        continue;
      }
      // Deterministic alignment square + pseudo-data matrix (zero Math.random)
      if (r >= 13 && r <= 17 && c >= 13 && c <= 17) {
        const ar = r - 13;
        const ac = c - 13;
        if (ar === 0 || ar === 4 || ac === 0 || ac === 4 || (ar === 2 && ac === 2)) {
          cells.push({ r, c });
        }
        continue;
      }
      const hash = (r * 23 + c * 41 + ((r * c) % 13) + (r ^ c) * 7) % 11;
      if (hash < 5) {
        cells.push({ r, c });
      }
    }
  }
  return cells;
};

const QR_CELLS = buildDeterministicQrCells();

const ClubsEmsInner: React.FC<ClubsEmsProps> = ({
  clubsCount,
  activitiesCount,
  certSerial,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeClubs = Number.isFinite(clubsCount) ? Math.max(0, Math.round(clubsCount)) : 21;
  const safeActivities = Number.isFinite(activitiesCount) ? Math.max(0, Math.round(activitiesCount)) : 41;
  const safeCertSerial = certSerial.trim() || 'EMS-CERT-2026-9041';

  // Beat 1 (0..1.6s): Dual Device3DRig laptops glide in from opposite sides + staggered shine + rolling counters
  const pillStart = 0;
  const pillDuration = Math.max(8, Math.round(0.38 * fps));
  const headlineStart = Math.round(0.10 * fps);
  const wordStagger = Math.max(2, Math.round(0.065 * fps));
  const wordDuration = Math.max(8, Math.round(0.38 * fps));

  const counterStart = Math.round(0.16 * fps);
  const clubsCounterEnd = Math.max(counterStart + 8, Math.round(1.42 * fps));
  const activitiesCounterEnd = Math.max(counterStart + 10, Math.round(1.58 * fps));

  const liveClubs = Math.round(
    interpolate(frame, [counterStart, clubsCounterEnd], [0, safeClubs], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );
  const liveActivities = Math.round(
    interpolate(frame, [counterStart, activitiesCounterEnd], [0, safeActivities], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: COUNTER_EASE,
    }),
  );

  const counterCardOpacity = interpolate(frame, [counterStart, counterStart + Math.max(6, Math.round(0.32 * fps))], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const leftEnterStart = Math.round(0.10 * fps);
  const leftEnterEnd = Math.max(leftEnterStart + 10, Math.round(0.95 * fps));
  const leftGlideX = interpolate(frame, [leftEnterStart, leftEnterEnd], [-132, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  const rightEnterStart = Math.round(0.22 * fps);
  const rightEnterEnd = Math.max(rightEnterStart + 10, Math.round(1.12 * fps));
  const rightGlideX = interpolate(frame, [rightEnterStart, rightEnterEnd], [132, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  const leftShineStart = Math.round(0.84 * fps);
  const rightShineStart = Math.round(1.12 * fps);
  const deviceShineDuration = Math.max(10, Math.round(0.68 * fps));

  // Subtle baseline strip fades out cleanly right as Beat 2 QR card rises
  const baselineEnterStart = Math.round(0.55 * fps);
  const baselineEnterEnd = Math.max(baselineEnterStart + 8, Math.round(0.95 * fps));
  const baselineExitStart = Math.round(1.72 * fps);
  const baselineExitEnd = Math.max(baselineExitStart + 6, Math.round(2.05 * fps));
  const baselineOpacity =
    interpolate(frame, [baselineEnterStart, baselineEnterEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    interpolate(frame, [baselineExitStart, baselineExitEnd], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  // Beat 2 (1.8..4.0s): Live QR Attendance Scan Overlay Card rises + terracotta laser sweeps down & up + 6-frame flash
  const qrRiseStart = Math.round(1.80 * fps);
  const qrRiseEnd = Math.max(qrRiseStart + 8, Math.round(2.26 * fps));
  const qrRiseProgress = interpolate(frame, [qrRiseStart, qrRiseEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const qrCardOpacity = interpolate(qrRiseProgress, [0, 0.25, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const qrRiseY = interpolate(qrRiseProgress, [0, 1], [74, 0]);
  const qrEnterScale = interpolate(qrRiseProgress, [0, 1], [0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });

  const laserDownStart = Math.round(2.28 * fps);
  const laserMid = Math.max(laserDownStart + 4, Math.round(2.94 * fps));
  const laserUpEnd = Math.max(laserMid + 4, Math.round(3.58 * fps));
  const laserNormalizedY = interpolate(
    frame,
    [laserDownStart, laserMid, laserUpEnd],
    [0, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: LASER_EASE,
    },
  );
  const isLaserActive = frame >= laserDownStart && frame <= laserUpEnd;
  const laserTopPx = 18 + laserNormalizedY * 174; // stays strictly inside 214px QR box

  const scanPercent = Math.round(
    interpolate(frame, [laserDownStart, laserUpEnd], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // Crisp 6-frame exposure flash at 60fps (Math.round((6 / 60) * fps))
  const flashStart = Math.max(laserUpEnd + 1, Math.round(3.60 * fps));
  const flashFrames = Math.max(3, Math.round((6 / 60) * fps));
  const flashPeak = flashStart + 1;
  const flashEnd = flashStart + flashFrames;
  const inFlashWindow = frame >= flashStart && frame < flashEnd;
  const flashOpacity = inFlashWindow
    ? interpolate(frame, [flashStart, flashPeak, flashEnd], [0.22, 0.94, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const isQrVerified = frame >= flashPeak;

  // Beat 3 (3.9..6.5s): QR Card glides left to anchor alongside popping e-Certificate Badge + SparkBurst
  const qrShiftStart = Math.round(3.88 * fps);
  const qrShiftEnd = Math.max(qrShiftStart + 8, Math.round(4.36 * fps));
  const qrShiftProgress = interpolate(frame, [qrShiftStart, qrShiftEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const qrShiftX = interpolate(qrShiftProgress, [0, 1], [0, -464]);
  const qrBeat3Scale = interpolate(qrShiftProgress, [0, 1], [1, 0.94]);

  const certPopStart = Math.round(3.96 * fps);
  const certElapsed = frame - certPopStart;
  const certSpring =
    certElapsed >= 0
      ? spring({
          frame: certElapsed,
          fps,
          config: { damping: 13, stiffness: 210, mass: 0.88 },
        })
      : 0;
  const certOpacity =
    certElapsed >= 0
      ? interpolate(certElapsed, [0, Math.max(3, Math.round(0.10 * fps))], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const certScale = 0.72 + (1 - 0.72) * certSpring;
  const certTranslateY = (1 - certSpring) * 42;

  const sheenStart = Math.round(4.32 * fps);
  const sheenEnd = Math.max(sheenStart + 10, Math.round(5.18 * fps));
  const sheenProgress = interpolate(frame, [sheenStart, sheenEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SHEEN_EASE,
  });
  const sheenActive = sheenProgress > 0.001 && sheenProgress < 0.999;
  const sheenX = interpolate(sheenProgress, [0, 1], [-280, 1020]);

  const sparkTrigger = certPopStart + Math.max(2, Math.round(0.08 * fps));
  const timeSec = frame / Math.max(1, fps);
  const certHoverY = certOpacity > 0.001 ? Math.sin(timeSec * 2.1) * 3 * Math.min(1, certSpring) : 0;
  const liveDotScale = 0.84 + Math.sin(timeSec * 6.0) * 0.2;

  const qrCardBorderColor = inFlashWindow
    ? LAUNCH_PALETTE.ACCENT
    : isQrVerified
      ? LAUNCH_PALETTE.SECONDARY
      : isLaserActive
        ? LAUNCH_PALETTE.ACCENT
        : LAUNCH_PALETTE.TERTIARY;

  const bracketColor = isQrVerified
    ? LAUNCH_PALETTE.SECONDARY
    : isLaserActive
      ? LAUNCH_PALETTE.ACCENT
      : LAUNCH_PALETTE.PRIMARY;

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.04}
        panXFrom={10}
        panXTo={-10}
        panYFrom={4}
        panYTo={-4}
        tiltXFrom={0.35}
        tiltXTo={-0.3}
        tiltYFrom={0.9}
        tiltYTo={-0.9}
        breathingAmplitude={0.55}
        clip
      >
        {/* Top Editorial Header + Live Rolling Tabular Counters */}
        <Interactive.Div
          name="Clubs EMS Header"
          premountFor={fps}
          style={{
            position: 'absolute',
            left: 88,
            top: 90,
            width: 1744,
            height: 142,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1260 }}>
            <KineticReveal startFrame={pillStart} durationFrames={pillDuration}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                  padding: '8px 18px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(201, 111, 79, 0.12)',
                  border: `1px solid ${LAUNCH_PALETTE.ACCENT}`,
                  color: LAUNCH_PALETTE.ACCENT,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                }}
              >
                <Award size={16} />
                TADBIR URUS KELAB &amp; EVENT MANAGEMENT SYSTEM
              </div>
            </KineticReveal>

            <h2
              style={{
                margin: 0,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                columnGap: '0.24em',
                rowGap: '0.06em',
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: '-0.03em',
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            >
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  color: LAUNCH_PALETTE.ACCENT,
                  fontVariantNumeric: 'tabular-nums',
                  display: 'inline-block',
                  minWidth: `${Math.max(2, String(safeClubs).length)}ch`,
                  textAlign: 'right',
                }}
              >
                {liveClubs}
              </span>
              <KineticWords
                as="div"
                text="Kelab Berdaftar."
                startFrame={headlineStart}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  lineHeight: 1.06,
                  letterSpacing: '-0.03em',
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  color: LAUNCH_PALETTE.SECONDARY,
                  fontVariantNumeric: 'tabular-nums',
                  display: 'inline-block',
                  minWidth: `${Math.max(2, String(safeActivities).length)}ch`,
                  textAlign: 'right',
                }}
              >
                {liveActivities}
              </span>
              <KineticWords
                as="div"
                text="Program Dipantau."
                startFrame={headlineStart + wordStagger * 2}
                staggerFrames={wordStagger}
                wordDurationFrames={wordDuration}
                accentWords={['Dipantau.']}
                accentColor={LAUNCH_PALETTE.ACCENT}
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  lineHeight: 1.06,
                  letterSpacing: '-0.03em',
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              />
            </h2>
          </div>

          {/* Live Rolling Tabular Stat Readouts */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              opacity: counterCardOpacity,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: '12px 20px',
                borderRadius: 18,
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: '0 14px 30px rgba(46, 58, 47, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                minWidth: 158,
              }}
            >
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 32,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: LAUNCH_PALETTE.PRIMARY,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {liveClubs}
              </span>
              <span
                style={{
                  marginTop: 5,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: LAUNCH_PALETTE.MUTED_OLIVE,
                }}
              >
                KELAB AKTIF
              </span>
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderRadius: 18,
                backgroundColor: LAUNCH_PALETTE.PRIMARY,
                border: '1.5px solid rgba(217, 201, 178, 0.3)',
                boxShadow: '0 16px 34px rgba(31, 39, 32, 0.16)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                minWidth: 168,
              }}
            >
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 32,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: LAUNCH_PALETTE.ACCENT,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {liveActivities}
              </span>
              <span
                style={{
                  marginTop: 5,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: LAUNCH_PALETTE.TERTIARY,
                }}
              >
                PROGRAM EMS
              </span>
            </div>
          </div>
        </Interactive.Div>

        {/* Beat 1: Dual Device3DRig Laptops Gliding from Opposite Sides with Staggered Shine */}
        <div
          style={{
            position: 'absolute',
            left: 88,
            top: 230,
            transform: `translate3d(${leftGlideX.toFixed(2)}px, 0px, 0px)`,
            zIndex: 4,
          }}
        >
          <Device3DRig
            variant="laptop"
            name="Club System Card"
            src={staticFile('GAMBAR/Kelab Preview.png')}
            width={844}
            height={406}
            enterFrame={leftEnterStart}
            enterDuration={Math.max(12, Math.round(0.95 * fps))}
            initialBlur={14}
            initialAberration={3.2}
            shineStartFrame={leftShineStart}
            shineDuration={deviceShineDuration}
            baseRotateX={1.2}
            baseRotateY={4.5}
            entryRotateX={7}
            entryRotateY={-12}
            entryTranslateY={32}
            floatAmplitude={0.8}
            floatPhase={0}
            fit="cover"
            objectPosition="top center"
            addressLabel="jpp.polisas.edu.my/kelab"
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 988,
            top: 230,
            transform: `translate3d(${rightGlideX.toFixed(2)}px, 0px, 0px)`,
            zIndex: 5,
          }}
        >
          <Device3DRig
            variant="laptop"
            name="EMS Live System Card"
            src={staticFile('GAMBAR/Event Management System (EMS) Preview.png')}
            width={844}
            height={406}
            enterFrame={rightEnterStart}
            enterDuration={Math.max(12, Math.round(0.95 * fps))}
            initialBlur={15}
            initialAberration={3.4}
            shineStartFrame={rightShineStart}
            shineDuration={deviceShineDuration}
            baseRotateX={1.2}
            baseRotateY={-4.5}
            entryRotateX={7}
            entryRotateY={12}
            entryTranslateY={32}
            floatAmplitude={0.8}
            floatPhase={1.6}
            fit="cover"
            objectPosition="top center"
            addressLabel="jpp.polisas.edu.my/ems"
          />
        </div>

        {/* Beat 1 Lower Editorial Baseline Strip (fades out as Beat 2 QR card rises) */}
        {baselineOpacity > 0.005 ? (
          <div
            style={{
              position: 'absolute',
              left: 88,
              right: 88,
              top: 760,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '22px 32px',
              borderRadius: 20,
              backgroundColor: LAUNCH_PALETTE.CARD_BG,
              border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
              boxShadow: '0 14px 32px rgba(46, 58, 47, 0.06)',
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 13.5,
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: LAUNCH_PALETTE.MUTED_OLIVE,
              opacity: baselineOpacity,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <span>01 PENDAFTARAN KELAB &amp; PERSATUAN</span>
            <span style={{ color: LAUNCH_PALETTE.ACCENT }}>•</span>
            <span>02 IMBASAN KEHADIRAN QR MASA NYATA</span>
            <span style={{ color: LAUNCH_PALETTE.ACCENT }}>•</span>
            <span>03 PENJANAAN E-SIJIL AUTOMATIK</span>
          </div>
        ) : null}

        {/* Beat 2 (1.8..4.0s): Live QR Attendance Scan Overlay Card + Terracotta Laser + 6-Frame Exposure Flash */}
        <Interactive.Div
          name="Live QR Attendance Scan Card"
          premountFor={fps}
          style={{
            position: 'absolute',
            left: 590,
            top: 676,
            width: 740,
            height: 286,
            opacity: qrCardOpacity,
            visibility: qrCardOpacity <= 0.001 ? 'hidden' : 'visible',
            transformOrigin: '50% 50%',
            transform: `translate3d(${qrShiftX.toFixed(2)}px, ${qrRiseY.toFixed(2)}px, 0px) scale(${(qrEnterScale * qrBeat3Scale).toFixed(4)})`,
            zIndex: 12,
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              borderRadius: 26,
              backgroundColor: LAUNCH_PALETTE.CARD_BG,
              border: `2px solid ${qrCardBorderColor}`,
              boxShadow: inFlashWindow
                ? '0 28px 70px rgba(201, 111, 79, 0.34), 0 0 0 6px rgba(201, 111, 79, 0.22)'
                : '0 28px 64px rgba(31, 39, 32, 0.22)',
              padding: '24px 30px',
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              overflow: 'hidden',
            }}
          >
            {/* Left: Deterministic Crisp SVG QR Matrix + Terracotta Laser Beam + Flash */}
            <div
              style={{
                position: 'relative',
                width: 214,
                height: 214,
                flexShrink: 0,
                borderRadius: 20,
                backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                border: `1.5px solid ${qrCardBorderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Viewfinder Corner Brackets */}
              <span style={{ position: 'absolute', left: 10, top: 10, width: 18, height: 18, borderTop: `3px solid ${bracketColor}`, borderLeft: `3px solid ${bracketColor}`, borderTopLeftRadius: 5 }} />
              <span style={{ position: 'absolute', right: 10, top: 10, width: 18, height: 18, borderTop: `3px solid ${bracketColor}`, borderRight: `3px solid ${bracketColor}`, borderTopRightRadius: 5 }} />
              <span style={{ position: 'absolute', left: 10, bottom: 10, width: 18, height: 18, borderBottom: `3px solid ${bracketColor}`, borderLeft: `3px solid ${bracketColor}`, borderBottomLeftRadius: 5 }} />
              <span style={{ position: 'absolute', right: 10, bottom: 10, width: 18, height: 18, borderBottom: `3px solid ${bracketColor}`, borderRight: `3px solid ${bracketColor}`, borderBottomRightRadius: 5 }} />

              <svg
                width={170}
                height={170}
                viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
                shapeRendering="crispEdges"
                style={{ display: 'block' }}
              >
                {QR_CELLS.map((cell) => (
                  <rect
                    key={`${cell.r}-${cell.c}`}
                    x={cell.c}
                    y={cell.r}
                    width={1}
                    height={1}
                    fill={LAUNCH_PALETTE.PRIMARY_DARK}
                  />
                ))}
              </svg>

              {/* Terracotta Laser Beam Sweeping Down & Up */}
              {isLaserActive ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    right: 8,
                    top: laserTopPx - 12,
                    height: 24,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    zIndex: 4,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(201, 111, 79, 0) 0%, rgba(201, 111, 79, 0.36) 50%, rgba(201, 111, 79, 0) 100%)',
                    }}
                  />
                  <div
                    style={{
                      width: '100%',
                      height: 3.5,
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.ACCENT,
                      boxShadow: '0 0 12px rgba(201, 111, 79, 0.85)',
                    }}
                  />
                </div>
              ) : null}

              {/* Crisp 6-Frame Exposure Flash */}
              {flashOpacity > 0.001 ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: LAUNCH_PALETTE.CARD_BG,
                    opacity: flashOpacity,
                    pointerEvents: 'none',
                    zIndex: 6,
                  }}
                />
              ) : null}
            </div>

            {/* Right: Live Scan & Verification Telemetry */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 13px',
                    borderRadius: 999,
                    backgroundColor: isQrVerified
                      ? 'rgba(107, 127, 91, 0.16)'
                      : 'rgba(201, 111, 79, 0.14)',
                    border: `1px solid ${isQrVerified ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT}`,
                    color: isQrVerified ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.ACCENT,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 11.5,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isQrVerified ? (
                    <Check size={13} color={LAUNCH_PALETTE.SECONDARY} strokeWidth={3} />
                  ) : (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        backgroundColor: LAUNCH_PALETTE.ACCENT,
                        transform: `scale(${liveDotScale.toFixed(3)})`,
                        display: 'inline-block',
                      }}
                    />
                  )}
                  <span>{isQrVerified ? 'KEHADIRAN DISAHKAN' : 'IMBASAN QR LANGSUNG'}</span>
                </div>

                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 12,
                    fontWeight: 800,
                    color: LAUNCH_PALETTE.MUTED_OLIVE,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {isQrVerified ? 100 : scanPercent}%
                </span>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    color: LAUNCH_PALETTE.PRIMARY,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  MAKMP 2026 • Dewan Jubli Perak
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: LAUNCH_PALETTE.MUTED_OLIVE,
                    whiteSpace: 'nowrap',
                  }}
                >
                  04DAT24F1022 • AMIRUL HAKIM
                </div>
              </div>

              {/* Scan Progress Track */}
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${isQrVerified ? 100 : scanPercent}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: isQrVerified ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT,
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: isQrVerified ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.MUTED_OLIVE,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ScanLine size={14} color={isQrVerified ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.ACCENT} />
                  {isQrVerified ? '+15 MERIT KOKURIKULUM' : 'PENGESAHAN PENYERTAAN...'}
                </span>
                <span>EMS CHECK-IN</span>
              </div>
            </div>

            {/* Card-Wide Subtle Exposure Flash Highlight */}
            {flashOpacity > 0.001 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                  opacity: flashOpacity * 0.42,
                  pointerEvents: 'none',
                  zIndex: 8,
                }}
              />
            ) : null}
          </div>
        </Interactive.Div>

        {/* Beat 3 (3.9..6.5s): GeometricSparkBurst Centered on e-Cert Medallion */}
        <GeometricSparkBurst
          triggerFrame={sparkTrigger}
          x={1687}
          y={818}
          durationFrames={Math.max(16, Math.round(0.78 * fps))}
          radius={122}
          count={14}
          seed="clubs-ems-ecert-burst"
          colors={[LAUNCH_PALETTE.ACCENT, LAUNCH_PALETTE.SECONDARY, LAUNCH_PALETTE.TERTIARY]}
          style={{ zIndex: 18, transform: 'translate3d(0px, 0px, 52px)' }}
        />

        {/* Beat 3: Official Digital e-Certificate Badge (EMS-CERT-2026-9041) */}
        <Interactive.Div
          name="Official Digital e-Certificate Badge"
          premountFor={fps}
          style={{
            position: 'absolute',
            left: 938,
            top: 670,
            width: 856,
            height: 296,
            opacity: certOpacity,
            visibility: certOpacity <= 0.001 ? 'hidden' : 'visible',
            transformOrigin: '50% 50%',
            transform: `translate3d(0px, ${(certTranslateY + certHoverY).toFixed(2)}px, 40px) scale(${certScale.toFixed(4)})`,
            zIndex: 16,
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              borderRadius: 26,
              backgroundColor: LAUNCH_PALETTE.PRIMARY,
              border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
              boxShadow: '0 32px 72px rgba(31, 39, 32, 0.30)',
              padding: '28px 34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 28,
              overflow: 'hidden',
            }}
          >
            {/* Inner Foil Hairline Frame */}
            <div
              style={{
                position: 'absolute',
                inset: 10,
                borderRadius: 18,
                border: '1px solid rgba(217, 201, 178, 0.28)',
                pointerEvents: 'none',
              }}
            />

            {/* Diagonal Specular Sheen Sweep (Pure CSS gradient band, zero duplicate CanvasImage) */}
            {sheenActive ? (
              <div
                style={{
                  position: 'absolute',
                  top: '-35%',
                  left: 0,
                  width: 180,
                  height: '170%',
                  background:
                    'linear-gradient(90deg, rgba(248, 246, 238, 0) 0%, rgba(248, 246, 238, 0.26) 50%, rgba(248, 246, 238, 0) 100%)',
                  transform: `translate3d(${sheenX.toFixed(2)}px, 0px, 0px) rotate(24deg)`,
                  pointerEvents: 'none',
                  zIndex: 4,
                }}
              />
            ) : null}

            {/* Left Certificate Details */}
            <div style={{ position: 'relative', zIndex: 2, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  color: LAUNCH_PALETTE.TERTIARY,
                }}
              >
                <ShieldCheck size={15} color={LAUNCH_PALETTE.ACCENT} />
                <span>SIJIL DIGITAL RASMI • JPP POLISAS</span>
              </div>

              <div
                style={{
                  fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
                  fontStyle: 'italic',
                  fontSize: 34,
                  fontWeight: 400,
                  lineHeight: 1.12,
                  color: LAUNCH_PALETTE.BACKGROUND,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Anugerah Kecemerlangan Mahasiswa
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: LAUNCH_PALETTE.TERTIARY,
                  whiteSpace: 'nowrap',
                }}
              >
                AMIRUL HAKIM BIN AZMAN • MAKMP 2026
              </div>

              {/* Official Serial Plate */}
              <div
                style={{
                  marginTop: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  alignSelf: 'flex-start',
                  padding: '9px 16px',
                  borderRadius: 12,
                  backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                  border: `1.5px solid ${LAUNCH_PALETTE.ACCENT}`,
                }}
              >
                <QrCode size={17} color={LAUNCH_PALETTE.ACCENT} />
                <span
                  style={{
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 15.5,
                    fontWeight: 900,
                    letterSpacing: '0.09em',
                    color: LAUNCH_PALETTE.BACKGROUND,
                  }}
                >
                  {safeCertSerial}
                </span>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.SECONDARY,
                    color: LAUNCH_PALETTE.CARD_BG,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                  }}
                >
                  SAH ✓
                </span>
              </div>
            </div>

            {/* Right Gold-Sand & Terracotta Seal Medallion */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                width: 146,
                height: 146,
                flexShrink: 0,
                borderRadius: 999,
                backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                border: `2.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: 'inset 0 0 0 6px rgba(201, 111, 79, 0.28)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Award size={44} color={LAUNCH_PALETTE.ACCENT} strokeWidth={2.1} />
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: '0.16em',
                  color: LAUNCH_PALETTE.TERTIARY,
                }}
              >
                E-SIJIL
              </span>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: LAUNCH_PALETTE.SECONDARY,
                }}
              >
                2026
              </span>
            </div>
          </div>
        </Interactive.Div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="06" chapterLabel="Sistem Kelab & EMS" />
    </>
  );
};

const clubsEmsSchema = {
  clubsCount: { type: 'number', default: 21, min: 1, max: 500, integer: true, hiddenFromList: false, description: 'Clubs Count' },
  activitiesCount: { type: 'number', default: 41, min: 1, max: 5000, integer: true, hiddenFromList: false, description: 'Activities Count' },
  certSerial: { type: 'string', default: 'EMS-CERT-2026-9041', description: 'Certificate Serial' },
} as const satisfies InteractivitySchema;

export const ClubsEmsScene = Interactive.withSchema({
  Component: ClubsEmsInner,
  componentName: 'ClubsEmsScene',
  schema: clubsEmsSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
