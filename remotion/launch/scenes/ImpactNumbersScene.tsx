import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type ImpactNumbersProps = {
  readonly clubsCount: number;
  readonly studentsCount: number;
  readonly activitiesCount: number;
  readonly productsCount: number;
  readonly ordersCount: number;
};

const ImpactNumbersInner: React.FC<ImpactNumbersProps> = ({
  clubsCount,
  studentsCount,
  activitiesCount,
  productsCount,
  ordersCount,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const countProgress = interpolate(frame, [16, 92], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const metrics = [
    { label: 'Kelab Berdaftar', value: `${Math.round(clubsCount * countProgress)}`, sub: 'Entiti Sah POLISAS' },
    { label: 'Mahasiswa Aktif', value: `${Math.round(studentsCount * countProgress).toLocaleString()}+`, sub: '5 Jabatan Akademik' },
    { label: 'Aktiviti Dipantau', value: `${Math.round(activitiesCount * countProgress)}`, sub: 'Automasi Kertas Kerja' },
    { label: 'Produk PolyMart', value: `${Math.round(productsCount * countProgress)}+`, sub: 'Usahawan Pelajar' },
  ];

  return (
    <>
      <EditorialBackdrop dark />
      <EditorialFrameMarks chapterCode="07" chapterLabel="Telemetri Masa Nyata" dark />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '112px 104px 96px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: LAUNCH_FONTS.DISPLAY,
          color: '#F8F6EE',
        }}
      >
        <Interactive.Div
          name="Impact Headline"
          premountFor={fps}
          style={{
            textAlign: 'center',
            opacity: interpolate(frame, [0, 22], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            translate: interpolate(frame, [0, 26], ['0px 26px', '0px 0px'], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
            }),
          }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '8px 20px',
              borderRadius: 999,
              backgroundColor: 'rgba(217, 201, 178, 0.14)',
              border: '1px solid rgba(217, 201, 178, 0.35)',
              color: LAUNCH_PALETTE.TERTIARY,
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.18em',
            }}
          >
            DATA SEBENAR • SUPABASE LANGSUNG
          </span>
          <h2 style={{ margin: '20px 0 0', fontSize: 70, fontWeight: 900, letterSpacing: '-0.03em' }}>
            Angka Sebenar Menggerakkan POLISAS.
          </h2>
        </Interactive.Div>

        <Interactive.Div
          name="Metrics Grid"
          premountFor={fps}
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 28,
            scale: interpolate(frame, [10, 42], [0.94, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
              output: 'perceptual-scale',
            }),
          }}
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1.5px solid rgba(217, 201, 178, 0.28)',
                borderRadius: 28,
                padding: '44px 32px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 74,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#F8F6EE',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {m.value}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: LAUNCH_PALETTE.TERTIARY }}>
                {m.label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: LAUNCH_PALETTE.SECONDARY }}>{m.sub}</div>
            </div>
          ))}
        </Interactive.Div>

        <div
          style={{
            padding: '16px 34px',
            borderRadius: 999,
            backgroundColor: 'rgba(201, 111, 79, 0.18)',
            border: `1.5px solid ${LAUNCH_PALETTE.ACCENT}`,
            fontFamily: LAUNCH_FONTS.MONO,
            fontSize: 20,
            fontWeight: 800,
            color: '#F8F6EE',
          }}
        >
          {Math.round(ordersCount * countProgress)}+ TRANSAKSI POLYMART DISELESAIKAN SECARA DIGITAL
        </div>
      </div>
    </>
  );
};

const impactNumbersSchema = {
  clubsCount: { type: 'number', default: 21, min: 0, max: 500, integer: true, hiddenFromList: false, description: 'Clubs Count' },
  studentsCount: { type: 'number', default: 1083, min: 0, max: 50000, integer: true, hiddenFromList: false, description: 'Students Count' },
  activitiesCount: { type: 'number', default: 41, min: 0, max: 5000, integer: true, hiddenFromList: false, description: 'Activities Count' },
  productsCount: { type: 'number', default: 277, min: 0, max: 9999, integer: true, hiddenFromList: false, description: 'Products Count' },
  ordersCount: { type: 'number', default: 344, min: 0, max: 99999, integer: true, hiddenFromList: false, description: 'Orders Count' },
} as const satisfies InteractivitySchema;

export const ImpactNumbersScene = Interactive.withSchema({
  Component: ImpactNumbersInner,
  componentName: 'ImpactNumbersScene',
  schema: impactNumbersSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
