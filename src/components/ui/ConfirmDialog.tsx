import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title: string;
  description?: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'danger' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  description,
  confirmLabel = 'Sahkan',
  cancelLabel = 'Batal',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDialogOpen = open !== undefined ? open : (isOpen ?? false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isLoading) return;
    if (!nextOpen) {
      if (onClose) onClose();
    }
    if (onOpenChange) onOpenChange(nextOpen);
  };

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;
    await onConfirm();
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const handleCancel = () => {
    if (isLoading) return;
    if (onCancel) onCancel();
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const isDestructive = variant === 'destructive' || variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151D16] p-6 shadow-2xl max-w-md">
        <AlertDialogHeader className="space-y-2">
          <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-white/70 leading-relaxed">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-row items-center justify-end gap-3 sm:space-x-0">
          <AlertDialogCancel
            disabled={isLoading}
            onClick={handleCancel}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-transparent text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 font-medium px-4 py-2 text-xs"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={handleConfirm}
            className={cn(
              "rounded-xl font-bold px-4 py-2 text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5",
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
                : isWarning
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
            )}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
