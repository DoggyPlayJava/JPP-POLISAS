import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, ShieldCheck, KeyRound, Calendar, QrCode, ClipboardList, Loader2 } from 'lucide-react';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba, cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { JppStructureSettings } from './JppStructureSettings';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { QrLinkManager } from '@/components/jpp/QrLinkManager';
import { PromptDialog } from '@/components/ui/PromptDialog';
import { useTranslation } from 'react-i18next';

const MONTH_NAMES_MS = ['', 'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
const MONTH_NAMES_EN = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function JppSettingsPage() {
    const { t, i18n } = useTranslation(['jpp', 'common']);
    const { isSuperAdmin, profile, isJppMember } = useAuth();
    const isYDP = profile?.jpp_position === 'YANG_DIPERTUA' || profile?.jpp_position === 'YDP' || isSuperAdmin;
    const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
    const [loading, setLoading] = useState(true);
    const [intake1Month, setIntake1Month] = useState(7);
    const [intake2Month, setIntake2Month] = useState(1);
    const [savingIntake, setSavingIntake] = useState(false);
    
    const monthNames = i18n.language.startsWith('en') ? MONTH_NAMES_EN : MONTH_NAMES_MS;

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
                    title:   t('jpp:settings_intake_alert_title', '⚠️ Semak Konfigurasi Intake {{num}} — 1 Bulan Lagi', { num: intakeNum }),
                    message: t('jpp:settings_intake_alert_message', 'Pengambilan Pelajar Intake {{num}} dijangka bermula dalam ±1 bulan. Sila semak dan kemaskini bulan mula pengambilan di Tetapan Utama JPP jika perlu.', { num: intakeNum }),
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
                if (val === 'string' && val.startsWith('"') && val.endsWith('"')) { val = val.slice(1, -1); }
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
        const toastId = toast.loading(t('jpp:settings_updating', 'Mengemaskini...'));
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
            toast.success(t('jpp:settings_adjusted_success', 'Berjaya dilaras.'), { id: toastId });
        } catch (e: any) {
            toast.error(e.message, { id: toastId });
        }
    };

    const [isStaffCodeModalOpen, setIsStaffCodeModalOpen] = useState(false);
    const [savingStaffCode, setSavingStaffCode] = useState(false);

    const handleConfirmStaffCode = async (input: string) => {
        const newCode = input.trim().toUpperCase();
        if (newCode.length < 5) {
            toast.error(t('jpp:settings_code_min_length', 'Kod baharu mestilah sekurang-kurangnya 5 aksara.'));
            return;
        }

        setSavingStaffCode(true);
        const toastId = toast.loading(t('jpp:settings_updating_staff_code', 'Mengemaskini kod staf...'));
        try {
            const { data, error } = await supabase.from('system_settings').update({ value: JSON.stringify(newCode) }).eq('key', 'staff_registration_code').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'staff_registration_code', value: JSON.stringify(newCode) });
            
            setSettings(s => ({ ...s, staff_registration_code: newCode }));
            toast.success(t('jpp:settings_staff_code_updated', 'Kod pendaftaran staf berjaya dikemaskini. Kod baharu: {{code}}', { code: newCode }), { id: toastId });
            setIsStaffCodeModalOpen(false);
        } catch (e: any) {
            toast.error(e.message || t('jpp:settings_staff_code_failed', 'Gagal kemaskini kod staf'), { id: toastId });
        } finally {
            setSavingStaffCode(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full py-8 px-4 sm:px-8 text-slate-900 dark:text-white transition-colors">
                <div className="max-w-4xl mx-auto space-y-10 animate-pulse">
                    {/* Header Skeleton */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/10" />
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded-lg" />
                            <div className="h-3 w-64 bg-slate-200/70 dark:bg-white/5 rounded-md" />
                        </div>
                    </div>

                    {/* Section 1 Skeleton */}
                    <div className="space-y-4">
                        <div className="h-4 w-36 bg-slate-200/70 dark:bg-white/5 rounded-md" />
                        <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1C261D]/60 border border-slate-200 dark:border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/10" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded-md" />
                                        <div className="h-3 w-72 bg-slate-200/60 dark:bg-white/5 rounded-md" />
                                    </div>
                                </div>
                                <div className="w-14 h-8 bg-slate-200 dark:bg-white/10 rounded-full" />
                            </div>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1C261D]/60 border border-slate-200 dark:border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/10" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded-md" />
                                        <div className="h-3 w-60 bg-slate-200/60 dark:bg-white/5 rounded-md" />
                                    </div>
                                </div>
                                <div className="h-10 w-28 bg-slate-200 dark:bg-white/10 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full py-8 px-4 sm:px-8 text-slate-900 dark:text-white transition-colors">
            <div className="relative z-10 max-w-4xl mx-auto space-y-10">
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ background: hexToRgba(themeColor, 0.1), borderColor: hexToRgba(themeColor, 0.2), color: themeColor }}>
                            <SettingsIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{t('jpp:settings_title', 'Tetapan Utama JPP')}</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mt-1">{t('jpp:settings_subtitle', 'Konfigurasi & parameter global portal')}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">{t('jpp:settings_system_access', 'Ketetapan Sistem & Akses')}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tetapan KPP telah dipindahkan ke Dashboard KPP (Laporan PDF, Had Keahlian, Takwim) */}

                        {/* Traditional Registration Toggle */}
                        {isSuperAdmin && (
                            <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1C261D] border border-slate-200 dark:border-[#3A4A3B] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6 md:col-span-2 group hover:border-slate-300 dark:hover:border-[#4A5E4B] transition-all">
                                <div className="flex items-center gap-4 w-full sm:w-auto flex-col sm:flex-row text-center sm:text-left">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-slate-900 dark:text-white">{t('jpp:settings_trad_reg_title', 'Traditional Registration (Emel & Kata Laluan)')}</p>
                                        <p className="text-xs text-slate-500 dark:text-white/60 font-medium">{t('jpp:settings_trad_reg_desc', 'Benarkan pendaftaran menggunakan emel dan kata laluan untuk pelajar. Tutup fungsi ini waktu orientasi untuk elak database overload.')}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <button
                                        onClick={() => toggleSetting('traditional_registration_enabled', settings.traditional_registration_enabled !== false)}
                                        className={cn(
                                            "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95",
                                            settings.traditional_registration_enabled !== false ? "bg-emerald-600" : "bg-slate-200 dark:bg-white/10"
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
                            <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1C261D] border border-slate-200 dark:border-[#3A4A3B] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6 md:col-span-2 group hover:border-slate-300 dark:hover:border-[#4A5E4B] transition-all">
                                <div className="flex items-center gap-4 w-full sm:w-auto flex-col sm:flex-row text-center sm:text-left">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-slate-900 dark:text-white">{t('jpp:settings_staff_code_title', 'Kod Pendaftaran Staf')}</p>
                                        <p className="text-xs text-slate-500 dark:text-white/60 font-medium">{t('jpp:settings_staff_code_desc', 'Kod rahsia yang digunakan semasa pendaftaran staf/pensyarah.')}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <div className="bg-slate-100 dark:bg-black/30 px-4 py-3 rounded-xl font-mono text-sm font-bold text-rose-600 dark:text-rose-300 border border-slate-200 dark:border-rose-500/20 tabular-nums">
                                        {settings.staff_registration_code || '••••••••'}
                                    </div>
                                    <button onClick={() => setIsStaffCodeModalOpen(true)} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-sm transition-all w-full sm:w-auto">
                                        {t('jpp:settings_staff_code_change_btn', 'Tukar Kod')}
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
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">{t('jpp:settings_intake_config_title', 'Konfigurasi Takwim Pengambilan')}</h3>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1C261D] border border-slate-200 dark:border-[#3A4A3B] shadow-2xs space-y-6 md:col-span-2 group hover:border-slate-300 dark:hover:border-[#4A5E4B] transition-all">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-base font-black text-slate-900 dark:text-white">{t('jpp:settings_intake_start_month', 'Bulan Permulaan Intake')}</p>
                                    <p className="text-xs text-slate-500 dark:text-white/60 font-medium mt-1">{t('jpp:settings_intake_start_month_desc', 'Tetapkan bulan mula setiap sesi pengambilan pelajar. Notifikasi semak sahaja akan dihantar kepada pentadbir sebulan sebelum tarikh ini.')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Intake 1 */}
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50">{t('jpp:settings_intake_1_label', 'Intake Pertama (Pertengahan Tahun)')}</p>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={intake1Month}
                                            onChange={e => setIntake1Month(Number(e.target.value))}
                                            className="flex-1 h-11 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white/90 font-bold px-3 focus:outline-none focus:border-amber-500/50"
                                        >
                                            {monthNames.slice(1).map((m, i) => (
                                                <option key={i + 1} value={i + 1} className="bg-white dark:bg-[#151D16] text-slate-900 dark:text-white">{m} ({i + 1})</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={async () => {
                                                setSavingIntake(true);
                                                try {
                                                    const { error } = await supabase.from('system_settings').upsert({ key: 'intake_1_month', value: intake1Month }, { onConflict: 'key' });
                                                    if (error) throw error;
                                                    toast.success(t('jpp:settings_intake_1_updated', 'Intake 1 dikemaskini: {{month}}', { month: monthNames[intake1Month] }));
                                                } catch { toast.error(t('jpp:settings_save_failed', 'Gagal simpan.')); }
                                                finally { setSavingIntake(false); }
                                            }}
                                            disabled={savingIntake}
                                            className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-2xs transition-all whitespace-nowrap"
                                        >
                                            {t('jpp:settings_save_btn', 'Simpan')}
                                        </button>
                                    </div>
                                </div>

                                {/* Intake 2 */}
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50">{t('jpp:settings_intake_2_label', 'Intake Kedua (Awal Tahun)')}</p>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={intake2Month}
                                            onChange={e => setIntake2Month(Number(e.target.value))}
                                            className="flex-1 h-11 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white/90 font-bold px-3 focus:outline-none focus:border-amber-500/50"
                                        >
                                            {monthNames.slice(1).map((m, i) => (
                                                <option key={i + 1} value={i + 1} className="bg-white dark:bg-[#151D16] text-slate-900 dark:text-white">{m} ({i + 1})</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={async () => {
                                                setSavingIntake(true);
                                                try {
                                                    const { error } = await supabase.from('system_settings').upsert({ key: 'intake_2_month', value: intake2Month }, { onConflict: 'key' });
                                                    if (error) throw error;
                                                    toast.success(t('jpp:settings_intake_2_updated', 'Intake 2 dikemaskini: {{month}}', { month: monthNames[intake2Month] }));
                                                } catch { toast.error(t('jpp:settings_save_failed', 'Gagal simpan.')); }
                                                finally { setSavingIntake(false); }
                                            }}
                                            disabled={savingIntake}
                                            className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-2xs transition-all whitespace-nowrap"
                                        >
                                            {t('jpp:settings_save_btn', 'Simpan')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium border-t border-slate-200 dark:border-white/10 pt-4">
                                {t('jpp:settings_intake_notice_warning', '⚠ Ubah nilai ini SEBELUM pengambilan baharu bermula. Sistem akan menghantar notifikasi kepada pentadbir secara automatik sebulan sebelum tarikh yang ditetapkan.')}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ── Penjana QR Code — Semua ahli JPP boleh guna ── */}
                {isJppMember && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <QrCode className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">{t('jpp:settings_qr_generator_title', 'Penjana QR Link')}</h3>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1C261D] border border-slate-200 dark:border-[#3A4A3B] shadow-2xs hover:border-slate-300 dark:hover:border-[#4A5E4B] transition-all">
                            <QrLinkManager showHeader={false} />
                        </div>
                    </motion.div>
                )}


                {/* Struktur JPP & Majlis Tertinggi (Boleh diakses oleh Super Admin / YDP) */}
                {isYDP && (
                    <JppStructureSettings />
                )}

            </div>

            <PromptDialog
                open={isStaffCodeModalOpen}
                onOpenChange={setIsStaffCodeModalOpen}
                title={t('jpp:settings_staff_modal_title', 'Tukar Kod Pendaftaran Staf')}
                description={t('jpp:settings_staff_modal_desc', 'PENTING: Kod ini wajib dirahsiakan. Sentiasa gunakan huruf besar (Uppercase) tanpa jarak, minimum 5 aksara.')}
                inputLabel={t('jpp:settings_staff_modal_input_label', 'Kod Pendaftaran Baharu')}
                placeholder="cth: POLISAS2026"
                initialValue={settings.staff_registration_code || ''}
                confirmLabel={t('jpp:settings_staff_modal_confirm', 'Simpan Kod')}
                cancelLabel={t('common:cancel', 'Batal')}
                variant="destructive"
                isLoading={savingStaffCode}
                onConfirm={handleConfirmStaffCode}
            />
        </div>
    );
}
