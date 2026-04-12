import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, ShieldCheck, KeyRound } from 'lucide-react';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba, cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export function JppSettingsPage() {
    const { isSuperAdmin, profile } = useAuth();
    const isYDP = profile?.jpp_position === 'YANG_DIPERTUA' || isSuperAdmin;
    const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
    const [loading, setLoading] = useState(true);

    const [settings, setSettings] = useState<Record<string, any>>({
        staff_registration_code: ''
    });

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

    const updateStaffCode = async () => {
        const input = window.prompt("Masukkan kod pendaftaran staf baharu. \nPENTING: Kod ini wajib dirahsiakan. Sentiasa gunakan huruf besar (Uppercase) tanpa jarak.", settings.staff_registration_code);
        if (input === null) return;
        
        const newCode = input.trim().toUpperCase();
        if (newCode.length < 5) {
            toast.error("Kod baharu mestilah sekurang-kurangnya 5 aksara.");
            return;
        }

        const toastId = toast.loading('Mengemaskini kod staf...');
        try {
            const { data, error } = await supabase.from('system_settings').update({ value: JSON.stringify(newCode) }).eq('key', 'staff_registration_code').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'staff_registration_code', value: JSON.stringify(newCode) });
            
            setSettings(s => ({ ...s, staff_registration_code: newCode }));
            toast.success(`Kod pendaftaran staf berjaya dikemaskini. Kod baharu: ${newCode}`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || 'Gagal kemaskini kod staf', { id: toastId });
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30 text-xs uppercase tracking-widest">Memuatkan Tetapan Sistem...</div>;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white py-10 px-6 overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-10"
                    style={{ background: themeColor }} />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto space-y-10">
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ background: hexToRgba(themeColor, 0.1), borderColor: hexToRgba(themeColor, 0.2), color: themeColor }}>
                            <SettingsIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white leading-tight">Tetapan Utama JPP</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">Konfigurasi & parameter global portal</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <ShieldCheck className="w-5 h-5 text-violet-500" />
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Ketetapan Sistem & Akses</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tetapan KPP telah dipindahkan ke Dashboard KPP (Laporan PDF, Had Keahlian, Takwim) */}

                        {/* Kod Pendaftaran Staf - Hanya untuk SUPER ADMIN */}
                        {isSuperAdmin && (
                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-rose-900/10 to-rose-900/5 border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 md:col-span-2 group hover:from-rose-900/20 transition-all">
                                <div className="flex items-center gap-4 w-full sm:w-auto flex-col sm:flex-row text-center sm:text-left">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-white">Kod Pendaftaran Staf</p>
                                        <p className="text-xs text-rose-400/70 font-medium">Kod rahsia yang digunakan semasa pendaftaran staf/pensyarah.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <div className="bg-black/40 px-4 py-3 rounded-xl font-mono text-sm font-bold text-rose-200 border border-rose-500/20">
                                        {settings.staff_registration_code || '••••••••'}
                                    </div>
                                    <button onClick={updateStaffCode} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/50 transition-all w-full sm:w-auto">
                                        Tukar Kod
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
