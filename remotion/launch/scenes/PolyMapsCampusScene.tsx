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
import { Compass, Clock, MapPin } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { CampusMapLibrePlate } from '../components/CampusMapLibrePlate';
import { LAUNCH_FONTS, LAUNCH_PALETTE, POLISAS_COORDS } from '../tokens';

type PolyMapsSceneProps = {
  readonly classCode: string;
  readonly classTitle: string;
  readonly roomName: string;
  readonly scheduleTime: string;
};

const PolyMapsCampusInner: React.FC<PolyMapsSceneProps> = ({
  classCode,
  classTitle,
  roomName,
  scheduleTime,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <EditorialBackdrop />
      <EditorialFrameMarks chapterCode="02" chapterLabel="PolyMaps & Jadual Kuliah" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '92px 84px 82px',
          display: 'flex',
          gap: 40,
          alignItems: 'stretch',
          fontFamily: LAUNCH_FONTS.DISPLAY,
        }}
      >
        <Interactive.Div
          name="PolyMaps Editorial Sidebar"
          premountFor={fps}
          style={{
            width: 620,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            translate: interpolate(frame, [0, 26], ['-40px 0px', '0px 0px'], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
            }),
            opacity: interpolate(frame, [0, 18], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
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
              <Compass size={16} color={LAUNCH_PALETTE.SECONDARY} />
              POLYMAPS • NAVIGASI SEMAMBU
            </div>
            <h2
              style={{
                margin: '20px 0 12px',
                fontSize: 56,
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            >
              Dari Jadual Terus Ke Pintu Kelas.
            </h2>
            <p style={{ margin: 0, fontSize: 21, lineHeight: 1.45, color: LAUNCH_PALETTE.SECONDARY }}>
              Laluan berjalan kaki masa nyata merentasi kampus POLISAS Semambu disepadukan terus dengan jadual e-Akademik.
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
              padding: 28,
              boxShadow: '0 20px 44px rgba(46, 58, 47, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 34,
                  fontWeight: 900,
                  color: LAUNCH_PALETTE.ACCENT,
                }}
              >
                {classCode}
              </span>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  color: LAUNCH_PALETTE.SECONDARY,
                }}
              >
                {POLISAS_COORDS.LABEL_COORDS}
              </span>
            </div>

            <div style={{ fontSize: 25, fontWeight: 800, color: LAUNCH_PALETTE.PRIMARY }}>{classTitle}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 18, color: LAUNCH_PALETTE.MUTED_OLIVE }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={18} color={LAUNCH_PALETTE.ACCENT} />
                <span>{scheduleTime}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={18} color={LAUNCH_PALETTE.SECONDARY} />
                <span>{roomName}</span>
              </div>
            </div>

            <div
              style={{
                height: 196,
                borderRadius: 16,
                overflow: 'hidden',
                border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
              }}
            >
              <CanvasImage
                name="e-Akademik Schedule Preview"
                src={staticFile('GAMBAR/Automated E-akademik integration view.png')}
                premountFor={fps}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left' }}
              />
            </div>
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="POLISAS MapLibre Container"
          premountFor={fps}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scale: interpolate(frame, [8, 36], [0.95, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.spring({ damping: 200 }),
              output: 'perceptual-scale',
            }),
          }}
        >
          <CampusMapLibrePlate width={1092} height={906} />
        </Interactive.Div>
      </div>
    </>
  );
};

const polyMapsSchema = {
  classCode: { type: 'string', default: 'DIT3013', description: 'Course Code' },
  classTitle: { type: 'string', default: 'Pembangunan Aplikasi Web', description: 'Course Title' },
  roomName: { type: 'string', default: 'Makmal Komputer 3 • Blok JTMK', description: 'Destination Room' },
  scheduleTime: { type: 'string', default: '10:00 AM – 12:00 PM • 4 Min Berjalan', description: 'Schedule & ETA' },
} as const satisfies InteractivitySchema;

export const PolyMapsCampusScene = Interactive.withSchema({
  Component: PolyMapsCampusInner,
  componentName: 'PolyMapsCampusScene',
  schema: polyMapsSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
