import React, { useEffect, useState, useCallback } from 'react';
import {
    ShieldCheck, Database, Users, Trash2, FileWarning, Activity,
    RefreshCw, ChevronRight, LayoutGrid, Server, Info, Lock,
    Plus, CheckCheck, Building2, Palette, Cpu, Settings as SettingsIcon,
    Sparkles, AlertTriangle, Search, Clock, Shield, Wand2, CalendarRange, Brain, MessageSquare,
    FileText, CalendarDays, Ticket, Star, RotateCcw, Globe, Crown, Store, X, Check, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ALL_CLUBS, ROLE_LABELS, ROLE_COLORS, JPP_MT_POSITIONS } from '@/types';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { KeusahawananAdminPanel } from '@/pages/keusahawanan/KeusahawananAdminPanel';

const ADD_CLUB_CATEGORIES = ['Akademik', 'Umum', 'Sukan', 'Badan Beruniform'];
const ADD_CLUB_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export function JppAdminPage() {
    const { isSuperAdmin, profile, hasKppAccess, hasKeusahawananAccess } = useAuth();
    
    // ── RBAC Variables ─────────────────────────────────────────────────────
    const isJppRole = profile?.role === 'JPP';
    const isMTUser  = !!profile?.jpp_position && JPP_MT_POSITIONS.includes(profile.jpp_position as any);
    const isKppExco = profile?.jpp_unit === 'KPP'; // Exco JPP unit KPP
    const isYDP = profile?.jpp_position === 'YANG_DIPERTUA' || isSuperAdmin;

    // ── Tab List (role-based) ───────────────────────────────────────────────
    let availableTabs = [];
    if (isSuperAdmin) {
        // HEP / Developer — akses penuh sistem
        availableTabs = [
            { id: 'kpp',             label: 'Dashboard KPP',          icon: Activity     },
            { id: 'keusahawanan',    label: 'Dashboard Keusahawanan', icon: Store        },
            { id: 'ai',              label: 'Nexus Hub',              icon: Sparkles     },
            { id: 'users',           label: 'Pelajar',                icon: Users        },
            { id: 'jpp',             label: 'Ahli JPP',               icon: Crown        },
            { id: 'logs',            label: 'Audit Log',              icon: FileWarning  },
            { id: 'takwim',          label: 'Takwim Global',          icon: CalendarDays },
        ];
    } else {
        // Untuk pengguna biasa/JPP
        if (hasKppAccess) {
            availableTabs.push({ id: 'kpp', label: 'Dashboard KPP', icon: LayoutGrid });
        }
        if (hasKeusahawananAccess) {
            availableTabs.push({ id: 'keusahawanan', label: 'Dashboard Keusahawanan', icon: Store });
        }
        
        // JPP biasa atau MT yang bukan overseer, semua boleh tengok
        availableTabs.push({ id: 'users', label: 'Pangkalan Data Pelajar', icon: Users });
        availableTabs.push({ id: 'jpp', label: 'Ahli JPP', icon: Crown });
        availableTabs.push({ id: 'takwim', label: 'Takwim Global', icon: CalendarDays });
        
        // Log Audit based on access
        if (hasKppAccess || hasKeusahawananAccess) {
            availableTabs.push({ id: 'logs', label: 'Log Audit', icon: FileWarning });
        }
    }


    const [loading, setLoading] = useState(true);
    const [isCleaning, setIsCleaning] = useState(false);
    const [globalLogs, setGlobalLogs] = useState<any[]>([]);
    const [aiLogs, setAiLogs] = useState<any[]>([]);
    const [logView, setLogView] = useState<'club' | 'ai'>('club');
    const [suspiciousUsers, setSuspiciousUsers] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [tierRequests, setTierRequests] = useState<any[]>([]);
    const [pendingLeaderRequests, setPendingLeaderRequests] = useState<any[]>([]);
    const [showPendingLeadersDialog, setShowPendingLeadersDialog] = useState(false);
    
    // KPP Activity Popout
    const [showAktivitiPopout, setShowAktivitiPopout] = useState(false);
    const [aktivitiFilter, setAktivitiFilter] = useState<string>('ALL');
    const [aktivitiData, setAktivitiData] = useState<any[]>([]);
    const [aktivitiLoading, setAktivitiLoading] = useState(false);

    // KPP Monitoring States (tabs baharu: aktiviti, laporan, keahlian, kelab)
    const [kppClubFilter, setKppClubFilter] = useState<string>('ALL');
    const [allActivities, setAllActivities] = useState<any[]>([]);
    const [allReports, setAllReports] = useState<any[]>([]);
    const [allMemberships, setAllMemberships] = useState<any[]>([]);
    const [kppLoading, setKppLoading] = useState(false);
    const [reportSearch, setReportSearch] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    
    // TABS — initialize to first available tab for the role
    const [activeTab, setActiveTab] = useState(() => availableTabs[0]?.id ?? 'jpp');
    const [kppSubTab, setKppSubTab] = useState<'overview' | 'aktiviti' | 'laporan' | 'keahlian' | 'kelab' | 'management'>('overview');


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
        ai_rate_limit: { warning_threshold: 50, block_threshold: 65 }
    });

    const [showAddClub, setShowAddClub] = useState(false);
    const [newClub, setNewClub] = useState({
        name: '', short_name: '', category: 'Umum', theme_color: '#6366f1', description: ''
    });
    const [addingClub, setAddingClub] = useState(false);
    
    // Bulk Accept Scoped
    const [showBulkAccept, setShowBulkAccept] = useState(false);
    const [showClubDissolveDialog, setShowClubDissolveDialog] = useState(false);
    const [selectedDissolveClub, setSelectedDissolveClub] = useState<string>('');
    const [bulkClubId, setBulkClubId] = useState<string>('ALL');
    const [logSearch, setLogSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const { data: storageData } = await supabase.rpc('get_storage_stats');
            const [users, reports, activities, pendingProfiles, pendingMemberships, rejected] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('club_reports').select('*', { count: 'exact', head: true }),
                supabase.from('club_activities').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*')
                    .eq('account_status', 'PENDING')
                    .in('role', ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT']),
                supabase.from('student_club_memberships').select('*, profiles(*)')
                    .eq('account_status', 'PENDING')
                    .in('role', ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT']),
                supabase.from('club_reports').select('*', { count: 'exact', head: true }).eq('status', 'Ditolak'),
            ]);
            const { data: logs } = await supabase.from('club_logs').select('*').order('created_at', { ascending: false }).limit(20);
            const { data: ai_logs } = await supabase.from('ai_usage_logs').select('*, profiles(full_name, email, student_id)').order('created_at', { ascending: false }).limit(50);
            
            // Merge Data
            const combined: any[] = [...(pendingProfiles.data || []).map(p => ({ ...p, source: 'profile' }))];
            (pendingMemberships.data || []).forEach(m => {
                const existing = combined.find(c => c.id === m.user_id);
                if (existing) {
                    existing.source = 'both';
                    existing.membership_id = m.id;
                    existing.target_club_id = m.club_id;
                } else {
                    if (m.profiles) {
                        combined.push({
                            ...m.profiles,
                            id: m.user_id,
                            role: m.role,
                            source: 'membership',
                            membership_id: m.id,
                            target_club_id: m.club_id
                        });
                    }
                }
            });

            setPendingLeaderRequests(combined);
            setStats({
                totalUsers: users.count || 0, totalReports: reports.count || 0,
                totalActivities: activities.count || 0, pendingUsers: combined.length,
                rejectedReports: rejected.count || 0,
                storageMB: storageData?.[0]?.total_mb || 0,
                storageLimit: storageData?.[0]?.limit_mb || 5120,
            });
            const { data: settingsData } = await supabase.from('system_settings').select('*');
            if (settingsData) {
                const s: Record<string, any> = { 
                    allow_auto_pdf: true, 
                    allow_add_takwim: true, 
                    max_clubs_per_student: 2, 
                    allow_ai_chat: true, 
                    allow_ai_budget: true, 
                    ai_total_tokens: 0, 
                    ai_token_limit: 1000000,
                    ai_rate_limit: { warning_threshold: 50, block_threshold: 65 }
                };
                settingsData.forEach(item => { 
                    let val = item.value;
                    // Auto-parse boolean if string
                    if (val === 'true') val = true;
                    if (val === 'false') val = false;
                    s[item.key] = val; 
                });
                setSettings(s);
            }
            setGlobalLogs(logs || []);
            setAiLogs(ai_logs || []);
            
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
            const { data: reportStatusData } = await supabase.from('club_reports').select('status').eq('is_archived', false);
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
        if (!window.confirm('AMARAN KHAS: Anda pasti mahu BUBAR semua kohort untuk KESEMUA Kelab? Tindakan ini tidak boleh diundur. Semua MT akan menjadi ahli biasa, akaun tidak aktif > 6 bulan akan dipadam, dan laporan tidak lulus akan dibuang.')) return;
        setIsCleaning(true);
        const toastId = toast.loading('Membubarkan kohort secara menyeluruh...');
        try {
            const { error } = await supabase.rpc('rpc_pembubaran_kohort');
            if (error) throw error;
            
            toast.success('Pembubaran Kohort Keseluruhan Berjaya!', { id: toastId });
            fetchAdminData();
        } catch (e: any) {
            toast.error(e.message || 'Ralat semasa pembubaran', { id: toastId });
        } finally {
            setIsCleaning(false);
        }
    };

    const handleBubarKelabSpesifik = async () => {
        if (!selectedDissolveClub) return;
        const clubName = ALL_CLUBS.find(c => c.id === selectedDissolveClub)?.name || 'Kelab Terpilih';
        if (!window.confirm(`Adakah anda pasti mahu BUBAR kohort untuk ${clubName}? Tindakan ini tidak boleh diundur.`)) return;

        const toastId = toast.loading(`Membubarkan kohort ${clubName}...`);
        setIsCleaning(true);
        try {
            const clubId = selectedDissolveClub;

            // 1. Arkib aktiviti kelab yang selesai
            await supabase.from('club_activities')
                .update({ is_archived: true })
                .eq('club_id', clubId)
                .eq('status', 'selesai')
                .eq('is_archived', false);

            // 2. Arkib laporan kelab yang diluluskan
            await supabase.from('club_reports')
                .update({ is_archived: true })
                .eq('club_id', clubId)
                .eq('status', 'Diluluskan')
                .eq('is_archived', false);

            // 3. Arkib program kelab yang selesai
            await supabase.from('programs')
                .update({ is_archived: true })
                .eq('club_id', clubId)
                .eq('status', 'COMPLETED')
                .eq('is_archived', false);

            // 4. Padam aktiviti yang belum diarkib (draf/tidak lulus)
            await supabase.from('club_activities')
                .delete()
                .eq('club_id', clubId)
                .eq('is_archived', false);

            // 5. Padam laporan yang belum diarkib
            await supabase.from('club_reports')
                .delete()
                .eq('club_id', clubId)
                .eq('is_archived', false);

            // 6. Padam program yang belum diarkib
            await supabase.from('programs')
                .delete()
                .eq('club_id', clubId)
                .eq('is_archived', false);

            // 7. Demote semua MT/Presiden/Penasihat kelab ini kepada MEMBER
            await supabase.from('student_club_memberships')
                .update({ role: 'CLUB_MEMBER' })
                .eq('club_id', clubId)
                .neq('role', 'CLUB_MEMBER');

            // 8. Rekod log
            await supabase.from('club_logs').insert({
                action_type: 'COHORT_DISSOLVED',
                actor_name: 'SISTEM (JPP)',
                description: `Pembubaran Kohort ${clubName} telah dijalankan. Arkib dikemaskini dan MT di-reset.`,
                club_id: clubId,
            });

            toast.success(`Pembubaran Kohort ${clubName} Berjaya!`, { id: toastId });
            setShowClubDissolveDialog(false);
            setSelectedDissolveClub('');
            fetchAdminData();
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'Ralat semasa pembubaran kelab', { id: toastId });
        } finally {
            setIsCleaning(false);
        }
    };


    const handlePembersihanAkaun = async () => {
        if (!window.confirm('AMARAN KHAS: Padam secara kekal semua akaun pengguna yang tidak aktif lebih dari 6 bulan? (Termasuk rekod auth.users). Tindakan ini muktamad.')) return;

        const toastId = toast.loading('Memadam data akaun terbiar...');
        setIsCleaning(true);
        try {
            const { data, error } = await supabase.rpc('rpc_pembersihan_akaun_lama');
            if (error) throw error;
            toast.success(`Berjaya memadam ${data || 0} akaun terbiar!`, { id: toastId });
            fetchAdminData();
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'Ralat semasa pembersihan akaun', { id: toastId });
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
        const currentRateLimit = settings.ai_rate_limit || { warning_threshold: 50, block_threshold: 65 };
        const label = type === 'warning' ? 'Amaran (Amaran selepas X chat)' : 'Sekatan (Sekat selepas X chat)';
        const currentVal = type === 'warning' ? currentRateLimit.warning_threshold : currentRateLimit.block_threshold;
        
        const input = window.prompt(`Masukkan had ${label}:`, currentVal?.toString());
        if (!input) return;
        const newLimitValue = parseInt(input);
        if (isNaN(newLimitValue) || newLimitValue < 1) {
            toast.error("Nilai mesti nombor melebihi 0.");
            return;
        }

        const toastId = toast.loading('Mengemaskini had keselamatan...');
        try {
            const newRateLimit = { 
                ...currentRateLimit, 
                [type === 'warning' ? 'warning_threshold' : 'block_threshold']: newLimitValue 
            };
            
            const { error } = await supabase.from('system_settings')
                .upsert({ key: 'ai_rate_limit', value: newRateLimit }, { onConflict: 'key' });
                
            if (error) throw error;
            setSettings(s => ({ ...s, ai_rate_limit: newRateLimit }));
            toast.success(`Had ${type} dikemaskini ke ${newLimitValue}`, { id: toastId });
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
    const handleViewReceipt = async (path: string) => {
        const toastId = toast.loading('Membuka resit...');
        try {
            const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 60);
            if (error) throw error;
            toast.dismiss(toastId);
            window.open(data.signedUrl, '_blank');
        } catch (e: any) {
            toast.error('Gagal membuka resit: ' + e.message, { id: toastId });
        }
    };

    const handleTierApprove = async (reqId: string, userId: string, newTier: string, receiptPath: string | null) => {
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
            
            // Auto Delete Receipt from Storage to prevent blob bloat
            if (receiptPath && !receiptPath.includes('drive.google.com')) {
                 await supabase.storage.from('receipts').remove([receiptPath]);
            }
            
            // Notify User
            await supabase.from('notifications').insert({
                user_id: userId,
                title: 'Tahniah! Akaun PRO Berjaya',
                content: 'Permohonan Nexus AI PRO anda telah diluluskan. Anda kini menikmati kapasiti 1,000 Token pelan premium.',
                is_read: false
            });

            fetchAdminData();
        } catch (e: any) {
            toast.error(e.message || 'Terdapat ralat teknikal.', { id: toastId });
        }
    };

    const handleTierReject = async (reqId: string, receiptPath: string | null, userId: string) => {
        const toastId = toast.loading('Menolak permohonan...');
        try {
            const { error } = await supabase.from('ai_tier_requests').update({ status: 'REJECTED', updated_at: new Date() }).eq('id', reqId);
            if (error) throw error;
            
            // Cleanup deleted receipt
            if (receiptPath && !receiptPath.includes('drive.google.com')) {
                 await supabase.storage.from('receipts').remove([receiptPath]);
            }
            
            // Notify User
            await supabase.from('notifications').insert({
                user_id: userId,
                title: 'Permohonan PRO Ditolak',
                content: 'Harap maaf, permohonan PRO anda tidak melepasi piawaian semakan (Sebab: Masalah Resit/Pembayaran). Sila cuba lagi atau hubungi JPP.',
                is_read: false
            });

            toast.success('Permohonan telah ditolak.', { id: toastId });
            await fetchAdminData();
        } catch (e: any) {
            toast.error(e.message || 'Terdapat ralat teknikal.', { id: toastId });
        }
    };

    const handleLeaderStatusAction = async (userId: string, status: 'APPROVED' | 'REJECTED', membershipId?: string) => {
        const toastId = toast.loading(`${status === 'APPROVED' ? 'Meluluskan' : 'Menolak'} akaun pemimpin...`);
        try {
            if (status === 'REJECTED') {
                if (membershipId) {
                    await supabase.from('student_club_memberships').delete().eq('id', membershipId);
                } else {
                    await supabase.from('profiles').delete().eq('id', userId);
                }
            } else {
                // Approve Profile
                await supabase.from('profiles').update({ account_status: 'APPROVED' }).eq('id', userId);
                
                // Approve all leadership memberships for this user
                await supabase.from('student_club_memberships').update({ account_status: 'APPROVED' })
                    .eq('user_id', userId)
                    .in('role', ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT']);
                
                // Notify
                await supabase.from('notifications').insert({
                    user_id: userId,
                    title: 'Akaun/Kepimpinan Diluluskan',
                    content: 'Akaun anda dan permohonan jawatan kepimpinan telah disahkan oleh JPP. Sila log keluar dan masuk semula untuk melihat perubahan.',
                    is_read: false
                });
            }
            
            toast.success('Tindakan Berjaya', { id: toastId });
            await fetchAdminData();
        } catch (e: any) {
            toast.error(e.message || 'Terdapat ralat.', { id: toastId });
        }
    };

    // Fetch for both superadmin and JPP users
    useEffect(() => { 
        const isJpp = profile?.role === 'JPP';
        if (isSuperAdmin || isJpp) fetchAdminData(); 
    }, [isSuperAdmin, profile?.role]);

    // Fetch KPP monitoring data (aktiviti, laporan, keahlian rentas-kelab)
    const fetchKppData = async () => {
        setKppLoading(true);
        try {
            const clubEq = kppClubFilter !== 'ALL' ? kppClubFilter : undefined;
            const [acts, reps, mems] = await Promise.all([
                // Aktiviti
                (() => {
                    let q = supabase.from('club_activities')
                        .select('id, title, status, start_date, end_date, club_id, created_at')
                        .eq('is_archived', false)
                        .order('start_date', { ascending: false })
                        .limit(100);
                    if (clubEq) q = q.eq('club_id', clubEq);
                    return q;
                })(),
                // Laporan
                (() => {
                    let q = supabase.from('club_reports')
                        .select('id, title, type, status, club_id, created_at, file_name')
                        .eq('is_archived', false)
                        .order('created_at', { ascending: false })
                        .limit(100);
                    if (clubEq) q = q.eq('club_id', clubEq);
                    return q;
                })(),
                // Keahlian menunggu
                (() => {
                    let q = supabase.from('student_club_memberships')
                        .select('id, user_id, club_id, role, account_status, created_at, profiles(full_name, email, matric_no)')
                        .eq('account_status', 'PENDING')
                        .order('created_at', { ascending: false })
                        .limit(100);
                    if (clubEq) q = q.eq('club_id', clubEq);
                    return q;
                })(),
            ]);
            setAllActivities(acts.data || []);
            setAllReports(reps.data || []);
            setAllMemberships(mems.data || []);
        } catch (e) {
            console.error('KPP fetch error:', e);
        } finally {
            setKppLoading(false);
        }
    };

    // Trigger KPP data fetch when hasKppAccess is determined or filter changes
    useEffect(() => {
        if (hasKppAccess || isSuperAdmin) fetchKppData();
    }, [hasKppAccess, isSuperAdmin, kppClubFilter]);

    // Fetch aktiviti data for KPP popout (legacy)
    const fetchAktivitiPopout = async () => {
        setAktivitiLoading(true);
        try {
            let q = supabase.from('club_activities').select('*, club_id').eq('is_archived', false).order('start_date', { ascending: false }).limit(60);
            if (aktivitiFilter !== 'ALL') q = q.eq('club_id', aktivitiFilter);
            const { data } = await q;
            setAktivitiData(data || []);
        } finally {
            setAktivitiLoading(false);
        }
    };

    // Gate: only JPP (any unit/position) or SuperAdmin allowed
    const isJppMember = profile?.role === 'JPP' || profile?.role === 'SUPER_ADMIN_JPP';
    
    // Tunjuk spinner buat MT user semasa fetch assignment selesai (kini dari AuthContext)
    // (Jika AuthContext sedang loading, ia sudah ditangani di peringkat App.tsx)
    
    if (!isSuperAdmin && !hasKppAccess && !hasKeusahawananAccess && !isJppRole) {
        return (
            <div className="page-container flex flex-col items-center justify-center h-[70vh] gap-5 text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-card shadow-xl flex items-center justify-center border border-border">
                    <Lock className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Akses Terhad</h2>
                <p className="text-muted-foreground text-sm max-w-xs">Halaman ini hanya untuk ahli JPP dan pentadbir utama.</p>
            </div>
        );
    }


    const storagePercentage = Math.min((stats.storageMB / stats.storageLimit) * 100, 100);

    const TABS = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { id: 'ai', label: 'Nexus Hub', icon: Cpu, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { id: 'users', label: 'Pengurusan Pelajar', icon: Users, color: 'text-pink-500', bg: 'bg-pink-500/10' },
        { id: 'management', label: 'Pengurusan Kelab', icon: SettingsIcon, color: 'text-violet-500', bg: 'bg-violet-500/10' },
        { id: 'logs', label: 'Log', icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ];

    return (
        <>
            {/* ── KPP AKTIVITI POPOUT DIALOG ── */}
            <Dialog open={showAktivitiPopout} onOpenChange={(open) => { setShowAktivitiPopout(open); if (open) fetchAktivitiPopout(); }}>
                <DialogContent className="rounded-[2.5rem] max-w-3xl border-none shadow-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
                    <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black tracking-tight">Semakan Aktiviti Kelab</h2>
                            <p className="text-indigo-100 text-[10px] uppercase tracking-widest font-bold mt-1">Aktiviti rentas semua kelab & persatuan</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Select value={aktivitiFilter} onValueChange={(v) => { setAktivitiFilter(v); setTimeout(fetchAktivitiPopout, 50); }}>
                                <SelectTrigger className="h-9 rounded-xl bg-white/20 border-white/20 text-white text-xs font-bold w-40">
                                    <SelectValue placeholder="Tapis Kelab" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl max-h-60">
                                    <SelectItem value="ALL" className="font-bold">Semua Kelab</SelectItem>
                                    {ALL_CLUBS.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="font-medium">{c.shortName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-border bg-muted/10">
                        {aktivitiLoading ? (
                            <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                        ) : aktivitiData.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground italic text-sm">Tiada aktiviti dijumpai.</div>
                        ) : aktivitiData.map(a => {
                            const club = ALL_CLUBS.find(c => c.id === a.club_id);
                            const statusColors: Record<string, string> = {
                                'aktif': 'bg-emerald-500/20 text-emerald-600',
                                'selesai': 'bg-blue-500/20 text-blue-600',
                                'belum_mula': 'bg-amber-500/20 text-amber-600',
                            };
                            return (
                                <div key={a.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md" style={{ backgroundColor: club?.color || '#6366f1' }}>
                                        {club?.shortName?.slice(0,2) || 'K'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-foreground truncate">{a.name || 'Aktiviti'}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{club?.name || a.club_id} • {a.start_date ? format(new Date(a.start_date), 'd MMM yyyy') : '—'}</p>
                                    </div>
                                    <Badge className={cn('text-[9px] font-black border-none uppercase tracking-widest', statusColors[a.status] || 'bg-muted text-muted-foreground')}>
                                        {a.status || '—'}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t border-border bg-card flex justify-end">
                        <Button variant="outline" onClick={() => setShowAktivitiPopout(false)} className="rounded-xl font-black text-[10px] uppercase tracking-widest">Tutup</Button>
                    </div>
                </DialogContent>
            </Dialog>
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

            {/* Dialog: Pembubaran Kelab Spesifik */}
            <Dialog open={showClubDissolveDialog} onOpenChange={setShowClubDissolveDialog}>
                <DialogContent className="rounded-[2rem] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl tracking-tight flex items-center gap-2 text-rose-500">
                            <RotateCcw className="w-6 h-6" /> Pembubaran Kelab
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-muted-foreground font-medium">Bubar kohort untuk kelab tertentu. Arkibkan semua laporan lulus dan tamatkan khidmat MT kelab secara berasingan tanpa memadam data kelab lain.</p>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Pilih Kelab / Badan Beruniform</Label>
                            <Select value={selectedDissolveClub} onValueChange={setSelectedDissolveClub}>
                                <SelectTrigger className="h-12 rounded-xl bg-card border-border/40 focus:ring-rose-500">
                                    <SelectValue placeholder="Pilih kelab di sini" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border/40 shadow-xl max-h-64">
                                    {ALL_CLUBS.map(club => (
                                        <SelectItem key={club.id} value={club.id} className="rounded-lg cursor-pointer">
                                            {club.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowClubDissolveDialog(false)}
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest">Batal</Button>
                        <Button onClick={handleBubarKelabSpesifik} disabled={!selectedDissolveClub || isCleaning}
                            className="rounded-xl font-black text-[10px] uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white">
                            {isCleaning ? 'Memproses...' : 'Bubar Sekarang'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Kelulusan Pemimpin (Presiden/Penasihat) */}
            <Dialog open={showPendingLeadersDialog} onOpenChange={setShowPendingLeadersDialog}>
                <DialogContent className="rounded-[2.5rem] max-w-2xl border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-orange-500 p-8 text-white relative">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <Users className="w-8 h-8" /> Pengesahan Kepimpinan
                            </h2>
                            <p className="text-orange-50/80 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                                {pendingLeaderRequests.length} Permohonan Menunggu Tindakan
                            </p>
                        </div>
                        <Users className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10" />
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto p-8 space-y-4 bg-muted/20">
                        {pendingLeaderRequests.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground font-medium italic">Tiada permohonan kepimpinan buat masa ini.</p>
                            </div>
                        ) : (
                            pendingLeaderRequests.map(u => (
                                <div key={u.id} className="bg-card rounded-3xl p-5 border border-border/50 shadow-sm flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <Avatar className="h-12 w-12 rounded-2xl border-2 border-background shadow-md">
                                            <AvatarImage src={u.avatar_url} />
                                            <AvatarFallback className="bg-orange-500/10 text-orange-600 font-black text-lg">
                                                {u.full_name?.[0] || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-sm truncate">{u.full_name}</h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <Badge className={cn('text-[9px] font-black uppercase border-none', ROLE_COLORS[u.role])}>
                                                    {ROLE_LABELS[u.role] || u.role}
                                                </Badge>
                                                {u.target_club_id && (
                                                    <span className="text-[10px] bg-card border border-border/60 text-muted-foreground px-2 py-0.5 rounded-lg font-bold">
                                                        {ALL_CLUBS.find(c => c.id === u.target_club_id)?.shortName || 'Kelab'}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground font-bold font-mono bg-muted px-1.5 py-0.5 rounded italic">
                                                    {u.student_id || u.matric_no || 'NO ID'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button variant="ghost" onClick={() => handleLeaderStatusAction(u.id, 'REJECTED', u.membership_id)}
                                            className="rounded-xl h-10 w-10 p-0 text-rose-500 hover:bg-rose-500/10">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Button onClick={() => handleLeaderStatusAction(u.id, 'APPROVED', u.membership_id)}
                                            className="rounded-xl h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-4">
                                            Lulus
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-6 bg-card border-t border-border/30 flex justify-end">
                        <Button variant="outline" onClick={() => setShowPendingLeadersDialog(false)} className="rounded-xl font-black text-[10px] uppercase tracking-widest">Tutup</Button>
                    </div>
                </DialogContent>
            </Dialog>


            {/* ── MAIN PAGE ── */}
            <div className="min-h-screen bg-background pb-24">
                {/* Top Nav */}
                <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/40 px-4 sm:px-6 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                                <ShieldCheck className="text-white w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-black text-foreground leading-none truncate">Global JPP Dashboard</h2>
                                <p className="text-[9px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider hidden sm:block">HEP e-KPP v4.0</p>
                            </div>
                        </div>
                        <Button onClick={fetchAdminData} variant="ghost" size="icon"
                            className="rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground h-9 w-9 shrink-0">
                            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                        </Button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-8">
                    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground leading-none">Pusat Kawalan Sistem</h1>
                            <p className="text-muted-foreground font-medium font-mono text-[9px] sm:text-[10px] uppercase tracking-widest bg-muted px-2 py-0.5 rounded-md w-fit">Infrastructure & Global AI Core v4.0</p>
                        </div>
                    </header>

                    {/* --- NAVIGATION TABS --- */}
                    <div className="sticky top-[56px] z-40 bg-background/90 backdrop-blur-md py-3 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-border/20">
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                            {availableTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap transition-all duration-200 shrink-0",
                                        activeTab === tab.id
                                            ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                    )}
                                >
                                    <tab.icon className={cn("w-3.5 h-3.5 shrink-0", activeTab === tab.id ? "text-primary" : "text-muted-foreground/50")} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="mt-5 pb-10">
                        {/* ── TAB: DASHBOARD ── */}
                        {activeTab === 'dashboard' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Kelab', val: ALL_CLUBS.length, color: 'bg-blue-500', icon: LayoutGrid },
                                        { label: 'Aktiviti', val: stats.totalActivities, color: 'bg-emerald-500', icon: Activity },
                                        { label: 'Laporan', val: stats.totalReports, color: 'bg-indigo-500', icon: FileWarning },
                                        { label: 'Menunggu', val: stats.pendingUsers, color: 'bg-orange-500', icon: Users, alert: stats.pendingUsers > 0, onClick: () => setShowPendingLeadersDialog(true) },
                                    ].map((s, i) => (
                                        <Card key={i} onClick={s.onClick} className={cn("border-none shadow-sm rounded-3xl bg-card overflow-hidden", s.onClick && "cursor-pointer hover:shadow-xl hover:shadow-orange-500/10 transition-all active:scale-95")}>
                                            <CardContent className="p-4 sm:p-6">
                                                <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 text-white shadow-md', s.color)}>
                                                    <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <p className="text-[9px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl sm:text-3xl font-black text-foreground">{loading ? '…' : s.val}</span>
                                                    {s.alert && <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                    <Card className="border-none shadow-sm rounded-3xl bg-card p-5 sm:p-8 border border-border/50">
                                        <div className="flex items-center justify-between mb-5 sm:mb-8">
                                            <div>
                                                <h3 className="font-bold text-sm sm:text-base text-foreground">Kelab Paling Aktif</h3>
                                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bilangan Aktiviti</p>
                                            </div>
                                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Activity className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                        </div>
                                        <div className="h-[220px] sm:h-[280px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData.activeClubs} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} dy={8} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#cbd5e1' }} />
                                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '10px' }} />
                                                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>

                                    <Card className="border-none shadow-sm rounded-3xl bg-card p-5 sm:p-8 border border-border/50">
                                        <div className="flex items-center justify-between mb-5 sm:mb-8">
                                            <div>
                                                <h3 className="font-bold text-sm sm:text-base text-foreground">Prestasi Laporan</h3>
                                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Status Laporan Global</p>
                                            </div>
                                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><FileWarning className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                        </div>
                                        <div className="h-[220px] sm:h-[280px] w-full flex items-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={chartData.reportStats} innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                                                        {chartData.reportStats.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle"
                                                        formatter={(value) => <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">{value}</span>} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </div>
                                
                                {/* Storage */}
                                <Card className="border-none shadow-sm rounded-3xl bg-card p-5 sm:p-8 w-full">
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

                        {/* ── TAB: DASHBOARD KPP ── */}
                        {activeTab === 'kpp' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* KPP Sub-Navigation */}
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                                     <Button variant={kppSubTab === 'overview' ? 'default' : 'outline'} onClick={() => setKppSubTab('overview')} className="rounded-xl h-9 shrink-0 font-bold text-xs">Overview KPP</Button>
                                     <Button variant={kppSubTab === 'aktiviti' ? 'default' : 'outline'} onClick={() => setKppSubTab('aktiviti')} className="rounded-xl h-9 shrink-0 font-bold text-xs">Semua Aktiviti</Button>
                                     <Button variant={kppSubTab === 'laporan' ? 'default' : 'outline'} onClick={() => setKppSubTab('laporan')} className="rounded-xl h-9 shrink-0 font-bold text-xs">Semua Laporan</Button>
                                     <Button variant={kppSubTab === 'keahlian' ? 'default' : 'outline'} onClick={() => setKppSubTab('keahlian')} className="rounded-xl h-9 shrink-0 font-bold text-xs">Keahlian Menunggu</Button>
                                     <Button variant={kppSubTab === 'kelab' ? 'default' : 'outline'} onClick={() => setKppSubTab('kelab')} className="rounded-xl h-9 shrink-0 font-bold text-xs">Senarai Kelab</Button>
                                     <Button variant={kppSubTab === 'management' ? 'default' : 'outline'} onClick={() => setKppSubTab('management')} className="rounded-xl h-9 shrink-0 font-bold text-xs">Tetapan Sistem</Button>
                                </div>

                                {/* Club Filter for KPP Sub Tabs (Aktiviti, Laporan, Keahlian) */}
                                {(kppSubTab === 'aktiviti' || kppSubTab === 'laporan' || kppSubTab === 'keahlian') && (
                                    <div className="flex flex-wrap items-center gap-3 bg-card border border-border/50 rounded-2xl px-4 py-3 mb-2">
                                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Tapis Kelab:</span>
                                        <div className="flex flex-wrap gap-2 flex-1">
                                            <button
                                                onClick={() => setKppClubFilter('ALL')}
                                                className={cn('px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
                                                    kppClubFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
                                            >
                                                Semua Kelab
                                            </button>
                                            {ALL_CLUBS.slice(0, 12).map(c => (
                                                <button key={c.id}
                                                    onClick={() => setKppClubFilter(c.id)}
                                                    className={cn('px-3 py-1.5 rounded-xl text-[11px] font-black transition-all',
                                                        kppClubFilter === c.id ? 'text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
                                                    style={kppClubFilter === c.id ? { backgroundColor: c.color || '#6366f1' } : {}}
                                                >
                                                    {c.shortName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* KPP: Sub-Tab OVERVIEW */}
                                {kppSubTab === 'overview' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {/* KPP Stats Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Card className="border-none shadow-sm rounded-[2rem] bg-card overflow-hidden">
                                                <CardContent className="p-6">
                                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg bg-orange-500">
                                                        <Users className="w-5 h-5" />
                                                    </div>
                                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Akaun Tertunggak: Kepimpinan</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-3xl font-black text-foreground">
                                                            {pendingLeaderRequests.filter(u => ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT'].includes(u.role)).length}
                                                        </span>
                                                        <Button size="sm" onClick={() => setShowPendingLeadersDialog(true)} className="rounded-xl px-4 text-[10px] uppercase font-black">
                                                            Urus Kepimpinan
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-none shadow-sm rounded-[2rem] bg-card overflow-hidden">
                                                <CardContent className="p-6">
                                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg bg-blue-500">
                                                        <Users className="w-5 h-5" />
                                                    </div>
                                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Akaun Tertunggak: Ahli Biasa</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-3xl font-black text-foreground">
                                                            {pendingLeaderRequests.filter(u => !['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT'].includes(u.role)).length}
                                                        </span>
                                                        <Button size="sm" onClick={() => setShowPendingLeadersDialog(true)} className="rounded-xl px-4 text-[10px] uppercase font-black bg-blue-500 hover:bg-blue-600">
                                                            Urus Ahli Biasa
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Popout Aktiviti Access */}
                                        <Card className="border-none shadow-sm rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-transparent p-8 border border-indigo-500/20">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-indigo-500 text-white rounded-2xl">
                                                        <Activity className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-lg text-foreground">Semakan Pantas Aktiviti Kelab</h3>
                                                        <p className="text-xs text-muted-foreground font-medium mt-1">Pantau aktiviti yang dianjurkan oleh setiap kelab secara terus tanpa perlu membuka pengurusan kelab tersebut.</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    onClick={() => setShowAktivitiPopout(true)}
                                                    className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs"
                                                >
                                                    Papar Aktiviti
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                )}
                                
                                {/* KPP: Sub-Tab AKTIVITI */}
                                {kppSubTab === 'aktiviti' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-700 p-7 text-white relative overflow-hidden shadow-xl">
                                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-1">Pemantauan Rentas-Kelab</p>
                                                <h2 className="text-2xl font-black">Semua Aktiviti Kelab</h2>
                                                <p className="text-indigo-100/70 text-xs mt-1">{allActivities.length} aktiviti {kppClubFilter !== 'ALL' ? `— ${ALL_CLUBS.find(c=>c.id===kppClubFilter)?.name || ''}` : '— semua kelab'}</p>
                                            </div>
                                            <CalendarRange className="absolute bottom-4 right-8 w-20 h-20 text-white/10" />
                                        </div>
                                        {kppLoading ? (
                                            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
                                        ) : allActivities.length === 0 ? (
                                            <div className="text-center py-16 text-muted-foreground text-sm">Tiada aktiviti ditemui.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {allActivities.map(a => {
                                                    const club = ALL_CLUBS.find(c => c.id === a.club_id);
                                                    const statusColor: Record<string, string> = { aktif: 'bg-emerald-100 text-emerald-700', perancangan: 'bg-blue-100 text-blue-700', selesai: 'bg-slate-100 text-slate-600', ditangguh: 'bg-orange-100 text-orange-700' };
                                                    return (
                                                        <div key={a.id} className="flex items-center gap-4 bg-card border border-border/40 rounded-2xl px-4 py-3 hover:border-indigo-300 transition-all">
                                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: club?.color || '#6366f1' }} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-sm text-foreground truncate">{a.title}</p>
                                                                <p className="text-[11px] text-muted-foreground">{club?.shortName || '—'} · {a.start_date ? new Date(a.start_date).toLocaleDateString('ms-MY') : 'Tiada tarikh'}</p>
                                                            </div>
                                                            <span className={cn('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl flex-shrink-0', statusColor[a.status] || 'bg-slate-100 text-slate-600')}>{a.status}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* KPP: Sub-Tab LAPORAN */}
                                {kppSubTab === 'laporan' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="rounded-[2rem] bg-gradient-to-br from-violet-600 to-purple-700 p-7 text-white relative overflow-hidden shadow-xl">
                                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-200 mb-1">Semakan Laporan</p>
                                                <h2 className="text-2xl font-black">Semua Laporan Kelab</h2>
                                                <p className="text-violet-100/70 text-xs mt-1">{allReports.length} laporan aktif</p>
                                            </div>
                                            <FileText className="absolute bottom-4 right-8 w-20 h-20 text-white/10" />
                                        </div>
                                        <div className="relative">
                                            <input
                                                value={reportSearch} onChange={e => setReportSearch(e.target.value)}
                                                placeholder="Cari laporan..."
                                                className="w-full bg-card border border-border/50 rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/30 outline-none"
                                            />
                                        </div>
                                        {kppLoading ? (
                                            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"/></div>
                                        ) : (
                                            <div className="space-y-2">
                                                {allReports
                                                    .filter(r => !reportSearch || r.title?.toLowerCase().includes(reportSearch.toLowerCase()))
                                                    .map(r => {
                                                        const club = ALL_CLUBS.find(c => c.id === r.club_id);
                                                        const stColors: Record<string, string> = { Menunggu: 'bg-yellow-100 text-yellow-700', 'Dalam Semakan': 'bg-blue-100 text-blue-700', Diluluskan: 'bg-emerald-100 text-emerald-700', Ditolak: 'bg-red-100 text-red-700' };
                                                        return (
                                                            <div key={r.id} className="flex items-center gap-4 bg-card border border-border/40 rounded-2xl px-4 py-3 hover:border-violet-300 transition-all">
                                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: club?.color || '#7c3aed' }} />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-sm text-foreground truncate">{r.title}</p>
                                                                    <p className="text-[11px] text-muted-foreground">{club?.shortName || '—'} · {r.type} · {new Date(r.created_at).toLocaleDateString('ms-MY')}</p>
                                                                </div>
                                                                <span className={cn('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl flex-shrink-0', stColors[r.status] || 'bg-slate-100 text-slate-600')}>{r.status}</span>
                                                            </div>
                                                        );
                                                    })}
                                                {allReports.filter(r => !reportSearch || r.title?.toLowerCase().includes(reportSearch.toLowerCase())).length === 0 && (
                                                    <div className="text-center py-16 text-muted-foreground text-sm">Tiada laporan ditemui.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* KPP: Sub-Tab KEAHLIAN */}
                                {kppSubTab === 'keahlian' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="rounded-[2rem] bg-gradient-to-br from-orange-500 to-amber-600 p-7 text-white relative overflow-hidden shadow-xl">
                                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-100 mb-1">Permohonan Keahlian</p>
                                                <h2 className="text-2xl font-black">Keahlian Menunggu Kelulusan</h2>
                                                <p className="text-orange-100/70 text-xs mt-1">{allMemberships.length} permohonan tertunggak</p>
                                            </div>
                                            <Users className="absolute bottom-4 right-8 w-20 h-20 text-white/10" />
                                        </div>
                                        <div className="relative">
                                            <input
                                                value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                                                placeholder="Cari nama / matrik..."
                                                className="w-full bg-card border border-border/50 rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 outline-none"
                                            />
                                        </div>
                                        {kppLoading ? (
                                            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>
                                        ) : allMemberships.length === 0 ? (
                                            <div className="text-center py-16 text-muted-foreground text-sm">✅ Tiada permohonan tertunggak.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {allMemberships
                                                    .filter(m => {
                                                        const p = m.profiles as any;
                                                        if (!memberSearch) return true;
                                                        return p?.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) || p?.matric_no?.toLowerCase().includes(memberSearch.toLowerCase());
                                                    })
                                                    .map(m => {
                                                        const p = m.profiles as any;
                                                        const club = ALL_CLUBS.find(c => c.id === m.club_id);
                                                        return (
                                                            <div key={m.id} className="flex items-center gap-4 bg-card border border-border/40 rounded-2xl px-4 py-3 hover:border-orange-300 transition-all">
                                                                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-sm flex-shrink-0">
                                                                    {p?.full_name?.[0] || '?'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-sm text-foreground truncate">{p?.full_name || m.user_id}</p>
                                                                    <p className="text-[11px] text-muted-foreground">{p?.matric_no || p?.email} · {club?.shortName || '—'}</p>
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase bg-orange-100 text-orange-700 px-2.5 py-1 rounded-xl flex-shrink-0">{m.role}</span>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* KPP: Sub-Tab KELAB */}
                                {kppSubTab === 'kelab' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="rounded-[2rem] bg-gradient-to-br from-teal-600 to-cyan-700 p-7 text-white relative overflow-hidden shadow-xl">
                                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-200 mb-1">Direktori</p>
                                                <h2 className="text-2xl font-black">Senarai Kelab & Persatuan</h2>
                                                <p className="text-teal-100/70 text-xs mt-1">{ALL_CLUBS.length} kelab berdaftar dalam sistem</p>
                                            </div>
                                            <Building2 className="absolute bottom-4 right-8 w-20 h-20 text-white/10" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {ALL_CLUBS.map(c => (
                                                <div key={c.id} className="bg-card border border-border/40 rounded-2xl p-4 hover:border-teal-300 hover:shadow-sm transition-all">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ backgroundColor: c.color || '#0d9488' }}>
                                                            {c.shortName?.[0] || '?'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm text-foreground truncate">{c.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{c.shortName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[10px] font-black bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg">{c.category}</span>
                                                        <span className="text-[10px] text-muted-foreground ml-auto">
                                                            {allActivities.filter(a => a.club_id === c.id).length} aktiviti
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── TAB: KEUSAHAWANAN DASHBOARD ─────────────────────────── */}
                        {activeTab === 'keusahawanan' && (
                            <KeusahawananAdminPanel />
                        )}

                        {/* ── TAB: NEXUS HUB (AI ADMIN) ── */}
                        {activeTab === 'ai' && (
                            <div className="space-y-10 max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
                                
                                {/* 1. NEXUS DASHBOARD (METRICS & SWITCHES) */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <Sparkles className="w-5 h-5 text-indigo-600" />
                                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Nexus Analytics & Global Switches</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Main Metrics Card */}
                                        <Card className="md:col-span-2 p-10 rounded-[2.5rem] border-none shadow-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
                                            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-950/30 rounded-full blur-3xl" />
                                            
                                            <div className="relative z-10 space-y-8">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="font-black text-2xl tracking-tighter text-white">Metrik Nexus AI</h3>
                                                        <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mt-1">Guna Pakai Token Bulan ini</p>
                                                    </div>
                                                    <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                                        <p className="text-[10px] font-black uppercase text-indigo-100 tracking-widest">Sistem Pintar v2.0</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
                                                    <div className="space-y-6">
                                                        <div>
                                                            <p className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white tabular-nums">{(settings.ai_total_tokens || 0).toLocaleString()}</p>
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/60 mt-2">Token Dijana</p>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between text-xs font-black text-indigo-100 uppercase tracking-tight">
                                                                <span>Had Token Global</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-white">{(Math.min(((settings.ai_total_tokens || 0) / (settings.ai_token_limit || 1000000)) * 100, 100)).toFixed(1)}%</span>
                                                                    <div className="w-[1px] h-3 bg-white/20 mx-1" />
                                                                    <button onClick={updateAiTokenLimit} className="text-[10px] hover:text-white underline underline-offset-4 decoration-white/30">Laras Had</button>
                                                                </div>
                                                            </div>
                                                            <Progress value={Math.min(((settings.ai_total_tokens || 0) / (settings.ai_token_limit || 1000000)) * 100, 100)} 
                                                                className="h-4 bg-indigo-950/40 rounded-full border border-white/5 overflow-hidden [&>div]:bg-gradient-to-r [&>div]:from-indigo-400 [&>div]:to-white shadow-inner" />
                                                            <p className="text-[10px] font-medium text-indigo-200/70 italic">Kapasiti Server: {(settings.ai_token_limit || 1000000).toLocaleString()} Token</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10 group-hover:border-white/20 transition-all duration-500">
                                                            <Sparkles className="w-5 h-5 text-amber-400 mb-3" />
                                                            <p className="text-2xl font-black text-white tabular-nums">845</p>
                                                            <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mt-1">Panggilan</p>
                                                        </div>
                                                        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10 group-hover:border-white/20 transition-all duration-500">
                                                            <Activity className="w-5 h-5 text-emerald-400 mb-3" />
                                                            <p className="text-2xl font-black text-emerald-400 uppercase">Aman</p>
                                                            <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mt-1">Status API</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        {/* Kill Switches Card */}
                                        <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-card flex flex-col justify-between border border-border/50">
                                            <div className="space-y-6">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                                    <Lock className="w-6 h-6" />
                                                </div>
                                                <h4 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Kill-Switches</h4>
                                                
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors">
                                                        <p className="text-xs font-black text-foreground">AI Chat Hub</p>
                                                        <Button onClick={() => toggleSetting('allow_ai_chat', settings.allow_ai_chat)} size="sm"
                                                            className={cn('rounded-full font-black text-[10px] w-14 h-8 transition-all',
                                                                settings.allow_ai_chat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-muted/80 text-muted-foreground')}>
                                                            {settings.allow_ai_chat ? 'ON' : 'OFF'}
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors">
                                                        <p className="text-xs font-black text-foreground">Enjin Bajet AI</p>
                                                        <Button onClick={() => toggleSetting('allow_ai_budget', settings.allow_ai_budget)} size="sm"
                                                            className={cn('rounded-full font-black text-[10px] w-14 h-8 transition-all',
                                                                settings.allow_ai_budget ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-muted/80 text-muted-foreground')}>
                                                            {settings.allow_ai_budget ? 'ON' : 'OFF'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-4 flex items-center gap-2 text-amber-600 opacity-60">
                                                <AlertTriangle size={12} />
                                                <span className="text-[9px] font-bold uppercase tracking-tight">Kekal Aktif Kecuali Kecemasan</span>
                                            </div>
                                        </Card>
                                    </div>
                                </div>

                                {/* 2. NEXUS ECONOMICS (TOKEN COSTS & RATE LIMITS) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Column: Token Economics (2cols width) */}
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <Wand2 className="w-5 h-5 text-indigo-600" />
                                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Ekonomi Token & Kos Perkhidmatan</h3>
                                        </div>
                                        <Card className="p-8 rounded-[2.5rem] border-none shadow-lg bg-card border border-border/40 overflow-hidden relative">
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                                <Brain className="w-24 h-24" />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                                                {/* Allowances */}
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-l-2 border-indigo-500 pl-3">Pengagihan Token Bulanan</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-500/5 group hover:bg-indigo-500/10 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-card rounded-lg shadow-sm text-indigo-600"><Sparkles size={14} /></div>
                                                                <span className="text-xs font-black">Pelan PRO (Monthly)</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-indigo-600 italic">{settings.ai_token_settings?.pro_tier_tokens ?? 1000}</span>
                                                                <button onClick={() => updateAiTokenAllowance('pro_tier_tokens', 'PRO')} className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-indigo-600 transition-colors"><SettingsIcon size={12} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-500/5 group hover:bg-slate-500/10 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-card rounded-lg shadow-sm text-slate-600"><Users size={14} /></div>
                                                                <span className="text-xs font-black">Pelan FREE (Monthly)</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-slate-600 italic">{settings.ai_token_settings?.free_tier_tokens ?? 200}</span>
                                                                <button onClick={() => updateAiTokenAllowance('free_tier_tokens', 'PERCUMA')} className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-slate-600 transition-colors"><SettingsIcon size={12} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Costs Section 1 */}
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-l-2 border-amber-500 pl-3">Kos Janaan Dokumen</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 group hover:bg-amber-500/10 transition-colors">
                                                            <span className="text-xs font-black">Kertas Kerja PRO</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-amber-600 tabular-nums">{settings.ai_token_settings?.costs?.pro_kertas_kerja ?? 50} Tk</span>
                                                                <button onClick={() => updateAiTokenCost('pro_kertas_kerja', 'Janaan Kertas Kerja Pro')} className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-amber-600 transition-colors"><SettingsIcon size={12} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-cyan-500/5 group hover:bg-cyan-500/10 transition-colors">
                                                            <span className="text-xs font-black">Kertas Kerja FLASH</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-cyan-600 tabular-nums">{settings.ai_token_settings?.costs?.flash_kertas_kerja ?? 20} Tk</span>
                                                                <button onClick={() => updateAiTokenCost('flash_kertas_kerja', 'Janaan Kertas Kerja Flash')} className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-cyan-600 transition-colors"><SettingsIcon size={12} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-border/40">
                                                <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 group hover:bg-rose-500/10 transition-colors">
                                                    <span className="text-xs font-black">Analisis Laporan</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-rose-600 tabular-nums">{settings.ai_token_settings?.costs?.analisis ?? 5} Tk</span>
                                                        <button onClick={() => updateAiTokenCost('analisis', 'Analisis Kelab/Review')} className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-rose-600 transition-colors"><SettingsIcon size={12} /></button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 group hover:bg-emerald-500/10 transition-colors">
                                                    <span className="text-xs font-black">Semakan Tatabahasa</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-emerald-600 tabular-nums">{settings.ai_token_settings?.costs?.semak_ejaan === 0 ? 'Percuma' : `${settings.ai_token_settings?.costs?.semak_ejaan} Tk`}</span>
                                                        <button onClick={() => updateAiTokenCost('semak_ejaan', 'Semakan Tatabahasa Laporan')} className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-emerald-600 transition-colors"><SettingsIcon size={12} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                    
                                    {/* Column: Anti-Spam */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <ShieldCheck className="w-5 h-5 text-rose-600" />
                                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Had Anti-Spam</h3>
                                        </div>
                                        <Card className="p-8 rounded-[2.5rem] border-none shadow-lg bg-card h-[438px] flex flex-col justify-between">
                                            <div className="space-y-6">
                                                <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 relative group hover:bg-amber-500/10 transition-all">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex items-center gap-2 text-amber-600">
                                                            <AlertTriangle size={14} />
                                                            <p className="text-[10px] font-black uppercase tracking-widest">Amaran Awal</p>
                                                        </div>
                                                        <button onClick={() => updateSpamThreshold('warning')} className="text-[10px] font-bold text-amber-600 hover:underline">LARAS</button>
                                                    </div>
                                                    <p className="text-4xl font-black text-amber-600 tabular-nums mb-1">{settings.ai_rate_limit?.warning_threshold || 50}</p>
                                                    <p className="text-[10px] font-medium text-muted-foreground">Permintaan per hari sebelum diberi amaran.</p>
                                                </div>

                                                <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 relative group hover:bg-rose-500/10 transition-all">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex items-center gap-2 text-rose-600">
                                                            <Lock size={14} />
                                                            <p className="text-[10px] font-black uppercase tracking-widest">Sekatan Luar Biasa</p>
                                                        </div>
                                                        <button onClick={() => updateSpamThreshold('block')} className="text-[10px] font-bold text-rose-600 hover:underline">LARAS</button>
                                                    </div>
                                                    <p className="text-4xl font-black text-rose-600 tabular-nums mb-1">{settings.ai_rate_limit?.block_threshold || 65}</p>
                                                    <p className="text-[10px] font-medium text-muted-foreground">Individu akan disenaraihitam jika melebihi had ini.</p>
                                                </div>
                                            </div>
                                            
                                            <div className="p-5 bg-muted/40 rounded-[2rem] border border-border/50 text-[10px] font-medium leading-relaxed italic text-muted-foreground text-center">
                                                "Sistem akan me-reset had harian setiap 12:00 Tengah Malam."
                                            </div>
                                        </Card>
                                    </div>
                                </div>

                                {/* 3. MONITORING: SUSPICIOUS USERS */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <Shield className="w-5 h-5 text-indigo-600" />
                                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Pemantauan Pengguna Disyaki ({suspiciousUsers.length})</h3>
                                    </div>
                                    <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-card border border-border/40">
                                        {suspiciousUsers.length === 0 ? (
                                            <div className="py-16 text-center">
                                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                                                    <CheckCheck size={32} />
                                                </div>
                                                <p className="text-sm font-black text-foreground">Sistem Dalam Kawalan</p>
                                                <p className="text-xs text-muted-foreground mt-1">Tiada akaun dikesan menyalahgunakan Nexus AI setakat ini.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border -mx-8 -my-8 px-8 py-4">
                                                {suspiciousUsers.map(u => (
                                                    <div key={u.id} className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-muted/30 -mx-8 px-8 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black">
                                                                {(u.full_name || u.email || '?')[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <p className="text-sm font-black text-foreground">{u.full_name || u.email}</p>
                                                                    {u.ai_status === 'permanent_ban' && <Badge className="bg-rose-600 text-white border-none text-[8px] font-black tracking-widest px-2">BANNED</Badge>}
                                                                    {u.ai_status === 'flagged' && <Badge className="bg-orange-600 text-white border-none text-[8px] font-black tracking-widest px-2">FLAGGED</Badge>}
                                                                    {u.ai_status === 'warned' && <Badge className="bg-amber-500 text-black border-none text-[8px] font-black tracking-widest px-2">WARNED</Badge>}
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground font-medium">
                                                                    Aktiviti Harian: <span className="text-foreground font-bold">{u.ai_daily_usage} / {settings.ai_rate_limit?.block_threshold || 65}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {(u.ai_status === 'flagged' || u.ai_status === 'permanent_ban' || u.ai_status === 'warned') ? (
                                                                <Button onClick={() => handleActionSpamUser(u.id, 'unban')} 
                                                                    className="h-9 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest shadow-md shadow-emerald-500/10">
                                                                    Lepaskan Sekatan
                                                                </Button>
                                                            ) : null}
                                                            {u.ai_status !== 'permanent_ban' && (
                                                                <Button onClick={() => handleActionSpamUser(u.id, 'permanent_ban')} 
                                                                    className="h-9 px-5 rounded-xl bg-card border border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-[9px] uppercase tracking-widest">
                                                                    Sekat Kekal
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: PENGURUSAN PELAJAR ── */}
                        {activeTab === 'users' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Tier Requests (PRO Applications) */}
                                {(isMTUser || isSuperAdmin) && tierRequests.length > 0 && (
                                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-8">
                                        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                                            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                                                <Sparkles className="w-5 h-5 fill-current" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-foreground">Permohonan Pelan PRO</h3>
                                                <p className="text-xs text-muted-foreground mt-1">Hanya permohonan aktif dikesan. Pelan yang telah diproses (Lulus/Tolak) akan disembunyikan secara automatik selepas 24 jam.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {tierRequests
                                                .filter(req => {
                                                    if (req.status === 'PENDING') return true;
                                                    const updatedAt = req.updated_at ? new Date(req.updated_at) : new Date(req.created_at);
                                                    const diffInMs = new Date().getTime() - updatedAt.getTime();
                                                    return diffInMs < 24 * 60 * 60 * 1000; // 24 Hours
                                                })
                                                .map((req) => (
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
                                                        {req.receipt_url && (
                                                            <div className="mt-3 pt-3 border-t border-border/50">
                                                                {req.receipt_url.includes('drive.google.com') ? (
                                                                    <a 
                                                                        href={req.receipt_url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 font-bold text-[11px] uppercase tracking-widest transition-colors"
                                                                    >
                                                                        Papar Resit Pembayaran (Drive)
                                                                    </a>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => handleViewReceipt(req.receipt_url)}
                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 font-bold text-[11px] uppercase tracking-widest transition-colors cursor-pointer"
                                                                    >
                                                                        Buka Fail Resit (Imej/PDF)
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {req.status === 'PENDING' && (
                                                        <div className="flex gap-2">
                                                            <Button onClick={() => handleTierApprove(req.id, req.user_id, 'pro', req.receipt_url)} size="sm" className="flex-1 h-9 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white">Luluskan</Button>
                                                            <Button onClick={() => handleTierReject(req.id, req.receipt_url, req.user_id)} size="sm" variant="outline" className="flex-1 h-9 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">Tolak</Button>
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
                                                    {(isMTUser || isSuperAdmin) && <th className="px-4 py-3 rounded-r-xl w-32 text-center">Tindakan</th>}
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
                                                            <div className="flex flex-col gap-1 items-start">
                                                                <Badge variant="outline" className={cn(
                                                                    "border-none text-[9px] uppercase tracking-widest max-w-min",
                                                                    user.subscription_tier?.toLowerCase() === 'pro' ? "bg-indigo-500/20 text-indigo-600" : "bg-slate-500/20 text-slate-600"
                                                                )}>
                                                                    {user.subscription_tier || 'FREE'}
                                                                </Badge>
                                                                {user.subscription_tier?.toLowerCase() === 'pro' && user.ai_tier_expiration && (
                                                                    <span className="text-[10px] whitespace-nowrap text-muted-foreground font-medium pt-0.5" title={new Date(user.ai_tier_expiration).toLocaleString()}>
                                                                        {(() => {
                                                                            const diff = Math.ceil((new Date(user.ai_tier_expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                                            if (diff < 0) return <span className="text-rose-500 font-bold">LUPUT</span>;
                                                                            return `${diff} Hari Lagi`;
                                                                        })()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 font-black">
                                                            {user.ai_token_balance || 0} <span className="text-[10px] text-muted-foreground font-medium">Tk</span>
                                                        </td>
                                                        {(isMTUser || isSuperAdmin) && (
                                                            <td className="px-4 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {user.role !== 'SUPER_ADMIN_JPP' && isYDP && (
                                                                        <Button 
                                                                            onClick={async () => {
                                                                                if(confirm(user.role === 'JPP' ? `Turunkan ${user.full_name || 'pengguna'} dari JPP ke AHLI biasa?` : `Lantik ${user.full_name || 'pengguna'} sebagai JPP?`)) {
                                                                                    await supabase.from('profiles').update({ role: user.role === 'JPP' ? 'AHLI' : 'JPP' }).eq('id', user.id);
                                                                                    toast.success(`Peranan telah dikemaskini.`);
                                                                                    fetchAdminData();
                                                                                }
                                                                            }}
                                                                            size="sm" 
                                                                            variant={user.role === 'JPP' ? "outline" : "default"}
                                                                            className={cn("h-8 rounded-lg text-[10px] uppercase font-black", 
                                                                                user.role === 'JPP' 
                                                                                    ? "border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700" 
                                                                                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                                                                            )}
                                                                        >
                                                                            {user.role === 'JPP' ? 'Buang JPP' : 'Lantik JPP'}
                                                                        </Button>
                                                                    )}
                                                                    {user.subscription_tier?.toLowerCase() !== 'pro' ? (
                                                                        <Button 
                                                                            onClick={async () => {
                                                                                if(confirm(`Naik taraf ${user.full_name || 'pengguna'} ke PRO?`)) {
                                                                                    await supabase.rpc('update_user_ai_tier', { target_user_id: user.id, new_tier: 'pro' });
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
                                                                                if(confirm(`Turun taraf ${user.full_name || 'pengguna'} ke FREE?`)) {
                                                                                    await supabase.rpc('update_user_ai_tier', { target_user_id: user.id, new_tier: 'free' });
                                                                                    fetchAdminData();
                                                                                }
                                                                            }}
                                                                            size="sm" 
                                                                            variant="outline"
                                                                            className="h-8 rounded-lg text-[10px] uppercase font-black border-slate-300 hover:bg-slate-100 text-slate-600"
                                                                        >
                                                                            Tarik PRO
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
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
                        {activeTab === 'kpp' && kppSubTab === 'management' && (
                            <div className="space-y-10 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 mt-6">
                                
                                {/* 1. KETETAPAN SISTEM & AKSES GLOBAL */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <ShieldCheck className="w-5 h-5 text-violet-600" />
                                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Ketetapan Sistem & Akses</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Row 1: PDF & Takwim */}
                                        <Card className="p-6 border-none shadow-sm rounded-[2rem] bg-card flex items-center justify-between group hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-foreground">Laporan Auto-PDF</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Benarkan jana PDF</p>
                                                </div>
                                            </div>
                                            <Button onClick={() => toggleSetting('allow_auto_pdf', settings.allow_auto_pdf)} size="sm"
                                                className={cn('rounded-full font-black text-[10px] w-14 h-8 transition-all',
                                                    settings.allow_auto_pdf ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-muted text-muted-foreground')}>
                                                {settings.allow_auto_pdf ? 'ON' : 'OFF'}
                                            </Button>
                                        </Card>

                                        <Card className="p-6 border-none shadow-sm rounded-[2rem] bg-card flex items-center justify-between group hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                                    <CalendarDays className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-foreground">Tambah Takwim</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Buka daftar program</p>
                                                </div>
                                            </div>
                                            <Button onClick={() => toggleSetting('allow_add_takwim', settings.allow_add_takwim)} size="sm"
                                                className={cn('rounded-full font-black text-[10px] w-14 h-8 transition-all',
                                                    settings.allow_add_takwim ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-muted text-muted-foreground')}>
                                                {settings.allow_add_takwim ? 'ON' : 'OFF'}
                                            </Button>
                                        </Card>

                                        {/* Had Keahlian - Full Width inside Grid if needed, or 1 col */}
                                        <Card className="p-6 border-none shadow-sm rounded-[2rem] bg-card flex items-center justify-between md:col-span-2 group hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                                    <Users className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-base font-black text-foreground">Had Keahlian Kelab</p>
                                                    <p className="text-xs text-muted-foreground font-medium">Maksimum kelab yang boleh disertai oleh setiap pelajar.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl">
                                                <Button onClick={() => updateClubLimit(-1)} size="icon" variant="ghost"
                                                    disabled={Number(settings.max_clubs_per_student) <= 1}
                                                    className="h-10 w-10 rounded-xl font-black text-lg hover:bg-card">
                                                    −
                                                </Button>
                                                <span className="font-black text-3xl text-foreground w-10 text-center tabular-nums">
                                                    {settings.max_clubs_per_student ?? 2}
                                                </span>
                                                <Button onClick={() => updateClubLimit(1)} size="icon" variant="ghost"
                                                    disabled={Number(settings.max_clubs_per_student) >= 10}
                                                    className="h-10 w-10 rounded-xl font-black text-lg hover:bg-card">
                                                    +
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                </div>

                                {/* 2. ZON KARNIVAL (BENTO STYLE) */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <Ticket className="w-5 h-5 text-amber-500" />
                                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Pengurusan Hari Karnival</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Toggle Sidebar & Toggles in 2 columns of 3x3 or similar */}
                                        <Card className="md:col-span-2 p-8 border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-amber-500/5 via-amber-500/[0.02] to-transparent border border-amber-500/10 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                                <Ticket className="w-16 h-16 text-amber-600 rotate-12" />
                                            </div>
                                            <h4 className="font-black text-sm uppercase tracking-widest text-amber-600 mb-6 flex items-center gap-2">
                                                <Star className="w-4 h-4 fill-amber-500" /> Kawalan Karnival
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 gap-6">
                                                {/* Sidebar Visibility */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-black text-foreground leading-tight">Hari Karnival (Sidebar)</p>
                                                        <p className="text-[11px] text-muted-foreground font-medium mt-1">Paparkan menu karnival untuk semua pelajar.</p>
                                                    </div>
                                                    <Button onClick={() => toggleSetting('show_karnival', settings.show_karnival)} size="sm"
                                                        className={cn('rounded-full font-black text-[10px] w-14 h-8 transition-all',
                                                            settings.show_karnival ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-muted text-muted-foreground')}>
                                                        {settings.show_karnival ? 'ON' : 'OFF'}
                                                    </Button>
                                                </div>

                                                {/* Voting Toggle */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-black text-foreground leading-tight">Bukak Voting Jawatankuasa</p>
                                                        <p className="text-[11px] text-muted-foreground font-medium mt-1">Benarkan pelajar mengundi kelab pempamer terbaik.</p>
                                                    </div>
                                                    <Button onClick={() => toggleSetting('karnival_voting_enabled', settings.karnival_voting_enabled)} size="sm"
                                                        className={cn('rounded-full font-black text-[10px] w-14 h-8 transition-all',
                                                            settings.karnival_voting_enabled ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-muted text-muted-foreground')}>
                                                        {settings.karnival_voting_enabled ? 'ON' : 'OFF'}
                                                    </Button>
                                                </div>

                                                {/* Registration Toggle */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-black text-foreground leading-tight">Pendaftaran Pelajar (Karnival)</p>
                                                        <p className="text-[11px] text-muted-foreground font-medium mt-1">Buka borang daftar masuk ahli pempamer karnival.</p>
                                                    </div>
                                                    <Button onClick={() => toggleSetting('karnival_registration_open', settings.karnival_registration_open)} size="sm"
                                                        className={cn('rounded-full font-black text-[10px] w-14 h-8 transition-all',
                                                            settings.karnival_registration_open ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-muted text-muted-foreground')}>
                                                        {settings.karnival_registration_open ? 'ON' : 'OFF'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>

                                        {/* Action Card: Pukal */}
                                        <Card className="p-8 border-none shadow-lg rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-between">
                                            <div>
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6">
                                                    <CheckCheck className="w-6 h-6" />
                                                </div>
                                                <h4 className="font-black text-sm uppercase tracking-widest text-emerald-600 mb-2">Luluskan Pukal</h4>
                                                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                                    Luluskan semua permohonan keahlian yang sedang menunggu (PENDING) secara sertamerta.
                                                </p>
                                            </div>
                                            <Button onClick={() => setShowBulkAccept(true)} 
                                                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest mt-6 py-6 shadow-lg shadow-emerald-500/20">
                                                Jalankan Operasi
                                            </Button>
                                        </Card>
                                    </div>
                                </div>

                                {/* 3. PENYELENGGARAAN & TINDAKAN KRITIKAL */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <Activity className="w-5 h-5 text-rose-500" />
                                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Penyelenggaraan Pangkalan Data</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Action: Tambah Kelab */}
                                        <button onClick={() => setShowAddClub(true)}
                                            className="group p-6 rounded-[2rem] bg-card hover:bg-violet-600 transition-all duration-500 text-left flex flex-col justify-between h-44 shadow-sm hover:shadow-xl hover:shadow-violet-600/20 border border-border/50 hover:border-transparent">
                                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center transition-colors">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground group-hover:text-white transition-colors">Tambah Kelab Baru</p>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-1 group-hover:text-white/60 transition-colors uppercase tracking-tight">Kembangkan sistem JPP</p>
                                            </div>
                                        </button>

                                        {/* Action: Purge Logs */}
                                        <button onClick={handleCleanRejected} disabled={isCleaning || stats.rejectedReports === 0 || loading}
                                            className={cn(
                                                "group p-6 rounded-[2rem] bg-card hover:bg-rose-500 transition-all duration-500 text-left flex flex-col justify-between h-44 shadow-sm hover:shadow-xl hover:shadow-rose-500/20 border border-border/50 hover:border-transparent",
                                                (isCleaning || stats.rejectedReports === 0 || loading) && "opacity-50 cursor-not-allowed saturate-0"
                                            )}>
                                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center transition-colors">
                                                {isCleaning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground group-hover:text-white transition-colors">Padam Rekod Ditolak</p>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-1 group-hover:text-white/60 transition-colors uppercase tracking-tight">
                                                    {stats.rejectedReports} Rekod Dijumpai
                                                </p>
                                            </div>
                                        </button>

                                        {/* Action: Bubar Kohort */}
                                        <button onClick={handleBubarKohort} disabled={isCleaning}
                                            className="group p-6 rounded-[2rem] bg-card hover:bg-amber-600 transition-all duration-500 text-left flex flex-col justify-between h-44 shadow-sm hover:shadow-xl hover:shadow-amber-600/20 border border-border/50 hover:border-transparent">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center transition-colors">
                                                <RotateCcw className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground group-hover:text-white transition-colors">Pembubaran Menyeluruh</p>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-1 group-hover:text-white/60 transition-colors uppercase tracking-tight">Semua Kelab & Badan Beruniform</p>
                                            </div>
                                        </button>

                                        {/* Action: Bubar Kelab Spesifik */}
                                        <button onClick={() => setShowClubDissolveDialog(true)} disabled={isCleaning}
                                            className="group p-6 rounded-[2rem] bg-card hover:bg-orange-600 transition-all duration-500 text-left flex flex-col justify-between h-44 shadow-sm hover:shadow-xl hover:shadow-orange-600/20 border border-border/50 hover:border-transparent">
                                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center transition-colors">
                                                <RotateCcw className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground group-hover:text-white transition-colors">Pembubaran Kelab</p>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-1 group-hover:text-white/60 transition-colors uppercase tracking-tight">Pilih Kelab Spesifik</p>
                                            </div>
                                        </button>

                                        {/* Action: Pembersihan Akaun Terbiar */}
                                        <button onClick={handlePembersihanAkaun} disabled={isCleaning}
                                            className="group p-6 rounded-[2rem] bg-card hover:bg-slate-800 dark:hover:bg-slate-100 transition-all duration-500 text-left flex flex-col justify-between h-44 shadow-sm hover:shadow-xl hover:shadow-slate-500/20 border border-border/50 hover:border-transparent">
                                            <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 group-hover:bg-white/20 group-hover:text-white dark:group-hover:text-black flex items-center justify-center transition-colors">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground group-hover:text-white dark:group-hover:text-black transition-colors">Pembersihan Akaun</p>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-1 group-hover:text-white/60 dark:group-hover:text-black/60 transition-colors uppercase tracking-tight">Pengguna tiada log masuk {'>'} 6 bulan</p>
                                            </div>
                                        </button>
                                    </div>
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
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <CardTitle className="text-xl font-bold flex items-center gap-3">
                                                    {logView === 'club' ? (
                                                        <><Database className="w-6 h-6 text-emerald-500" /> Log Transaksi / Audit Siber Global</>
                                                    ) : (
                                                        <><Sparkles className="w-6 h-6 text-indigo-500" /> Log Penggunaan Nexus AI</>
                                                    )}
                                                </CardTitle>
                                                <p className="text-xs font-medium text-muted-foreground mt-1">
                                                    {logView === 'club' 
                                                        ? 'Senarai penuh jejak rekod perubahan dan transaksi di seluruh kelab.' 
                                                        : 'Jejak penggunaan kecerdasan buatan Nexus AI oleh semua warga POLISAS.'}
                                                </p>
                                            </div>
                                            <div className="flex bg-muted p-1 rounded-xl">
                                                <button 
                                                    onClick={() => setLogView('club')}
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                        logView === 'club' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    Audit Kelab
                                                </button>
                                                <button 
                                                    onClick={() => setLogView('ai')}
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                        logView === 'ai' ? "bg-card shadow-sm text-indigo-600" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    Nexus AI
                                                </button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-border">
                                            {logView === 'club' ? (
                                                globalLogs.filter(log => {
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
                                                )
                                            ) : (
                                                aiLogs.filter(log => {
                                                    const searchStr = `${log.task_name} ${log.profiles?.full_name || ''} ${log.profiles?.email || ''} ${log.profiles?.student_id || ''}`.toLowerCase();
                                                    return searchStr.includes(logSearch.toLowerCase());
                                                }).length === 0 ? (
                                                    <div className="p-20 text-center text-muted-foreground italic text-sm">Tiada log penggunaan AI dijumpai.</div>
                                                ) : (
                                                    aiLogs.filter(log => {
                                                        const searchStr = `${log.task_name} ${log.profiles?.full_name || ''} ${log.profiles?.email || ''} ${log.profiles?.student_id || ''}`.toLowerCase();
                                                        return searchStr.includes(logSearch.toLowerCase());
                                                    }).map((log) => (
                                                        <div key={log.id} className="px-8 py-5 flex items-start gap-5 hover:bg-muted/50 transition-colors group">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110">
                                                                <Sparkles size={20} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Badge className="text-[10px] font-black uppercase px-2.5 py-0.5 border-none bg-indigo-600 text-white">
                                                                        NEXUS AI
                                                                    </Badge>
                                                                    <Badge variant="outline" className="text-[10px] font-bold border-border text-indigo-500 bg-indigo-500/10 uppercase tracking-widest">
                                                                        {log.task_name.replace(/_/g, ' ')}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm font-bold text-foreground leading-snug">
                                                                    Tugasan <span className="text-indigo-600">{log.task_name.replace(/_/g, ' ')}</span> telah dilaksanakan dengan jayanya.
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-3">
                                                                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                                        <Users className="w-3.5 h-3.5 opacity-50" /> Oleh: <span className="text-foreground font-black uppercase tracking-tight">{log.profiles?.full_name || 'Pelajar'}</span>
                                                                        {log.profiles?.student_id && (
                                                                            <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono ml-1">{log.profiles.student_id}</span>
                                                                        )}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground/30">•</span>
                                                                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                                        <Database size={12} className="opacity-50" /> Kos: <span className="text-indigo-600 font-bold">{log.token_cost} Token</span>
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground/30">•</span>
                                                                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                                        <Clock size={12} className="opacity-50" />
                                                                        {format(new Date(log.created_at), 'HH:mm • d MMM yyyy', { locale: ms })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── TAB: AHLI JPP HIERARCHY ── */}
                        {activeTab === 'jpp' && <JppMemberPanel allUsers={allUsers} onRefresh={fetchAdminData} isSuperAdmin={isSuperAdmin} profile={profile} />}

                        {/* ── TAB: TAKWIM GLOBAL ── */}
                        {activeTab === 'takwim' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="border-none shadow-sm rounded-[2.5rem] bg-card p-12 text-center border border-border/50">
                                    <CalendarDays className="w-16 h-16 text-orange-500 mx-auto mb-6 opacity-80" />
                                    <h3 className="text-2xl font-black text-foreground">Takwim Pusat JPP</h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                                        Modul kalendar global untuk memantau semua aktiviti merentas pelbagai bahagian dan kelab akan dibangunkan dalam fasa seterusnya.
                                    </p>
                                    <Button className="mt-8 rounded-xl bg-orange-500 hover:bg-orange-600 font-black tracking-widest uppercase text-[10px]">
                                        Modul Dalam Pembinaan
                                    </Button>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════
// JPP Member Management Panel (A5)
// ═══════════════════════════════════════════════════════════════════

import {
    JPP_POSITION_LABELS,
    JPP_EXCO_POSITIONS, type JppPosition, type JppExcoUnit,
} from '@/types';
import { useJppExcoUnits } from '@/hooks/useJppExcoUnits';

function JppMemberPanel({ allUsers, onRefresh, isSuperAdmin, profile }: { allUsers: any[]; onRefresh: () => void; isSuperAdmin: boolean; profile: any }) {
    const isYDP = profile?.jpp_position === 'YANG_DIPERTUA' || isSuperAdmin;
    const jppUsers = allUsers.filter(u => u.role === 'JPP' || u.role === 'SUPER_ADMIN_JPP');
    const { units: excoUnits, unitLabels, unitColors, refresh: refreshUnits } = useJppExcoUnits();
    const [activeView, setActiveView] = useState<'members' | 'units'>('members');
    const [search, setSearch] = useState('');
    const [editModal, setEditModal] = useState<any | null>(null);
    const [editPos, setEditPos] = useState<string>('');
    const [editUnit, setEditUnit] = useState<string>('');
    const [mtAssignments, setMtAssignments] = useState<{unit: string}[]>([]);
    const [saving, setSaving] = useState(false);
    const [assignments, setAssignments] = useState<Record<string, string[]>>({}); // userId → unit[]


    // Fetch all MT assignments on mount
    useEffect(() => {
        supabase.from('jpp_mt_assignments').select('mt_user_id, unit')
            .then(({ data }) => {
                if (!data) return;
                const map: Record<string, string[]> = {};
                data.forEach(a => {
                    if (!map[a.mt_user_id]) map[a.mt_user_id] = [];
                    map[a.mt_user_id].push(a.unit);
                });
                setAssignments(map);
            });
    }, []);

    const openEdit = (user: any) => {
        if (!isYDP) return;
        setEditModal(user);
        setEditPos(user.jpp_position || '');
        setEditUnit(user.jpp_unit || '');
        setMtAssignments(
            (assignments[user.id] || []).map(u => ({ unit: u }))
        );
    };

    const isMT = JPP_MT_POSITIONS.includes(editPos as JppPosition);

    const toggleMtUnit = (unit: string) => {
        setMtAssignments(prev =>
            prev.find(a => a.unit === unit)
                ? prev.filter(a => a.unit !== unit)
                : [...prev, { unit }]
        );
    };

    const handleSave = async () => {
        if (!editModal) return;
        setSaving(true);
        try {
            // Update profile
            const { error: profileErr } = await supabase.from('profiles').update({
                jpp_position: editPos || null,
                jpp_unit: isMT ? null : (editUnit || null),
            }).eq('id', editModal.id);
            if (profileErr) throw profileErr;

            if (isMT) {
                // Delete all existing assignments for this MT
                await supabase.from('jpp_mt_assignments').delete().eq('mt_user_id', editModal.id);
                // Insert new ones
                if (mtAssignments.length > 0) {
                    await supabase.from('jpp_mt_assignments').insert(
                        mtAssignments.map(a => ({ mt_user_id: editModal.id, unit: a.unit }))
                    );
                }
            } else {
                // If not MT, remove any leftover MT assignments
                await supabase.from('jpp_mt_assignments').delete().eq('mt_user_id', editModal.id);
            }

            toast.success(`${editModal.full_name} berjaya dikemaskini!`);
            setEditModal(null);
            onRefresh();
            // Refresh local assignments
            const { data } = await supabase.from('jpp_mt_assignments').select('mt_user_id, unit');
            if (data) {
                const map: Record<string, string[]> = {};
                data.forEach(a => {
                    if (!map[a.mt_user_id]) map[a.mt_user_id] = [];
                    map[a.mt_user_id].push(a.unit);
                });
                setAssignments(map);
            }
        } catch (e: any) {
            toast.error(e.message || 'Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const filtered = jppUsers.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const mtUsers   = filtered.filter(u => JPP_MT_POSITIONS.includes(u.jpp_position));
    const excoUsers = filtered.filter(u => JPP_EXCO_POSITIONS.includes(u.jpp_position));
    const unsetUsers = filtered.filter(u => !u.jpp_position);

    const renderGroup = (title: string, icon: React.ReactNode, users: any[], badge?: string) => {
        if (users.length === 0) return null;
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    {icon}
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
                    <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {users.length} orang
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {users.map(u => {
                        const unitColor = unitColors[u.jpp_unit] || '#6366f1';
                        const userMtUnits = assignments[u.id] || [];
                        return (
                             <div key={u.id}
                                className={cn("group relative flex items-center gap-3 p-3 rounded-2xl bg-card border border-border transition-all",
                                    isYDP ? "hover:border-border/80 hover:shadow-md cursor-pointer" : "opacity-95"
                                )}
                                onClick={() => openEdit(u)}
                            >
                                <Avatar className="h-10 w-10 rounded-xl flex-shrink-0">
                                    <AvatarImage src={u.avatar_url || ''} className="object-cover" />
                                    <AvatarFallback className="rounded-xl font-black text-xs text-white"
                                        style={{ background: u.jpp_unit ? unitColor : '#6366f1' }}>
                                        {u.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black truncate">{u.full_name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {u.jpp_position ? (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                                {JPP_POSITION_LABELS[u.jpp_position as JppPosition] || u.jpp_position}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600">
                                                Belum Ditetapkan
                                            </span>
                                        )}
                                        {u.jpp_unit && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md text-white"
                                                style={{ background: unitColor }}>
                                                {unitLabels[u.jpp_unit] || u.jpp_unit}
                                            </span>
                                        )}
                                        {userMtUnits.map((unit: string) => (
                                            <span key={unit} className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md text-white"
                                                style={{ background: unitColors[unit] || '#6366f1' }}>
                                                {unitLabels[unit] || unit}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {isYDP && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 group-hover:text-muted-foreground/60 transition-colors" />}
                            </div>
                        );
                    })}
                </div>

            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header + View Toggler */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Crown className="w-6 h-6 text-amber-500" />
                        Pengurusan Ahli JPP
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Tetapkan jawatan dan unit exco setiap ahli JPP.
                    </p>
                </div>
                {/* View Switcher */}
                <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-2xl border border-border/50">
                    {[
                        { id: 'members', label: 'Ahli', icon: Users },
                        { id: 'units',   label: 'Senarai Exco', icon: SettingsIcon },
                    ].map(v => (
                        <button key={v.id} onClick={() => setActiveView(v.id as any)}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                activeView === v.id
                                    ? 'bg-background text-primary shadow ring-1 ring-border/50'
                                    : 'text-muted-foreground hover:bg-muted/50'
                            )}>
                            <v.icon className="w-3.5 h-3.5" />{v.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── VIEW: AHLI JPP ── */}
            {activeView === 'members' && (
                <>
                    {/* Hierarchy Legend */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { title: 'MT JPP', desc: 'Majlis Tertinggi', color: 'bg-amber-500/10 border-amber-500/20 text-amber-600', count: jppUsers.filter(u => JPP_MT_POSITIONS.includes(u.jpp_position)).length },
                            { title: 'Exco Unit', desc: 'Ahli Exco berunit', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600', count: jppUsers.filter(u => JPP_EXCO_POSITIONS.includes(u.jpp_position)).length },
                            { title: 'Belum Set', desc: 'Perlu jawatan', color: 'bg-muted border-border text-muted-foreground', count: jppUsers.filter(u => !u.jpp_position).length },
                        ].map(s => (
                            <div key={s.title} className={`p-3 rounded-2xl border ${s.color}`}>
                                <p className="text-lg font-black leading-none">{s.count}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1">{s.title}</p>
                                <p className="text-[10px] opacity-60">{s.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Cari ahli JPP dengan nama atau email..."
                            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-border bg-card text-sm font-medium outline-none focus:border-border/80" />
                    </div>

                    {/* Groups */}
                    <div className="space-y-8">
                        {renderGroup('Majlis Tertinggi JPP', <Crown className="w-3.5 h-3.5 text-amber-500" />,
                            jppUsers.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())).filter(u => JPP_MT_POSITIONS.includes(u.jpp_position)))}
                        {renderGroup('Exco JPP', <Store className="w-3.5 h-3.5 text-indigo-500" />,
                            jppUsers.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())).filter(u => JPP_EXCO_POSITIONS.includes(u.jpp_position)))}
                        {renderGroup('Belum Ditetapkan', <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60" />,
                            jppUsers.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())).filter(u => !u.jpp_position))}
                    </div>

                    {jppUsers.length === 0 && (
                        <div className="text-center py-16 text-muted-foreground/40">
                            <Crown className="w-10 h-10 mx-auto mb-3" />
                            <p className="text-[11px] font-black uppercase tracking-widest">Tiada ahli JPP dalam sistem lagi</p>
                        </div>
                    )}
                </>
            )}

            {/* ── VIEW: SENARAI EXCO ── */}
            {activeView === 'units' && (
                <JppExcoUnitsManager excoUnits={excoUnits} onRefresh={refreshUnits} />
            )}

            {/* Edit Member Modal */}
            {editModal && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setEditModal(null)} />
                    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto rounded-3xl p-6 bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <Avatar className="h-12 w-12 rounded-2xl flex-shrink-0">
                                <AvatarImage src={editModal.avatar_url || ''} className="object-cover" />
                                <AvatarFallback className="rounded-2xl font-black text-sm text-white bg-indigo-600">
                                    {editModal.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-black truncate">{editModal.full_name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{editModal.email}</p>
                            </div>
                            <button onClick={() => setEditModal(null)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Jawatan */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Jawatan / Position</p>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 mb-1.5">Majlis Tertinggi (MT)</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {JPP_MT_POSITIONS.map(pos => (
                                            <button key={pos} onClick={() => { setEditPos(pos); setEditUnit(''); }}
                                                className={cn('px-3 py-2 rounded-xl text-[10px] font-black text-left transition-all border',
                                                    editPos === pos ? 'bg-amber-500 text-white border-amber-500' : 'bg-muted/30 border-border hover:border-border/60')}>
                                                {JPP_POSITION_LABELS[pos]}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 mt-3 mb-1.5">Exco</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {JPP_EXCO_POSITIONS.map(pos => (
                                            <button key={pos} onClick={() => setEditPos(pos)}
                                                className={cn('px-3 py-2 rounded-xl text-[10px] font-black text-left transition-all border',
                                                    editPos === pos ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-muted/30 border-border hover:border-border/60')}>
                                                {JPP_POSITION_LABELS[pos]}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => { setEditPos(''); setEditUnit(''); setMtAssignments([]); }}
                                        className={cn('w-full mt-1 px-3 py-2 rounded-xl text-[10px] font-black transition-all border',
                                            !editPos ? 'bg-muted border-muted-foreground/30 text-foreground' : 'border-dashed border-border text-muted-foreground hover:border-border')}>
                                        ✕ Tiada Jawatan
                                    </button>
                                </div>
                            </div>

                            {/* Unit/Exco (untuk Exco sahaja) */}
                            {editPos && !isMT && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Unit Exco</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {excoUnits.map(unit => (
                                            <button key={unit.code} onClick={() => setEditUnit(unit.code)}
                                                className={cn('px-3 py-2 rounded-xl text-[10px] font-black text-left transition-all border',
                                                    editUnit === unit.code ? 'text-white border-transparent' : 'bg-muted/30 border-border hover:border-border/60')}
                                                style={editUnit === unit.code ? { background: unit.color } : {}}>
                                                {unit.short_name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* MT Assignments */}
                            {isMT && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
                                        Oversee Unit Exco <span className="text-muted-foreground/40">(boleh pilih lebih satu)</span>
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {excoUnits.map(unit => {
                                            const selected = mtAssignments.some(a => a.unit === unit.code);
                                            return (
                                                <button key={unit.code} onClick={() => toggleMtUnit(unit.code)}
                                                    className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black transition-all border',
                                                        selected ? 'text-white border-transparent' : 'bg-muted/30 border-border hover:border-border/60')}
                                                    style={selected ? { background: unit.color } : {}}>
                                                    {selected ? <Check className="w-3 h-3 flex-shrink-0" /> : <div className="w-3 h-3 flex-shrink-0" />}
                                                    {unit.short_name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setEditModal(null)}
                                className="flex-1 h-11 rounded-2xl border border-border text-[11px] font-black uppercase">Batal</button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase disabled:opacity-40 transition-colors">
                                {saving ? 'Menyimpan...' : '✓ Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// JPP Exco Units Manager — CRUD untuk senarai exco
// ═══════════════════════════════════════════════════════════════════

const PRESET_COLORS = [
    '#1B5E20','#B71C1C','#4A148C','#1565C0','#E65100',
    '#006064','#4E342E','#1A237E','#BF360C','#6366f1',
    '#f59e0b','#10b981','#ec4899','#14b8a6','#8b5cf6',
];

function JppExcoUnitsManager({ excoUnits, onRefresh }: { excoUnits: JppExcoUnit[]; onRefresh: () => void }) {
    const [editUnit, setEditUnit] = useState<JppExcoUnit | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ code: '', name: '', short_name: '', color: '#6366f1' });

    const openAdd = () => {
        setForm({ code: '', name: '', short_name: '', color: '#6366f1' });
        setShowAdd(true);
        setEditUnit(null);
    };

    const openEdit = (unit: JppExcoUnit) => {
        setForm({ code: unit.code, name: unit.name, short_name: unit.short_name, color: unit.color });
        setEditUnit(unit);
        setShowAdd(true);
    };

    const handleSave = async () => {
        if (!form.code.trim() || !form.name.trim() || !form.short_name.trim()) {
            toast.error('Sila isi semua ruangan yang diperlukan.');
            return;
        }
        setSaving(true);
        try {
            if (editUnit) {
                // Update
                const { error } = await supabase.from('jpp_exco_units').update({
                    name: form.name.trim(),
                    short_name: form.short_name.trim(),
                    color: form.color,
                }).eq('id', editUnit.id);
                if (error) throw error;
                toast.success(`Unit "${form.short_name}" dikemaskini!`);
            } else {
                // Insert
                const { error } = await supabase.from('jpp_exco_units').insert({
                    code: form.code.trim().toUpperCase().replace(/\s+/g, '_'),
                    name: form.name.trim(),
                    short_name: form.short_name.trim(),
                    color: form.color,
                    sort_order: excoUnits.length,
                });
                if (error) throw error;
                toast.success(`Unit "${form.short_name}" berjaya ditambah!`);
            }
            setShowAdd(false);
            onRefresh();
        } catch (e: any) {
            toast.error(e.message || 'Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (unit: JppExcoUnit) => {
        if (!window.confirm(`Padam unit "${unit.name}"? Ahli yang ditetapkan ke unit ini perlu diubah secara manual.`)) return;
        const { error } = await supabase.from('jpp_exco_units').delete().eq('id', unit.id);
        if (error) { toast.error(error.message); return; }
        toast.success(`Unit "${unit.short_name}" dipadam.`);
        onRefresh();
    };

    const handleToggleActive = async (unit: JppExcoUnit) => {
        const { error } = await supabase.from('jpp_exco_units').update({ is_active: !unit.is_active }).eq('id', unit.id);
        if (error) { toast.error(error.message); return; }
        toast.success(`Unit "${unit.short_name}" ${unit.is_active ? 'dimatikan' : 'diaktifkan'}.`);
        onRefresh();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black tracking-tight">Senarai Exco JPP</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{excoUnits.length} unit aktif · Klik kad untuk edit</p>
                </div>
                <button onClick={openAdd}
                    className="flex items-center gap-2 h-10 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Unit
                </button>
            </div>

            {/* Unit Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {excoUnits.map((unit, idx) => (
                    <div key={unit.id} className="group relative flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:shadow-md transition-all">
                        {/* Color swatch */}
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black text-xs shadow"
                            style={{ background: unit.color }}>
                            {unit.short_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{unit.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                                    {unit.code}
                                </span>
                                <span className="text-[9px] text-muted-foreground/50">·</span>
                                <span className="text-[9px] text-muted-foreground font-medium">{unit.short_name}</span>
                            </div>
                        </div>
                        {/* Actions – muncul on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(unit)}
                                className="w-7 h-7 rounded-lg bg-muted hover:bg-indigo-500/20 flex items-center justify-center transition-colors"
                                title="Edit">
                                <Wand2 className="w-3 h-3 text-indigo-600" />
                            </button>
                            <button onClick={() => handleDelete(unit)}
                                className="w-7 h-7 rounded-lg bg-muted hover:bg-rose-500/20 flex items-center justify-center transition-colors"
                                title="Padam">
                                <Trash2 className="w-3 h-3 text-rose-600" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {excoUnits.length === 0 && (
                <div className="text-center py-12 text-muted-foreground/40">
                    <Store className="w-10 h-10 mx-auto mb-3" />
                    <p className="text-[11px] font-black uppercase tracking-widest">Tiada unit exco</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAdd && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
                    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto rounded-3xl p-6 bg-card border border-border shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h4 className="font-black text-base tracking-tight">
                                {editUnit ? 'Edit Unit Exco' : 'Tambah Unit Exco'}
                            </h4>
                            <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Code — readonly when editing */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1.5">
                                    Kod Unit <span className="text-muted-foreground/30">(contoh: KPP, SRK)</span>
                                </label>
                                <input value={form.code} disabled={!!editUnit}
                                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g,'_') }))}
                                    placeholder="cth: KOLAB"
                                    className="w-full h-11 px-4 rounded-2xl border border-border bg-muted/30 disabled:opacity-40 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500" />
                                {!editUnit && <p className="text-[9px] text-muted-foreground/40 mt-1 px-1">Kod tidak boleh diubah selepas dibuat.</p>}
                            </div>

                            {/* Nama Penuh */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1.5">Nama Penuh</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="cth: Exco Kolaborasi dan Kesukarelawanan"
                                    className="w-full h-11 px-4 rounded-2xl border border-border bg-muted/30 text-sm font-medium outline-none focus:border-indigo-500" />
                            </div>

                            {/* Short Name */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1.5">Nama Pendek / Badge</label>
                                <input value={form.short_name} onChange={e => setForm(f => ({ ...f, short_name: e.target.value }))}
                                    placeholder="cth: Kolab"
                                    className="w-full h-11 px-4 rounded-2xl border border-border bg-muted/30 text-sm font-medium outline-none focus:border-indigo-500" />
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-2">Warna Tema</label>
                                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-2xl border border-border">
                                    {PRESET_COLORS.map(c => (
                                        <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                                            className={cn('w-7 h-7 rounded-full transition-transform', form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-foreground' : 'hover:scale-110')}
                                            style={{ background: c }} />
                                    ))}
                                    {/* Custom color */}
                                    <label className="w-7 h-7 rounded-full border-2 border-dashed border-border cursor-pointer flex items-center justify-center hover:border-foreground/40 transition-colors relative overflow-hidden" title="Warna kustom">
                                        <Palette className="w-3.5 h-3.5 text-muted-foreground/40" />
                                        <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                    </label>
                                </div>
                                {/* Preview */}
                                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 border border-border/40">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black"
                                        style={{ background: form.color }}>
                                        {form.short_name?.slice(0, 2) || 'AB'}
                                    </div>
                                    <span className="text-xs font-black">{form.short_name || 'Nama Pendek'}</span>
                                    <span className="text-xs text-muted-foreground">·</span>
                                    <span className="text-[10px] text-muted-foreground">{form.color}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setShowAdd(false)}
                                className="flex-1 h-11 rounded-2xl border border-border text-[11px] font-black uppercase">Batal</button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase disabled:opacity-40 transition-colors">
                                {saving ? 'Menyimpan...' : (editUnit ? '✓ Kemaskini' : '+ Tambah')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}