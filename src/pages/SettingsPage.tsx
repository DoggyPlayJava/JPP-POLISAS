import React, { useState, useEffect } from 'react';
import {
  User, Bell, Shield, CreditCard, Mail, Lock, Camera, Check, Award, Globe, Loader2, FileText, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export function SettingsPage() {
  const { user, profile, refetchProfile, effectiveRole } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false); // State khas untuk avatar
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // 🔥 FUNGSI MUAT NAIK AVATAR DENGAN "BOUNCER 2MB"
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!event.target.files || event.target.files.length === 0 || !user) return;

      const file = event.target.files[0];

      // 🚨 Bouncer 2MB (2 * 1024 * 1024 bytes)
      if (file.size > 2097152) {
        toast.error("Gagal: Saiz fail terlalu besar! Maksimum 2MB sahaja.");
        return;
      }

      // Proses muat naik
      const fileExt = file.name.split('.').pop();
      // Format laluan fail: "user_id/avatar-timestamp.ext"
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Dapatkan URL awam gambar tersebut
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Kemaskini dalam table profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Beritahu sistem untuk muat semula profil
      await refetchProfile();
      toast.success("Gambar profil berjaya dikemaskini!");

    } catch (error: any) {
      toast.error(error.message || "Ralat memuat naik gambar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !fullName.trim()) return;

    setLoading(true);
    try {
      const oldName = profile?.full_name;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      if (profileError) throw profileError;

      if (oldName && oldName !== fullName.trim()) {
        await supabase
          .from('club_committee')
          .update({ full_name: fullName.trim() })
          .eq('full_name', oldName);
      }

      await refetchProfile();
      toast.success('Profil berjaya disegerakkan dengan sistem!');
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengemaskini profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e?: React.FormEvent) => {
    // ... (Fungsi password kekal sama) ...
    if (e) e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Kata laluan tidak sepadan atau kosong.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Kata laluan berjaya ditukar!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menukar kata laluan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container space-y-12">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Badge variant="secondary" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] bg-accent/10 text-accent border-none glow-accent">Pusat Kawalan</Badge>
          <div className="space-y-1">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter gradient-text">Tetapan</h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl font-medium leading-relaxed">Urus parameter <span className="text-primary font-bold text-base uppercase tracking-widest">Tetapan Peribadi</span> dan operasi keselamatan sistem anda.</p>
          </div>
        </div>
      </motion.div>

      {/* TABS PENGEMUDIAN */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-muted/30 h-auto p-1.5 rounded-[1.5rem] gap-2 border border-border/50 shadow-inner mb-12 flex-wrap">
          {[
            { value: 'general', icon: User, label: 'Profil' },
            { value: 'notifications', icon: Bell, label: 'Pemberitahuan' },
            { value: 'security', icon: Shield, label: 'Keselamatan' },
            { value: 'billing', icon: CreditCard, label: 'Langganan' },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-background data-[state=active]:shadow-xl data-[state=active]:text-primary rounded-xl px-10 py-3 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300 flex items-center gap-3 border border-transparent data-[state=active]:border-border/50">
              <tab.icon className="w-4 h-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          {/* --- TAB PROFIL (GENERAL) --- */}
          <TabsContent value="general" className="space-y-10 focus-visible:ring-0">
            <motion.div initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="space-y-10">
              <Card className="premium-card bg-background/60 backdrop-blur-md border-border/30 overflow-hidden shadow-sm">
                <CardHeader className="p-10 pb-8 border-b border-border/30">
                  <CardTitle className="text-2xl font-black tracking-tight uppercase tracking-[0.1em]">Profil Awam</CardTitle>
                  <CardDescription className="text-sm font-medium">Bagaimana profil anda dipaparkan di seluruh sistem.</CardDescription>
                </CardHeader>
                <CardContent className="p-10 space-y-12">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-10">

                    {/* 🔥 RUANGAN AVATAR DENGAN FUNGSI MUAT NAIK 🔥 */}
                    <div className="relative group">
                      <Avatar className="h-32 w-32 rounded-[2.5rem] border-4 border-background shadow-2xl ring-4 ring-border/30 transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
                        {/* Papar gambar user jika ada, kalau takde guna Dicebear */}
                        <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=8B1A1A&textColor=FFF8F0`} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white font-black text-4xl">{initials}</AvatarFallback>
                      </Avatar>

                      {/* Input file yang disembunyikan */}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="avatar-upload"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                      />

                      {/* Label yang bertindak sebagai butang */}
                      <label
                        htmlFor="avatar-upload"
                        className={`h-10 w-10 rounded-2xl absolute -bottom-2 -right-2 flex items-center justify-center text-white shadow-2xl border-4 border-background transition-all glow-accent cursor-pointer
                          ${uploadingAvatar ? 'bg-slate-400 pointer-events-none' : 'bg-primary hover:scale-110 active:scale-95'}`}
                      >
                        {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                      </label>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-black text-xl tracking-tight leading-none">Gambar Profil</h3>
                      <p className="text-sm text-muted-foreground/80 font-medium max-w-sm leading-relaxed">
                        Pilih gambar beresolusi tinggi (Nisbah 1:1). <br />
                        <span className="text-primary font-bold">Maksimum saiz: 2MB.</span>
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-border/30" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* ... (Ruangan Input Profil Kekal Sama) ... */}
                    <div className="space-y-4">
                      <Label htmlFor="firstName" className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Pangkat / Peranan</Label>
                      <Input id="firstName" className="h-14 rounded-2xl bg-muted/30 border-border/50 font-black px-6 text-lg tracking-tight opacity-60 cursor-not-allowed" defaultValue={effectiveRole ? effectiveRole.replace('CLUB_', '').replace('_', ' ') : 'AHLI'} readOnly />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="lastName" className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Nama Penuh</Label>
                      <Input id="lastName" value={fullName} onChange={(e) => setFullName(e.target.value.toUpperCase())} className="h-14 rounded-2xl bg-muted/30 border-border/50 focus-visible:ring-primary/30 font-black px-6 text-lg tracking-tight uppercase" placeholder="CONTOH: MUHAMMAD ALI" />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="email" className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Emel (Tidak Boleh Diubah)</Label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                        <Input id="email" className="h-14 pl-14 pr-6 rounded-2xl bg-muted/20 border-border/30 font-black text-lg tracking-tight opacity-60 cursor-not-allowed" defaultValue={user?.email || ''} readOnly />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="timezone" className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Zon Masa</Label>
                      <div className="relative group">
                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                        <Input id="timezone" className="h-14 pl-14 pr-6 rounded-2xl bg-muted/30 border-border/50 font-black text-lg tracking-tight opacity-60 cursor-not-allowed" defaultValue="Waktu Piawai Malaysia (MYT)" readOnly />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <div className="p-8 bg-muted/20 border-t border-border/30 flex justify-end gap-4">
                  <Button variant="ghost" onClick={() => setFullName(profile?.full_name || '')} className="h-14 px-10 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-primary">Batal</Button>
                  <Button onClick={handleUpdateProfile} disabled={loading || fullName === profile?.full_name} className="h-14 px-12 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </Card>

              {/* TETAPAN PAPARAN (UI Only) */}
              <Card className="premium-card bg-background/60 backdrop-blur-md border-border/30 overflow-hidden shadow-sm">
                <CardHeader className="p-10 pb-8 border-b border-border/30">
                  <CardTitle className="text-2xl font-black tracking-tight uppercase tracking-[0.1em]">Tetapan Paparan</CardTitle>
                  <CardDescription className="text-sm font-medium">Urus pengalaman visual dalam antaramuka sistem.</CardDescription>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                  <div className="flex items-center justify-between group hover:translate-x-1 transition-transform duration-300">
                    <div className="space-y-2">
                      <Label className="text-xl font-black tracking-tight">Mod Gelap</Label>
                      <p className="text-sm text-muted-foreground/80 font-medium max-w-md">Aktifkan mod gelap untuk mengurangkan ketegangan mata.</p>
                    </div>
                    <Switch 
                      checked={theme === 'dark'} 
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                      className="data-[state=checked]:bg-primary scale-125 transition-all" 
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* --- TAB PEMBERITAHUAN --- */}
          <TabsContent value="notifications" className="space-y-10 focus-visible:ring-0">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
              <Card className="premium-card bg-background/60 backdrop-blur-md border-border/30 overflow-hidden shadow-sm">
                <CardHeader className="p-10 pb-4">
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Tetapan Notifikasi</CardTitle>
                  <CardDescription>Urus bagaimana anda menerima makluman aktiviti kelab.</CardDescription>
                </CardHeader>
                <CardContent className="p-10 pt-0 space-y-8">
                  {[
                    { title: 'Notifikasi Laporan', desc: 'Terima makluman apabila laporan anda diluluskan atau ditolak oleh JPP.', icon: FileText },
                    { title: 'Amnesti & Kunci', desc: 'Dapatkan pemberitahuan sekiranya program anda perlu dibuka kunci.', icon: Lock },
                    { title: 'Aktiviti Baru', desc: 'Makluman mengenai aktiviti terbaru dari kelab-kelab lain.', icon: Activity }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex gap-4">
                        <div className="p-2.5 rounded-xl bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <item.icon size={18} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-black text-sm">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{item.desc}</p>
                        </div>
                      </div>
                      <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* --- TAB KESELAMATAN (SECURITY) --- */}
          <TabsContent value="security" className="space-y-10 focus-visible:ring-0">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
              <Card className="premium-card bg-background/60 backdrop-blur-md border-border/30 overflow-hidden shadow-sm">
                <CardHeader className="p-10 pb-8 border-b border-border/30">
                  <CardTitle className="text-2xl font-black tracking-tight uppercase">Keselamatan Akaun</CardTitle>
                  <CardDescription>Kekalkan keselamatan akaun anda dengan kata laluan yang kuat.</CardDescription>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Kata Laluan Baru</Label>
                      <Input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-14 rounded-2xl bg-muted/30 border-border/50 font-black px-6 text-lg tracking-[0.3em]" 
                        placeholder="••••••••" 
                      />
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Sahkan Kata Laluan</Label>
                      <Input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-14 rounded-2xl bg-muted/30 border-border/50 font-black px-6 text-lg tracking-[0.3em]" 
                        placeholder="••••••••" 
                      />
                    </div>
                  </div>
                </CardContent>
                <div className="p-8 bg-muted/20 border-t border-border/30 flex justify-end">
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={loading || !newPassword}
                    className="h-14 px-12 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-105 transition-transform"
                  >
                    {loading ? 'Mengemaskini...' : 'Kemaskini Kata Laluan'}
                  </Button>
                </div>
              </Card>
              
              <div className="p-6 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-black text-rose-500 uppercase tracking-widest">Zon Bahaya</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Alih keluar akaun anda secara kekal daripada sistem e-KPP.</p>
                </div>
                <Button variant="ghost" className="h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all">Deaktif Akaun</Button>
              </div>
            </motion.div>
          </TabsContent>

          {/* --- TAB LANGGANAN (BILLING) --- */}
          <TabsContent value="billing" className="space-y-10 focus-visible:ring-0">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
              <Card className="premium-card bg-primary text-primary-foreground rounded-[3rem] p-12 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700"><Award size={200} /></div>
                <div className="relative z-10 space-y-6">
                  <Badge className="bg-white/20 text-white border-none px-4 py-1.5 font-black text-[10px] uppercase tracking-widest">Pelan Institusi</Badge>
                  <div className="space-y-2">
                    <h3 className="text-5xl font-black tracking-tighter">Polisas Enterprise</h3>
                    <p className="text-white/70 font-medium max-w-sm">Akaun anda didaftarkan di bawah lesen institusi POLISAS secara percuma dan tanpa had.</p>
                  </div>
                  <div className="pt-4 flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {[1,2,3].map(i => <Avatar key={i} className="h-10 w-10 border-4 border-primary"><AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+10}`} /></Avatar>)}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/50">+ 1,200 Ahli Aktif</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

        </AnimatePresence>
      </Tabs>
    </div>
  );
}