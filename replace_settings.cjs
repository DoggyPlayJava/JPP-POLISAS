const fs = require('fs');

try {
  let content = fs.readFileSync('c:/Users/Cyborg 15/Desktop/JPP-POLISAS-main/src/pages/SettingsPage.tsx', 'utf-8');

  // Replace Imports
  content = content.replace(
      'import {\n  User, Bell, Shield, CreditCard, Mail, Lock, Camera, Check, Award, Globe, Loader2, FileText, Activity, HelpCircle, MessageSquare, Headphones, ExternalLink, Sparkles, Phone, ArrowLeft\n} from \'lucide-react\';',
      'import {\n  User, Bell, Shield, CreditCard, Mail, Lock, Camera, Check, Award, Globe, Loader2, FileText, Activity, HelpCircle, MessageSquare, Headphones, ExternalLink, Sparkles, Phone, ArrowLeft, Moon\n} from \'lucide-react\';'
  );

  const old_tabs_start = `      {/* TABS PENGEMUDIAN */}
      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })} className="w-full">
        <TabsList className="bg-muted/30 h-auto p-1 rounded-2xl gap-1 border border-border/50 mb-8 flex-wrap">`;

  const end_marker = `        </AnimatePresence>
      </Tabs>`;

  const parts = content.split(old_tabs_start);
  if (parts.length === 2) {
      const start_content = parts[0];
      const rest_content = parts[1];
      
      const parts_sub = rest_content.split(end_marker);
      if (parts_sub.length === 2) {
          const end_content = parts_sub[1];
          
          const new_tabs = `      {/* TABS PENGEMUDIAN DIUBAH KEPADA LAYOUT SIDEBAR VERTIKAL */}
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
            <TabsContent value="general" className="space-y-8 focus-visible:ring-0 mt-0 pt-1">
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
                        <AvatarImage src={profile?.avatar_url || \`https://api.dicebear.com/7.x/initials/svg?seed=\${initials}&backgroundColor=8B1A1A&textColor=FFF8F0\`} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white font-black text-2xl">{initials}</AvatarFallback>
                      </Avatar>
                      <input type="file" accept="image/*" className="hidden" id="avatar-upload" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                      <label htmlFor="avatar-upload" className={\`h-10 w-10 sm:h-12 sm:w-12 rounded-xl absolute -bottom-2 -right-2 flex items-center justify-center text-white shadow-lg border-4 border-card transition-all cursor-pointer \${uploadingAvatar ? 'bg-slate-400 pointer-events-none' : 'bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95'}\`}>
                        {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                      </label>
                    </div>
                    <div className="space-y-2 mb-2 flex-1 relative z-10 w-full sm:w-auto">
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-none truncate">{fullName || 'Tetapan Profil'}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm font-medium text-muted-foreground w-full">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] uppercase font-black tracking-widest w-fit">
                          {effectiveRole ? effectiveRole.replace('CLUB_', '').replace('_', ' ') : 'AHLI'}
                        </Badge>
                        <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0"></span>
                        <span className="text-xs truncate">Gambar beresolusi 1:1, Max 2MB.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Borang Maklumat Asas (Line-Item Vercel Style) */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden border border-border/40">
                  <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-border/40 bg-muted/10">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black tracking-tight">Maklumat Asas</h3>
                      <p className="text-xs text-muted-foreground font-medium">Gunakan nama rasmi untuk komunikasi yang lancar dlm dokumen.</p>
                    </div>
                    {/* Butang Simpan dialihkan ke penjuru atas untuk jimat ruang */}
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
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
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium pr-4">Peranan ini dikunci automatik oleh pangkalan data JPP mengikut jawatan terkini saudara/i.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full shrink-0">
                        <Input value={effectiveRole ? effectiveRole.replace('CLUB_', '').replace('_', ' ') : 'AHLI'} readOnly className="h-11 rounded-xl bg-muted/40 font-semibold px-4 text-sm opacity-60 cursor-not-allowed focus-visible:ring-0 truncate" />
                      </div>
                    </div>

                    {/* Field: Nama Penuh */}
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label htmlFor="lastName" className="text-sm font-bold text-foreground">Nama Penuh</Label>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium pr-4">Sila gunakan nama sebenar seperti dalam kad pengenalan untuk tujuan perakuan dokumen pdf.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full shrink-0">
                        <Input id="lastName" value={fullName} onChange={(e) => setFullName(e.target.value.toUpperCase())} className="h-11 rounded-xl bg-background font-semibold px-4 text-sm uppercase shadow-sm border border-border/50 focus-visible:ring-primary/50 transition-shadow" placeholder="NAMA PENUH" />
                      </div>
                    </div>

                    {/* Field: No Telefon */}
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label htmlFor="phone" className="text-sm font-bold text-foreground">No. Telefon Bimbit</Label>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium pr-4">Talian utama untuk notifikasi mendesak atau dihubungi segera oleh Ahli EXCO.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full relative group shrink-0">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 pl-10 pr-4 rounded-xl bg-background font-semibold border border-border/50 text-sm shadow-sm focus-visible:ring-primary/50 transition-shadow" placeholder="0123456789" type="tel" />
                      </div>
                    </div>

                    {/* Field: Emel */}
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label htmlFor="email" className="text-sm font-bold text-foreground">Alamat Emel</Label>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium pr-4">Emel ini digunakan untuk log masuk. Sebarang tindakan penukaran memerlukan OTP keselamatan.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full relative group shrink-0">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-10 pr-4 rounded-xl bg-background border border-border/50 font-semibold text-sm shadow-sm focus-visible:ring-primary/50 transition-shadow" placeholder="ali@gmail.com" type="email" />
                      </div>
                    </div>
                  </div>

                  {/* Butang simpan untuk Mobile view */}
                  <div className="p-6 bg-muted/10 border-t border-border/40 flex sm:hidden items-center justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setFullName(profile?.full_name || ''); setPhone(profile?.phone || ''); setEmail(user?.email || ''); }} className="h-11 px-4 rounded-xl font-bold text-xs hover:bg-muted w-full">Batal</Button>
                    <Button onClick={handleUpdateProfile} disabled={loading || (fullName === profile?.full_name && phone === profile?.phone && email === user?.email)} className="h-11 px-6 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] w-full">
                      {loading ? 'Simpan' : 'Simpan'}
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
            <TabsContent value="notifications" className="space-y-8 focus-visible:ring-0 mt-0 pt-1">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden border border-border/40">
                  <div className="p-6 sm:p-8 border-b border-border/40 bg-muted/10">
                    <h3 className="text-xl font-black tracking-tight">Tetapan Pemberitahuan</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Urus penerimaan Pop-up makluman supaya anda tidak diganggu.</p>
                  </div>
                  <div className="flex flex-col divide-y divide-border/40">
                    {[
                      { title: 'Notifikasi Kelulusan Laporan', desc: 'Terima isyarat amaran apabila status laporan / invois kewangan disemak atau ditolak oleh Pejabat JPP.', icon: FileText },
                      { title: 'Amnesti & Keselamatan Data', desc: 'Pemberitahuan mendesak sekiranya akses sistem dikunci akibat kelewatan dokumentasi.', icon: Lock },
                      { title: 'Makluman Semasa JPP-POLISAS', desc: 'Sertai siaran hebahan (Live Broadcast) awam dari Majlis Tertinggi untuk elak keciciran maklumat.', icon: Activity }
                    ].map((item, i) => (
                      <div key={i} className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                        <div className="flex gap-4 sm:gap-6 items-start md:max-w-xl">
                          <div className="p-3 rounded-2xl bg-muted/50 text-muted-foreground shrink-0 border border-border/40 shadow-sm mt-0.5">
                            <item.icon size={20} />
                          </div>
                          <div className="space-y-1.5">
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
            <TabsContent value="security" className="space-y-8 focus-visible:ring-0 mt-0 pt-1">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card overflow-hidden border border-border/40">
                  <div className="p-6 sm:p-8 border-b border-border/40 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black tracking-tight">Kunci Keselamatan</h3>
                      <p className="text-xs text-muted-foreground font-medium">Lindungi identiti anda daripada log masuk haram dan pencerobohan data sulit.</p>
                    </div>
                    <Button onClick={handleUpdatePassword} disabled={loading || !newPassword} className="hidden sm:flex h-9 px-6 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]">
                      {loading ? 'Proses...' : 'Tukar Akses'}
                    </Button>
                  </div>
                  
                  <div className="flex flex-col divide-y divide-border/40">
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label className="text-sm font-bold text-foreground">Cipta Kata Laluan Baru</Label>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed pr-4">Pastikan gandingan unik aksara dan nombor dengan jumlah 8 kod padanan minimum.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full shrink-0">
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11 rounded-xl bg-background font-mono border-border/50 px-4 text-sm tracking-widest shadow-sm focus-visible:ring-primary/50 transition-shadow" placeholder="••••••••" />
                      </div>
                    </div>
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-1.5 md:w-1/3 shrink-0">
                        <Label className="text-sm font-bold text-foreground">Sahkan Ciptaan Baru</Label>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed pr-4">Dwi-pengesahan untuk memastikan kod yang diolah sepadan tanpa tipografi ralat.</p>
                      </div>
                      <div className="md:w-2/3 max-w-md w-full shrink-0">
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 rounded-xl bg-background font-mono border-border/50 px-4 text-sm tracking-widest shadow-sm focus-visible:ring-primary/50 transition-shadow" placeholder="••••••••" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-muted/10 border-t border-border/40 flex sm:hidden">
                    <Button onClick={handleUpdatePassword} disabled={loading || !newPassword} className="w-full h-11 px-8 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-white shadow-lg transition-all active:scale-[0.98]">
                      {loading ? 'Proses...' : 'Tukar Akses'}
                    </Button>
                  </div>
                </Card>
                
                <div className="p-6 sm:p-8 rounded-[2.5rem] bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all duration-300 group">
                  <div className="space-y-2 max-w-2xl">
                    <p className="text-base font-black text-rose-600 dark:text-rose-500 tracking-tight">Kawasan Berisiko Tinggi (Danger Zone)</p>
                    <p className="text-[11px] text-rose-600/70 dark:text-rose-400 font-medium leading-relaxed text-justify">Fungsi Nyahaktif (Deactivate) akan membatalkan status perwakilan anda. Anda akan ditarik keluar daripada kelab disamping segala rekod jualan atau surat pelantikan sejarah lalu diranapkan sepenuhnya tanpa ciri pemulihan (*Recycle Bin*). Sila berurusan dengan YDP bertugas dahulu.</p>
                  </div>
                  <Button variant="destructive" className="h-11 px-8 rounded-xl font-bold text-xs uppercase tracking-widest bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-500/20 transition-transform shrink-0 w-full lg:w-auto hover:scale-105">Deaktif Akaun</Button>
                </div>
              </motion.div>
            </TabsContent>

            {/* --- TAB LANGGANAN (BILLING) --- */}
            <TabsContent value="billing" className="space-y-8 focus-visible:ring-0 mt-0 pt-1">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* --- FREE TIER --- */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 flex flex-col justify-between border border-border/40 relative overflow-hidden group">
                  <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="rounded-full px-3 py-1 border-border/50 text-[10px] font-bold uppercase tracking-wider bg-muted/30 text-muted-foreground shadow-sm">Pelan Asas</Badge>
                    </div>
                    
                    <div className="space-y-1.5">
                      <h3 className="text-4xl font-black tracking-tight drop-shadow-sm">Free Tier</h3>
                      <p className="text-muted-foreground font-medium text-sm">Pelan fungsian *default* pengurusan kelab JPP.</p>
                    </div>

                    <div className="space-y-3.5 pt-4">
                      {[
                        'Log aktiviti tanpa had & Pemantauan Data',
                        'Jana format dokumen PDF Standard Manual',
                        'Akses Sepenuhnya Takwim Tahunan Kolej',
                        'Analitik Carta Bulanan Asas'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="mt-0.5 p-1 rounded-full bg-emerald-500/10 text-emerald-600 shadow-sm"><Check size={10} strokeWidth={3} /></div>
                          <span className="text-[13px] font-semibold text-muted-foreground leading-snug">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-border/40">
                    <div className="flex items-end gap-1 mb-5">
                      <span className="text-4xl font-black tracking-tight text-foreground/90">Percuma</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pb-1.5 ml-1">/ Selamanya</span>
                    </div>
                    <Button disabled className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest bg-muted/60 hover:bg-muted text-muted-foreground cursor-not-allowed border border-border/50">Digunakan Sekarang</Button>
                  </div>
                </Card>

                {/* --- PRO TIER (NEXUS AI) --- */}
                <Card className="border-none shadow-2xl shadow-indigo-500/15 rounded-[2.5rem] bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a] text-indigo-50 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none blur-xl"></div>
                  <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 group-hover:opacity-[0.05] transition-all duration-700 pointer-events-none"><Sparkles size={250} /></div>
                  
                  <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 px-3 py-1 font-bold text-[10px] shadow-sm uppercase tracking-wider backdrop-blur-md">Pilihan Premium</Badge>
                      <div className="p-2.5 bg-indigo-500/30 rounded-2xl text-indigo-100 backdrop-blur-md shadow-inner border border-indigo-400/20"><Sparkles size={18} /></div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <h3 className="text-4xl font-black tracking-tight text-white drop-shadow-md">Nexus AI Pro</h3>
                      <p className="text-indigo-200/90 font-medium text-sm leading-relaxed">Letusan ekosistem pentadbiran Automatik 2.0.</p>
                    </div>

                    <div className="space-y-3.5 pt-4">
                      {[
                        'Cakna Belanjawan Pintar (*Smart Budget*)',
                        'Delegasi Agihan Spesifikasi Secara Dinamik',
                        'Analisis Pelaporan & Data (*Forecast*) Automatik',
                        'Sokongan VIP & Sandaran Awan Tertinggi'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="mt-0.5 p-1 rounded-full bg-indigo-500/40 text-white shadow-inner"><Check size={10} strokeWidth={4} /></div>
                          <span className="text-[13px] font-semibold text-indigo-50/90 leading-snug">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-indigo-500/30 relative z-10">
                    <div className="flex items-end gap-1 mb-5">
                      <span className="text-4xl font-black tracking-tight text-white drop-shadow-md">RM10</span>
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest pb-1.5 ml-1">/ Per Bulan</span>
                    </div>
                    <Button onClick={() => navigate('/nexus?tab=langganan')} className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] border border-indigo-400/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                      Aktifkan Nexus Pro Plus
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </TabsContent>

            {/* --- TAB BANTUAN & ISU --- */}
            <TabsContent value="help" className="space-y-8 focus-visible:ring-0 mt-0 pt-1">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 sm:p-8 xl:p-10 border border-border/40 overflow-hidden">
                  <div className="mb-10 text-center sm:text-left">
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Pusat Bantuan Teknikal Sistem</h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-xl mx-auto sm:mx-0">Kami menyediakan saluran rasmi berpusat untuk pimpinan JPP dan kelab bagi memohon bantuan isu pelayan web, pelaporan ralat log, atau pindaan fungsi berpasukan.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                    <div className="p-8 xl:p-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/10 to-transparent hover:from-emerald-500/20 border border-emerald-500/20 space-y-8 relative overflow-hidden group transition-all duration-500 flex flex-col justify-between">
                      <div className="absolute top-0 right-0 p-8 opacity-10 text-emerald-500 transform group-hover:scale-150 group-hover:rotate-12 transition-all duration-700 pointer-events-none">
                        <MessageSquare size={130} strokeWidth={1} />
                      </div>
                      <div className="space-y-3 relative z-10">
                        <Badge className="bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400 border-none font-black text-[10px] tracking-widest px-3 py-1 shadow-sm mb-2 rounded-lg">RESPONDER LIVE</Badge>
                        <h4 className="text-xl font-bold text-foreground tracking-tight">Talian Aduan Segera Server</h4>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">Berhubung secepat kilat dengan pengaturcara sistem JPP di ruang sembang Whatsapp. Kes diklasifikasikan sebagai *Darurat Teknikal* seperti ranap sistem (*crash*).</p>
                      </div>
                      <Button onClick={() => window.open('https://wa.me/601139413699', '_blank')} className="h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 border border-emerald-400 w-full hover:scale-[1.02] active:scale-[0.98] transition-transform relative z-10 mt-auto">
                        <MessageSquare className="w-4 h-4 mr-2" /> Mulakan Whatsapp
                      </Button>
                    </div>

                    <div className="p-8 xl:p-10 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-transparent hover:from-primary/20 border border-primary/20 space-y-8 relative overflow-hidden group transition-all duration-500 flex flex-col justify-between">
                      <div className="absolute top-0 right-0 p-8 opacity-10 text-primary transform group-hover:scale-150 group-hover:-rotate-12 transition-all duration-700 pointer-events-none">
                        <Mail size={130} strokeWidth={1} />
                      </div>
                      <div className="space-y-3 relative z-10">
                        <Badge className="bg-primary text-primary-foreground dark:bg-primary/20 dark:text-primary border-none font-black text-[10px] tracking-widest px-3 py-1 shadow-sm mb-2 rounded-lg">USUL & MAKLUMBALAS</Badge>
                        <h4 className="text-xl font-bold text-foreground tracking-tight">Ruang Maju Idea Organisasi</h4>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">Sekiranya anda mengesan cacat cela pada struktur sistem pelaporan atau mempunyai ilham bagi fasiliti baharu, utuskan draf cadangan menerusi lampiran emel.</p>
                      </div>
                      <Button onClick={() => window.location.href = 'mailto:support.jpp@polisas.edu.my?subject=Maklum%20Balas%20Portal%20JPP'} variant="outline" className="h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-wider text-primary border-primary/30 bg-primary/5 hover:bg-primary hover:text-white hover:border-primary shadow-lg shadow-primary/5 w-full hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10 mt-auto">
                        <Mail className="w-4 h-4 mr-2" /> Lampirkan Emel Rasmi
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-border/40">
                    <h3 className="text-xs font-black ml-1 text-muted-foreground uppercase tracking-widest">Katalog Bahan Rujukan Operasi</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { title: 'Garis Panduan Sistem Utama JPP', icon: FileText },
                        { title: 'SOP Kelulusan Aktiviti Takwim', icon: Check },
                        { title: 'Cara Menyusun Kertas Kerja', icon: Award },
                        { title: 'Arkib Soalan Lazim Berulang (FAQ)', icon: HelpCircle }
                      ].map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-card hover:border-border hover:shadow-xl hover:-translate-y-0.5 cursor-pointer transition-all duration-300 group">
                          <div className="flex items-center gap-3.5">
                            <div className="p-2.5 rounded-xl bg-background text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm ring-1 ring-border/50 group-hover:ring-primary/50"><doc.icon size={16} /></div>
                            <span className="font-bold text-[13px] leading-tight line-clamp-2">{doc.title}</span>
                          </div>
                          <ExternalLink size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0 ml-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </div>
      </Tabs>`;

          content = start_content + new_tabs + end_content;
          fs.writeFileSync('c:/Users/Cyborg 15/Desktop/JPP-POLISAS-main/src/pages/SettingsPage.tsx', content, 'utf-8');
          console.log("Success!");
      } else {
          console.error("Error: Could not find end_marker!");
      }
  } else {
      console.error("Error: Could not find old_tabs_start!");
  }
} catch (e) {
  console.error("Script execution failed:", e);
}
