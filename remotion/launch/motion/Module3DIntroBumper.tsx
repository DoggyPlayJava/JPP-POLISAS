import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  Award,
  Briefcase,
  Cpu,
  Gamepad2,
  Heart,
  Lock,
  MessageSquare,
  Package,
  Shield,
  ShoppingBag,
  Sparkles,
  Users,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE, LUXURY_SPRING } from '../tokens';
import { WHIP_S_CURVE } from './transitions';
import { SpatialFloorGrid } from '../ui/KineticCard';

export const MODULE_BUMPER_DURATION_FRAMES = 168;
export const MODULE_CONTENT_ENTER_OFFSET = 132;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

export type ModuleBumperMorphMode =
  | 'compass-drop-to-map'
  | 'unbox-carousel-fan'
  | 'roof-drop-to-3d-map'
  | 'flip-into-chat-composer'
  | 'split-twin-pillars'
  | 'constellation-burst-21-clubs';

export type BumperFeatureChip = {
  readonly icon: React.ReactNode;
  readonly label: string;
};

export type Module3DIntroBumperProps = {
  readonly moduleIndex: string;
  readonly moduleCategory: string;
  readonly moduleName: string;
  readonly tagline: string;
  readonly morphMode: ModuleBumperMorphMode;
  readonly accentColor: string;
  readonly darkColor: string;
  readonly softColor: string;
  readonly borderColor: string;
  readonly secondaryAccentColor?: string;
  readonly secondaryDarkColor?: string;
  readonly icon: React.ReactNode;
  readonly features: readonly [BumperFeatureChip, BumperFeatureChip, BumperFeatureChip];
};

type ChipPlacement = {
  readonly posStyle: React.CSSProperties;
  readonly delayFrames: number;
  readonly floatPhase: number;
};

const CHIP_PLACEMENTS: readonly [ChipPlacement, ChipPlacement, ChipPlacement] = [
  {
    posStyle: { right: 546, top: 44 },
    delayFrames: 18,
    floatPhase: 0,
  },
  {
    posStyle: { left: 546, top: 68 },
    delayFrames: 28,
    floatPhase: 1.9,
  },
  {
    posStyle: { right: 530, bottom: 26 },
    delayFrames: 38,
    floatPhase: 3.7,
  },
];

type UnboxFanCardSpec = {
  readonly id: string;
  readonly title: string;
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  readonly color: string;
  readonly soft: string;
};

const UNBOX_FAN_CARDS: readonly UnboxFanCardSpec[] = [
  {
    id: 'popcorn',
    title: 'Chicken Popcorn',
    dx: -290,
    dy: 12,
    dz: 52,
    color: LAUNCH_MODULE_THEMES.polymart.dark,
    soft: LAUNCH_MODULE_THEMES.polymart.soft,
  },
  {
    id: 'fries',
    title: 'Loaded Fries',
    dx: 10,
    dy: -8,
    dz: -24,
    color: LAUNCH_MODULE_THEMES.polymart.primary,
    soft: LAUNCH_MODULE_THEMES.polymart.soft,
  },
  {
    id: 'lanyard',
    title: 'Lanyard JPP',
    dx: 300,
    dy: 18,
    dz: -76,
    color: LAUNCH_MODULE_THEMES.kebajikan.dark,
    soft: LAUNCH_MODULE_THEMES.kebajikan.soft,
  },
];

type ClubBurstTileSpec = {
  readonly id: string;
  readonly label: string;
  readonly angleDeg: number;
  readonly radius: number;
  readonly z: number;
  readonly color: string;
  readonly dark: string;
  readonly iconKind:
    | 'esport'
    | 'robosas'
    | 'pepka'
    | 'commerce'
    | 'wataniah'
    | 'ics'
    | 'elektrik'
    | 'budaya';
};

const CLUB_BURST_TILES: readonly ClubBurstTileSpec[] = [
  {
    id: 'esport',
    label: 'E-Sport',
    angleDeg: -145,
    radius: 365,
    z: 68,
    color: LAUNCH_MODULE_THEMES.kelab.primary,
    dark: LAUNCH_MODULE_THEMES.kelab.dark,
    iconKind: 'esport',
  },
  {
    id: 'robosas',
    label: 'Robosas',
    angleDeg: -102,
    radius: 310,
    z: 36,
    color: LAUNCH_MODULE_THEMES.takwim.primary,
    dark: LAUNCH_MODULE_THEMES.takwim.dark,
    iconKind: 'robosas',
  },
  {
    id: 'pepka',
    label: 'PePKa',
    angleDeg: -52,
    radius: 335,
    z: 52,
    color: LAUNCH_MODULE_THEMES.polymaps.primary,
    dark: LAUNCH_MODULE_THEMES.polymaps.dark,
    iconKind: 'pepka',
  },
  {
    id: 'commerce',
    label: 'Commerce',
    angleDeg: -12,
    radius: 405,
    z: 24,
    color: LAUNCH_MODULE_THEMES.meritQr.primary,
    dark: LAUNCH_MODULE_THEMES.meritQr.dark,
    iconKind: 'commerce',
  },
  {
    id: 'wataniah',
    label: 'Wataniah',
    angleDeg: 28,
    radius: 390,
    z: -12,
    color: LAUNCH_MODULE_THEMES.polymart.primary,
    dark: LAUNCH_MODULE_THEMES.polymart.dark,
    iconKind: 'wataniah',
  },
  {
    id: 'ics',
    label: 'ICS POLISAS',
    angleDeg: 78,
    radius: 300,
    z: 44,
    color: LAUNCH_MODULE_THEMES.polysuara.primary,
    dark: LAUNCH_MODULE_THEMES.polysuara.dark,
    iconKind: 'ics',
  },
  {
    id: 'elektrik',
    label: 'Kelab JKE',
    angleDeg: 132,
    radius: 350,
    z: 18,
    color: LAUNCH_MODULE_THEMES.polyrent.primary,
    dark: LAUNCH_MODULE_THEMES.polyrent.dark,
    iconKind: 'elektrik',
  },
  {
    id: 'budaya',
    label: 'Kebudayaan',
    angleDeg: 172,
    radius: 395,
    z: 58,
    color: LAUNCH_MODULE_THEMES.ems.primary,
    dark: LAUNCH_MODULE_THEMES.ems.dark,
    iconKind: 'budaya',
  },
];

const renderClubTileIcon = (kind: ClubBurstTileSpec['iconKind']) => {
  switch (kind) {
    case 'esport':
      return <Gamepad2 size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'robosas':
      return <Cpu size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'pepka':
      return <Users size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'commerce':
      return <Briefcase size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'wataniah':
      return <Shield size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'ics':
      return <Heart size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'elektrik':
      return <Zap size={22} color="#FFFFFF" strokeWidth={2.2} />;
    case 'budaya':
      return <Award size={22} color="#FFFFFF" strokeWidth={2.2} />;
  }
};

const renderUnboxCardIcon = (id: string, color: string) => {
  switch (id) {
    case 'popcorn':
      return <UtensilsCrossed size={24} color={color} strokeWidth={2.3} />;
    case 'fries':
      return <ShoppingBag size={24} color={color} strokeWidth={2.3} />;
    default:
      return <Sparkles size={24} color={color} strokeWidth={2.3} />;
  }
};

/**
 * Reusable 3D Module Logo & Context-Continuous Morph Intro Bumper (`0..168f`).
 * Phase A (`0..112f`) presents a multi-layer Z-extruded 248x248 squircle monolith + 3 orbital
 * Lucide vector chips + editorial lockup. Phase B (`112..168f`) executes a unique `morphMode`
 * object-continuity transformation directly into each module's core UI stage.
 */
export const Module3DIntroBumper: React.FC<Module3DIntroBumperProps> = ({
  moduleIndex,
  moduleCategory,
  moduleName,
  tagline,
  morphMode,
  accentColor,
  darkColor,
  softColor,
  borderColor,
  secondaryAccentColor = LAUNCH_MODULE_THEMES.foodbank.primary,
  secondaryDarkColor = LAUNCH_MODULE_THEMES.foodbank.dark,
  icon,
  features,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame > MODULE_BUMPER_DURATION_FRAMES + 4) {
    return null;
  }

  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const timeSec = frame / safeFps;

  // Phase A hero squircle entry (`LUXURY_SPRING`)
  const heroSpring = spring({
    frame,
    fps: safeFps,
    config: LUXURY_SPRING,
  });

  const entryOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Phase B Contextual Spatial Morph (`112..168f`, midpoint ~138f stays at full morphOpacity)
  const morphStart = 112;
  const morphEnd = MODULE_BUMPER_DURATION_FRAMES;
  const morphT = interpolate(frame, [morphStart, morphEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });

  const morphFadeOut = interpolate(morphT, [0.64, 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const floatBlend = 1 - Math.min(1, morphT * 2.2);
  const idleYaw = Math.sin(timeSec * 1.9) * 3.8 * heroSpring * floatBlend;
  const idlePitch = Math.cos(timeSec * 1.5) * 1.6 * heroSpring * floatBlend;
  const idleHoverY = Math.sin(timeSec * 2.1) * 5.5 * heroSpring * floatBlend;

  // Animated diagonal glass sheen across monolith face (`26..92f`)
  const sheenProgress = interpolate(frame, [26, 92], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const sheenLeftPct = interpolate(sheenProgress, [0, 1], [-55, 145]);
  const sheenOpacity = interpolate(sheenProgress, [0, 0.2, 0.8, 1], [0, 0.85, 0.85, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Typography stack stagger (`8..62f`), clearing cleanly across `104..130f`
  const pillSpring = spring({
    frame: Math.max(0, frame - 8),
    fps: safeFps,
    config: LUXURY_SPRING,
  });
  const pillEnterOpacity = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleReveal = interpolate(frame, [16, 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const ruleReveal = interpolate(frame, [26, 54], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const taglineReveal = interpolate(frame, [30, 62], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });

  const copyExitT = interpolate(frame, [104, 130], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const copyExitOpacity = 1 - copyExitT;
  const copyExitTranslateY = -18 * copyExitT;

  // Compute contextual morph geometry for monolith per morphMode
  let tx = 0;
  let ty = idleHoverY;
  let tz = 0;
  let rotX = interpolate(heroSpring, [0, 1], [18, 4]) + idlePitch;
  let rotY = interpolate(heroSpring, [0, 1], [-34, 0]) + idleYaw;
  let rotZ = 0;
  let scale = interpolate(heroSpring, [0, 1], [0.56, 1]);
  let boxWidth = 248;
  let boxHeight = 248;
  let boxRadius = 62;

  if (morphT > 0.001) {
    switch (morphMode) {
      case 'compass-drop-to-map': {
        tx = interpolate(morphT, [0, 1], [0, 420], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        ty += interpolate(morphT, [0, 1], [0, 110], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        rotX += interpolate(morphT, [0, 1], [0, 50], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        rotZ = interpolate(morphT, [0, 1], [0, -18], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        scale *= interpolate(morphT, [0, 1], [1, 0.22], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        break;
      }
      case 'unbox-carousel-fan': {
        tx = interpolate(morphT, [0, 1], [0, 260], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        ty += interpolate(morphT, [0, 1], [0, 18], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        rotX += interpolate(morphT, [0, 1], [0, -32], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        rotY += interpolate(morphT, [0, 1], [0, -22], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        scale *= interpolate(morphT, [0, 1], [1, 0.42], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        break;
      }
      case 'roof-drop-to-3d-map': {
        tx = interpolate(morphT, [0, 1], [0, 440], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        ty +=
          interpolate(morphT, [0, 1], [0, 40], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }) -
          Math.sin(morphT * Math.PI) * 68;
        rotX += interpolate(morphT, [0, 1], [0, 48], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        rotY += interpolate(morphT, [0, 1], [0, -16], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        scale *= interpolate(morphT, [0, 1], [1, 0.34], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        break;
      }
      case 'flip-into-chat-composer': {
        const flipProg = interpolate(morphT, [0, 0.54], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        ty += interpolate(morphT, [0, 1], [0, 62], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        rotX =
          interpolate(heroSpring, [0, 1], [18, 4], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }) +
          interpolate(flipProg, [0, 1], [0, 176], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }) +
          idlePitch;
        boxWidth = Math.round(
          interpolate(morphT, [0, 0.65], [248, 860], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        );
        boxHeight = Math.round(
          interpolate(morphT, [0, 0.65], [248, 236], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        );
        boxRadius = Math.round(
          interpolate(morphT, [0, 0.65], [62, 26], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        );
        break;
      }
      case 'split-twin-pillars': {
        // Handled via dedicated twin split halves below when morphT > 0.02
        break;
      }
      case 'constellation-burst-21-clubs': {
        const pulseScale =
          morphT < 0.25
            ? interpolate(morphT, [0, 0.25], [1, 1.18], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : interpolate(morphT, [0.25, 1], [1.18, 0.14], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
        scale *= pulseScale;
        rotY += interpolate(morphT, [0, 1], [0, 38], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        break;
      }
    }
  }

  // Contextual secondary overlay helpers for Phase B
  const shockwaveT = interpolate(frame, [116, MODULE_BUMPER_DURATION_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const shockwaveOpacity = interpolate(shockwaveT, [0, 0.14, 0.7, 1], [0, 0.8, 0.34, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stageFadeOut = interpolate(frame, [118, 152], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fanAppearT = interpolate(frame, [114, 146], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const fanFadeOut = interpolate(frame, [150, MODULE_BUMPER_DURATION_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fanOpacity = fanAppearT * fanFadeOut;

  const isSplitActive = morphMode === 'split-twin-pillars' && morphT > 0.02;
  const monolithCombinedOpacity = entryOpacity * morphFadeOut;

  const flipComposerPhase =
    morphMode === 'flip-into-chat-composer'
      ? interpolate(morphT, [0, 0.54], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;
  const isComposerBackVisible = morphMode === 'flip-into-chat-composer' && rotX > 90;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        pointerEvents: 'none',
        fontFamily: LAUNCH_FONTS.DISPLAY,
        overflow: 'hidden',
      }}
    >
      {/* Subtle 3D Perspective Floor Grid fading cleanly before content takes over */}
      {stageFadeOut > 0.005 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: stageFadeOut * 0.55,
          }}
        >
          <SpatialFloorGrid accentColor={accentColor} secondaryColor={borderColor} gridOpacity={0.32} />
        </div>
      ) : null}

      {/* Center-Stage Soft Module Aura Disk behind Monolith */}
      {stageFadeOut > 0.005 ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 356,
            width: 560,
            height: 560,
            transform: `translate(-50%, -50%) scale(${(0.86 + 0.14 * heroSpring).toFixed(4)})`,
            borderRadius: 999,
            background: `radial-gradient(circle, ${softColor} 0%, rgba(246, 251, 249, 0) 68%)`,
            opacity: stageFadeOut * 0.92,
          }}
        />
      ) : null}

      {/* Contextual Target Ripple on Map Plane (`compass-drop-to-map` & `roof-drop-to-3d-map`) */}
      {(morphMode === 'compass-drop-to-map' || morphMode === 'roof-drop-to-3d-map') &&
      shockwaveOpacity > 0.005 ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: morphMode === 'compass-drop-to-map' ? 466 : 396,
            marginLeft: morphMode === 'compass-drop-to-map' ? 420 : 440,
            width: 340,
            height: 340,
            perspective: '1200px',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 999,
              border: `4px solid ${accentColor}`,
              background: `radial-gradient(circle, ${softColor} 0%, rgba(255,255,255,0) 64%)`,
              boxShadow: `0 0 36px ${softColor}`,
              opacity: shockwaveOpacity,
              transform: `rotateX(64deg) scale(${interpolate(shockwaveT, [0, 1], [0.24, 2.35]).toFixed(4)})`,
            }}
          />
        </div>
      ) : null}

      {/* 3D Sculpted Squircle Monolith + Orbital Chips / Contextual Morph Assemblies */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 356,
          width: 1120,
          height: 520,
          marginLeft: -560,
          marginTop: -260,
          perspective: '1500px',
          perspectiveOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 3 Orbital Frosted Vector Feature Chips around the Monolith (exit early at 104..130f) */}
        {copyExitOpacity > 0.005
          ? features.map((chip, idx) => {
              const placement = CHIP_PLACEMENTS[idx];
              const chipSpring = spring({
                frame: Math.max(0, frame - placement.delayFrames),
                fps: safeFps,
                config: LUXURY_SPRING,
              });
              const chipEnterOpacity = interpolate(
                frame,
                [placement.delayFrames, placement.delayFrames + 12],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
              );
              const chipOpacity = chipEnterOpacity * copyExitOpacity;
              const chipFloatY = Math.sin(timeSec * 2.3 + placement.floatPhase) * 4.5;
              const chipLiftY = (1 - chipSpring) * 20 + chipFloatY + copyExitTranslateY * 0.6;
              const chipScale = interpolate(chipSpring, [0, 1], [0.84, 1]);

              return (
                <div
                  key={`${moduleIndex}-chip-${chip.label}`}
                  style={{
                    position: 'absolute',
                    ...placement.posStyle,
                    marginRight: 170,
                    marginLeft: idx === 1 ? 170 : undefined,
                    marginTop: idx < 2 ? 90 : undefined,
                    marginBottom: idx === 2 ? 90 : undefined,
                    opacity: chipOpacity,
                    willChange: 'transform, opacity',
                    transform: `translate3d(0px, ${chipLiftY.toFixed(2)}px, 78px) scale(${chipScale.toFixed(4)})`,
                    zIndex: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '10px 16px 10px 11px',
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.CARD_BG,
                      border: `1.5px solid ${borderColor}`,
                      boxShadow: `0 16px 34px rgba(6, 23, 20, 0.11), 0 4px 12px ${softColor}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        backgroundColor: softColor,
                        border: `1px solid ${borderColor}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: darkColor,
                        flexShrink: 0,
                      }}
                    >
                      {chip.icon}
                    </span>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.DISPLAY,
                        fontSize: 13.5,
                        fontWeight: 800,
                        letterSpacing: '-0.01em',
                        color: LAUNCH_PALETTE.PRIMARY,
                      }}
                    >
                      {chip.label}
                    </span>
                  </div>
                </div>
              );
            })
          : null}

        {/* MODE B Overlay: PolyMart Unbox & 3 Card Silhouettes Fanning Out */}
        {morphMode === 'unbox-carousel-fan' && fanOpacity > 0.01 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              pointerEvents: 'none',
            }}
          >
            {UNBOX_FAN_CARDS.map((card, cIdx) => {
              const cardT = interpolate(frame, [114 + cIdx * 4, 152], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: EXPO_OUT,
              });
              const cx = interpolate(cardT, [0, 1], [240, 260 + card.dx]);
              const cy = interpolate(cardT, [0, 1], [16, card.dy]);
              const cz = interpolate(cardT, [0, 1], [-10, card.dz]);
              const cScale = interpolate(cardT, [0, 1], [0.32, 0.94 - cIdx * 0.06]);
              return (
                <div
                  key={card.id}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 230,
                    height: 280,
                    marginLeft: -115,
                    marginTop: -140,
                    borderRadius: 24,
                    backgroundColor: '#FFFFFF',
                    border: `2px solid ${card.color}`,
                    borderBottom: `6px solid ${card.color}`,
                    boxShadow: '0 24px 52px rgba(217, 119, 6, 0.2)',
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    opacity: fanOpacity * (0.98 - cIdx * 0.08),
                    transform: `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, ${cz.toFixed(1)}px) rotateY(-8deg) scale(${cScale.toFixed(4)})`,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      backgroundColor: card.soft,
                      border: `1.5px solid ${card.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {renderUnboxCardIcon(card.id, card.color)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: '0.06em',
                        color: LAUNCH_PALETTE.PRIMARY,
                      }}
                    >
                      {card.title.toUpperCase()}
                    </span>
                    <div
                      style={{
                        height: 8,
                        width: '72%',
                        borderRadius: 99,
                        backgroundColor: card.soft,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* MODE F Overlay: e-Kelab Continuous 3D Orbital Ring Expansion (zero-cut handoff into ClubsEmsScene) */}
        {morphMode === 'constellation-burst-21-clubs' && fanOpacity > 0.01 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              pointerEvents: 'none',
            }}
          >
            {CLUB_BURST_TILES.map((club, idx) => {
              const burstT = interpolate(frame, [112 + idx * 1.5, 168], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: EXPO_OUT,
              });
              const baseAngleRad = (idx / CLUB_BURST_TILES.length) * Math.PI * 2;
              const liveAngle = baseAngleRad + timeSec * 0.68;
              const rx = interpolate(burstT, [0, 1], [180, 740], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const ry = interpolate(burstT, [0, 1], [68, 225], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const rz = interpolate(burstT, [0, 1], [80, 320], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const bx = Math.cos(liveAngle) * rx;
              const by = 28 + Math.sin(liveAngle) * ry;
              const bz = Math.sin(liveAngle) * rz;
              const depthNorm = (Math.sin(liveAngle) + 1) * 0.5;
              const tileScale = interpolate(burstT, [0, 1], [0.42, 0.72 + depthNorm * 0.34], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });

              return (
                <div
                  key={club.id}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    marginLeft: -72,
                    marginTop: -24,
                    padding: '9px 14px 9px 10px',
                    borderRadius: 16,
                    backgroundColor: '#FFFFFF',
                    border: `1.5px solid ${club.color}`,
                    boxShadow: `0 18px 38px rgba(6, 23, 20, 0.16)`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: fanOpacity * (0.64 + depthNorm * 0.36),
                    transform: `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, ${bz.toFixed(1)}px) scale(${tileScale.toFixed(4)})`,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      background: `linear-gradient(145deg, ${club.color} 0%, ${club.dark} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {renderClubTileIcon(club.iconKind)}
                  </div>
                  <span
                    style={{
                      fontFamily: LAUNCH_FONTS.DISPLAY,
                      fontSize: 13.5,
                      fontWeight: 900,
                      color: LAUNCH_PALETTE.PRIMARY,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {club.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* MODE E: Vertical Split Twin Pillars (`split-twin-pillars`) */}
        {isSplitActive && monolithCombinedOpacity > 0.005 ? (
          <div
            style={{
              position: 'relative',
              width: 248,
              height: 248,
              transformStyle: 'preserve-3d',
              opacity: monolithCombinedOpacity,
            }}
          >
            {/* Central Teal-Amber Energy Seam Flash */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: -28,
                bottom: -28,
                width: 6,
                marginLeft: -3,
                borderRadius: 99,
                background: `linear-gradient(180deg, ${accentColor}, #FFFFFF, ${secondaryAccentColor})`,
                boxShadow: `0 0 28px ${accentColor}`,
                opacity: interpolate(morphT, [0.02, 0.14, 0.44, 0.65], [0, 1, 0.55, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }}
            />

            {/* LEFT HALF (Teal Ticket & Live Chat Hub) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 52,
                background: `linear-gradient(145deg, ${accentColor} 0%, ${darkColor} 100%)`,
                border: '2px solid rgba(255, 255, 255, 0.5)',
                boxShadow: `0 34px 72px rgba(6, 23, 20, 0.24)`,
                clipPath: 'inset(0 50% 0 0)',
                transform: `translate3d(${(-360 * morphT).toFixed(1)}px, 0px, ${(45 * morphT).toFixed(1)}px) rotateY(${(14 * morphT).toFixed(2)}deg) scale(${interpolate(morphT, [0, 1], [1, 1.38]).toFixed(4)})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </div>

            {/* Expanding Left Context Pill Label */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                marginLeft: -115,
                marginTop: -24,
                padding: '10px 18px',
                borderRadius: 16,
                backgroundColor: '#FFFFFF',
                border: `2px solid ${accentColor}`,
                boxShadow: '0 18px 36px rgba(6, 23, 20, 0.16)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                opacity: interpolate(morphT, [0.12, 0.35], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                transform: `translate3d(${(-360 * morphT).toFixed(1)}px, 84px, 72px)`,
                whiteSpace: 'nowrap',
              }}
            >
              <MessageSquare size={15} color={darkColor} strokeWidth={2.5} />
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 900,
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              >
                TIKET & LIVE CHAT
              </span>
            </div>

            {/* RIGHT HALF (Amber Confidential Food Bank Locker Vault) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 52,
                background: `linear-gradient(145deg, ${secondaryAccentColor} 0%, ${secondaryDarkColor} 100%)`,
                border: '2px solid rgba(255, 255, 255, 0.5)',
                boxShadow: `0 34px 72px rgba(217, 119, 6, 0.26)`,
                clipPath: 'inset(0 0 0 50%)',
                transform: `translate3d(${(420 * morphT).toFixed(1)}px, 0px, ${(-110 * morphT).toFixed(1)}px) rotateY(${(-14 * morphT).toFixed(2)}deg) scale(${interpolate(morphT, [0, 1], [1, 1.12], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }).toFixed(4)})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={88} color="#FFFFFF" strokeWidth={2.1} />
            </div>

            {/* Expanding Right Context Pill Label */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                marginLeft: -96,
                marginTop: -24,
                padding: '10px 18px',
                borderRadius: 16,
                backgroundColor: '#061714',
                border: `2px solid ${secondaryAccentColor}`,
                boxShadow: '0 18px 36px rgba(6, 23, 20, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                opacity: interpolate(morphT, [0.12, 0.35], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                transform: `translate3d(${(420 * morphT).toFixed(1)}px, 84px, -70px)`,
                whiteSpace: 'nowrap',
              }}
            >
              <Package size={15} color={secondaryAccentColor} strokeWidth={2.5} />
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11.5,
                  fontWeight: 900,
                  color: '#FFFFFF',
                }}
              >
                LOKER FOOD BANK
              </span>
            </div>
          </div>
        ) : null}

        {/* Standard / Transforming 3D Sculpted Squircle Monolith (Modes A, B, C, D, F, plus Phase A of E) */}
        {!isSplitActive && monolithCombinedOpacity > 0.005 ? (
          <div
            style={{
              position: 'relative',
              width: boxWidth,
              height: boxHeight,
              transformStyle: 'preserve-3d',
              opacity: monolithCombinedOpacity,
              willChange: 'transform, opacity',
              transform: `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, ${tz.toFixed(2)}px) scale(${scale.toFixed(5)}) rotateX(${rotX.toFixed(3)}deg) rotateY(${rotY.toFixed(3)}deg) rotateZ(${rotZ.toFixed(3)}deg)`,
            }}
          >
            {/* Layer -1: Deep Shadow Footprint & 3D Back Extrusion Slab (`translateZ(-26px)`) */}
            {!isComposerBackVisible ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: boxRadius,
                  backgroundColor: darkColor,
                  boxShadow: `0 44px 86px rgba(6, 23, 20, 0.25), 0 18px 42px ${softColor}`,
                  transform: 'translate3d(0px, 8px, -26px)',
                  backfaceVisibility: 'hidden',
                }}
              />
            ) : null}

            {/* Layer -0.5: Mid-Body Bevel Extrusion Slab (`translateZ(-13px)`) */}
            {!isComposerBackVisible ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: boxRadius,
                  backgroundColor: darkColor,
                  opacity: 0.92,
                  transform: 'translate3d(0px, 4px, -13px)',
                  backfaceVisibility: 'hidden',
                }}
              />
            ) : null}

            {/* FRONT FACE: Sculpted Squircle Body with Glass Specular Bevel & Icon */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: boxRadius,
                background: `linear-gradient(145deg, ${accentColor} 0%, ${darkColor} 100%)`,
                border: '2px solid rgba(255, 255, 255, 0.44)',
                boxShadow: 'inset 0 2px 10px rgba(255, 255, 255, 0.32)',
                backfaceVisibility: 'hidden',
                opacity: isComposerBackVisible ? 0 : 1,
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: boxRadius,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 48%)',
                  }}
                />
                {sheenOpacity > 0.005 ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-30%',
                      bottom: '-30%',
                      left: `${sheenLeftPct.toFixed(2)}%`,
                      width: '44%',
                      opacity: sheenOpacity,
                      background:
                        'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.42) 50%, rgba(255, 255, 255, 0) 100%)',
                      transform: 'rotate(24deg)',
                    }}
                  />
                ) : null}
              </div>

              {/* Extruded Aura Ring + White Vector Icon inside Front Face */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 146,
                  height: 146,
                  borderRadius: 38,
                  backgroundColor: 'rgba(255, 255, 255, 0.14)',
                  border: '1.5px solid rgba(255, 255, 255, 0.28)',
                  transform: 'translate(-50%, -50%) translateZ(26px)',
                  backfaceVisibility: 'hidden',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'translate3d(0px, 0px, 54px)',
                  backfaceVisibility: 'hidden',
                  pointerEvents: 'none',
                }}
              >
                {icon}
              </div>
            </div>

            {/* BACK FACE (Exclusive for `flip-into-chat-composer` Mode D) */}
            {morphMode === 'flip-into-chat-composer' && flipComposerPhase > 0.05 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: boxRadius,
                  backgroundColor: '#FFFFFF',
                  border: `2.5px solid ${accentColor}`,
                  boxShadow: '0 28px 64px rgba(225, 29, 72, 0.2)',
                  backfaceVisibility: 'hidden',
                  opacity: isComposerBackVisible ? 1 : 0,
                  transform: 'rotateX(180deg)',
                  padding: '22px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 11,
                        backgroundColor: softColor,
                        border: `1.5px solid ${borderColor}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MessageSquare size={17} color={darkColor} strokeWidth={2.4} />
                    </span>
                    <span
                      style={{
                        fontFamily: LAUNCH_FONTS.MONO,
                        fontSize: 12.5,
                        fontWeight: 900,
                        letterSpacing: '0.1em',
                        color: darkColor,
                      }}
                    >
                      POLYSUARA COMPOSER • MOD RAHSIA SEDIA
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 999,
                      backgroundColor: softColor,
                      border: `1.5px solid ${borderColor}`,
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11,
                      fontWeight: 900,
                      color: darkColor,
                    }}
                  >
                    <Lock size={12} strokeWidth={2.6} />
                    MOD TANPA NAMA
                  </span>
                </div>

                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: 16,
                    backgroundColor: LAUNCH_PALETTE.BACKGROUND,
                    border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: LAUNCH_PALETTE.MUTED_OLIVE,
                    }}
                  >
                    Tulis suara atau cadangan kampus anda di sini...
                  </span>
                  <span
                    style={{
                      padding: '8px 14px',
                      borderRadius: 12,
                      backgroundColor: darkColor,
                      color: '#FFFFFF',
                      fontFamily: LAUNCH_FONTS.MONO,
                      fontSize: 11.5,
                      fontWeight: 900,
                    }}
                  >
                    SULIT 100%
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Centered Editorial Identity Lockup below 3D Monolith */}
      {copyExitOpacity > 0.005 ? (
        <div
          style={{
            position: 'absolute',
            left: 160,
            right: 160,
            top: 562,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            opacity: copyExitOpacity,
            transform: `translate3d(0px, ${copyExitTranslateY.toFixed(2)}px, 0px)`,
          }}
        >
          {/* Module Eyebrow Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 18px',
              borderRadius: 999,
              backgroundColor: softColor,
              border: `1.5px solid ${borderColor}`,
              boxShadow: '0 8px 20px rgba(6, 23, 20, 0.06)',
              opacity: pillEnterOpacity,
              transform: `scale(${interpolate(pillSpring, [0, 1], [0.88, 1]).toFixed(4)})`,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: accentColor,
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 13.5,
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: darkColor,
              }}
            >
              {moduleIndex} • {moduleCategory}
            </span>
          </div>

          {/* Giant Module Title with Crisp Masked Upward Reveal */}
          <div style={{ overflow: 'hidden', marginTop: 18, padding: '2px 18px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 78,
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: '-0.04em',
                color: LAUNCH_PALETTE.PRIMARY,
                opacity: interpolate(titleReveal, [0, 0.25, 1], [0, 1, 1]),
                transform: `translate3d(0px, ${interpolate(titleReveal, [0, 1], [105, 0]).toFixed(2)}%, 0px)`,
              }}
            >
              {moduleName}
            </h1>
          </div>

          {/* Signature Accent Divider Line */}
          <div
            style={{
              width: 88,
              height: 4,
              borderRadius: 999,
              backgroundColor: accentColor,
              marginTop: 16,
              transformOrigin: '50% 50%',
              transform: `scaleX(${ruleReveal.toFixed(4)})`,
            }}
          />

          {/* 1-Line Student Purpose Hook */}
          <div style={{ overflow: 'hidden', marginTop: 16, padding: '2px 24px' }}>
            <p
              style={{
                margin: 0,
                fontSize: 25,
                fontWeight: 600,
                lineHeight: 1.32,
                letterSpacing: '-0.015em',
                color: LAUNCH_PALETTE.MUTED_OLIVE,
                opacity: interpolate(taglineReveal, [0, 0.35, 1], [0, 1, 1]),
                transform: `translate3d(0px, ${interpolate(taglineReveal, [0, 1], [110, 0]).toFixed(2)}%, 0px)`,
              }}
            >
              {tagline}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
