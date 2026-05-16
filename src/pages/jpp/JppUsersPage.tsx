import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Users, Search, Sparkles, ShieldCheck, FileText, ChevronDown, CheckCircle2, XCircle, GraduationCap, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getSemesterInfo } from '@/types';
import { logAuditAction } from '@/lib/auditLogger';

interface DuplicateGroup {
    matric_no: string;
    account_count: number;
    accounts: {
        id: string;
        full_name: string;
        email: string;
        role: string;
        department: string | null;
        created_at: string;
        last_sign_in: string | null;
        providers: string[];
        email_confirmed: boolean;
    }[];
}

export function JppUsersPage() {
    const { isSuperAdmin, profile } = useAuth();
    const isYDP = profile?.jpp_position === 'YANG_DIPERTUA' || profile?.jpp_position === 'YDP' || isSuperAdmin;

    const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [tierRequests, setTierRequests] = useState<any[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState<string>('all');  // all | Junior | Senior | Asasi
    const [filterProg, setFilterProg]   = useState<string>('all');  // all | programme code
    const [loading, setLoading] = useState(true);
    const [sm1, setSm1] = useState(7);
    const [sm2, setSm2] = useState(1);
    
    // Duplicate detection state
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [duplicateLoading, setDuplicateLoading] = useState(false);
    const [showDuplicates, setShowDuplicates] = useState(false);

    const isMTUser = ['YANG_DIPERTUA', 'NAIB_YANG_DIPERTUA', 'SETIAUSAHA_KEHORMAT', 'BENAHARI_KEHORMAT'].includes(profile?.jpp_position || '');

    useEffect(() => {
        supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
            .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        const { data: usersData } = await supabase.from('profiles').select('id, full_name, email, role, matric_no, programme_code, intake_year, intake_period, semester_override, subscription_tier, ai_token_balance, ai_tier_expiration, jpp_position, club_id').order('full_name', { ascending: true });
        setAllUsers(usersData || []);
        
        const { data: requestsData } = await supabase.from('ai_tier_requests').select('*, profiles(full_name)').order('created_at', { ascending: false });
        setTierRequests(requestsData || []);

        // Load intake config
        const { data: sysData } = await supabase.from('system_settings').select('key,value').in('key', ['intake_1_month', 'intake_2_month']);
        sysData?.forEach(r => {
            if (r.key === 'intake_1_month') setSm1(Number(r.value) || 7);
            if (r.key === 'intake_2_month') setSm2(Number(r.value) || 1);
        });
        
        setLoading(false);
    };

    const fetchDuplicates = async () => {
        setDuplicateLoading(true);
        try {
            const { data, error } = await supabase.rpc('detect_duplicate_matric_accounts');
            if (error) {
                toast.error('Gagal menyemak akaun berganda: ' + error.message);
                return;
            }
            setDuplicates((data || []) as DuplicateGroup[]);
            setShowDuplicates(true);
            if (!data || data.length === 0) {
                toast.success('Tiada akaun berganda dijumpai! 🎉');
            }
        } finally {
            setDuplicateLoading(false);
        }
    };

    const handleMergeAccounts = async (primaryId: string, secondaryId: string, primaryName: string, secondaryName: string, secondaryEmail: string) => {
        const confirmed = confirm(
            `⚠️ AMARAN: Tindakan ini TIDAK BOLEH diundur!\n\n` +
            `Akaun SECONDARY akan DIHAPUSKAN:\n` +
            `• ${secondaryName} (${secondaryEmail})\n\n` +
            `Semua data akan dipindahkan ke akaun PRIMARY:\n` +
            `• ${primaryName}\n\n` +
            `Termasuk: keahlian kelab, merit, tugasan, notifikasi, & token AI.\n\n` +
            `Teruskan?`
        );
        if (!confirmed) return;
        
        try {
            const { data, error } = await supabase.rpc('admin_merge_duplicate_accounts', {
                p_primary_id: primaryId,
                p_secondary_id: secondaryId,
            });
            if (error) {
                toast.error('Gagal menggabungkan akaun: ' + error.message);
                return;
            }
            toast.success(data?.message || 'Akaun berjaya digabungkan!');
            logAuditAction({
                actionType: 'ACCOUNT_MERGED',
                module: 'JPP Admin',
                entityId: primaryId,
                description: `Merged ${secondaryName} (${secondaryEmail}) → ${primaryName}`,
                actorId: profile!.id,
                metadata: { secondary_id: secondaryId }
            });
            // Refresh data
            fetchDuplicates();
            fetchAdminData();
        } catch (err: any) {
            toast.error(err.message || 'Ralat tidak dijangka.');
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    const handleTierApprove = async (requestId: string, userId: string, newTier: string, receipt_url: string | null) => {
        if (!confirm('Adakah anda pasti untuk menaik taraf pengguna ini?')) return;
        const { error: rpcError } = await supabase.rpc('update_user_ai_tier', { target_user_id: userId, new_tier: newTier });
        if (rpcError) {
            toast.error("Gagal kemaskini tier");
            return;
        }
        await supabase.from('ai_tier_requests').update({ status: 'APPROVED' }).eq('id', requestId);
        toast.success(`Berjaya dinaik taraf ke tier ${newTier.toUpperCase()}`);
        logAuditAction({ actionType: 'AI_TIER_APPROVED', module: 'JPP Admin', entityId: userId, description: `Tier AI diluluskan ke ${newTier.toUpperCase()}`, actorId: profile!.id, metadata: { new_tier: newTier, receipt_url } });
        if(receipt_url) {
            await supabase.from('club_logs').insert([{
                user_id: profile?.id,
                action: 'AI_TIER_APPROVED',
                details: `Approved tier '${newTier}' for user ${userId}. Receipt: ${receipt_url}`
            }]);
        }
        fetchAdminData();
    };

    const handleTierReject = async (requestId: string, receipt_url: string | null, userId: string) => {
        if (!confirm('Tolak permohonan ini?')) return;
        await supabase.from('ai_tier_requests').update({ status: 'REJECTED' }).eq('id', requestId);
        toast.success("Permohonan ditolak");
        logAuditAction({ actionType: 'AI_TIER_REJECTED', module: 'JPP Admin', entityId: userId, description: `Permohonan tier AI ditolak`, actorId: profile!.id, metadata: { receipt_url } });
        if(receipt_url) {
            await supabase.from('club_logs').insert([{
                user_id: profile?.id,
                action: 'AI_TIER_REJECTED',
                details: `Rejected tier request for user ${userId}. Receipt: ${receipt_url}`
            }]);
        }
        fetchAdminData();
    };

    const handleViewReceipt = (url: string | null) => {
        if (!url) return;
        window.open(url, '_blank');
    };

    const uniqueProgs = [...new Set(allUsers.map(u => u.programme_code).filter(Boolean))].sort();

    const getUserCohort = (u: any) => {
        const isStaff = ['STAFF', 'SUPER_ADMIN_JPP', 'ADMIN'].includes(u.role);
        if (isStaff || !u.intake_year || !u.intake_period) return null;
        return getSemesterInfo(
            u.intake_year, u.intake_period as 1|2,
            u.programme_code === 'FTV',
            sm1, sm2, u.semester_override
        );
    };

    const filteredUsers = allUsers.filter(u => {
        const matchSearch = (u.full_name?.toLowerCase() || '').includes(userSearch.toLowerCase()) || 
            (u.email?.toLowerCase() || '').includes(userSearch.toLowerCase()) ||
            (u.matric_no?.toLowerCase() || '').includes(userSearch.toLowerCase());
        if (!matchSearch) return false;

        if (filterProg !== 'all' && u.programme_code !== filterProg) return false;

        if (filterLevel !== 'all') {
            const cohort = getUserCohort(u);
            if (!cohort || cohort.level !== filterLevel) return false;
        }
        return true;
    });

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute -top-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-5"
                    style={{ background: themeColor }} />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-10">
                
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: hexToRgba(themeColor, 0.15), border: `1px solid ${hexToRgba(themeColor, 0.25)}` }}>
                            <Users className="w-5 h-5" style={{ color: themeColor }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white leading-tight">Pangkalan Data Pelajar</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Urus pengguna dan konfigurasi Nexus Hub</p>
                        </div>
                    </div>
                </motion.div>

                {/* Tier Requests (PRO Applications) */}
                {(isMTUser || isSuperAdmin) && tierRequests.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                        <div className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.02] p-6 lg:p-8 relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-6 border-b border-white/[0.06] pb-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Permohonan Pelan PRO</h3>
                                    <p className="text-[11px] text-white/40 mt-1 max-w-xl">Hanya permohonan aktif dikesan. Pelan yang telah diproses (Lulus/Tolak) akan disembunyikan secara automatik selepas 24 jam.</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tierRequests.filter(req => {
                                    if (req.status === 'PENDING') return true;
                                    const updatedAt = req.updated_at ? new Date(req.updated_at) : new Date(req.created_at);
                                    let isRecent = (new Date().getTime() - updatedAt.getTime()) < 24 * 60 * 60 * 1000;
                                    return isRecent;
                                }).map(req => (
                                    <div key={req.id} className="p-5 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-sm font-black text-white">{req.profiles?.full_name || 'Pelajar'}</p>
                                                <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">{format(new Date(req.created_at), 'dd MMM yyyy, h:mm a')}</p>
                                            </div>
                                            <div className={cn(
                                                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                req.status === 'PENDING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                req.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                            )}>
                                                {req.status}
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 mb-4 space-y-2">
                                            <div>
                                                <span className="text-[10px] uppercase font-black tracking-widest text-white/30 block mb-1">Justifikasi</span>
                                                <p className="text-[11px] text-white/70 italic">&quot;{req.reason}&quot;</p>
                                            </div>
                                            
                                            {req.receipt_url && (
                                                <div className="pt-3 mt-3 border-t border-white/5">
                                                    <button onClick={() => handleViewReceipt(req.receipt_url)} className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors w-full justify-center">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] uppercase font-black tracking-widest">Papar Resit</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {req.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleTierApprove(req.id, req.user_id, 'pro', req.receipt_url)} className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-400 transition-colors">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Luluskan</span>
                                                </button>
                                                <button onClick={() => handleTierReject(req.id, req.receipt_url, req.user_id)} className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors">
                                                    <XCircle className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Tolak</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Duplicate Account Detection Panel */}
                {(isMTUser || isSuperAdmin) && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
                        <div className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.02] p-6 lg:p-8 relative overflow-hidden">
                            {/* Subtle warning glow */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-5 bg-amber-500 pointer-events-none" />
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.06] pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">Pengesanan Akaun Berganda</h3>
                                        <p className="text-[11px] text-white/40 mt-1 max-w-xl">
                                            Imbas pangkalan data untuk mengesan pelajar yang mempunyai lebih dari satu akaun menggunakan no matrik yang sama.
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={fetchDuplicates}
                                    disabled={duplicateLoading}
                                    className="px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                                >
                                    {duplicateLoading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                                            Mengimbas...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-3.5 h-3.5" />
                                            {showDuplicates ? 'Imbas Semula' : 'Imbas Sekarang'}
                                        </>
                                    )}
                                </button>
                            </div>

                            <AnimatePresence>
                                {showDuplicates && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        {duplicates.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                                                </div>
                                                <p className="text-sm font-bold text-emerald-400">Semua Bersih!</p>
                                                <p className="text-[11px] text-white/40 max-w-xs">Tiada akaun berganda dikesan. Setiap no matrik hanya wujud dalam satu akaun sahaja.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Summary badge */}
                                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/8 border border-rose-500/20">
                                                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                                    <p className="text-[11px] text-rose-400 font-bold">
                                                        {duplicates.length} no matrik dengan akaun berganda dikesan ({duplicates.reduce((sum, d) => sum + d.account_count, 0)} akaun keseluruhan)
                                                    </p>
                                                </div>

                                                {/* Duplicate groups */}
                                                <div className="grid gap-3">
                                                    {duplicates.map((group) => {
                                                        // Tentukan PRIMARY = akaun dengan last_sign_in paling terkini
                                                        // (bukan akaun paling lama) — sbb tu yang student ingat
                                                        const primaryIdx = group.accounts.reduce((bestIdx, acc, idx) => {
                                                            const bestLogin = group.accounts[bestIdx].last_sign_in;
                                                            const currLogin = acc.last_sign_in;
                                                            if (!currLogin) return bestIdx;
                                                            if (!bestLogin) return idx;
                                                            return new Date(currLogin) > new Date(bestLogin) ? idx : bestIdx;
                                                        }, 0);
                                                        const primaryAcc = group.accounts[primaryIdx];

                                                        return (
                                                        <div key={group.matric_no} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                                                            {/* Group header */}
                                                            <div className="px-5 py-4 bg-white/[0.02] border-b border-white/[0.04] flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/25">
                                                                        <span className="text-[11px] font-black text-rose-400 tracking-wider font-mono">{group.matric_no}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                                                        {group.account_count} akaun
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Accounts list */}
                                                            <div className="divide-y divide-white/[0.03]">
                                                                {group.accounts.map((acc, idx) => {
                                                                    const isPrimary = idx === primaryIdx;
                                                                    return (
                                                                    <div key={acc.id} className={cn("px-5 py-4 transition-colors", isPrimary ? "bg-emerald-500/[0.03]" : "hover:bg-white/[0.02]")}>
                                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="text-sm font-bold text-white">{acc.full_name || 'Tanpa Nama'}</span>
                                                                                    {isPrimary && (
                                                                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                                                            ★ Kekal (Login Terkini)
                                                                                        </span>
                                                                                    )}
                                                                                    {!isPrimary && (
                                                                                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase tracking-widest border border-rose-500/20">
                                                                                            Duplikat
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                                                    <span className="text-[11px] text-white/50 flex items-center gap-1">
                                                                                        📧 {acc.email}
                                                                                    </span>
                                                                                    <span className="text-[10px] text-white/30">
                                                                                        {acc.providers?.join(', ') || 'email'}
                                                                                    </span>
                                                                                    {acc.email_confirmed ? (
                                                                                        <span className="text-[9px] text-emerald-400 font-bold">✓ Disahkan</span>
                                                                                    ) : (
                                                                                        <span className="text-[9px] text-amber-400 font-bold">⚠ Belum Sah</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/25">
                                                                                    <span>Daftar: {format(new Date(acc.created_at), 'dd MMM yyyy, h:mm a')}</span>
                                                                                    <span className={isPrimary ? "text-emerald-400/60 font-bold" : ""}>
                                                                                        Log masuk terakhir: {acc.last_sign_in ? format(new Date(acc.last_sign_in), 'dd MMM yyyy, h:mm a') : 'Tiada rekod'}
                                                                                    </span>
                                                                                    {acc.department && <span>Jabatan: {acc.department}</span>}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <span className={cn(
                                                                                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                                                                                    acc.role === 'SUPER_ADMIN_JPP' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                                                    acc.role === 'JPP' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                                                    "bg-white/5 text-white/40 border-white/10"
                                                                                )}>
                                                                                    {acc.role}
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        navigator.clipboard.writeText(acc.id);
                                                                                        toast.success('UUID disalin!');
                                                                                    }}
                                                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                                                                                    title="Salin UUID"
                                                                                >
                                                                                    <Copy className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                {/* Merge button — hanya untuk akaun DUPLIKAT dan hanya SUPER_ADMIN */}
                                                                                {!isPrimary && isSuperAdmin && (
                                                                                    <button
                                                                                        onClick={() => handleMergeAccounts(
                                                                                            primaryAcc.id,
                                                                                            acc.id,
                                                                                            primaryAcc.full_name,
                                                                                            acc.full_name,
                                                                                            acc.email
                                                                                        )}
                                                                                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-400 transition-colors flex items-center gap-1.5"
                                                                                        title={`Gabung data dari akaun ini ke ${primaryAcc.full_name} (login terkini)`}
                                                                                    >
                                                                                        <ExternalLink className="w-3 h-3" />
                                                                                        Gabung ke Aktif
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {/* User Table */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                    <div className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.02] p-6 lg:p-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-white">Direktori Pengguna</h3>
                                <p className="text-[11px] text-white/40 uppercase tracking-widest mt-1">Sistem berdaftar keseluruhan — {filteredUsers.length} rekod</p>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="text" placeholder="Cari emel, nama, atau no matrik..."
                                        value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                        className="pl-10 pr-4 h-11 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all font-medium w-48"
                                    />
                                </div>
                                {/* Tahap filter */}
                                <select
                                    value={filterLevel}
                                    onChange={e => setFilterLevel(e.target.value)}
                                    className="h-11 bg-white/5 border border-white/10 rounded-2xl text-xs text-white/70 font-bold px-3 focus:outline-none focus:border-white/30 transition-all"
                                >
                                    <option value="all">Semua Tahap</option>
                                    <option value="Junior">Junior</option>
                                    <option value="Senior">Senior</option>
                                    <option value="Asasi">Asasi</option>
                                </select>
                                {/* Program filter */}
                                <select
                                    value={filterProg}
                                    onChange={e => setFilterProg(e.target.value)}
                                    className="h-11 bg-white/5 border border-white/10 rounded-2xl text-xs text-white/70 font-bold px-3 focus:outline-none focus:border-white/30 transition-all"
                                >
                                    <option value="all">Semua Program</option>
                                    {uniqueProgs.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-white/[0.05] bg-black/20">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-white/[0.05]">
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Pengguna</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Kohort</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Tier AI</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Baki Token</th>
                                        {(isMTUser || isSuperAdmin) && <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Tindakan</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30 text-xs">Memuatkan data...</td></tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30 text-xs">Tiada pengguna dijumpai.</td></tr>
                                    ) : (
                                        filteredUsers.slice(0, 100).map((u) => {
                                            const cohort = getUserCohort(u);
                                            return (
                                            <tr key={u.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="font-bold text-sm text-white/90">{u.full_name || 'Pelajar'}</div>
                                                    <div className="text-[11px] text-white/40">{u.email}</div>
                                                    <div className="text-[10px] text-white/25 mt-0.5">{u.matric_no || ''}</div>
                                                </td>
                                                {/* Kohort column */}
                                                <td className="px-5 py-3.5">
                                                    {cohort ? (
                                                        <div className="space-y-1">
                                                            <div className={cn(
                                                                'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border inline-block',
                                                                cohort.level === 'Senior'  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                                cohort.level === 'Junior'  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                                                                            'bg-violet-500/10 text-violet-400 border-violet-500/30'
                                                            )}>
                                                                {cohort.level} • Sem {cohort.semester}
                                                            </div>
                                                            {u.programme_code && (
                                                                <div className="text-[9px] text-white/30 font-bold">{u.programme_code}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-white/20">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <div className={cn(
                                                            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                                                            u.subscription_tier?.toLowerCase() === 'pro' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" : "bg-white/5 text-white/40 border-white/10"
                                                        )}>
                                                            {u.subscription_tier || 'FREE'}
                                                        </div>
                                                        {u.subscription_tier?.toLowerCase() === 'pro' && u.ai_tier_expiration && (
                                                            <span className="text-[9px] text-white/30 uppercase tracking-widest">
                                                                {(() => {
                                                                    const diff = Math.ceil((new Date(u.ai_tier_expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                                    if (diff < 0) return <span className="text-rose-400">Luput</span>;
                                                                    return `${diff} Hari`;
                                                                })()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="font-mono text-sm text-white/80">
                                                        {u.ai_token_balance || 0}
                                                        <span className="text-[9px] text-white/30 ml-1">Tk</span>
                                                    </div>
                                                </td>
                                                {(isMTUser || isSuperAdmin) && (
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {u.role !== 'SUPER_ADMIN_JPP' && isYDP && (
                                                                <button 
                                                                    onClick={async () => {
                                                                        if(confirm(u.role === 'JPP' ? `Turunkan pengguna dari JPP ke AHLI biasa?` : `Lantik secara terus sebagai JPP?`)) {
                                                                            const { error } = await supabase.rpc('toggle_jpp_role', { p_target_id: u.id });
                                                                            if (error) { toast.error(error.message); return; }
                                                                            toast.success(`Peranan dikemaskini.`);
                                                                            logAuditAction({ actionType: u.role === 'JPP' ? 'JPP_ROLE_REMOVED' : 'JPP_ROLE_ASSIGNED', module: 'JPP Admin', entityId: u.id, description: `${u.full_name}: ${u.role === 'JPP' ? 'Diturunkan dari JPP' : 'Dilantik sebagai JPP'}`, actorId: profile!.id });
                                                                            fetchAdminData();
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors",
                                                                        u.role === 'JPP' 
                                                                        ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" 
                                                                        : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                                                                    )}
                                                                >
                                                                    {u.role === 'JPP' ? 'Buang JPP' : 'Lantik JPP'}
                                                                </button>
                                                            )}
                                                            {u.subscription_tier?.toLowerCase() !== 'pro' ? (
                                                                <button 
                                                                    onClick={async () => {
                                                                        if(confirm(`Naik taraf ke PRO?`)) {
                                                                            await supabase.rpc('update_user_ai_tier', { target_user_id: u.id, new_tier: 'pro' });
                                                                            fetchAdminData();
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                                                                >
                                                                    PRO
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={async () => {
                                                                        if(confirm(`Turun taraf ke FREE?`)) {
                                                                            await supabase.rpc('update_user_ai_tier', { target_user_id: u.id, new_tier: 'free' });
                                                                            fetchAdminData();
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/10 text-white/60 hover:bg-white/20 transition-colors border border-white/5"
                                                                >
                                                                    FREE
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {filteredUsers.length > 100 && userSearch === '' && (
                            <p className="text-center text-[10px] uppercase tracking-widest text-white/30 mt-4">Memaparkan 100 rekod teratas</p>
                        )}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
