import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarDays, Clock, BookOpen, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ms } from 'date-fns/locale';
import { TAKWIM_JENIS, type TakwimItem } from '@/config/takwim-constants';
import { hexToRgba } from '@/lib/utils';

interface DayDetailSheetProps {
  day: Date | null;
  events: TakwimItem[];
  onClose: () => void;
}

function fmtDate(d: string) {
  try { return format(parseISO(d), 'd MMMM yyyy', { locale: ms }); }
  catch { return d; }
}

function EventCard({ item }: { item: TakwimItem }) {
  const cfg = TAKWIM_JENIS[item.jenis];
  const color = item.warna_custom || cfg?.color || '#94A3B8';
  const Icon = cfg?.icon ?? Tag;

  const dateLabel = item.tarikh_tamat && item.tarikh_tamat !== item.tarikh_mula
    ? `${fmtDate(item.tarikh_mula)} — ${fmtDate(item.tarikh_tamat)}`
    : fmtDate(item.tarikh_mula);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-4 space-y-3"
      style={{
        background: hexToRgba(color, 0.06),
        borderColor: hexToRgba(color, 0.18),
      }}
    >
      {/* Jenis badge + icon */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: hexToRgba(color, 0.15) }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
          style={{ background: hexToRgba(color, 0.15), color }}
        >
          {cfg?.label || item.jenis}
          {item.kelab_kediaman_label ? ` · ${item.kelab_kediaman_label}` : ''}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-black text-white/90 leading-snug">{item.tajuk}</p>

      {/* Aktiviti (sub-title) */}
      {item.aktiviti && item.aktiviti !== item.tajuk && (
        <p className="text-[11px] text-white/50 leading-relaxed flex items-start gap-1.5">
          <BookOpen size={11} className="shrink-0 mt-0.5 text-white/30" />
          {item.aktiviti}
        </p>
      )}

      {/* Date */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/50">
        <CalendarDays size={12} className="text-white/30" />
        <span>{dateLabel}</span>
      </div>

      {/* Bil Minggu */}
      {item.bil_minggu != null && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/50">
          <Clock size={12} className="text-white/30" />
          <span>Minggu {item.bil_minggu}</span>
        </div>
      )}

      {/* Club name */}
      {item.club_name && (
        <div className="text-[10px] font-bold text-white/30 border-t border-white/5 pt-2">
          🏛 {item.club_name}
        </div>
      )}

      {/* Catatan */}
      {item.catatan && (
        <div
          className="text-[11px] leading-relaxed rounded-xl px-3 py-2 border"
          style={{ background: hexToRgba(color, 0.06), borderColor: hexToRgba(color, 0.12), color: hexToRgba(color, 0.9) }}
        >
          📝 {item.catatan}
        </div>
      )}
    </motion.div>
  );
}

export function DayDetailSheet({ day, events, onClose }: DayDetailSheetProps) {
  const isOpen = !!day;
  const dayLabel = day ? format(day, 'EEEE, d MMMM yyyy', { locale: ms }) : '';

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* ── Sheet (bottom on mobile, centered modal on desktop) ── */}
          <motion.div
            key="sheet"
            // Mobile: slide up from bottom
            // Desktop: scale in from center (handled via CSS classes)
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="
              fixed z-[201] bg-[#0f1117] border border-white/10 shadow-2xl
              /* Mobile: anchored to bottom, full width */
              bottom-0 left-0 right-0 rounded-t-3xl max-h-[82vh]
              /* Desktop: centered modal */
              md:bottom-auto md:left-1/2 md:top-1/2
              md:-translate-x-1/2 md:-translate-y-1/2
              md:w-[480px] md:max-h-[75vh]
              md:rounded-3xl
              flex flex-col
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Handle (mobile pill) ── */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-0.5">
                  Aktiviti
                </p>
                <h3 className="text-sm font-black text-white capitalize">{dayLabel}</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Event list ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-xs font-black text-white/20 uppercase tracking-widest">Tiada aktiviti</p>
                  <p className="text-[10px] text-white/15 mt-1">Hari ini tiada takwim berdaftar</p>
                </div>
              ) : (
                events.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <EventCard item={item} />
                  </motion.div>
                ))
              )}
              {/* Bottom safe-area padding for mobile */}
              <div className="h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
