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
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type OpeningHeroProps = {
  readonly institutionName: string;
  readonly sessionLabel: string;
  readonly headlinePrimary: string;
};

const OpeningHeroInner: React.FC<OpeningHeroProps> = ({
  institutionName,
  sessionLabel,
  headlinePrimary,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <EditorialBackdrop />
      <EditorialFrameMarks chapterCode="01" chapterLabel="Pembukaan Rasmi" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '88px 96px 76px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: LAUNCH_FONTS.DISPLAY,
        }}
      >
        <Interactive.Div
          name="Institution Pill"
          premountFor={fps}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '10px 24px',
            borderRadius: 999,
            backgroundColor: '#FFFFFF',
            border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
            opacity: interpolate(frame, [0, 18], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [0, 22], ['0px 24px', '0px 0px'], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
            }),
          }}
        >
          <CanvasImage
            name="JPP Emblem"
            src={staticFile('jpp-logo.png')}
            premountFor={fps}
            style={{ width: 32, height: 32, objectFit: 'contain' }}
          />
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.16em', color: LAUNCH_PALETTE.PRIMARY }}>
            {institutionName}
          </span>
          <span style={{ color: LAUNCH_PALETTE.ACCENT, fontWeight: 800 }}>•</span>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', color: LAUNCH_PALETTE.ACCENT }}>
            {sessionLabel}
          </span>
        </Interactive.Div>

        <Interactive.Div
          name="Hero Headline"
          premountFor={fps}
          style={{
            textAlign: 'center',
            maxWidth: 1400,
            opacity: interpolate(frame, [10, 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [10, 34], ['0px 36px', '0px 0px'], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
            }),
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 82,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              lineHeight: 1.04,
              color: LAUNCH_PALETTE.PRIMARY,
            }}
          >
            {headlinePrimary}
          </h1>
          <p
            style={{
              margin: '16px 0 0',
              fontSize: 24,
              fontWeight: 500,
              color: LAUNCH_PALETTE.SECONDARY,
            }}
          >
            Platform rasmi Majlis Perwakilan Pelajar — menghubungkan mobiliti kampus, ekonomi siswa & kebajikan.
          </p>
        </Interactive.Div>

        <div style={{ position: 'relative', width: 1220, height: 530, display: 'flex', justifyContent: 'center' }}>
          <Interactive.Div
            name="Portal Laptop Showcase"
            premountFor={fps}
            style={{
              width: 980,
              height: 510,
              borderRadius: 24,
              overflow: 'hidden',
              border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 28px 60px rgba(46, 58, 47, 0.14)',
              scale: interpolate(frame, [22, 54], [0.92, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.spring({ damping: 200 }),
                output: 'perceptual-scale',
              }),
              opacity: interpolate(frame, [20, 40], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <CanvasImage
              name="Portal Laptop Screenshot"
              src={staticFile('GAMBAR/Portal View Laptop.png')}
              premountFor={fps}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            />
          </Interactive.Div>

          <Interactive.Div
            name="Portal Phone Showcase"
            premountFor={fps}
            style={{
              position: 'absolute',
              right: 24,
              bottom: -8,
              width: 250,
              height: 495,
              borderRadius: 34,
              overflow: 'hidden',
              border: `6px solid ${LAUNCH_PALETTE.PRIMARY}`,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 26px 52px rgba(46, 58, 47, 0.24)',
              translate: interpolate(frame, [32, 64], ['60px 80px', '0px 0px'], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.spring({ damping: 200 }),
              }),
              opacity: interpolate(frame, [30, 48], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <CanvasImage
              name="Portal Phone Screenshot"
              src={staticFile('GAMBAR/Portal View Phone.png')}
              premountFor={fps}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            />
          </Interactive.Div>
        </div>
      </div>
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
