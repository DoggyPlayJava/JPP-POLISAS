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
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type WelfareCareProps = {
  readonly ticketNo: string;
  readonly slaLabel: string;
  readonly headline: string;
};

const STAGES = ['Dihantar', 'Disemak EXCO', 'Tindakan Fasiliti', 'Selesai'];

const WelfareCareInner: React.FC<WelfareCareProps> = ({ ticketNo, slaLabel, headline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const activeStep = Math.floor(
    interpolate(frame, [20, 110], [0, 3.99], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  return (
    <>
      <EditorialBackdrop />
      <EditorialFrameMarks chapterCode="05" chapterLabel="E-Kebajikan & Food Bank" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '96px 90px 84px',
          display: 'flex',
          gap: 48,
          alignItems: 'center',
          fontFamily: LAUNCH_FONTS.DISPLAY,
        }}
      >
        <Interactive.Div
          name="Foodbank Preview Frame"
          premountFor={fps}
          style={{
            flex: '0 0 920px',
            height: 640,
            borderRadius: 28,
            overflow: 'hidden',
            border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 26px 56px rgba(46, 58, 47, 0.14)',
            scale: interpolate(frame, [8, 38], [0.94, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
              output: 'perceptual-scale',
            }),
          }}
        >
          <CanvasImage
            name="Foodbank Admin Screenshot"
            src={staticFile('GAMBAR/Foodbank Admin Preview.png')}
            premountFor={fps}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left' }}
          />
        </Interactive.Div>

        <Interactive.Div
          name="Welfare SLA Panel"
          premountFor={fps}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            translate: interpolate(frame, [4, 30], ['40px 0px', '0px 0px'], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
            }),
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              alignSelf: 'flex-start',
              padding: '8px 18px',
              borderRadius: 999,
              backgroundColor: 'rgba(107, 127, 91, 0.14)',
              border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
              color: LAUNCH_PALETTE.PRIMARY,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.16em',
            }}
          >
            <ShieldCheck size={16} color={LAUNCH_PALETTE.SECONDARY} />
            E-KEBAJIKAN • SLA {slaLabel}
          </div>

          <h2 style={{ margin: 0, fontSize: 54, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', color: LAUNCH_PALETTE.PRIMARY }}>
            {headline}
          </h2>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: LAUNCH_FONTS.MONO, fontSize: 15, fontWeight: 800 }}>
              <span style={{ color: LAUNCH_PALETTE.ACCENT }}>TIKET #{ticketNo}</span>
              <span style={{ color: LAUNCH_PALETTE.SECONDARY }}>STATUS LANGSUNG</span>
            </div>

            {STAGES.map((label, idx) => {
              const done = idx <= activeStep;
              return (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    borderRadius: 14,
                    backgroundColor: done ? 'rgba(107, 127, 91, 0.12)' : LAUNCH_PALETTE.SURFACE_MUTED,
                    border: `1px solid ${done ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.TERTIARY}`,
                  }}
                >
                  <CheckCircle2 size={22} color={done ? LAUNCH_PALETTE.SECONDARY : LAUNCH_PALETTE.TERTIARY} />
                  <span style={{ fontSize: 19, fontWeight: 700, color: done ? LAUNCH_PALETTE.PRIMARY : LAUNCH_PALETTE.MUTED_OLIVE }}>
                    0{idx + 1}. {label}
                  </span>
                </div>
              );
            })}
          </div>
        </Interactive.Div>
      </div>
    </>
  );
};

const welfareCareSchema = {
  ticketNo: { type: 'string', default: 'KBJ-2026-0842', description: 'Ticket Number' },
  slaLabel: { type: 'string', default: '< 48 JAM', description: 'SLA Guarantee' },
  headline: { type: 'string', default: 'Kebajikan Disantuni Dengan Telus.', description: 'Section Headline' },
} as const satisfies InteractivitySchema;

export const WelfareCareScene = Interactive.withSchema({
  Component: WelfareCareInner,
  componentName: 'WelfareCareScene',
  schema: welfareCareSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
