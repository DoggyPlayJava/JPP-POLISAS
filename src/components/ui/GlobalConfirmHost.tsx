import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  PendingConfirmRequest,
  resolveActiveConfirm,
  subscribeConfirmDialog,
} from '@/lib/confirmDialog';

export function GlobalConfirmHost() {
  const { t } = useTranslation('common');
  const [request, setRequest] = useState<PendingConfirmRequest | null>(null);

  useEffect(() => {
    return subscribeConfirmDialog(setRequest);
  }, []);

  if (!request) return null;

  const defaultTitle =
    request.variant === 'warning'
      ? t('common:confirm_warning_title', 'Sahkan Tindakan')
      : request.variant === 'default'
      ? t('common:confirm_action_title', 'Pengesahan')
      : t('common:confirm_delete_title', 'Sahkan Tindakan');

  return (
    <ConfirmDialog
      open={true}
      title={request.title || defaultTitle}
      description={request.description}
      confirmLabel={request.confirmLabel}
      cancelLabel={request.cancelLabel}
      variant={request.variant ?? 'destructive'}
      onConfirm={() => resolveActiveConfirm(true)}
      onCancel={() => resolveActiveConfirm(false)}
      onOpenChange={(open) => {
        if (!open) resolveActiveConfirm(false);
      }}
    />
  );
}
