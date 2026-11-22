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
import { ShoppingBag, ShieldCheck } from 'lucide-react';
import { EditorialBackdrop, EditorialFrameMarks } from '../components/EditorialChrome';
import { LAUNCH_FONTS, LAUNCH_PALETTE } from '../tokens';

type PolyMartProps = {
  readonly productsCount: number;
  readonly ordersCount: number;
  readonly headline: string;
};

const PolyMartCommerceInner: React.FC<PolyMartProps> = ({
  productsCount,
  ordersCount,
  headline,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animatedProducts = Math.round(
    interpolate(frame, [15, 75], [0, productsCount], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );
  const animatedOrders = Math.round(
    interpolate(frame, [20, 82], [0, ordersCount], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );

  return (
    <>
      <EditorialBackdrop />
      <EditorialFrameMarks chapterCode="03" chapterLabel="PolyMart • Ekonomi Siswa" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '100px 96px 88px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 64,
          fontFamily: LAUNCH_FONTS.DISPLAY,
        }}
      >
        <Interactive.Div
          name="PolyMart Copy Block"
          premountFor={fps}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            translate: interpolate(frame, [0, 26], ['-36px 0px', '0px 0px'], {
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
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              alignSelf: 'flex-start',
              padding: '8px 18px',
              borderRadius: 999,
              backgroundColor: 'rgba(201, 111, 79, 0.12)',
              border: `1px solid ${LAUNCH_PALETTE.ACCENT}`,
              color: LAUNCH_PALETTE.ACCENT,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            <ShoppingBag size={16} />
            PASAR DIGITAL MAHASISWA
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.06,
              letterSpacing: '-0.03em',
              color: LAUNCH_PALETTE.PRIMARY,
            }}
          >
            {headline}
          </h2>

          <p style={{ margin: 0, fontSize: 22, lineHeight: 1.5, color: LAUNCH_PALETTE.SECONDARY, maxWidth: 700 }}>
            Usahawan siswa POLISAS berniaga dengan katalog tersahkan JPP, pengurusan pesanan digital, dan transaksi pantas tanpa tunai.
          </p>

          <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
            <div
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 22,
                padding: '26px 30px',
                border: `1.5px solid ${LAUNCH_PALETTE.TERTIARY}`,
              }}
            >
              <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 54, fontWeight: 900, color: LAUNCH_PALETTE.PRIMARY, fontVariantNumeric: 'tabular-nums' }}>
                {animatedProducts}+
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: LAUNCH_PALETTE.SECONDARY }}>
                Produk & Menu Siswa
              </div>
            </div>

            <div
              style={{
                flex: 1,
                backgroundColor: LAUNCH_PALETTE.PRIMARY,
                borderRadius: 22,
                padding: '26px 30px',
                color: '#F8F6EE',
              }}
            >
              <div style={{ fontFamily: LAUNCH_FONTS.MONO, fontSize: 54, fontWeight: 900, color: LAUNCH_PALETTE.ACCENT, fontVariantNumeric: 'tabular-nums' }}>
                {animatedOrders}+
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: LAUNCH_PALETTE.TERTIARY }}>
                Pesanan Kampus Selesai
              </div>
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: LAUNCH_PALETTE.PRIMARY, fontSize: 17, fontWeight: 700 }}>
            <ShieldCheck size={20} color={LAUNCH_PALETTE.SECONDARY} />
            <span>Disahkan JPP POLISAS • Bayaran Tanpa Tunai JPP Pay</span>
          </div>
        </Interactive.Div>

        <div style={{ position: 'relative', width: 690, height: 760, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Interactive.Div
            name="PolyMart Primary Phone"
            premountFor={fps}
            style={{
              position: 'absolute',
              left: 20,
              top: 24,
              width: 340,
              height: 690,
              borderRadius: 42,
              overflow: 'hidden',
              border: `8px solid ${LAUNCH_PALETTE.PRIMARY}`,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 28px 56px rgba(46, 58, 47, 0.2)',
              translate: interpolate(frame, [10, 42], ['0px 60px', '0px 0px'], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.spring({ damping: 200 }),
              }),
              rotate: interpolate(frame, [10, 42], ['-6deg', '-3deg'], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.spring({ damping: 200 }),
              }),
            }}
          >
            <CanvasImage
              name="PolyMart Catalog Screenshot"
              src={staticFile('GAMBAR/Polymart View Phone.png')}
              premountFor={fps}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            />
          </Interactive.Div>

          <Interactive.Div
            name="PolyMart Checkout Phone"
            premountFor={fps}
            style={{
              position: 'absolute',
              right: 20,
              bottom: 18,
              width: 340,
              height: 690,
              borderRadius: 42,
              overflow: 'hidden',
              border: `8px solid ${LAUNCH_PALETTE.PRIMARY}`,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 32px 64px rgba(46, 58, 47, 0.24)',
              translate: interpolate(frame, [20, 52], ['40px 80px', '0px 0px'], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.spring({ damping: 200 }),
              }),
              rotate: interpolate(frame, [20, 52], ['6deg', '3deg'], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.spring({ damping: 200 }),
              }),
            }}
          >
            <CanvasImage
              name="PolyMart Inside Screenshot"
              src={staticFile('GAMBAR/Inside Polymart View Phone.png')}
              premountFor={fps}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            />
          </Interactive.Div>
        </div>
      </div>
    </>
  );
};

const polyMartSchema = {
  productsCount: { type: 'number', default: 277, min: 0, max: 9999, integer: true, hiddenFromList: false, description: 'Products Count' },
  ordersCount: { type: 'number', default: 344, min: 0, max: 99999, integer: true, hiddenFromList: false, description: 'Orders Count' },
  headline: { type: 'string', default: 'Niaga Kampus Dalam Genggaman.', description: 'Section Headline' },
} as const satisfies InteractivitySchema;

export const PolyMartCommerceScene = Interactive.withSchema({
  Component: PolyMartCommerceInner,
  componentName: 'PolyMartCommerceScene',
  schema: polyMartSchema,
  wrapInSequence: true,
  layout: 'absolute-fill',
});
