import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';

export function NotificationBell() {
    const { user } = useAuth();
    const [notifs, setNotifs] = useState<any[]>([]);
    const unreadCount = notifs.filter(n => !n.is_read).length;

    useEffect(() => {
        if (!user) return;
        fetchNotifs();

        // ✅ REAL-TIME LISTENER
        const channel = supabase
            .channel(`notifications-${user.id}-${Date.now()}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Real-time notification:', payload);
                    setNotifs(prev => [payload.new as any, ...prev].slice(0, 5));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchNotifs = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false })
            .limit(5);
        setNotifs(data || []);
    };

    const markAsRead = async () => {
        if (unreadCount > 0) {
            await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id).eq('is_read', false);
            fetchNotifs();
        }
    };

    return (
        <Popover onOpenChange={(open) => open && markAsRead()}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full bg-white/50 border">
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-none overflow-hidden">
                <div className="p-4 bg-primary text-white font-black text-xs uppercase tracking-widest">Notifikasi</div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifs.length === 0 ? (
                        <p className="p-8 text-center text-xs text-muted-foreground font-medium">Tiada notifikasi baharu.</p>
                    ) : (
                        notifs.map(n => (
                            <div key={n.id} className={`p-4 border-b border-muted/20 last:border-0 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                                <p className="text-xs font-black text-primary">{n.title}</p>
                                <p className="text-[11px] font-medium leading-relaxed">{n.content || n.message}</p>
                                <p className="text-[10px] mt-1 opacity-40">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ms })}</p>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}