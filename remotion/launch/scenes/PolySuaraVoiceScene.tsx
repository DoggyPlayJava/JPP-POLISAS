import React from 'react';
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from 'remotion';
import { MessageSquare, Vote, Users } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type PolySuaraProps = {
  readonly pollTitle: string;
  readonly optionA: string;
  readonly optionB: string;
  readonly percentageA: number;
  readonly totalVotes: number;
};

const PolySuaraVoiceInner: React.FC<PolySuaraProps> = ({
  pollTitle,
  optionA,
  optionB,
  percentageA,
  totalVotes,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const percentageB = Math.max(0, 100 - percentageA);
  const barA = interpolate(frame, [24, 84], [0, percentageA], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const barB = interpolate(frame, [30, 90], [0, percentageB], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const liveVotes = Math.round(
    interpolate(frame, [20, 88], [0, totalVotes], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );

  return (
    <>
      <EditorialBackdrop />
      <EditorialFrameMarks chapterCode="04" chapterLabel="PolySuara • Suara Mahasiswa" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '108px 104px 92px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: LAUNCH_FONTS.DISPLAY,
        }}
      >
        <Interactive.Div
          name="PolySuara Header"
          premountFor={fps}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            opacity: interpolate(frame, [0, 20], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            translate: interpolate(frame, [0, 24], ['0px 26px', '0px 0px'], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
            }),
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 18px',
                borderRadius: 999,
                backgroundColor: 'rgba(107, 127, 91, 0.14)',
                border: `1px solid ${LAUNCH_PALETTE.SECONDARY}`,
                color: LAUNCH_PALETTE.PRIMARY,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              <MessageSquare size={16} color={LAUNCH_PALETTE.SECONDARY} />
              POLYSUARA • KOMUNITI & UNDIAN
            </div>
            <h2 style={{ margin: '18px 0 0', fontSize: 60, fontWeight: 900, letterSpacing: '-0.03em', color: LAUNCH_PALETTE.PRIMARY }}>
              Suara Pelajar, Telus & Berimpak.
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 24px',
              borderRadius: 16,
              backgroundColor: '#FFFFFF',
              border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 18,
              fontWeight: 800,
              color: LAUNCH_PALETTE.PRIMARY,
            }}
          >
            <Users size={20} color={LAUNCH_PALETTE.ACCENT} />
            <span>{liveVotes} UNDI DISAHKAN</span>
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Live Campus Poll Card"
          premountFor={fps}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 32,
            border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
            padding: '48px 56px',
            boxShadow: '0 28px 60px rgba(46, 58, 47, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            scale: interpolate(frame, [12, 42], [0.95, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
              output: 'perceptual-scale',
            }),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Vote size={28} color={LAUNCH_PALETTE.ACCENT} />
              <span style={{ fontSize: 34, fontWeight: 800, color: LAUNCH_PALETTE.PRIMARY }}>{pollTitle}</span>
            </div>
            <span
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                backgroundColor: LAUNCH_PALETTE.PRIMARY,
                color: '#F8F6EE',
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.14em',
              }}
            >
              UNDIAN AKTIF • 5 JABATAN
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, fontWeight: 700, color: LAUNCH_PALETTE.PRIMARY }}>
                <span>{optionA}</span>
                <span style={{ fontFamily: LAUNCH_FONTS.MONO, color: LAUNCH_PALETTE.ACCENT }}>{Math.round(barA)}%</span>
              </div>
              <div style={{ height: 34, borderRadius: 999, backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED, overflow: 'hidden' }}>
                <div style={{ width: `${barA}%`, height: '100%', borderRadius: 999, backgroundColor: LAUNCH_PALETTE.ACCENT }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, fontWeight: 700, color: LAUNCH_PALETTE.PRIMARY }}>
                <span>{optionB}</span>
                <span style={{ fontFamily: LAUNCH_FONTS.MONO, color: LAUNCH_PALETTE.SECONDARY }}>{Math.round(barB)}%</span>
              </div>
              <div style={{ height: 34, borderRadius: 999, backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED, overflow: 'hidden' }}>
                <div style={{ width: `${barB}%`, height: '100%', borderRadius: 999, backgroundColor: LAUNCH_PALETTE.SECONDARY }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18, paddingTop: 12, borderTop: `1px solid ${LAUNCH_PALETTE.TERTIARY}`, fontSize: 17, fontWeight: 600, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
            <span>• Identiti Persona Kampus Selamat</span>
            <span>• Moderasi Beretika JPP</span>
            <span>• Eksport Kad Perkongsian Rasmi</span>
          </div>
        </Interactive.Div>
      </div>
    </>
  );
};

const polySuaraSchema = {
  pollTitle: { type: 'string', default: 'Cadangan Menu Sihat Kafeteria Siswa 2026/2027', description: 'Poll Title' },
  optionA: { type: 'string', default: 'Set Ayam Percik & Salad Segar', description: 'Option A' },
  optionB: { type: 'string', default: 'Sandwic Telur Herba & Buah', description: 'Option B' },
  percentageA: { type: 'number', default: 68, min: 0, max: 100, integer: true, hiddenFromList: false, description: 'Option A Share %' },
  totalVotes: { type: 'number', default: 412, min: 0, max: 99999, integer: true, hiddenFromList: false, description: 'Total Votes' },
} as const satisfies InteractivitySchema;

export const PolySuaraVoiceScene = Interactive.withSchema({
  Component: PolySuaraVoiceInner,
  componentName: 'PolySuaraVoiceScene',
  schema: polySuaraSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
