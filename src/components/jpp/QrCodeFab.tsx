import React, { useState } from 'react';
import { QrCode, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { QrLinkManager } from './QrLinkManager';
import { cn } from '@/lib/utils';

export interface QrUnitLink {
  label: string;
  path: string;
}

interface QrCodeFabProps {
  /** Link utama yang relevan untuk unit ini — akan dipaparkan dahulu */
  unitLinks?: QrUnitLink[];
  /** Warna accent untuk FAB (optional, default gunakan primary) */
  accentColor?: string;
}

/**
 * QrCodeFab — Floating Action Button untuk jana QR Code.
 * Hanya visible untuk ahli JPP (isJppMember).
 * Diletakkan di bottom-right, di atas FloatingAiChat.
 */
export function QrCodeFab({ unitLinks, accentColor }: QrCodeFabProps) {
  const { isJppMember } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Hanya Exco JPP yang nampak FAB ini
  if (!isJppMember) return null;

  return (
    <>
      {/* FAB Button — terletak di atas FloatingAiChat (bottom-24 supaya tidak overlap) */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 25 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'fixed bottom-24 right-5 z-[200] w-11 h-11 rounded-2xl shadow-xl',
          'flex items-center justify-center',
          'border border-white/10',
          'transition-shadow hover:shadow-2xl',
        )}
        style={{
          background: accentColor
            ? `linear-gradient(135deg, ${accentColor}cc, ${accentColor}88)`
            : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
        }}
        title="Jana QR Code"
        aria-label="Buka Penjana QR Code"
      >
        <QrCode className="w-5 h-5 text-white" />
      </motion.button>

      {/* Dialog / Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
            />

            {/* Panel — slide in dari kanan */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className={cn(
                'fixed right-0 top-0 bottom-0 z-[310]',
                'w-full max-w-sm',
                'bg-card border-l border-border/60',
                'shadow-2xl overflow-y-auto',
                'flex flex-col',
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: accentColor
                        ? `${accentColor}20`
                        : 'hsl(var(--primary) / 0.1)',
                    }}
                  >
                    <QrCode
                      className="w-4 h-4"
                      style={{ color: accentColor || 'hsl(var(--primary))' }}
                    />
                  </div>
                  <div>
                    <p className="font-black text-xs uppercase tracking-widest text-foreground">
                      Jana QR Code
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Dengan logo JPP di tengah
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-5">
                <QrLinkManager unitLinks={unitLinks} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
