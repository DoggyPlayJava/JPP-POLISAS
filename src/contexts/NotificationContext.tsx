import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { NotificationModule } from '@/lib/notifications';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  module: NotificationModule;
  link?: string | null;
  actor_name?: string | null;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifs: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string, link?: string | null) => Promise<void>;
  markAllRead: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationProvider>');
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 20_000; // poll every 20 seconds as realtime fallback

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKnownCountRef = useRef<number>(0);

  // ── Fetch all notifications ───────────────────────────────────────────────
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
      lastKnownCountRef.current = data.length;
    }
  }, [user?.id]);

  // Fetch on mount & auth change
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifs([]);
      return;
    }
    setIsLoading(true);
    fetchNotifs().finally(() => setIsLoading(false));
  }, [isAuthenticated, user?.id, fetchNotifs]);

  // ── Subscribe to Supabase Realtime ────────────────────────────────────────
  const subscribeRealtime = useCallback(() => {
    if (!user?.id) return;

    // Cleanup old channel
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
          console.log('[Realtime] New notification received ✅', payload.new);
          setNotifs(prev => [payload.new as AppNotification, ...prev].slice(0, 30));
          lastKnownCountRef.current += 1;
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifs(prev =>
            prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new as AppNotification } : n)
          );
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Subscribed to notifications channel');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] ⚠️ Channel error/timeout — polling will cover this', err);
        }
      });

    channelRef.current = channel;
  }, [user?.id]);

  // ── Polling fallback (covers iOS WebSocket drops) ─────────────────────────
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifs();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchNotifs]);

  // ── Main effect: setup realtime + polling ─────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    subscribeRealtime();
    startPolling();

    // Reconnect on all visibility events (iOS uses pageshow, desktop uses visibilitychange)
    const handleVisible = () => {
      console.log('[Notif] App resumed — refetching...');
      fetchNotifs();
      subscribeRealtime(); // reset WebSocket channel
    };

    // visibilitychange covers desktop/Android PWA
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleVisible();
    });

    // pageshow covers iOS PWA (fires when returning from background)
    window.addEventListener('pageshow', handleVisible);

    // focus covers returning to tab
    window.addEventListener('focus', handleVisible);

    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('pageshow', handleVisible);
      window.removeEventListener('focus', handleVisible);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, subscribeRealtime, startPolling, fetchNotifs]);

  // ── Mark read / mark all ──────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  }, [user?.id]);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifs, unreadCount, isLoading, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}
