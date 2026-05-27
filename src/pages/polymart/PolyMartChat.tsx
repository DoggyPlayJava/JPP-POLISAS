import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function PolyMartChat() {
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

  return null;
}
