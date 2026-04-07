import React, { useEffect, useState } from 'react';
import {
    ShieldCheck, Database, Users, Trash2, FileWarning, Activity,
    RefreshCw, ChevronRight, LayoutGrid, Server, Info, Lock,
    Plus, CheckCheck, Building2, Palette, Cpu, Settings as SettingsIcon,
    Sparkles, AlertTriangle, Search, Clock, Shield, Wand2, CalendarRange, Brain, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ALL_CLUBS } from '@/types';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const ADD_CLUB_CATEGORIES = ['Akademik', 'Umum', 'Sukan', 'Badan Beruniform'];
const ADD_CLUB_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export function JppAdminPage() {
    const { isSuperAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isCleaning, setIsCleaning] = useState(false);
    const [globalLogs, setGlobalLogs] = useState<any[]>([]);
    const [suspiciousUsers, setSuspiciousUsers] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [tierRequests, setTierRequests] = useState<any[]>([]);
    
    // TABS
    const [activeTab, setActiveTab] = useState('dashboard');

    const [stats, setStats] = useState({
        totalUsers: 0, totalReports: 0, totalActivities: 0,
        pendingUsers: 0, rejectedReports: 0, storageMB: 0, storageLimit: 5120,
    });

    const [chartData, setChartData] = useState<{
        activeClubs: { name: string; count: number }[];
        reportStats: { name: string; value: number; color: string }[];
    }>({ activeClubs: [], reportStats: [] });

    const [settings, setSettings] = useState<Record<string, any>>({
        allow_auto_pdf: true,
        allow_add_takwim: true,
        max_clubs_per_student: 2,
        allow_ai_chat: true,
        allow_ai_budget: true,
        ai_total_tokens: 0,
        ai_token_limit: 1000000,
    });

    const [showAddClub, setShowAddClub] = useState(false);
    const [newClub, setNewClub] = useState({
        name: '', short_name: '', category: 'Umum', theme_color: '#6366f1', description: ''
    });
    const [addingClub, setAddingClub] = useState(false);
    
    // Bulk Accept Scoped
    const [showBulkAccept, setShowBulkAccept] = useState(false);
    const [bulkClubId, setBulkClubId] = useState<string>('ALL');
    const [logSearch, setLogSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const { data: storageData } = await supabase.rpc('get_storage_stats');
            const [users, reports, activities, pending, rejected] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('club_reports').select('*', { count: 'exact', head: true }),
                supabase.from('club_activities').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'PENDING'),
                supabase.from('club_reports').select('*', { count: 'exact', head: true }).eq('status', 'Ditolak'),
            ]);
            const { data: logs } = await supabase.from('club_logs').select('*').order('created_at', { ascending: false }).limit(20);
            setStats({
                totalUsers: users.count || 0, totalReports: reports.count || 0,
                totalActivities: activities.count || 0, pendingUsers: pending.count || 0,
                rejectedReports: rejected.count || 0,
                storageMB: storageData?.[0]?.total_mb || 0,
                storageLimit: storageData?.[0]?.limit_mb || 5120,
            });
            const { data: settingsData } = await supabase.from('system_settings').select('*');
            if (settingsData) {
                const s: Record<string, any> = { allow_auto_pdf: true, allow_add_takwim: true, max_clubs_per_student: 2, allow_ai_chat: true, allow_ai_budget: true, ai_total_tokens: 0, ai_token_limit: 1000000, ai_spam_warning_threshold: 30, ai_spam_block_threshold: 50 };
                settingsData.forEach(item => { 
                    let val = item.value;
                    if (val === 'true') val = true;
                    if (val === 'false') val = false;
                    s[item.key] = val; 
                });
                setSettings(s);
            }
            setGlobalLogs(logs || []);
            
            // Fetch Suspicious Users
            const { data: flagged } = await supabase
                .from('profiles')
                .select('*')
                .in('ai_status', ['warned', 'flagged', 'permanent_ban'])
                .order('ai_daily_usage', { ascending: false });
            setSuspiciousUsers(flagged || []);

            // Fetch All Users & Tier Requests
            const { data: usersData } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
            setAllUsers(usersData || []);
            const { data: requestsData } = await supabase.from('ai_tier_requests').select('*, profiles(full_name)').order('created_at', { ascending: false });
            setTierRequests(requestsData || []);

            const { data: activityCounts } = await supabase.from('club_activities').select('club_id');
            const counts: Record<string, number> = {};
            activityCounts?.forEach(a => { counts[a.club_id] = (counts[a.club_id] || 0) + 1; });
            const activeClubsData = ALL_CLUBS.map(c => ({ name: c.shortName, count: counts[c.id] || 0 }))
                .sort((a, b) => b.count - a.count).slice(0, 6);
            const { data: reportStatusData } = await supabase.from('club_reports').select('status');
            const rStats: Record<string, number> = { 'Diluluskan': 0, 'Menunggu': 0, 'Ditolak': 0, 'Dalam Semakan': 0 };
            reportStatusData?.forEach(r => { if (rStats[r.status] !== undefined) rStats[r.status]++; });
            const reportStatsData = [
                { name: 'Selesai', value: rStats['Diluluskan'], color: '#10b981' },
                { name: 'Menunggu', value: rStats['Menunggu'] + rStats['Dalam Semakan'], color: '#f59e0b' },
                { name: 'Ditolak', value: rStats['Ditolak'], color: '#ef4444' },
            ].filter(d => d.value > 0);
            setChartData({ activeClubs: activeClubsData, reportStats: reportStatsData });
        } catch (error: any) {
            console.error('Admin Fetch Error:', error);
            toast.error('Gagal memuatkan data admin.');
        } finally {
            setLoading(false);
        }
    };

    const handleCleanRejected = async () => {
        if (stats.rejectedReports === 0) return;
        if (!window.confirm(`Padam ${stats.rejectedReports} rekod ditolak? Tindakan ini tidak boleh diundur.`)) return;
        setIsCleaning(true);
        try {
            const { error } = await supabase.from('club_reports').delete().eq('status', 'Ditolak');
            if (error) throw error;
            toast.success('Pembersihan Berjaya');
            await fetchAdminData();
        } catch (e: any) {
            toast.error(e.message || 'Gagal memadam rekod.');
        } finally {
            setIsCleaning(false);
        }
    };

    const toggleSetting = async (key: string, currentValue: any) => {
        // Force-cast to real boolean — handles string 'true'/'false' from DB
        const currentBool = currentValue === true || String(currentValue).toLowerCase() === 'true';
        const newValue = !currentBool;
        const toastId = toast.loading('Mengemaskini tetapan...');
        try {
            const { error } = await supabase.from('system_settings')
                .upsert({ key, value: newValue }, { onConflict: 'key' });
            if (error) throw error;
            setSettings(s => ({ ...s, [key]: newValue }));
            toast.success(`${key}: ${newValue ? 'ON' : 'OFF'}`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || 'Gagal kemaskini', { id: toastId });
        }
    };

    const handleAcceptAll = async () => {
        if (!window.confirm(`Teruskan kelulusan pukal untuk ${bulkClubId === 'ALL' ? 'SEMUA kelab' : 'kelab terpilih'}? Ini tidak boleh diundur.`)) return;
        const toastId = toast.loading('Meluluskan permohonan...');
        try {
            let query = supabase.from('student_club_memberships').update({ account_status: 'APPROVED' }).eq('account_status', 'PENDING');
            if (bulkClubId !== 'ALL') {
                query = query.eq('club_id', bulkClubId);
            }
            const { error } = await query;
            if (error) throw error;
            toast.success('Semua permohonan terpilih diluluskan!', { id: toastId });
            setShowBulkAccept(false);
            fetchAdminData();
        } catch (e: any) {
            toast.error(e.message, { id: toastId });
        }
    };

    const handleBubarKohort = async () => {
        if (!window.confirm('AMARAN KHAS: Anda pasti mahu BUBAR semua kohort Kelab Badan Beruniform? Semua keahlian kelab Badan Beruniform akan dipadam. Tindakan ini tidak boleh diundur.')) return;
        setIsCleaning(true);
        const toastId = toast.loading('Membubarkan kohort uniform...');
        try {
            const { data: clubs } = await supabase.from('clubs').select('id').ilike('category', '%Beruniform%');
            const clubIds = clubs?.map(c => c.id) || [];
            
            if (clubIds.length > 0) {
                const { error } = await supabase.from('student_club_memberships').delete().in('club_id', clubIds);
                if (error) throw error;
                
                await supabase.from('club_logs').insert({
                    action_type: 'COHORT_DISSOLVED',
                    actor_id: null,
                    actor_name: 'SISTEM (JPP)',
                    description: `Sistem telah membubarkan semua keahlian kohort Badan Beruniform.`,
                });
                
                toast.success('Pembubaran Kohort Kelab Beruniform Berjaya!', { id: toastId });
                fetchAdminData();
            } else {
                toast.error('Tiada kelab Badan Beruniform dijumpai.', { id: toastId });
            }
        } catch (e: any) {
            toast.error(e.message || 'Ralat semasa pembubaran', { id: toastId });
        } finally {
            setIsCleaning(false);
        }
    };

    const handleAddClub = async () => {
        if (!newClub.name.trim() || !newClub.short_name.trim()) { toast.error('Nama dan singkatan kelab diperlukan.'); return; }
        setAddingClub(true);
        try {
            const { error } = await supabase.from('clubs').insert({
                name: newClub.name.trim(), short_name: newClub.short_name.trim().toUpperCase(),
                category: newClub.category, theme_color: newClub.theme_color,
                description: newClub.description.trim() || null, is_active: true,
            });
            if (error) throw error;
            toast.success(`Kelab "${newClub.name}" berjaya ditambah!`);
            setShowAddClub(false);
            setNewClub({ name: '', short_name: '', category: 'Umum', theme_color: '#6366f1', description: '' });
            fetchAdminData();
        } catch (e: any) {
            toast.error(e.message || 'Gagal tambah kelab');
        } finally {
            setAddingClub(false);
        }
    };

    const updateClubLimit = async (delta: number) => {
        const current = Number(settings.max_clubs_per_student ?? 2);
        const newLimit = Math.max(1, Math.min(10, current + delta));
        if (newLimit === current) return;
        const toastId = toast.loading('Mengemaskini had...');
        try {
            const { data, error } = await supabase.from('system_settings').update({ value: newLimit }).eq('key', 'max_clubs_per_student').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'max_clubs_per_student', value: newLimit });
            setSettings(s => ({ ...s, max_clubs_per_student: newLimit }));
            toast.success(`Had keahlian: ${newLimit} kelab`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || 'Gagal kemaskini had', { id: toastId });
        }
    };

    const updateAiTokenLimit = async () => {
        const input = window.prompt("Masukkan kuota limit pemerhatian token (Dalam angka, cth: 1000000)", settings.ai_token_limit?.toString());
        if (!input) return;
        const newLimit = parseInt(input);
        if (isNaN(newLimit) || newLimit < 1000) {
            toast.error("Nilai had token mesti lebih daripada 1000.");
            return;
        }

        const toastId = toast.loading('Mengemaskini had token...');
        try {
            const { data, error } = await supabase.from('system_settings').update({ value: newLimit }).eq('key', 'ai_token_limit').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'ai_token_limit', value: newLimit });
            setSettings(s => ({ ...s, ai_token_limit: newLimit }));
            toast.success(`Had token baharu: ${newLimit.toLocaleString()}`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || 'Gagal kemaskini had', { id: toastId });
        }
    };

    const updateAiTokenAllowance = async (tier: 'free_tier_tokens' | 'pro_tier_tokens', label: string) => {
        const currentSettings = settings.ai_token_settings || { free_tier_tokens: 200, pro_tier_tokens: 1000, costs: {} };
        const currentLimit = currentSettings[tier] || 0;
        const input = window.prompt(`Masukkan bekalan token sebulan untuk pengguna ${label}:`, currentLimit.toString());
        if (!input) return;
        const newLimit = parseInt(input);
        if (isNaN(newLimit) || newLimit < 0) {
            toast.error("Sila masukkan nilai nombor sah.");
            return;
        }

        const toastId = toast.loading(`Mengemaskini token ${label}...`);
        try {
            const newSettings = { ...currentSettings, [tier]: newLimit };
            const { data, error } = await supabase.from('system_settings').update({ value: newSettings }).eq('key', 'ai_token_settings').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'ai_token_settings', value: newSettings });
            setSettings(s => ({ ...s, ai_token_settings: newSettings }));
            toast.success(`Bekalan Token ${label} dinaik taraf ke ${newLimit}.`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || 'Gagal kemaskini', { id: toastId });
        }
    };

    const updateAiTokenCost = async (serviceKey: string, label: string) => {
        const currentSettings = settings.ai_token_settings || { free_tier_tokens: 200, pro_tier_tokens: 1000, costs: {} };
        const currentCost = currentSettings.costs?.[serviceKey] || 0;
        const input = window.prompt(`Masukkan harga kos (token) untuk servis ${label} (Mesti nombor angka. Set '0' untuk jadikannya percuma):`, currentCost.toString());
        if (!input) return;
        const newCost = parseInt(input);
        if (isNaN(newCost) || newCost < 0) {
            toast.error("Sila masukkan nilai nombor (cth: 50 atau 0 untuk percuma).");
            return;
        }

        const toastId = toast.loading(`Mengemaskini kos ${label}...`);
        try {
            const newSettings = { 
              ...currentSettings, 
              costs: { ...currentSettings.costs, [serviceKey]: newCost }
            };
            const { data, error } = await supabase.from('system_settings').update({ value: newSettings }).eq('key', 'ai_token_settings').select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'ai_token_settings', value: newSettings });
            setSettings(s => ({ ...s, ai_token_settings: newSettings }));
            toast.success(`Kos token bagi ${label} ditetapkan ke ${newCost}.`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || 'Gagal kemaskini kos', { id: toastId });
        }
    };

    const updateSpamThreshold = async (type: 'warning' | 'block') => {
        const key = type === 'warning' ? 'ai_spam_warning_threshold' : 'ai_spam_block_threshold';
        const currentVal = settings[key];
        const label = type === 'warning' ? 'Amaran (Amaran selepas X chat)' : 'Sekatan (Sekat selepas X chat)';
        const input = window.prompt(`Masukkan had ${label}:`, currentVal?.toString());
        if (!input) return;
        const newLimit = parseInt(input);
        if (isNaN(newLimit) || newLimit < 1) {
            toast.error("Nilai mesti nombor melebihi 0.");
            return;
        }

        const toastId = toast.loading('Mengemaskini had...');
        try {
            const { data, error } = await supabase.from('system_settings').update({ value: newLimit }).eq('key', key).select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key, value: newLimit });
            setSettings(s => ({ ...s, [key]: newLimit }));
            toast.success(`Berjaya kemaskini had ${type}`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || 'Gagal kemaskini had', { id: toastId });
        }
    };

    const handleActionSpamUser = async (userId: string, action: 'unban' | 'permanent_ban') => {
        const confirmMsg = action === 'unban' 
            ? 'Adakah anda pasti mahu LEPASKAN akses AI untuk pengguna ini?' 
            : 'Adakah anda pasti mahu SEKAT SELAMANYA pengguna ini daripada AI?';
        if (!window.confirm(confirmMsg)) return;

        const toastId = toast.loading('Memproses tindakan...');
        const newStatus = action === 'unban' ? 'active' : 'permanent_ban';
        // reset usage if unban
        const updates = action === 'unban' ? { ai_status: newStatus, ai_daily_usage: 0 } : { ai_status: newStatus };

        try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
            if (error) throw error;
            toast.success(`Berjaya! Status AI dikemaskini.`, { id: toastId });
            fetchAdminData();
        } catch (e: any) {
            toast.error(e.message || 'Gagal tindakan', { id: toastId });
        }
    };

    const handleTierApprove = async (reqId: string, userId: string, newTier: string) => {
        const toastId = toast.loading('Memproses kelulusan Tier...');
        try {
            // First call the RPC to update user tokens & tier
            const { error: rpcErr } = await supabase.rpc('update_user_ai_tier', {
                target_user_id: userId,
                new_tier: newTier
            });
            if (rpcErr) throw rpcErr;
            
            // Mark request as APPROVED
            const { error: reqErr } = await supabase.from('ai_tier_requests').update({ status: 'APPROVED', updated_at: new Date() }).eq('id', reqId);
            if (reqErr) throw reqErr;
            
            toast.success('Permohonan Tier berjaya diluluskan!', { id: toastId });
            fetchAdminData();
        } catch (e: any) {
            toast.error(e.message || 'Terdapat ralat teknikal.', { id: toastId });
        }
    };

    const handleTierReject = async (reqId: string) => {
        const toastId = toast.loading('Menolak permohonan...');
        try {
            const { error } = await supabase.from('ai_tier_requests').update({ status: 'REJECTED', updated_at: new Date() }).eq('id', reqId);
            if (error) throw error;
            toast.success('Permohonan telah ditolak.', { id: toastId });
            fetchAdminData();
        } catch (e: any) {
            toast.error(e.message || 'Terdapat ralat teknikal.', { id: toastId });
        }
    };

    useEffect(() => { if (isSuperAdmin) fetchAdminData(); }, [isSuperAdmin]);

    if (!isSuperAdmin) {
        return (
            <div className="page-container flex flex-col items-center justify-center h-[70vh] gap-5 text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-card shadow-xl flex items-center justify-center border border-border">
                    <Lock className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Akses Terhad</h2>
                <p className="text-muted-foreground text-sm max-w-xs">Hanya pentadbir utama HEP dibenarkan mengakses sistem pusat.</p>
            </div>
        );
    }

    const storagePercentage = Math.min((stats.storageMB / stats.storageLimit) * 100, 100);

    const TABS = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { id: 'nexus', label: 'Nexus Hub', icon: Cpu, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { id: 'users', label: 'Pengurusan Pelajar', icon: Users, color: 'text-pink-500', bg: 'bg-pink-500/10' },
        { id: 'management', label: 'Pengurusan Kelab', icon: SettingsIcon, color: 'text-violet-500', bg: 'bg-violet-500/10' },
        { id: 'logs', label: 'Log', icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ];

    return (
        <>
            {/* ── MODALS ── */}
            <Dialog open={showBulkAccept} onOpenChange={setShowBulkAccept}>
                {/* ... (Bulk Accept Modal Content - unchanged) ... */}
                <DialogContent className="rounded-[2rem] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-black tracking-tight">Kelulusan Pukal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Pilih Kelab Terlibat</Label>
                            <Select value={bulkClubId} onValueChange={setBulkClubId}>
                                <SelectTrigger className="h-11 rounded-xl bg-muted/40 border-border/60"><SelectValue placeholder="Semua Kelab" /></SelectTrigger>
                                <SelectContent className="rounded-2xl max-h-[250px]">
                                    <SelectItem value="ALL" className="font-bold text-primary">-- Semua Kelab (GLOBAL) --</SelectItem>
                                    {ALL_CLUBS.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="font-medium">{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">Tindakan ini akan menukar status semua permohonan dari <Badge variant="outline" className="text-[9px]">PENDING</Badge> kepada <Badge variant="outline" className="text-[9px]">APPROVED</Badge> secara automatik.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkAccept(false)} className="rounded-xl font-black text-[10px] uppercase">Batal</Button>
                        <Button onClick={handleAcceptAll} className="rounded-xl font-black text-[10px] uppercase bg-emerald-500 text-white hover:bg-emerald-600">Jalankan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showAddClub} onOpenChange={setShowAddClub}>
                <DialogContent className="rounded-[2rem] max-w-md">
                    {/* ... Add Club Modal Content (unchanged) ... */}
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl tracking-tight flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-violet-600" /> Tambah Kelab Baharu
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Nama Penuh Kelab</Label>
                            <Input placeholder="cth: Kelab Pelajar Elektron" value={newClub.name}
                                onChange={e => setNewClub(c => ({ ...c, name: e.target.value }))}
                                className="h-11 rounded-xl bg-muted/40 border-border/60" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Singkatan (Short Name)</Label>
                            <Input placeholder="cth: ELEKTRON" value={newClub.short_name}
                                onChange={e => setNewClub(c => ({ ...c, short_name: e.target.value.toUpperCase() }))}
                                className="h-11 rounded-xl bg-muted/40 border-border/60 font-black tracking-widest" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Kategori</Label>
                                <Select value={newClub.category} onValueChange={v => setNewClub(c => ({ ...c, category: v }))}>
                                    <SelectTrigger className="h-11 rounded-xl bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        {ADD_CLUB_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat} className="rounded-lg font-medium">{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1">
                                    <Palette className="w-3 h-3" /> Warna Tema
                                </Label>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-xl border border-border/60">
                                    {ADD_CLUB_COLORS.map(color => (
                                        <button key={color} type="button"
                                            onClick={() => setNewClub(c => ({ ...c, theme_color: color }))}
                                            className={cn('w-6 h-6 rounded-full transition-transform',
                                                newClub.theme_color === color ? 'scale-125 ring-2 ring-offset-1 ring-foreground' : 'hover:scale-110')}
                                            style={{ backgroundColor: color }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">
                                Deskripsi <span className="text-muted-foreground/40">(Pilihan)</span>
                            </Label>
                            <Input placeholder="Penerangan ringkas kelab..." value={newClub.description}
                                onChange={e => setNewClub(c => ({ ...c, description: e.target.value }))}
                                className="h-11 rounded-xl bg-muted/40 border-border/60" />
                        </div>
                        <div className="p-3 rounded-2xl border border-border/40 bg-muted/20 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                                style={{ backgroundColor: newClub.theme_color }}>
                                {newClub.short_name?.slice(0, 2) || 'K'}
                            </div>
                            <div>
                                <p className="font-black text-sm">{newClub.name || 'Nama Kelab'}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{newClub.category}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowAddClub(false)}
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest">Batal</Button>
                        <Button onClick={handleAddClub} disabled={addingClub}
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest bg-violet-600 hover:bg-violet-700">
                            {addingClub ? 'Menambah...' : 'Tambah Kelab'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── MAIN PAGE ── */}
            <div className="min-h-screen bg-background pb-20">
                {/* Top Nav */}
                <div className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                                <ShieldCheck className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-foreground leading-none">Pusat Kawalan</h2>
                                <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">HEP e-KPP v4.0</p>
                            </div>
                        </div>
                        <Button onClick={fetchAdminData} variant="ghost"
                            className="rounded-full bg-muted hover:bg-muted/80 text-muted-foreground h-10 px-4 gap-2 text-xs font-bold">
                            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Segarkan
                        </Button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 mt-10 space-y-8">
                    <header>
                        <h1 className="text-4xl font-black tracking-tight text-foreground">Status Sistem</h1>
                        <p className="text-muted-foreground font-medium mt-1">Sistem Pemantauan Infrastruktur & AI Global.</p>
                    </header>

                    {/* STICKY TABS */}
                    <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur-xl py-3 -mx-6 px-6 border-b border-border/50 overflow-x-auto hide-scrollbar">
                        <div className="flex items-center gap-2 min-w-max">
                            {TABS.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={cn('flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-bold transition-all duration-300',
                                        activeTab === tab.id 
                                            ? `bg-card shadow-sm border border-border ${tab.color}`
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
                                    <div className={cn('p-1.5 rounded-lg transition-colors', activeTab === tab.id ? tab.bg : 'bg-transparent')}>
                                        <tab.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm tracking-wide">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="mt-8">
                        {/* ── TAB: DASHBOARD ── */}
                        {activeTab === 'dashboard' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {[
                                        { label: 'Kelab', val: ALL_CLUBS.length, color: 'bg-blue-500', icon: LayoutGrid },
                                        { label: 'Aktiviti', val: stats.totalActivities, color: 'bg-emerald-500', icon: Activity },
                                        { label: 'Laporan', val: stats.totalReports, color: 'bg-indigo-500', icon: FileWarning },
                                        { label: 'Menunggu', val: stats.pendingUsers, color: 'bg-orange-500', icon: Users, alert: stats.pendingUsers > 0 },
                                    ].map((s, i) => (
                                        <Card key={i} className="border-none shadow-sm rounded-[2rem] bg-card overflow-hidden">
                                            <CardContent className="p-6">
                                                <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg', s.color)}>
                                                    <s.icon className="w-5 h-5" />
                                                </div>
                                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-3xl font-black text-foreground">{loading ? '...' : s.val}</span>
                                                    {s.alert && <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8 border border-border/50">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="font-bold text-foreground">Kelab Paling Aktif</h3>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bilangan Aktiviti Keseluruhan</p>
                                            </div>
                                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Activity className="w-5 h-5" /></div>
                                        </div>
                                        <div className="h-[280px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData.activeClubs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }} />
                                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                                                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>

                                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8 border border-border/50">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="font-bold text-foreground">Prestasi Laporan</h3>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Status Laporan Global</p>
                                            </div>
                                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><FileWarning className="w-5 h-5" /></div>
                                        </div>
                                        <div className="h-[280px] w-full flex items-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={chartData.reportStats} innerRadius={70} outerRadius={95} paddingAngle={10} dataKey="value" stroke="none">
                                                        {chartData.reportStats.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle"
                                                        formatter={(value) => <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-2">{value}</span>} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </div>
                                
                                {/* Storage */}
                                <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8 w-full md:w-1/2">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600"><Server className="w-5 h-5" /></div>
                                        <h3 className="font-bold text-foreground">Storan Data Berkembang</h3>
                                    </div>
                                    <div className="space-y-8">
                                        <div className="text-center py-4">
                                            <p className="text-5xl font-black text-foreground tracking-tighter">
                                                {stats.storageMB.toFixed(1)} <span className="text-xl text-muted-foreground/30">MB</span>
                                            </p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Gunaan Semasa</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                                                <span>Kapasiti Cloud (Hybrid)</span>
                                                <span>{storagePercentage.toFixed(1)}%</span>
                                            </div>
                                            <Progress value={storagePercentage} className="h-2.5 bg-muted rounded-full [&>div]:bg-blue-600" />
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* ── TAB: NEXUS HUB (AI) ── */}
                        {activeTab === 'nexus' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Token Analytics Mock */}
                                <Card className="border-none shadow-sm rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 text-white relative overflow-hidden">
                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
                                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-3 rounded-2xl bg-white/10 text-indigo-300 backdrop-blur-sm"><Cpu className="w-6 h-6" /></div>
                                            <div>
                                                <h3 className="font-black text-xl tracking-tight text-white">Metrik Penggunaan Nexus AI</h3>
                                                <p className="text-xs font-medium text-indigo-300/80">Analitik token (anggaran) bulan April</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
                                            <div>
                                                <p className="text-5xl font-black tracking-tighter text-white mb-2">{(settings.ai_total_tokens || 0).toLocaleString()}</p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-indigo-300/70 mb-6">Token Digunakan setakat ini</p>
                                                
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-xs font-bold text-indigo-200">
                                                        <span>Had Token Pintar ({(settings.ai_token_limit || 1000000).toLocaleString()})</span>
                                                        <div className="flex gap-2">
                                                            <span>{(Math.min(((settings.ai_total_tokens || 0) / (settings.ai_token_limit || 1000000)) * 100, 100)).toFixed(1)}%</span>
                                                            <button onClick={updateAiTokenLimit} className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded hover:bg-indigo-500/40">Ubah Had</button>
                                                        </div>
                                                    </div>
                                                    <Progress value={Math.min(((settings.ai_total_tokens || 0) / (settings.ai_token_limit || 1000000)) * 100, 100)} className="h-3 bg-indigo-950/50 rounded-full [&>div]:bg-indigo-400" />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/5 rounded-2xl p-5 backdrop-blur-md border border-white/10">
                                                    <Sparkles className="w-5 h-5 text-amber-400 mb-3" />
                                                    <p className="text-2xl font-black text-white">845</p>
                                                    <p className="text-[10px] font-bold text-indigo-300/80 uppercase tracking-wider mt-1">Panggilan Server</p>
                                                </div>
                                                <div className="bg-white/5 rounded-2xl p-5 backdrop-blur-md border border-white/10">
                                                    <Activity className="w-5 h-5 text-emerald-400 mb-3" />
                                                    <p className="text-2xl font-black text-emerald-400">Aman</p>
                                                    <p className="text-[10px] font-bold text-indigo-300/80 uppercase tracking-wider mt-1">Status API</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* AI Toggles */}
                                <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8">
                                    <div className="flex items-center gap-3 mb-8 border-b border-border pb-6">
                                        <SettingsIcon className="w-5 h-5 text-indigo-600" />
                                        <div>
                                            <h3 className="font-bold text-foreground">Kawalan Enjin AI Global</h3>
                                            <p className="text-xs text-muted-foreground mt-1">Gunakan fungsi ini sebagai 'Kill-Switch' jika had token sudah mencapai maksimum.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border">
                                            <div>
                                                <p className="text-sm font-black text-foreground">Pembantu AI (Floating Chat)</p>
                                                <p className="text-[11px] text-muted-foreground font-medium mt-1">Buka/Tutup AI Chat terapung untuk ahli.</p>
                                            </div>
                                            <Button onClick={() => toggleSetting('allow_ai_chat', settings.allow_ai_chat)} size="sm"
                                                className={cn('rounded-full font-black text-[11px] w-20 transition-all',
                                                    settings.allow_ai_chat ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                                                {settings.allow_ai_chat ? 'ON' : 'OFF'}
                                            </Button>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border">
                                            <div>
                                                <p className="text-sm font-black text-foreground">Enjin Nexus AI</p>
                                                <p className="text-[11px] text-muted-foreground font-medium mt-1">Buka/Tutup penjana bajet & analisis AI dashboard.</p>
                                            </div>
                                            <Button onClick={() => toggleSetting('allow_ai_budget', settings.allow_ai_budget)} size="sm"
                                                className={cn('rounded-full font-black text-[11px] w-20 transition-all',
                                                    settings.allow_ai_budget ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                                                {settings.allow_ai_budget ? 'ON' : 'OFF'}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3 mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p className="text-xs font-medium leading-relaxed">
                                            <strong>Nota Pembangun:</strong> Metrik token di atas kini merupakan <span className="font-bold">Bacaan Sebenar</span> yang diambil *live* dari panggilan server Supabase Edge Function Gemini. Integriti dan limitasi token masih kekal diuruskan sepenuhnya oleh pangkalan data.
                                        </p>
                                    </div>
                                </Card>

                                {/* AI Anti-Spam Control */}
                                <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8">
                                    <div className="flex items-center gap-3 mb-8 border-b border-border pb-6">
                                        <ShieldCheck className="w-5 h-5 text-rose-600" />
                                        <div>
                                            <h3 className="font-bold text-foreground">Kawalan Anti-Spam (Rate Limit)</h3>
                                            <p className="text-xs text-muted-foreground mt-1">Lindungi token API daripada penyalahgunaan oleh pelajar secara automatik.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                    <p className="text-sm font-black text-amber-900">Had Amaran (Warning)</p>
                                                </div>
                                                <Button onClick={() => updateSpamThreshold('warning')} size="sm" variant="outline" className="h-7 text-[10px] rounded-lg">Ubah</Button>
                                            </div>
                                            <p className="text-[11px] text-amber-700/80 mb-2 mt-1">Sistem akan memberi amaran automatik selepas mencapai had ini.</p>
                                            <p className="text-3xl font-black text-amber-600 tabular-nums">{settings.ai_spam_warning_threshold || 30} <span className="text-[10px] font-bold tracking-widest text-amber-600/50 uppercase">chat/hari</span></p>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Lock className="w-4 h-4 text-rose-600" />
                                                    <p className="text-sm font-black text-rose-900">Had Sekatan (Block/Flag)</p>
                                                </div>
                                                <Button onClick={() => updateSpamThreshold('block')} size="sm" variant="outline" className="h-7 text-[10px] rounded-lg border-rose-200">Ubah</Button>
                                            </div>
                                            <p className="text-[11px] text-rose-700/80 mb-2 mt-1">Sistem akan terus menyekat ("Flagged") sebarang chat AI selepas had ini.</p>
                                            <p className="text-3xl font-black text-rose-600 tabular-nums">{settings.ai_spam_block_threshold || 50} <span className="text-[10px] font-bold tracking-widest text-rose-600/50 uppercase">chat/hari</span></p>
                                        </div>
                                    </div>

                                    {/* Suspicious Users List */}
                                    <h4 className="font-bold text-sm flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-muted-foreground" /> Kawalan Sistem Pintar (Quota & Spam)
                                    </h4>

                                        <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 col-span-1 md:col-span-2">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Wand2 className="w-4 h-4 text-indigo-600" />
                                                    <p className="text-sm font-black text-indigo-900">Ekonomi Token (Token Economy)</p>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-indigo-700/80 mb-4 mt-1">Sistem nilai harga bagi setiap servis kecerdasan buatan Nexus. Kitaran akan sentiasa di-reset pada 1hb setiap penukaran bulan.</p>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/50 backdrop-blur-sm dark:bg-card/50 p-4 rounded-xl border border-border/50">
                                              
                                              <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-3">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Bekalan Pelan PRO</p>
                                                <div className="flex justify-between items-end">
                                                  <span className="font-black text-lg text-indigo-600">{settings.ai_token_settings?.pro_tier_tokens ?? 1000}</span>
                                                  <Button onClick={() => updateAiTokenAllowance('pro_tier_tokens', 'PRO')} size="icon" variant="ghost" className="h-6 w-6"><SettingsIcon className="w-3" /></Button>
                                                </div>
                                              </div>

                                              <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-3">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Bekalan Pelan PERCUMA</p>
                                                <div className="flex justify-between items-end">
                                                  <span className="font-black text-lg text-slate-600">{settings.ai_token_settings?.free_tier_tokens ?? 200}</span>
                                                  <Button onClick={() => updateAiTokenAllowance('free_tier_tokens', 'PERCUMA')} size="icon" variant="ghost" className="h-6 w-6"><SettingsIcon className="w-3" /></Button>
                                                </div>
                                              </div>

                                              <div className="flex flex-col gap-1 border-r border-border pr-3">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Kos Kertas Kerja (PRO)</p>
                                                <div className="flex justify-between items-end">
                                                  <span className="font-black text-lg text-amber-600">{settings.ai_token_settings?.costs?.pro_kertas_kerja ?? 50}</span>
                                                  <Button onClick={() => updateAiTokenCost('pro_kertas_kerja', 'Janaan Kertas Kerja Pro')} size="icon" variant="ghost" className="h-6 w-6"><SettingsIcon className="w-3" /></Button>
                                                </div>
                                              </div>

                                              <div className="flex flex-col gap-1">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Kos Kertas Kerja (FLASH)</p>
                                                <div className="flex justify-between items-end">
                                                  <span className="font-black text-lg text-cyan-600">{settings.ai_token_settings?.costs?.flash_kertas_kerja ?? 20}</span>
                                                  <Button onClick={() => updateAiTokenCost('flash_kertas_kerja', 'Janaan Kertas Kerja Flash')} size="icon" variant="ghost" className="h-6 w-6"><SettingsIcon className="w-3" /></Button>
                                                </div>
                                              </div>

                                              <div className="flex flex-col gap-1 md:border-r border-border md:pr-3 mt-3">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Kos Analisis Kelab</p>
                                                <div className="flex justify-between items-end">
                                                  <span className="font-black text-lg text-rose-600">{settings.ai_token_settings?.costs?.analisis ?? 5}</span>
                                                  <Button onClick={() => updateAiTokenCost('analisis', 'Analisis Kelab/Review')} size="icon" variant="ghost" className="h-6 w-6"><SettingsIcon className="w-3" /></Button>
                                                </div>
                                              </div>

                                              <div className="flex flex-col gap-1 mt-3">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Kos Semak Tatabahasa</p>
                                                <div className="flex justify-between items-end">
                                                  <span className="font-black text-lg text-emerald-600">{settings.ai_token_settings?.costs?.semak_ejaan === 0 ? 'FREE' : (settings.ai_token_settings?.costs?.semak_ejaan ?? 0)}</span>
                                                  <Button onClick={() => updateAiTokenCost('semak_ejaan', 'Semakan Tatabahasa Laporan')} size="icon" variant="ghost" className="h-6 w-6"><SettingsIcon className="w-3" /></Button>
                                                </div>
                                              </div>

                                            </div>
                                        </div>

                                    <div className="space-y-4 mt-8">
                                      <h4 className="font-bold text-sm flex items-center gap-2">
                                          <Users className="w-4 h-4 text-muted-foreground" /> Senarai Pengguna Disyaki ({suspiciousUsers.length})
                                      </h4>
                                          
                                      {suspiciousUsers.length === 0 ? (
                                            <div className="p-8 text-center border border-dashed border-border rounded-3xl bg-muted/20 flex flex-col items-center">
                                                <CheckCheck className="w-8 h-8 text-emerald-500 mb-2 opacity-50" />
                                                <p className="text-sm font-bold text-muted-foreground">Tiada pengguna ditandai (flagged)</p>
                                                <p className="text-[11px] text-muted-foreground/60 mt-1">Penggunaan AI setakat ini terkawal.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border border border-border rounded-3xl overflow-hidden bg-card">
                                                {suspiciousUsers.map(u => (
                                                    <div key={u.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold">{u.full_name || u.email}</p>
                                                                {u.ai_status === 'permanent_ban' && <Badge className="bg-rose-600 text-white border-none text-[9px] uppercase">BAN KEKAL</Badge>}
                                                                {u.ai_status === 'flagged' && <Badge className="bg-orange-500 text-white border-none text-[9px] uppercase">FLAGGED</Badge>}
                                                                {u.ai_status === 'warned' && <Badge className="bg-amber-400 text-black border-none text-[9px] uppercase">WARNED</Badge>}
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground font-medium mt-1">
                                                                Penggunaan AI: <strong className="text-foreground">{u.ai_daily_usage} / {settings.ai_spam_block_threshold || 50}</strong> kali hari ini.
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            {(u.ai_status === 'flagged' || u.ai_status === 'permanent_ban' || u.ai_status === 'warned') && (
                                                                <Button size="sm" onClick={() => handleActionSpamUser(u.id, 'unban')} className="h-8 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-[10px] font-black uppercase tracking-wider">
                                                                    Lepaskan
                                                                </Button>
                                                            )}
                                                            {u.ai_status !== 'permanent_ban' && (
                                                                <Button size="sm" onClick={() => handleActionSpamUser(u.id, 'permanent_ban')} className="h-8 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-[10px] font-black uppercase tracking-wider">
                                                                    Sekat Kekal
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* ── TAB: PENGURUSAN PELAJAR ── */}
                        {activeTab === 'users' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Tier Requests (PRO Applications) */}
                                {tierRequests.length > 0 && (
                                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8">
                                        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                                            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                                                <Sparkles className="w-5 h-5 fill-current" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-foreground">Permohonan Pelan PRO</h3>
                                                <p className="text-xs text-muted-foreground mt-1">Senarai pelajar yang memohon untuk naik taraf bagi mendapatkan kapasiti penjanaan lebih tinggi.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {tierRequests.map((req) => (
                                                <div key={req.id} className="p-5 rounded-2xl border border-border bg-muted/20 relative">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <p className="text-sm font-bold">{req.profiles?.full_name || 'Pelajar'}</p>
                                                            <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(req.created_at), 'dd MMM yyyy, h:mm a')}</p>
                                                        </div>
                                                        <Badge variant="outline" className={cn(
                                                            "text-[9px] uppercase tracking-widest border-none",
                                                            req.status === 'PENDING' ? 'bg-amber-500/20 text-amber-600' :
                                                            req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-600' :
                                                            'bg-rose-500/20 text-rose-600'
                                                        )}>
                                                            {req.status}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="p-3 bg-card rounded-xl border border-border/50 text-xs mb-4">
                                                        <span className="font-bold text-muted-foreground block mb-1">Justifikasi:</span>
                                                        <span className="italic text-foreground/80">"{req.reason}"</span>
                                                    </div>

                                                    {req.status === 'PENDING' && (
                                                        <div className="flex gap-2">
                                                            <Button onClick={() => handleTierApprove(req.id, req.user_id, 'PRO')} size="sm" className="flex-1 h-9 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white">Luluskan</Button>
                                                            <Button onClick={() => handleTierReject(req.id)} size="sm" variant="outline" className="flex-1 h-9 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">Tolak</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* User Search & Edit */}
                                <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-pink-500/10 rounded-2xl text-pink-500">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-foreground">Pangkalan Data Pelajar</h3>
                                                <p className="text-xs text-muted-foreground mt-1">Urus langganan dan status pengguna secara manual.</p>
                                            </div>
                                        </div>
                                        <div className="relative max-w-xs w-full">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            <Input 
                                                placeholder="Cari nama atau emel..." 
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                                className="pl-9 h-11 rounded-2xl bg-muted/40 border-border/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left whitespace-nowrap">
                                            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-l-xl">Nama / Emel</th>
                                                    <th className="px-4 py-3">Tier Langganan</th>
                                                    <th className="px-4 py-3">Baki Token</th>
                                                    <th className="px-4 py-3 rounded-r-xl w-32 text-center">Tindakan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allUsers.filter(u => 
                                                    (u.full_name?.toLowerCase() || '').includes(userSearch.toLowerCase()) || 
                                                    (u.email?.toLowerCase() || '').includes(userSearch.toLowerCase())
                                                ).slice(0, 50).map((user) => (
                                                    <tr key={user.id} className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                                                        <td className="px-4 py-4">
                                                            <div className="font-bold text-foreground">{user.full_name || 'Pelajar'}</div>
                                                            <div className="text-[11px] text-muted-foreground">{user.email}</div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <Badge variant="outline" className={cn(
                                                                "border-none text-[9px] uppercase tracking-widest max-w-min",
                                                                user.subscription_tier === 'PRO' ? "bg-indigo-500/20 text-indigo-600" : "bg-slate-500/20 text-slate-600"
                                                            )}>
                                                                {user.subscription_tier || 'FREE'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-4 font-black">
                                                            {user.ai_token_balance || 0} <span className="text-[10px] text-muted-foreground font-medium">Tk</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            {user.subscription_tier !== 'PRO' ? (
                                                                <Button 
                                                                    onClick={async () => {
                                                                        if(confirm(`Naik taraf ${user.full_name} ke PRO?`)) {
                                                                            await supabase.rpc('update_user_ai_tier', { target_user_id: user.id, new_tier: 'PRO' });
                                                                            fetchAdminData();
                                                                        }
                                                                    }}
                                                                    size="sm" 
                                                                    className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-black"
                                                                >
                                                                    Buat PRO
                                                                </Button>
                                                            ) : (
                                                                <Button 
                                                                    onClick={async () => {
                                                                        if(confirm(`Turun taraf ${user.full_name} ke FREE?`)) {
                                                                            await supabase.rpc('update_user_ai_tier', { target_user_id: user.id, new_tier: 'FREE' });
                                                                            fetchAdminData();
                                                                        }
                                                                    }}
                                                                    size="sm" 
                                                                    variant="outline"
                                                                    className="h-8 rounded-lg text-[10px] uppercase font-black border-slate-300 hover:bg-slate-100"
                                                                >
                                                                    Buat FREE
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {allUsers.length > 50 && userSearch === '' && (
                                            <p className="text-center text-xs text-muted-foreground mt-4 italic">Memaparkan 50 pengguna pertama. Sila gunakan carian untuk mencari pengguna spesifik.</p>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* ── TAB: PENGURUSAN KELAB ── */}
                        {activeTab === 'management' && (
                            <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Settings Panel */}
                                <div className="p-8 rounded-[2.5rem] bg-card shadow-sm border-none flex flex-col gap-6">
                                    <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                                        <ShieldCheck className="w-6 h-6 text-violet-600" />
                                        <h3 className="font-bold text-foreground text-lg">Kawalan Akses Sistem</h3>
                                    </div>

                                    {/* PDF Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-black text-foreground leading-tight">Laporan Auto-Jana PDF</p>
                                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Benarkan ahli menjana PDF laporan.</p>
                                        </div>
                                        <Button onClick={() => toggleSetting('allow_auto_pdf', settings.allow_auto_pdf)} size="sm"
                                            className={cn('rounded-full font-black text-[11px] w-16 transition-all',
                                                settings.allow_auto_pdf ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                                            {settings.allow_auto_pdf ? 'ON' : 'OFF'}
                                        </Button>
                                    </div>

                                    {/* Takwim Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-black text-foreground leading-tight">Tambah Takwim Rasmi</p>
                                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Buka daftar program takwim baru.</p>
                                        </div>
                                        <Button onClick={() => toggleSetting('allow_add_takwim', settings.allow_add_takwim)} size="sm"
                                            className={cn('rounded-full font-black text-[11px] w-16 transition-all',
                                                settings.allow_add_takwim ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                                            {settings.allow_add_takwim ? 'ON' : 'OFF'}
                                        </Button>
                                    </div>

                                    {/* Accept All */}
                                    <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                        <div>
                                            <p className="text-sm font-black text-foreground leading-tight flex items-center gap-1.5">
                                                <CheckCheck className="w-4 h-4 text-emerald-500" /> Terima Semua Permohonan
                                            </p>
                                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Aktif semasa Karnival Perpaduan.</p>
                                        </div>
                                        <Button onClick={() => setShowBulkAccept(true)} size="sm"
                                            className="rounded-full font-black text-[11px] px-5 bg-emerald-500 text-white hover:bg-emerald-600">
                                            Luluskan Pukal
                                        </Button>
                                    </div>

                                    {/* Had Keahlian */}
                                    <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                        <div>
                                            <p className="text-sm font-black text-foreground leading-tight">Had Keahlian Kelab</p>
                                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Maks kelab per pelajar (1–10).</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button onClick={() => updateClubLimit(-1)} size="icon" variant="outline"
                                                disabled={Number(settings.max_clubs_per_student) <= 1}
                                                className="h-10 w-10 rounded-xl font-black text-lg border-border hover:bg-muted disabled:opacity-30">
                                                −
                                            </Button>
                                            <span className="font-black text-2xl text-foreground w-8 text-center tabular-nums">
                                                {settings.max_clubs_per_student ?? 2}
                                            </span>
                                            <Button onClick={() => updateClubLimit(1)} size="icon" variant="outline"
                                                disabled={Number(settings.max_clubs_per_student) >= 10}
                                                className="h-10 w-10 rounded-xl font-black text-lg border-border hover:bg-muted disabled:opacity-30">
                                                +
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Tambah Kelab */}
                                <div className="p-6 rounded-[2.5rem] bg-violet-500/10 border border-violet-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-card shadow-sm flex items-center justify-center text-violet-600">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-violet-900">Urus Senarai Kelab</p>
                                            <p className="text-[11px] font-medium text-violet-600/80 mt-1">Tambah kelab baharu secara pantas</p>
                                        </div>
                                    </div>
                                    <Button onClick={() => setShowAddClub(true)} 
                                        className="rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] px-6 gap-2">
                                        <Plus className="w-4 h-4" /> Tambah 
                                    </Button>
                                </div>

                                {/* Purge */}
                                <div className="p-6 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-card shadow-sm flex items-center justify-center text-rose-500">
                                            <Trash2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-rose-900">Pembersihan Rekod</p>
                                            <p className="text-[11px] font-medium text-rose-500 mt-1">{loading ? '...' : `${stats.rejectedReports} laporan ditolak`}</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleCleanRejected} disabled={isCleaning || stats.rejectedReports === 0 || loading}
                                        className="rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] px-6">
                                        {isCleaning ? 'PADAM...' : 'PADAM'}
                                    </Button>
                                </div>

                                {/* Pembubaran Kohort Badan Beruniform */}
                                <div className="p-6 rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-card shadow-sm flex items-center justify-center text-amber-600">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-amber-900">Pembubaran Kohort</p>
                                            <p className="text-[11px] font-medium text-amber-600 mt-1">Padam semua ahli kelab Badan Beruniform</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleBubarKohort} disabled={isCleaning} 
                                        className="rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-6 gap-2">
                                        <Trash2 className="w-4 h-4" /> Bubar
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: LOG ── */}
                        {activeTab === 'logs' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                    <div className="relative w-full md:w-96">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Cari log (Nama kelab, deskripsi, jenis)..." 
                                            value={logSearch}
                                            onChange={(e) => setLogSearch(e.target.value)}
                                            className="pl-11 h-12 rounded-2xl bg-card border-border/40 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                        <ShieldCheck size={14} className="text-emerald-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Audit Siber Aktif</span>
                                    </div>
                                </div>

                                <Card className="border-none shadow-sm rounded-[2.5rem] bg-card overflow-hidden">
                                    <CardHeader className="px-8 pt-8 pb-6 border-b border-border/50 bg-muted/20">
                                        <CardTitle className="text-xl font-bold flex items-center gap-3">
                                            <Database className="w-6 h-6 text-emerald-500" /> Log Transaksi / Audit Siber Global
                                        </CardTitle>
                                        <p className="text-xs font-medium text-muted-foreground mt-1">Senarai penuh jejak rekod perubahan dan transaksi AI di seluruh kelab.</p>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-border">
                                            {globalLogs.filter(log => {
                                                const club = ALL_CLUBS.find(c => c.id === log.club_id);
                                                const searchStr = `${log.description} ${log.action_type ?? 'AKTIVITI'} ${log.actor_name} ${club?.shortName || ''}`.toLowerCase();
                                                return searchStr.includes(logSearch.toLowerCase());
                                            }).length === 0 ? (
                                                <div className="p-20 text-center text-muted-foreground italic text-sm">Tiada log sepadan dengan carian anda.</div>
                                            ) : (
                                                globalLogs.filter(log => {
                                                    const club = ALL_CLUBS.find(c => c.id === log.club_id);
                                                    const searchStr = `${log.description} ${log.action_type ?? 'AKTIVITI'} ${log.actor_name} ${club?.shortName || ''}`.toLowerCase();
                                                    return searchStr.includes(logSearch.toLowerCase());
                                                }).map((log) => {
                                                    const club = ALL_CLUBS.find(c => c.id === log.club_id);
                                                    const isCritical = log.action_type?.includes('DELETE') || log.action_type?.includes('REJECT') || log.action_type?.includes('DISSOLVED');
                                                    const isSuccess = log.action_type?.includes('CREATE') || log.action_type?.includes('APPROVE') || log.action_type?.includes('SUCCESS');

                                                    return (
                                                        <div key={log.id} className="px-8 py-5 flex items-start gap-5 hover:bg-muted/50 transition-colors group">
                                                            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110',
                                                                isCritical ? 'bg-rose-500/10 text-rose-500' : 
                                                                isSuccess ? 'bg-emerald-500/10 text-emerald-600' :
                                                                'bg-blue-500/10 text-blue-500')}>
                                                                {isCritical ? <AlertTriangle size={20} /> : isSuccess ? <CheckCheck size={20} /> : <Activity size={20} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Badge className={cn('text-[10px] font-black uppercase px-2.5 py-0.5 border-none',
                                                                        isCritical ? 'bg-rose-600 text-white' : 
                                                                        isSuccess ? 'bg-emerald-600 text-white' :
                                                                        'bg-slate-900 text-white')}>
                                                                        {(log.action_type ?? 'AKTIVITI').replace(/_/g, ' ')}
                                                                    </Badge>
                                                                    <Badge variant="outline" className="text-[10px] font-bold border-border text-muted-foreground bg-muted/30">
                                                                        {club?.shortName || 'SISTEM'}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm font-bold text-foreground leading-snug">{log.description}</p>
                                                                <div className="flex items-center gap-2 mt-3">
                                                                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                                        <Users className="w-3.5 h-3.5 opacity-50" /> Oleh: <span className="text-foreground font-black uppercase tracking-tight">{log.actor_name}</span>
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground/30">•</span>
                                                                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                                        <Clock size={12} className="opacity-50" />
                                                                        {format(new Date(log.created_at), 'HH:mm • d MMM yyyy', { locale: ms })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}