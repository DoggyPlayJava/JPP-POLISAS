import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, User, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

export function PenasihatLogPage() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!profile) return;
            setIsLoading(true);

            let query = supabase.from('club_logs').select('*');

            // Jika bukan Super Admin, tapis mengikut club_id pengguna tersebut
            if (profile.role !== 'SUPER_ADMIN_JPP') {
                if (!profile.club_id) {
                    setLogs([]);
                    setIsLoading(false);
                    return;
                }
                query = query.eq('club_id', profile.club_id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (!error) setLogs(data || []);
            setIsLoading(false);
        };
        fetchLogs();
    }, [profile]);

    if (isLoading) return <div className="p-20 text-center opacity-20">MEMUATKAN LOG...</div>;

    return (
        <div className="page-container space-y-8">
            <Button onClick={() => navigate(-1)} variant="ghost" className="rounded-full">
                <ArrowLeft className="mr-2 w-4 h-4" /> Kembali
            </Button>

            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter">Log <span className="text-primary">Sistem</span></h1>
                <p className="text-muted-foreground text-sm font-medium">Rekod aktiviti dan pemantauan kelab.</p>
            </div>

            <div className="space-y-4">
                {logs.length === 0 ? (
                    <p className="text-center py-20 text-muted-foreground">Tiada rekod aktiviti buat masa ini.</p>
                ) : (
                    logs.map((log, idx) => (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                            key={log.id}
                            className="flex gap-4 p-4 bg-white border border-border/40 rounded-3xl items-start shadow-sm"
                        >
                            <div className="p-3 bg-muted rounded-2xl">
                                <Activity className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-primary tracking-widest">{log.type}</span>
                                    <span className="text-[9px] font-medium text-muted-foreground flex items-center gap-1">
                                        <Clock size={10} /> {format(parseISO(log.created_at), 'HH:mm | dd MMM yyyy')}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-slate-800">{log.content}</p>
                                <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                    <User size={10} /> Dilakukan oleh ID: <span className="text-foreground font-bold">{log.user_id}</span>
                                </p>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}