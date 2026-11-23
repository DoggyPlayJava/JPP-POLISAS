import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { LAUNCH_FONTS, LAUNCH_PALETTE, LUXURY_SPRING } from '../tokens';
import { WHIP_S_CURVE } from './transitions';
import { SpatialFloorGrid } from '../ui/KineticCard';

export const MODULE_BUMPER_DURATION_FRAMES = 168;
export const MODULE_CONTENT_ENTER_OFFSET = 132;

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

export type BumperFeatureChip = {
  readonly icon: React.ReactNode;
  readonly label: string;
};

export type Module3DIntroBumperProps = {
  readonly moduleIndex: string;
  readonly moduleCategory: string;
  readonly moduleName: string;
  readonly tagline: string;
  readonly accentColor: string;
  readonly darkColor: string;
  readonly softColor: string;
  readonly borderColor: string;
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

/**
 * Reusable Apple WWDC / Microsoft Fluent 3D Module Logo & Identity Intro Bumper (`0..168f`).
 * Features a multi-layer Z-extruded 248x248 squircle monolith + 3 orbital Lucide vector chips
 * in Phase A (`0..114f`) followed by a `WHIP_S_CURVE` spatial dock-morph up-left + 3D floor ring
 * handoff (`114..168f`) while module content unfolds smoothly at `frame 132`.
 */
export const Module3DIntroBumper: React.FC<Module3DIntroBumperProps> = ({
  moduleIndex,
  moduleCategory,
  moduleName,
  tagline,
  accentColor,
  darkColor,
  softColor,
  borderColor,
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

  // Phase B Spatial Dock-Morph up-left into chapter corner badge (`114..164f`)
  const dockStart = 114;
  const dockEnd = 164;
  const dockT = interpolate(frame, [dockStart, dockEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });

  const dockTranslateX = interpolate(dockT, [0, 1], [0, -795]);
  const dockTranslateY = interpolate(dockT, [0, 1], [0, -264]);
  const dockScale = interpolate(dockT, [0, 1], [1, 0.16]);
  const dockRotateY = interpolate(dockT, [0, 1], [0, 26]);
  const dockOpacity = interpolate(dockT, [0.58, 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const floatBlend = 1 - dockT;
  const idleYaw = Math.sin(timeSec * 1.9) * 3.8 * heroSpring * floatBlend;
  const idlePitch = Math.cos(timeSec * 1.5) * 1.6 * heroSpring * floatBlend;
  const idleHoverY = Math.sin(timeSec * 2.1) * 5.5 * heroSpring * floatBlend;

  const baseScale = interpolate(heroSpring, [0, 1], [0.56, 1]) * dockScale;
  const baseRotateY = interpolate(heroSpring, [0, 1], [-34, 0]) + idleYaw + dockRotateY;
  const baseRotateX = interpolate(heroSpring, [0, 1], [18, 4]) + idlePitch;

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

  // Typography stack stagger (`12..62f`), clearing cleanly across `108..136f`
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

  const copyExitT = interpolate(frame, [108, 134], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: WHIP_S_CURVE,
  });
  const copyExitOpacity = 1 - copyExitT;
  const copyExitTranslateY = -18 * copyExitT;

  // Expanding 3D floor ripple ring during dock-morph handoff (`116..168f`)
  const rippleT = interpolate(frame, [116, MODULE_BUMPER_DURATION_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const rippleScale = interpolate(rippleT, [0, 1], [0.28, 2.9]);
  const rippleOpacity = interpolate(rippleT, [0, 0.14, 0.68, 1], [0, 0.72, 0.28, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Floor shadow & aura fade out as bumper completes
  const stageFadeOut = interpolate(frame, [120, 152], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const monolithCombinedOpacity = entryOpacity * dockOpacity;

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
      {/* Subtle 3D Perspective Floor Grid fading cleanly before content enters */}
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

      {/* Center-Stage Soft Module Aura Disk behind 3D Monolith */}
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

      {/* Expanding 3D Perspective Floor Ring during Dock-Morph (`116..168f`) */}
      {rippleOpacity > 0.005 ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 390,
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
              border: `3.5px solid ${accentColor}`,
              boxShadow: `0 0 32px ${softColor}`,
              opacity: rippleOpacity,
              transform: `rotateX(70deg) scale(${rippleScale.toFixed(4)})`,
            }}
          />
        </div>
      ) : null}

      {/* 3D Sculpted Squircle Monolith + 3 Orbital Lucide Vector Chips */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 356,
          width: 780,
          height: 340,
          marginLeft: -390,
          marginTop: -170,
          perspective: '1400px',
          perspectiveOrigin: '50% 50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 3 Orbital Frosted Vector Feature Chips around the Monolith (exit early at 108..132f) */}
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

        {/* Centered 248x248 3D Extruded Squircle Monolith */}
        {monolithCombinedOpacity > 0.005 ? (
          <div
            style={{
              position: 'relative',
              width: 248,
              height: 248,
              transformStyle: 'preserve-3d',
              opacity: monolithCombinedOpacity,
              willChange: 'transform, opacity',
              transform: `translate3d(${dockTranslateX.toFixed(2)}px, ${(dockTranslateY + idleHoverY).toFixed(2)}px, 0px) scale(${baseScale.toFixed(5)}) rotateX(${baseRotateX.toFixed(3)}deg) rotateY(${baseRotateY.toFixed(3)}deg)`,
            }}
          >
            {/* Layer -1: Deep Shadow Footprint & 3D Back Extrusion Slab (`translateZ(-26px)`) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 62,
                backgroundColor: darkColor,
                boxShadow: `0 44px 86px rgba(6, 23, 20, 0.25), 0 18px 42px ${softColor}`,
                transform: 'translate3d(0px, 8px, -26px)',
              }}
            />

            {/* Layer -0.5: Mid-Body Bevel Extrusion Slab (`translateZ(-13px)`) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 62,
                backgroundColor: darkColor,
                opacity: 0.92,
                transform: 'translate3d(0px, 4px, -13px)',
              }}
            />

            {/* Layer 0: Hero Sculpted Squircle Body with Glass Specular Bevel & Sheen Sweep */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: 62,
                background: `linear-gradient(145deg, ${accentColor} 0%, ${darkColor} 100%)`,
                border: '2px solid rgba(255, 255, 255, 0.44)',
                boxShadow: 'inset 0 2px 10px rgba(255, 255, 255, 0.32)',
                overflow: 'hidden',
                transformStyle: 'preserve-3d',
                transform: 'translate3d(0px, 0px, 0px)',
              }}
            >
              {/* Soft Top Inner Rim Gloss */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 48%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Animated Specular Diagonal Sheen Sweep */}
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
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
            </div>

            {/* Layer +1: Extruded Aura Ring behind Icon (`translateZ(26px)`) */}
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
                pointerEvents: 'none',
              }}
            />

            {/* Layer +2: Extruded White Vector Icon (`translateZ(54px)`) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'translate3d(0px, 0px, 54px)',
                pointerEvents: 'none',
              }}
            >
              {icon}
            </div>
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
