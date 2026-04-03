import React, { useEffect, useState } from 'react';
import {
    Camera, Palette, Users, Save, Trash2, RefreshCcw,
    ChevronsUpDown, Check, Search, ShieldCheck, UserCog,
    Trophy, TrendingUp
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

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

export function UrusKelabPage() {
    const { profile, refreshClubs, isPresident, selectedClubId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [resetting, setResetting] = useState(false);

    const [clubData, setClubData] = useState<any>(null);
    const [committee, setCommittee] = useState<any[]>([]);
    const [registeredMembers, setRegisteredMembers] = useState<any[]>([]);

    // isPresident kini dari AuthContext (berubah mengikut kelab yang dipilih)

    // ── FUNGSI FETCH DATA ──
    useEffect(() => {
        if (selectedClubId) fetchData();
    }, [selectedClubId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: club } = await supabase.from('clubs').select('*').eq('id', selectedClubId).single();
            const { data: members } = await supabase.from('club_committee').select('*').eq('club_id', selectedClubId).order('order_index', { ascending: true });
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, merit').eq('club_id', selectedClubId);

            setClubData(club);
            setCommittee(members || []);
            setRegisteredMembers(profiles || []);
        } catch (err: any) {
            toast.error("Gagal menarik data: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── FUNGSI RESET MERIT ──
    const handleResetMerit = async (period: string) => {
        const confirmReset = window.confirm(`Adakah anda pasti ingin meriset SEMUA merit ahli untuk kitaran ${period}? Tindakan ini tidak boleh dibatalkan.`);
        if (!confirmReset) return;

        setResetting(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ merit: 0 })
                .eq('club_id', selectedClubId);

            if (error) throw error;

            toast.success(`Merit berjaya di-reset untuk kitaran ${period}!`);

            // Rekod Log
            await createLog(selectedClubId, profile?.id, profile?.full_name, 'RESET_MERIT', `Presiden meriset semua merit ahli untuk kitaran ${period}`);

            fetchData(); // Refresh senarai ahli
        } catch (err: any) {
            toast.error("Gagal meriset merit: " + err.message);
        } finally {
            setResetting(false);
        }
    };

    // ── FUNGSI KEMASKINI KELAB ──
    const handleUpdateClub = async () => {
        if (!clubData?.id) return;
        setLoading(true);
        const { error } = await supabase
            .from('clubs')
            .update({
                theme_color: clubData.theme_color,
                description: clubData.description
            })
            .eq('id', clubData.id);

        if (error) {
            toast.error("Gagal simpan: " + error.message);
        } else {
            await refreshClubs();
            toast.success("Identiti kelab disimpan!");

            // Rekod Log
            await createLog(selectedClubId, profile?.id, profile?.full_name, 'UPDATE_CLUB', 'Presiden mengemaskini maklumat / warna tema kelab.');
        }
        setLoading(false);
    };

    // ── FUNGSI UPLOAD LOGO ──
    const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) return;
            const file = event.target.files[0];
            const filePath = `${clubData.id}/logo-${Date.now()}.${file.name.split('.').pop()}`;

            await supabase.storage.from('club-logos').upload(filePath, file);
            const { data: { publicUrl } } = supabase.storage.from('club-logos').getPublicUrl(filePath);

            await supabase.from('clubs').update({ logo_url: publicUrl }).eq('id', clubData.id);
            setClubData((prev: any) => ({ ...prev, logo_url: publicUrl }));

            await refreshClubs();
            toast.success("Logo dikemaskini!");

            // Rekod Log
            await createLog(selectedClubId, profile?.id, profile?.full_name, 'UPDATE_CLUB', 'Presiden telah memuat naik logo kelab yang baharu.');
        } catch (err) {
            toast.error("Ralat muat naik logo.");
        } finally {
            setUploading(false);
        }
    };

    // ── FUNGSI PENGURUSAN JAWATANKUASA ──
    const addMember = async (category: 'MT' | 'EXCO') => {
        if (!clubData?.id) return;
        const { data, error } = await supabase.from('club_committee').insert({
            club_id: clubData.id,
            category,
            position_title: category === 'MT' ? 'Naib Presiden' : 'Exco Sukan',
            full_name: '',
            order_index: committee.length
        }).select().single();

        if (!error && data) {
            setCommittee([...committee, data]);
            toast.success(`Slot ${category} ditambah.`);

            // Rekod Log
            await createLog(selectedClubId, profile?.id, profile?.full_name, 'MANAGE_COMMITTEE', `Presiden telah menambah satu slot baharu untuk jawatan ${category}.`);
        }
    };

    const updateMember = async (id: string, field: string, value: string) => {
        const { error } = await supabase.from('club_committee').update({ [field]: value }).eq('id', id);
        if (!error) {
            setCommittee(committee.map(m => m.id === id ? { ...m, [field]: value } : m));
        }
    };

    const deleteMember = async (id: string) => {
        const { error } = await supabase.from('club_committee').delete().eq('id', id);
        if (!error) {
            setCommittee(committee.filter(m => m.id !== id));
            toast.success("Ahli dikeluarkan.");

            // Rekod Log
            await createLog(selectedClubId, profile?.id, profile?.full_name, 'MANAGE_COMMITTEE', 'Presiden telah memadam/mengeluarkan satu slot jawatankuasa.');
        }
    };

    // ── DATA PREPARATION ──
    const mtMembers = committee.filter(m => m.category === 'MT');
    const excoMembers = committee.filter(m => m.category === 'EXCO');
    const textColor = getContrastColor(clubData?.theme_color || '#0f172a');

    if (loading) return <div className="p-20 text-center animate-pulse font-black opacity-20 uppercase tracking-widest">Menyelaras Data...</div>;

    // ── KOMPONEN MEMBER ROW ──
    const MemberRow = ({ m }: { m: any }) => {
        const selectedMember = registeredMembers.find(user => user.full_name === m.full_name);
        return (
            <div key={m.id} className="flex flex-col md:flex-row gap-4 p-5 bg-muted/20 rounded-3xl border border-transparent hover:border-border transition-all group">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase opacity-30 ml-1">Jawatan</Label>
                        <Input
                            value={m.position_title}
                            onChange={(e) => updateMember(m.id, 'position_title', e.target.value)}
                            className="h-10 bg-transparent border-none font-black text-sm focus-visible:ring-0 px-0"
                            placeholder="Contoh: Setiausaha"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase opacity-30 ml-1">Nama Ahli</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full h-10 rounded-xl justify-between border-border font-bold text-xs text-muted-foreground">
                                    <span className="truncate">{selectedMember ? selectedMember.full_name : "-- Pilih Ahli Berdaftar --"}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-2xl shadow-xl">
                                <Command>
                                    <CommandInput placeholder="Cari nama ahli..." className="h-11" />
                                    <CommandList className="max-h-[220px]">
                                        <CommandEmpty className="py-6 text-center text-[10px] font-bold uppercase opacity-30 tracking-widest">Tiada rekod ahli berdaftar</CommandEmpty>
                                        <CommandGroup>
                                            {registeredMembers.map((user) => (
                                                <CommandItem key={user.id} value={user.full_name} onSelect={(val) => updateMember(m.id, 'full_name', val === m.full_name ? "" : val)} className="h-11 cursor-pointer">
                                                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center mr-3", m.full_name === user.full_name ? "bg-primary border-primary" : "bg-card")}>
                                                        {m.full_name === user.full_name && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className="truncate">{user.full_name}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteMember(m.id)} className="h-10 w-10 text-muted-foreground/40 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all self-end md:self-center">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        );
    };

    // ── RENDER UI KESELURUHAN ──
    return (
        <div className="page-container space-y-10 pb-32">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter gradient-text">Urus Kelab</h1>
                    <p className="text-muted-foreground font-medium text-sm">Kemaskini identiti dan barisan kepimpinan kelab anda.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 animate-in fade-in zoom-in duration-500">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Auto-Save Aktif</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* ── LAJUR KIRI (4/12) ── */}
                <div className="lg:col-span-4 space-y-6">
                    {/* CARD IDENTITI VISUAL */}
                    <Card className="bento-card border-none overflow-hidden bg-card shadow-sm">
                        <CardHeader className="border-b border-dashed">
                            <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-muted-foreground">
                                <Palette className="w-4 h-4" /> Identiti Visual
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-8">
                            <div className="p-8 rounded-[2rem] shadow-inner text-center space-y-1" style={{ backgroundColor: clubData?.theme_color || '#0f172a' }}>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50" style={{ color: textColor }}>Contoh Paparan</p>
                                <h3 className="text-2xl font-black tracking-tighter" style={{ color: textColor }}>{clubData?.name}</h3>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-muted/30 flex items-center justify-center overflow-hidden border-4 shadow-xl transition-all duration-500" style={{ borderColor: clubData?.theme_color || 'hsl(var(--border))' }}>
                                        {clubData?.logo_url ? <img src={clubData.logo_url} className="w-full h-full object-cover" /> : <Camera className="opacity-10 w-10 h-10" />}
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
                                <div className="flex items-center gap-4 p-1 rounded-2xl bg-muted/30 border border-border">
                                    <input type="color" value={clubData?.theme_color || '#0f172a'} onChange={(e) => setClubData({ ...clubData, theme_color: e.target.value })} className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent" />
                                    <span className="font-mono font-bold text-sm uppercase tracking-tighter">{clubData?.theme_color || '#0F172A'}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Penerangan</Label>
                                <Textarea value={clubData?.description || ''} onChange={(e) => setClubData({ ...clubData, description: e.target.value })} placeholder="Ceritakan misi kelab anda..." className="rounded-2xl bg-muted/30 border-none resize-none h-28 text-sm font-medium focus-visible:ring-primary/10" />
                            </div>

                            <Button onClick={handleUpdateClub} className="w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:opacity-90 shadow-xl transition-all">
                                <Save className="w-4 h-4 mr-2" /> Simpan Identiti
                            </Button>
                        </CardContent>
                    </Card>

                    {/* CARD PENGURUSAN MERIT */}
                    {isPresident && (
                        <Card className="bento-card border-none bg-card shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-dashed bg-rose-500/10">
                                <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-rose-600">
                                    <RefreshCcw className={cn("w-4 h-4", resetting && "animate-spin")} /> Pengurusan Merit
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <p className="text-[11px] text-muted-foreground font-medium">Set semula merit ahli kepada <span className="font-bold text-rose-600">0</span> mengikut kitaran pilihan anda.</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <Button variant="outline" disabled={resetting} onClick={() => handleResetMerit('Bulanan')} className="justify-between h-10 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500/10 hover:text-rose-600 transition-all border-border/40">
                                        Reset Bulanan <TrendingUp className="w-3 h-3 opacity-30" />
                                    </Button>
                                    <Button variant="outline" disabled={resetting} onClick={() => handleResetMerit('6 Bulan')} className="justify-between h-10 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500/10 hover:text-rose-600 transition-all border-border/40">
                                        Reset 6 Bulan <RefreshCcw className="w-3 h-3 opacity-30" />
                                    </Button>
                                    <Button variant="outline" disabled={resetting} onClick={() => handleResetMerit('Tahunan')} className="justify-between h-10 rounded-xl text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-700 border-none transition-all shadow-lg shadow-rose-600/20">
                                        Reset Tahunan <Trophy className="w-3 h-3 opacity-50" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-center font-bold text-rose-600/40 uppercase tracking-tighter">*Tindakan ini akan memberi kesan kepada semua ahli kelab.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── LAJUR KANAN: KEPIMPINAN (8/12) ── */}
                <div className="lg:col-span-8 space-y-8">
                    <Card className="bento-card border-none bg-card shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between bg-amber-500/5 p-6 border-b border-amber-500/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600"><ShieldCheck className="w-5 h-5" /></div>
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest">Majlis Tertinggi (MT)</CardTitle>
                                    <p className="text-[10px] font-medium text-muted-foreground">Presiden, Naib, Setiausaha, Bendahari</p>
                                </div>
                            </div>
                            <Button onClick={() => addMember('MT')} size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase bg-amber-600 hover:bg-amber-700 text-white border-none transition-all">+ Slot MT</Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {mtMembers.length > 0 ? mtMembers.map(m => <MemberRow key={m.id} m={m} />) : <div className="text-center py-10 opacity-20"><Users className="w-8 h-8 mx-auto mb-2" /><p className="text-[10px] font-black uppercase">Tiada MT didaftarkan</p></div>}
                        </CardContent>
                    </Card>

                    <Card className="bento-card border-none bg-card shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between bg-primary/5 p-6 border-b border-primary/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg text-primary"><UserCog className="w-5 h-5" /></div>
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest">Exco & Jawatankuasa</CardTitle>
                                    <p className="text-[10px] font-medium text-muted-foreground">Ketua Exco, Timbalan, dan AJK</p>
                                </div>
                            </div>
                            <Button onClick={() => addMember('EXCO')} size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase bg-primary hover:bg-primary/90 text-primary-foreground border-none transition-all">+ Slot EXCO</Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {excoMembers.length > 0 ? excoMembers.map(m => <MemberRow key={m.id} m={m} />) : <div className="text-center py-10 opacity-20"><Users className="w-8 h-8 mx-auto mb-2" /><p className="text-[10px] font-black uppercase">Tiada EXCO didaftarkan</p></div>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* STICKY ACTION BAR */}
            <div className="fixed bottom-[100px] md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-6 animate-in slide-in-from-bottom-10 duration-700">
                <div className="glass rounded-3xl p-3 flex items-center justify-between gap-4 shadow-2xl border-white/40 ring-1 ring-black/5">
                    <div className="flex items-center gap-3 pl-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none text-muted-foreground/40">Mod Editor</p>
                            <p className="text-xs font-black text-foreground">Presiden Kelab</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={fetchData} variant="outline" className="rounded-2xl h-12 px-5 font-black text-[10px] uppercase tracking-widest border-border">
                            <RefreshCcw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Segarkan
                        </Button>
                        <Button onClick={handleUpdateClub} disabled={loading} className="rounded-2xl h-12 px-8 font-black text-[10px] uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            {loading ? 'Menyimpan...' : 'Simpan Semua'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}