import { useCallback, useEffect, useState } from 'react';
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

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);

  // Subscribe to push and save subscription to Supabase
  const subscribeIfNeeded = useCallback(async (): Promise<boolean> => {
    console.log('[Push] subscribeIfNeeded called, user:', user?.id);
    console.log('[Push] VAPID_PUBLIC_KEY present:', !!VAPID_PUBLIC_KEY, VAPID_PUBLIC_KEY?.substring(0, 20));

    if (!VAPID_PUBLIC_KEY) {
      console.error('[Push] VAPID_PUBLIC_KEY is missing! Check environment variables.');
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      console.log('[Push] SW ready, scope:', reg.scope);

      // Always unsubscribe and resubscribe to ensure fresh subscription with current VAPID key
      let sub = await reg.pushManager.getSubscription();
      console.log('[Push] Existing subscription:', !!sub);

      if (!sub) {
        console.log('[Push] Creating new subscription with VAPID key...');
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        console.log('[Push] New subscription created:', sub.endpoint.substring(0, 60));
      }

      // Save to Supabase
      const subJson = sub.toJSON();
      console.log('[Push] Saving subscription to Supabase for user:', user?.id);

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id:  user!.id,
          endpoint: subJson.endpoint!,
          p256dh:   subJson.keys!.p256dh,
          auth:     subJson.keys!.auth,
          device_hint: navigator.userAgent.includes('Android') ? 'android'
                     : navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? 'ios'
                     : 'desktop',
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) {
        console.error('[Push] Supabase upsert error:', error);
        setIsSubscribed(false);
        return false;
      }

      console.log('[Push] ✅ Subscription saved to Supabase successfully!');
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] subscribe error:', err);
      setIsSubscribed(false);
      return false;
    }
  }, [user?.id]);

  // Auto-check subscription status on mount
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Push not supported on this device');
      return;
    }

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub);
        if (Notification.permission === 'granted') {
          // Re-sync subscription to DB in case it was lost
          subscribeIfNeeded().catch(console.error);
        }
      });
    });
  }, [isAuthenticated, user?.id, subscribeIfNeeded]);

  // Request permission and subscribe
  const requestPermission = useCallback(async (): Promise<'granted' | 'denied' | 'default'> => {
    if (!('Notification' in window)) return 'denied';
    const permission = await Notification.requestPermission();
    console.log('[Push] Permission result:', permission);
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
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('[Push] unsubscribe error:', err);
    }
  }, [user?.id]);

  return {
    isSupported:  'serviceWorker' in navigator && 'PushManager' in window,
    permission:   typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    isSubscribed,
    requestPermission,
    unsubscribe,
  };
}
