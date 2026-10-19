import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Users, Search, Sparkles, ShieldCheck, FileText, ChevronDown, CheckCircle2, XCircle, GraduationCap, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
    const { t } = useTranslation(['jpp', 'common']);
    const { isSuperAdmin, profile } = useAuth();
    const isYDP = profile?.jpp_position === 'YANG_DIPERTUA' || profile?.jpp_position === 'YDP' || isSuperAdmin;

    const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [tierRequests, setTierRequests] = useState<any[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState<string>('all');  // all | Junior | Senior | Asasi
    const [filterProg, setFilterProg]   = useState<string>('all');  // all | programme code
    const [loading, setLoading] = useState(true);
    const [userCount, setUserCount] = useState(0);
    const [allProgs, setAllProgs] = useState<string[]>([]);
    const [sm1, setSm1] = useState(7);
    const [sm2, setSm2] = useState(1);
    
    // Duplicate detection state
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [duplicateLoading, setDuplicateLoading] = useState(false);
    const [showDuplicates, setShowDuplicates] = useState(false);

    // Confirm dialog targets
    const [mergeTarget, setMergeTarget] = useState<{
        primaryId: string;
        secondaryId: string;
        primaryName: string;
        secondaryName: string;
        secondaryEmail: string;
    } | null>(null);
    const [merging, setMerging] = useState(false);

    const [tierApproveTarget, setTierApproveTarget] = useState<{
        requestId: string;
        userId: string;
        newTier: string;
        receipt_url?: string;
    } | null>(null);

    const [tierRejectTarget, setTierRejectTarget] = useState<{
        requestId: string;
        receipt_url?: string;
        userId: string;
    } | null>(null);

    const [roleToggleTarget, setRoleToggleTarget] = useState<{
        id: string;
        name: string;
        currentRole: string;
    } | null>(null);

    const [tierToggleTarget, setTierToggleTarget] = useState<{
        id: string;
        name: string;
        newTier: string;
    } | null>(null);

    const handleMergeAccounts = (
        primaryId: string,
        secondaryId: string,
        primaryName: string,
        secondaryName: string,
        secondaryEmail: string
    ) => {
        setMergeTarget({ primaryId, secondaryId, primaryName, secondaryName, secondaryEmail });
    };

    const isMTUser = ['YANG_DIPERTUA', 'NAIB_YANG_DIPERTUA', 'SETIAUSAHA_KEHORMAT', 'BENAHARI_KEHORMAT'].includes(profile?.jpp_position || '');

    useEffect(() => {
        supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
            .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
    }, []);

    const fetchUsers = async (search: string, prog: string) => {
        setLoading(true);
        let query = supabase
            .from('profiles')
            .select('id, full_name, email, role, matric_no, programme_code, intake_year, intake_period, semester_override, subscription_tier, ai_token_balance, ai_tier_expiration, jpp_position, club_id');

        if (search) {
            // Server-side ilike search — no limit issue
            const s = search.replace(/%/g, '\\%').replace(/_/g, '\\_'); // escape LIKE wildcards
            query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,matric_no.ilike.%${s}%`);
        }
        if (prog !== 'all') {
            query = query.eq('programme_code', prog);
        }

        const { data: usersData } = await query.order('full_name', { ascending: true }).limit(200);
        setAllUsers(usersData || []);
        setLoading(false);
    };

    const fetchAdminData = async () => {
        setLoading(true);

        // Total user count — no limit issue
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        setUserCount(count || 0);

        // Distinct programmes for filter dropdown — no limit issue
        const { data: progData } = await supabase.from('profiles').select('programme_code').not('programme_code', 'is', null).order('programme_code').limit(5000);
        setAllProgs([...new Set((progData || []).map(p => p.programme_code as string))].sort());

        // AI tier requests
        const { data: requestsData } = await supabase.from('ai_tier_requests').select('*, profiles(full_name)').order('created_at', { ascending: false });
        setTierRequests(requestsData || []);

        // Load intake config
        const { data: sysData } = await supabase.from('system_settings').select('key,value').in('key', ['intake_1_month', 'intake_2_month']);
        sysData?.forEach(r => {
            if (r.key === 'intake_1_month') setSm1(Number(r.value) || 7);
            if (r.key === 'intake_2_month') setSm2(Number(r.value) || 1);
        });

        // Initial user fetch
        await fetchUsers('', 'all');
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

    const executeMergeAccounts = async () => {
        if (!mergeTarget) return;
        const { primaryId, secondaryId, primaryName, secondaryName, secondaryEmail } = mergeTarget;
        setMerging(true);
        try {
            const { data, error } = await supabase.rpc('admin_merge_duplicate_accounts', {
                p_primary_id: primaryId,
                p_secondary_id: secondaryId,
            });
            if (error) {
                toast.error('Gagal menggabungkan akaun: ' + error.message);
                return;
            }
            toast.success(data?.message || 'Akaun berjaya digabungkan.');
            logAuditAction({
                actionType: 'ACCOUNT_MERGED',
                module: 'JPP Admin',
                entityId: primaryId,
                description: `Merged ${secondaryName} (${secondaryEmail}) → ${primaryName}`,
                actorId: profile!.id,
                metadata: { secondary_id: secondaryId }
            });
            setMergeTarget(null);
            fetchDuplicates();
            fetchUsers(userSearch, filterProg);
            fetchAdminData();
        } catch (err: any) {
            toast.error(err.message || 'Ralat tidak dijangka.');
        } finally {
            setMerging(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    // Re-fetch users when search or programme filter changes (server-side)
    useEffect(() => {
        if (userSearch !== undefined) {
            fetchUsers(userSearch, filterProg);
        }
    }, [userSearch, filterProg]);

    const executeTierApprove = async () => {
        if (!tierApproveTarget) return;
        const { requestId, userId, newTier, receipt_url } = tierApproveTarget;
        const { error: rpcError } = await supabase.rpc('update_user_ai_tier', { target_user_id: userId, new_tier: newTier });
        if (rpcError) {
            toast.error("Gagal kemaskini tier.");
            return;
        }
        await supabase.from('ai_tier_requests').update({ status: 'APPROVED' }).eq('id', requestId);
        toast.success(`Berjaya dinaik taraf ke tier ${newTier.toUpperCase()}.`);
        logAuditAction({ actionType: 'AI_TIER_APPROVED', module: 'JPP Admin', entityId: userId, description: `Tier AI diluluskan ke ${newTier.toUpperCase()}`, actorId: profile!.id, metadata: { new_tier: newTier, receipt_url } });
        if (receipt_url) {
            await supabase.from('club_logs').insert([{
                user_id: profile?.id,
                action: 'AI_TIER_APPROVED',
                details: `Approved tier '${newTier}' for user ${userId}. Receipt: ${receipt_url}`
            }]);
        }
        setTierApproveTarget(null);
        fetchUsers(userSearch, filterProg);
        fetchAdminData();
    };

    const executeTierReject = async () => {
        if (!tierRejectTarget) return;
        const { requestId, receipt_url, userId } = tierRejectTarget;
        await supabase.from('ai_tier_requests').update({ status: 'REJECTED' }).eq('id', requestId);
        toast.success("Permohonan ditolak.");
        logAuditAction({ actionType: 'AI_TIER_REJECTED', module: 'JPP Admin', entityId: userId, description: `Permohonan tier AI ditolak`, actorId: profile!.id, metadata: { receipt_url } });
        if (receipt_url) {
            await supabase.from('club_logs').insert([{
                user_id: profile?.id,
                action: 'AI_TIER_REJECTED',
                details: `Rejected tier request for user ${userId}. Receipt: ${receipt_url}`
            }]);
        }
        setTierRejectTarget(null);
        fetchUsers(userSearch, filterProg);
        fetchAdminData();
    };

    const executeRoleToggle = async () => {
        if (!roleToggleTarget) return;
        const { id, name, currentRole } = roleToggleTarget;
        const { error } = await supabase.rpc('toggle_jpp_role', { p_target_id: id });
        if (error) { toast.error(error.message); return; }
        toast.success('Peranan berjaya dikemaskini.');
        logAuditAction({ actionType: currentRole === 'JPP' ? 'JPP_ROLE_REMOVED' : 'JPP_ROLE_ASSIGNED', module: 'JPP Admin', entityId: id, description: `${name}: ${currentRole === 'JPP' ? 'Diturunkan dari JPP' : 'Dilantik sebagai JPP'}`, actorId: profile!.id });
        setRoleToggleTarget(null);
        fetchAdminData();
    };

    const executeTierToggle = async () => {
        if (!tierToggleTarget) return;
        const { id, newTier } = tierToggleTarget;
        await supabase.rpc('update_user_ai_tier', { target_user_id: id, new_tier: newTier });
        toast.success(`Tier berjaya dikemaskini ke ${newTier.toUpperCase()}.`);
        setTierToggleTarget(null);
        fetchAdminData();
    };

    const handleViewReceipt = (url: string | null) => {
        if (!url) return;
        window.open(url, '_blank');
    };

    const uniqueProgs = allProgs;

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
        if (filterLevel !== 'all') {
            const cohort = getUserCohort(u);
            if (!cohort || cohort.level !== filterLevel) return false;
        }
        return true;
    });

    return (
        <div className="w-full text-slate-900 dark:text-white transition-colors">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute -top-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full  opacity-5 dark:opacity-8"
                    style={{ background: themeColor }} />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-10">
                
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: hexToRgba(themeColor, 0.15), border: `1px solid ${hexToRgba(themeColor, 0.25)}` }}>
                            <Users className="w-5 h-5" style={{ color: themeColor }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                {t('jpp:users_management')}
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">{t('jpp:users_management_subtitle')}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Tier Requests (PRO Applications) */}
                {(isMTUser || isSuperAdmin) && tierRequests.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                        <div className="rounded-[1.75rem] border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 lg:p-8 relative overflow-hidden shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-white/[0.06] pb-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 dark:text-indigo-400">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{t('jpp:users_pro_applications')}</h3>
                                    <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1 max-w-xl">{t('jpp:users_pro_desc')}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tierRequests.filter(req => {
                                    if (req.status === 'PENDING') return true;
                                    const updatedAt = req.updated_at ? new Date(req.updated_at) : new Date(req.created_at);
                                    let isRecent = (new Date().getTime() - updatedAt.getTime()) < 24 * 60 * 60 * 1000;
                                    return isRecent;
                                }).map(req => (
                                    <div key={req.id} className="p-5 rounded-[1.25rem] border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100/70 dark:hover:bg-white/[0.05] shadow-sm dark:shadow-none transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{req.profiles?.full_name || 'Pelajar'}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-white/40 mt-1 uppercase tracking-widest">{format(new Date(req.created_at), 'dd MMM yyyy, h:mm a')}</p>
                                            </div>
                                            <div className={cn(
                                                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                req.status === 'PENDING' ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20" :
                                                req.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20" :
                                                "bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20"
                                            )}>
                                                {req.status}
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-white dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/5 mb-4 space-y-2">
                                            <div>
                                                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-white/30 block mb-1">{t('jpp:users_justification')}</span>
                                                <p className="text-[11px] text-slate-700 dark:text-white/70 italic">&quot;{req.reason}&quot;</p>
                                            </div>
                                            
                                            {req.receipt_url && (
                                                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-white/5">
                                                    <button onClick={() => handleViewReceipt(req.receipt_url)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors w-full justify-center">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] uppercase font-black tracking-widest">{t('jpp:users_view_receipt')}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {req.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => setTierApproveTarget({ requestId: req.id, userId: req.user_id, newTier: 'pro', receipt_url: req.receipt_url })} className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 transition-colors">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('common:approve', 'Luluskan')}</span>
                                                </button>
                                                <button onClick={() => setTierRejectTarget({ requestId: req.id, userId: req.user_id, receipt_url: req.receipt_url })} className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors">
                                                    <XCircle className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('common:reject', 'Tolak')}</span>
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
                        <div className="rounded-[1.75rem] border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 lg:p-8 relative overflow-hidden shadow-sm dark:shadow-none">
                            {/* Subtle warning glow */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full  opacity-5 bg-amber-500 pointer-events-none" />
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-white/[0.06] pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 dark:text-amber-400">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{t('jpp:users_duplicate_detection')}</h3>
                                        <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1 max-w-xl">
                                            {t('jpp:users_duplicate_subtitle')}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={fetchDuplicates}
                                    disabled={duplicateLoading}
                                    className="px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-sm dark:shadow-none"
                                >
                                    {duplicateLoading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                            {t('jpp:users_scanning')}
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-3.5 h-3.5" />
                                            {showDuplicates ? t('jpp:users_rescan') : t('jpp:users_scan_now')}
                                        </>
                                    )}
                                </button>
                            </div>

                            <AnimatePresence>
                                {showDuplicates && (
                                    <motion.div 
                                        initial={{ opacity: 0, }}
                                        animate={{ opacity: 1, }}
                                        exit={{ opacity: 0, }}
                                        className="overflow-hidden"
                                    >
                                        {duplicates.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                                    <CheckCircle2 className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
                                                </div>
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t('jpp:users_clean_title')}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-white/40 max-w-xs">{t('jpp:users_clean_desc')}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Summary badge */}
                                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                                    <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                                                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                                                        {t('jpp:users_duplicate_alert', { count: duplicates.length, total: duplicates.reduce((sum, d) => sum + d.account_count, 0) })}
                                                    </p>
                                                </div>

                                                {/* Duplicate groups */}
                                                <div className="grid gap-3">
                                                    {duplicates.map((group) => {
                                                        const primaryIdx = group.accounts.reduce((bestIdx, acc, idx) => {
                                                            const bestLogin = group.accounts[bestIdx].last_sign_in;
                                                            const currLogin = acc.last_sign_in;
                                                            if (!currLogin) return bestIdx;
                                                            if (!bestLogin) return idx;
                                                            return new Date(currLogin) > new Date(bestLogin) ? idx : bestIdx;
                                                        }, 0);
                                                        const primaryAcc = group.accounts[primaryIdx];

                                                        return (
                                                        <div key={group.matric_no} className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] overflow-hidden shadow-sm dark:shadow-none">
                                                            {/* Group header */}
                                                            <div className="px-5 py-4 bg-slate-100 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.04] flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/25">
                                                                        <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 tracking-wider font-mono">{group.matric_no}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                                                                        {t('jpp:users_account_count', { count: group.account_count })}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Accounts list */}
                                                            <div className="divide-y divide-slate-200 dark:divide-white/[0.03]">
                                                                {group.accounts.map((acc, idx) => {
                                                                    const isPrimary = idx === primaryIdx;
                                                                    return (
                                                                    <div key={acc.id} className={cn("px-5 py-4 transition-colors", isPrimary ? "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.03]" : "hover:bg-slate-100/50 dark:hover:bg-white/[0.02]")}>
                                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{acc.full_name || 'Tanpa Nama'}</span>
                                                                                    {isPrimary && (
                                                                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                                                            {t('jpp:users_keep_primary')}
                                                                                        </span>
                                                                                    )}
                                                                                    {!isPrimary && (
                                                                                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[8px] font-black uppercase tracking-widest border border-rose-500/20">
                                                                                            {t('jpp:users_duplicate_badge')}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                                                    <span className="text-[11px] text-slate-600 dark:text-white/50 flex items-center gap-1">
                                                                                        📧 {acc.email}
                                                                                    </span>
                                                                                    <span className="text-[10px] text-slate-500 dark:text-white/30">
                                                                                        {acc.providers?.join(', ') || 'email'}
                                                                                    </span>
                                                                                    {acc.email_confirmed ? (
                                                                                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{t('jpp:users_verified')}</span>
                                                                                    ) : (
                                                                                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">{t('jpp:users_unverified')}</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-white/25">
                                                                                    <span>{t('jpp:users_registered_at')} {format(new Date(acc.created_at), 'dd MMM yyyy, h:mm a')}</span>
                                                                                    <span className={isPrimary ? "text-emerald-600 dark:text-emerald-400/80 font-bold" : ""}>
                                                                                        {t('jpp:users_last_login')} {acc.last_sign_in ? format(new Date(acc.last_sign_in), 'dd MMM yyyy, h:mm a') : t('jpp:users_no_record')}
                                                                                    </span>
                                                                                    {acc.department && <span>Jabatan: {acc.department}</span>}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <span className={cn(
                                                                                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                                                                                    acc.role === 'SUPER_ADMIN_JPP' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" :
                                                                                    acc.role === 'JPP' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                                                                                    "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/40 border-slate-200 dark:border-white/10"
                                                                                )}>
                                                                                    {acc.role}
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        navigator.clipboard.writeText(acc.id);
                                                                                        toast.success('UUID disalin!');
                                                                                    }}
                                                                                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
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
                                                                                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-600 dark:text-rose-400 transition-colors flex items-center gap-1.5"
                                                                                        title={`Gabung data dari akaun ini ke ${primaryAcc.full_name} (login terkini)`}
                                                                                    >
                                                                                        <ExternalLink className="w-3 h-3" />
                                                                                        {t('jpp:users_merge_to_active')}
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
                    <div className="rounded-[1.75rem] border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 lg:p-8 shadow-sm dark:shadow-none">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('jpp:users_directory')}</h3>
                                <p className="text-[11px] text-slate-500 dark:text-white/40 uppercase tracking-widest mt-1">{t('jpp:users_directory_subtitle', { count: userCount.toLocaleString() })}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
                                    <input
                                        type="text" placeholder={t('jpp:users_search_placeholder')}
                                        value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                        className="pl-10 pr-4 h-11 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:border-slate-400 dark:focus:border-white/30 shadow-sm dark:shadow-none transition-all font-medium w-48"
                                    />
                                </div>
                                {/* Tahap filter */}
                                <select
                                    value={filterLevel}
                                    onChange={e => setFilterLevel(e.target.value)}
                                    className="h-11 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-700 dark:text-white/70 font-bold px-3 focus:outline-none focus:border-slate-400 dark:focus:border-white/30 shadow-2xs dark:shadow-none transition-all"
                                >
                                    <option value="all" className="bg-white dark:bg-[#1C261D] text-slate-900 dark:text-white">{t('jpp:users_all_levels')}</option>
                                    <option value="Junior" className="bg-white dark:bg-[#1C261D] text-slate-900 dark:text-white">Junior</option>
                                    <option value="Senior" className="bg-white dark:bg-[#1C261D] text-slate-900 dark:text-white">Senior</option>
                                    <option value="Asasi" className="bg-white dark:bg-[#1C261D] text-slate-900 dark:text-white">Asasi</option>
                                </select>
                                {/* Program filter */}
                                <select
                                    value={filterProg}
                                    onChange={e => setFilterProg(e.target.value)}
                                    className="h-11 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-700 dark:text-white/70 font-bold px-3 focus:outline-none focus:border-slate-400 dark:focus:border-white/30 shadow-2xs dark:shadow-none transition-all"
                                >
                                    <option value="all" className="bg-white dark:bg-[#1C261D] text-slate-900 dark:text-white">{t('jpp:users_all_programmes')}</option>
                                    {uniqueProgs.map(p => (
                                        <option key={p} value={p} className="bg-white dark:bg-[#1C261D] text-slate-900 dark:text-white">{p}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.05] bg-slate-50/50 dark:bg-black/20">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.02]">
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/40">{t('common:user', 'Pengguna')}</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/40">{t('jpp:users_cohort')}</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/40">{t('jpp:users_ai_tier')}</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/40">{t('jpp:users_token_balance')}</th>
                                        {(isMTUser || isSuperAdmin) && <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/40 text-center">{t('jpp:manage_roles')}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        [1, 2, 3, 4, 5].map((i) => (
                                            <tr key={i} className="border-b border-slate-200 dark:border-white/[0.02] last:border-0 animate-pulse">
                                                <td className="px-5 py-4">
                                                    <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded mb-1.5" />
                                                    <div className="h-3 w-48 bg-slate-200/60 dark:bg-white/5 rounded" />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="h-5 w-24 bg-slate-200/60 dark:bg-white/5 rounded-full" />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="h-5 w-20 bg-slate-200/60 dark:bg-white/5 rounded-full" />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="h-4 w-16 bg-slate-200/70 dark:bg-white/5 rounded" />
                                                </td>
                                                {(isMTUser || isSuperAdmin) && (
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="h-7 w-20 bg-slate-200/60 dark:bg-white/5 rounded-xl mx-auto" />
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={(isMTUser || isSuperAdmin) ? 5 : 4} className="px-5 py-16 text-center">
                                                <div className="max-w-xs mx-auto space-y-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400 dark:text-white/30">
                                                        <Users className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white/80">{t('jpp:users_no_users_found')}</p>
                                                    <p className="text-xs text-slate-500 dark:text-white/40">{t('jpp:users_no_users_desc')}</p>
                                                    {(userSearch || filterLevel !== 'all' || filterProg !== 'all') && (
                                                        <button
                                                            onClick={() => { setUserSearch(''); setFilterLevel('all'); setFilterProg('all'); }}
                                                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1 inline-block"
                                                        >
                                                            {t('jpp:users_reset_filters')}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.slice(0, 100).map((u) => {
                                            const cohort = getUserCohort(u);
                                            return (
                                            <tr key={u.id} className="border-b border-slate-200 dark:border-white/[0.02] last:border-0 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white/90">{u.full_name || 'Pelajar'}</div>
                                                    <div className="text-[11px] text-slate-500 dark:text-white/40">{u.email}</div>
                                                    <div className="text-[10px] text-slate-400 dark:text-white/25 mt-0.5">{u.matric_no || ''}</div>
                                                </td>
                                                {/* Kohort column */}
                                                <td className="px-5 py-3.5">
                                                    {cohort ? (
                                                        <div className="space-y-1">
                                                            <div className={cn(
                                                                'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border inline-block',
                                                                cohort.level === 'Senior'  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' :
                                                                cohort.level === 'Junior'  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                                                                                            'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30'
                                                            )}>
                                                                {cohort.level} • Sem {cohort.semester}
                                                            </div>
                                                            {u.programme_code && (
                                                                <div className="text-[9px] text-slate-500 dark:text-white/30 font-bold">{u.programme_code}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-400 dark:text-white/20">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <div className={cn(
                                                            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                                                            u.subscription_tier?.toLowerCase() === 'pro' ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/40 border-slate-200 dark:border-white/10"
                                                        )}>
                                                            {u.subscription_tier || 'FREE'}
                                                        </div>
                                                        {u.subscription_tier?.toLowerCase() === 'pro' && u.ai_tier_expiration && (
                                                            <span className="text-[9px] text-slate-500 dark:text-white/30 uppercase tracking-widest">
                                                                {(() => {
                                                                    const diff = Math.ceil((new Date(u.ai_tier_expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                                    if (diff < 0) return <span className="text-rose-600 dark:text-rose-400">Luput</span>;
                                                                    return `${diff} Hari`;
                                                                })()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="font-mono text-sm text-slate-900 dark:text-white/80 tabular-nums">
                                                        {(u.ai_token_balance || 0).toLocaleString()}
                                                        <span className="text-[9px] text-slate-400 dark:text-white/30 ml-1 font-sans">Tk</span>
                                                    </div>
                                                </td>
                                                {(isMTUser || isSuperAdmin) && (
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {u.role !== 'SUPER_ADMIN_JPP' && isYDP && (
                                                                <button 
                                                                    onClick={() => setRoleToggleTarget({ id: u.id, name: u.full_name, currentRole: u.role })}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors",
                                                                        u.role === 'JPP' 
                                                                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-500 hover:bg-rose-500/20" 
                                                                        : "bg-amber-500/20 text-amber-600 dark:text-amber-500 hover:bg-amber-500/30"
                                                                    )}
                                                                >
                                                                    {u.role === 'JPP' ? t('jpp:users_demote_jpp') : t('jpp:users_promote_jpp')}
                                                                </button>
                                                            )}
                                                            {u.subscription_tier?.toLowerCase() !== 'pro' ? (
                                                                <button 
                                                                    onClick={() => setTierToggleTarget({ id: u.id, name: u.full_name, newTier: 'pro' })}
                                                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                                                                >
                                                                    PRO
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => setTierToggleTarget({ id: u.id, name: u.full_name, newTier: 'free' })}
                                                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors border border-slate-200 dark:border-white/5"
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
                            <p className="text-center text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30 mt-4">{t('jpp:users_search_hint')}</p>
                        )}
                    </div>
                </motion.div>

            </div>

            {/* Merge Accounts Dialog */}
            <ConfirmDialog
                open={Boolean(mergeTarget)}
                onOpenChange={(open) => !open && setMergeTarget(null)}
                title={t('jpp:users_merge_confirm_title')}
                description={mergeTarget ? (
                    <span>
                        Tindakan ini <strong>tidak boleh diundur</strong>. Akaun kedua (<strong>{mergeTarget.secondaryName}</strong> - {mergeTarget.secondaryEmail}) akan dipadamkan dan semua rekod keahlian, merit, dan token AI akan dipindahkan ke akaun utama (<strong>{mergeTarget.primaryName}</strong>).
                    </span>
                ) : ''}
                confirmLabel={t('jpp:users_merge_confirm_btn')}
                cancelLabel={t('common:cancel')}
                variant="destructive"
                isLoading={merging}
                onConfirm={executeMergeAccounts}
            />

            {/* Tier Approve Dialog */}
            <ConfirmDialog
                open={Boolean(tierApproveTarget)}
                onOpenChange={(open) => !open && setTierApproveTarget(null)}
                title={t('jpp:users_tier_approve_title')}
                description={t('jpp:users_tier_approve_desc')}
                confirmLabel={t('common:approve', 'Luluskan')}
                cancelLabel={t('common:cancel')}
                variant="default"
                onConfirm={executeTierApprove}
            />

            {/* Tier Reject Dialog */}
            <ConfirmDialog
                open={Boolean(tierRejectTarget)}
                onOpenChange={(open) => !open && setTierRejectTarget(null)}
                title={t('jpp:users_tier_reject_title')}
                description={t('jpp:users_tier_reject_desc')}
                confirmLabel={t('common:reject', 'Tolak Permohonan')}
                cancelLabel={t('common:cancel')}
                variant="destructive"
                onConfirm={executeTierReject}
            />

            {/* Role Toggle Dialog */}
            <ConfirmDialog
                open={Boolean(roleToggleTarget)}
                onOpenChange={(open) => !open && setRoleToggleTarget(null)}
                title={t('jpp:users_role_toggle_title')}
                description={roleToggleTarget ? (
                    roleToggleTarget.currentRole === 'JPP'
                        ? `Adakah anda pasti mahu melucutkan peranan JPP bagi ${roleToggleTarget.name} dan kembalikan ke status ahli biasa?`
                        : `Adakah anda pasti mahu melantik ${roleToggleTarget.name} secara terus sebagai barisan kepimpinan JPP?`
                ) : ''}
                confirmLabel={t('common:confirm', { defaultValue: 'Sahkan Peranan' })}
                cancelLabel={t('common:cancel')}
                variant={roleToggleTarget?.currentRole === 'JPP' ? 'destructive' : 'default'}
                onConfirm={executeRoleToggle}
            />

            {/* Tier Toggle Dialog */}
            <ConfirmDialog
                open={Boolean(tierToggleTarget)}
                onOpenChange={(open) => !open && setTierToggleTarget(null)}
                title={t('jpp:users_tier_toggle_title')}
                description={tierToggleTarget ? `Tukar tier langganan AI bagi ${tierToggleTarget.name} kepada ${tierToggleTarget.newTier.toUpperCase()}?` : ''}
                confirmLabel={t('jpp:users_change_tier')}
                cancelLabel={t('common:cancel')}
                onConfirm={executeTierToggle}
            />
        </div>
    );
}
