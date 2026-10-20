import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function PolyMartChat() {
  const { t } = useTranslation(['commerce', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const businessId = searchParams.get('businessId');
    // Redirect to main PolyMart page
    navigate('/polymart', { replace: true });
    
    // Dispatch event to open the unified inbox or a specific chat inline inside the floating widget
    setTimeout(() => {
      if (businessId) {
        window.dispatchEvent(new CustomEvent('open-polymart-chat', { detail: { businessId } }));
      } else {
        window.dispatchEvent(new CustomEvent('open-inbox'));
      }
    }, 150);
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center text-sm text-muted-foreground animate-pulse">
        {t('commerce:opening_chat', 'Membuka peti perbualan PolyMart...')}
      </div>
    </div>
  );
}
