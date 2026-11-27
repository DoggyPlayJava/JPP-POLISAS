import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Heart,
  Link2,
  MessageCircle,
  RotateCcw,
  Shield,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import { cleanConfessionText, getFriendlyAnonName } from '@/lib/polySuaraHelpers';

export interface PolySuaraMediaViewerProps {
  imageUrl: string | null;
  altText?: string;
  confession?: any | null;
  onClose: () => void;
  onOpenComments?: (confession: any) => void;
  onToggleHeart?: (confessionId: string) => void;
  onCopyLink?: (confessionId: string) => void;
}

export function PolySuaraMediaViewer({
  imageUrl,
  altText,
  confession,
  onClose,
  onOpenComments,
  onToggleHeart,
  onCopyLink,
}: PolySuaraMediaViewerProps) {
  const { t } = useTranslation(['services', 'common']);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imageUrl]);

  useEffect(() => {
    if (!imageUrl || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imageUrl, onClose]);

  if (typeof document === 'undefined' || !imageUrl) return null;

  const adjustZoom = (delta: number) => {
    setZoom((prev) => {
      const next = Math.min(3, Math.max(1, Number((prev + delta).toFixed(2))));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1) {
      resetZoom();
    } else {
      setZoom(2);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    e.stopPropagation();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || zoom <= 1) return;
    setPan({
      x: dragStartRef.current.originX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.originY + (e.clientY - dragStartRef.current.y),
    });
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const persona = confession ? getFriendlyAnonName(confession.codename) : null;
  const cleanText = confession ? cleanConfessionText(confession.content || '') : '';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={altText || t('services:attachment_proof', 'Bukti Lampiran')}
      className="fixed inset-0 z-[99995] bg-[#050709] text-white flex flex-col lg:flex-row overflow-hidden"
    >
      {/* Main Media Stage */}
      <div
        onClick={() => {
          if (zoom <= 1) onClose();
        }}
        onWheel={(e) => {
          e.preventDefault();
          adjustZoom(e.deltaY < 0 ? 0.25 : -0.25);
        }}
        className="relative flex-1 flex items-center justify-center overflow-hidden bg-[#050709] select-none p-4 sm:p-8"
      >
        {/* Top Floating Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2 pointer-events-none"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common:close', 'Tutup')}
            className="pointer-events-auto h-10 px-3.5 rounded-full bg-[#13171D] border border-white/15 hover:bg-[#1B2028] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">{t('common:close', 'Tutup')}</span>
          </button>

          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#13171D] border border-white/15 p-1">
            <button
              type="button"
              onClick={() => adjustZoom(-0.5)}
              disabled={zoom <= 1}
              aria-label={t('services:suara_media_zoom_out', 'Kecilkan')}
              title={t('services:suara_media_zoom_out', 'Kecilkan')}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-1.5 text-[11px] font-mono tabular-nums text-[#99CBC2] min-w-[44px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => adjustZoom(0.5)}
              disabled={zoom >= 3}
              aria-label={t('services:suara_media_zoom_in', 'Besarkan')}
              title={t('services:suara_media_zoom_in', 'Besarkan')}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoom > 1 && (
              <button
                type="button"
                onClick={resetZoom}
                aria-label={t('services:suara_media_reset', 'Set semula zum')}
                title={t('services:suara_media_reset', 'Set semula zum')}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('services:suara_media_download', 'Muat turun imej')}
              title={t('services:suara_media_download', 'Muat turun imej')}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-[#2DD4BF]"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Interactive Image */}
        <img
          src={imageUrl}
          alt={altText || t('services:attachment_proof', 'Bukti Lampiran')}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={handleDoubleTap}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          draggable={false}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
          className="max-h-[82dvh] lg:max-h-[90dvh] max-w-full w-auto object-contain rounded-xl transition-transform duration-150 ease-out cursor-grab active:cursor-grabbing"
        />
      </div>

      {/* Desktop Context Split Panel (X / Instagram Style) */}
      {confession && (
        <aside className="hidden lg:flex w-[360px] shrink-0 flex-col bg-white dark:bg-[#13171D] text-[#0B2420] dark:text-[#F1F5F9] border-l border-[#B8E4DC]/30 dark:border-[#252B35] h-[100dvh]">
          <div className="p-4 border-b border-[#B8E4DC]/60 dark:border-[#252B35] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] flex items-center justify-center text-base shrink-0">
                {persona?.emoji || '👻'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">
                  {persona?.displayName || t('services:anon_student', 'Pelajar Anon')}
                </p>
                {confession.created_at && (
                  <p className="text-[11px] text-[#3B635C] dark:text-[#94A0B2]">
                    {formatDistanceToNow(new Date(confession.created_at), { addSuffix: true, locale: ms })}
                  </p>
                )}
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC]/70 dark:border-[#252B35] shrink-0">
              {confession.category}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cleanText && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#0B2420] dark:text-[#F1F5F9]">
                {cleanText}
              </p>
            )}

            {confession.official_reply && (
              <div className="rounded-2xl border border-[#0F766E]/25 dark:border-[#2DD4BF]/25 bg-[#EBF7F4]/70 dark:bg-[#1B2028]/70 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F766E] dark:text-[#2DD4BF]">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{t('services:suara_official_note_banner', 'Maklum Balas Rasmi JPP')}</span>
                </div>
                <p className="text-xs leading-relaxed text-[#0B2420] dark:text-[#F1F5F9] whitespace-pre-wrap">
                  {confession.official_reply}
                </p>
              </div>
            )}
          </div>

          <div className="p-3.5 border-t border-[#B8E4DC]/60 dark:border-[#252B35] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {onToggleHeart && (
                <button
                  type="button"
                  onClick={() => onToggleHeart(confession.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] hover:opacity-90 cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span className="font-mono tabular-nums">{confession.upvotes || 0}</span>
                </button>
              )}
              {onOpenComments && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenComments(confession);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" />
                  <span>{t('services:student_comments', 'Ulasan Pelajar')} ({confession.comments_count || 0})</span>
                </button>
              )}
            </div>
            {onCopyLink && (
              <button
                type="button"
                onClick={() => onCopyLink(confession.id)}
                aria-label={t('services:suara_copy_link_tooltip', 'Salin pautan post')}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] cursor-pointer"
              >
                <Link2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Mobile Compact Context Bar */}
      {confession && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="lg:hidden bg-[#0B2420] border-t border-white/10 px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#2DD4BF] truncate">
              {persona?.displayName || t('services:anon_student', 'Pelajar Anon')}
            </p>
            {cleanText && (
              <p className="text-xs text-[#EBF7F4] line-clamp-1">{cleanText}</p>
            )}
          </div>
          {onOpenComments && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenComments(confession);
              }}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0F766E] text-white text-xs font-bold cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{confession.comments_count || 0}</span>
            </button>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

export function PolySuaraImageLightbox(props: { imageUrl: string | null; altText?: string; onClose: () => void }) {
  return <PolySuaraMediaViewer {...props} />;
}
