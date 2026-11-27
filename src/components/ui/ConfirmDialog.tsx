import React from 'react';
import { useTranslation } from 'react-i18next';
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
  confirmLabel,
  cancelLabel,
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  const resolvedConfirmLabel = confirmLabel ?? t('common:confirm', 'Sahkan');
  const resolvedCancelLabel = cancelLabel ?? t('common:cancel', 'Batal');

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
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-3xl border border-[#B8E4DC]/80 dark:border-[#252B35] bg-white dark:bg-[#13171D] p-6 shadow-surface-lg max-w-md overscroll-contain">
        <AlertDialogHeader className="space-y-2">
          <AlertDialogTitle className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9]">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm text-[#3B635C] dark:text-[#94A0B2] leading-relaxed whitespace-pre-line">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-row items-center justify-end gap-3 sm:space-x-0">
          <AlertDialogCancel
            disabled={isLoading}
            onClick={handleCancel}
            className="rounded-xl border border-[#B8E4DC] dark:border-[#252B35] bg-transparent text-[#0B2420] dark:text-[#F1F5F9] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] font-semibold px-4 py-2 text-xs transition-colors"
          >
            {resolvedCancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={handleConfirm}
            className={cn(
              "rounded-xl font-bold px-4 py-2 text-xs shadow-surface-sm transition-[transform,background-color] duration-150 ease-apple-out active:scale-[0.97] flex items-center gap-1.5",
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : isWarning
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] text-white dark:text-[#090B0E]"
            )}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {resolvedConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
