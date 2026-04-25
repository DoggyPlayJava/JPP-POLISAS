import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/lib/notifications';

interface NotificationState {
  notifs: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isMarkingAll: boolean;

  // Actions
  setNotifs: (notifs: AppNotification[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;

  // Realtime updates
  addNotif: (notif: AppNotification) => void;
  updateNotif: (notif: AppNotification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifs: [],
  unreadCount: 0,
  isLoading: false,
  isMarkingAll: false,

  setNotifs: (notifs) => set({
    notifs,
    unreadCount: notifs.filter(n => !n.is_read).length
  }),

  setIsLoading: (isLoading) => set({ isLoading }),

  addNotif: (notif) => set((state) => {
    // Avoid duplicates
    if (state.notifs.some(n => n.id === notif.id)) return state;
    const newNotifs = [notif, ...state.notifs].slice(0, 50);
    return {
      notifs: newNotifs,
      unreadCount: newNotifs.filter(n => !n.is_read).length
    };
  }),

  updateNotif: (notif) => set((state) => {
    const newNotifs = state.notifs.map(n => n.id === notif.id ? { ...n, ...notif } : n);
    return {
      notifs: newNotifs,
      unreadCount: newNotifs.filter(n => !n.is_read).length
    };
  }),

  markRead: async (id: string) => {
    // Optimistic update first
    set((state) => {
      const newNotifs = state.notifs.map(n => n.id === id ? { ...n, is_read: true } : n);
      return { notifs: newNotifs, unreadCount: newNotifs.filter(n => !n.is_read).length };
    });
    // Persist to Supabase — RLS ensures user can only update own notifs
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  markAllRead: async () => {
    const unreadIds = get().notifs.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Lock button + optimistic update immediately
    set((state) => ({
      isMarkingAll: true,
      notifs: state.notifs.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      console.error('[markAllRead] Failed to persist to database:', error.message);
      // Revert optimistic update on failure
      set((state) => ({
        notifs: state.notifs.map(n =>
          unreadIds.includes(n.id) ? { ...n, is_read: false } : n
        ),
        unreadCount: unreadIds.length,
      }));
    }

    // Always unlock regardless of success/failure
    set({ isMarkingAll: false });
  },
}));
