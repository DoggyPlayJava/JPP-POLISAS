import React from 'react';
import {
  CanvasImage,
  Easing,
  Interactive,
  Solid,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { vignette } from '@remotion/effects/vignette';
import QRCode from 'react-qr-code';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type ClosingVaultProps = {
  readonly headlinePrimary: string;
  readonly headlineItalic: string;
  readonly portalUrl: string;
};

const ClosingVaultInner: React.FC<ClosingVaultProps> = ({
  headlinePrimary,
  headlineItalic,
  portalUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <>
      <EditorialBackdrop />
      <Solid
        width={width}
        height={height}
        color="rgba(248, 246, 238, 0.01)"
        premountFor={fps}
        effects={[vignette({ amount: 0.16 })]}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
      <EditorialFrameMarks chapterCode="08" chapterLabel="Akses Portal Rasmi" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '104px 96px 88px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
          textAlign: 'center',
          fontFamily: LAUNCH_FONTS.DISPLAY,
        }}
      >
        <Interactive.Div
          name="Closing Crest Pill"
          premountFor={fps}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 26px',
            borderRadius: 999,
            backgroundColor: '#FFFFFF',
            border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
            opacity: interpolate(frame, [0, 18], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <CanvasImage
            name="Closing JPP Crest"
            src={staticFile('jpp-logo.png')}
            premountFor={fps}
            style={{ width: 32, height: 32, objectFit: 'contain' }}
          />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.16em', color: LAUNCH_PALETTE.PRIMARY }}>
            JPP POLISAS • EKOSISTEM DIGITAL MAHASISWA
          </span>
        </Interactive.Div>

        <Interactive.Div
          name="Closing Title Lockup"
          premountFor={fps}
          style={{
            translate: interpolate(frame, [8, 36], ['0px 30px', '0px 0px'], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
            }),
            opacity: interpolate(frame, [8, 28], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <h1 style={{ margin: 0, fontSize: 78, fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.05, color: LAUNCH_PALETTE.PRIMARY }}>
            {headlinePrimary}
          </h1>
          <p
            style={{
              margin: '14px 0 0',
              fontFamily: LAUNCH_FONTS.SERIF_ITALIC,
              fontStyle: 'italic',
              fontSize: 64,
              lineHeight: 1.1,
              color: LAUNCH_PALETTE.ACCENT,
            }}
          >
            {headlineItalic}
          </p>
        </Interactive.Div>

        <Interactive.Div
          name="Official Portal QR Card"
          premountFor={fps}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 36,
            padding: '28px 42px',
            borderRadius: 28,
            backgroundColor: '#FFFFFF',
            border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
            boxShadow: '0 24px 54px rgba(46, 58, 47, 0.12)',
            scale: interpolate(frame, [24, 56], [0.9, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
              output: 'perceptual-scale',
            }),
            opacity: interpolate(frame, [22, 42], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <div style={{ padding: 14, borderRadius: 18, backgroundColor: '#F8F6EE', border: `1px solid ${LAUNCH_PALETTE.TERTIARY}` }}>
            <QRCode value={portalUrl} size={172} fgColor={LAUNCH_PALETTE.PRIMARY} bgColor="#F8F6EE" />
          </div>
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 13, fontWeight: 800, letterSpacing: '0.16em', color: LAUNCH_PALETTE.SECONDARY }}>
              IMBAS UNTUK AKSES SERTA-MERTA
            </span>
            <span style={{ fontSize: 34, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY }}>
              {portalUrl.replace(/^https?:\/\//, '')}
            </span>
            <span style={{ fontSize: 18, fontWeight: 600, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
              Dibangunkan oleh Jawatankuasa Perwakilan Pelajar POLISAS © 2026
            </span>
          </div>
        </Interactive.Div>
      </div>
    </>
  );
};

const closingVaultSchema = {
  headlinePrimary: { type: 'string', default: 'Satu Kampus. Satu Ekosistem Pintar.', description: 'Closing Line 1' },
  headlineItalic: { type: 'string', default: 'Mendepani Digitalisasi Mahasiswa POLISAS.', description: 'Closing Italic Line' },
  portalUrl: { type: 'string', default: 'https://jpp.polisas.edu.my', description: 'Portal QR URL' },
} as const satisfies InteractivitySchema;

export const ClosingVaultScene = Interactive.withSchema({
  Component: ClosingVaultInner,
  componentName: 'ClosingVaultScene',
  schema: closingVaultSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
