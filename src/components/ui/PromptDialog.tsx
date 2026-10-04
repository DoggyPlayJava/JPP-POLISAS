import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { validatePromptInput } from '@/lib/promptUtils';
import { cn } from '@/lib/utils';
import { AlertCircle, Loader2 } from 'lucide-react';

export interface PromptDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  inputLabel?: string;
  placeholder?: string;
  initialValue?: string;
  inputType?: 'text' | 'textarea' | 'number';
  required?: boolean;
  minNumber?: number;
  maxNumber?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  onConfirm: (val: string) => void | Promise<void>;
  onCancel?: () => void;
}

export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  inputLabel,
  placeholder,
  initialValue = '',
  inputType,
  required = false,
  minNumber,
  maxNumber,
  confirmLabel = 'Sahkan',
  cancelLabel = 'Batal',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
    }
  }, [open, initialValue]);

  const handleClose = () => {
    if (isLoading) return;
    if (onCancel) onCancel();
    if (onOpenChange) onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (inputType) {
      const validation = validatePromptInput(value, {
        required,
        isNumber: inputType === 'number',
        min: minNumber,
        max: maxNumber,
      });

      if (!validation.valid) {
        setError(validation.error || 'Input tidak sah');
        return;
      }
    }

    setError(null);
    await onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputType !== 'textarea') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-[460px] rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl p-6 shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-lg font-black tracking-tight text-foreground">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs font-medium leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {inputType && (
          <div className="space-y-2 py-2">
            {inputLabel && (
              <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                {inputLabel} {required && <span className="text-destructive">*</span>}
              </Label>
            )}

            {inputType === 'textarea' ? (
              <Textarea
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={placeholder}
                rows={3}
                disabled={isLoading}
                className={cn(
                  'rounded-2xl border-border/80 bg-muted/30 text-sm font-medium focus-visible:ring-primary/30',
                  error && 'border-destructive focus-visible:ring-destructive/30'
                )}
              />
            ) : (
              <Input
                type={inputType === 'number' ? 'number' : 'text'}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLoading}
                min={minNumber}
                max={maxNumber}
                className={cn(
                  'rounded-xl border-border/80 bg-muted/30 text-sm font-medium focus-visible:ring-primary/30',
                  error && 'border-destructive focus-visible:ring-destructive/30'
                )}
              />
            )}

            {error && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-destructive animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-xl text-xs font-bold uppercase tracking-wider h-10 px-4 active:scale-[0.98] transition-all"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'rounded-xl text-xs font-bold uppercase tracking-wider h-10 px-5 active:scale-[0.98] transition-all shadow-md',
              variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
