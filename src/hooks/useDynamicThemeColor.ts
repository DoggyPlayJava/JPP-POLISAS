import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export function useDynamicThemeColor(hexColor: string | { light: string; dark: string }) {
  const { theme } = useTheme();

  useEffect(() => {
    // Check if the device is low-end. If it's a very low-end device, we can skip unnecessary DOM manipulations,
    // though this is very lightweight anyway.
    const isLowEnd = typeof navigator !== 'undefined' && ('deviceMemory' in navigator) && ((navigator as any).deviceMemory <= 4);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) return;

    // Get the original color so we can restore it on unmount
    const originalColor = metaThemeColor.getAttribute('content');

    // Determine the target color based on the current theme mode
    const targetColor = typeof hexColor === 'string' 
      ? hexColor 
      : (theme === 'dark' ? hexColor.dark : hexColor.light);

    // Apply the new color
    metaThemeColor.setAttribute('content', targetColor);

    return () => {
      // Restore original color when component unmounts
      if (originalColor) {
        // Use requestAnimationFrame on low-end devices to avoid jank during heavy transitions
        if (isLowEnd) {
          requestAnimationFrame(() => {
            metaThemeColor.setAttribute('content', originalColor);
          });
        } else {
          metaThemeColor.setAttribute('content', originalColor);
        }
      }
    };
  }, [hexColor, theme]);
}
