import React from 'react';
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { chromaticAberration } from '@remotion/effects/chromatic-aberration';
import { lensBlur } from '@remotion/effects/lens-blur';
import { shine } from '@remotion/effects/shine';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

export type DeviceVariant = 'laptop' | 'phone' | 'card';

export type Device3DRigProps = {
  readonly variant?: DeviceVariant;
  readonly src: string;
  readonly name?: string;
  readonly width?: number;
  readonly height?: number;
  readonly enterFrame?: number;
  readonly enterDuration?: number;
  readonly initialBlur?: number;
  readonly initialAberration?: number;
  readonly extraAberration?: number;
  readonly shineStartFrame?: number;
  readonly shineDuration?: number;
  readonly enableShine?: boolean;
  readonly baseRotateX?: number;
  readonly baseRotateY?: number;
  readonly baseRotateZ?: number;
  readonly entryRotateX?: number;
  readonly entryRotateY?: number;
  readonly entryTranslateY?: number;
  readonly floatAmplitude?: number;
  readonly floatPhase?: number;
  readonly fit?: 'cover' | 'contain' | 'fill';
  readonly objectPosition?: string;
  readonly addressLabel?: string;
  readonly screenOverlay?: React.ReactNode;
  readonly style?: React.CSSProperties;
};

const ENTRY_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const SHINE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

const DEFAULT_DIMENSIONS: Record<DeviceVariant, { readonly width: number; readonly height: number }> = {
  laptop: { width: 960, height: 560 },
  phone: { width: 330, height: 680 },
  card: { width: 680, height: 480 },
};

/**
 * 3D perspective device frame (Laptop / Phone / Card) with organic continuous float,
 * GPU rack-focus lens blur + chromatic aberration entry, and diagonal glass shine sweep.
 * Automatically disables WebGL2 passes outside active transition windows for 60fps playback.
 */
export const Device3DRig: React.FC<Device3DRigProps> = ({
  variant = 'laptop',
  src,
  name,
  width,
  height,
  enterFrame = 0,
  enterDuration = 38,
  initialBlur = 11,
  initialAberration = 4.2,
  extraAberration = 0,
  shineStartFrame = 30,
  shineDuration = 42,
  enableShine = true,
  baseRotateX = 0,
  baseRotateY = 0,
  baseRotateZ = 0,
  entryRotateX = 5,
  entryRotateY = -6,
  entryTranslateY = 56,
  floatAmplitude = 1,
  floatPhase = 0,
  fit = 'cover',
  objectPosition = 'top center',
  addressLabel = 'jpp.polisas.edu.my',
  screenOverlay,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const resolvedDims = DEFAULT_DIMENSIONS[variant];
  const frameWidth = width ?? resolvedDims.width;
  const frameHeight = height ?? resolvedDims.height;

  const safeEnterDuration = Math.max(1, enterDuration);
  const enterProgress = interpolate(frame, [enterFrame, enterFrame + safeEnterDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ENTRY_EASING,
  });

  const opacity = interpolate(
    frame,
    [enterFrame, enterFrame + Math.max(6, Math.round(safeEnterDuration * 0.45))],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const scale = interpolate(enterProgress, [0, 1], [0.92, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });

  const timeSec = frame / Math.max(1, fps);
  const floatY = Math.sin(timeSec * 1.4 + floatPhase) * 6 * floatAmplitude;
  const floatRotateX = Math.cos(timeSec * 1.1 + floatPhase) * 1.15 * floatAmplitude;
  const floatRotateY = Math.sin(timeSec * 0.9 + floatPhase) * 1.45 * floatAmplitude;

  const translateY = interpolate(enterProgress, [0, 1], [entryTranslateY, 0]) + floatY;
  const rotateX = baseRotateX + interpolate(enterProgress, [0, 1], [entryRotateX, 0]) + floatRotateX;
  const rotateY = baseRotateY + interpolate(enterProgress, [0, 1], [entryRotateY, 0]) + floatRotateY;

  const rawBlurRadius = Math.max(
    0,
    interpolate(
      frame,
      [enterFrame, enterFrame + Math.max(1, Math.round(safeEnterDuration * 0.85))],
      [Math.max(0, initialBlur), 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      },
    ),
  );
  const blurRadius = rawBlurRadius < 0.4 ? 0 : rawBlurRadius;

  const entryAberration = Math.max(
    0,
    interpolate(
      frame,
      [enterFrame, enterFrame + Math.max(1, Math.round(safeEnterDuration * 0.72))],
      [Math.max(0, initialAberration), 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      },
    ),
  );
  const safeExtraAberration = Number.isFinite(extraAberration) ? Math.max(0, extraAberration) : 0;
  const rawAberrationAmount = Math.max(entryAberration, safeExtraAberration);
  const aberrationAmount = rawAberrationAmount < 0.25 ? 0 : rawAberrationAmount;

  const rawShine = interpolate(
    frame,
    [shineStartFrame, shineStartFrame + Math.max(1, shineDuration)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: SHINE_EASING,
    },
  );
  const shineProgress = Math.min(1, Math.max(0, rawShine));
  const shineDisabled = !enableShine || shineProgress <= 0 || shineProgress >= 1;

  const imageEffects = [
    lensBlur({
      radius: blurRadius,
      samples: 48,
      irisShape: 'hexagon',
      irisRoundness: 0.35,
      repeatEdgePixels: true,
      disabled: blurRadius < 0.4,
    }),
    chromaticAberration({
      amount: aberrationAmount,
      angle: 24,
      disabled: aberrationAmount < 0.25,
    }),
    shine({
      progress: enableShine ? shineProgress : 0,
      angle: 32,
      haloSigma: 180,
      coreSigma: 52,
      haloIntensity: 0.22,
      coreIntensity: 0.34,
      disabled: shineDisabled,
    }),
  ];

  const hasValidSrc = Boolean(src && src.trim());
  const screenContent = hasValidSrc ? (
    <CanvasImage
      name={name ? `${name} Screen` : `Device ${variant} Screen`}
      src={src}
      premountFor={fps}
      effects={imageEffects}
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        objectPosition,
      }}
    />
  ) : (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: LAUNCH_FONTS.MONO,
        fontSize: 13,
        letterSpacing: '0.12em',
        color: LAUNCH_PALETTE.MUTED_OLIVE,
      }}
    >
      POLISAS DIGITAL VIEWPORT
    </div>
  );

  return (
    <div
      style={{
        width: frameWidth,
        height: frameHeight,
        perspective: '1800px',
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      <Interactive.Div
        name={name ?? `Device3DRig (${variant})`}
        premountFor={fps}
        style={{
          width: '100%',
          height: '100%',
          opacity,
          transformStyle: 'preserve-3d',
          willChange: 'transform, opacity',
          transform: `translate3d(0px, ${translateY.toFixed(2)}px, 0px) scale(${scale.toFixed(5)}) rotateX(${rotateX.toFixed(3)}deg) rotateY(${rotateY.toFixed(3)}deg) rotateZ(${baseRotateZ.toFixed(3)}deg)`,
        }}
      >
        {variant === 'laptop' ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 22,
              overflow: 'hidden',
              backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
              border: '1.5px solid rgba(184, 228, 220, 0.45)',
              boxShadow:
                '0 38px 80px -18px rgba(6, 23, 20, 0.34), 0 12px 28px -8px rgba(11, 36, 32, 0.16)',
            }}
          >
            <div
              style={{
                height: 32,
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                borderBottom: '1px solid rgba(184, 228, 220, 0.16)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: LAUNCH_PALETTE.ACCENT }} />
                <span style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: LAUNCH_PALETTE.TERTIARY }} />
                <span style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: LAUNCH_PALETTE.SECONDARY }} />
              </div>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: 'rgba(246, 251, 249, 0.72)',
                }}
              >
                {addressLabel}
              </span>
              <span style={{ width: 42 }} />
            </div>

            <div
              style={{
                position: 'relative',
                flex: 1,
                overflow: 'hidden',
                backgroundColor: LAUNCH_PALETTE.BACKGROUND,
              }}
            >
              {screenContent}
              {screenOverlay ? (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
                  {screenOverlay}
                </div>
              ) : null}
            </div>

            <div
              style={{
                height: 11,
                backgroundColor: LAUNCH_PALETTE.PRIMARY,
                borderTop: '1px solid rgba(184, 228, 220, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 3,
                  borderRadius: 999,
                  backgroundColor: 'rgba(184, 228, 220, 0.34)',
                }}
              />
            </div>
          </div>
        ) : null}

        {variant === 'phone' ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 44,
              padding: 9,
              backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
              border: '1.5px solid rgba(184, 228, 220, 0.42)',
              boxShadow:
                '0 34px 70px -16px rgba(6, 23, 20, 0.36), 0 10px 24px -6px rgba(11, 36, 32, 0.18)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: 35,
                overflow: 'hidden',
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 82,
                  height: 20,
                  borderRadius: 999,
                  backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
                  border: '1px solid rgba(184, 228, 220, 0.18)',
                  zIndex: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 7,
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: LAUNCH_PALETTE.SECONDARY,
                    opacity: 0.7,
                  }}
                />
              </div>

              {screenContent}

              {screenOverlay ? (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
                  {screenOverlay}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {variant === 'card' ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 26,
              padding: 10,
              backgroundColor: LAUNCH_PALETTE.CARD_BG,
              border: '1.5px solid rgba(184, 228, 220, 0.85)',
              boxShadow:
                '0 28px 60px -14px rgba(11, 36, 32, 0.22), 0 6px 18px rgba(11, 36, 32, 0.08)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: 18,
                overflow: 'hidden',
                backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
              }}
            >
              {screenContent}
              {screenOverlay ? (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
                  {screenOverlay}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Interactive.Div>
    </div>
  );
};
