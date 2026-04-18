import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifs((data as AppNotification[]) || []);
    setIsLoading(false);
  }, [user?.id]);

  // Fetch on mount & auth change
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifs([]);
      return;
    }
    fetchNotifs();
  }, [isAuthenticated, user?.id, fetchNotifs]);

  // Realtime listener — listen for new notifications specifically for this user
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`unified_notifs_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifs(prev => [payload.new as AppNotification, ...prev].slice(0, 30));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifs(prev =>
            prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new as AppNotification } : n)
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markRead = useCallback(async (id: string, link?: string | null) => {
    // Optimistic update
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    // Navigate if link provided — caller handles navigation
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
