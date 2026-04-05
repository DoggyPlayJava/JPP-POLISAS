import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, User, ArrowLeft, Plus, Trash2, RefreshCw, Unlock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export function PenasihatLogPage() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const getLogStyles = (type: string = '') => {
        const t = (type || '').toUpperCase();
        if (t.includes('CREATE') || t.includes('ADD')) return { icon: <Plus size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
        if (t.includes('DELETE') || t.includes('REJECT')) return { icon: <Trash2 size={14} />, color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
        if (t.includes('UPDATE') || t.includes('EDIT')) return { icon: <RefreshCw size={14} />, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
        if (t.includes('UNLOCK') || t.includes('APPROVE')) return { icon: <Unlock size={14} />, color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
        return { icon: <Activity size={14} />, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' };
    };

    useEffect(() => {
        const fetchLogs = async () => {
            if (!profile) return;
            setIsLoading(true);

            let query = supabase.from('club_logs').select('*');

            if (profile.role !== 'SUPER_ADMIN_JPP') {
                if (!profile.club_id) {
                    setLogs([]);
                    setIsLoading(false);
                    return;
                }
                query = query.eq('club_id', profile.club_id);
            }

            const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

            if (!error) setLogs(data || []);
            setIsLoading(false);
        };
        fetchLogs();
    }, [profile]);

    if (isLoading) return <div className="p-20 text-center opacity-20 animate-pulse font-black uppercase tracking-widest text-primary">Memuatkan Log...</div>;

    return (
        <div className="page-container space-y-10 pb-20">
            <div className="flex items-center justify-between">
                <Button onClick={() => navigate(-1)} variant="ghost" className="rounded-2xl hover:bg-muted font-bold text-xs gap-2 h-11 px-5 border border-border/40">
                    <ArrowLeft className="w-4 h-4" /> Kembali
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10">
                    <ShieldCheck size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">Audit Siber Kelab</span>
                </div>
            </div>

            <div className="space-y-2">
                <h1 className="text-5xl font-black tracking-tighter">Log <span className="gradient-text">Sistem</span></h1>
                <p className="text-muted-foreground text-sm font-bold max-w-lg leading-relaxed">
                    Rekod aktiviti, perubahan data, dan pemantauan integriti kelab anda dalam tempoh nyata.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {logs.length === 0 ? (
                    <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/40">
                        <div className="w-16 h-16 rounded-3xl bg-card shadow-sm flex items-center justify-center border border-border">
                            <Activity className="w-8 h-8 text-muted-foreground/20" />
                        </div>
                        <p className="text-muted-foreground text-sm font-bold italic">Tiada rekod aktiviti dikesan buat masa ini.</p>
                    </div>
                ) : (
                    logs.map((log, idx) => {
                        const style = getLogStyles(log.action_type || log.type);
                        const actionType = (log.action_type || log.type || 'AKTIVITI').replace(/_/g, ' ');
                        const description = log.description || log.content || 'Tiada deskripsi tersedia.';
                        const actor = log.actor_name || (log.user_id ? `ID: ${log.user_id.slice(0, 8)}...` : 'Sistem');

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                                key={log.id}
                                className={cn(
                                    "group flex gap-5 p-6 bg-card border border-border/60 rounded-[2rem] items-start hover:shadow-xl hover:border-primary/20 transition-all cursor-default relative overflow-hidden",
                                    idx === 0 && "ring-2 ring-primary/10 bg-primary/[0.02]"
                                )}
                            >
                                <div className={cn("p-4 rounded-2xl shrink-0 shadow-sm transition-transform group-hover:scale-110", style.bg, style.color)}>
                                    {style.icon}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border", style.bg, style.color, style.border)}>
                                                {actionType}
                                            </span>
                                            {idx === 0 && <span className="text-[9px] font-black uppercase text-primary animate-pulse tracking-tight">Terbaharu</span>}
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground/40 flex items-center gap-1.5 whitespace-nowrap bg-muted/40 px-3 py-1 rounded-full border border-border/20">
                                            <Clock size={12} className="opacity-50" /> {format(parseISO(log.created_at), 'HH:mm • d MMM yyyy')}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-bold text-slate-800 leading-snug">{description}</h4>
                                    <div className="flex items-center gap-3 pt-2">
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/60">
                                            <div className="w-5 h-5 rounded-lg bg-muted flex items-center justify-center"><User size={10} /></div>
                                            Oleh: <span className="text-foreground font-black uppercase tracking-tight">{actor}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}