import React, { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { AppNotification } from '@/lib/notifications';

const POLL_INTERVAL_MS = 20_000;

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
      .limit(30);
      
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

  // Setup Realtime
  const subscribeRealtime = useCallback(() => {
    if (!user?.id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifs_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[Zustand] New notification received ✅', payload.new);
          addNotif(payload.new as AppNotification);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          updateNotif(payload.new as AppNotification);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [user?.id, addNotif, updateNotif]);



  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    subscribeRealtime();

    const handleVisible = () => {
      fetchNotifs();
      subscribeRealtime(); 
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleVisible();
    });
    window.addEventListener('pageshow', handleVisible);
    window.addEventListener('focus', handleVisible);

    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('pageshow', handleVisible);
      window.removeEventListener('focus', handleVisible);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
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
