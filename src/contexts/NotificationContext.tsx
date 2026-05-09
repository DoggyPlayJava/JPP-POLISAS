import React, { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { AppNotification } from '@/lib/notifications';

// ─── Lightweight Polling interval (ms) ───────────────────────────────────────
const POLL_INTERVAL_MS = 60_000; // 60 saat

/**
 * Headless Component that manages notification synchronization.
 * Uses lightweight polling (count-based) every 60s to detect new notifications.
 * Only fetches full data when unread count changes — saves bandwidth.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  // Link to Zustand
  const { setNotifs, setIsLoading, addNotif, updateNotif } = useNotificationStore();
  
  const lastUnreadCountRef = useRef<number>(-1);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifs = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (data) {
      setNotifs(data as AppNotification[]);
      // Update cached count
      const unreadCount = data.filter(n => !n.is_read).length;
      lastUnreadCountRef.current = unreadCount;
      
      // Update App Badge
      try {
        if ('setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
          if (unreadCount > 0) {
            navigator.setAppBadge(unreadCount);
          } else {
            if ('clearAppBadge' in navigator && typeof navigator.clearAppBadge === 'function') {
              navigator.clearAppBadge();
            }
          }
        }
      } catch (e) {
        // Ignore if unsupported or fails
      }
    }
  }, [user?.id, setNotifs]);

  // ─── Lightweight polling: hanya semak count unread ──────────────────────────
  const pollUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error || count === null) return;

      // Jika count berubah, fetch penuh
      if (count !== lastUnreadCountRef.current) {
        lastUnreadCountRef.current = count;
        await fetchNotifs();
      }
    } catch {
      // Silent fail — jangan crash polling
    }
  }, [user?.id, fetchNotifs]);

  // Initial Fetch on auth
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifs([]);
      lastUnreadCountRef.current = -1;
      return;
    }
    setIsLoading(true);
    fetchNotifs().finally(() => setIsLoading(false));
  }, [isAuthenticated, user?.id, fetchNotifs, setNotifs, setIsLoading]);

  // ─── Setup polling + visibility listeners ──────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Start lightweight polling every 60s
    pollingRef.current = setInterval(pollUnreadCount, POLL_INTERVAL_MS);

    // Also re-fetch immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifs();
      }
    };

    // pageshow: handle bila user guna back/forward browser cache
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) fetchNotifs();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, pollUnreadCount, fetchNotifs]);

  // Render children normally, no context provider wrapper
  return <>{children}</>;
}

// Deprecated alias for backwards compatibility, but we will mostly replace usage 
// with exact Zustand selectors in the respective files!
export function useNotifications() {
  return useNotificationStore();
}
