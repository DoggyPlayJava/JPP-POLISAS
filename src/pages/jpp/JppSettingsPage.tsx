import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, ShieldCheck, KeyRound, Calendar } from 'lucide-react';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba, cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { JppStructureSettings } from './JppStructureSettings';

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

export function JppSettingsPage() {
    const { isSuperAdmin, profile } = useAuth();
    const isYDP = profile?.jpp_position === 'YANG_DIPERTUA' || profile?.jpp_position === 'YDP' || isSuperAdmin;
    const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
    const [loading, setLoading] = useState(true);
    const [intake1Month, setIntake1Month] = useState(7);
    const [intake2Month, setIntake2Month] = useState(1);
    const [savingIntake, setSavingIntake] = useState(false);

    const [settings, setSettings] = useState<Record<string, any>>({
        staff_registration_code: '',
        traditional_registration_enabled: true
    });

    useEffect(() => {
        supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
            .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
        fetchData();
    }, []);

    // ── Semak dan hantar notifikasi 1 bulan sebelum intake ──────────────────────
    const checkAndSendIntakeAlert = async (m1: number, m2: number) => {
        if (!isSuperAdmin && !isYDP) return;
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-indexed
        const currentYear  = now.getFullYear();

        const alertMonth1 = m1 === 1 ? 12 : m1 - 1;
        const alertMonth2 = m2 === 1 ? 12 : m2 - 1;

        let intakeNum: number | null = null;
        if (currentMonth === alertMonth1) intakeNum = 1;
        else if (currentMonth === alertMonth2) intakeNum = 2;
        if (!intakeNum) return;

        const alertKey = `intake_${intakeNum}_alert_sent_${currentYear}`;
        const { data: existing } = await supabase
            .from('system_settings').select('value').eq('key', alertKey).maybeSingle();
        if (existing?.value === true) return; // Sudah hantar tahun ini

        const { data: admins } = await supabase
            .from('profiles').select('id').in('role', ['SUPER_ADMIN_JPP', 'ADMIN']);
        if (admins && admins.length > 0) {
            await supabase.from('notifications').insert(
                admins.map(a => ({
                    user_id: a.id,
                    title:   `⚠️ Semak Konfigurasi Intake ${intakeNum} — 1 Bulan Lagi`,
                    message: `Pengambilan Pelajar Intake ${intakeNum} dijangka bermula dalam ±1 bulan. Sila semak dan kemaskini bulan mula pengambilan di Tetapan Utama JPP jika perlu.`,
                    type:    'SYSTEM',
                    is_read: false,
                }))
            );
        }
        await supabase.from('system_settings').upsert({ key: alertKey, value: true });
    };

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
                if (item.key === 'intake_1_month') setIntake1Month(Number(val) || 7);
                if (item.key === 'intake_2_month') setIntake2Month(Number(val) || 1);
            });
            setSettings(s);
            // Cek alert selepas data dimuatkan
            const m1 = Number(settingsData.find(i => i.key === 'intake_1_month')?.value) || 7;
            const m2 = Number(settingsData.find(i => i.key === 'intake_2_month')?.value) || 1;
            checkAndSendIntakeAlert(m1, m2);
        }
        setLoading(false);
    };

    const toggleSetting = async (key: string, currentValue: boolean) => {
        const newValue = !currentValue;
        const toastId = toast.loading('Mengemaskini...');
        try {
            const strVal = String(newValue);
            const { data, error } = await supabase.from('system_settings')
                .update({ value: strVal })
                .eq('key', key)
                .select();
            if (error) throw error;
            if (!data || data.length === 0) {
                const { error: insErr } = await supabase.from('system_settings').insert({ key, value: strVal });
                if (insErr) throw insErr;
            }
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

                        {/* Traditional Registration Toggle */}
                        {isSuperAdmin && (
                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-violet-900/10 to-violet-900/5 border border-violet-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 md:col-span-2 group hover:from-violet-900/20 transition-all">
                                <div className="flex items-center gap-4 w-full sm:w-auto flex-col sm:flex-row text-center sm:text-left">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-white">Traditional Registration (Emel & Kata Laluan)</p>
                                        <p className="text-xs text-violet-400/70 font-medium">Benarkan pendaftaran menggunakan emel dan kata laluan untuk pelajar. Tutup fungsi ini waktu orientasi untuk elak database overload.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <button
                                        onClick={() => toggleSetting('traditional_registration_enabled', settings.traditional_registration_enabled !== false)}
                                        className={cn(
                                            "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            settings.traditional_registration_enabled !== false ? "bg-violet-600" : "bg-white/10"
                                        )}
                                    >
                                        <span className={cn(
                                            "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                                            settings.traditional_registration_enabled !== false ? "translate-x-3" : "-translate-x-3"
                                        )} />
                                    </button>
                                </div>
                            </div>
                        )}

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

                {/* Konfigurasi Takwim Pengambilan — SUPER_ADMIN sahaja */}
                {isSuperAdmin && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <Calendar className="w-5 h-5 text-amber-500" />
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Konfigurasi Takwim Pengambilan</h3>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-amber-900/10 to-amber-900/5 border border-amber-500/20 space-y-6 md:col-span-2 group hover:from-amber-900/20 transition-all">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-base font-black text-white">Bulan Permulaan Intake</p>
                                    <p className="text-xs text-amber-400/70 font-medium mt-1">Tetapkan bulan mula setiap sesi pengambilan pelajar. Notifikasi semak sahaja akan dihantar kepada pentadbir sebulan sebelum tarikh ini.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Intake 1 */}
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white/50">Intake Pertama (Pertengahan Tahun)</p>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={intake1Month}
                                            onChange={e => setIntake1Month(Number(e.target.value))}
                                            className="flex-1 h-11 bg-black/40 border border-amber-500/20 rounded-xl text-sm text-white/80 font-bold px-3 focus:outline-none focus:border-amber-500/50"
                                        >
                                            {MONTH_NAMES.slice(1).map((m, i) => (
                                                <option key={i + 1} value={i + 1}>{m} ({i + 1})</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={async () => {
                                                setSavingIntake(true);
                                                try {
                                                    await supabase.from('system_settings').update({ value: intake1Month }).eq('key', 'intake_1_month');
                                                    toast.success(`Intake 1 dikemaskini: ${MONTH_NAMES[intake1Month]}`);
                                                } catch { toast.error('Gagal simpan.'); }
                                                finally { setSavingIntake(false); }
                                            }}
                                            disabled={savingIntake}
                                            className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white shadow transition-all whitespace-nowrap"
                                        >
                                            Simpan
                                        </button>
                                    </div>
                                </div>

                                {/* Intake 2 */}
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white/50">Intake Kedua (Awal Tahun)</p>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={intake2Month}
                                            onChange={e => setIntake2Month(Number(e.target.value))}
                                            className="flex-1 h-11 bg-black/40 border border-amber-500/20 rounded-xl text-sm text-white/80 font-bold px-3 focus:outline-none focus:border-amber-500/50"
                                        >
                                            {MONTH_NAMES.slice(1).map((m, i) => (
                                                <option key={i + 1} value={i + 1}>{m} ({i + 1})</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={async () => {
                                                setSavingIntake(true);
                                                try {
                                                    await supabase.from('system_settings').update({ value: intake2Month }).eq('key', 'intake_2_month');
                                                    toast.success(`Intake 2 dikemaskini: ${MONTH_NAMES[intake2Month]}`);
                                                } catch { toast.error('Gagal simpan.'); }
                                                finally { setSavingIntake(false); }
                                            }}
                                            disabled={savingIntake}
                                            className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white shadow transition-all whitespace-nowrap"
                                        >
                                            Simpan
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-amber-500/60 font-medium border-t border-amber-500/10 pt-4">
                                ⚠ Ubah nilai ini SEBELUM pengambilan baharu bermula. Sistem akan menghantar notifikasi kepada pentadbir secara automatik sebulan sebelum tarikh yang ditetapkan.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Struktur JPP & Majlis Tertinggi (Boleh diakses oleh Super Admin / YDP) */}
                {isYDP && (
                    <JppStructureSettings />
                )}

            </div>
        </div>
    );
}
