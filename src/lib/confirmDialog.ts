export interface ConfirmActionOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'danger' | 'warning';
}

export interface PendingConfirmRequest extends ConfirmActionOptions {
  resolve: (confirmed: boolean) => void;
}

type ConfirmListener = (req: PendingConfirmRequest | null) => void;

const listeners = new Set<ConfirmListener>();
const queue: PendingConfirmRequest[] = [];
let activeRequest: PendingConfirmRequest | null = null;

function notify() {
  for (const listener of listeners) {
    listener(activeRequest);
  }
}

function flushNext() {
  if (activeRequest || queue.length === 0) return;
  activeRequest = queue.shift() ?? null;
  notify();
}

export function subscribeConfirmDialog(listener: ConfirmListener): () => void {
  listeners.add(listener);
  listener(activeRequest);
  return () => {
    listeners.delete(listener);
  };
}

export function resolveActiveConfirm(confirmed: boolean): void {
  if (!activeRequest) return;
  const current = activeRequest;
  activeRequest = null;
  notify();
  current.resolve(confirmed);
  if (queue.length > 0) {
    setTimeout(flushNext, 0);
  }
}

/**
 * Promise-based replacement for the native browser confirm dialog.
 * Renders the unified Radix `<ConfirmDialog />` via `<GlobalConfirmHost />`.
 */
export function confirmAction(
  messageOrOptions: string | ConfirmActionOptions
): Promise<boolean> {
  const options: ConfirmActionOptions =
    typeof messageOrOptions === 'string'
      ? { description: messageOrOptions, variant: 'destructive' }
      : messageOrOptions;

  if (listeners.size === 0) {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    queue.push({ ...options, resolve });
    flushNext();
  });
}
