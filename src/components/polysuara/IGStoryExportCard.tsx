import React from 'react';
import { format } from 'date-fns';
import { enUS, ms } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cleanConfessionText, hasSpoilerImageToken, normalizePolySuaraCodename } from '@/lib/polySuaraHelpers';

interface ConfessionExport {
  id: string;
  content: string;
  category: string;
  codename: string | null;
  created_at: string;
  image_url: string | null;
  official_reply: string | null;
}

interface Props {
  confession: ConfessionExport;
  elementId: string;
}

export function IGStoryExportCard({ confession, elementId }: Props) {
  const { t, i18n } = useTranslation(['services', 'common']);
  const dateLocale = i18n.language?.startsWith('en') ? enUS : ms;
  const cleanText = cleanConfessionText(confession.content);
  const isSpoilerImage = hasSpoilerImageToken(confession.content);
  const persona = normalizePolySuaraCodename(confession.codename);

  return (
    <div
      id={elementId}
      className="fixed top-0 left-0 -z-50 pointer-events-none flex flex-col justify-between"
      style={{
        width: '540px',
        height: '960px', // 9:16 ratio
        background: 'linear-gradient(145deg, #0B2420 0%, #061714 100%)',
        padding: '40px',
        color: '#F6FBF9',
        fontFamily: 'Geist, Manrope, sans-serif',
      }}
    >
      {/* Mineral Teal Ambient Decor */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-20%',
          width: '600px',
          height: '600px',
          background:
            'radial-gradient(circle, rgba(45, 212, 191, 0.16) 0%, rgba(15, 118, 110, 0.06) 50%, transparent 70%)',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-20%',
          width: '500px',
          height: '500px',
          background:
            'radial-gradient(circle, rgba(15, 118, 110, 0.18) 0%, rgba(15, 118, 110, 0.05) 50%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
              Poly<span style={{ color: '#2DD4BF' }}>Suara</span>
            </h1>
          </div>
          <div
            style={{
              background: 'rgba(45, 212, 191, 0.14)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              padding: '6px 16px',
              borderRadius: '100px',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '2px',
              color: '#B8E4DC',
            }}
          >
            #{confession.category}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '30px',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: 'rgba(11, 36, 32, 0.85)',
            border: '1px solid rgba(45, 212, 191, 0.22)',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#2DD4BF' }}>
              {persona.displayName || t('services:anon_student', 'Pelajar Anon')}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#99CBC2',
                textTransform: 'uppercase',
              }}
            >
              {format(new Date(confession.created_at), 'dd MMM yyyy', { locale: dateLocale })}
            </span>
          </div>

          <p
            style={{
              fontSize: cleanText.length > 200 ? '22px' : '32px',
              fontWeight: 500,
              lineHeight: 1.5,
              margin: 0,
              whiteSpace: 'pre-wrap',
              color: '#F6FBF9',
            }}
          >
            "{cleanText}"
          </p>

          {confession.image_url && (
            <div
              style={{
                position: 'relative',
                marginTop: '30px',
                borderRadius: '16px',
                overflow: 'hidden',
                height: '250px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(6, 23, 20, 0.7)',
              }}
            >
              <img
                src={confession.image_url}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  ...(isSpoilerImage ? { filter: 'blur(24px)', transform: 'scale(1.1)' } : {}),
                }}
                alt="Attachment"
              />
              {isSpoilerImage && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(6, 23, 20, 0.45)',
                  }}
                >
                  <span
                    style={{
                      padding: '8px 18px',
                      borderRadius: '9999px',
                      background: 'rgba(11, 36, 32, 0.92)',
                      border: '1px solid rgba(45, 212, 191, 0.5)',
                      color: '#F6FBF9',
                      fontSize: '14px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}
                  >
                    GAMBAR SPOILER • BUKA DI POLYSUARA
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {confession.official_reply && (
          <div
            style={{
              background: 'rgba(15, 118, 110, 0.22)',
              border: '1px solid rgba(45, 212, 191, 0.32)',
              borderRadius: '20px',
              padding: '30px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 900,
                color: '#2DD4BF',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '12px',
              }}
            >
              {t('services:jpp_feedback', 'Maklum Balas JPP')}
            </div>
            <p style={{ fontSize: '20px', lineHeight: 1.6, color: '#EBF7F4', margin: 0 }}>
              {confession.official_reply}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          marginTop: 'auto',
          paddingTop: '40px',
        }}
      >
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#99CBC2',
            margin: 0,
            letterSpacing: '1px',
          }}
        >
          JPP POLISAS PORTAL • POLYSUARA SEMAMBU
        </p>
      </div>
    </div>
  );
}
