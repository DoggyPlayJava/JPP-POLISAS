import { useCallback } from 'react';
import toast from 'react-hot-toast';

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
          toast.error('Gagal membuka menu kongsi.');
        }
        return false;
      }
    } else {
      // Fallback: Copy URL to clipboard
      if (data.url) {
        try {
          await navigator.clipboard.writeText(data.url);
          toast.success('Pautan disalin ke papan keratan.');
          return true;
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
          toast.error('Gagal menyalin pautan.');
          return false;
        }
      } else if (data.text) {
        try {
          await navigator.clipboard.writeText(data.text);
          toast.success('Teks disalin ke papan keratan.');
          return true;
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
          toast.error('Gagal menyalin teks.');
          return false;
        }
      }
      return false;
    }
  }, []);

  return { share };
}
