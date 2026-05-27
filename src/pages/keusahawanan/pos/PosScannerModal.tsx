import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

function extractOrderId(text: string): string {
  const match = text.match(/([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})/i);
  return match ? match[1] : text;
}

interface ScannedOrder {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  business_id: string;
  product_id: string;
  payment_method: string | null;
  selected_variation: string | null;
  status: string;
  business_products: { id: string; name: string; price: number } | null;
  buyer: { id: string; full_name: string } | null;
}

interface PosScannerModalProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  businessId: string;
  servedBy: string;
}

export function PosScannerModal({ onScan, onClose, businessId, servedBy }: PosScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [hudState, setHudState] = useState<{
    status: 'success' | 'error';
    message: string;
    subMessage?: string;
  } | null>(null);

  const processingRef = useRef(false);
  const bulkModeRef = useRef(bulkMode);
  const mountedRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());
  // Keep latest props in refs for stable closure access
  const businessIdRef = useRef(businessId);
  const servedByRef = useRef(servedBy);

  // Sync refs with state/props
  useEffect(() => { bulkModeRef.current = bulkMode; }, [bulkMode]);
  useEffect(() => { businessIdRef.current = businessId; }, [businessId]);
  useEffect(() => { servedByRef.current = servedBy; }, [servedBy]);

  // Shared AudioContext — create once, reuse, close on unmount
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback((success: boolean) => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 880 : 150, ctx.currentTime);
      gain.gain.setValueAtTime(success ? 0.08 : 0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  }, [getAudioCtx]);

  const handleBulkProcess = useCallback(async (orderId: string) => {
    // Duplicate prevention — skip if already processed
    if (processedIdsRef.current.has(orderId)) {
      processingRef.current = false;
      return;
    }

    try {
      // 1. Fetch order details to verify and get info for the HUD
      const { data: rawOrder, error: fetchError } = await supabase
        .from('polymart_orders')
        .select(`
          id, quantity, unit_price, total_price, business_id, product_id,
          payment_method, selected_variation, status,
          business_products!product_id ( id, name, price ),
          buyer:profiles!buyer_id ( id, full_name )
        `)
        .eq('id', orderId)
        .single();

      if (fetchError || !rawOrder) {
        throw new Error('Pesanan tidak wujud atau kod QR tidak sah.');
      }

      const order = rawOrder as unknown as ScannedOrder;

      if (order.business_id !== businessIdRef.current) {
        throw new Error('Pesanan ini bukan untuk perniagaan anda.');
      }

      if (order.status !== 'READY' && order.status !== 'CONFIRMED') {
        throw new Error(`Pesanan sudah selesai/batal (Status: ${order.status}).`);
      }

      // 2. Selesaikan order melalui RPC
      const pm = order.payment_method || 'CASH';
      const { error: rpcError } = await supabase.rpc('complete_polymart_order', {
        p_order_id: order.id,
        p_business_id: order.business_id,
        p_product_id: order.product_id,
        p_quantity: order.quantity,
        p_unit_price: order.unit_price,
        p_payment_method: pm,
        p_served_by: servedByRef.current
      });

      if (rpcError) throw rpcError;

      // Mark as processed to prevent re-scanning
      processedIdsRef.current.add(orderId);

      // 3. Audio Maklum Balas
      playBeep(true);

      // 4. Set Success HUD
      const sizeStr = order.selected_variation ? ` [Saiz: ${order.selected_variation}]` : '';
      if (mountedRef.current) {
        setHudState({
          status: 'success',
          message: `SELESAI: ${order.buyer?.full_name || 'Pelanggan'}`,
          subMessage: `${order.business_products?.name || 'Produk'}${sizeStr} x ${order.quantity}`
        });
      }
      toast.success(`SELESAI: ${order.buyer?.full_name || 'Pelanggan'}`);

    } catch (err: any) {
      playBeep(false);
      if (mountedRef.current) {
        setHudState({
          status: 'error',
          message: 'RALAT IMBASAN',
          subMessage: err.message || 'Gagal memproses pesanan.'
        });
      }
      toast.error(err.message || 'Gagal memproses pesanan.');
    } finally {
      // 5. Padam HUD dan buka kekunci throttle selepas 1.5 saat
      setTimeout(() => {
        if (mountedRef.current) {
          setHudState(null);
        }
        processingRef.current = false;
      }, 1500);
    }
  }, [playBeep]);

  useEffect(() => {
    mountedRef.current = true;
    scannerRef.current = new Html5Qrcode('pos-qr-reader');
    
    scannerRef.current.start(
      { facingMode: 'environment' },
      { 
        fps: 20, 
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.85;
          return { width: size, height: size };
        }
      },
      (decodedText) => {
        if (processingRef.current) return; // Throttled

        const cleanText = extractOrderId(decodedText);

        if (bulkModeRef.current) {
          processingRef.current = true;
          handleBulkProcess(cleanText);
        } else {
          // Mod Biasa: Hentikan kamera & hantar cleanText ke induk
          if (scannerRef.current?.isScanning) {
            scannerRef.current.stop()
              .then(() => onScan(cleanText))
              .catch(console.error);
          } else {
            onScan(cleanText);
          }
        }
      },
      () => { /* abaikan ralat imbasan biasa */ }
    ).catch((err) => {
      console.error("QR Scanner failed to start", err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('NotAllowedError')) {
        setErrorMsg('Akses kamera ditolak atau disekat oleh pelayar web (Sila pastikan guna HTTPS/Localhost).');
      } else {
        setErrorMsg('Gagal memulakan kamera. Peranti mungkin tiada kamera atau disekat.');
      }
    });

    return () => {
      mountedRef.current = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
      // Close shared AudioContext on unmount
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, [onScan, handleBulkProcess]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-20">
        <div className="flex flex-col">
          <h3 className="font-black text-lg tracking-tight">Imbas QR PolyMart</h3>
          <p className="text-[10px] text-white/50 font-semibold">Kaunter POS Bersepadu</p>
        </div>
        <button onClick={onClose} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-all hover:scale-105 active:scale-95">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Main Viewfinder Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-sm aspect-square bg-white/5 rounded-[2.5rem] overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
          <div id="pos-qr-reader" className="w-full h-full object-cover" />
          
          {errorMsg && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6 text-center z-20">
              <p className="text-rose-400 font-black text-sm leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* Holographic scanning guidelines */}
          {!errorMsg && (
            <>
              <div className="absolute inset-4 border border-white/20 rounded-[1.8rem] pointer-events-none" />
              <div className="absolute inset-0 border-2 border-white/10 rounded-[2.5rem] pointer-events-none" />
              <motion.div 
                initial={{ top: '5%' }}
                animate={{ top: '95%' }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_4px_rgba(245,158,11,0.6)] z-10"
              />
            </>
          )}

          {/* Full Screen Neon HUD Overlays */}
          <AnimatePresence>
            {hudState && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md transition-all duration-300 ${
                  hudState.status === 'success' 
                    ? 'bg-emerald-950/90 border-4 border-emerald-500/80 shadow-[inset_0_0_60px_rgba(16,185,129,0.4)]' 
                    : 'bg-rose-950/90 border-4 border-rose-500/80 shadow-[inset_0_0_60px_rgba(244,63,94,0.4)]'
                }`}
              >
                <motion.div 
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.05, type: 'spring', damping: 15 }}
                  className="mb-4"
                >
                  {hudState.status === 'success' ? (
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 filter drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                  ) : (
                    <AlertTriangle className="w-16 h-16 text-rose-400 filter drop-shadow-[0_0_12px_rgba(251,113,133,0.6)]" />
                  )}
                </motion.div>
                
                <h4 className={`text-xl font-black tracking-tight leading-tight px-2 ${
                  hudState.status === 'success' ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  {hudState.message}
                </h4>
                
                {hudState.subMessage && (
                  <p className="text-xs font-bold text-white/80 mt-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 leading-normal max-w-[90%] truncate">
                    {hudState.subMessage}
                  </p>
                )}
                
                <span className={`text-[9px] font-black uppercase tracking-widest mt-6 bg-white/10 px-2.5 py-1 rounded-md ${
                  hudState.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {hudState.status === 'success' ? '⚡ Bersedia untuk Imbasan Seterusnya' : '⚠️ Sila Semak Tempahan'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle Mode Imbas Pukal Premium */}
        <div className="mt-8 flex flex-col items-center gap-2 w-full max-w-sm">
          <button
            onClick={() => setBulkMode(v => !v)}
            className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 font-black text-xs uppercase tracking-wider transition-all duration-300 border ${
              bulkMode 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)]' 
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white/70'
            }`}
          >
            <Zap className={`w-4 h-4 ${bulkMode ? 'animate-pulse text-emerald-400' : ''}`} />
            ⚡ Mod Imbas Pukal (Pantas)
          </button>
          <p className="text-[10px] text-white/40 font-bold text-center px-4 leading-normal">
            {bulkMode 
              ? 'Kamera kekal aktif. Menyelesaikan pesanan secara automatik sebaik sahaja diimbas dengan HUD 1.5s.' 
              : 'Imbasan tunggal biasa. Memaparkan tetingkap sahkan bayaran sebelum menyelesaikan pesanan.'
            }
          </p>
        </div>
      </div>
      
      {/* Bottom Footer Info */}
      <div className="p-6 text-center text-xs font-bold text-white/50 pb-10">
        <p>Halakan kamera pada Kod QR pesanan pelanggan untuk memulakan semakan</p>
        {bulkMode && processedIdsRef.current.size > 0 && (
          <p className="mt-1 text-emerald-400/60">✅ {processedIdsRef.current.size} pesanan telah diimbas sesi ini</p>
        )}
      </div>
    </motion.div>
  );
}
