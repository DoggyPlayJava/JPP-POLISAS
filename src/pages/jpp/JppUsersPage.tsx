import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Users, Search, Sparkles, ShieldCheck, FileText, ChevronDown, CheckCircle2, XCircle, GraduationCap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getSemesterInfo } from '@/types';

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
            (u.email?.toLowerCase() || '').includes(userSearch.toLowerCase());
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
                                        type="text" placeholder="Cari emel atau nama..."
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
