import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Circle, Highlight, Underline, type Padding } from '@remotion/rough-notation';
import { LAUNCH_PALETTE } from '../tokens';

const EXPO_OUT_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const ANNOTATION_EASING = Easing.bezier(0.22, 1, 0.36, 1);

export type AccentWordsTarget =
  | readonly number[]
  | readonly string[]
  | { readonly start: number; readonly end: number };

export type KineticWordsProps = {
  readonly text: string;
  readonly startFrame?: number;
  readonly staggerFrames?: number;
  readonly wordDurationFrames?: number;
  readonly accentWords?: AccentWordsTarget;
  readonly accentColor?: string;
  readonly accentStyle?: React.CSSProperties;
  readonly align?: 'left' | 'center' | 'right';
  readonly gap?: number | string;
  readonly rowGap?: number | string;
  readonly as?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
  readonly style?: React.CSSProperties;
  readonly wordStyle?: React.CSSProperties;
  readonly easing?: (t: number) => number;
};

const normalizeWordToken = (word: string): string =>
  word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

const isWordAccented = (word: string, index: number, target?: AccentWordsTarget): boolean => {
  if (!target) return false;
  if (Array.isArray(target)) {
    if (target.length === 0) return false;
    if (typeof target[0] === 'number') {
      return (target as readonly number[]).includes(index);
    }
    const cleanWord = normalizeWordToken(word);
    return (target as readonly string[]).some((needle) => normalizeWordToken(needle) === cleanWord);
  }
  const range = target as { readonly start: number; readonly end: number };
  return index >= range.start && index <= range.end;
};

/**
 * Masked word-by-word baseline slide reveal with staggered expo-out deceleration
 * and optional highlighted accent word styling.
 */
export const KineticWords: React.FC<KineticWordsProps> = ({
  text,
  startFrame = 0,
  staggerFrames = 4,
  wordDurationFrames = 24,
  accentWords,
  accentColor = LAUNCH_PALETTE.ACCENT,
  accentStyle,
  align = 'left',
  gap = '0.26em',
  rowGap = '0.08em',
  as = 'div',
  style,
  wordStyle,
  easing = EXPO_OUT_EASING,
}) => {
  const frame = useCurrentFrame();
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const safeDuration = Math.max(1, wordDurationFrames);
  const justifyContent =
    align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  const ContainerTag = as;

  return (
    <ContainerTag
      style={{
        margin: 0,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent,
        columnGap: gap,
        rowGap,
        ...style,
      }}
    >
      {words.map((word, index) => {
        const wordStart = startFrame + index * staggerFrames;
        const progress = interpolate(frame, [wordStart, wordStart + safeDuration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing,
        });

        const translateYPercent = interpolate(progress, [0, 1], [115, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const settleRotate = interpolate(progress, [0, 1], [1.6, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const settleScale = interpolate(progress, [0, 0.78, 1], [0.97, 1.008, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const opacity = interpolate(progress, [0, 0.25, 1], [0, 1, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const accented = isWordAccented(word, index, accentWords);

        return (
          <span
            key={`${index}-${word}`}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              verticalAlign: 'bottom',
              paddingTop: '0.06em',
              marginTop: '-0.06em',
              paddingBottom: '0.16em',
              marginBottom: '-0.16em',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                willChange: 'transform, opacity',
                transformOrigin: '50% 100%',
                opacity,
                transform: `translate3d(0px, ${translateYPercent.toFixed(2)}%, 0px) rotate(${settleRotate.toFixed(2)}deg) scale(${settleScale.toFixed(4)})`,
                ...wordStyle,
                ...(accented ? { color: accentColor, ...accentStyle } : undefined),
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </ContainerTag>
  );
};

export type KineticRevealProps = {
  readonly startFrame?: number;
  readonly durationFrames?: number;
  readonly distanceY?: number;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
};

/**
 * Single-block masked baseline slide reveal for subtitles, pills, or editorial badges.
 */
export const KineticReveal: React.FC<KineticRevealProps> = ({
  startFrame = 0,
  durationFrames = 24,
  distanceY = 110,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const safeDuration = Math.max(1, durationFrames);

  const progress = interpolate(frame, [startFrame, startFrame + safeDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT_EASING,
  });

  const translateY = interpolate(progress, [0, 1], [distanceY, 0]);
  const opacity = interpolate(progress, [0, 0.28, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ overflow: 'hidden', paddingBottom: 4, marginBottom: -4, ...style }}>
      <div
        style={{
          willChange: 'transform, opacity',
          opacity,
          transform: `translate3d(0px, ${translateY.toFixed(2)}%, 0px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export type EditorialAnnotationType = 'underline' | 'highlight' | 'circle';

export type EditorialAnnotationProps = {
  readonly type?: EditorialAnnotationType;
  readonly startFrame?: number;
  readonly durationFrames?: number;
  readonly color?: string;
  readonly strokeWidth?: number;
  readonly padding?: number | Partial<Padding>;
  readonly iterations?: number;
  readonly roughness?: number;
  readonly seed?: number;
  readonly box?: 'inside' | 'around';
  readonly showInTimeline?: boolean;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
};

const resolveBoxPadding = (padding: number | Partial<Padding> | undefined): Partial<Padding> | undefined => {
  if (padding === undefined) return undefined;
  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return padding;
};

/**
 * Editorial hand-drawn emphasis wrapper powered by @remotion/rough-notation
 * with clamped frame-driven stroke progression.
 */
export const EditorialAnnotation: React.FC<EditorialAnnotationProps> = ({
  type = 'underline',
  startFrame = 18,
  durationFrames = 28,
  color,
  strokeWidth,
  padding,
  iterations,
  roughness = 1.1,
  seed = 7,
  box = 'around',
  showInTimeline = false,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rawProgress = interpolate(
    frame,
    [startFrame, startFrame + Math.max(1, durationFrames)],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: ANNOTATION_EASING,
    },
  );
  const progress = Math.min(1, Math.max(0, rawProgress));
  const disabled = progress <= 0.001;

  const resolvedColor =
    color ?? (type === 'highlight' ? 'rgba(217, 201, 178, 0.55)' : LAUNCH_PALETTE.ACCENT);

  if (type === 'highlight') {
    return (
      <Highlight
        progress={progress}
        disabled={disabled}
        color={resolvedColor}
        padding={resolveBoxPadding(padding) ?? { top: 4, right: 8, bottom: 4, left: 8 }}
        iterations={iterations ?? 1}
        roughness={roughness}
        seed={seed}
        premountFor={fps}
        showInTimeline={showInTimeline}
        style={style}
      >
        {children}
      </Highlight>
    );
  }

  if (type === 'circle') {
    return (
      <Circle
        progress={progress}
        disabled={disabled}
        color={resolvedColor}
        strokeWidth={strokeWidth ?? 3}
        padding={resolveBoxPadding(padding) ?? { top: 6, right: 12, bottom: 6, left: 12 }}
        iterations={iterations ?? 2}
        box={box}
        roughness={roughness}
        seed={seed}
        premountFor={fps}
        showInTimeline={showInTimeline}
        style={style}
      >
        {children}
      </Circle>
    );
  }

  const underlineTopPadding =
    typeof padding === 'number' ? padding : padding?.top;

  return (
    <Underline
      progress={progress}
      disabled={disabled}
      color={resolvedColor}
      strokeWidth={strokeWidth ?? 3.5}
      padding={underlineTopPadding !== undefined ? { top: underlineTopPadding } : { top: 3 }}
      iterations={iterations ?? 2}
      roughness={roughness}
      seed={seed}
      premountFor={fps}
      showInTimeline={showInTimeline}
      style={style}
    >
      {children}
    </Underline>
  );
};
