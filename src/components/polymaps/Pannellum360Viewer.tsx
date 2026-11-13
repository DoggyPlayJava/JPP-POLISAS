import React, { useEffect, useRef, useState, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { 
  Compass, RotateCcw, Play, Pause, Maximize2, Minimize2, 
  Loader2, AlertCircle, RefreshCw, X, MapPin, Crosshair
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PolyMaps360HotspotDraft } from '@/lib/polyMapsSmartEntry';

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
  /** Senarai pin/hotspot interaktif dalam 360° */
  hotspots?: PolyMaps360HotspotDraft[];
  /** Sudut kamera permulaan (yaw: -180..180) */
  initialYaw?: number | null;
  /** Sudut kamera permulaan (pitch: -90..90) */
  initialPitch?: number | null;
  /** Kod bilik sasaran carian pelajar untuk diserlahkan (pulse) & dipusingkan automatik */
  highlightRoomCode?: string | null;
  /** Mod Editor Pin JPP / Sukarelawan: klik atas 360° untuk letak pin pintu bilik */
  editable?: boolean;
  /** Dipanggil apabila pengguna klik pada mana-mana titik dalam 360° (ketika editable=true) */
  onMapClick?: (coords: { pitch: number; yaw: number }) => void;
  /** Dipanggil apabila pengguna klik pada salah satu pin sedia ada */
  onHotspotClick?: (hotspot: PolyMaps360HotspotDraft) => void;
  /** Dipanggil apabila pengguna klik pada pin jenis 'scene' yang mempunyai target_panorama_url */
  onSceneChangeRequest?: (targetPanoramaUrl: string, hotspot: PolyMaps360HotspotDraft) => void;
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
            reject(new Error(i18n.t('services:pannellum_lib_load_failed', 'Gagal memuatkan pustaka Pannellum.')));
          });
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'pannellum-js';
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        pannellumLoaderPromise = null;
        reject(new Error(i18n.t('services:pannellum_lib_load_failed', 'Gagal memuatkan pustaka Pannellum.')));
      };
      document.body.appendChild(script);
    });
  }

  return pannellumLoaderPromise;
}

function isMatchingRoomHotspot(hotspot: PolyMaps360HotspotDraft, highlightRoomCode?: string | null): boolean {
  if (!highlightRoomCode) return false;
  const target = highlightRoomCode.trim().toLowerCase();
  if (!target) return false;
  const code = (hotspot.room_code || '').trim().toLowerCase();
  const label = (hotspot.label || '').trim().toLowerCase();
  return Boolean(
    (code && (code === target || code.includes(target) || target.includes(code))) ||
    (label && (label === target || label.includes(target) || target.includes(label)))
  );
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
  isFullscreen = false,
  hotspots = [],
  initialYaw = null,
  initialPitch = null,
  highlightRoomCode = null,
  editable = false,
  onMapClick,
  onHotspotClick,
  onSceneChangeRequest,
}: Pannellum360ViewerProps) {
  const { t } = useTranslation(['services', 'common']);
  const rawId = useId();
  const containerId = `pannellum-container-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const onHotspotClickRef = useRef(onHotspotClick);
  const onSceneChangeRequestRef = useRef(onSceneChangeRequest);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onHotspotClickRef.current = onHotspotClick;
    onSceneChangeRequestRef.current = onSceneChangeRequest;
    onMapClickRef.current = onMapClick;
  }, [onHotspotClick, onSceneChangeRequest, onMapClick]);

  // Kira yaw & pitch permulaan (keutamaan kepada initialYaw/initialPitch, diikuti hotspot bilik sasaran)
  const resolvedStartCoords = useMemo(() => {
    if (typeof initialYaw === 'number' && !Number.isNaN(initialYaw)) {
      return {
        yaw: initialYaw,
        pitch: typeof initialPitch === 'number' && !Number.isNaN(initialPitch) ? initialPitch : 0,
        hasTargetFocus: true,
      };
    }
    if (highlightRoomCode && hotspots.length > 0) {
      const matched = hotspots.find((h) => isMatchingRoomHotspot(h, highlightRoomCode));
      if (matched) {
        return {
          yaw: matched.yaw,
          pitch: matched.pitch,
          hasTargetFocus: true,
        };
      }
    }
    return { yaw: 0, pitch: 0, hasTargetFocus: false };
  }, [initialYaw, initialPitch, highlightRoomCode, hotspots]);

  const effectiveAutoRotate = editable || resolvedStartCoords.hasTargetFocus ? false : autoRotate;

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRotating, setIsRotating] = useState(effectiveAutoRotate);
  const [loadKey, setLoadKey] = useState(0);
  const [activeChipIndex, setActiveChipIndex] = useState<number | null>(null);

  const hotspotsSignature = useMemo(
    () =>
      JSON.stringify(
        hotspots.map((h) => ({
          id: h.id,
          type: h.pin_type,
          label: h.label,
          room: h.room_code,
          pitch: Math.round(h.pitch * 10) / 10,
          yaw: Math.round(h.yaw * 10) / 10,
          target: h.target_panorama_url,
        }))
      ),
    [hotspots]
  );

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
    setIsRotating(effectiveAutoRotate);

    if (!imageUrl) {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(t('services:pannellum_invalid_url', 'Pautan imej 360 tidak sah atau kosong.'));
      return;
    }

    ensurePannellumLoaded()
      .then(() => {
        if (!isMounted) return;

        const targetEl = document.getElementById(containerId);
        if (!targetEl || !window.pannellum) {
          throw new Error(t('services:pannellum_container_not_found', 'Elemen container Pannellum tidak ditemui.'));
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

        // Bina senarai hotSpots Pannellum dengan DOM badge interaktif
        const pannellumHotSpots = hotspots.map((hs, index) => {
          const isHighlighted = isMatchingRoomHotspot(hs, highlightRoomCode);
          return {
            id: hs.id || `hs-${index}`,
            pitch: Number(hs.pitch) || 0,
            yaw: Number(hs.yaw) || 0,
            type: 'info',
            text: hs.label,
            createTooltipFunc: (hotSpotDiv: HTMLElement) => {
              hotSpotDiv.classList.add('polymaps-custom-hotspot');
              hotSpotDiv.style.cursor = 'pointer';
              hotSpotDiv.style.zIndex = isHighlighted ? '35' : '25';

              const wrapper = document.createElement('div');
              wrapper.className = cn(
                'group/pin relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-black shadow-xl transition-transform duration-200 hover:scale-110 select-none border whitespace-nowrap -translate-x-1/2 -translate-y-1/2',
                isHighlighted
                  ? 'bg-emerald-500 text-slate-950 border-white ring-4 ring-emerald-400/50 animate-bounce'
                  : hs.pin_type === 'room'
                  ? 'bg-slate-900/90 text-white border-emerald-400/60 hover:bg-emerald-600 hover:border-white'
                  : hs.pin_type === 'scene'
                  ? 'bg-indigo-600/95 text-white border-indigo-300/70 hover:bg-indigo-500'
                  : 'bg-amber-500/95 text-slate-950 border-amber-200 hover:bg-amber-400'
              );

              const iconSpan = document.createElement('span');
              iconSpan.textContent =
                hs.pin_type === 'room' ? (isHighlighted ? '🎯' : '🚪') : hs.pin_type === 'scene' ? '🧭' : '🪜';
              wrapper.appendChild(iconSpan);

              const textSpan = document.createElement('span');
              textSpan.textContent = hs.room_code && hs.label && !hs.label.includes(hs.room_code)
                ? `${hs.room_code} • ${hs.label}`
                : hs.label || hs.room_code || 'Pin 360°';
              wrapper.appendChild(textSpan);

              if (hs.description) {
                const descTooltip = document.createElement('div');
                descTooltip.className =
                  'pointer-events-none opacity-0 group-hover/pin:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-xl bg-slate-950/95 text-white text-[10px] font-bold border border-white/15 shadow-2xl max-w-[220px] whitespace-normal text-center';
                descTooltip.textContent = hs.description;
                wrapper.appendChild(descTooltip);
              }

              hotSpotDiv.appendChild(wrapper);
            },
            clickHandlerFunc: (evt: MouseEvent) => {
              if (evt && typeof evt.stopPropagation === 'function') {
                evt.stopPropagation();
              }
              setActiveChipIndex(index);
              if (viewerRef.current && typeof viewerRef.current.lookAt === 'function') {
                try {
                  viewerRef.current.lookAt(hs.pitch, hs.yaw, 90, 650);
                } catch {
                  // ignore
                }
              }
              if (hs.pin_type === 'scene' && hs.target_panorama_url && onSceneChangeRequestRef.current) {
                onSceneChangeRequestRef.current(hs.target_panorama_url, hs);
                return;
              }
              if (onHotspotClickRef.current) {
                onHotspotClickRef.current(hs);
              }
            },
          };
        });

        try {
          const viewer = window.pannellum.viewer(containerId, {
            type: 'equirectangular',
            panorama: imageUrl,
            autoLoad: true,
            autoRotate: effectiveAutoRotate ? -1.5 : 0,
            compass: true,
            showZoomCtrl: false,
            showFullscreenCtrl: false,
            mouseZoom: true,
            touchPanSpeedCoeffFactor: 1,
            friction: 0.15,
            hfov: 100,
            minHfov: 40,
            maxHfov: 120,
            pitch: resolvedStartCoords.pitch,
            yaw: resolvedStartCoords.yaw,
            hotSpots: pannellumHotSpots,
            strings: {
              loadingLabel: t('services:pannellum_loading_label', 'Memuatkan panorama 360°...'),
              loadButtonLabel: t('services:pannellum_click_to_load', 'Klik untuk Muat'),
              genericError: t('services:pannellum_generic_error', 'Ralat: Gagal memuatkan imej 360°.')
            }
          });

          viewerRef.current = viewer;

          viewer.on('load', () => {
            if (!isMounted) return;
            setIsLoading(false);
            setHasError(false);
            if (resolvedStartCoords.hasTargetFocus && typeof viewer.lookAt === 'function') {
              try {
                viewer.lookAt(resolvedStartCoords.pitch, resolvedStartCoords.yaw, 92, 600);
              } catch {
                // ignore
              }
            }
          });

          viewer.on('error', (err: any) => {
            console.error('Pannellum error:', err);
            if (!isMounted) return;
            setIsLoading(false);
            setHasError(true);
            setErrorMessage(typeof err === 'string' ? err : t('services:pannellum_load_error_check_url', 'Gagal memuatkan imej panorama 360°. Sila semak pautan imej.'));
          });
        } catch (err: any) {
          console.error('Pannellum viewer initialization failed:', err);
          if (!isMounted) return;
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(err.message || t('services:pannellum_activate_failed', 'Gagal mengaktifkan penonton 360.'));
        }
      })
      .catch((err: any) => {
        console.error('Error loading Pannellum script/style:', err);
        if (!isMounted) return;
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(err.message || t('services:pannellum_lib_render_failed', 'Pustaka pemaparan 360 gagal dimuatkan.'));
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
  }, [
    containerId,
    imageUrl,
    loadKey,
    effectiveAutoRotate,
    hotspotsSignature,
    highlightRoomCode,
    resolvedStartCoords.pitch,
    resolvedStartCoords.yaw,
    resolvedStartCoords.hasTargetFocus,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || !onMapClickRef.current || !pointerDownPosRef.current) return;
    const start = pointerDownPosRef.current;
    pointerDownPosRef.current = null;

    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    const dt = Date.now() - start.time;

    // Hanya anggap sebagai klik letak pin jika pergerakan jari/tetikus < 6px (bukan sedang drag pusing 360°)
    if (dx > 6 || dy > 6 || dt > 700) return;

    // Abaikan jika pengguna klik pada atas pin sedia ada
    const target = e.target as HTMLElement | null;
    if (target && target.closest('.polymaps-custom-hotspot')) return;

    const viewer = viewerRef.current;
    if (!viewer) return;

    let pitch = 0;
    let yaw = 0;

    try {
      const coords =
        typeof viewer.mouseEventToCoords === 'function'
          ? viewer.mouseEventToCoords(e.nativeEvent)
          : null;
      if (Array.isArray(coords) && coords.length >= 2 && !Number.isNaN(coords[0]) && !Number.isNaN(coords[1])) {
        pitch = Math.round(coords[0] * 100) / 100;
        yaw = Math.round(coords[1] * 100) / 100;
      } else {
        // Fallback matematik berdasarkan sudut tengah kamera & jarak klik relatif
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
        const relY = 0.5 - (e.clientY - rect.top) / Math.max(1, rect.height);
        const hfov = typeof viewer.getHfov === 'function' ? viewer.getHfov() : 100;
        const vfov = hfov * (rect.height / Math.max(1, rect.width));
        const centerYaw = typeof viewer.getYaw === 'function' ? viewer.getYaw() : 0;
        const centerPitch = typeof viewer.getPitch === 'function' ? viewer.getPitch() : 0;
        yaw = Math.round((centerYaw + relX * hfov) * 100) / 100;
        pitch = Math.max(-85, Math.min(85, Math.round((centerPitch + relY * vfov) * 100) / 100));
      }

      onMapClickRef.current({ pitch, yaw });
    } catch (err) {
      console.warn('Gagal mendapatkan koordinat klik 360:', err);
    }
  };

  const handleQuickJumpChip = (hs: PolyMaps360HotspotDraft, idx: number) => {
    setActiveChipIndex(idx);
    if (viewerRef.current) {
      try {
        if (typeof viewerRef.current.stopAutoRotate === 'function') {
          viewerRef.current.stopAutoRotate();
          setIsRotating(false);
        }
        if (typeof viewerRef.current.lookAt === 'function') {
          viewerRef.current.lookAt(hs.pitch, hs.yaw, 90, 650);
        } else {
          viewerRef.current.setPitch(hs.pitch);
          viewerRef.current.setYaw(hs.yaw);
        }
      } catch (e) {
        console.warn('Failed to lookAt hotspot', e);
      }
    }
    if (hs.pin_type === 'scene' && hs.target_panorama_url && onSceneChangeRequest) {
      onSceneChangeRequest(hs.target_panorama_url, hs);
      return;
    }
    if (onHotspotClick) {
      onHotspotClick(hs);
    }
  };

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
      viewerRef.current.setPitch(resolvedStartCoords.pitch);
      viewerRef.current.setYaw(resolvedStartCoords.yaw);
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
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={cn(
          "w-full h-full touch-none",
          editable ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
        )}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Top Header / Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none pr-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 border border-white/15 text-white text-xs font-black shadow-lg uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
          360° Street View
        </span>
        {title && (
          <span className="hidden sm:inline-block px-3 py-1.5 rounded-full bg-slate-900/75 border border-white/10 text-slate-200 text-xs font-bold shadow-md max-w-xs truncate">
            {title}
          </span>
        )}
        {editable && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black shadow-lg">
            <Crosshair className="w-3.5 h-3.5" />
            {t('services:pannellum_pin_mode_active', 'Mod Pin Aktif: Klik Pintu / Tangga Dalam 360°')}
          </span>
        )}
      </div>

      {/* Top Right Actions (Close button if in modal) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center transition-colors shadow-lg active:scale-95"
          title={t('services:pannellum_close_360', 'Tutup 360')}
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Quick-Jump Chip Bar (Senarai Pin Pintu Bilik & Kemudahan Dalam 360° Ini) */}
      {!isLoading && !hasError && hotspots.length > 0 && (
        <div className="absolute bottom-3 left-3 right-28 z-10 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1.5 rounded-2xl bg-black/65 border border-white/15 shadow-xl">
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 shrink-0">
            <MapPin className="w-3 h-3" />
            {t('services:pannellum_pin_chip_prefix', 'Pin ({{count}}):', { count: hotspots.length })}
          </span>
          {hotspots.map((hs, idx) => {
            const isHighlighted = isMatchingRoomHotspot(hs, highlightRoomCode);
            const isActive = activeChipIndex === idx || isHighlighted;
            return (
              <button
                key={hs.id || `${hs.label}-${idx}`}
                type="button"
                onClick={() => handleQuickJumpChip(hs, idx)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all active:scale-95 border",
                  isActive
                    ? "bg-emerald-500 text-slate-950 border-white shadow-sm"
                    : "bg-slate-900/90 text-slate-200 border-white/10 hover:bg-slate-800 hover:text-white"
                )}
              >
                <span>
                  {hs.pin_type === 'room' ? (isHighlighted ? '🎯' : '🚪') : hs.pin_type === 'scene' ? '🧭' : '🪜'}
                </span>
                <span className="max-w-[140px] truncate">
                  {hs.room_code || hs.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Control Toolbar */}
      {showControls && !hasError && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-black/60 border border-white/15 p-1 rounded-2xl shadow-xl">
          {/* Auto-Rotate Toggle */}
          <button
            type="button"
            onClick={toggleAutoRotate}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors text-white",
              isRotating ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "hover:bg-white/20 text-slate-300"
            )}
            title={isRotating ? t('services:pannellum_stop_auto_rotate', 'Hentikan Putaran Auto') : t('services:pannellum_start_auto_rotate', 'Mulakan Putaran Auto')}
          >
            {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          {/* Reset View */}
          <button
            type="button"
            onClick={handleResetView}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
            title={t('services:pannellum_reset_view', 'Set Semula Sudut Pandangan (Reset)')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleFullscreenClick}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
            title={isFullscreen ? t('services:pannellum_exit_fullscreen', 'Keluar Skrin Penuh') : t('services:pannellum_fullscreen', 'Skrin Penuh (Fullscreen)')}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Touch / Mouse Drag Hint (when no hotspots chip bar occupies bottom-left) */}
      {!isLoading && !hasError && hotspots.length === 0 && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 text-[10px] font-bold text-white/70 border border-white/10 opacity-70 group-hover/pano:opacity-100 transition-opacity">
          <span>
            {editable
              ? 'Seret untuk pusing 360° • Klik pada pintu bilik / tangga untuk letak pin'
              : t('services:pannellum_drag_hint', 'Tarik tetikus / sentuh skrin untuk pusing 360°')}
          </span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 text-white">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
          <p className="text-xs font-black uppercase tracking-wider text-slate-200">
            {t('services:pannellum_loading_view', 'Memuatkan Sudut 360°...')}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {t('services:pannellum_touch_explore_hint', 'Sentuh atau seret untuk meneroka panorama')}
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
            {t('services:pannellum_cannot_display', 'Panorama 360° Tidak Dapat Dipaparkan')}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {errorMessage || t('services:pannellum_unsupported_or_failed', 'Imej panorama gagal dimuat atau format tidak disokong.')}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('services:pannellum_retry', 'Cuba Semula')}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                {t('services:pannellum_close', 'Tutup')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
