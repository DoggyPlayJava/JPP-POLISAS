import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/lib/notifications';

interface NotificationState {
  notifs: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  
  // Actions
  setNotifs: (notifs: AppNotification[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  markRead: (id: string, link?: string | null) => Promise<void>;
  markAllRead: (userId?: string) => Promise<void>;
  
  // Realtime updates
  addNotif: (notif: AppNotification) => void;
  updateNotif: (notif: AppNotification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifs: [],
  unreadCount: 0,
  isLoading: false,

  setNotifs: (notifs) => set({ 
    notifs, 
    unreadCount: notifs.filter(n => !n.is_read).length 
  }),

  setIsLoading: (isLoading) => set({ isLoading }),

  addNotif: (notif) => set((state) => {
    // Avoid duplicates
    if (state.notifs.some(n => n.id === notif.id)) return state;
    const newNotifs = [notif, ...state.notifs].slice(0, 30);
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

  markRead: async (id: string, link?: string | null) => {
    // Optimistic update
    set((state) => {
      const newNotifs = state.notifs.map(n => n.id === id ? { ...n, is_read: true } : n);
      return { notifs: newNotifs, unreadCount: newNotifs.filter(n => !n.is_read).length };
    });
    
    // Check if link is provided instead of returning early (to support non-link marking)
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  markAllRead: async (userId?: string) => {
    if (!userId) {
      // Optimistic update without server sync if userId missing
      set((state) => ({ 
        notifs: state.notifs.map(n => ({ ...n, is_read: true })),
        unreadCount: 0 
      }));
      return;
    }

    set((state) => ({
      notifs: state.notifs.map(n => ({ ...n, is_read: true })),
      unreadCount: 0
    }));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  }
}));
