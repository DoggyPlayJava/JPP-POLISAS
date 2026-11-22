import React from 'react';
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { Trail } from '@remotion/motion-blur';
import { Compass, MessageSquare, ShoppingBag } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CameraStage } from '../motion/CameraStage';
import { Device3DRig } from '../motion/Device3DRig';
import { EditorialAnnotation, KineticReveal, KineticWords } from '../motion/KineticTypography';
import { EvolvingPath } from '../motion/MotionActors';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type OpeningHeroProps = {
  readonly institutionName: string;
  readonly sessionLabel: string;
  readonly headlinePrimary: string;
};

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const CAMERA_PUSH_EASE = Easing.bezier(0.22, 1, 0.36, 1);

const splitHeadlineForUnderline = (
  headline: string,
): { readonly prefix: string; readonly underlined: string; readonly suffix: string } => {
  const marker = 'Ekosistem Pintar.';
  const idx = headline.toLowerCase().indexOf('ekosistem pintar.');
  if (idx !== -1) {
    return {
      prefix: headline.slice(0, idx).trim(),
      underlined: headline.slice(idx, idx + marker.length),
      suffix: headline.slice(idx + marker.length).trim(),
    };
  }
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return { prefix: '', underlined: words.join(' '), suffix: '' };
  }
  return {
    prefix: words.slice(0, -2).join(' '),
    underlined: words.slice(-2).join(' '),
    suffix: '',
  };
};

type ModulePillSpec = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly left: number;
  readonly top: number;
  readonly startOffsetX: number;
  readonly startOffsetY: number;
  readonly dark?: boolean;
  readonly accentBg: string;
  readonly iconKind: 'maps' | 'mart' | 'suara';
};

const HERO_MODULE_PILLS: readonly ModulePillSpec[] = [
  {
    id: 'polymaps',
    title: 'PolyMaps • GPS',
    subtitle: 'Navigasi Kampus Masa Nyata',
    left: 92,
    top: 452,
    startOffsetX: -140,
    startOffsetY: 54,
    accentBg: LAUNCH_PALETTE.ACCENT,
    iconKind: 'maps',
  },
  {
    id: 'polymart',
    title: 'PolyMart • 277+',
    subtitle: 'Keusahawanan Siswa Aktif',
    left: 248,
    top: 834,
    startOffsetX: -112,
    startOffsetY: 96,
    dark: true,
    accentBg: LAUNCH_PALETTE.SECONDARY,
    iconKind: 'mart',
  },
  {
    id: 'polysuara',
    title: 'PolySuara • Live',
    subtitle: 'Undian & Suara Pelajar',
    left: 1534,
    top: 492,
    startOffsetX: 140,
    startOffsetY: 46,
    accentBg: LAUNCH_PALETTE.ACCENT,
    iconKind: 'suara',
  },
];

const HeroModulePills: React.FC<{
  readonly startFrame: number;
  readonly staggerFrames: number;
  readonly popDuration: number;
}> = ({ startFrame, staggerFrames, popDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timeSec = frame / Math.max(1, fps);
  const safeDuration = Math.max(1, popDuration);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {HERO_MODULE_PILLS.map((pill, idx) => {
        const pillStart = startFrame + idx * staggerFrames;
        const progress = interpolate(frame, [pillStart, pillStart + safeDuration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EXPO_OUT,
        });

        const opacity = interpolate(progress, [0, 0.22, 1], [0, 1, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        if (opacity <= 0.001) return null;

        const driftPhase = idx * 1.65;
        const hoverY = Math.sin(timeSec * 2.1 + driftPhase) * 6 * progress;
        const hoverZ = Math.cos(timeSec * 1.7 + driftPhase) * 18 * progress;
        const tx = interpolate(progress, [0, 1], [pill.startOffsetX, 0]);
        const ty = interpolate(progress, [0, 1], [pill.startOffsetY, 0]) + hoverY;
        const tz = interpolate(progress, [0, 1], [-220, 86]) + hoverZ;
        const scale = interpolate(progress, [0, 0.72, 1], [0.68, 1.04, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const cardBg = pill.dark ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.CARD_BG;
        const titleColor = pill.dark ? LAUNCH_PALETTE.BACKGROUND : LAUNCH_PALETTE.PRIMARY;
        const subtitleColor = pill.dark ? LAUNCH_PALETTE.TERTIARY : LAUNCH_PALETTE.MUTED_OLIVE;
        const borderColor = pill.dark ? 'rgba(217, 201, 178, 0.55)' : LAUNCH_PALETTE.TERTIARY;
        const liveDotScale = 0.85 + Math.sin(timeSec * 6.2) * 0.2;

        return (
          <div
            key={pill.id}
            style={{
              position: 'absolute',
              left: pill.left,
              top: pill.top,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '13px 20px 13px 14px',
              borderRadius: 20,
              backgroundColor: cardBg,
              border: `1.5px solid ${borderColor}`,
              boxShadow: '0 16px 34px rgba(31, 39, 32, 0.14)',
              opacity,
              willChange: 'transform, opacity',
              transform: `perspective(1400px) translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, ${tz.toFixed(2)}px) scale(${scale.toFixed(4)})`,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: pill.accentBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {pill.iconKind === 'maps' ? (
                <Compass size={20} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={2.2} />
              ) : pill.iconKind === 'mart' ? (
                <ShoppingBag size={20} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={2.2} />
              ) : (
                <MessageSquare size={20} color={LAUNCH_PALETTE.CARD_BG} strokeWidth={2.2} />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: titleColor,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{pill.title}</span>
                {pill.iconKind === 'suara' ? (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: LAUNCH_PALETTE.ACCENT,
                      transform: `scale(${liveDotScale.toFixed(3)})`,
                      display: 'inline-block',
                    }}
                  />
                ) : null}
              </div>
              <div
                style={{
                  fontFamily: LAUNCH_FONTS.DISPLAY,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: subtitleColor,
                  whiteSpace: 'nowrap',
                }}
              >
                {pill.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OpeningHeroInner: React.FC<OpeningHeroProps> = ({
  institutionName,
  sessionLabel,
  headlinePrimary,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Beat 1 (0..1.4s): Architectural rules -> Institution Pill -> Kinetic headline + Underline
  const ruleDuration = Math.max(8, Math.round(0.65 * fps));
  const pillStart = Math.round(0.32 * fps);
  const pillEnd = Math.max(pillStart + 6, Math.round(0.78 * fps));

  const pillReveal = interpolate(frame, [pillStart, pillEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EXPO_OUT,
  });
  const pillScaleX = interpolate(pillReveal, [0, 1], [0.78, 1]);
  const pillScaleY = interpolate(pillReveal, [0, 1], [0.92, 1]);
  const pillOpacity = interpolate(pillReveal, [0, 0.35, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headlineStart = Math.round(0.28 * fps);
  const wordStagger = Math.max(2, Math.round(0.065 * fps));
  const wordDuration = Math.max(8, Math.round(0.38 * fps));

  const { prefix, underlined, suffix } = splitHeadlineForUnderline(headlinePrimary);
  const prefixWordCount = prefix ? prefix.split(/\s+/).filter(Boolean).length : 0;
  const underlinedWordCount = underlined ? underlined.split(/\s+/).filter(Boolean).length : 0;
  const underlineWordsStart = headlineStart + prefixWordCount * wordStagger;
  const suffixWordsStart = underlineWordsStart + underlinedWordCount * wordStagger;

  const underlineStart = Math.round(0.88 * fps);
  const underlineDuration = Math.max(10, Math.round(0.48 * fps));

  const subtitleStart = Math.round(0.74 * fps);
  const subtitleDuration = Math.max(8, Math.round(0.45 * fps));

  // Beat 2 (1.1..3.2s): 3D Devices fly in with GPU lensBlur rack-focus (14px -> 0) + diagonal shine()
  const laptopEnter = Math.round(1.1 * fps);
  const laptopDuration = Math.max(12, Math.round(0.95 * fps));
  const laptopShineStart = Math.round(1.95 * fps);
  const laptopShineDuration = Math.max(10, Math.round(0.85 * fps));

  const phoneEnter = Math.round(1.35 * fps);
  const phoneDuration = Math.max(12, Math.round(0.95 * fps));
  const phoneShineStart = Math.round(2.25 * fps);
  const phoneShineDuration = Math.max(10, Math.round(0.85 * fps));

  // Beat 3 (2.8..5.0s): Module pills Z-parallax pop with <Trail> + gentle camera push toward /portal
  const beat3Start = Math.round(2.8 * fps);
  const pillStagger = Math.max(3, Math.round(0.14 * fps));
  const pillPopDuration = Math.max(12, Math.round(0.65 * fps));
  const sceneEnd = Math.max(beat3Start + 1, durationInFrames - 1);

  const portalPushProgress = interpolate(frame, [beat3Start, sceneEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: CAMERA_PUSH_EASE,
  });
  const portalPushScale = 1 + portalPushProgress * 0.032;

  return (
    <>
      <EditorialBackdrop />

      <CameraStage
        zoomFrom={1}
        zoomTo={1.045}
        tiltYFrom={-1.5}
        tiltYTo={1}
        panXFrom={-10}
        panXTo={14}
        panYFrom={6}
        panYTo={-8}
        breathingAmplitude={0.75}
        clip
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '84px 96px 76px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: LAUNCH_FONTS.DISPLAY,
          }}
        >
          {/* Beat 1A: Twin EvolvingPath Architectural Rules converging into Institution Pill */}
          <div
            style={{
              position: 'relative',
              width: 1560,
              height: 54,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <EvolvingPath
                d="M 24 27 L 780 27"
                width={1560}
                height={54}
                startFrame={0}
                durationFrames={ruleDuration}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={2}
                headDotColor={LAUNCH_PALETTE.ACCENT}
                headDotRadius={4.5}
                hideDotWhenComplete
                style={{ position: 'absolute', inset: 0 }}
              />
              <EvolvingPath
                d="M 1536 27 L 780 27"
                width={1560}
                height={54}
                startFrame={0}
                durationFrames={ruleDuration}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={2}
                headDotColor={LAUNCH_PALETTE.ACCENT}
                headDotRadius={4.5}
                hideDotWhenComplete
                style={{ position: 'absolute', inset: 0 }}
              />
            </div>

            <Interactive.Div
              name="Institution Pill"
              premountFor={fps}
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 14,
                padding: '9px 24px',
                borderRadius: 999,
                backgroundColor: LAUNCH_PALETTE.CARD_BG,
                border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
                boxShadow: '0 10px 24px rgba(46, 58, 47, 0.06)',
                opacity: pillOpacity,
                transform: `scale(${pillScaleX.toFixed(4)}, ${pillScaleY.toFixed(4)})`,
              }}
            >
              <CanvasImage
                name="JPP Emblem"
                src={staticFile('jpp-logo.png')}
                premountFor={fps}
                style={{ width: 28, height: 28, objectFit: 'contain' }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  color: LAUNCH_PALETTE.PRIMARY,
                }}
              >
                {institutionName}
              </span>
              <span style={{ color: LAUNCH_PALETTE.ACCENT, fontWeight: 800 }}>•</span>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: LAUNCH_PALETTE.ACCENT,
                }}
              >
                {sessionLabel}
              </span>
            </Interactive.Div>
          </div>

          {/* Beat 1B: KineticWords Headline + Rough-Notation Underline + Subtitle */}
          <Interactive.Div
            name="Hero Headline"
            premountFor={fps}
            style={{
              marginTop: 18,
              textAlign: 'center',
              maxWidth: 1540,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <h1
              style={{
                margin: 0,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'baseline',
                columnGap: '0.26em',
                rowGap: '0.08em',
              }}
            >
              {prefix ? (
                <KineticWords
                  as="div"
                  text={prefix}
                  startFrame={headlineStart}
                  staggerFrames={wordStagger}
                  wordDurationFrames={wordDuration}
                  align="center"
                  style={{
                    fontSize: 66,
                    fontWeight: 900,
                    letterSpacing: '-0.035em',
                    lineHeight: 1.06,
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                />
              ) : null}

              {underlined ? (
                <span style={{ display: 'inline-block' }}>
                  <EditorialAnnotation
                    type="underline"
                    startFrame={underlineStart}
                    durationFrames={underlineDuration}
                    color={LAUNCH_PALETTE.ACCENT}
                    strokeWidth={4}
                    padding={4}
                  >
                    <KineticWords
                      as="div"
                      text={underlined}
                      startFrame={underlineWordsStart}
                      staggerFrames={wordStagger}
                      wordDurationFrames={wordDuration}
                      align="center"
                      style={{
                        fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
                        fontStyle: 'italic',
                        fontSize: 74,
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.04,
                        color: LAUNCH_PALETTE.PRIMARY_DARK,
                      }}
                    />
                  </EditorialAnnotation>
                </span>
              ) : null}

              {suffix ? (
                <KineticWords
                  as="div"
                  text={suffix}
                  startFrame={suffixWordsStart}
                  staggerFrames={wordStagger}
                  wordDurationFrames={wordDuration}
                  align="center"
                  style={{
                    fontSize: 66,
                    fontWeight: 900,
                    letterSpacing: '-0.035em',
                    lineHeight: 1.06,
                    color: LAUNCH_PALETTE.PRIMARY,
                  }}
                />
              ) : null}
            </h1>

            <KineticReveal
              startFrame={subtitleStart}
              durationFrames={subtitleDuration}
              style={{ marginTop: 14 }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: LAUNCH_PALETTE.SECONDARY,
                }}
              >
                Platform rasmi Jawatankuasa Perwakilan Pelajar — menghubungkan mobiliti kampus, ekonomi siswa &amp; kebajikan.
              </p>
            </KineticReveal>
          </Interactive.Div>
        </div>

        {/* Beat 2: 3D Perspective Portal Devices with GPU lensBlur rack-focus & diagonal shine() */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 326,
            height: 610,
            perspective: '1800px',
            transformStyle: 'preserve-3d',
            transformOrigin: '50% 62%',
            transform: `translate3d(0px, 0px, -50px) scale(${portalPushScale.toFixed(5)})`,
            zIndex: 4,
          }}
        >
          <Device3DRig
            variant="laptop"
            name="Portal Laptop Showcase"
            src={staticFile('GAMBAR/Portal View Laptop.png')}
            width={960}
            height={458}
            enterFrame={laptopEnter}
            enterDuration={laptopDuration}
            initialBlur={14}
            initialAberration={3.2}
            shineStartFrame={laptopShineStart}
            shineDuration={laptopShineDuration}
            baseRotateX={1.6}
            baseRotateY={3.2}
            entryRotateX={10}
            entryRotateY={-14}
            entryTranslateY={84}
            floatAmplitude={0.85}
            addressLabel="jpp.polisas.edu.my/portal"
            style={{
              position: 'absolute',
              left: 412,
              top: 26,
              zIndex: 4,
            }}
          />

          <Device3DRig
            variant="phone"
            name="Portal Phone Showcase"
            src={staticFile('GAMBAR/Portal View Phone.png')}
            width={256}
            height={524}
            enterFrame={phoneEnter}
            enterDuration={phoneDuration}
            initialBlur={14}
            initialAberration={3.5}
            shineStartFrame={phoneShineStart}
            shineDuration={phoneShineDuration}
            baseRotateX={1.2}
            baseRotateY={-5.5}
            baseRotateZ={1.2}
            entryRotateX={8}
            entryRotateY={16}
            entryTranslateY={110}
            floatAmplitude={1}
            floatPhase={1.4}
            style={{
              position: 'absolute',
              left: 1246,
              top: 44,
              zIndex: 6,
            }}
          />
        </div>

        {/* Beat 3: Z-Parallax Floating Module Pills wrapped in @remotion/motion-blur <Trail> */}
        <Interactive.Div
          name="Floating Module Pills"
          premountFor={fps}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            transform: 'translate3d(0px, 0px, 120px)',
            zIndex: 12,
          }}
        >
          <Trail layers={4} lagInFrames={2} trailOpacity={0.35}>
            <HeroModulePills
              startFrame={beat3Start}
              staggerFrames={pillStagger}
              popDuration={pillPopDuration}
            />
          </Trail>
        </Interactive.Div>
      </CameraStage>

      <EditorialFrameMarks chapterCode="01" chapterLabel="Pembukaan Rasmi" />
    </>
  );
};

const openingHeroSchema = {
  institutionName: { type: 'string', default: 'POLITEKNIK SULTAN HAJI AHMAD SHAH', description: 'Institution Name' },
  sessionLabel: { type: 'string', default: 'SESI AKADEMIK 2026/2027', description: 'Academic Session' },
  headlinePrimary: { type: 'string', default: 'Satu Kampus. Satu Ekosistem Pintar.', description: 'Hero Headline' },
} as const satisfies InteractivitySchema;

export const OpeningHeroScene = Interactive.withSchema({
  Component: OpeningHeroInner,
  componentName: 'OpeningHeroScene',
  schema: openingHeroSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
