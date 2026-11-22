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
import { Award, QrCode } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type ClubsEmsProps = {
  readonly clubsCount: number;
  readonly activitiesCount: number;
  readonly certSerial: string;
};

const ClubsEmsInner: React.FC<ClubsEmsProps> = ({
  clubsCount,
  activitiesCount,
  certSerial,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      <EditorialBackdrop />
      <EditorialFrameMarks chapterCode="06" chapterLabel="Sistem Kelab & EMS" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '94px 88px 82px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: LAUNCH_FONTS.DISPLAY,
        }}
      >
        <Interactive.Div
          name="Clubs EMS Header"
          premountFor={fps}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
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
                backgroundColor: 'rgba(201, 111, 79, 0.12)',
                border: `1px solid ${LAUNCH_PALETTE.ACCENT}`,
                color: LAUNCH_PALETTE.ACCENT,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.16em',
              }}
            >
              <Award size={16} />
              TADBIR URUS KELAB & EVENT MANAGEMENT SYSTEM
            </div>
            <h2 style={{ margin: '16px 0 0', fontSize: 56, fontWeight: 900, letterSpacing: '-0.03em', color: LAUNCH_PALETTE.PRIMARY }}>
              {clubsCount} Kelab Berdaftar. {activitiesCount} Program Dipantau.
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 22px',
              borderRadius: 16,
              backgroundColor: LAUNCH_PALETTE.PRIMARY,
              color: '#F8F6EE',
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            <QrCode size={20} color={LAUNCH_PALETTE.ACCENT} />
            <span>E-SIJIL AUTOMATIK • {certSerial}</span>
          </div>
        </Interactive.Div>

        <div style={{ display: 'flex', gap: 36, flex: 1, marginTop: 28, minHeight: 0 }}>
          <Interactive.Div
            name="Club System Card"
            premountFor={fps}
            style={{
              flex: 1,
              borderRadius: 26,
              overflow: 'hidden',
              border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 22px 48px rgba(46, 58, 47, 0.1)',
              translate: interpolate(frame, [10, 40], ['0px 44px', '0px 0px'], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.spring({ damping: 200 }),
              }),
            }}
          >
            <CanvasImage
              name="Kelab Preview Screenshot"
              src={staticFile('GAMBAR/Kelab Preview.png')}
              premountFor={fps}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            />
          </Interactive.Div>

          <Interactive.Div
            name="EMS Live System Card"
            premountFor={fps}
            style={{
              flex: 1,
              borderRadius: 26,
              overflow: 'hidden',
              border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 22px 48px rgba(46, 58, 47, 0.1)',
              translate: interpolate(frame, [20, 50], ['0px 56px', '0px 0px'], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.spring({ damping: 200 }),
              }),
            }}
          >
            <CanvasImage
              name="EMS Preview Screenshot"
              src={staticFile('GAMBAR/Event Management System (EMS) Preview.png')}
              premountFor={fps}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            />
          </Interactive.Div>
        </div>
      </div>
    </>
  );
};

const clubsEmsSchema = {
  clubsCount: { type: 'number', default: 21, min: 1, max: 500, integer: true, hiddenFromList: false, description: 'Clubs Count' },
  activitiesCount: { type: 'number', default: 41, min: 1, max: 5000, integer: true, hiddenFromList: false, description: 'Activities Count' },
  certSerial: { type: 'string', default: 'EMS-CERT-2026-9041', description: 'Certificate Serial' },
} as const satisfies InteractivitySchema;

export const ClubsEmsScene = Interactive.withSchema({
  Component: ClubsEmsInner,
  componentName: 'ClubsEmsScene',
  schema: clubsEmsSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
