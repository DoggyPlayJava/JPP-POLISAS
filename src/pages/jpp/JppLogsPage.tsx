import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Search, ShieldCheck } from 'lucide-react';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export function JppLogsPage() {
    const { isSuperAdmin, profile } = useAuth();
    const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
    const [loading, setLoading] = useState(true);

    const [logs, setLogs] = useState<any[]>([]);
    const [logSearch, setLogSearch] = useState('');

    useEffect(() => {
        supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
            .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase.from('system_logs')
            .select(`
                id,
                action_type,
                entity_type,
                entity_id,
                details,
                created_at,
                profiles ( full_name, role )
            `)
            .order('created_at', { ascending: false })
            .limit(100);
        setLogs(data || []);
        setLoading(false);
    };

    const filteredLogs = logs.filter(log =>
        log.details?.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.profiles?.full_name?.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.action_type?.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(logSearch.toLowerCase())
    );

    if (loading) {
        return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30 text-xs uppercase tracking-widest">Memuatkan Audit Trail...</div>;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white py-10 px-6">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-5"
                    style={{ background: themeColor }} />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto space-y-10">
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ background: hexToRgba(themeColor, 0.1), borderColor: hexToRgba(themeColor, 0.2), color: themeColor }}>
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white leading-tight">Audit & Pemantauan Sistem</h1>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">Jejak aktiviti pentadbiran dan keselamatan</p>
                            </div>
                        </div>
                        <div className="relative w-full md:w-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <Input
                                placeholder="Cari log..."
                                value={logSearch}
                                onChange={(e) => setLogSearch(e.target.value)}
                                className="pl-11 h-12 w-full md:w-[300px] bg-black/40 border-white/10 rounded-2xl text-sm font-medium focus:ring-1 transition-all"
                                style={{ focusRingColor: themeColor }}
                            />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="border border-white/5 bg-white/[0.01] rounded-[2rem] overflow-hidden">
                    <div className="overflow-x-auto max-h-[70vh] rounded-[2rem] custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] font-black uppercase tracking-widest text-white/40 bg-black/40 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-5 whitespace-nowrap">Timestamp</th>
                                    <th className="px-6 py-5">Tindakan</th>
                                    <th className="px-6 py-5">Modul Sistem</th>
                                    <th className="px-6 py-5">Pentadbir/Pelaksana</th>
                                    <th className="px-6 py-5">Butiran Lanjut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-white/30">
                                            <div className="flex flex-col items-center gap-3">
                                                <ShieldCheck className="w-8 h-8 opacity-50" />
                                                <p className="text-[10px] uppercase tracking-widest font-black">Sistem Tiba-tiba Selamat</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-5 whitespace-nowrap text-white/50 text-[11px] font-mono">
                                                {new Date(log.created_at).toLocaleString('ms-MY')}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={cn("px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border",
                                                    log.action_type?.includes('DELETE') || log.action_type?.includes('DISSOLVE') || log.action_type?.includes('REJECT')
                                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                        : log.action_type?.includes('UPDATE') || log.action_type?.includes('APPROVE')
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-white/5 text-white border-white/10'
                                                )}>
                                                    {log.action_type || 'SYSTEM_LOG'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-white/60 font-medium">
                                                {log.entity_type || 'Umum'}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                                        <span className="text-[9px] font-black text-indigo-400 tracking-tighter">
                                                            {(log.profiles?.full_name || '?')[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white/80">{log.profiles?.full_name || 'System Auto'}</p>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{log.profiles?.role || 'SYSTEM'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-xs text-white/60 font-medium break-words max-w-sm">
                                                {log.details || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
