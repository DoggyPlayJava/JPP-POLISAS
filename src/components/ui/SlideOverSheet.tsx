import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SlideOverSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SlideOverSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: SlideOverSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className={cn(
                  'fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white dark:bg-[#1C261D] border-l border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col focus:outline-none overflow-y-auto text-slate-900 dark:text-white',
                  className
                )}
              >
                <div className="flex items-start justify-between pb-4 border-b border-slate-200/80 dark:border-white/10 mb-5">
                  <div>
                    <DialogPrimitive.Title className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      {title}
                    </DialogPrimitive.Title>
                    {description && (
                      <DialogPrimitive.Description className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                        {description}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  <DialogPrimitive.Close className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5" />
                    <span className="sr-only">Tutup</span>
                  </DialogPrimitive.Close>
                </div>
                <div className="flex-1">{children}</div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
