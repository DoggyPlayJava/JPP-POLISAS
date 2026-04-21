import re

with open('c:/Users/Cyborg 15/Desktop/JPP-POLISAS-main/src/pages/SettingsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Imports
content = content.replace(
    'import {\n  User, Bell, Shield, CreditCard, Mail, Lock, Camera, Check, Award, Globe, Loader2, FileText, Activity, HelpCircle, MessageSquare, Headphones, ExternalLink, Sparkles, Phone, ArrowLeft\n} from \'lucide-react\';',
    'import {\n  User, Bell, Shield, CreditCard, Mail, Lock, Camera, Check, Award, Globe, Loader2, FileText, Activity, HelpCircle, MessageSquare, Headphones, ExternalLink, Sparkles, Phone, ArrowLeft, Moon\n} from \'lucide-react\';'
)

# Start replacing the Tabs
old_tabs_start = """      {/* TABS PENGEMUDIAN */}
      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })} className="w-full">
        <TabsList className="bg-muted/30 h-auto p-1 rounded-2xl gap-1 border border-border/50 mb-8 flex-wrap">"""

# Find the end of the AnimatePresence block
# We can look for `</Tabs>\n\n      {/* --- MODAL PENGESAHAN OTP --- */}`
end_marker = "        </AnimatePresence>\n      </Tabs>"

parts = content.split(old_tabs_start)
if len(parts) == 2:
    start_content = parts[0]
    rest_content = parts[1]
    
    parts_sub = rest_content.split(end_marker)
    if len(parts_sub) == 2:
        end_content = parts_sub[1]
        
        # Now construct the new content
        new_tabs = """      {/* TABS PENGEMUDIAN DIUBAH KEPADA LAYOUT SIDEBAR VERTIKAL */}
      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })} orientation="vertical" className="w-full flex flex-col md:flex-row gap-8 lg:gap-12 mt-8">
        
        {/* KIRI: Sidebar (Trigger List) */}
        <div className="md:w-64 lg:w-72 shrink-0">
          <div className="sticky top-24">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 px-2">Menu Tetapan</h2>
            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1 space-y-1">
              {[
                { value: 'general', icon: User, label: 'Profil Awam', desc: 'Kemaskini maklumat asas' },
                { value: 'notifications', icon: Bell, label: 'Pemberitahuan', desc: 'Urus notifikasi pop-up' },
                { value: 'security', icon: Shield, label: 'Keselamatan', desc: 'Kata laluan & log masuk' },
                { value: 'billing', icon: CreditCard, label: 'Langganan', desc: 'Pelan & pembayaran (Nexus)' },
                { value: 'help', icon: HelpCircle, label: 'Bantuan & sokongan', desc: 'Sokongan dari pentadbir' },
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value} 
                  className="data-[state=active]:bg-card data-[state=active]:shadow-xl data-[state=active]:shadow-primary/5 data-[state=active]:border-border/60 data-[state=active]:text-primary border border-transparent w-full justify-start text-left px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-4 group"
                >
                  <div className="p-2.5 rounded-xl bg-muted/80 group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary shrink-0 transition-colors">
                    <tab.icon className="w-[18px] h-[18px]" /> 
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-foreground group-data-[state=active]:text-primary truncate">{tab.label}</span>
                    <span className="text-[10px] font-medium text-muted-foreground/60 group-data-[state=active]:text-primary/70 line-clamp-1">{tab.desc}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Vercel-Style Divider in Sidebar */}
            <Separator className="my-6 bg-border/40" />
            <div className="px-2">
              <div className="p-4 rounded-3xl bg-muted/30 border border-border/40 text-center space-y-2">
                <Shield className="w-6 h-6 mx-auto text-primary opacity-50" />
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Kawasan Selamat</p>
                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">Semua tetapan anda disimpan dengan penyulitan penuh End-to-End.</p>
              </div>
            </div>
          </div>
        </div>

        {/* KANAN: Tab Content (Vercel Style Forms) */}
        <div className="flex-1 min-w-0 pb-16">
          <AnimatePresence mode="wait">
            
            {/* --- TAB PROFIL (GENERAL) --- */}
            <TabsContent value="general" className="space-y-8 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                
                {/* Profile Banner */}
                <div className="relative rounded-[2.5rem] overflow-hidden border border-border/40 shadow-xl bg-card group">
                  <div className="h-32 md:h-40 bg-gradient-to-r from-primary/20 via-pink-500/10 to-blue-500/10 dark:from-primary/10 dark:to-blue-500/10 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                  </div>
                  <div className="px-6 sm:px-8 pb-8 flex flex-col sm:flex-row gap-6 sm:items-end relative -mt-12 sm:-mt-16">
                    {/* Avatar Upload */}
                    <div className="relative group/avatar shrink-0 self-start sm:self-auto ml-2 sm:ml-0 z-10">
                      <Avatar className="h-24 w-24 sm:h-32 sm:w-32 rounded-[2rem] border-4 border-card shadow-2xl ring-1 ring-border/20 transition-transform duration-300 group-hover/avatar:scale-105 bg-card">
                        <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=8B1A1A&textColor=FFF8F0`} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white font-black text-2xl">{initials}</AvatarFallback>
                      </Avatar>
                      <input type="file" accept="image/*" className="hidden" id="avatar-upload" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                      <label htmlFor="avatar-upload" className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl absolute -bottom-2 -right-2 flex items-center justify-center text-white shadow-lg border-4 border-card transition-all cursor-pointer ${uploadingAvatar ? 'bg-slate-400 pointer-events-none' : 'bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95'}`}>
                        {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                      </label>
                    </div>
                    <div className="space-y-2 mb-2 flex-1 relative z-10">
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">{fullName || 'Tetapan Profil'}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm font-medium text-muted-foreground">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] uppercase font-black tracking-widest w-fit">
                          {effectiveRole ? effectiveRole.replace('CLUB_', '').replace('_', ' ') : 'AHLI'}
                        </Badge>
                        <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></span>
                        <span className="text-xs">Gambar beresolusi 1:1, Max 2MB.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Borang Maklumat Asas (Line-Item Vercel Style) */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden border border-border/40">
                  <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-border/40 bg-muted/10">
                    <div>
                      <h3 className="text-xl font-black tracking-tight">Maklumat Asas</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Gunakan nama rasmi untuk komunikasi yang lancar.</p>
                    </div>
                    {/* Butang Simpan dialihkan ke penjuru atas untuk jimat ruang */}
                    <div className="hidden sm:flex items-center gap-3">
                      <Button variant="ghost" onClick={() => { setFullName(profile?.full_name || ''); setPhone(profile?.phone || ''); setEmail(user?.email || ''); }} className="h-9 px-4 rounded-xl font-bold text-xs hover:bg-muted">Batal</Button>
                      <Button onClick={handleUpdateProfile} disabled={loading || (fullName === profile?.full_name && phone === profile?.phone && email === user?.email)} className="h-9 px-6 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]">
                        {loading ? 'Menyimpan...' : 'Simpan'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col divide-y divide-border/40">
                    {/* Field: Role */}
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label className="text-sm font-bold text-foreground">Pangkat Sistem</Label>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">Peranan ini ditetapkan secara automatik oleh pangkalan data JPP mengikut jawatan terkini saudara/i.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full">
                        <Input value={effectiveRole ? effectiveRole.replace('CLUB_', '').replace('_', ' ') : 'AHLI'} readOnly className="h-11 rounded-xl bg-muted/40 font-semibold px-4 text-sm opacity-60 cursor-not-allowed focus-visible:ring-0 truncate" />
                      </div>
                    </div>

                    {/* Field: Nama Penuh */}
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label htmlFor="lastName" className="text-sm font-bold text-foreground">Nama Penuh</Label>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">Sila gunakan nama sebenar seperti dalam kad pengenalan untuk tujuan persijilan JPP.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full">
                        <Input id="lastName" value={fullName} onChange={(e) => setFullName(e.target.value.toUpperCase())} className="h-11 rounded-xl bg-background font-semibold px-4 text-sm uppercase shadow-sm focus-visible:ring-primary/50 transition-shadow" placeholder="CONTOH: MUHAMMAD ALI" />
                      </div>
                    </div>

                    {/* Field: No Telefon */}
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label htmlFor="phone" className="text-sm font-bold text-foreground">No. Telefon Bimbit</Label>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">Diperlukan untuk makluman kecemasan atau dihubungi pantas oleh ahli kelab.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 pl-10 pr-4 rounded-xl bg-background font-semibold text-sm shadow-sm focus-visible:ring-primary/50 transition-shadow" placeholder="CONTOH: 0123456789" type="tel" />
                      </div>
                    </div>

                    {/* Field: Emel */}
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label htmlFor="email" className="text-sm font-bold text-foreground">Alamat Emel</Label>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">Emel utama anda. Penukaran emel mungkin memerlukan log masuk semula atas arahan keselamatan.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-10 pr-4 rounded-xl bg-background font-semibold text-sm shadow-sm focus-visible:ring-primary/50 transition-shadow" placeholder="CONTOH: ali@gmail.com" type="email" />
                      </div>
                    </div>
                  </div>

                  {/* Butang simpan untuk Mobile view */}
                  <div className="p-6 bg-muted/10 border-t border-border/40 flex sm:hidden items-center justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setFullName(profile?.full_name || ''); setPhone(profile?.phone || ''); setEmail(user?.email || ''); }} className="h-11 px-4 rounded-xl font-bold text-xs hover:bg-muted w-full">Batal</Button>
                    <Button onClick={handleUpdateProfile} disabled={loading || (fullName === profile?.full_name && phone === profile?.phone && email === user?.email)} className="h-11 px-6 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] w-full">
                      {loading ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                </Card>

                {/* Display Settings Card */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden border border-border/40">
                  <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center hover:bg-muted/10 transition-colors">
                    <div className="space-y-1.5 md:w-2/3 shrink-0">
                      <h3 className="text-base font-bold flex items-center gap-2">Mod Gelap <Moon className="w-4 h-4 text-muted-foreground" /></h3>
                      <p className="text-[11px] leading-relaxed text-muted-foreground font-medium max-w-md">Aktifkan tema gelap untuk keselesaan mata terutamanya pada waktu malam atau untuk memanjangkan hayat bateri pada peranti anda.</p>
                    </div>
                    <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} className="data-[state=checked]:bg-primary shrink-0 xl:scale-125 mx-2 my-2 sm:my-0" />
                  </div>
                </Card>

              </motion.div>
            </TabsContent>

            {/* --- TAB PEMBERITAHUAN --- */}
            <TabsContent value="notifications" className="space-y-8 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden border border-border/40">
                  <div className="p-6 sm:p-8 border-b border-border/40 bg-muted/10">
                    <h3 className="text-xl font-black tracking-tight">Tetapan Pemberitahuan</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Urus penerimaan Pop-up makluman supaya anda tidak diganggu.</p>
                  </div>
                  <div className="flex flex-col divide-y divide-border/40">
                    {[
                      { title: 'Notifikasi Laporan', desc: 'Terima peringatan mendesak apabila status kertas kerja diluluskan atau ditolak oleh penasihat.', icon: FileText },
                      { title: 'Amnesti & Keselamatan', desc: 'Pemberitahuan amaran sekiranya laporan lewat atau pangkalan data disekat/dibuka.', icon: Lock },
                      { title: 'Makluman Aktiviti JPP', desc: 'Sertai siaran siar (broadcast) am dari pimpinan tertinggi tanpa tertinggal maklumat terkini.', icon: Activity }
                    ].map((item, i) => (
                      <div key={i} className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                        <div className="flex gap-4 sm:gap-6 items-start md:max-w-xl">
                          <div className="p-3 rounded-2xl bg-muted/50 text-muted-foreground shrink-0 border border-border/40 shadow-sm">
                            <item.icon size={20} />
                          </div>
                          <div className="space-y-1.5 mt-0.5">
                            <Label className="text-sm font-bold block">{item.title}</Label>
                            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-primary shrink-0 self-start md:self-auto mt-2 md:mt-0" />
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </TabsContent>

            {/* --- TAB KESELAMATAN (SECURITY) --- */}
            <TabsContent value="security" className="space-y-8 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden border border-border/40">
                  <div className="p-6 sm:p-8 border-b border-border/40 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black tracking-tight">Keselamatan Akaun</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Urus kata laluan anda dengan selamat di sini.</p>
                    </div>
                    <Button onClick={handleUpdatePassword} disabled={loading || !newPassword} className="hidden sm:flex h-9 px-6 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]">
                      {loading ? 'Mengemaskini...' : 'Simpan Laluan'}
                    </Button>
                  </div>
                  
                  <div className="flex flex-col divide-y divide-border/40">
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label className="text-sm font-bold text-foreground">Kata Laluan Baru</Label>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">Pilih kata laluan yang kuat. Elakkan kata laluan berulang dari institusi lain.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full">
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11 rounded-xl bg-background font-mono px-4 text-sm tracking-widest shadow-sm focus-visible:ring-primary/50 transition-shadow" placeholder="••••••••" />
                      </div>
                    </div>
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label className="text-sm font-bold text-foreground">Sahkan Kata Laluan</Label>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">Pengesahan dwi-sisi untuk mengelak ralat kesilapan menaip sebelum kunci disimpan.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full">
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 rounded-xl bg-background font-mono px-4 text-sm tracking-widest shadow-sm focus-visible:ring-primary/50 transition-shadow" placeholder="••••••••" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-muted/10 border-t border-border/40 flex sm:hidden">
                    <Button onClick={handleUpdatePassword} disabled={loading || !newPassword} className="w-full h-11 px-8 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-lg transition-all active:scale-[0.98]">
                      {loading ? 'Mengemaskini...' : 'Simpan Kata Laluan'}
                    </Button>
                  </div>
                </Card>
                
                <div className="p-6 sm:p-8 rounded-[2.5rem] bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all duration-300">
                  <div className="space-y-1.5 max-w-lg">
                    <p className="text-base font-black text-rose-600 dark:text-rose-500 tracking-tight">Zon Bahaya (Danger Zone)</p>
                    <p className="text-[11px] text-rose-600/70 dark:text-rose-400 font-medium leading-relaxed">Sekiranya akaun dideaktif, anda tidak boleh memulihkan log masuk, sejarah tugasan, dan rekod jualan. Sila lakukan ini di bawah nasihat Penasihat JPP sahaja kerana ia adalah muktamad.</p>
                  </div>
                  <Button variant="destructive" className="h-11 px-8 rounded-xl font-bold text-xs uppercase tracking-widest bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-500/20 transition-all shrink-0 w-full sm:w-auto">Deaktif Akaun</Button>
                </div>
              </motion.div>
            </TabsContent>

            {/* --- TAB LANGGANAN (BILLING) --- */}
            <TabsContent value="billing" className="space-y-8 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* --- FREE TIER --- */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 flex flex-col justify-between border border-border/40 relative overflow-hidden group">
                  <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="rounded-full px-3 py-1 border-border/50 text-[10px] font-bold uppercase tracking-wider bg-muted/30 text-muted-foreground">Pelan Asas</Badge>
                    </div>
                    
                    <div className="space-y-1.5">
                      <h3 className="text-4xl font-black tracking-tight">Free Tier</h3>
                      <p className="text-muted-foreground font-medium text-sm">Pelan default pengurusan kelab JPP-POLISAS.</p>
                    </div>

                    <div className="space-y-3.5 pt-4">
                      {[
                        'Log aktiviti tanpa had & Pemantauan',
                        'Jana dan mohon dokumentasi manual',
                        'Paparan Takwim Rasmi Kolej',
                        'Statistik data kelab bulanan'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="mt-0.5 p-1 rounded-full bg-emerald-500/10 text-emerald-600"><Check size={10} strokeWidth={3} /></div>
                          <span className="text-[13px] font-semibold text-muted-foreground leading-snug">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-border/40">
                    <div className="flex items-end gap-1 mb-5">
                      <span className="text-4xl font-black tracking-tight">RM0</span>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest pb-1.5">/ Selamanya</span>
                    </div>
                    <Button disabled className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest bg-muted/60 hover:bg-muted text-muted-foreground cursor-not-allowed">Pelan Aktif Semasa</Button>
                  </div>
                </Card>

                {/* --- PRO TIER (NEXUS AI) --- */}
                <Card className="border-none shadow-2xl shadow-indigo-500/10 rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-indigo-50 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 group-hover:opacity-[0.05] transition-all duration-700 pointer-events-none"><Sparkles size={250} /></div>
                  
                  <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-indigo-500/30 text-indigo-200 border-none px-3 py-1 font-bold text-[10px] uppercase tracking-wider backdrop-blur-sm">Disyorkan</Badge>
                      <div className="p-2.5 bg-indigo-500/30 rounded-2xl text-indigo-200 backdrop-blur-md shadow-inner border border-indigo-500/20"><Sparkles size={18} /></div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <h3 className="text-4xl font-black tracking-tight text-white drop-shadow-sm">Nexus AI Pro</h3>
                      <p className="text-indigo-200/90 font-medium text-sm">Revolusi produktiviti pentadbiran kelab dikuasakan AI.</p>
                    </div>

                    <div className="space-y-3.5 pt-4">
                      {[
                        'Bantuan Smart AI Budgeting & Kos',
                        'Delegasi Keseluruhan Tugas Pintar',
                        'Jana Laporan Bulanan & Carta Autonomi',
                        'Sokongan Penuh Teknikal Premium'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="mt-0.5 p-1 rounded-full bg-indigo-400/30 text-indigo-200/90"><Check size={10} strokeWidth={3} /></div>
                          <span className="text-[13px] font-semibold text-indigo-100 leading-snug">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-indigo-500/30 relative z-10">
                    <div className="flex items-end gap-1 mb-5">
                      <span className="text-4xl font-black tracking-tight text-white drop-shadow-sm">RM10</span>
                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest pb-1.5">/ Bulan</span>
                    </div>
                    <Button onClick={() => navigate('/nexus?tab=langganan')} className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] border border-indigo-400/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                      Naik Taraf Ke PRO Plus
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </TabsContent>

            {/* --- TAB BANTUAN & ISU --- */}
            <TabsContent value="help" className="space-y-8 focus-visible:ring-0 mt-0">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 border border-border/40 overflow-hidden">
                  <div className="mb-10">
                    <h3 className="text-2xl font-black tracking-tight">Sokongan Resolusi Teknikal</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-2 max-w-lg">Pusat bantuan langsung dari barisan admin JPP untuk melancarkan tugas harian dan menyelesaikan kerumitan pepijat.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/15 hover:to-emerald-500/10 border border-emerald-500/20 space-y-6 relative overflow-hidden group transition-all duration-500">
                      <div className="absolute top-0 right-0 p-6 opacity-20 text-emerald-500 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                        <MessageSquare size={100} strokeWidth={1} />
                      </div>
                      <div className="space-y-2 relative z-10">
                        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none font-black text-[10px] tracking-widest px-2.5 mb-2 hover:bg-emerald-500/30">RESPON PANTAS</Badge>
                        <h4 className="text-lg font-bold text-foreground">Aduan Talian Terus Whatsapp</h4>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">Berhubung terus dengan operator kami secara Live. Sesuai untuk gangguan server yang kritikal.</p>
                      </div>
                      <Button onClick={() => window.open('https://wa.me/601139413699', '_blank')} className="h-11 px-8 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 border border-emerald-400 w-full hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10">
                        <MessageSquare className="w-4 h-4 mr-2" /> Chat Operator
                      </Button>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border border-primary/20 space-y-6 relative overflow-hidden group transition-all duration-500">
                      <div className="absolute top-0 right-0 p-6 opacity-20 text-primary transform group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500">
                        <Mail size={100} strokeWidth={1} />
                      </div>
                      <div className="space-y-2 relative z-10">
                        <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] tracking-widest px-2.5 mb-2 hover:bg-primary/30">RASMI & SULIT</Badge>
                        <h4 className="text-lg font-bold text-foreground">Utusan Laporan Emel Rasmi</h4>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">Nyatakan cadangan struktur penambahbaikan sistem atau naik taraf yang anda mahukan.</p>
                      </div>
                      <Button onClick={() => window.location.href = 'mailto:support.jpp@polisas.edu.my?subject=Maklum%20Balas%20Portal%20JPP'} className="h-11 px-8 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 w-full hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10">
                        <Mail className="w-4 h-4 mr-2" /> Tulis Emel
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-8 border-t border-border/40">
                    <h3 className="text-sm font-bold ml-1 text-muted-foreground uppercase tracking-widest">Rujukan Dokumentasi</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {['Garis Panduan Sistem JPP', 'Tutorial Pengajuan Borang', 'SOP Dana & Tajaan Kewangan', 'Soalan Lazim Keselamatan (FAQ)'].map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/50 hover:bg-card hover:border-border hover:shadow-lg cursor-pointer transition-all duration-300 group">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-background text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm"><FileText size={16} /></div>
                            <span className="font-semibold text-[13px] line-clamp-1">{doc}</span>
                          </div>
                          <ExternalLink size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </div>
      </Tabs>"""

        with open('c:/Users/Cyborg 15/Desktop/JPP-POLISAS-main/src/pages/SettingsPage.tsx', 'w', encoding='utf-8') as f:
            f.write(start_content + new_tabs + end_content)
        print("Success!")
    else:
        print("Error: Could not find end_marker!")
else:
    print("Error: Could not find old_tabs_start!")
