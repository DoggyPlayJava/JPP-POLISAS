import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  User, Bell, Shield, CreditCard, Mail, Lock, Camera, Check, Award, Globe, Loader2, FileText, Activity, HelpCircle, MessageSquare, Headphones, ExternalLink, Sparkles, Phone, ArrowLeft
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

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'general';

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false); // State khas untuk avatar
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States untuk OTP
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    if (profile?.phone) {
      setPhone(profile.phone);
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

  const commitUpdates = async () => {
    if (!user || !fullName.trim()) return;
    
    setLoading(true);
    try {
      const isProfileChanged = fullName !== profile?.full_name || phone !== profile?.phone;
      const isEmailChanged = email !== user?.email;

      if (isProfileChanged) {
        const oldName = profile?.full_name;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            full_name: fullName.trim(),
            phone: phone.trim()
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        if (oldName && oldName !== fullName.trim()) {
          await supabase
            .from('club_committee')
            .update({ full_name: fullName.trim() })
            .eq('full_name', oldName);
        }
        await refetchProfile();
      }

      if (isEmailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
        toast.success('Sila semak emel baru anda (dan emel lama) untuk pautan pengesahan.');
      } else if (isProfileChanged) {
        toast.success('Profil berjaya disegerakkan dengan sistem!');
      }

    } catch (error: any) {
      toast.error(error.message || 'Gagal mengemaskini profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const isPhoneChanged = phone !== profile?.phone;
    
    // Jika telefon bimbit berubah, kita perlukan verifikasi OTP
    if (isPhoneChanged && phone.trim() !== '') {
      handleInitiateOTP();
      return;
    }

    // Jika tiada pertukaran nombor telefon, simpan terus
    await commitUpdates();
  };

  const handleInitiateOTP = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(newOTP);
      
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: user.email,
          subject: "Kod Pengesahan Portal JPP",
          html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">Pengesahan Penukaran Nombor Telefon</h2>
            <p>Sistem merekodkan percubaan untuk menukar nombor telefon di akaun anda.</p>
            <p>Gunakan kod 6-digit di bawah untuk melengkapkan pengesahan ini:</p>
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="letter-spacing: 8px; margin: 0; color: #4338ca; font-size: 32px;">${newOTP}</h1>
            </div>
            <p style="font-size: 12px; color: #64748b;">Sekiranya anda tidak meminta pertukaran ini, sila abaikan emel ini dan periksa keselamatan akaun anda.</p>
          </div>`
        }
      });
      
      if (error) throw error;
      
      setShowOTPModal(true);
      setOtpInput('');
      toast.success('Peringatan: Kod pengesahan telah dihantar ke emel semasa anda.');
    } catch (err: any) {
      toast.error(err.message || "Gagal menghantar kod pengesahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === generatedOTP) {
      setShowOTPModal(false);
      setOtpInput('');
      setGeneratedOTP('');
      await commitUpdates();
    } else {
      toast.error('Kod pengesahan (OTP) tidak sepadan atau tidak sah.');
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container space-y-10 pb-20 pt-8">
      
      {/* ── HEADER ── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-card/40 p-5 sm:p-8 rounded-[2.5rem] border border-border/60 backdrop-blur-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300 w-fit font-bold text-[10px] uppercase tracking-widest"
            >
              <ArrowLeft className="w-3 h-3" />
              Kembali
            </button>
            <Badge className="bg-primary/10 text-primary border-none px-3 uppercase text-[10px] font-black">Pusat Kawalan</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-none">Tetapan</h1>
          <p className="text-muted-foreground text-sm font-medium">Urus parameter peribadi dan operasi sistem anda.</p>
        </div>
      </header>

      {/* TABS PENGEMUDIAN */}
      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })} className="w-full">
        <TabsList className="bg-muted/30 h-auto p-1 rounded-2xl gap-1 border border-border/50 mb-8 flex-wrap">
          {[
            { value: 'general', icon: User, label: 'Profil' },
            { value: 'notifications', icon: Bell, label: 'Pemberitahuan' },
            { value: 'security', icon: Shield, label: 'Keselamatan' },
            { value: 'billing', icon: CreditCard, label: 'Langganan' },
            { value: 'help', icon: HelpCircle, label: 'Bantuan & Isu' },
          ].map((tab) => (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value} 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary rounded-xl px-4 py-2.5 font-bold text-xs transition-all duration-300 flex items-center gap-2"
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          {/* --- TAB PROFIL (GENERAL) --- */}
          <TabsContent value="general" className="space-y-8 focus-visible:ring-0 mt-0">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-8">
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 border border-border/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-2">Profil Awam</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Bagaimana profil anda dipaparkan di seluruh sistem.</p>
                  </div>
                </div>

                <div className="space-y-10">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                    {/* 🔥 RUANGAN AVATAR DENGAN FUNGSI MUAT NAIK 🔥 */}
                    <div className="relative group shrink-0">
                      <Avatar className="h-24 w-24 rounded-[2rem] border-4 border-background shadow-lg ring-2 ring-border/30 transition-transform duration-300 group-hover:scale-105">
                        <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=8B1A1A&textColor=FFF8F0`} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white font-black text-2xl">{initials}</AvatarFallback>
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
                        className={`h-8 w-8 rounded-xl absolute -bottom-2 -right-2 flex items-center justify-center text-white shadow-lg border-2 border-background transition-all cursor-pointer
                          ${uploadingAvatar ? 'bg-slate-400 pointer-events-none' : 'bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95'}`}
                      >
                        {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      </label>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-base">Gambar Profil</h3>
                      <p className="text-xs text-muted-foreground font-medium max-w-sm">
                        Pilih gambar beresolusi tinggi (Nisbah 1:1). <br />
                        <span className="text-primary font-bold">Maksimum saiz: 2MB.</span>
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-border/40" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-xs font-bold text-muted-foreground ml-1">Pangkat / Peranan</Label>
                      <Input id="firstName" className="h-11 rounded-xl bg-muted/40 font-semibold px-4 text-sm opacity-60 cursor-not-allowed" defaultValue={effectiveRole ? effectiveRole.replace('CLUB_', '').replace('_', ' ') : 'AHLI'} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-xs font-bold text-muted-foreground ml-1">Nama Penuh</Label>
                      <Input id="lastName" value={fullName} onChange={(e) => setFullName(e.target.value.toUpperCase())} className="h-11 rounded-xl bg-background font-semibold px-4 text-sm uppercase" placeholder="CONTOH: MUHAMMAD ALI" />
                    </div>
                    {/* NO TELEFON */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground ml-1">No Telefon Bimbit</Label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 pl-10 pr-4 rounded-xl bg-background font-semibold text-sm" placeholder="CONTOH: 0123456789" type="tel" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold text-muted-foreground ml-1">Emel (Memerlukan Pengesahan)</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input 
                          id="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 pl-10 pr-4 rounded-xl bg-background font-semibold text-sm" 
                          placeholder="CONTOH: ali@gmail.com" 
                          type="email" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="text-xs font-bold text-muted-foreground ml-1">Zon Masa</Label>
                      <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input id="timezone" className="h-11 pl-10 pr-4 rounded-xl bg-muted/40 font-semibold text-sm opacity-60 cursor-not-allowed" defaultValue="Waktu Piawai Malaysia (MYT)" readOnly />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                    <Button variant="ghost" onClick={() => { setFullName(profile?.full_name || ''); setPhone(profile?.phone || ''); setEmail(user?.email || ''); }} className="h-11 px-6 rounded-xl font-bold text-xs text-muted-foreground hover:text-primary">Batal</Button>
                    <Button onClick={handleUpdateProfile} disabled={loading || (fullName === profile?.full_name && phone === profile?.phone && email === user?.email)} className="h-11 px-8 rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
                      {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* TETAPAN PAPARAN (UI Only) */}
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 border border-border/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Tetapan Paparan</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Urus pengalaman visual dalam antaramuka sistem.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border border-border/40 p-5 rounded-2xl bg-background/50 hover:bg-muted/20 transition-colors">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold">Mod Gelap</Label>
                    <p className="text-xs text-muted-foreground font-medium">Aktifkan mod gelap mengikut keselesaan mata anda.</p>
                  </div>
                  <Switch 
                    checked={theme === 'dark'} 
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    className="data-[state=checked]:bg-primary" 
                  />
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* --- TAB PEMBERITAHUAN --- */}
          <TabsContent value="notifications" className="space-y-8 focus-visible:ring-0 mt-0">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 border border-border/40">
                <div className="mb-8">
                  <h3 className="text-xl font-black tracking-tight">Tetapan Notifikasi</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Urus penerimaan makluman kelab.</p>
                </div>
                <div className="space-y-4">
                  {[
                    { title: 'Notifikasi Laporan', desc: 'Terima makluman apabila laporan diluluskan/ditolak.', icon: FileText },
                    { title: 'Amnesti & Kunci', desc: 'Pemberitahuan sekiranya program dibuka kunci.', icon: Lock },
                    { title: 'Aktiviti Baru', desc: 'Makluman aktiviti dari kelab atau persatuan lain.', icon: Activity }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-background/50 hover:bg-muted/20 transition-colors">
                      <div className="flex gap-4 items-center">
                        <div className="p-2.5 rounded-xl bg-muted text-muted-foreground shrink-0">
                          <item.icon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* --- TAB KESELAMATAN (SECURITY) --- */}
          <TabsContent value="security" className="space-y-8 focus-visible:ring-0 mt-0">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 border border-border/40">
                <div className="mb-8">
                  <h3 className="text-xl font-black tracking-tight">Keselamatan Akaun</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Kekalkan keselamatan dengan kata laluan rawak.</p>
                </div>
                <div className="space-y-6 max-w-lg">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground ml-1">Kata Laluan Baru</Label>
                    <Input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 rounded-xl bg-background font-mono px-4 text-sm tracking-widest" 
                      placeholder="••••••••" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground ml-1">Sahkan Kata Laluan</Label>
                    <Input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 rounded-xl bg-background font-mono px-4 text-sm tracking-widest" 
                      placeholder="••••••••" 
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      onClick={handleUpdatePassword} 
                      disabled={loading || !newPassword}
                      className="h-11 px-8 rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-sm hover:scale-[1.02] transition-all"
                    >
                      {loading ? 'Mengemaskini...' : 'Simpan Kata Laluan'}
                    </Button>
                  </div>
                </div>
              </Card>
              
              <div className="p-6 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-black text-rose-600">Zon Bahaya</p>
                  <p className="text-xs text-rose-600/70 font-medium">Alih keluar akaun secara kekal daripada sistem Portal JPP.</p>
                </div>
                <Button variant="ghost" className="h-10 px-6 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 transition-all shrink-0">Deaktif Akaun</Button>
              </div>
            </motion.div>
          </TabsContent>

          {/* --- TAB LANGGANAN (BILLING) --- */}
          <TabsContent value="billing" className="space-y-8 focus-visible:ring-0 mt-0">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3 }} 
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* --- FREE TIER --- */}
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 flex flex-col justify-between border border-border/40 relative overflow-hidden group">
                <div className="space-y-8 relative z-10">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="rounded-full px-3 py-1 border-border/50 text-[10px] font-bold uppercase tracking-wider bg-muted/30">Active Plan</Badge>
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="text-3xl font-black tracking-tight">Free Tier</h3>
                    <p className="text-muted-foreground font-medium text-sm">Pelan asas untuk pengurusan kelab harian.</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {[
                      'Basic activity logging',
                      'Manual document generation',
                      'Static Takwim view',
                      'Standard club analytics'
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 p-1 rounded-full bg-emerald-500/10 text-emerald-600"><Check size={10} strokeWidth={3} /></div>
                        <span className="text-sm font-semibold text-muted-foreground/90">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/40">
                  <div className="flex items-end gap-1 mb-5">
                    <span className="text-3xl font-black tracking-tight">RM0</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest pb-1">/ Forever</span>
                  </div>
                  <Button disabled className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-widest bg-muted text-muted-foreground cursor-not-allowed">Pelan Semasa</Button>
                </div>
              </Card>

              {/* --- PRO TIER (NEXUS AI) --- */}
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-indigo-50 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700"><Sparkles size={200} className="text-indigo-400" /></div>
                
                <div className="space-y-8 relative z-10">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-indigo-500/30 text-indigo-200 border-none px-3 py-1 font-bold text-[10px] uppercase tracking-wider backdrop-blur-sm">Recommended</Badge>
                    <div className="p-2.5 bg-indigo-500/30 rounded-xl text-indigo-200 backdrop-blur-sm"><Sparkles size={18} /></div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="text-3xl font-black tracking-tight">Nexus AI Pro</h3>
                    <p className="text-indigo-200/80 font-medium text-sm">Tingkat produktiviti kelab dengan AI enjin.</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {[
                      'Smart AI Budgeting',
                      'Automated Task Delegation',
                      'AI-Powered Monthly Reports',
                      'Priority Support & Cloud Storage'
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 p-1 rounded-full bg-indigo-400/30 text-indigo-200"><Check size={10} strokeWidth={3} /></div>
                        <span className="text-sm font-semibold text-indigo-100/90">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-indigo-500/30">
                  <div className="flex items-end gap-1 mb-5">
                    <span className="text-3xl font-black tracking-tight">RM10</span>
                    <span className="text-xs font-bold text-indigo-300/70 uppercase tracking-widest pb-1">/ Month</span>
                  </div>
                  <Button 
                    onClick={() => navigate('/nexus?tab=langganan')}
                    className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-widest bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Upgrade ke PRO Tier
                  </Button>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* --- TAB BANTUAN & ISU --- */}
          <TabsContent value="help" className="space-y-8 focus-visible:ring-0 mt-0">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
              <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 border border-border/40">
                <div className="mb-8">
                  <h3 className="text-xl font-black tracking-tight">Bantuan & Isu Sistem</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Pusat sokongan rasmi Portal JPP.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 space-y-4 relative overflow-hidden group">
                    <div className="space-y-1.5 relative z-10">
                      <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-500">Sokongan WhatsApp Live</h4>
                      <p className="text-xs font-medium text-muted-foreground">Berhubung terus dengan agen bantuan JPP untuk hal teknikal terdesak.</p>
                    </div>
                    <Button onClick={() => window.open('https://wa.me/601139413699', '_blank')} className="h-10 px-6 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm w-full md:w-auto hover:scale-[1.02] active:scale-[0.98] transition-all">
                      Chat Sekarang
                    </Button>
                  </div>

                  <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 space-y-4 relative overflow-hidden group">
                    <div className="space-y-1.5 relative z-10">
                      <h4 className="text-base font-bold text-primary">Lapor Isu & Emel</h4>
                      <p className="text-xs font-medium text-muted-foreground">Sumbang idea penambahbaikan atau laporkan masalah sistem.</p>
                    </div>
                    <Button onClick={() => window.location.href = 'mailto:support.jpp@polisas.edu.my?subject=Maklum%20Balas%20Portal%20JPP'} variant="outline" className="h-10 px-6 rounded-xl font-bold text-xs text-primary border-primary/30 bg-primary/5 hover:bg-primary/20 w-full md:w-auto hover:scale-[1.02] active:scale-[0.98] transition-all">
                      Hantar Emel
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border/40">
                  <h3 className="text-sm font-bold ml-1">Dokumentasi Penting</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Garis Panduan', 'Tutorial Tambah Laporan', 'Soalan Lazim (FAQ)'].map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/50 hover:bg-muted/70 cursor-pointer transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-background text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm"><FileText size={16} /></div>
                          <span className="font-semibold text-sm">{doc}</span>
                        </div>
                        <ExternalLink size={14} className="text-muted-foreground/60 group-hover:text-primary transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

        </AnimatePresence>
      </Tabs>

      {/* --- MODAL PENGESAHAN OTP --- */}
      <AnimatePresence>
        {showOTPModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !loading && setShowOTPModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-card border border-border shadow-2xl rounded-[2rem] p-6 sm:p-8"
            >
              <div className="space-y-5 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-4 ring-primary/5">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight mb-1">Pengesahan OTP</h3>
                  <p className="text-muted-foreground font-medium text-xs">
                    Kod 6-digit dihantar ke <span className="font-bold text-foreground">{user?.email}</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-5 mt-4">
                  <Input 
                    type="text" 
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-14 text-center text-2xl font-mono tracking-[0.4em] bg-muted/40 border-border/50 focus-visible:border-primary/50 rounded-xl" 
                    placeholder="••••••" 
                    maxLength={6}
                    autoFocus
                  />

                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowOTPModal(false)} 
                      disabled={loading}
                      className="flex-1 h-11 rounded-xl font-bold uppercase text-[10px] tracking-wider"
                    >
                      Batal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={otpInput.length !== 6 || loading}
                      className="flex-1 h-11 rounded-xl font-bold uppercase text-[10px] tracking-wider bg-primary text-primary-foreground shadow-sm"
                    >
                      {loading ? 'Disahkan...' : 'Sahkan'}
                    </Button>
                  </div>
                </form>

                <p className="text-[10px] text-muted-foreground font-medium pt-3 mt-3 border-t border-border/40">
                  Tidak terima emel? <button type="button" onClick={handleInitiateOTP} className="text-primary hover:underline font-bold" disabled={loading}>Hantar Semula</button>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}