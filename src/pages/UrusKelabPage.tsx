import React, { useEffect, useState } from 'react';
import {
    Camera, Palette, Users, Save, Trash2, RefreshCcw, RotateCcw,
    ShieldCheck, UserCog, Trophy, TrendingUp, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn, getContrastColor } from '@/lib/utils';
import { supabase, createLog } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export function UrusKelabPage() {
    const { profile, refreshClubs, isPresident, selectedClubId, isKppExco, isSuperAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resettingKohort, setResettingKohort] = useState(false);

    const [clubData, setClubData] = useState<any>(null);
    const [committee, setCommittee] = useState<any[]>([]);
    
    // Derived state untuk Paparan UI hasil gabungan membership + committee
    const [unifiedCommittee, setUnifiedCommittee] = useState<any[]>([]);

    useEffect(() => {
        if (selectedClubId) fetchData();
    }, [selectedClubId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Ambil data kelab
            const { data: club } = await supabase.from('clubs').select('*').eq('id', selectedClubId).single();
            setClubData(club);

            // 2. Ambil data Override Committee sedia ada (position_title, category)
            const { data: commRecords } = await supabase.from('club_committee')
                .select('*')
                .eq('club_id', selectedClubId);
            setCommittee(commRecords || []);

            // 3. Ambil Ahli MT & Presiden dari memberships yang SEBENAR sebagai Auto-List
            const { data: coreMembers } = await supabase.from('student_club_memberships')
                .select('user_id, role, profiles!inner(full_name)')
                .eq('club_id', selectedClubId)
                .eq('account_status', 'APPROVED')
                .in('role', ['CLUB_PRESIDENT', 'CLUB_MT']);

            if (coreMembers) {
                // Cantumkan data
                const unified = coreMembers.map(m => {
                    const profileInfo = m.profiles as any;
                    const fullName = profileInfo.full_name;
                    // Cari jika presiden pernah letak override dalam table club_committee
                    const override = (commRecords || []).find(c => c.full_name === fullName);

                    return {
                        user_id: m.user_id,
                        full_name: fullName,
                        role: m.role, // 'CLUB_PRESIDENT' | 'CLUB_MT'
                        // Jika tiada override, default category = MT jika presiden, jika MT jadi EXCO
                        category: override?.category || (m.role === 'CLUB_PRESIDENT' ? 'MT' : 'EXCO'),
                        // Default position title
                        position_title: override?.position_title || (m.role === 'CLUB_PRESIDENT' ? 'Presiden Kelab' : 'Ahli Jawatankuasa')
                    };
                });
                
                // Susun: Presiden Sentiasa Atas -> MT -> EXCO
                unified.sort((a, b) => {
                    if (a.role === 'CLUB_PRESIDENT' && b.role !== 'CLUB_PRESIDENT') return -1;
                    if (a.role !== 'CLUB_PRESIDENT' && b.role === 'CLUB_PRESIDENT') return 1;
                    if (a.category === 'MT' && b.category === 'EXCO') return -1;
                    if (a.category === 'EXCO' && b.category === 'MT') return 1;
                    return 0;
                });
                
                setUnifiedCommittee(unified);
            }

        } catch (err: any) {
            toast.error("Gagal menarik data: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── FUNGSI LOKAL KEMASKINI STATE (Belum dipush ke DB) ──
    const handleCommitteeChange = (fullName: string, field: 'position_title' | 'category', value: string) => {
        setUnifiedCommittee(prev => 
            prev.map(item => item.full_name === fullName ? { ...item, [field]: value } : item)
        );
    };

    // ── FUNGSI RESET MERIT ──
    const handleResetMerit = async (period: string) => {
        const confirmReset = window.confirm(`Adakah anda pasti ingin meriset SEMUA merit ahli kelab ini untuk kitaran ${period}? Tindakan ini tidak boleh dibatalkan.`);
        if (!confirmReset) return;

        setResetting(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ merit: 0 })
                .eq('club_id', selectedClubId);

            if (error) throw error;
            toast.success(`Merit berjaya di-reset untuk kitaran ${period}!`);
            await createLog(selectedClubId, profile?.id, profile?.full_name, 'RESET_MERIT', `Presiden meriset semua merit ahli ${clubData?.name ? `bagi ${clubData.name}` : ''} untuk kitaran ${period}`);
            fetchData(); 
        } catch (err: any) {
            toast.error("Gagal meriset merit: " + err.message);
        } finally {
            setResetting(false);
        }
    };

    // ── FUNGSI RESET KOHORT (KPP Exco Sahaja) ──
    const handleResetKohort = async () => {
        const clubName = clubData?.name || 'kelab ini';
        const confirm1 = window.confirm(
            `⚠️ AMARAN: Anda akan mereset SEMUA jawatan MT & Presiden bagi "${clubName}" kembali kepada Ahli Biasa.\n\nData keahlian kelab tetap kekal. Hanya peranan kepimpinan yang ditukar.\n\nTeruskan?`
        );
        if (!confirm1) return;

        const confirm2 = window.confirm(
            `🔴 PENGESAHAN TERAKHIR\n\nTindakan ini TIDAK BOLEH dibatalkan.\nSemua MT dan Presiden bagi "${clubName}" akan diturunkan kepada CLUB_MEMBER.\n\nAdakah anda PASTI?`
        );
        if (!confirm2) return;

        setResettingKohort(true);
        try {
            // 1. Tukar semua CLUB_MT & CLUB_PRESIDENT → CLUB_MEMBER untuk kelab ini sahaja
            const { error: roleErr } = await supabase
                .from('student_club_memberships')
                .update({ role: 'CLUB_MEMBER' })
                .eq('club_id', selectedClubId)
                .eq('account_status', 'APPROVED')
                .in('role', ['CLUB_PRESIDENT', 'CLUB_MT']);
            if (roleErr) throw roleErr;

            // 2. Clear president_id pada clubs table
            const { error: clubErr } = await supabase
                .from('clubs')
                .update({ president_id: null })
                .eq('id', selectedClubId);
            if (clubErr) throw clubErr;

            // 3. Padam data club_committee (jawatan override)
            const { error: commErr } = await supabase
                .from('club_committee')
                .delete()
                .eq('club_id', selectedClubId);
            if (commErr) throw commErr;

            toast.success(`Kohort berjaya direset untuk ${clubName}! Semua MT & Presiden kini menjadi Ahli Biasa.`);
            await createLog(
                selectedClubId, profile?.id, profile?.full_name,
                'RESET_KOHORT',
                `Exco KPP mereset kohort kepimpinan (MT & Presiden → Ahli Biasa) bagi ${clubName}.`
            );
            fetchData();
        } catch (err: any) {
            toast.error('Gagal mereset kohort: ' + err.message);
        } finally {
            setResettingKohort(false);
        }
    };

    // ── FUNGSI SIMPAN SEGALA NYA (Kelab + MT Override) ──
    const handleSaveAll = async () => {
        if (!clubData?.id) return;
        setLoading(true);
        try {
            // 1. Simpan Data Kelab (Warna + Penerangan)
            const { error: clubErr } = await supabase
                .from('clubs')
                .update({
                    theme_color: clubData.theme_color,
                    description: clubData.description
                })
                .eq('id', clubData.id);
            if (clubErr) throw clubErr;

            // 2. Simpan Data MT Override ke `club_committee`
            // Padam override lama (sebab mungkin MT dah bertukar orang / hilang role)
            const { error: delErr } = await supabase.from('club_committee').delete().eq('club_id', clubData.id);
            if (delErr) throw delErr;

            // Simpan yang baru
            const overridesToInsert = unifiedCommittee.map((u, i) => ({
                club_id: clubData.id,
                full_name: u.full_name,
                category: u.category,
                position_title: u.position_title,
                order_index: i
            }));

            if (overridesToInsert.length > 0) {
                const { error: insErr } = await supabase.from('club_committee').insert(overridesToInsert);
                if (insErr) throw insErr;
            }

            await refreshClubs();
            toast.success("Segala identiti & barisan kepimpinan disimpan!");
            await createLog(selectedClubId, profile?.id, profile?.full_name, 'UPDATE_CLUB', `Presiden mengemaskini maklumat dan jawatankuasa ${clubData?.name ? `bagi ${clubData.name}` : 'kelab'}.`);
            
            fetchData();
        } catch(err: any) {
            toast.error("Gagal simpan: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── FUNGSI UPLOAD LOGO ──
    const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) return;
            const file = event.target.files[0];
            
            const { compressImage } = await import('@/lib/imageCompression');
            const compressedFile = await compressImage(file);

            const filePath = `${clubData.id}/logo-${Date.now()}.${compressedFile.name.split('.').pop()}`;

            await supabase.storage.from('club-logos').upload(filePath, compressedFile);
            const { data: { publicUrl } } = supabase.storage.from('club-logos').getPublicUrl(filePath);

            await supabase.from('clubs').update({ logo_url: publicUrl }).eq('id', clubData.id);
            setClubData((prev: any) => ({ ...prev, logo_url: publicUrl }));
            await refreshClubs();
            toast.success("Logo dikemaskini!");
            await createLog(selectedClubId, profile?.id, profile?.full_name, 'UPDATE_CLUB', `Presiden memuat naik logo baharu ${clubData?.name ? `untuk ${clubData.name}` : 'kelab'}.`);
        } catch (err) {
            toast.error("Ralat muat naik logo.");
        } finally {
            setUploading(false);
        }
    };

    const textColor = getContrastColor(clubData?.theme_color || '#0f172a');

    if (loading && !clubData) return <div className="p-32 text-center animate-pulse font-black opacity-20 uppercase tracking-widest">Menyelaras Data...</div>;

    // Pecahkan kategori UI
    const mtMembers = unifiedCommittee.filter(m => m.category === 'MT');
    const excoMembers = unifiedCommittee.filter(m => m.category === 'EXCO');



    return (
        <div className="page-container space-y-10 after:content-[''] after:block after:h-36 after:shrink-0">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter gradient-text leading-tight">Urus Kelab</h1>
                    <p className="text-muted-foreground font-medium text-sm max-w-lg leading-relaxed">
                        Kemaskini identiti, warna tema dan susun jawatan Majlis Tertinggi secara automatik dari profil Ahli Kelab.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* ── LAJUR KIRI (4/12) ── */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="bento-card border-none overflow-hidden bg-card shadow-sm">
                        <CardHeader className="border-b border-border/40">
                            <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
                                <Palette className="w-4 h-4" /> Identiti Visual
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-8">
                            <div className="p-8 rounded-[2rem] shadow-inner text-center space-y-1" style={{ backgroundColor: clubData?.theme_color || '#0f172a' }}>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50" style={{ color: textColor }}>Contoh Paparan</p>
                                <h3 className="text-2xl font-black tracking-tighter leading-none" style={{ color: textColor }}>{clubData?.name}</h3>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-muted/30 flex items-center justify-center overflow-hidden border-4 shadow-xl transition-all duration-500 hover:scale-105" style={{ borderColor: clubData?.theme_color || 'hsl(var(--border))' }}>
                                        {clubData?.logo_url ? <img src={clubData.logo_url} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <Camera className="opacity-10 w-10 h-10" />}
                                    </div>
                                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] cursor-pointer">
                                        <Camera className="text-white w-6 h-6" />
                                        <input type="file" className="hidden" accept="image/*" onChange={uploadLogo} />
                                    </label>
                                </div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground">{uploading ? 'Memproses...' : 'Tukar Logo'}</p>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Warna Tema</Label>
                                <div className="flex items-center gap-4 p-1.5 rounded-[1.5rem] bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                                    <input type="color" value={clubData?.theme_color || '#0f172a'} onChange={(e) => setClubData({ ...clubData, theme_color: e.target.value })} className="w-12 h-12 rounded-[1rem] border-none cursor-pointer bg-transparent shadow-inner shrink-0" />
                                    <span className="font-mono font-bold text-sm uppercase tracking-tighter truncate">{clubData?.theme_color || '#0F172A'}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Penerangan / Slogan</Label>
                                <Textarea value={clubData?.description || ''} onChange={(e) => setClubData({ ...clubData, description: e.target.value })} placeholder="Ceritakan misi kelab anda..." className="rounded-[1.5rem] bg-muted/30 border-border/40 resize-none h-28 text-sm font-medium focus-visible:ring-primary/20" />
                            </div>
                        </CardContent>
                    </Card>

                    {isPresident && (
                        <Card className="bento-card border-none bg-card shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-dashed bg-rose-500/5">
                                <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-rose-600">
                                    <RefreshCcw className={cn("w-4 h-4", resetting && "animate-spin")} /> Pengurusan Merit
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                                    Set semula merit ahli kepada <span className="font-bold text-rose-600">0</span> mengikut kitaran sistem pilihan anda.
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                    <Button variant="outline" disabled={resetting} onClick={() => handleResetMerit('Bulanan')} className="justify-between h-10 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500/10 hover:text-rose-600 transition-all border-border/40 shadow-sm">
                                        Reset Bulanan <TrendingUp className="w-3 h-3 opacity-30" />
                                    </Button>
                                    <Button variant="outline" disabled={resetting} onClick={() => handleResetMerit('Tahunan')} className="justify-between h-11 mt-2 rounded-[1rem] text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-700 border-none transition-all shadow-xl shadow-rose-600/20">
                                        Tetapan Semula Tahunan <Trophy className="w-3 h-3 opacity-50" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── RESET KOHORT (KPP Exco / SuperAdmin sahaja) ── */}
                    {(isKppExco || isSuperAdmin) && (
                        <Card className="bento-card border-none bg-card shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-dashed bg-orange-500/5">
                                <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-orange-600">
                                    <RotateCcw className={cn("w-4 h-4", resettingKohort && "animate-spin")} /> Reset Kohort Kelab
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-start gap-3 p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                                    <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-orange-700 dark:text-orange-400 font-medium leading-relaxed">
                                        Tukar <strong>semua MT & Presiden</strong> kelab ini kembali kepada <strong>Ahli Biasa</strong>. Data keahlian tetap kekal — hanya peranan kepimpinan yang direset.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    disabled={resettingKohort}
                                    onClick={handleResetKohort}
                                    className="w-full justify-between h-11 rounded-[1rem] text-[10px] font-black uppercase bg-orange-600 text-white hover:bg-orange-700 border-none transition-all shadow-xl shadow-orange-600/20"
                                >
                                    {resettingKohort ? 'Sedang Mereset...' : 'Reset Kohort'}
                                    <RotateCcw className="w-3.5 h-3.5 opacity-60" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── LAJUR KANAN: KEPIMPINAN (8/12) ── */}
                <div className="lg:col-span-8 space-y-8">
                    {/* INFO MAKLUMAN AUTO LIST */}
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-4">
                        <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                        <p className="text-[11px] font-medium text-primary/80 leading-relaxed uppercase tracking-widest mt-0.5">
                            Senarai jawatankuasa di bawah <strong>disusun secara automatik</strong> berdasarkan peranan "MT / Exco (Ada Akses)" atau "Presiden" yang dilantik melalui modul <span className="font-black text-primary border border-primary/20 rounded px-1.5 py-0.5 bg-primary/10 cursor-pointer" onClick={() => window.location.href='/ahli'}>Pengurusan Ahli</span>. Anda hanya perlu kategorikan mereka dan namakan jawatan.
                        </p>
                    </div>

                    <Card className="bento-card border-none bg-card shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between bg-amber-500/5 p-6 border-b border-amber-500/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-600 shadow-inner"><Trophy className="w-5 h-5" /></div>
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest">Majlis Tertinggi (MT)</CardTitle>
                                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Jawatan utama (Presiden, Naib, Setiausaha, Bendahari)</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {mtMembers.length > 0 ? mtMembers.map(m => (
                                <div key={m.full_name} className="flex flex-col md:flex-row gap-4 p-5 bg-muted/20 border-border/50 rounded-2xl border items-center">
                                    <div className="flex-1 w-full space-y-1 relative">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Nama Pemegang Jawatan</Label>
                                        <div className="h-10 rounded-xl bg-transparent font-bold text-sm flex items-center px-2">
                                            {m.full_name}
                                        </div>
                                    </div>
                                    
                                    <div className="w-full md:w-1/3 shrink-0 space-y-1">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Kategori Kepimpinan</Label>
                                        <Select
                                            value={m.category}
                                            onValueChange={(val) => handleCommitteeChange(m.full_name, 'category', val)}
                                        >
                                            <SelectTrigger className="h-10 bg-card rounded-xl font-bold border-border/60">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="MT" className="font-bold text-xs">Majlis Tertinggi (MT)</SelectItem>
                                                <SelectItem value="EXCO" className="font-bold text-xs">AJK / Exco</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-full md:w-2/5 shrink-0 space-y-1">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Nama Jawatan Semasa</Label>
                                        <Input
                                            value={m.position_title}
                                            onChange={(e) => handleCommitteeChange(m.full_name, 'position_title', e.target.value)}
                                            className="h-10 font-bold border-border/60 rounded-xl text-sm focus-visible:ring-primary/20"
                                            placeholder="Contoh: Bendahari"
                                        />
                                    </div>
                                </div>
                            )) : <div className="text-center py-10 opacity-30 bg-muted/20 rounded-2xl border-2 border-dashed"><Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" /><p className="text-[10px] font-black uppercase tracking-widest">Tiada MT kelab dikesan</p></div>}
                        </CardContent>
                    </Card>

                    <Card className="bento-card border-none bg-card shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between bg-emerald-500/5 p-6 border-b border-emerald-500/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-600 shadow-inner"><UserCog className="w-5 h-5" /></div>
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest">AJK & Exco</CardTitle>
                                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Ketua unit, AJK Publisiti, Ahli Jawatankuasa Sukan</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {excoMembers.length > 0 ? excoMembers.map(m => (
                                <div key={m.full_name} className="flex flex-col md:flex-row gap-4 p-5 bg-muted/20 border-border/50 rounded-2xl border items-center">
                                    <div className="flex-1 w-full space-y-1 relative">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Nama Pemegang Jawatan</Label>
                                        <div className="h-10 rounded-xl bg-transparent font-bold text-sm flex items-center px-2">
                                            {m.full_name}
                                        </div>
                                    </div>
                                    
                                    <div className="w-full md:w-1/3 shrink-0 space-y-1">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Kategori Kepimpinan</Label>
                                        <Select
                                            value={m.category}
                                            onValueChange={(val) => handleCommitteeChange(m.full_name, 'category', val)}
                                        >
                                            <SelectTrigger className="h-10 bg-card rounded-xl font-bold border-border/60">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="MT" className="font-bold text-xs">Majlis Tertinggi (MT)</SelectItem>
                                                <SelectItem value="EXCO" className="font-bold text-xs">AJK / Exco</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-full md:w-2/5 shrink-0 space-y-1">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Nama Jawatan Semasa</Label>
                                        <Input
                                            value={m.position_title}
                                            onChange={(e) => handleCommitteeChange(m.full_name, 'position_title', e.target.value)}
                                            className="h-10 font-bold border-border/60 rounded-xl text-sm focus-visible:ring-primary/20"
                                            placeholder="Contoh: Bendahari"
                                        />
                                    </div>
                                </div>
                            )) : <div className="text-center py-10 opacity-30 bg-muted/20 rounded-2xl border-2 border-dashed"><Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" /><p className="text-[10px] font-black uppercase tracking-widest">Tiada Ahli Jawatankuasa/Exco dikesan</p></div>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* STICKY ACTION BAR */}
            <div className="fixed bottom-[100px] md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-6">
                <div className="glass rounded-[2rem] p-3 flex items-center justify-between gap-4 shadow-2xl border-white/40 ring-1 ring-black/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl">
                    <div className="flex items-center gap-3 pl-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Save size={18} />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-none text-muted-foreground">Editor Identiti</p>
                            <p className="text-[11px] font-black text-foreground mt-0.5 uppercase tracking-widest">Tindakan Selesai?</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={fetchData} variant="outline" className="rounded-xl h-12 px-6 font-black text-[10px] uppercase tracking-widest border-border hover:bg-muted/50">
                            Batal
                        </Button>
                        <Button onClick={handleSaveAll} disabled={loading} className="rounded-xl h-12 px-8 font-black text-[10px] uppercase tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                            {loading ? 'Menyimpan...' : 'Simpan Semua'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}