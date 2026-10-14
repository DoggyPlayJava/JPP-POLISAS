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
  Star,
  ShoppingCart,
  Store,
  TrendingUp,
  Package,
  QrCode,
  Flame,
  Vote,
  Users,
  Wrench,
  Activity,
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

// ============================================================================
// SCENE 2: SISTEM KEUSAHAWANAN DIGITAL SISWA — POLYMART (Frames 315 to 510)
// ============================================================================
interface Scene2Props {
  polyMart: JppIntroVideoProps['polyMart'];
}

const Scene2PolyMart: React.FC<Scene2Props> = ({ polyMart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance springs
  const headerSpring = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const featuredSpring = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 15, mass: 0.85, stiffness: 85 },
  });

  const sideColSpring = spring({
    frame: Math.max(0, frame - 16),
    fps,
    config: { damping: 15, mass: 0.85, stiffness: 85 },
  });

  const metricsSpring = spring({
    frame: Math.max(0, frame - 24),
    fps,
    config: { damping: 16, mass: 0.9, stiffness: 80 },
  });

  // Exit interpolation at local frames 168 to 195
  const exitProgress = interpolate(frame, [168, 195], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sceneOpacity = (1 - exitProgress) * interpolate(headerSpring, [0, 1], [0, 1]);
  const sceneTranslateY = interpolate(exitProgress, [0, 1], [0, -30]);

  // Card Y animations
  const featuredY = interpolate(featuredSpring, [0, 1], [32, 0]);
  const sideColY = interpolate(sideColSpring, [0, 1], [36, 0]);

  // Dynamic counter calculations
  const animatedProducts = Math.floor(
    Number(
      interpolate(metricsSpring, [0, 1], [0, polyMart.productsCount], {
        extrapolateRight: 'clamp',
      })
    )
  );
  const animatedOrders = Math.floor(
    Number(
      interpolate(metricsSpring, [0, 1], [0, polyMart.ordersCount], {
        extrapolateRight: 'clamp',
      })
    )
  );

  // Subtle continuous motion
  const buttonSheen = Math.sin(frame / 6) * 4;
  const steamOffset = (frame * 1.5) % 40;

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
              backgroundColor: 'rgba(201, 111, 79, 0.12)',
              border: `1px solid rgba(201, 111, 79, 0.3)`,
              marginBottom: '10px',
            }}
          >
            <ShoppingBag size={14} color={PALETTE.ACCENT} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.18em',
                color: PALETTE.ACCENT,
                textTransform: 'uppercase',
              }}
            >
              PASARAN DIGITAL SISWA
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
            PolyMart: Memperkasa Usahawan Kampus
          </h2>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '19px',
              fontWeight: 500,
              color: PALETTE.SECONDARY,
            }}
          >
            Platform e-dagang rasmi mahasiswa — sokong perniagaan rakan sekampus secara selamat & terus.
          </p>
        </div>

        {/* Live Vendor & Payment Telemetry Badge */}
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
              backgroundColor: PALETTE.SECONDARY,
              boxShadow: `0 0 8px ${PALETTE.SECONDARY}`,
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
              JPP PAY ESCROW • BEBAS TUNAI
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: PALETTE.PRIMARY,
              }}
            >
              100% Usahawan Sah Mahasiswa
            </div>
          </div>
        </div>
      </div>

      {/* 2. BENTO LAYOUT */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          flex: 1,
          alignItems: 'stretch',
          minHeight: 0,
        }}
      >
        {/* CARD A: FEATURED PRODUCT SHOWCASE */}
        <div
          style={{
            flex: '0 0 600px',
            transform: `translateY(${featuredY}px)`,
            opacity: featuredSpring,
            backgroundColor: PALETTE.CARD_BG,
            borderRadius: '24px',
            border: `1.5px solid ${PALETTE.TERTIARY}`,
            boxShadow: PALETTE.SHADOW_SOFT,
            padding: '30px',
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
              width: '180px',
              height: '180px',
              background:
                'radial-gradient(circle at 100% 0%, rgba(201, 111, 79, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div>
            {/* Top Product Header Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(201, 111, 79, 0.12)',
                  border: `1px solid rgba(201, 111, 79, 0.3)`,
                }}
              >
                <Flame size={13} color={PALETTE.ACCENT} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: PALETTE.ACCENT,
                    textTransform: 'uppercase',
                  }}
                >
                  PILIHAN TERHANGAT
                </span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(107, 127, 91, 0.12)',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: PALETTE.PRIMARY,
                }}
              >
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: PALETTE.SECONDARY,
                  }}
                />
                <span>Sedia Diambil</span>
              </div>
            </div>

            {/* Product Visual Canvas (Modern Swiss Graphic with Steam Animation) */}
            <div
              style={{
                height: '240px',
                borderRadius: '18px',
                backgroundColor: '#F7F4EC',
                border: `1px solid ${PALETTE.TERTIARY}`,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 540 240" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="popcorn-box" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C96F4F" />
                    <stop offset="100%" stopColor="#A85235" />
                  </linearGradient>
                  <linearGradient id="popcorn-crisp" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F5B942" />
                    <stop offset="100%" stopColor="#DF9326" />
                  </linearGradient>
                </defs>

                {/* Background decorative soft circles */}
                <circle cx="270" cy="120" r="95" fill="rgba(217, 201, 178, 0.25)" />
                <circle cx="270" cy="120" r="75" fill="rgba(255, 255, 255, 0.7)" />

                {/* Rising Steam trails */}
                {[230, 260, 290, 310].map((x, i) => {
                  const steamY = 75 - ((steamOffset + i * 10) % 40);
                  const steamOp = 1 - ((steamOffset + i * 10) % 40) / 40;
                  return (
                    <path
                      key={i}
                      d={`M ${x} ${steamY + 15} Q ${x + Math.sin((frame + i * 10) / 5) * 6} ${steamY + 7}, ${x} ${steamY}`}
                      fill="none"
                      stroke={PALETTE.ACCENT}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity={steamOp * 0.6}
                    />
                  );
                })}

                {/* Popcorn Chicken Box Container */}
                <g transform="translate(195, 80)">
                  {/* Golden crispy popcorn clusters overflowing */}
                  <circle cx="45" cy="18" r="22" fill="url(#popcorn-crisp)" />
                  <circle cx="75" cy="12" r="24" fill="#F8C358" />
                  <circle cx="105" cy="18" r="22" fill="url(#popcorn-crisp)" />
                  <circle cx="30" cy="32" r="20" fill="#E6A12E" />
                  <circle cx="60" cy="28" r="25" fill="#F8C358" />
                  <circle cx="90" cy="28" r="24" fill="#E6A12E" />
                  <circle cx="120" cy="32" r="20" fill="url(#popcorn-crisp)" />

                  {/* Sesame / Herb seasoning specks */}
                  <circle cx="55" cy="22" r="1.5" fill="#2E3A2F" />
                  <circle cx="78" cy="18" r="1.5" fill="#2E3A2F" />
                  <circle cx="92" cy="26" r="1.5" fill="#2E3A2F" />
                  <circle cx="68" cy="30" r="1.5" fill="#6B7F5B" />

                  {/* Red/Terracotta Takeaway Box */}
                  <polygon points="15,45 135,45 120,125 30,125" fill="url(#popcorn-box)" />
                  <polygon points="25,45 125,45 113,120 37,120" fill="#B35A3D" />

                  {/* Label strip on box */}
                  <rect x="42" y="70" width="66" height="28" rx="6" fill="#FFFFFF" />
                  <text
                    x="75"
                    y="84"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="900"
                    fill={PALETTE.PRIMARY}
                    letterSpacing="0.08em"
                  >
                    POLY
                  </text>
                  <text
                    x="75"
                    y="93"
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="800"
                    fill={PALETTE.ACCENT}
                    letterSpacing="0.08em"
                  >
                    MART
                  </text>
                </g>
              </svg>

              {/* Floating review star badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 4px 12px rgba(46, 58, 47, 0.08)',
                  border: `1px solid ${PALETTE.TERTIARY}`,
                }}
              >
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} fill="#E5A93C" color="#E5A93C" />
                  ))}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: PALETTE.PRIMARY }}>
                  4.9
                </span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: PALETTE.SECONDARY }}>
                  (128)
                </span>
              </div>
            </div>

            {/* Product Details */}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: PALETTE.SECONDARY,
                  textTransform: 'uppercase',
                }}
              >
                KATEGORI: MAKANAN & SNEK SEGAR
              </div>
              <h3
                style={{
                  margin: '4px 0 6px 0',
                  fontSize: '28px',
                  fontWeight: 900,
                  color: PALETTE.PRIMARY,
                  letterSpacing: '-0.02em',
                }}
              >
                {polyMart.featuredProduct}
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: PALETTE.SECONDARY,
                }}
              >
                <Store size={15} color={PALETTE.SECONDARY} />
                <span>Vendor:</span>
                <span style={{ color: PALETTE.PRIMARY, fontWeight: 800 }}>
                  {polyMart.vendorName}
                </span>
                <div
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(107, 127, 91, 0.15)',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: PALETTE.PRIMARY,
                  }}
                >
                  ✓ VERIFIED
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Price & Purchase Row */}
          <div
            style={{
              paddingTop: '18px',
              borderTop: `1px solid ${PALETTE.TERTIARY}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: PALETTE.SECONDARY,
                  textTransform: 'uppercase',
                }}
              >
                HARGA KAMPUS
              </div>
              <div
                style={{
                  fontSize: '34px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: PALETTE.ACCENT,
                  letterSpacing: '-0.02em',
                }}
              >
                {polyMart.price}
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 28px',
                borderRadius: '14px',
                backgroundColor: PALETTE.ACCENT,
                color: '#FFFFFF',
                boxShadow: '0 8px 20px -4px rgba(201, 111, 79, 0.35)',
              }}
            >
              <ShoppingCart size={18} />
              <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.04em' }}>
                Pesan Terus • JPP Pay
              </span>
              <ArrowRight
                size={16}
                style={{ transform: `translateX(${buttonSheen}px)` }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SECOND PRODUCT + METRICS + SAFETY GUARANTEE */}
        <div
          style={{
            flex: 1,
            transform: `translateY(${sideColY}px)`,
            opacity: sideColSpring,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* CARD B1: SECOND PRODUCT (Lanyard Rasmi JPP POLISAS) */}
          <div
            style={{
              backgroundColor: PALETTE.CARD_BG,
              borderRadius: '22px',
              border: `1.5px solid ${PALETTE.TERTIARY}`,
              boxShadow: PALETTE.SHADOW_SOFT,
              padding: '24px',
              display: 'flex',
              gap: '24px',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Lanyard Vector Art */}
            <div
              style={{
                width: '160px',
                height: '140px',
                borderRadius: '16px',
                backgroundColor: '#F7F4EC',
                border: `1px solid ${PALETTE.TERTIARY}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 160 140">
                {/* Woven Strap Curves */}
                <path
                  d="M 40 10 C 60 40, 80 50, 80 90"
                  fill="none"
                  stroke={PALETTE.PRIMARY}
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M 120 10 C 100 40, 80 50, 80 90"
                  fill="none"
                  stroke={PALETTE.SECONDARY}
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Gold Metal Clasp & Ring */}
                <circle cx="80" cy="95" r="10" fill="none" stroke="#D4A346" strokeWidth="3" />
                {/* ID Badge Holder */}
                <rect
                  x="56"
                  y="105"
                  width="48"
                  height="30"
                  rx="4"
                  fill="#FFFFFF"
                  stroke={PALETTE.TERTIARY}
                  strokeWidth="1.5"
                />
                <rect x="62" y="112" width="16" height="16" rx="2" fill="rgba(46, 58, 47, 0.15)" />
                <line x1="84" y1="116" x2="98" y2="116" stroke={PALETTE.PRIMARY} strokeWidth="2" />
                <line x1="84" y1="122" x2="94" y2="122" stroke={PALETTE.SECONDARY} strokeWidth="1.5" />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: PALETTE.PRIMARY,
                  color: '#FFFFFF',
                  fontSize: '8px',
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                }}
              >
                MERCHANDISE
              </div>
            </div>

            {/* Lanyard Info */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(107, 127, 91, 0.12)',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: PALETTE.SECONDARY,
                    textTransform: 'uppercase',
                  }}
                >
                  <Sparkles size={11} color={PALETTE.SECONDARY} />
                  <span>Koleksi Terhad</span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: PALETTE.SECONDARY,
                  }}
                >
                  Baki 42 Unit
                </div>
              </div>

              <h4
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '22px',
                  fontWeight: 900,
                  color: PALETTE.PRIMARY,
                  letterSpacing: '-0.02em',
                }}
              >
                Lanyard Rasmi JPP POLISAS
              </h4>
              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: PALETTE.SECONDARY,
                }}
              >
                Koperasi Siswa & Merchandise JPP • Cetakan Woven Mewah
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span
                  style={{
                    fontSize: '26px',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    color: PALETTE.PRIMARY,
                  }}
                >
                  RM 15.00
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: PALETTE.SECONDARY,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(46, 58, 47, 0.05)',
                  }}
                >
                  ★ 5.0 (240 Terjual)
                </span>
              </div>
            </div>
          </div>

          {/* CARD B2: LIVE METRICS BENTO (3 TELEMETRY COLUMNS) */}
          <div
            style={{
              backgroundColor: PALETTE.CARD_BG,
              borderRadius: '22px',
              border: `1.5px solid ${PALETTE.TERTIARY}`,
              boxShadow: PALETTE.SHADOW_SOFT,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: PALETTE.SECONDARY,
                textTransform: 'uppercase',
              }}
            >
              STATISTIK PERDAGANGAN DIGITAL KAMPUS
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}
            >
              {/* Metric 1 */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(248, 246, 238, 0.7)',
                  border: `1px solid ${PALETTE.TERTIARY}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Package size={16} color={PALETTE.SECONDARY} />
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      color: PALETTE.SECONDARY,
                      textTransform: 'uppercase',
                    }}
                  >
                    PRODUK SISWA
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    color: PALETTE.PRIMARY,
                    lineHeight: 1,
                  }}
                >
                  {animatedProducts}+
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: PALETTE.SECONDARY,
                    marginTop: '6px',
                  }}
                >
                  Katalog Aktif Kampus
                </div>
              </div>

              {/* Metric 2 */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(248, 246, 238, 0.7)',
                  border: `1px solid ${PALETTE.TERTIARY}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <TrendingUp size={16} color={PALETTE.ACCENT} />
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      color: PALETTE.ACCENT,
                      textTransform: 'uppercase',
                    }}
                  >
                    PESANAN KAMPUS
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    color: PALETTE.ACCENT,
                    lineHeight: 1,
                  }}
                >
                  {animatedOrders}+
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: PALETTE.SECONDARY,
                    marginTop: '6px',
                  }}
                >
                  Pesanan Berjaya Selesai
                </div>
              </div>

              {/* Metric 3 */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(248, 246, 238, 0.7)',
                  border: `1px solid ${PALETTE.TERTIARY}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Store size={16} color={PALETTE.PRIMARY} />
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      color: PALETTE.PRIMARY,
                      textTransform: 'uppercase',
                    }}
                  >
                    USAHAWAN SISWA
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    color: PALETTE.PRIMARY,
                    lineHeight: 1,
                  }}
                >
                  100%
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: PALETTE.SECONDARY,
                    marginTop: '6px',
                  }}
                >
                  Milik Penuh Pelajar
                </div>
              </div>
            </div>
          </div>

          {/* CARD B3: SAFETY GUARANTEE PILL */}
          <div
            style={{
              padding: '16px 24px',
              borderRadius: '18px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${PALETTE.TERTIARY}`,
              boxShadow: PALETTE.SHADOW_SOFT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(107, 127, 91, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={20} color={PALETTE.SECONDARY} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: PALETTE.PRIMARY,
                    letterSpacing: '0.02em',
                  }}
                >
                  JPP Pay Selamat • Imbas & Ambil
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: PALETTE.SECONDARY }}>
                  Dana dipegang secara escrow — dilepaskan serta-merta selepas kod pesanan diimbas.
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
                fontSize: '11px',
                fontWeight: 800,
                color: PALETTE.PRIMARY,
              }}
            >
              <QrCode size={14} color={PALETTE.ACCENT} />
              <span>QR VERIFIKASI</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE 3: RUANG SUARA & EKSPRESI SISWA — POLYSUARA (Frames 510 to 705)
// ============================================================================
interface Scene3Props {
  polySuara: JppIntroVideoProps['polySuara'];
}

const Scene3PolySuara: React.FC<Scene3Props> = ({ polySuara }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance springs
  const headerSpring = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const pollCardSpring = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 15, mass: 0.85, stiffness: 85 },
  });

  const feedCardSpring = spring({
    frame: Math.max(0, frame - 16),
    fps,
    config: { damping: 15, mass: 0.85, stiffness: 85 },
  });

  // Animated poll progress
  const pollSpring = spring({
    frame: Math.max(0, frame - 22),
    fps,
    config: { damping: 16, mass: 0.9, stiffness: 80 },
  });

  // Floating staggered reaction chips
  const heartSpring = spring({
    frame: Math.max(0, frame - 32),
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 120 },
  });
  const fireSpring = spring({
    frame: Math.max(0, frame - 38),
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 120 },
  });
  const trophySpring = spring({
    frame: Math.max(0, frame - 44),
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 120 },
  });
  const sparklesSpring = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 120 },
  });

  // Exit interpolation at local frames 168 to 195
  const exitProgress = interpolate(frame, [168, 195], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sceneOpacity = (1 - exitProgress) * interpolate(headerSpring, [0, 1], [0, 1]);
  const sceneTranslateY = interpolate(exitProgress, [0, 1], [0, -30]);

  // Card Y animations
  const pollCardY = interpolate(pollCardSpring, [0, 1], [32, 0]);
  const feedCardY = interpolate(feedCardSpring, [0, 1], [36, 0]);

  // Dynamic poll values
  const animatedPercentA = Math.round(
    Number(
      interpolate(pollSpring, [0, 1], [0, polySuara.percentageA], {
        extrapolateRight: 'clamp',
      })
    )
  );
  const animatedPercentB = Math.round(
    Number(
      interpolate(pollSpring, [0, 1], [0, polySuara.percentageB], {
        extrapolateRight: 'clamp',
      })
    )
  );
  const animatedVotes = Math.round(
    Number(
      interpolate(pollSpring, [0, 1], [0, polySuara.totalVotes], {
        extrapolateRight: 'clamp',
      })
    )
  );

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
            <MessageSquare size={14} color={PALETTE.SECONDARY} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.18em',
                color: PALETTE.PRIMARY,
                textTransform: 'uppercase',
              }}
            >
              HAB KOMUNITI MAHASISWA
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
            PolySuara: Ruang Suara & Ekspresi Siswa
          </h2>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '19px',
              fontWeight: 500,
              color: PALETTE.SECONDARY,
            }}
          >
            Saluran pendemokrasian kampus — undian masa nyata, idea bernas dan suara komuniti yang telus.
          </p>
        </div>

        {/* Live Voting Telemetry Badge */}
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
              UNDIAN DEMOKRASI • SINGLE SIGN-ON
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: PALETTE.PRIMARY,
              }}
            >
              1 Pelajar = 1 Undi Sah Terpelihara
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
        {/* CARD A: LIVE CAMPUS POLL CARD */}
        <div
          style={{
            flex: '0 0 620px',
            transform: `translateY(${pollCardY}px)`,
            opacity: pollCardSpring,
            backgroundColor: PALETTE.CARD_BG,
            borderRadius: '24px',
            border: `1.5px solid ${PALETTE.TERTIARY}`,
            boxShadow: PALETTE.SHADOW_SOFT,
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Sage glow */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '180px',
              height: '180px',
              background:
                'radial-gradient(circle at 100% 0%, rgba(107, 127, 91, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div>
            {/* Top Status & Badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(201, 111, 79, 0.12)',
                  border: `1px solid rgba(201, 111, 79, 0.3)`,
                }}
              >
                <Radio size={13} color={PALETTE.ACCENT} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    color: PALETTE.ACCENT,
                    textTransform: 'uppercase',
                  }}
                >
                  UNDIAN LANGSUNG AKTIF
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
                BERAKHIR DALAM 48 JAM
              </span>
            </div>

            {/* Poll Category & Question */}
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: PALETTE.SECONDARY,
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              ASPIRASI & KEBAJIKAN SISWA • SESI 2026/2027
            </div>

            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '26px',
                fontWeight: 900,
                color: PALETTE.PRIMARY,
                lineHeight: 1.3,
                letterSpacing: '-0.02em',
              }}
            >
              {polySuara.pollTitle || 'Cadangan Penambahbaikan Menu Kafeteria Sesi 2026/2027'}
            </h3>

            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                fontWeight: 500,
                color: PALETTE.SECONDARY,
              }}
            >
              Pilihan majoriti akan dijadikan usul rasmi pertemuan MPP bersama pihak pengurusan kafeteria POLISAS.
            </p>

            {/* Poll Options (A & B) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Option A: Winning Option */}
              <div
                style={{
                  padding: '20px 22px',
                  borderRadius: '18px',
                  backgroundColor: 'rgba(107, 127, 91, 0.08)',
                  border: `2px solid ${PALETTE.SECONDARY}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Animated Percentage Fill Bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${animatedPercentA}%`,
                    backgroundColor: 'rgba(107, 127, 91, 0.16)',
                    pointerEvents: 'none',
                    transition: 'width 0.1s linear',
                  }}
                />

                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: PALETTE.SECONDARY,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={18} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            color: PALETTE.PRIMARY,
                          }}
                        >
                          {polySuara.optionA}
                        </span>
                        <div
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(201, 111, 79, 0.15)',
                            fontSize: '10px',
                            fontWeight: 800,
                            color: PALETTE.ACCENT,
                            textTransform: 'uppercase',
                          }}
                        >
                          Pilihan Teratas ★
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: PALETTE.SECONDARY,
                          marginTop: '2px',
                        }}
                      >
                        Pilihan Sihat & Sayuran Segar Harian
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '32px',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        color: PALETTE.PRIMARY,
                        lineHeight: 1,
                      }}
                    >
                      {animatedPercentA}%
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: PALETTE.SECONDARY,
                        marginTop: '4px',
                      }}
                    >
                      {Math.round((animatedVotes * polySuara.percentageA) / 100)} Undian
                    </div>
                  </div>
                </div>
              </div>

              {/* Option B: Alternative Option */}
              <div
                style={{
                  padding: '20px 22px',
                  borderRadius: '18px',
                  backgroundColor: 'rgba(248, 246, 238, 0.8)',
                  border: `1.5px solid ${PALETTE.TERTIARY}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Animated Percentage Fill Bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${animatedPercentB}%`,
                    backgroundColor: 'rgba(217, 201, 178, 0.35)',
                    pointerEvents: 'none',
                    transition: 'width 0.1s linear',
                  }}
                />

                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: `2px solid ${PALETTE.TERTIARY}`,
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: PALETTE.TERTIARY,
                        }}
                      />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: 800,
                          color: PALETTE.PRIMARY,
                        }}
                      >
                        {polySuara.optionB}
                      </span>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: PALETTE.SECONDARY,
                          marginTop: '2px',
                        }}
                      >
                        Pek Sarapan Pantas & Ringkas
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '32px',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        color: PALETTE.SECONDARY,
                        lineHeight: 1,
                      }}
                    >
                      {animatedPercentB}%
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: PALETTE.SECONDARY,
                        marginTop: '4px',
                      }}
                    >
                      {Math.round((animatedVotes * polySuara.percentageB) / 100)} Undian
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Live Voting Tally */}
          <div
            style={{
              paddingTop: '20px',
              borderTop: `1px solid ${PALETTE.TERTIARY}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Vote size={18} color={PALETTE.ACCENT} />
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: PALETTE.PRIMARY,
                }}
              >
                {animatedVotes} Undian Sah Disahkan
              </span>
            </div>

            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: PALETTE.SECONDARY,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={15} color={PALETTE.SECONDARY} />
              <span>Sistem Undian Telus & Bebas Manipulasi</span>
            </div>
          </div>
        </div>

        {/* CARD B: STUDENT COMMUNITY FEED & FLOATING REACTION CHIPS */}
        <div
          style={{
            flex: 1,
            transform: `translateY(${feedCardY}px)`,
            opacity: feedCardSpring,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Main Community Post Card */}
          <div
            style={{
              backgroundColor: PALETTE.CARD_BG,
              borderRadius: '24px',
              border: `1.5px solid ${PALETTE.TERTIARY}`,
              boxShadow: PALETTE.SHADOW_SOFT,
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flex: 1,
            }}
          >
            <div>
              {/* Post Header: Codename & Verified Badge */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Anonymous Tech Cat Avatar */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(46, 58, 47, 0.08)',
                      border: `1.5px solid ${PALETTE.TERTIARY}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                    }}
                  >
                    🐱
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '17px',
                          fontWeight: 900,
                          color: PALETTE.PRIMARY,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        KucingTekno #204
                      </span>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(107, 127, 91, 0.15)',
                          fontSize: '10px',
                          fontWeight: 800,
                          color: PALETTE.PRIMARY,
                        }}
                      >
                        <CheckCircle2 size={11} color={PALETTE.SECONDARY} />
                        <span>SISWA SAH POLISAS</span>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: PALETTE.SECONDARY,
                        marginTop: '2px',
                      }}
                    >
                      30 minit lepas • Dataran Siswa Semambu
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(201, 111, 79, 0.12)',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: PALETTE.ACCENT,
                  }}
                >
                  TOPIK HANGAT 🔥
                </div>
              </div>

              {/* Post Snippet Box */}
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(248, 246, 238, 0.9)',
                  border: `1px solid ${PALETTE.TERTIARY}`,
                  marginBottom: '20px',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 600,
                    color: PALETTE.PRIMARY,
                    lineHeight: 1.5,
                  }}
                >
                  “Kafeteria Blok B dah tambah stesen air mineral percuma & pilihan menu sihat!
                  Terbaik respon pantas MPP & Pengurusan POLISAS bila kita suarakan dalam PolySuara 👏🌿”
                </p>
              </div>

              {/* Floating Reaction Chips popping with staggered spring physics */}
              <div style={{ marginBottom: '14px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: PALETTE.SECONDARY,
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                  }}
                >
                  REAKSI KOMUNITI MAHASISWA
                </div>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  {[
                    {
                      label: '❤️ Kasih Siswa',
                      count: '84',
                      spring: heartSpring,
                      color: '#E04F5F',
                      bg: 'rgba(224, 79, 95, 0.1)',
                      border: 'rgba(224, 79, 95, 0.3)',
                    },
                    {
                      label: '🔥 Padu / Mantap',
                      count: '56',
                      spring: fireSpring,
                      color: PALETTE.ACCENT,
                      bg: 'rgba(201, 111, 79, 0.1)',
                      border: 'rgba(201, 111, 79, 0.3)',
                    },
                    {
                      label: '🏆 Terbaik JPP',
                      count: '39',
                      spring: trophySpring,
                      color: '#D4A346',
                      bg: 'rgba(212, 163, 70, 0.12)',
                      border: 'rgba(212, 163, 70, 0.35)',
                    },
                    {
                      label: '✨ Inspirasi',
                      count: '72',
                      spring: sparklesSpring,
                      color: PALETTE.SECONDARY,
                      bg: 'rgba(107, 127, 91, 0.12)',
                      border: 'rgba(107, 127, 91, 0.3)',
                    },
                  ].map((chip, idx) => {
                    const bobY = Math.sin((frame + idx * 8) / 5) * 3;
                    return (
                      <div
                        key={idx}
                        style={{
                          transform: `scale(${chip.spring}) translateY(${bobY}px)`,
                          opacity: chip.spring,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          borderRadius: '9999px',
                          backgroundColor: chip.bg,
                          border: `1.5px solid ${chip.border}`,
                          boxShadow: '0 4px 12px rgba(46, 58, 47, 0.05)',
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 800, color: PALETTE.PRIMARY }}>
                          {chip.label}
                        </span>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            color: chip.color,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          +{chip.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Engagement Telemetry Strip */}
            <div
              style={{
                paddingTop: '16px',
                borderTop: `1px solid ${PALETTE.TERTIARY}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                fontWeight: 600,
                color: PALETTE.SECONDARY,
              }}
            >
              <span>💬 18 Komen Bernas</span>
              <span>•</span>
              <span>🔄 42 Perkongsian Aspirasi</span>
              <span>•</span>
              <span style={{ color: PALETTE.PRIMARY, fontWeight: 800 }}>
                🛡️ 100% Moderasi Komuniti Harmoni
              </span>
            </div>
          </div>

          {/* Privacy & Safe Space Assurance Banner */}
          <div
            style={{
              padding: '16px 24px',
              borderRadius: '18px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${PALETTE.TERTIARY}`,
              boxShadow: PALETTE.SHADOW_SOFT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(107, 127, 91, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={18} color={PALETTE.SECONDARY} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: PALETTE.PRIMARY }}>
                  Identiti Terpelihara • Kebebasan Bersuara Beradab
                </div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: PALETTE.SECONDARY }}>
                  Platform beretika bebas buli siber demi kemajuan seluruh mahasiswa POLISAS.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(46, 58, 47, 0.05)',
                fontSize: '11px',
                fontWeight: 800,
                color: PALETTE.PRIMARY,
              }}
            >
              POLISUARA VERIFIED
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE 4: SISTEM KEBAJIKAN & E-ADUAN (Frames 705 to 900)
// ============================================================================
interface Scene4Props {
  eAduan: JppIntroVideoProps['eAduan'];
}

const Scene4EAduan: React.FC<Scene4Props> = ({ eAduan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance springs
  const headerSpring = spring({
    frame: Math.max(0, frame - 2),
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const ticketCardSpring = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 15, mass: 0.85, stiffness: 85 },
  });

  const trackerCardSpring = spring({
    frame: Math.max(0, frame - 16),
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

  // Card Y animations
  const ticketCardY = interpolate(ticketCardSpring, [0, 1], [32, 0]);
  const trackerCardY = interpolate(trackerCardSpring, [0, 1], [36, 0]);

  // Step 3 Radar Glow Pulse (Concentric rings)
  const ringPulse1 = (frame * 1.5) % 36;
  const ringRadius1 = 16 + (ringPulse1 / 36) * 24;
  const ringOpacity1 = 1 - ringPulse1 / 36;

  const ringPulse2 = ((frame * 1.5) + 18) % 36;
  const ringRadius2 = 16 + (ringPulse2 / 36) * 24;
  const ringOpacity2 = 1 - ringPulse2 / 36;

  const connectorDashOffset = -frame * 3;

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
              backgroundColor: 'rgba(201, 111, 79, 0.12)',
              border: `1px solid rgba(201, 111, 79, 0.3)`,
              marginBottom: '10px',
            }}
          >
            <FileCheck size={14} color={PALETTE.ACCENT} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.18em',
                color: PALETTE.ACCENT,
                textTransform: 'uppercase',
              }}
            >
              SISTEM KEBAJIKAN & PRIHATIN
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
            E-Aduan: Respon Pantas Kebajikan Siswa
          </h2>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '19px',
              fontWeight: 500,
              color: PALETTE.SECONDARY,
            }}
          >
            Penjejakan aduan telus, tindakan pantas berperingkat & pemantauan kebajikan mahasiswa secara komprehensif.
          </p>
        </div>

        {/* Live SLA Telemetry Badge */}
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
              SLA PIAGAM PELANGGAN
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: PALETTE.PRIMARY,
              }}
            >
              Tindakan Dalam {eAduan.slaHours}
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
        {/* CARD A: ACTIVE TICKET DETAILS CARD */}
        <div
          style={{
            flex: '0 0 580px',
            transform: `translateY(${ticketCardY}px)`,
            opacity: ticketCardSpring,
            backgroundColor: PALETTE.CARD_BG,
            borderRadius: '24px',
            border: `1.5px solid ${PALETTE.TERTIARY}`,
            boxShadow: PALETTE.SHADOW_SOFT,
            padding: '32px',
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
              width: '180px',
              height: '180px',
              background:
                'radial-gradient(circle at 100% 0%, rgba(201, 111, 79, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div>
            {/* Top Ticket Header: Ticket ID & SLA Badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(201, 111, 79, 0.12)',
                  border: `1px solid rgba(201, 111, 79, 0.3)`,
                }}
              >
                <FileCheck size={16} color={PALETTE.ACCENT} />
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    color: PALETTE.ACCENT,
                  }}
                >
                  #{eAduan.ticketNo}
                </span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(107, 127, 91, 0.12)',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: PALETTE.PRIMARY,
                }}
              >
                <Clock size={12} color={PALETTE.SECONDARY} />
                <span>SLA: {eAduan.slaHours}</span>
              </div>
            </div>

            {/* Category Title */}
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: PALETTE.SECONDARY,
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              KATEGORI ADUAN
            </div>
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '26px',
                fontWeight: 900,
                color: PALETTE.PRIMARY,
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
              }}
            >
              {eAduan.category}
            </h3>

            {/* Priority & Metadata Pills */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(201, 111, 79, 0.12)',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: PALETTE.ACCENT,
                  textTransform: 'uppercase',
                }}
              >
                KEUTAMAAN: TINGGI
              </div>
              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(46, 58, 47, 0.06)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: PALETTE.PRIMARY,
                }}
              >
                Lokasi: DKU Zon B
              </div>
            </div>

            {/* Ticket Report Details Box */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: '16px',
                backgroundColor: 'rgba(248, 246, 238, 0.9)',
                border: `1px solid ${PALETTE.TERTIARY}`,
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  color: PALETTE.SECONDARY,
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                BUTIRAN ADUAN
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: PALETTE.PRIMARY,
                  lineHeight: 1.45,
                }}
              >
                Unit pendingin hawa Dewan Kuliah Utama tidak sejuk sepenuhnya sebelum sesi taklimat mahasiswa
                gabungan 300 pelajar petang ini.
              </p>
            </div>

            {/* Quick Action Dispatch Tag */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '14px',
                backgroundColor: 'rgba(107, 127, 91, 0.1)',
                border: `1px solid rgba(107, 127, 91, 0.3)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color={PALETTE.SECONDARY} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: PALETTE.PRIMARY }}>
                  Disemak & Diluluskan Exco Kebajikan JPP
                </span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: PALETTE.SECONDARY,
                  marginTop: '4px',
                }}
              >
                Arahan Kerja #UPF-2026-M119 dihantar terus kepada Unit Pembangunan & Fasiliti.
              </div>
            </div>
          </div>

          {/* Bottom Status Summary */}
          <div
            style={{
              paddingTop: '18px',
              borderTop: `1px solid ${PALETTE.TERTIARY}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color={PALETTE.ACCENT} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: PALETTE.PRIMARY }}>
                Status: Fasa 3 Tindakan Tapak
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
              DIHANTAR: HARI INI • 08:30 AM
            </span>
          </div>
        </div>

        {/* CARD B: LIVE 4-STEP STEPPER TRACKER & WELFARE METRICS */}
        <div
          style={{
            flex: 1,
            transform: `translateY(${trackerCardY}px)`,
            opacity: trackerCardSpring,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* STEPPER TRACKER MAIN CARD */}
          <div
            style={{
              backgroundColor: PALETTE.CARD_BG,
              borderRadius: '24px',
              border: `1.5px solid ${PALETTE.TERTIARY}`,
              boxShadow: PALETTE.SHADOW_SOFT,
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flex: 1,
            }}
          >
            <div>
              {/* Stepper Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '28px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      color: PALETTE.SECONDARY,
                      textTransform: 'uppercase',
                    }}
                  >
                    PENJEJAKAN STATUS PROSES
                  </div>
                  <h4
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '22px',
                      fontWeight: 900,
                      color: PALETTE.PRIMARY,
                    }}
                  >
                    Aliran Tindakan E-Aduan Telus
                  </h4>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(201, 111, 79, 0.12)',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: PALETTE.ACCENT,
                  }}
                >
                  <Clock size={13} color={PALETTE.ACCENT} />
                  <span>Baki SLA: 38 Jam 45 Minit</span>
                </div>
              </div>

              {/* 4-Step Stepper Component */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  position: 'relative',
                  marginBottom: '32px',
                  padding: '0 20px',
                }}
              >
                {/* Stepper Vector Connectors (Underlay) */}
                <svg
                  style={{
                    position: 'absolute',
                    top: '24px',
                    left: '50px',
                    right: '50px',
                    width: 'calc(100% - 100px)',
                    height: '8px',
                    overflow: 'visible',
                    zIndex: 0,
                  }}
                >
                  {/* Step 1 to Step 2: Completed line */}
                  <line
                    x1="0%"
                    y1="4"
                    x2="33.3%"
                    y2="4"
                    stroke={PALETTE.SECONDARY}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* Step 2 to Step 3: Active animated dash line */}
                  <line
                    x1="33.3%"
                    y1="4"
                    x2="66.6%"
                    y2="4"
                    stroke={PALETTE.ACCENT}
                    strokeWidth="4"
                    strokeDasharray="8 6"
                    strokeDashoffset={connectorDashOffset}
                    strokeLinecap="round"
                  />
                  {/* Step 3 to Step 4: Pending line */}
                  <line
                    x1="66.6%"
                    y1="4"
                    x2="100%"
                    y2="4"
                    stroke={PALETTE.TERTIARY}
                    strokeWidth="4"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                </svg>

                {/* 4 Step Nodes */}
                {[
                  {
                    step: 1,
                    title: 'Dihantar',
                    desc: '08:30 AM • Tiket Masuk',
                    state: 'completed',
                  },
                  {
                    step: 2,
                    title: 'Disemak JPP',
                    desc: '09:15 AM • Diluluskan Exco',
                    state: 'completed',
                  },
                  {
                    step: 3,
                    title: 'Tindakan Fasiliti',
                    desc: '11:00 AM • Pasukan Di Tapak',
                    state: 'active',
                  },
                  {
                    step: 4,
                    title: 'Selesai',
                    desc: 'Pengesahan Pelajar',
                    state: 'pending',
                  },
                ].map((item, idx) => {
                  const isActive = item.state === 'active';
                  const isCompleted = item.state === 'completed';

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        zIndex: 2,
                        position: 'relative',
                        width: '160px',
                      }}
                    >
                      {/* Node Circle Wrapper with Radar Ring if Active */}
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '12px',
                        }}
                      >
                        {isActive && (
                          <svg
                            style={{
                              position: 'absolute',
                              top: '-20px',
                              left: '-20px',
                              width: '88px',
                              height: '88px',
                              pointerEvents: 'none',
                            }}
                          >
                            <circle
                              cx="44"
                              cy="44"
                              r={ringRadius1}
                              fill="none"
                              stroke={PALETTE.ACCENT}
                              strokeWidth="2"
                              opacity={ringOpacity1}
                            />
                            <circle
                              cx="44"
                              cy="44"
                              r={ringRadius2}
                              fill="none"
                              stroke={PALETTE.ACCENT}
                              strokeWidth="1.5"
                              opacity={ringOpacity2}
                            />
                          </svg>
                        )}

                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: isCompleted
                              ? PALETTE.SECONDARY
                              : isActive
                              ? PALETTE.ACCENT
                              : '#FFFFFF',
                            border: `2.5px solid ${
                              isCompleted
                                ? PALETTE.SECONDARY
                                : isActive
                                ? PALETTE.ACCENT
                                : PALETTE.TERTIARY
                            }`,
                            boxShadow: isActive
                              ? '0 0 16px rgba(201, 111, 79, 0.4)'
                              : '0 4px 10px rgba(46, 58, 47, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isCompleted || isActive ? '#FFFFFF' : PALETTE.SECONDARY,
                            fontWeight: 900,
                            fontSize: '15px',
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={22} color="#FFFFFF" />
                          ) : isActive ? (
                            <Wrench size={20} color="#FFFFFF" />
                          ) : (
                            <span>{item.step}</span>
                          )}
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: isActive ? 900 : 800,
                          color: isActive ? PALETTE.ACCENT : PALETTE.PRIMARY,
                          marginBottom: '3px',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: PALETTE.SECONDARY,
                        }}
                      >
                        {item.desc}
                      </div>
                      {isActive && (
                        <div
                          style={{
                            marginTop: '6px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: 'rgba(201, 111, 79, 0.15)',
                            fontSize: '9px',
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            color: PALETTE.ACCENT,
                            textTransform: 'uppercase',
                          }}
                        >
                          SEDANG DIJALANKAN
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* On-Site Dispatch Technician Callout */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(248, 246, 238, 0.9)',
                  border: `1.5px solid ${PALETTE.TERTIARY}`,
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
                    backgroundColor: 'rgba(201, 111, 79, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Wrench size={22} color={PALETTE.ACCENT} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      color: PALETTE.ACCENT,
                      textTransform: 'uppercase',
                    }}
                  >
                    LAPORAN TINDAKAN TAPAK UPF
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: PALETTE.PRIMARY,
                      marginTop: '2px',
                    }}
                  >
                    Juruteknik UPF En. Razak sedang menggantikan kapasitor motor penghembus hawa di lokasi.
                  </div>
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(107, 127, 91, 0.15)',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: PALETTE.PRIMARY,
                  }}
                >
                  Anggaran Siap: 2 Jam
                </div>
              </div>
            </div>

            {/* Stepper Footer */}
            <div
              style={{
                paddingTop: '16px',
                borderTop: `1px solid ${PALETTE.TERTIARY}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 600,
                color: PALETTE.SECONDARY,
              }}
            >
              <span>Notifikasi SMS & Emel Dihantar Automatik</span>
              <span>•</span>
              <span style={{ color: PALETTE.PRIMARY, fontWeight: 800 }}>
                Pengadu Akan Menerima Permintaan Pengesahan Selepas Siap
              </span>
            </div>
          </div>

          {/* CAMPUS WELFARE SUMMARY PILL */}
          <div
            style={{
              padding: '16px 24px',
              borderRadius: '18px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${PALETTE.TERTIARY}`,
              boxShadow: PALETTE.SHADOW_SOFT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(107, 127, 91, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={20} color={PALETTE.SECONDARY} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: PALETTE.PRIMARY,
                    letterSpacing: '0.02em',
                  }}
                >
                  Prihatin Mahasiswa • Pantas & Telus
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: PALETTE.SECONDARY }}>
                  98.2% Aduan Selesai Bawah SLA • Sokongan Tabung Prihatin Siswa & Foodbank Aktif.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(46, 58, 47, 0.05)',
                fontSize: '11px',
                fontWeight: 800,
                color: PALETTE.PRIMARY,
              }}
            >
              <CheckCircle2 size={13} color={PALETTE.SECONDARY} />
              <span>SISTEM DIJAMIN TELUS</span>
            </div>
          </div>
        </div>
      </div>
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
        <Scene2PolyMart polyMart={polyMart} />
      </Sequence>

      {/* 5. SCENE 3: PolySuara & Undian Siswa (Frames 510 to 705 / 6.5s) */}
      <Sequence from={510} durationInFrames={195} name="Scene 3: PolySuara">
        <Scene3PolySuara polySuara={polySuara} />
      </Sequence>

      {/* 6. SCENE 4: E-Aduan & Kebajikan Mahasiswa (Frames 705 to 900 / 6.5s) */}
      <Sequence from={705} durationInFrames={195} name="Scene 4: E-Aduan Kebajikan">
        <Scene4EAduan eAduan={eAduan} />
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
