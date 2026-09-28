import React, { useEffect, useRef, useState, useId } from 'react';
import { 
  Compass, RotateCcw, Play, Pause, Maximize2, Minimize2, 
  Loader2, AlertCircle, RefreshCw, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    pannellum?: any;
  }
}

export interface Pannellum360ViewerProps {
  imageUrl: string;
  title?: string;
  className?: string;
  height?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  onClose?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

// Singleton loader to avoid injecting Pannellum script multiple times
let pannellumLoaderPromise: Promise<void> | null = null;

function ensurePannellumLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.pannellum) return Promise.resolve();

  if (!pannellumLoaderPromise) {
    pannellumLoaderPromise = new Promise((resolve, reject) => {
      // 1. Inject CSS
      if (!document.getElementById('pannellum-css')) {
        const link = document.createElement('link');
        link.id = 'pannellum-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
        document.head.appendChild(link);
      }

      // 2. Inject Script
      const existingScript = document.getElementById('pannellum-js') as HTMLScriptElement | null;
      if (existingScript) {
        if (window.pannellum) {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => {
            pannellumLoaderPromise = null;
            reject(new Error('Gagal memuatkan pustaka Pannellum.'));
          });
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'pannellum-js';
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        pannellumLoaderPromise = null;
        reject(new Error('Gagal memuatkan pustaka Pannellum.'));
      };
      document.body.appendChild(script);
    });
  }

  return pannellumLoaderPromise;
}

export function Pannellum360Viewer({
  imageUrl,
  title,
  className,
  height = '100%',
  autoRotate = true,
  showControls = true,
  onClose,
  onToggleFullscreen,
  isFullscreen = false
}: Pannellum360ViewerProps) {
  const rawId = useId();
  const containerId = `pannellum-container-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [loadKey, setLoadKey] = useState(0);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setLoadKey(prev => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    if (!imageUrl) {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Pautan imej 360 tidak sah atau kosong.');
      return;
    }

    ensurePannellumLoaded()
      .then(() => {
        if (!isMounted) return;

        const targetEl = document.getElementById(containerId);
        if (!targetEl || !window.pannellum) {
          throw new Error('Elemen container Pannellum tidak ditemui.');
        }

        // Clean up previous viewer instance if exists
        if (viewerRef.current) {
          try {
            viewerRef.current.destroy();
          } catch {
            // Ignore destruction error
          }
          viewerRef.current = null;
        }

        // Clear targetEl innerHTML before initializing new viewer to prevent leftover canvases
        targetEl.innerHTML = '';

        try {
          const viewer = window.pannellum.viewer(containerId, {
            type: 'equirectangular',
            panorama: imageUrl,
            autoLoad: true,
            autoRotate: autoRotate ? -1.5 : 0,
            compass: true,
            showZoomCtrl: false, // We render our own controls for consistent sleek UI
            showFullscreenCtrl: false,
            mouseZoom: true,
            touchPanSpeedCoeffFactor: 1,
            friction: 0.15,
            hfov: 100,
            minHfov: 40,
            maxHfov: 120,
            pitch: 0,
            yaw: 0,
            strings: {
              loadingLabel: 'Memuatkan panorama 360°...',
              loadButtonLabel: 'Klik untuk Muat',
              genericError: 'Ralat: Gagal memuatkan imej 360°.'
            }
          });

          viewerRef.current = viewer;

          viewer.on('load', () => {
            if (!isMounted) return;
            setIsLoading(false);
            setHasError(false);
          });

          viewer.on('error', (err: any) => {
            console.error('Pannellum error:', err);
            if (!isMounted) return;
            setIsLoading(false);
            setHasError(true);
            setErrorMessage(typeof err === 'string' ? err : 'Gagal memuatkan imej panorama 360°. Sila semak pautan imej.');
          });
        } catch (err: any) {
          console.error('Pannellum viewer initialization failed:', err);
          if (!isMounted) return;
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(err.message || 'Gagal mengaktifkan penonton 360.');
        }
      })
      .catch((err: any) => {
        console.error('Error loading Pannellum script/style:', err);
        if (!isMounted) return;
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(err.message || 'Pustaka pemaparan 360 gagal dimuatkan.');
      });

    return () => {
      isMounted = false;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          // ignore
        }
        viewerRef.current = null;
      }
    };
  }, [containerId, imageUrl, loadKey, autoRotate]);

  const toggleAutoRotate = () => {
    if (!viewerRef.current) return;
    try {
      if (isRotating) {
        viewerRef.current.stopAutoRotate();
        setIsRotating(false);
      } else {
        viewerRef.current.startAutoRotate(-1.5);
        setIsRotating(true);
      }
    } catch (e) {
      console.warn('Failed to toggle autoRotate', e);
    }
  };

  const handleResetView = () => {
    if (!viewerRef.current) return;
    try {
      viewerRef.current.setPitch(0);
      viewerRef.current.setYaw(0);
      viewerRef.current.setHfov(100);
    } catch (e) {
      console.warn('Failed to reset view', e);
    }
  };

  const handleFullscreenClick = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }

    if (viewerRef.current && typeof viewerRef.current.toggleFullscreen === 'function') {
      viewerRef.current.toggleFullscreen();
    } else if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden bg-slate-950 select-none group/pano",
        isFullscreen ? "h-full" : "",
        className
      )}
      style={{ height: isFullscreen ? '100%' : height }}
    >
      {/* Target DOM Element for Pannellum */}
      <div 
        id={containerId} 
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Top Header / Badges */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs font-black shadow-lg uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
          360° Street View
        </span>
        {title && (
          <span className="hidden sm:inline-block px-3 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/10 text-slate-200 text-xs font-bold shadow-md max-w-xs truncate">
            {title}
          </span>
        )}
      </div>

      {/* Top Right Actions (Close button if in modal) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-colors shadow-lg active:scale-95"
          title="Tutup 360"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Floating Control Toolbar */}
      {showControls && !hasError && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/15 p-1 rounded-2xl shadow-xl">
          {/* Auto-Rotate Toggle */}
          <button
            onClick={toggleAutoRotate}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors text-white",
              isRotating ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "hover:bg-white/20 text-slate-300"
            )}
            title={isRotating ? "Hentikan Putaran Auto" : "Mulakan Putaran Auto"}
          >
            {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          {/* Reset View */}
          <button
            onClick={handleResetView}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
            title="Set Semula Sudut Pandangan (Reset)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleFullscreenClick}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
            title={isFullscreen ? "Keluar Skrin Penuh" : "Skrin Penuh (Fullscreen)"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Touch / Mouse Drag Hint (disappears on interaction) */}
      {!isLoading && !hasError && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-[10px] font-bold text-white/70 border border-white/10 opacity-70 group-hover/pano:opacity-100 transition-opacity">
          <span>Tarik tetikus / sentuh skrin untuk pusing 360°</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-white">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
          <p className="text-xs font-black uppercase tracking-wider text-slate-200">
            Memuatkan Sudut 360°...
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Sentuh atau seret untuk meneroka panorama
          </p>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">
            Panorama 360° Tidak Dapat Dipaparkan
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {errorMessage || 'Imej panorama gagal dimuat atau format tidak disokong.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Cuba Semula
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
