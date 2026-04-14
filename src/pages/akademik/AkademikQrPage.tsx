import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba } from '@/lib/utils';
import {
  QrCode, Star, Clock, CheckCircle, Smartphone,
  Camera, Info, ChevronRight, Zap, Loader2, X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

const THEME = '#34D399';

// ─── Camera QR Scanner ───────────────────────────────────────
function CameraScanner({ onClose, onDetect }: { onClose: () => void; onDetect: (url: string) => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        scanFrame();
      } catch (e: any) {
        if (!active) return;
        setError(e.name === 'NotAllowedError'
          ? 'Akses kamera ditolak. Sila benarkan akses kamera dalam tetapan pelayar.'
          : 'Kamera tidak dapat dibuka. Cuba semula.'
        );
      }
    };

    const scanFrame = () => {
      if (!active) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        setScanning(false);
        onDetect(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    };

    start();
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-white" />
          <span className="text-sm font-black text-white uppercase tracking-widest">Scan QR Merit</span>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 text-center px-8 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
            <Camera className="w-8 h-8 text-rose-400" />
          </div>
          <p className="text-sm font-black text-white">{error}</p>
          <p className="text-[11px] text-white/40">
            Alternatif: Buka kamera telefon anda dan scan terus QR di papan notis.
          </p>
          <button onClick={onClose} className="px-5 py-2.5 rounded-2xl bg-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all">
            Tutup
          </button>
        </div>
      ) : (
        <>
          {/* Video feed */}
          <div className="relative w-full max-w-sm aspect-square overflow-hidden rounded-3xl border-2 border-white/20 mx-4">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan overlay */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Corner brackets */}
                {[['top-4 left-4', 'border-t-2 border-l-2'], ['top-4 right-4', 'border-t-2 border-r-2'],
                  ['bottom-4 left-4', 'border-b-2 border-l-2'], ['bottom-4 right-4', 'border-b-2 border-r-2']].map(([pos, cls], i) => (
                  <div key={i} className={`absolute ${pos} w-8 h-8 ${cls} border-white/70 rounded-sm`} />
                ))}
                {/* Scan line */}
                <motion.div
                  animate={{ y: [-60, 60, -60] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  className="w-3/4 h-px"
                  style={{ background: `linear-gradient(to right, transparent, ${THEME}, transparent)` }}
                />
              </div>
            )}
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/40 mt-6">
            {scanning ? 'Arahkan kamera ke QR kod merit' : 'QR dikesan...'}
          </p>
        </>
      )}
    </motion.div>
  );
}

// ─── Main QR Page (dalam sidebar layout) ─────────────────────
export function AkademikQrPage() {
  const { profile }  = useAuth();
  const navigate     = useNavigate();
  const [scans, setScans]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [totalQrMerit, setTotalQrMerit] = useState(0);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const [scansRes, meritRes] = await Promise.all([
      supabase
        .from('akademik_qr_scans')
        .select('*, akademik_qr_tokens(title, category, source_unit)')
        .eq('user_id', profile.id)
        .order('scanned_at', { ascending: false })
        .limit(30),
      supabase
        .from('merit_transactions')
        .select('points')
        .eq('user_id', profile.id)
        .eq('source', 'QR_SCAN'),
    ]);
    setScans(scansRes.data || []);
    setTotalQrMerit((meritRes.data || []).reduce((s, m) => s + (m.points || 0), 0));
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const handleQrDetected = (url: string) => {
    setShowCamera(false);
    // Extract token from URL pattern: /akademik/qr/:token
    try {
      const parsed  = new URL(url);
      const parts   = parsed.pathname.split('/');
      const tokenIdx = parts.indexOf('qr');
      if (tokenIdx !== -1 && parts[tokenIdx + 1]) {
        const token = parts[tokenIdx + 1];
        navigate(`/akademik/qr/${token}`);
        return;
      }
    } catch {}
    // Jika bukan URL sistam kita tapi ada uuid pattern
    const uuidMatch = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      navigate(`/akademik/qr/${uuidMatch[0]}`);
      return;
    }
    toast.error('QR ini bukan QR Merit JPP yang sah.');
  };

  return (
    <>
      <AnimatePresence>
        {showCamera && (
          <CameraScanner
            onClose={() => setShowCamera(false)}
            onDetect={handleQrDetected}
          />
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Merit</p>
          <h1 className="text-2xl font-black text-white">Scan QR Merit</h1>
          <p className="text-xs text-white/40 font-medium mt-1">
            Scan kod QR aktiviti untuk kumpul merit secara terus
          </p>
        </div>

        {/* Hero — Scan Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-[2rem] p-6 border border-white/[0.06] text-center"
          style={{ background: `linear-gradient(135deg, ${hexToRgba(THEME, 0.12)}, ${hexToRgba('#818CF8', 0.06)})` }}
        >
          <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 50% 30%, ${THEME}, transparent 60%)` }} />
          <div className="relative space-y-4">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"
              style={{ background: hexToRgba(THEME, 0.2), color: THEME, boxShadow: `0 8px 32px ${hexToRgba(THEME, 0.25)}` }}
            >
              <QrCode className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white">Kumpul Merit Aktiviti</h2>
              <p className="text-[11px] text-white/40 font-medium mt-1">
                Scan QR kod yang disediakan oleh Exco KK atau JPP untuk claim merit aktiviti anda
              </p>
            </div>

            {/* Total QR merit */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/[0.08] bg-white/[0.04]">
              <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span className="text-sm font-black text-white">{totalQrMerit}</span>
              <span className="text-[10px] font-black text-white/30 uppercase tracking-wider">merit dari QR</span>
            </div>

            {/* Scan Button */}
            <button
              onClick={() => setShowCamera(true)}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl mx-auto font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              style={{ background: THEME, color: '#064E3B', boxShadow: `0 12px 32px ${hexToRgba(THEME, 0.35)}` }}
            >
              <Camera className="w-4 h-4" />
              Buka Kamera & Scan
            </button>

            <p className="text-[10px] text-white/25 font-medium">
              atau buka kamera telefon anda dan scan QR terus dari papan notis
            </p>
          </div>
        </motion.div>

        {/* How it works */}
        <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Info className="w-3.5 h-3.5" />
            Cara Kerja QR Merit
          </h3>
          <div className="space-y-3">
            {[
              { step: '01', text: 'Pergi ke aktiviti atau program yang disediakan QR', icon: Smartphone },
              { step: '02', text: 'Scan QR код menggunakan kamera di atas atau kamera telefon', icon: QrCode },
              { step: '03', text: 'Merit akan dikreditkan terus ke akaun anda', icon: Zap },
              { step: '04', text: 'Boleh scan semula selepas tempoh cooldown tamat', icon: Clock },
            ].map(({ step, text, icon: Icon }) => (
              <div key={step} className="flex items-center gap-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
                  style={{ background: hexToRgba(THEME, 0.12), color: THEME }}
                >
                  {step}
                </div>
                <p className="text-xs font-medium text-white/50">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scan History */}
        <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Sejarah Scan QR
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : scans.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <QrCode className="w-8 h-8 mx-auto text-white/10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                Belum ada scan QR
              </p>
              <p className="text-[10px] text-white/15 font-medium">
                Scan QR kod aktiviti pertama anda untuk mula kumpul merit
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {scans.map((scan, i) => {
                const token = scan.akademik_qr_tokens;
                const date  = scan.scanned_at
                  ? format(parseISO(scan.scanned_at), 'd MMM yyyy, h:mm a', { locale: ms })
                  : '';
                return (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: hexToRgba(THEME, 0.12), color: THEME }}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white line-clamp-1">
                        {token?.title || 'Aktiviti QR'}
                      </p>
                      <p className="text-[9px] text-white/30 font-bold mt-0.5">{date}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3 h-3 fill-current text-amber-400" />
                      <span className="text-sm font-black text-amber-300">+{scan.merit_awarded}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Note for Exco KK */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <Info className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
          <p className="text-[10px] text-white/25 font-medium leading-relaxed">
            QR kod disediakan oleh <strong className="text-white/40">Exco KK (Kediaman & Kerohanian)</strong> untuk aktiviti asrama seperti solat berjemaah, gotong-royong, dsbnya. Hubungi Exco KK untuk maklumat lanjut.
          </p>
        </div>
      </div>
    </>
  );
}
