import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// Convert base64url VAPID key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

// ─── Hook: usePushNotifications ──────────────────────────────────────────────
// Usage: call requestPermission() once after user logs in (e.g. on Dashboard mount)

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuth();

  // Auto-subscribe once authenticated, if permission already granted
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted') {
      subscribeIfNeeded().catch(console.error);
    }
  }, [isAuthenticated, user?.id]);

  // Subscribe to push and save subscription to Supabase
  const subscribeIfNeeded = useCallback(async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Save to Supabase
      const subJson = sub.toJSON();
      await supabase.from('push_subscriptions').upsert(
        {
          user_id:  user!.id,
          endpoint: subJson.endpoint!,
          p256dh:   subJson.keys!.p256dh,
          auth:     subJson.keys!.auth,
          device_hint: navigator.userAgent.includes('Android') ? 'android'
                     : navigator.userAgent.includes('iPhone') ? 'ios'
                     : 'desktop',
        },
        { onConflict: 'user_id,endpoint' }
      );

      return true;
    } catch (err) {
      console.error('[usePushNotifications] subscribe error:', err);
      return false;
    }
  }, [user?.id]);

  // Request permission and subscribe
  const requestPermission = useCallback(async (): Promise<'granted' | 'denied' | 'default'> => {
    if (!('Notification' in window)) return 'denied';
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeIfNeeded();
    }
    return permission;
  }, [subscribeIfNeeded]);

  // Unsubscribe and remove from Supabase
  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_subscriptions').delete()
          .eq('user_id', user!.id).eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
    } catch (err) {
      console.error('[usePushNotifications] unsubscribe error:', err);
    }
  }, [user?.id]);

  return {
    isSupported:  'serviceWorker' in navigator && 'PushManager' in window,
    permission:   typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    requestPermission,
    unsubscribe,
  };
}
