import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Sparkles, Brain, ShieldCheck, AlertTriangle, Lock, Shield, CheckCheck, Activity, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba, cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export function JppNexusPage() {
    const { isSuperAdmin, profile } = useAuth();
    const isYDP = profile?.jpp_position === 'YANG_DIPERTUA' || isSuperAdmin;
    const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
    const [loading, setLoading] = useState(true);

    const [settings, setSettings] = useState<Record<string, any>>({
        allow_ai_chat: true,
        allow_ai_budget: true,
        ai_total_tokens: 0,
        ai_token_limit: 1000000,
        ai_rate_limit: { warning_threshold: 50, block_threshold: 65 },
        ai_token_settings: { free_tier_tokens: 200, pro_tier_tokens: 1000, costs: { pro_kertas_kerja: 50, flash_kertas_kerja: 20, analisis: 5, semak_ejaan: 0 } }
    });
    const [suspiciousUsers, setSuspiciousUsers] = useState<any[]>([]);

    useEffect(() => {
        supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
            .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: settingsData } = await supabase.from('system_settings').select('*');
        if (settingsData) {
            const s = { ...settings };
            settingsData.forEach(item => {
                let val = item.value;
                if (val === 'true') val = true;
                if (val === 'false') val = false;
                if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) { val = val.slice(1, -1); }
                s[item.key] = val;
            });
            setSettings(s);
        }

        const { data: flagged } = await supabase.from('profiles').select('*')
            .in('ai_status', ['warned', 'flagged', 'permanent_ban'])
            .order('ai_daily_usage', { ascending: false });
        setSuspiciousUsers(flagged || []);
        setLoading(false);
    };

    const toggleSetting = async (key: string, currentValue: boolean) => {
        const newValue = !currentValue;
        const toastId = toast.loading('Mengemaskini...');
        try {
            const { error } = await supabase.from('system_settings').update({ value: newValue }).eq('key', key);
            if (error) throw error;
            setSettings(s => ({ ...s, [key]: newValue }));
            toast.success(`Berjaya dilaras.`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message, { id: toastId });
        }
    };

    const updateAiTokenLimit = async () => {
        const input = window.prompt("Masukkan kuota limit pemerhatian token (Dalam angka, cth: 1000000)", settings.ai_token_limit?.toString());
        if (!input) return;
        const newLimit = parseInt(input);
        if (isNaN(newLimit) || newLimit < 1000) { toast.error("Nilai had token mesti lebih daripada 1000."); return; }
        const toastId = toast.loading('Mengemaskini had token...');
        try {
            const { data, error } = await supabase.from('system_settings').update({ value: newLimit }).eq('key', 'ai_token_limit').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'ai_token_limit', value: newLimit });
            setSettings(s => ({ ...s, ai_token_limit: newLimit }));
            toast.success(`Had token baharu: ${newLimit.toLocaleString()}`, { id: toastId });
        } catch (e: any) { toast.error(e.message || 'Gagal kemaskini', { id: toastId }); }
    };

    const updateAiTokenAllowance = async (tier: 'free_tier_tokens' | 'pro_tier_tokens', label: string) => {
        const currentSettings = settings.ai_token_settings || { free_tier_tokens: 200, pro_tier_tokens: 1000, costs: {} };
        const currentLimit = currentSettings[tier] || 0;
        const input = window.prompt(`Masukkan bekalan token sebulan untuk pengguna ${label}:`, currentLimit.toString());
        if (!input) return;
        const newLimit = parseInt(input);
        if (isNaN(newLimit) || newLimit < 0) { toast.error("Sila masukkan nilai nombor sah."); return; }
        const toastId = toast.loading(`Mengemaskini...`);
        try {
            const newSettings = { ...currentSettings, [tier]: newLimit };
            const { data, error } = await supabase.from('system_settings').update({ value: newSettings }).eq('key', 'ai_token_settings').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'ai_token_settings', value: newSettings });
            setSettings(s => ({ ...s, ai_token_settings: newSettings }));
            toast.success(`Berjaya dinaik taraf.`, { id: toastId });
        } catch (e: any) { toast.error(e.message, { id: toastId }); }
    };

    const updateAiTokenCost = async (serviceKey: string, label: string) => {
        const currentSettings = settings.ai_token_settings || { free_tier_tokens: 200, pro_tier_tokens: 1000, costs: {} };
        const currentCost = currentSettings.costs?.[serviceKey] || 0;
        const input = window.prompt(`Masukkan harga kos (token) untuk servis ${label} (Mesti nombor angka. Set '0' untuk jadikannya percuma):`, currentCost.toString());
        if (!input) return;
        const newCost = parseInt(input);
        if (isNaN(newCost) || newCost < 0) { toast.error("Sila masukkan nilai nombor."); return; }
        const toastId = toast.loading(`Mengemaskini...`);
        try {
            const newSettings = { ...currentSettings, costs: { ...currentSettings.costs, [serviceKey]: newCost } };
            const { data, error } = await supabase.from('system_settings').update({ value: newSettings }).eq('key', 'ai_token_settings').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'ai_token_settings', value: newSettings });
            setSettings(s => ({ ...s, ai_token_settings: newSettings }));
            toast.success(`Selesai dikemaskini.`, { id: toastId });
        } catch (e: any) { toast.error(e.message, { id: toastId }); }
    };

    const updateSpamThreshold = async (type: 'warning' | 'block') => {
        const currentRateLimit = settings.ai_rate_limit || { warning_threshold: 50, block_threshold: 65 };
        const label = type === 'warning' ? 'Amaran (Amaran selepas X chat)' : 'Sekatan (Sekat selepas X chat)';
        const currentVal = type === 'warning' ? currentRateLimit.warning_threshold : currentRateLimit.block_threshold;
        const input = window.prompt(`Masukkan had ${label}:`, currentVal?.toString());
        if (!input) return;
        const newLimitValue = parseInt(input);
        if (isNaN(newLimitValue) || newLimitValue < 1) { toast.error("Nilai mesti nombor melebihi 0."); return; }
        const toastId = toast.loading('Mengemaskini had keselamatan...');
        try {
            const newRateLimit = { ...currentRateLimit, [type === 'warning' ? 'warning_threshold' : 'block_threshold']: newLimitValue };
            const { error } = await supabase.from('system_settings').upsert({ key: 'ai_rate_limit', value: newRateLimit }, { onConflict: 'key' });
            if (error) throw error;
            setSettings(s => ({ ...s, ai_rate_limit: newRateLimit }));
            toast.success(`Had dikemaskini`, { id: toastId });
        } catch (e: any) { toast.error(e.message, { id: toastId }); }
    };

    const handleActionSpamUser = async (userId: string, action: 'unban' | 'permanent_ban') => {
        const confirmMsg = action === 'unban' ? 'Lepaskan akses AI untuk pengguna ini?' : 'SEKAT SELAMANYA pengguna ini daripada AI?';
        if (!window.confirm(confirmMsg)) return;
        const toastId = toast.loading('Memproses tindakan...');
        const newStatus = action === 'unban' ? 'active' : 'permanent_ban';
        const updates = action === 'unban' ? { ai_status: newStatus, ai_daily_usage: 0 } : { ai_status: newStatus };
        try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
            if (error) throw error;
            toast.success(`Status AI dikemaskini.`, { id: toastId });
            fetchData();
        } catch (e: any) { toast.error(e.message, { id: toastId }); }
    };

    if (loading) {
        return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30 text-xs uppercase tracking-widest">Memuatkan Nexus Hub...</div>;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute -top-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-5"
                    style={{ background: themeColor }} />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-10">
                
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: hexToRgba(themeColor, 0.15), border: `1px solid ${hexToRgba(themeColor, 0.25)}` }}>
                            <Brain className="w-5 h-5" style={{ color: themeColor }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white leading-tight">Nexus Analytics & Master Switches</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Kawalan utama penggunaan AI & Token</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-10">
                    
                    {/* Metrics & Switches Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Main Metrics Card */}
                        <div className="md:col-span-2 p-8 lg:p-10 rounded-[2.5rem] border border-white/[0.06] bg-gradient-to-br from-indigo-900/40 via-indigo-800/20 to-violet-900/40 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
                            
                            <div className="relative z-10 space-y-8 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-black text-2xl tracking-tighter text-white">Metrik Nexus AI</h3>
                                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-1">Guna Pakai Token Bulan ini</p>
                                    </div>
                                    <div className="px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                                        <p className="text-[9px] font-black uppercase text-indigo-200 tracking-widest">Sistem Pintar v2.0</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-5xl font-black tracking-tighter text-white tabular-nums">{(settings.ai_total_tokens || 0).toLocaleString()}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/60 mt-1">Token Dijana</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-black text-indigo-200 uppercase tracking-tight">
                                                <span>Had Token Global</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white">{(Math.min(((settings.ai_total_tokens || 0) / (settings.ai_token_limit || 1000000)) * 100, 100)).toFixed(1)}%</span>
                                                    <div className="w-[1px] h-3 bg-white/20 mx-1" />
                                                    <button onClick={updateAiTokenLimit} className="hover:text-white underline underline-offset-4 decoration-white/30 transition-colors">Laras Had</button>
                                                </div>
                                            </div>
                                            <div className="h-3 rounded-full bg-black/40 border border-white/5 overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-300 relative" style={{ width: `${Math.min(((settings.ai_total_tokens || 0) / (settings.ai_token_limit || 1000000)) * 100, 100)}%` }}></div>
                                            </div>
                                            <p className="text-[9px] font-medium text-indigo-300/50 uppercase tracking-widest">Kapasiti Server: {(settings.ai_token_limit || 1000000).toLocaleString()} Token</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                            <Sparkles className="w-4 h-4 text-amber-400 mb-2" />
                                            <p className="text-xl font-black text-white tabular-nums">845</p>
                                            <p className="text-[8px] font-black text-indigo-300/70 uppercase tracking-widest mt-1">Panggilan API</p>
                                        </div>
                                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                            <Activity className="w-4 h-4 text-emerald-400 mb-2" />
                                            <p className="text-xl font-black text-emerald-400 uppercase">Aman</p>
                                            <p className="text-[8px] font-black text-indigo-300/70 uppercase tracking-widest mt-1">Status API</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Kill Switches Card */}
                        <div className="p-8 rounded-[2.5rem] border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Master Controls</h4>
                                
                                <div className="space-y-3 relative z-10 w-full sm:w-auto overflow-hidden">
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-colors">
                                        <p className="text-xs font-black text-white">AI Chat Hub</p>
                                        <button onClick={() => toggleSetting('allow_ai_chat', settings.allow_ai_chat)}
                                            className={cn('rounded-full font-black text-[9px] w-12 h-7 uppercase tracking-widest transition-all',
                                                settings.allow_ai_chat ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400' : 'bg-rose-500/20 border border-rose-500/30 text-rose-400')}>
                                            {settings.allow_ai_chat ? 'ON' : 'OFF'}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-colors">
                                        <p className="text-xs font-black text-white">Enjin Bajet AI</p>
                                        <button onClick={() => toggleSetting('allow_ai_budget', settings.allow_ai_budget)}
                                            className={cn('rounded-full font-black text-[9px] w-12 h-7 uppercase tracking-widest transition-all',
                                                settings.allow_ai_budget ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400' : 'bg-rose-500/20 border border-rose-500/30 text-rose-400')}>
                                            {settings.allow_ai_budget ? 'ON' : 'OFF'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 flex flex-col sm:flex-row sm:items-center gap-2 text-amber-500/60 w-full">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-wider leading-relaxed">Kekal Aktif Kecuali Kecemasan</span>
                            </div>
                        </div>
                    </div>

                    {/* Token Economics & Spam Limits */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Token Economics */}
                        <div className="md:col-span-2 p-8 rounded-[2.5rem] border border-white/[0.06] bg-white/[0.02]">
                            <div className="flex items-center gap-2 mb-8">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Ekonomi Token & Kos Perkhidmatan</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-4">
                                    <h4 className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em]">Pengagihan Pas Bulanan</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 transition-colors">
                                            <span className="text-xs font-black text-white">PRO Tier</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-indigo-300">{settings.ai_token_settings?.pro_tier_tokens ?? 1000}</span>
                                                <button onClick={() => updateAiTokenAllowance('pro_tier_tokens', 'PRO')} className="text-white/20 hover:text-indigo-400"><SettingsIcon className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                                            <span className="text-xs font-black text-white/70">FREE Tier</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-white/50">{settings.ai_token_settings?.free_tier_tokens ?? 200}</span>
                                                <button onClick={() => updateAiTokenAllowance('free_tier_tokens', 'PERCUMA')} className="text-white/20 hover:text-white"><SettingsIcon className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[9px] font-black uppercase text-amber-400 tracking-[0.2em]">Kos Operasi AI</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 transition-colors">
                                            <span className="text-[11px] font-bold text-white">Kertas Kerja PRO</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-amber-400">{settings.ai_token_settings?.costs?.pro_kertas_kerja ?? 50} Tk</span>
                                                <button onClick={() => updateAiTokenCost('pro_kertas_kerja', 'Janaan Kertas Kerja Pro')} className="text-white/20 hover:text-amber-400"><SettingsIcon className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 transition-colors">
                                            <span className="text-[11px] font-bold text-white">Kertas Kerja FLASH</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-cyan-400">{settings.ai_token_settings?.costs?.flash_kertas_kerja ?? 20} Tk</span>
                                                <button onClick={() => updateAiTokenCost('flash_kertas_kerja', 'Janaan Kertas Kerja Flash')} className="text-white/20 hover:text-cyan-400"><SettingsIcon className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/[0.06]">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 transition-colors">
                                    <span className="text-[11px] font-bold text-white">Analisis Laporan Kelab</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-rose-400">{settings.ai_token_settings?.costs?.analisis ?? 5} Tk</span>
                                        <button onClick={() => updateAiTokenCost('analisis', 'Analisis Laporan')} className="text-white/20 hover:text-rose-400"><SettingsIcon className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 transition-colors">
                                    <span className="text-[11px] font-bold text-white">Semakan Tatabahasa</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-emerald-400">{settings.ai_token_settings?.costs?.semak_ejaan === 0 ? 'Percuma' : `${settings.ai_token_settings?.costs?.semak_ejaan} Tk`}</span>
                                        <button onClick={() => updateAiTokenCost('semak_ejaan', 'Semakan Tatabahasa')} className="text-white/20 hover:text-emerald-400"><SettingsIcon className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Anti-Spam limits */}
                        <div className="p-8 rounded-[2.5rem] border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-rose-500" />
                                    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Had Anti-Spam</h3>
                                </div>
                                <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-all">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2 text-amber-500">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            <p className="text-[9px] font-black uppercase tracking-widest">Amaran Awal</p>
                                        </div>
                                        <button onClick={() => updateSpamThreshold('warning')} className="text-[9px] font-black text-amber-500 hover:text-amber-400">LARAS</button>
                                    </div>
                                    <p className="text-3xl font-black text-amber-500 tabular-nums">{settings.ai_rate_limit?.warning_threshold || 50}</p>
                                </div>
                                <div className="p-5 rounded-3xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-all">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2 text-rose-500">
                                            <Lock className="w-3.5 h-3.5" />
                                            <p className="text-[9px] font-black uppercase tracking-widest">Sekatan API</p>
                                        </div>
                                        <button onClick={() => updateSpamThreshold('block')} className="text-[9px] font-black text-rose-500 hover:text-rose-400">LARAS</button>
                                    </div>
                                    <p className="text-3xl font-black text-rose-500 tabular-nums">{settings.ai_rate_limit?.block_threshold || 65}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Suspicious Users */}
                    <div className="p-8 rounded-[2.5rem] border border-white/[0.06] bg-white/[0.02]">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="w-5 h-5 text-indigo-400" />
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Pemantauan Akaun Suspicious</h3>
                            <span className="px-2.5 py-1 text-[9px] font-black bg-white/10 rounded-full">{suspiciousUsers.length} dikesan</span>
                        </div>
                        {suspiciousUsers.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                                    <CheckCheck className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-black text-white">Sistem Di Bawah Kawalan</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Tiada akaun dikesan menyalahgunakan Nexus AI setakat ini.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {suspiciousUsers.map(u => (
                                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black text-white/50">
                                                {(u.full_name || u.email || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-bold text-white">{u.full_name || u.email}</p>
                                                    <span className={cn("px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md",
                                                        u.ai_status === 'permanent_ban' ? 'bg-rose-500 text-white' : 
                                                        u.ai_status === 'flagged' ? 'bg-orange-500 text-white' : 'bg-amber-500 text-black'
                                                    )}>
                                                        {u.ai_status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-white/40">Kekerapan Harian: <span className="text-white font-bold">{u.ai_daily_usage} ping</span></p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(u.ai_status === 'flagged' || u.ai_status === 'permanent_ban' || u.ai_status === 'warned') && (
                                                <button onClick={() => handleActionSpamUser(u.id, 'unban')} className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-[9px] font-black uppercase tracking-widest transition-colors">
                                                    Pulihkan Akses
                                                </button>
                                            )}
                                            {u.ai_status !== 'permanent_ban' && (
                                                <button onClick={() => handleActionSpamUser(u.id, 'permanent_ban')} className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-[9px] font-black uppercase tracking-widest transition-colors">
                                                    Sekat Berterusan
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
