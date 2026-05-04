import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  // Track if push service itself is unavailable (e.g. FCM blocked by network/firewall)
  const [pushServiceError, setPushServiceError] = useState(false);
  const retryAttemptedRef = useRef(false);

  // ── Core subscribe logic ─────────────────────────────────────────────────
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

      setIsSubscribed(true);
      setPushServiceError(false);
      return true;
    } catch (err: any) {
      // ── Handle AbortError: push service unavailable ──────────────────────
      // Ini berlaku apabila:
      // - FCM/Mozilla push service disekat oleh firewall/network
      // - VAPID key berubah sejak SW didaftarkan
      // - Stale subscription yang perlu di-unsubscribe dahulu
      if (err?.name === 'AbortError' && !retryAttemptedRef.current) {
        retryAttemptedRef.current = true;
        console.warn('[usePushNotifications] Push service error — attempting to clear stale subscription and retry...');

        try {
          // Unsubscribe stale subscription jika ada
          const reg = await navigator.serviceWorker.ready;
          const staleSub = await reg.pushManager.getSubscription();
          if (staleSub) {
            await staleSub.unsubscribe();
            console.log('[usePushNotifications] Stale subscription cleared, retrying...');
          }
          // Retry sekali sahaja
          const newSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          const subJson = newSub.toJSON();
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
          setIsSubscribed(true);
          setPushServiceError(false);
          return true;
        } catch (retryErr) {
          // Retry juga gagal — push service memang tak boleh dicapai
          console.warn('[usePushNotifications] Push service unavailable on this network/device. In-app notifications still work.');
          setPushServiceError(true);
          setIsSubscribed(false);
          return false;
        }
      }

      // Non-AbortError or already retried
      console.warn('[usePushNotifications] subscribe error:', err?.message || err);
      setPushServiceError(true);
      setIsSubscribed(false);
      return false;
    }
  }, [user?.id]);

  // ── Auto-subscribe once authenticated, if permission already granted ────
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    retryAttemptedRef.current = false; // Reset retry guard on auth change

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) {
          // Ada subscription — sync ke Supabase
          setIsSubscribed(true);
          const subJson = sub.toJSON();
          supabase.from('push_subscriptions').upsert(
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
          ).then(() => {}, () => {}); // Fire-and-forget sync
        } else {
          setIsSubscribed(false);
          // Try subscribing if permission already granted
          if (Notification.permission === 'granted') {
            subscribeIfNeeded().catch(() => {});
          }
        }
      });
    });
  }, [isAuthenticated, user?.id]);

  // ── Request permission and subscribe ────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<'granted' | 'denied' | 'default'> => {
    if (!('Notification' in window)) return 'denied';
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      retryAttemptedRef.current = false; // Allow fresh retry when user explicitly requests
      await subscribeIfNeeded();
    }
    return permission;
  }, [subscribeIfNeeded]);

  // ── Unsubscribe and remove from Supabase ────────────────────────────────
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
      console.error('[usePushNotifications] unsubscribe error:', err);
    }
  }, [user?.id]);

  return {
    isSupported:      'serviceWorker' in navigator && 'PushManager' in window,
    permission:       typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    isSubscribed,
    pushServiceError, // ← Modal boleh guna ini untuk tahu push service tak available
    requestPermission,
    unsubscribe,
  };
}

