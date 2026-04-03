import React, { useEffect, useState } from 'react';
import {
    ShieldCheck, Database, Users, Trash2, FileWarning, Activity,
    RefreshCw, ChevronRight, LayoutGrid, Server, Info, Lock,
    Plus, CheckCheck, Building2, Palette
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

    const [stats, setStats] = useState({
        totalUsers: 0, totalReports: 0, totalActivities: 0,
        pendingUsers: 0, rejectedReports: 0, storageMB: 0, storageLimit: 5120,
    });

    const [chartData, setChartData] = useState<{
        activeClubs: { name: string; count: number }[];
        reportStats: { name: string; value: number; color: string }[];
    }>({ activeClubs: [], reportStats: [] });

    const [globalLogs, setGlobalLogs] = useState<any[]>([]);
    const [settings, setSettings] = useState<Record<string, any>>({
        allow_auto_pdf: true,
        allow_add_takwim: true,
        max_clubs_per_student: 2,
    });

    const [showAddClub, setShowAddClub] = useState(false);
    const [newClub, setNewClub] = useState({
        name: '', short_name: '', category: 'Umum', theme_color: '#6366f1', description: ''
    });
    const [addingClub, setAddingClub] = useState(false);
    
    // Bulk Accept Scoped
    const [showBulkAccept, setShowBulkAccept] = useState(false);
    const [bulkClubId, setBulkClubId] = useState<string>('ALL');

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
            const { data: logs } = await supabase.from('club_logs').select('*').order('created_at', { ascending: false }).limit(8);
            setStats({
                totalUsers: users.count || 0, totalReports: reports.count || 0,
                totalActivities: activities.count || 0, pendingUsers: pending.count || 0,
                rejectedReports: rejected.count || 0,
                storageMB: storageData?.[0]?.total_mb || 0,
                storageLimit: storageData?.[0]?.limit_mb || 5120,
            });
            const { data: settingsData } = await supabase.from('system_settings').select('*');
            if (settingsData) {
                const s: Record<string, any> = { allow_auto_pdf: true, allow_add_takwim: true, max_clubs_per_student: 2 };
                settingsData.forEach(item => { s[item.key] = item.value; });
                setSettings(s);
            }
            setGlobalLogs(logs || []);
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
        const newValue = !currentValue;
        const toastId = toast.loading('Mengemaskini tetapan...');
        try {
            const { data, error } = await supabase.from('system_settings').update({ value: newValue }).eq('key', key).select();
            if (error) throw error;
            if (!data || data.length === 0) await supabase.from('system_settings').insert({ key, value: newValue });
            setSettings(s => ({ ...s, [key]: newValue }));
            toast.success('Tetapan dikemaskini', { id: toastId });
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
            // Get all Badan Beruniform club ids
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

    return (
        <>
            {/* ── MODAL LULUS PUKAL ── */}
            <Dialog open={showBulkAccept} onOpenChange={setShowBulkAccept}>
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

            {/* ── MODAL TAMBAH KELAB ── */}
            <Dialog open={showAddClub} onOpenChange={setShowAddClub}>
                <DialogContent className="rounded-[2rem] max-w-md">
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
                        {/* Preview */}
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

                <div className="max-w-7xl mx-auto px-6 mt-10 space-y-10">
                    <header>
                        <h1 className="text-4xl font-black tracking-tight text-foreground">Status Sistem</h1>
                        <p className="text-muted-foreground font-medium mt-1">Laporan kesihatan infrastruktur dan aktiviti global hari ini.</p>
                    </header>

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

                    {/* Bottom Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Panel */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Storage */}
                            <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600"><Server className="w-5 h-5" /></div>
                                    <h3 className="font-bold text-foreground">Storan Data</h3>
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
                                            <span>Kapasiti Cloud</span>
                                            <span>{storagePercentage.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={storagePercentage} className="h-2.5 bg-muted rounded-full [&>div]:bg-blue-600" />
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/20 border border-border flex items-start gap-3">
                                        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                                            Data storan dikemaskini secara langsung. Sistem akan menghantar amaran e-mel jika penggunaan melebihi 90%.
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Purge */}
                            <div className="p-6 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-card shadow-sm flex items-center justify-center text-rose-500">
                                        <Trash2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-rose-900">Pembersihan Rekod</p>
                                        <p className="text-[10px] font-medium text-rose-500">{loading ? '...' : `${stats.rejectedReports} laporan ditolak`}</p>
                                    </div>
                                </div>
                                <Button onClick={handleCleanRejected} disabled={isCleaning || stats.rejectedReports === 0 || loading}
                                    size="sm" className="rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] px-6">
                                    {isCleaning ? 'PADAM...' : 'PADAM'}
                                </Button>
                            </div>

                            {/* Settings Panel */}
                            <div className="p-6 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-5">
                                <div className="flex items-center gap-3 border-b border-indigo-500/20 pb-3">
                                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-bold text-foreground text-sm">Kawalan Akses Sistem</h3>
                                </div>

                                {/* PDF Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black text-indigo-900 leading-tight uppercase tracking-wider">Laporan Auto-Jana PDF</p>
                                        <p className="text-[10px] text-indigo-500 font-bold mt-0.5">Benarkan ahli menjana PDF laporan</p>
                                    </div>
                                    <Button onClick={() => toggleSetting('allow_auto_pdf', settings.allow_auto_pdf)} size="sm"
                                        className={cn('rounded-full font-black text-[10px] w-16 transition-all',
                                            settings.allow_auto_pdf ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                                        {settings.allow_auto_pdf ? 'ON' : 'OFF'}
                                    </Button>
                                </div>

                                {/* Takwim Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black text-indigo-900 leading-tight uppercase tracking-wider">Tambah Takwim Rasmi</p>
                                        <p className="text-[10px] text-indigo-500 font-bold mt-0.5">Buka daftar program takwim baru</p>
                                    </div>
                                    <Button onClick={() => toggleSetting('allow_add_takwim', settings.allow_add_takwim)} size="sm"
                                        className={cn('rounded-full font-black text-[10px] w-16 transition-all',
                                            settings.allow_add_takwim ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                                        {settings.allow_add_takwim ? 'ON' : 'OFF'}
                                    </Button>
                                </div>

                                {/* Accept All */}
                                <div className="flex items-center justify-between pt-3 border-t border-indigo-500/10">
                                    <div>
                                        <p className="text-xs font-black text-indigo-900 leading-tight uppercase tracking-wider flex items-center gap-1.5">
                                            <CheckCheck className="w-3.5 h-3.5" /> Terima Semua Permohonan
                                        </p>
                                        <p className="text-[10px] text-indigo-500 font-bold mt-0.5">Aktif semasa Karnival Perpaduan</p>
                                    </div>
                                    <Button onClick={() => setShowBulkAccept(true)} size="sm"
                                        className="rounded-full font-black text-[10px] px-4 bg-emerald-500 text-white hover:bg-emerald-600">
                                        Luluskan Pukal
                                    </Button>
                                </div>

                                {/* Had Keahlian */}
                                <div className="flex items-center justify-between pt-3 border-t border-indigo-500/10">
                                    <div>
                                        <p className="text-xs font-black text-indigo-900 leading-tight uppercase tracking-wider">Had Keahlian Kelab</p>
                                        <p className="text-[10px] text-indigo-500 font-bold mt-0.5">Maks kelab per pelajar (1–10)</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button onClick={() => updateClubLimit(-1)} size="icon" variant="outline"
                                            disabled={Number(settings.max_clubs_per_student) <= 1}
                                            className="h-9 w-9 rounded-xl font-black text-base border-indigo-300 hover:bg-indigo-500/10 disabled:opacity-30">
                                            −
                                        </Button>
                                        <span className="font-black text-2xl text-indigo-900 w-8 text-center tabular-nums">
                                            {settings.max_clubs_per_student ?? 2}
                                        </span>
                                        <Button onClick={() => updateClubLimit(1)} size="icon" variant="outline"
                                            disabled={Number(settings.max_clubs_per_student) >= 10}
                                            className="h-9 w-9 rounded-xl font-black text-base border-indigo-300 hover:bg-indigo-500/10 disabled:opacity-30">
                                            +
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Tambah Kelab */}
                            <div className="p-6 rounded-[2.5rem] bg-violet-500/10 border border-violet-500/20 flex items-center justify-between mt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-card shadow-sm flex items-center justify-center text-violet-600">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-violet-900">Urus Senarai Kelab</p>
                                        <p className="text-[10px] font-medium text-violet-500">Tambah kelab baharu tanpa buka database</p>
                                    </div>
                                </div>
                                <Button onClick={() => setShowAddClub(true)} size="sm"
                                    className="rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] px-5 gap-1.5">
                                    <Plus className="w-3.5 h-3.5" /> Tambah Kelab
                                </Button>
                            </div>

                            {/* Pembubaran Kohort Badan Beruniform */}
                            <div className="p-6 rounded-[2.5rem] bg-orange-500/10 border border-orange-500/20 flex items-center justify-between mt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-card shadow-sm flex items-center justify-center text-orange-500">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-orange-900">Pembubaran Kohort</p>
                                        <p className="text-[10px] font-medium text-orange-600">Padam semua ahli kelab Badan Beruniform</p>
                                    </div>
                                </div>
                                <Button onClick={handleBubarKohort} disabled={isCleaning} size="sm"
                                    className="rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] px-5 gap-1.5">
                                    <Trash2 className="w-3.5 h-3.5" /> Bubar
                                </Button>
                            </div>
                        </div>

                        {/* Right: Audit Logs */}
                        <div className="lg:col-span-7">
                            <Card className="border-none shadow-sm rounded-[2.5rem] bg-card h-full overflow-hidden">
                                <CardHeader className="px-8 pt-8 pb-4">
                                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                                        <Database className="w-5 h-5 text-blue-500" /> Log Transaksi Global
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border">
                                        {globalLogs.map((log) => {
                                            const club = ALL_CLUBS.find(c => c.id === log.club_id);
                                            return (
                                                <div key={log.id} className="px-8 py-5 flex items-start gap-4 hover:bg-muted/50 transition-colors">
                                                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                                                        log.action_type?.includes('REJECT') ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500')}>
                                                        <Activity className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge className="text-[10px] font-black uppercase px-2 py-0 bg-slate-900 text-white border-none">
                                                                {log.action_type?.replace('_', ' ') || 'AKTIVITI'}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-[10px] font-bold border-border text-muted-foreground">
                                                                {club?.shortName || 'SISTEM'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[13px] font-bold text-foreground leading-snug">{log.description}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                                <Users size={10} /> Oleh: <span className="text-foreground font-bold ml-1">{log.actor_name}</span>
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground/30">•</span>
                                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                                {format(new Date(log.created_at), 'HH:mm • d MMM yyyy', { locale: ms })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-border self-center shrink-0" />
                                                </div>
                                            );
                                        })}
                                        {globalLogs.length === 0 && !loading && (
                                            <div className="py-20 text-center text-muted-foreground/40 font-medium text-sm italic">
                                                Tiada rekod aktiviti dikesan.
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}