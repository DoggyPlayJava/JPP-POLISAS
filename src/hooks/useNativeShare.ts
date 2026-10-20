import { useCallback } from 'react';
import toast from 'react-hot-toast';
import i18n from '@/lib/i18n';

const t = (k: string, fb: string, opt?: any): string =>
  (i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...opt }) as string) : fb);

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

export function useNativeShare() {
  const share = useCallback(async (data: ShareData) => {
    // Determine if Native Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (error: any) {
        // AbortError is triggered when user cancels the share sheet
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          toast.error(t('portal:share_failed_open', 'Gagal membuka menu kongsi.'));
        }
        return false;
      }
    } else {
      // Fallback: Copy URL to clipboard
      if (data.url) {
        try {
          await navigator.clipboard.writeText(data.url);
          toast.success(t('portal:link_copied_clipboard', 'Pautan disalin ke papan keratan.'));
          return true;
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
          toast.error(t('portal:failed_copy_link', 'Gagal menyalin pautan.'));
          return false;
        }
      } else if (data.text) {
        try {
          await navigator.clipboard.writeText(data.text);
          toast.success(t('portal:text_copied_clipboard', 'Teks disalin ke papan keratan.'));
          return true;
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
          toast.error(t('portal:failed_copy_text', 'Gagal menyalin teks.'));
          return false;
        }
      }
      return false;
    }
  }, []);

  return { share };
}
