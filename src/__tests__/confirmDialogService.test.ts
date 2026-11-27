import { describe, expect, it } from 'vitest';
import {
  confirmAction,
  resolveActiveConfirm,
  subscribeConfirmDialog,
  type PendingConfirmRequest,
} from '@/lib/confirmDialog';

describe('confirmDialog service', () => {
  it('resolves false safely when no host listener is mounted', async () => {
    const result = await confirmAction('Padam rekod ini?');
    expect(result).toBe(false);
  });

  it('delivers confirm options and resolves true/false on confirm/cancel', async () => {
    let active: PendingConfirmRequest | null = null;
    const unsubscribe = subscribeConfirmDialog((req) => {
      active = req;
    });

    const p1 = confirmAction({
      title: 'Pengesahan',
      description: 'Padam item ini?',
      variant: 'danger',
    });
    expect(active).not.toBeNull();
    expect(active?.description).toBe('Padam item ini?');
    expect(active?.variant).toBe('danger');

    resolveActiveConfirm(true);
    expect(await p1).toBe(true);
    expect(active).toBeNull();

    const p2 = confirmAction('Batalkan perubahan?');
    expect(active?.variant).toBe('destructive');
    resolveActiveConfirm(false);
    expect(await p2).toBe(false);

    unsubscribe();
  });

  it('queues sequential confirmation dialogs without dropping the second step', async () => {
    let active: PendingConfirmRequest | null = null;
    const unsubscribe = subscribeConfirmDialog((req) => {
      active = req;
    });

    const step1 = confirmAction({ description: 'Step 1', variant: 'warning' });
    const step2 = confirmAction({ description: 'Step 2', variant: 'danger' });

    expect(active?.description).toBe('Step 1');
    resolveActiveConfirm(true);
    expect(await step1).toBe(true);

    // Wait for flushNext macrotask
    await new Promise((r) => setTimeout(r, 10));
    expect(active?.description).toBe('Step 2');
    resolveActiveConfirm(true);
    expect(await step2).toBe(true);

    unsubscribe();
  });
});
