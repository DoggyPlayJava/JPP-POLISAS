import React from 'react';

export interface MakmpWinnerBannerProps {
  standalone?: boolean;
}

/**
 * MakmpWinnerBanner
 *
 * MAKMP campaign notifications are unified into PortalNotificationCenter.
 * Returns null to eliminate duplicate stacked banners across portal views.
 */
export default function MakmpWinnerBanner({ standalone = false }: MakmpWinnerBannerProps = {}) {
  if (!standalone) {
    return null;
  }

  return null;
}
