import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Img,
  staticFile,
} from 'remotion';
import {
  MapPin,
  Clock,
  Compass,
  Navigation,
  Layers,
  Building2,
  Sparkles,
  ShieldCheck,
  Calendar,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Radio,
  ShoppingBag,
  MessageSquare,
  FileCheck,
  Award,
} from 'lucide-react';
import { JppIntroVideoProps } from './schema';

// ============================================================================
// 1. PALETTE TOKENS (05 Earthy Minimal / Swiss Editorial Luxury)
// ============================================================================
export const PALETTE = {
  PRIMARY: '#2E3A2F', // Deep Forest Moss Green
  SECONDARY: '#6B7F5B', // Sage Olive Green
  TERTIARY: '#D9C9B2', // Warm Sand / Oatmeal Linen
  ACCENT: '#C96F4F', // Terracotta Clay Orange
  BACKGROUND: '#F8F6EE', // Warm Milk Porcelain
  CARD_BG: '#FFFFFF',
  CARD_MUTED: 'rgba(255, 255, 255, 0.88)',
  BORDER_LIGHT: 'rgba(217, 201, 178, 0.7)',
  SHADOW_SOFT: '0 24px 50px -12px rgba(46, 58, 47, 0.08), 0 2px 8px rgba(46, 58, 47, 0.04)',
};

// ============================================================================
// BACKGROUND TEXTURE & AMBIENT GLOW
// ============================================================================
const LinenGridTexture: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity: 0.9,
    }}
  >
    <defs>
      <pattern id="linen-grid" width="44" height="44" patternUnits="userSpaceOnUse">
        <path
          d="M 44 0 L 0 0 0 44"
          fill="none"
          stroke="rgba(46, 58, 47, 0.04)"
          strokeWidth="1"
        />
        <circle cx="0" cy="0" r="1" fill="rgba(46, 58, 47, 0.08)" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#linen-grid)" />
  </svg>
);

const AmbientGlow: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
        'radial-gradient(1400px circle at 50% 12%, rgba(107, 127, 91, 0.08) 0%, transparent 65%), radial-gradient(1000px circle at 85% 88%, rgba(201, 111, 79, 0.06) 0%, transparent 55%)',
      pointerEvents: 'none',
    }}
  />
);

// Architectural Frame & Registration Marks (Swiss Editorial)
const ArchitecturalFrame: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      padding: '36px 48px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontFamily: 'monospace',
      fontSize: '11px',
      color: 'rgba(46, 58, 47, 0.45)',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>+ [ POLISAS • 3.8291° N, 103.3283° E ]</span>
      <span>[ JPP SISTEM OPERASI v2.6 • SESI 2026/2027 ]</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>[ MAJLIS PERWAKILAN PELAJAR POLISAS ]</span>
      <span>[ EKOSISTEM PINTAR KAMPUS ] +</span>
    </div>
  </div>
);

// ============================================================================
// SCENE 0: PEMBUKAAN RASMI & IDENTITI (Frames 0 to 120 / 0.0s – 4.0s)
// ============================================================================
interface Scene0Props {
  institutionName: string;
  councilName: string;
  sessionLabel: string;
  sloganLine1: string;
  sloganLine2: string;
  portalUrl: string;
}

const Scene0Opening: React.FC<Scene0Props> = ({
  institutionName,
  councilName,
  sessionLabel,
  sloganLine1,
  sloganLine2,
  portalUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance springs
  const badgeSpring = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const titleSpring = spring({
    frame: Math.max(0, frame - 18),
    fps,
    config: { damping: 15, mass: 0.9, stiffness: 85 },
  });

  const subtitleSpring = spring({
    frame: Math.max(0, frame - 32),
    fps,
    config: { damping: 15, mass: 0.8, stiffness: 90 },
  });

  const cardsSpring = spring({
    frame: Math.max(0, frame - 46),
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 85 },
  });

  // Exit interpolation (smooth lift & fade at frames 96 to 120)
  const exitProgress = interpolate(frame, [96, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sceneOpacity = (1 - exitProgress) * interpolate(badgeSpring, [0, 1], [0, 1]);
  const sceneTranslateY = interpolate(exitProgress, [0, 1], [0, -28]);
  const sceneScale = interpolate(exitProgress, [0, 1], [1, 0.97]);

  // Dynamic values
  const badgeY = interpolate(badgeSpring, [0, 1], [24, 0]);
  const titleY = interpolate(titleSpring, [0, 1], [32, 0]);
  const titleScale = interpolate(titleSpring, [0, 1], [0.94, 1]);
  const lineWidth = interpolate(titleSpring, [0, 1], [0, 160]);

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        transform: `translateY(${sceneTranslateY}px) scale(${sceneScale})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 120px',
        textAlign: 'center',
      }}
    >
      {/* 1. INSTITUTION & COUNCIL BADGE */}
      <div
        style={{
          transform: `translateY(${badgeY}px)`,
          opacity: badgeSpring,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 24px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: `1.5px solid ${PALETTE.TERTIARY}`,
            boxShadow: '0 4px 16px rgba(46, 58, 47, 0.06)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: PALETTE.PRIMARY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Img
              src={staticFile('jpp-logo.png')}
              alt="JPP POLISAS"
              style={{ width: '22px', height: '22px', objectFit: 'contain' }}
            />
          </div>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.22em',
              color: PALETTE.PRIMARY,
              textTransform: 'uppercase',
            }}
          >
            {institutionName}
          </span>
          <span
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: PALETTE.ACCENT,
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: PALETTE.SECONDARY,
              textTransform: 'uppercase',
            }}
          >
            {councilName}
          </span>
        </div>

        {/* Session Badge Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 16px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(201, 111, 79, 0.12)',
            border: `1px solid rgba(201, 111, 79, 0.35)`,
          }}
        >
          <Sparkles size={13} color={PALETTE.ACCENT} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: PALETTE.ACCENT,
              textTransform: 'uppercase',
            }}
          >
            {sessionLabel}
          </span>
        </div>
      </div>

      {/* 2. SWISS HIGH-CONTRAST HEADLINE */}
      <div
        style={{
          transform: `translateY(${titleY}px) scale(${titleScale})`,
          opacity: titleSpring,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '20px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '84px',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            color: PALETTE.PRIMARY,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          {sloganLine1}
        </h1>
        <h1
          style={{
            margin: 0,
            fontSize: '84px',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            color: PALETTE.ACCENT,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          <span>{sloganLine2}</span>
        </h1>

        {/* Hairline terracotta underline */}
        <div
          style={{
            width: `${lineWidth}px`,
            height: '4px',
            borderRadius: '2px',
            backgroundColor: PALETTE.ACCENT,
            marginTop: '16px',
          }}
        />
      </div>

      {/* 3. EDITORIAL MANIFESTO / SUBTITLE */}
      <p
        style={{
          margin: 0,
          opacity: subtitleSpring,
          transform: `translateY(${interpolate(subtitleSpring, [0, 1], [18, 0])}px)`,
          maxWidth: '860px',
          fontSize: '22px',
          fontWeight: 500,
          lineHeight: 1.5,
          color: PALETTE.SECONDARY,
          letterSpacing: '-0.01em',
          marginBottom: '42px',
        }}
      >
        Platform digital bersepadu Majlis Perwakilan Pelajar — memacu pemerkasaan
        mahasiswa melalui mobiliti pintar, keusahawanan kampus & ketelusan kebajikan holistik.
      </p>

      {/* 4. PILLARS PREVIEW STRIP (High-end Swiss Bento Pills) */}
      <div
        style={{
          opacity: cardsSpring,
          transform: `translateY(${interpolate(cardsSpring, [0, 1], [22, 0])}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {[
          {
            index: '01',
            icon: Compass,
            label: 'Integrasi Pintar',
            desc: 'Jadual Kuliah & PolyMaps',
          },
          {
            index: '02',
            icon: ShoppingBag,
            label: 'Ekosistem Siswa',
            desc: 'PolyMart & PolySuara',
          },
          {
            index: '03',
            icon: Award,
            label: 'Tadbir Urus Pantas',
            desc: 'E-Aduan & Sijil Digital EMS',
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 24px',
                borderRadius: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                border: `1px solid ${PALETTE.TERTIARY}`,
                boxShadow: '0 8px 24px -6px rgba(46, 58, 47, 0.05)',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(107, 127, 91, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={19} color={PALETTE.SECONDARY} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: PALETTE.ACCENT,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.index} • {item.label}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: PALETTE.PRIMARY,
                    marginTop: '2px',
                  }}
                >
                  {item.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE 1: INTEGRASI JADUAL KULIAH & POLYMAPS (Frames 120 to 315 / 4.0s – 10.5s)
// ============================================================================
interface Scene1Props {
  nextClass: {
    code: string;
    name: string;
    time: string;
    room: string;
    department: string;
  };
}

const Scene1PolyMaps: React.FC<Scene1Props> = ({ nextClass }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance springs
  const headerSpring = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const cardASpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 15, mass: 0.85, stiffness: 85 },
  });

  const cardBSpring = spring({
    frame: Math.max(0, frame - 18),
    fps,
    config: { damping: 15, mass: 0.85, stiffness: 85 },
  });

  // Exit interpolation at local frames 168 to 195
  const exitProgress = interpolate(frame, [168, 195], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sceneOpacity = (1 - exitProgress) * interpolate(headerSpring, [0, 1], [0, 1]);
  const sceneTranslateY = interpolate(exitProgress, [0, 1], [0, -30]);

  // Card animations
  const cardAY = interpolate(cardASpring, [0, 1], [34, 0]);
  const cardBY = interpolate(cardBSpring, [0, 1], [38, 0]);

  // PolyMaps animated path offset and radar pulses
  const pathDashOffset = -frame * 3.2;

  // Origin pulse (Dataran Siswa)
  const originPulse = (frame * 1.8) % 32;
  const originPulseRadius = 8 + (originPulse / 32) * 16;
  const originPulseOpacity = 1 - originPulse / 32;

  // Destination radar pulse (Makmal Komputer 3)
  const destPulse1 = (frame * 1.6) % 40;
  const destRadius1 = 10 + (destPulse1 / 40) * 32;
  const destOpacity1 = 1 - destPulse1 / 40;

  const destPulse2 = ((frame * 1.6) + 20) % 40;
  const destRadius2 = 10 + (destPulse2 / 40) * 32;
  const destOpacity2 = 1 - destPulse2 / 40;

  // Destination pin floating bob
  const pinBobY = Math.sin(frame / 5) * 5;

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        transform: `translateY(${sceneTranslateY}px)`,
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 90px',
        justifyContent: 'space-between',
      }}
    >
      {/* 1. SCENE HEADER */}
      <div
        style={{
          transform: `translateY(${interpolate(headerSpring, [0, 1], [20, 0])}px)`,
          opacity: headerSpring,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '26px',
        }}
      >
        <div>
          {/* Category Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(107, 127, 91, 0.12)',
              border: `1px solid rgba(107, 127, 91, 0.3)`,
              marginBottom: '10px',
            }}
          >
            <Compass size={14} color={PALETTE.SECONDARY} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.18em',
                color: PALETTE.PRIMARY,
                textTransform: 'uppercase',
              }}
            >
              INTEGRASI PINTAR KAMPUS
            </span>
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: '46px',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: PALETTE.PRIMARY,
              lineHeight: 1.1,
            }}
          >
            Jadual Kuliah & Navigasi PolyMaps
          </h2>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '19px',
              fontWeight: 500,
              color: PALETTE.SECONDARY,
            }}
          >
            Terus ke bilik kuliah dan bengkel tanpa ragu melalui laluan berpandu masa nyata.
          </p>
        </div>

        {/* Live GPS Telemetry Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 18px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: `1px solid ${PALETTE.TERTIARY}`,
            boxShadow: '0 4px 14px rgba(46, 58, 47, 0.04)',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: PALETTE.ACCENT,
              boxShadow: `0 0 8px ${PALETTE.ACCENT}`,
            }}
          />
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: PALETTE.SECONDARY,
                textTransform: 'uppercase',
              }}
            >
              SATELIT AKTIF • RTK HIGH-ACCURACY
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: PALETTE.PRIMARY,
              }}
            >
              3.8291° N, 103.3283° E (±0.4m)
            </div>
          </div>
        </div>
      </div>

      {/* 2. BENTO DUAL CARD SYSTEM */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          flex: 1,
          alignItems: 'stretch',
          minHeight: 0,
        }}
      >
        {/* ========================================== */}
        {/* CARD A: JADUAL KULIAH (NEXT CLASS BENTO) */}
        {/* ========================================== */}
        <div
          style={{
            flex: '0 0 600px',
            transform: `translateY(${cardAY}px)`,
            opacity: cardASpring,
            backgroundColor: PALETTE.CARD_BG,
            borderRadius: '24px',
            border: `1.5px solid ${PALETTE.TERTIARY}`,
            boxShadow: PALETTE.SHADOW_SOFT,
            padding: '34px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle accent corner glow */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '160px',
              height: '160px',
              background: 'radial-gradient(circle at 100% 0%, rgba(201, 111, 79, 0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top Status Strip */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(107, 127, 91, 0.12)',
                  border: `1px solid rgba(107, 127, 91, 0.3)`,
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: PALETTE.SECONDARY,
                    boxShadow: `0 0 6px ${PALETTE.SECONDARY}`,
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    color: PALETTE.PRIMARY,
                    textTransform: 'uppercase',
                  }}
                >
                  Kuliah Seterusnya
                </span>
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: PALETTE.SECONDARY,
                }}
              >
                HARI INI • JADUAL SEGERAK
              </span>
            </div>

            {/* Subject Code & Category */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '44px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  letterSpacing: '-0.02em',
                  color: PALETTE.ACCENT,
                }}
              >
                {nextClass.code}
              </span>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(46, 58, 47, 0.06)',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: PALETTE.PRIMARY,
                  textTransform: 'uppercase',
                }}
              >
                Kredit: 3.0 • Teori & Amali
              </div>
            </div>

            {/* Subject Title */}
            <h3
              style={{
                margin: '0 0 24px 0',
                fontSize: '26px',
                fontWeight: 800,
                color: PALETTE.PRIMARY,
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
              }}
            >
              {nextClass.name}
            </h3>

            {/* Details: Time & Room Boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Time Box */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(248, 246, 238, 0.9)',
                  border: `1px solid ${PALETTE.TERTIARY}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(201, 111, 79, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock size={22} color={PALETTE.ACCENT} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      color: PALETTE.SECONDARY,
                      textTransform: 'uppercase',
                    }}
                  >
                    WAKTU KULIAH
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: PALETTE.PRIMARY,
                      marginTop: '2px',
                    }}
                  >
                    {nextClass.time}
                  </div>
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(107, 127, 91, 0.15)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: PALETTE.PRIMARY,
                  }}
                >
                  Bermula dlm 15m
                </div>
              </div>

              {/* Room & Department Box */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(248, 246, 238, 0.9)',
                  border: `1px solid ${PALETTE.TERTIARY}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(107, 127, 91, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                  }}
                >
                  <MapPin size={22} color={PALETTE.SECONDARY} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      color: PALETTE.SECONDARY,
                      textTransform: 'uppercase',
                    }}
                  >
                    LOKASI & JABATAN
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: PALETTE.PRIMARY,
                      marginTop: '2px',
                    }}
                  >
                    {nextClass.room}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: PALETTE.SECONDARY,
                      marginTop: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Building2 size={15} />
                    <span>{nextClass.department}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Hint */}
          <div
            style={{
              paddingTop: '20px',
              borderTop: `1px solid ${PALETTE.TERTIARY}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={16} color={PALETTE.ACCENT} />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: PALETTE.PRIMARY,
                  letterSpacing: '0.04em',
                }}
              >
                Navigasi PolyMaps Aktif
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: PALETTE.ACCENT,
                fontSize: '13px',
                fontWeight: 700,
                transform: `translateX(${Math.sin(frame / 6) * 4}px)`,
              }}
            >
              <span>Ikuti Panduan</span>
              <ArrowRight size={15} />
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* CARD B: POLYMAPS ARCHITECTURAL NAVIGATION VISUAL */}
        {/* ========================================================== */}
        <div
          style={{
            flex: 1,
            transform: `translateY(${cardBY}px)`,
            opacity: cardBSpring,
            backgroundColor: PALETTE.CARD_BG,
            borderRadius: '24px',
            border: `1.5px solid ${PALETTE.TERTIARY}`,
            boxShadow: PALETTE.SHADOW_SOFT,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top PolyMaps Control Bar */}
          <div
            style={{
              padding: '18px 28px',
              backgroundColor: 'rgba(248, 246, 238, 0.7)',
              borderBottom: `1px solid ${PALETTE.TERTIARY}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: PALETTE.PRIMARY,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Compass size={18} color="#FFFFFF" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    color: PALETTE.PRIMARY,
                  }}
                >
                  POLISAS PolyMaps™ Engine
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: PALETTE.SECONDARY,
                  }}
                >
                  Peta Zon Kampus Semambu • Vektor Interaktif
                </div>
              </div>
            </div>

            {/* Status Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(201, 111, 79, 0.12)',
                border: '1px solid rgba(201, 111, 79, 0.3)',
              }}
            >
              <Radio size={14} color={PALETTE.ACCENT} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: PALETTE.ACCENT,
                  textTransform: 'uppercase',
                }}
              >
                Pandu Laluan Pintar (Live)
              </span>
            </div>
          </div>

          {/* Map Blueprint Canvas (High-Precision Architectural Visual) */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              backgroundColor: '#F3EFE6',
              overflow: 'hidden',
            }}
          >
            {/* Architectural Grid & Technical Markers */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 920 400"
              style={{ width: '100%', height: '100%' }}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Blueprint grid pattern */}
                <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="rgba(46, 58, 47, 0.05)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </pattern>

                {/* Building Drop Shadow */}
                <filter id="building-shadow" x="-8%" y="-8%" width="120%" height="120%">
                  <feDropShadow
                    dx="0"
                    dy="8"
                    stdDeviation="6"
                    floodColor="rgba(46, 58, 47, 0.07)"
                  />
                </filter>
              </defs>

              <rect width="920" height="400" fill="url(#map-grid)" />

              {/* Grid coordinate markers along borders */}
              <g
                fontFamily="monospace"
                fontSize="9"
                fill="rgba(46, 58, 47, 0.3)"
                fontWeight="700"
              >
                <text x="20" y="24">ZON-A</text>
                <text x="300" y="24">ZON-B</text>
                <text x="600" y="24">ZON-C (TMK)</text>
                <text x="880" y="24">ZON-D</text>
              </g>

              {/* Compass Rose (Top Right) */}
              <g transform="translate(860, 50)">
                <circle cx="0" cy="0" r="18" fill="rgba(255, 255, 255, 0.85)" stroke={PALETTE.TERTIARY} strokeWidth="1" />
                <path d="M 0 -13 L 4 -2 L 0 0 L -4 -2 Z" fill={PALETTE.ACCENT} />
                <path d="M 0 13 L 4 2 L 0 0 L -4 2 Z" fill={PALETTE.PRIMARY} />
                <text x="0" y="-17" textAnchor="middle" fontSize="10" fontWeight="900" fill={PALETTE.ACCENT}>
                  U
                </text>
              </g>

              {/* ==================================================== */}
              {/* COVERED WALKWAY NETWORK (Laluan Berbumbung Rasmi) */}
              {/* ==================================================== */}
              {/* Main arterial walkway connecting buildings */}
              <path
                d="M 170 280 L 270 200 L 510 200 L 590 120 L 710 120"
                fill="none"
                stroke="rgba(217, 201, 178, 0.85)"
                strokeWidth="28"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 170 280 L 270 200 L 510 200 L 590 120 L 710 120"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Secondary walkways */}
              <path
                d="M 400 200 L 400 95"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 270 200 L 150 95"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="14"
                strokeLinecap="round"
              />

              {/* ==================================================== */}
              {/* CAMPUS BUILDINGS (Architectural Footprints) */}
              {/* ==================================================== */}

              {/* 1. DEWAN KULIAH UTAMA (DKU) */}
              <g filter="url(#building-shadow)">
                <rect
                  x="45"
                  y="40"
                  width="210"
                  height="110"
                  rx="10"
                  fill="#FFFFFF"
                  stroke={PALETTE.TERTIARY}
                  strokeWidth="1.5"
                />
                <rect x="55" y="50" width="190" height="20" rx="4" fill="rgba(46, 58, 47, 0.04)" />
                <text x="65" y="64" fontSize="11" fontWeight="800" fill={PALETTE.PRIMARY} letterSpacing="0.06em">
                  DEWAN KULIAH UTAMA (DKU)
                </text>
                <text x="65" y="86" fontSize="10" fontWeight="600" fill={PALETTE.SECONDARY}>
                  Kapasiti: 600 Mahasiswa
                </text>
                <text x="65" y="102" fontSize="9" fontWeight="500" fill="rgba(46, 58, 47, 0.5)">
                  Pusat Peperiksaan & Majlis
                </text>
                <circle cx="230" cy="95" r="8" fill="rgba(107, 127, 91, 0.15)" />
                <circle cx="230" cy="95" r="3" fill={PALETTE.SECONDARY} />
              </g>

              {/* 2. PERPUSTAKAAN AL-BUKHARI */}
              <g filter="url(#building-shadow)">
                <rect
                  x="285"
                  y="40"
                  width="210"
                  height="110"
                  rx="10"
                  fill="#FFFFFF"
                  stroke={PALETTE.TERTIARY}
                  strokeWidth="1.5"
                />
                <rect x="295" y="50" width="190" height="20" rx="4" fill="rgba(46, 58, 47, 0.04)" />
                <text x="305" y="64" fontSize="11" fontWeight="800" fill={PALETTE.PRIMARY} letterSpacing="0.06em">
                  PERPUSTAKAAN AL-BUKHARI
                </text>
                <text x="305" y="86" fontSize="10" fontWeight="600" fill={PALETTE.SECONDARY}>
                  Pusat Sumber & Repositori Digital
                </text>
                <text x="305" y="102" fontSize="9" fontWeight="500" fill="rgba(46, 58, 47, 0.5)">
                  Zon Senyap & Makmal Akses
                </text>
              </g>

              {/* 3. JABATAN TMK (BLOK B) — DESTINASI TERPILIH */}
              <g filter="url(#building-shadow)">
                {/* Highlighted destination building wrapper */}
                <rect
                  x="525"
                  y="30"
                  width="360"
                  height="150"
                  rx="12"
                  fill="#FFFFFF"
                  stroke={PALETTE.ACCENT}
                  strokeWidth="2.5"
                />
                <rect
                  x="525"
                  y="30"
                  width="360"
                  height="150"
                  rx="12"
                  fill="rgba(201, 111, 79, 0.06)"
                />

                {/* Building Header Strip */}
                <rect x="535" y="40" width="340" height="24" rx="4" fill="rgba(201, 111, 79, 0.15)" />
                <text x="548" y="56" fontSize="12" fontWeight="900" fill={PALETTE.ACCENT} letterSpacing="0.08em">
                  JABATAN TEKNOLOGI MAKLUMAT (BLOK B) — DESTINASI
                </text>

                {/* Internal Compartment / Lab Rooms */}
                <g>
                  {/* Lab 1 */}
                  <rect
                    x="538"
                    y="72"
                    width="95"
                    height="96"
                    rx="6"
                    fill="#FFFFFF"
                    stroke={PALETTE.TERTIARY}
                    strokeWidth="1"
                  />
                  <text x="546" y="90" fontSize="9" fontWeight="700" fill={PALETTE.PRIMARY}>
                    Makmal Rangkaian
                  </text>
                  <text x="546" y="104" fontSize="8" fill={PALETTE.SECONDARY}>
                    Aras 1
                  </text>

                  {/* Lab 3 (Target Destination Room) */}
                  <rect
                    x="641"
                    y="72"
                    width="142"
                    height="96"
                    rx="6"
                    fill="rgba(201, 111, 79, 0.16)"
                    stroke={PALETTE.ACCENT}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <text x="652" y="92" fontSize="11" fontWeight="900" fill={PALETTE.PRIMARY}>
                    ★ MAKMAL KOMP. 3
                  </text>
                  <text x="652" y="108" fontSize="9" fontWeight="800" fill={PALETTE.ACCENT}>
                    BILIK KULIAH ANDA
                  </text>
                  <text x="652" y="124" fontSize="8" fontWeight="600" fill={PALETTE.PRIMARY}>
                    Aras 2 • Zon Multimedia
                  </text>

                  {/* Staff Room */}
                  <rect
                    x="791"
                    y="72"
                    width="84"
                    height="96"
                    rx="6"
                    fill="#FFFFFF"
                    stroke={PALETTE.TERTIARY}
                    strokeWidth="1"
                  />
                  <text x="797" y="90" fontSize="9" fontWeight="700" fill={PALETTE.PRIMARY}>
                    Bilik Pensyarah
                  </text>
                  <text x="797" y="104" fontSize="8" fill={PALETTE.SECONDARY}>
                    Pejabat TMK
                  </text>
                </g>
              </g>

              {/* 4. DATARAN & KAFETERIA SISWA (MULA) */}
              <g filter="url(#building-shadow)">
                <rect
                  x="60"
                  y="245"
                  width="220"
                  height="125"
                  rx="10"
                  fill="#FFFFFF"
                  stroke="rgba(107, 127, 91, 0.4)"
                  strokeWidth="2"
                />
                <rect
                  x="60"
                  y="245"
                  width="220"
                  height="125"
                  rx="10"
                  fill="rgba(107, 127, 91, 0.08)"
                />
                <rect x="70" y="255" width="200" height="22" rx="4" fill="rgba(107, 127, 91, 0.15)" />
                <text x="80" y="270" fontSize="11" fontWeight="900" fill={PALETTE.PRIMARY} letterSpacing="0.06em">
                  DATARAN & KAFETERIA SISWA
                </text>
                <text x="80" y="295" fontSize="10" fontWeight="700" fill={PALETTE.SECONDARY}>
                  Pusat Aktiviti Mahasiswa
                </text>
                <text x="80" y="310" fontSize="9" fontWeight="500" fill="rgba(46, 58, 47, 0.5)">
                  Titik Mula Pandu Laluan
                </text>
              </g>

              {/* 5. JABATAN KEJURUTERAAN AWAM (JKA) */}
              <g filter="url(#building-shadow)">
                <rect
                  x="310"
                  y="250"
                  width="230"
                  height="120"
                  rx="10"
                  fill="#FFFFFF"
                  stroke={PALETTE.TERTIARY}
                  strokeWidth="1.5"
                />
                <rect x="320" y="260" width="210" height="20" rx="4" fill="rgba(46, 58, 47, 0.04)" />
                <text x="330" y="274" fontSize="11" fontWeight="800" fill={PALETTE.PRIMARY} letterSpacing="0.06em">
                  JABATAN KEJURUTERAAN AWAM
                </text>
                <text x="330" y="296" fontSize="10" fontWeight="600" fill={PALETTE.SECONDARY}>
                  Makmal Hidraulik & Geoteknik
                </text>
                <text x="330" y="312" fontSize="9" fontWeight="500" fill="rgba(46, 58, 47, 0.5)">
                  Blok Bengkel Utama
                </text>
              </g>

              {/* 6. KOMPLEKS SUKAN & REKREASI */}
              <g filter="url(#building-shadow)">
                <rect
                  x="570"
                  y="250"
                  width="315"
                  height="120"
                  rx="10"
                  fill="#FFFFFF"
                  stroke={PALETTE.TERTIARY}
                  strokeWidth="1.5"
                />
                <rect x="580" y="260" width="295" height="20" rx="4" fill="rgba(46, 58, 47, 0.04)" />
                <text x="592" y="274" fontSize="11" fontWeight="800" fill={PALETTE.PRIMARY} letterSpacing="0.06em">
                  KOMPLEKS SUKAN & GIMNASIUM
                </text>
                <text x="592" y="296" fontSize="10" fontWeight="600" fill={PALETTE.SECONDARY}>
                  Gelanggang Futsal, Badminton & Kolam
                </text>
                <text x="592" y="312" fontSize="9" fontWeight="500" fill="rgba(46, 58, 47, 0.5)">
                  Kemudahan Kokurikulum Siswa
                </text>
              </g>

              {/* ==================================================== */}
              {/* ANIMATED VECTOR ROUTE (Laluan Pandu Navigasi) */}
              {/* ==================================================== */}
              {/* Glowing Route Underlay */}
              <path
                d="M 170 280 L 270 200 L 510 200 L 590 120 L 710 120"
                fill="none"
                stroke="rgba(201, 111, 79, 0.3)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active Animated Dashed Route */}
              <path
                d="M 170 280 L 270 200 L 510 200 L 590 120 L 710 120"
                fill="none"
                stroke={PALETTE.ACCENT}
                strokeWidth="4.5"
                strokeDasharray="12 8"
                strokeDashoffset={pathDashOffset}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Directional Chevrons along route */}
              <circle cx="390" cy="200" r="3" fill={PALETTE.ACCENT} />
              <circle cx="450" cy="200" r="3" fill={PALETTE.ACCENT} />

              {/* ==================================================== */}
              {/* START ORIGIN MARKER (Dataran Siswa) */}
              {/* ==================================================== */}
              <g transform="translate(170, 280)">
                {/* Radar pulse */}
                <circle
                  cx="0"
                  cy="0"
                  r={originPulseRadius}
                  fill="none"
                  stroke={PALETTE.SECONDARY}
                  strokeWidth="2"
                  opacity={originPulseOpacity}
                />
                {/* Core pin point */}
                <circle cx="0" cy="0" r="7" fill={PALETTE.SECONDARY} stroke="#FFFFFF" strokeWidth="2.5" />

                {/* Callout Tag */}
                <g transform="translate(0, -18)">
                  <rect
                    x="-65"
                    y="-20"
                    width="130"
                    height="20"
                    rx="4"
                    fill={PALETTE.PRIMARY}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-7"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="800"
                    fill="#FFFFFF"
                    letterSpacing="0.06em"
                  >
                    MULA: DATARAN SISWA
                  </text>
                </g>
              </g>

              {/* ==================================================== */}
              {/* DESTINATION MARKER PIN (Makmal Komputer 3) */}
              {/* ==================================================== */}
              <g transform={`translate(710, ${120 + pinBobY})`}>
                {/* Expanding Concentric Radar Rings */}
                <circle
                  cx="0"
                  cy="0"
                  r={destRadius1}
                  fill="none"
                  stroke={PALETTE.ACCENT}
                  strokeWidth="2"
                  opacity={destOpacity1}
                />
                <circle
                  cx="0"
                  cy="0"
                  r={destRadius2}
                  fill="none"
                  stroke={PALETTE.ACCENT}
                  strokeWidth="1.5"
                  opacity={destOpacity2}
                />

                {/* Marker Pin Head */}
                <circle cx="0" cy="0" r="8" fill={PALETTE.ACCENT} stroke="#FFFFFF" strokeWidth="2.5" />

                {/* High-End Floating Destination Tooltip Box */}
                <g transform="translate(0, -32)">
                  <rect
                    x="-95"
                    y="-30"
                    width="190"
                    height="32"
                    rx="8"
                    fill={PALETTE.PRIMARY}
                    stroke={PALETTE.TERTIARY}
                    strokeWidth="1.5"
                    filter="url(#building-shadow)"
                  />
                  <polygon points="0,2 -6,-2 6,-2" fill={PALETTE.PRIMARY} />
                  <text
                    x="0"
                    y="-16"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="900"
                    fill="#FFFFFF"
                    letterSpacing="0.04em"
                  >
                    Makmal Komputer 3 (Aras 2)
                  </text>
                  <text
                    x="0"
                    y="-6"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="700"
                    fill={PALETTE.ACCENT}
                    letterSpacing="0.06em"
                  >
                    TIBA DLM 3.5 MIN • 280 METER
                  </text>
                </g>
              </g>
            </svg>
          </div>

          {/* Bottom Navigation Telemetry Footer */}
          <div
            style={{
              padding: '16px 28px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderTop: `1px solid ${PALETTE.TERTIARY}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Navigation size={18} color={PALETTE.ACCENT} />
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: PALETTE.SECONDARY }}>
                    JARAK LALUAN
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: PALETTE.PRIMARY }}>
                    280 Meter
                  </div>
                </div>
              </div>

              <div style={{ width: '1px', height: '24px', backgroundColor: PALETTE.TERTIARY }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={18} color={PALETTE.SECONDARY} />
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: PALETTE.SECONDARY }}>
                    ANGGARAN MASA
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: PALETTE.PRIMARY }}>
                    ~3.5 Minit (Berjalan)
                  </div>
                </div>
              </div>

              <div style={{ width: '1px', height: '24px', backgroundColor: PALETTE.TERTIARY }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} color={PALETTE.SECONDARY} />
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: PALETTE.SECONDARY }}>
                    LALUAN BERBUMBUNG
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: PALETTE.PRIMARY }}>
                    100% Bebas Hujan / Panas
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(46, 58, 47, 0.05)',
                fontSize: '12px',
                fontWeight: 700,
                color: PALETTE.PRIMARY,
              }}
            >
              <CheckCircle2 size={14} color={PALETTE.SECONDARY} />
              <span>Laluan Paling Pantas Disahkan</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// CLEAN TYPE-SAFE SEQUENCE STUBS FOR SCENES 2, 3, 4, 5, 6
// ============================================================================

// Scene 2: PolyMart Stub (Frames 315 to 510)
const Scene2Stub: React.FC<{ polyMart: JppIntroVideoProps['polyMart'] }> = ({ polyMart }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(201, 111, 79, 0.12)',
          border: '1px solid rgba(201, 111, 79, 0.3)',
          marginBottom: '20px',
        }}
      >
        <ShoppingBag size={16} color={PALETTE.ACCENT} />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.16em',
            color: PALETTE.ACCENT,
            textTransform: 'uppercase',
          }}
        >
          BABAK 02 • KEUSAHAWANAN DIGITAL SISWA
        </span>
      </div>
      <h2
        style={{
          fontSize: '54px',
          fontWeight: 900,
          color: PALETTE.PRIMARY,
          letterSpacing: '-0.03em',
          margin: '0 0 16px 0',
        }}
      >
        PolyMart Kampus
      </h2>
      <p style={{ fontSize: '22px', color: PALETTE.SECONDARY, maxWidth: '700px', margin: 0 }}>
        Platform pasaran rasmi usahawan mahasiswa — {polyMart.productsCount}+ produk aktif,{' '}
        {polyMart.ordersCount}+ pesanan selesai melalui JPP Pay.
      </p>
    </AbsoluteFill>
  );
};

// Scene 3: PolySuara Stub (Frames 510 to 705)
const Scene3Stub: React.FC<{ polySuara: JppIntroVideoProps['polySuara'] }> = ({ polySuara }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(107, 127, 91, 0.12)',
          border: '1px solid rgba(107, 127, 91, 0.3)',
          marginBottom: '20px',
        }}
      >
        <MessageSquare size={16} color={PALETTE.SECONDARY} />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.16em',
            color: PALETTE.PRIMARY,
            textTransform: 'uppercase',
          }}
        >
          BABAK 03 • SUARA & ASPIRASI SISWA
        </span>
      </div>
      <h2
        style={{
          fontSize: '54px',
          fontWeight: 900,
          color: PALETTE.PRIMARY,
          letterSpacing: '-0.03em',
          margin: '0 0 16px 0',
        }}
      >
        PolySuara & Undian Langsung
      </h2>
      <p style={{ fontSize: '22px', color: PALETTE.SECONDARY, maxWidth: '700px', margin: 0 }}>
        Ruang perkongsian idea, perbincangan sihat & undian komuniti — {polySuara.totalVotes} undian
        direkodkan secara telus dan adil.
      </p>
    </AbsoluteFill>
  );
};

// Scene 4: E-Aduan Stub (Frames 705 to 900)
const Scene4Stub: React.FC<{ eAduan: JppIntroVideoProps['eAduan'] }> = ({ eAduan }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(201, 111, 79, 0.12)',
          border: '1px solid rgba(201, 111, 79, 0.3)',
          marginBottom: '20px',
        }}
      >
        <FileCheck size={16} color={PALETTE.ACCENT} />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.16em',
            color: PALETTE.ACCENT,
            textTransform: 'uppercase',
          }}
        >
          BABAK 04 • KEBAJIKAN & E-ADUAN
        </span>
      </div>
      <h2
        style={{
          fontSize: '54px',
          fontWeight: 900,
          color: PALETTE.PRIMARY,
          letterSpacing: '-0.03em',
          margin: '0 0 16px 0',
        }}
      >
        Penjejakan Aduan Telus
      </h2>
      <p style={{ fontSize: '22px', color: PALETTE.SECONDARY, maxWidth: '700px', margin: 0 }}>
        Tiket #{eAduan.ticketNo} • Tindakan pantas di bawah SLA {eAduan.slaHours} demi kebajikan
        seluruh warga mahasiswa POLISAS.
      </p>
    </AbsoluteFill>
  );
};

// Scene 5: EMS Stub (Frames 900 to 1095)
const Scene5Stub: React.FC<{ ems: JppIntroVideoProps['ems'] }> = ({ ems }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(107, 127, 91, 0.12)',
          border: '1px solid rgba(107, 127, 91, 0.3)',
          marginBottom: '20px',
        }}
      >
        <Award size={16} color={PALETTE.SECONDARY} />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.16em',
            color: PALETTE.PRIMARY,
            textTransform: 'uppercase',
          }}
        >
          BABAK 05 • EVENT MANAGEMENT SYSTEM & E-SIJIL
        </span>
      </div>
      <h2
        style={{
          fontSize: '54px',
          fontWeight: 900,
          color: PALETTE.PRIMARY,
          letterSpacing: '-0.03em',
          margin: '0 0 16px 0',
        }}
      >
        Imbas QR & Sijil Digital Automatik
      </h2>
      <p style={{ fontSize: '22px', color: PALETTE.SECONDARY, maxWidth: '700px', margin: 0 }}>
        Pendaftaran acara sepantas imbasan kamera dan sijil digital sah dengan nombor siri rasmi{' '}
        {ems.certSerial}.
      </p>
    </AbsoluteFill>
  );
};

// Scene 6: Outro Stub (Frames 1095 to 1200)
const Scene6Stub: React.FC<{
  institutionName: string;
  sloganLine1: string;
  sloganLine2: string;
  portalUrl: string;
}> = ({ institutionName, sloganLine1, sloganLine2, portalUrl }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: PALETTE.PRIMARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(46, 58, 47, 0.15)',
        }}
      >
        <Img
          src={staticFile('jpp-logo.png')}
          alt="JPP POLISAS"
          style={{ width: '48px', height: '48px', objectFit: 'contain' }}
        />
      </div>
      <h2
        style={{
          fontSize: '60px',
          fontWeight: 900,
          color: PALETTE.PRIMARY,
          letterSpacing: '-0.03em',
          margin: '0 0 10px 0',
        }}
      >
        {sloganLine1} <span style={{ color: PALETTE.ACCENT }}>{sloganLine2}</span>
      </h2>
      <p
        style={{
          fontSize: '18px',
          fontWeight: 800,
          letterSpacing: '0.2em',
          color: PALETTE.SECONDARY,
          textTransform: 'uppercase',
          marginBottom: '24px',
        }}
      >
        {institutionName}
      </p>
      <div
        style={{
          padding: '10px 24px',
          borderRadius: '9999px',
          backgroundColor: '#FFFFFF',
          border: `1.5px solid ${PALETTE.TERTIARY}`,
          fontSize: '16px',
          fontWeight: 800,
          fontFamily: 'monospace',
          color: PALETTE.ACCENT,
        }}
      >
        {portalUrl}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// MAIN ROOT VIDEO COMPOSITION COMPONENT
// ============================================================================
export const JppIntroVideo: React.FC<JppIntroVideoProps> = ({
  institutionName = 'POLITEKNIK SULTAN HAJI AHMAD SHAH',
  councilName = 'JAWATANKUASA PERWAKILAN PELAJAR',
  sessionLabel = 'SESI AKADEMIK 2026/2027',
  sloganLine1 = 'Perpaduan Progresif',
  sloganLine2 = 'Demi Mahasiswa.',
  portalUrl = 'jpp.polisas.edu.my',
  nextClass = {
    code: 'DIT3013',
    name: 'Pembangunan Aplikasi Web',
    time: '10:00 AM – 12:00 PM',
    room: 'Makmal Komputer 3 (Aras 2)',
    department: 'Jabatan Teknologi Maklumat & Komunikasi',
  },
  polyMart = {
    featuredProduct: 'CHICKEN POPCORN CRISPY',
    vendorName: 'QUADRA H ENTERPRISE',
    price: 'RM 9.00',
    productsCount: 277,
    ordersCount: 344,
  },
  polySuara = {
    pollTitle: 'Menu Sihat Kafeteria Siswa',
    optionA: 'Set Ayam Percik Salad',
    percentageA: 68,
    optionB: 'Sandwic Telur Herba',
    percentageB: 32,
    totalVotes: 412,
  },
  eAduan = {
    ticketNo: 'KBJ-2026-0842',
    category: 'Penyelenggaraan Dewan Kuliah Utama',
    slaHours: '< 48 Jam',
    statusStep: 3,
  },
  ems = {
    eventTitle: 'Malam Anugerah Kecemerlangan Mahasiswa (MAKMP)',
    studentName: 'AMIRUL HAKIM BIN AZMAN',
    matricNo: '04DAT24F1022',
    certSerial: 'EMS-CERT-2026-9041',
  },
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: PALETTE.BACKGROUND,
        color: PALETTE.PRIMARY,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 1. Global Subtle Linen Micro-Grid & Ambient Warm Radiance */}
      <LinenGridTexture />
      <AmbientGlow />
      <ArchitecturalFrame />

      {/* 2. SCENE 0: Pembukaan Rasmi & Identiti (Frames 0 to 120 / 4.0s) */}
      <Sequence from={0} durationInFrames={120} name="Scene 0: Pembukaan Rasmi">
        <Scene0Opening
          institutionName={institutionName}
          councilName={councilName}
          sessionLabel={sessionLabel}
          sloganLine1={sloganLine1}
          sloganLine2={sloganLine2}
          portalUrl={portalUrl}
        />
      </Sequence>

      {/* 3. SCENE 1: Integrasi Jadual Kuliah & PolyMaps (Frames 120 to 315 / 6.5s) */}
      <Sequence from={120} durationInFrames={195} name="Scene 1: Jadual & PolyMaps">
        <Scene1PolyMaps nextClass={nextClass} />
      </Sequence>

      {/* 4. SCENE 2: PolyMart Keusahawanan Digital (Frames 315 to 510 / 6.5s) */}
      <Sequence from={315} durationInFrames={195} name="Scene 2: PolyMart Siswa">
        <Scene2Stub polyMart={polyMart} />
      </Sequence>

      {/* 5. SCENE 3: PolySuara & Undian Siswa (Frames 510 to 705 / 6.5s) */}
      <Sequence from={510} durationInFrames={195} name="Scene 3: PolySuara">
        <Scene3Stub polySuara={polySuara} />
      </Sequence>

      {/* 6. SCENE 4: E-Aduan & Kebajikan Mahasiswa (Frames 705 to 900 / 6.5s) */}
      <Sequence from={705} durationInFrames={195} name="Scene 4: E-Aduan Kebajikan">
        <Scene4Stub eAduan={eAduan} />
      </Sequence>

      {/* 7. SCENE 5: EMS Kehadiran & Sijil Digital (Frames 900 to 1095 / 6.5s) */}
      <Sequence from={900} durationInFrames={195} name="Scene 5: EMS & Sijil Digital">
        <Scene5Stub ems={ems} />
      </Sequence>

      {/* 8. SCENE 6: Penutup Agung Outro (Frames 1095 to 1200 / 3.5s) */}
      <Sequence from={1095} durationInFrames={105} name="Scene 6: Grand Outro">
        <Scene6Stub
          institutionName={institutionName}
          sloganLine1={sloganLine1}
          sloganLine2={sloganLine2}
          portalUrl={portalUrl}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

export default JppIntroVideo;
