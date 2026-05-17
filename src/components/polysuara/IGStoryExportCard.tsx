import React from 'react';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

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
  return (
    <div 
      id={elementId}
      className="fixed top-0 left-0 -z-50 pointer-events-none flex flex-col justify-between"
      style={{
        width: '540px',
        height: '960px', // 9:16 ratio
        background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
        padding: '40px',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Background Decor */}
      <div 
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-20%',
          width: '600px',
          height: '600px',
          background: 'rgba(244, 63, 94, 0.15)',
          filter: 'blur(100px)',
          borderRadius: '50%'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-20%',
          width: '500px',
          height: '500px',
          background: 'rgba(99, 102, 241, 0.15)',
          filter: 'blur(100px)',
          borderRadius: '50%'
        }}
      />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
              Poly<span style={{ color: '#f43f5e' }}>Suara</span>
            </h1>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '100px', fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.7)' }}>
            #{confession.category}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '30px', flex: 1, justifyContent: 'center' }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '24px', 
          padding: '40px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#f43f5e' }}>{confession.codename || 'Pelajar Anon'}</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
              {format(new Date(confession.created_at), 'dd MMM yyyy', { locale: ms })}
            </span>
          </div>
          
          <p style={{ 
            fontSize: confession.content.length > 200 ? '22px' : '32px', 
            fontWeight: 500, 
            lineHeight: 1.5, 
            margin: 0,
            whiteSpace: 'pre-wrap',
            color: 'rgba(255,255,255,0.9)'
          }}>
            "{confession.content}"
          </p>
          
          {confession.image_url && (
            <div style={{ marginTop: '30px', borderRadius: '16px', overflow: 'hidden', height: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
              <img src={confession.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Attachment" />
            </div>
          )}
        </div>

        {confession.official_reply && (
          <div style={{ 
            background: 'rgba(20, 184, 166, 0.1)', 
            border: '1px solid rgba(20, 184, 166, 0.2)', 
            borderRadius: '20px', 
            padding: '30px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
              Maklum Balas JPP
            </div>
            <p style={{ fontSize: '20px', lineHeight: 1.6, color: 'rgba(20, 184, 166, 0.9)', margin: 0 }}>
              {confession.official_reply}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', marginTop: 'auto', paddingTop: '40px' }}>
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: 0, letterSpacing: '1px' }}>
          JPP POLISAS PORTAL • STUDENT FEEDBACK SYSTEM
        </p>
      </div>
    </div>
  );
}
