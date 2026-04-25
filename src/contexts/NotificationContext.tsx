import React, { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { AppNotification } from '@/lib/notifications';

// (polling dihapuskan — guna Realtime Supabase sahaja)

/**
 * Headless Component that sets up Supabase Realtime listeners
 * and pushes the new data into Zustand.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  // Link to Zustand
  const { setNotifs, setIsLoading, addNotif, updateNotif } = useNotificationStore();
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
    }
  }, [user?.id, setNotifs]);

  // Initial Fetch on auth
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifs([]);
      return;
    }
    setIsLoading(true);
    fetchNotifs().finally(() => setIsLoading(false));
  }, [isAuthenticated, user?.id, fetchNotifs, setNotifs, setIsLoading]);

  // Setup Realtime REMOVED to save 1,500 connections!
  const subscribeRealtime = useCallback(() => {
    // Instead of realtime, rely on the visibilitychange / focus events below
  }, [user?.id, addNotif, updateNotif]);



  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Subscribe sekali sahaja bila user authenticate
    subscribeRealtime();

    // ─── Hanya re-fetch data bila tab jadi visible semula ─────────────────────
    // TIDAK recreate channel — channel Realtime masih hidup walaupun tab ditutup
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

    // ─── DIHAPUS: window 'focus' — terlalu sensitif, fire setiap klik ─────────

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, subscribeRealtime, fetchNotifs]);

  // Render children normally, no context provider wrapper
  return <>{children}</>;
}

// Deprecated alias for backwards compatibility, but we will mostly replace usage 
// with exact Zustand selectors in the respective files!
export function useNotifications() {
  return useNotificationStore();
}
