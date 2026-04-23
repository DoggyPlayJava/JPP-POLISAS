import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface PosScannerModalProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function PosScannerModal({ onScan, onClose }: PosScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('pos-qr-reader');
    
    scannerRef.current.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop()
            .then(() => onScan(decodedText))
            .catch(console.error);
        } else {
          onScan(decodedText);
        }
      },
      (error) => { /* ignore normal errors */ }
    ).catch((err) => {
      console.error("QR Scanner failed to start", err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('NotAllowedError')) {
        setErrorMsg('Akses kamera ditolak atau disekat oleh pelayar web (Sila pastikan guna HTTPS/Localhost).');
      } else {
        setErrorMsg('Gagal memulakan kamera. Peranti mungkin tiada kamera atau disekat.');
      }
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
        <h3 className="font-black text-lg">Imbas QR PolyMart</h3>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm aspect-square bg-white/5 rounded-3xl overflow-hidden relative border border-white/10">
          <div id="pos-qr-reader" className="w-full h-full" />
          
          {errorMsg && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center z-20">
              <p className="text-red-400 font-bold text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Overlay scanning lines for aesthetic */}
          {!errorMsg && (
            <>
              <div className="absolute inset-0 border-2 border-amber-500/50 rounded-3xl pointer-events-none" />
              <motion.div 
                initial={{ top: 0 }}
                animate={{ top: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_8px_2px_rgba(245,158,11,0.5)] z-10"
              />
            </>
          )}
        </div>
      </div>
      
      <div className="p-6 text-center text-sm font-bold text-white/60 pb-12">
        <p>Halakan kamera pada Kod QR pesanan pelanggan</p>
      </div>
    </motion.div>
  );
}
