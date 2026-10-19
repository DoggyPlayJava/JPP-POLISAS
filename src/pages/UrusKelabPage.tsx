import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera, Palette, Users, Save, RefreshCcw, RotateCcw,
  ShieldCheck, UserCog, Trophy, TrendingUp, AlertTriangle, ArrowRight, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { cn, getContrastColor } from '@/lib/utils';
import { supabase, createLog } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

const PRESET_COLORS = [
  { name: 'Navy Polisas', value: '#0f172a' },
  { name: 'Emerald Gemilang', value: '#065f46' },
  { name: 'Maroon Korporat', value: '#831843' },
  { name: 'Amber Emas', value: '#b45309' },
  { name: 'Royal Indigo', value: '#3730a3' },
  { name: 'Slate Karbon', value: '#334155' },
];

export function UrusKelabPage() {
  const { t } = useTranslation(['kpp', 'common']);
  const navigate = useNavigate();
  const { profile, refreshClubs, isPresident, selectedClubId, isKppExco, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clubData, setClubData] = useState<any>(null);
  const [committee, setCommittee] = useState<any[]>([]);
  const [unifiedCommittee, setUnifiedCommittee] = useState<any[]>([]);

  // Dialog Reset Merit
  const [meritResetModal, setMeritResetModal] = useState<string | null>(null);
  const [resettingMerit, setResettingMerit] = useState(false);

  // Dialog Reset Kohort (Multi-step verification)
  const [showKohortModal, setShowKohortModal] = useState(false);
  const [kohortConfirmationInput, setKohortConfirmationInput] = useState('');
  const [resettingKohort, setResettingKohort] = useState(false);

  useEffect(() => {
    if (selectedClubId) fetchData();
  }, [selectedClubId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: club } = await supabase.from('clubs').select('*').eq('id', selectedClubId).single();
      setClubData(club);

      const { data: commRecords } = await supabase.from('club_committee')
        .select('*')
        .eq('club_id', selectedClubId);
      setCommittee(commRecords || []);

      const { data: coreMembers } = await supabase.from('student_club_memberships')
        .select('user_id, role, profiles!inner(full_name)')
        .eq('club_id', selectedClubId)
        .eq('account_status', 'APPROVED')
        .in('role', ['CLUB_PRESIDENT', 'CLUB_MT']);

      if (coreMembers) {
        const unified = coreMembers.map(m => {
          const profileInfo = m.profiles as any;
          const fullName = profileInfo.full_name;
          const override = (commRecords || []).find(c => c.full_name === fullName);

          return {
            user_id: m.user_id,
            full_name: fullName,
            role: m.role,
            category: override?.category || (m.role === 'CLUB_PRESIDENT' ? 'MT' : 'EXCO'),
            position_title: override?.position_title || (m.role === 'CLUB_PRESIDENT' ? 'Presiden Kelab' : 'Ahli Jawatankuasa')
          };
        });

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
      toast.error("Gagal menarik data kelab: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitteeChange = (fullName: string, field: 'position_title' | 'category', value: string) => {
    setUnifiedCommittee(prev =>
      prev.map(item => item.full_name === fullName ? { ...item, [field]: value } : item)
    );
  };

  // ── RESET MERIT KELAB (MODAL CONFIRMATION) ──
  const confirmResetMerit = async () => {
    if (!meritResetModal || !selectedClubId) return;
    setResettingMerit(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ merit: 0 })
        .eq('club_id', selectedClubId);

      if (error) throw error;
      toast.success(t('kpp:toast_merit_reset_success', 'Merit kelab kitaran berjaya diselaraskan.'));
      await createLog(
        selectedClubId, profile?.id, profile?.full_name,
        'RESET_MERIT',
        `Presiden meriset merit ahli bagi ${clubData?.name || 'kelab'} untuk kitaran ${meritResetModal}.`
      );
      setMeritResetModal(null);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal meriset merit: " + err.message);
    } finally {
      setResettingMerit(false);
    }
  };

  // ── RESET KOHORT KEPIMPINAN (KPP Exco / SuperAdmin) ──
  const confirmResetKohort = async () => {
    if (kohortConfirmationInput !== 'RESET') {
      toast.error('Sila taip "RESET" untuk mengesahkan tindakan ini.');
      return;
    }
    const clubName = clubData?.name || 'kelab ini';
    setResettingKohort(true);
    try {
      const { error: roleErr } = await supabase
        .from('student_club_memberships')
        .update({ role: 'CLUB_MEMBER' })
        .eq('club_id', selectedClubId)
        .eq('account_status', 'APPROVED')
        .in('role', ['CLUB_PRESIDENT', 'CLUB_MT']);
      if (roleErr) throw roleErr;

      const { error: clubErr } = await supabase
        .from('clubs')
        .update({ president_id: null })
        .eq('id', selectedClubId);
      if (clubErr) throw clubErr;

      const { error: commErr } = await supabase
        .from('club_committee')
        .delete()
        .eq('club_id', selectedClubId);
      if (commErr) throw commErr;

      toast.success(t('kpp:toast_cohort_reset_success', 'Kohort berjaya direset. Semua MT dan Presiden kini kembali kepada Ahli Biasa.'));
      await createLog(
        selectedClubId, profile?.id, profile?.full_name,
        'RESET_KOHORT',
        `Exco KPP mereset barisan kepimpinan (MT/Presiden ke Ahli Biasa) bagi ${clubName}.`
      );
      setShowKohortModal(false);
      setKohortConfirmationInput('');
      fetchData();
    } catch (err: any) {
      toast.error('Gagal mereset kohort: ' + err.message);
    } finally {
      setResettingKohort(false);
    }
  };

  // ── SIMPAN IDENTITI & JAWATANKUASA ──
  const handleSaveAll = async () => {
    if (!clubData?.id) return;
    setSaving(true);
    try {
      const { error: clubErr } = await supabase
        .from('clubs')
        .update({
          theme_color: clubData.theme_color,
          description: clubData.description
        })
        .eq('id', clubData.id);
      if (clubErr) throw clubErr;

      const { error: delErr } = await supabase.from('club_committee').delete().eq('club_id', clubData.id);
      if (delErr) throw delErr;

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
      toast.success(t('kpp:toast_save_success', 'Maklumat identiti & susunan kepimpinan berjaya disimpan.'));
      await createLog(
        selectedClubId, profile?.id, profile?.full_name,
        'UPDATE_CLUB',
        `Presiden mengemaskini maklumat dan jawatankuasa bagi ${clubData?.name || 'kelab'}.`
      );
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── UPLOAD LOGO ──
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
      toast.success(t('kpp:toast_upload_logo_success', 'Logo kelab berjaya dikemaskini.'));
      await createLog(
        selectedClubId, profile?.id, profile?.full_name,
        'UPDATE_CLUB',
        `Presiden memuat naik logo baharu untuk ${clubData?.name || 'kelab'}.`
      );
    } catch (err) {
      toast.error("Ralat ketika memuat naik logo.");
    } finally {
      setUploading(false);
    }
  };

  if (loading && !clubData) {
    return <UrusKelabSkeleton />;
  }

  const mtMembers = unifiedCommittee.filter(m => m.category === 'MT');
  const excoMembers = unifiedCommittee.filter(m => m.category === 'EXCO');
  const previewTextColor = getContrastColor(clubData?.theme_color || '#0f172a');

  return (
    <div className="page-container space-y-8 pb-32 pt-4">

      {/* ── HEADER ── */}
      <header className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          {t('kpp:manage_club_profile', 'Urus Profil Kelab')}
        </h1>
        <p className="text-muted-foreground font-medium text-xs sm:text-sm max-w-xl leading-relaxed">
          {t('kpp:manage_club_subtitle', 'Kemaskini identiti visual, warna rasmi, dan namakan jawatan Majlis Tertinggi bagi persatuan anda.')}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── LAJUR KIRI: IDENTITI VISUAL (4/12) ── */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 p-5">
              <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Palette className="w-4 h-4 text-primary" /> {t('kpp:club_identity_brand', 'Identiti & Jenama Kelab')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">

              {/* REAL LIVE CARD PREVIEW */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">{t('kpp:card_preview', 'Pratonton Kad Direktori')}</Label>
                <div
                  className="rounded-2xl p-5 shadow-sm border border-border/60 transition-all flex flex-col gap-3 relative overflow-hidden"
                  style={{ backgroundColor: clubData?.theme_color || '#0f172a' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow">
                      {clubData?.logo_url ? (
                        <img src={clubData.logo_url} className="w-full h-full object-cover" alt="Logo" />
                      ) : (
                        <span className="text-white font-black text-sm">{clubData?.short_name?.slice(0, 2) || 'K'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold opacity-75" style={{ color: previewTextColor }}>
                        {clubData?.category || 'Kelab'}
                      </span>
                      <h4 className="text-sm font-bold truncate leading-tight" style={{ color: previewTextColor }}>
                        {clubData?.name || 'Nama Kelab'}
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-80 line-clamp-2 leading-relaxed" style={{ color: previewTextColor }}>
                    {clubData?.description || 'Penerangan ringkas persatuan akan muncul di sini...'}
                  </p>
                </div>
              </div>

              {/* TUKAR LOGO */}
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="relative group">
                  <div
                    className="w-24 h-24 rounded-2xl bg-muted/40 flex items-center justify-center overflow-hidden border-2 shadow-sm transition-all group-hover:scale-105"
                    style={{ borderColor: clubData?.theme_color || 'hsl(var(--border))' }}
                  >
                    {clubData?.logo_url ? (
                      <img src={clubData.logo_url} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer">
                    <Camera className="text-white w-5 h-5" />
                    <input type="file" className="hidden" accept="image/*" onChange={uploadLogo} disabled={uploading} />
                  </label>
                </div>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {uploading ? t('common:uploading', 'Memuat naik...') : t('kpp:change_logo', 'Klik untuk tukar logo')}
                </p>
              </div>

              {/* WARNA TEMA & PRESETS */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-foreground">{t('kpp:official_color', 'Warna Rasmi Persatuan')}</Label>
                <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 border border-border/60">
                  <input
                    type="color"
                    value={clubData?.theme_color || '#0f172a'}
                    onChange={(e) => setClubData({ ...clubData, theme_color: e.target.value })}
                    className="w-9 h-9 rounded-lg border-none cursor-pointer bg-transparent shrink-0 shadow-inner"
                  />
                  <Input
                    value={clubData?.theme_color || '#0F172A'}
                    onChange={(e) => setClubData({ ...clubData, theme_color: e.target.value })}
                    className="h-9 font-mono text-xs uppercase bg-card border-border/60"
                  />
                </div>

                {/* Preset Swatches */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setClubData({ ...clubData, theme_color: c.value })}
                      className="w-6 h-6 rounded-md border border-white/20 shadow-sm flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {clubData?.theme_color?.toLowerCase() === c.value.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* PENERANGAN / SLOGAN */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">{t('kpp:club_description_mission', 'Penerangan / Misi Kelab')}</Label>
                <Textarea
                  value={clubData?.description || ''}
                  onChange={(e) => setClubData({ ...clubData, description: e.target.value })}
                  placeholder="Ceritakan misi dan objektif aktiviti kelab anda..."
                  className="rounded-xl bg-card border-border/80 resize-none h-24 text-xs font-normal focus-visible:ring-primary/20 leading-relaxed"
                />
              </div>

            </CardContent>
          </Card>

          {/* PENGURUSAN MERIT */}
          {isPresident && (
            <Card className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-rose-500/5 p-4">
                <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  <RefreshCcw className="w-3.5 h-3.5" /> {t('kpp:merit_cycle_alignment', 'Penyelarasan Kitaran Merit')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Mulakan kitaran baharu penilaian merit ahli mengikut sesi semester atau tahun pengajian.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMeritResetModal('Bulanan')}
                    className="h-9 rounded-xl text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Kitaran Bulanan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMeritResetModal('Tahunan')}
                    className="h-9 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30"
                  >
                    Kitaran Tahunan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RESET KOHORT KEPIMPINAN (KPP Exco / SuperAdmin) */}
          {(isKppExco || isSuperAdmin) && (
            <Card className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-amber-500/5 p-4">
                <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <RotateCcw className="w-3.5 h-3.5" /> {t('kpp:leadership_cohort_transition', 'Peralihan Kohort Kepimpinan')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2.5 p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                    Tindakan ini menukar semua MT & Presiden kelab kepada Ahli Biasa bagi peralihan sesi kepimpinan baharu.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKohortModal(true)}
                  className="w-full h-9 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                >
                  {t('kpp:open_cohort_reset', 'Buka Pengesahan Reset Kohort')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── LAJUR KANAN: KEPIMPINAN (8/12) ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* PANDUAN SISTEM (SENTENCE CASE) */}
          <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              Senarai jawatankuasa di bawah disusun secara automatik berdasarkan peranan yang dilantik melalui modul{' '}
              <button
                type="button"
                onClick={() => navigate('/ahli')}
                className="font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                Pengurusan Ahli <ArrowRight className="w-3 h-3 inline" />
              </button>
              . Anda boleh melaraskan kategori dan menamakan jawatan khusus bagi sesi semasa.
            </div>
          </div>

          {/* Majlis Tertinggi (MT) */}
          <Card className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <CardHeader className="bg-amber-500/5 p-5 border-b border-amber-500/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-700 dark:text-amber-300">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">{t('kpp:high_council_title', 'Majlis Tertinggi (MT)')}</CardTitle>
                  <p className="text-[11px] text-muted-foreground">{t('kpp:high_council_desc', 'Jawatan utama persatuan (Presiden, Naib, Setiausaha, Bendahari)')}</p>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{mtMembers.length} Jawatan</span>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {mtMembers.length > 0 ? (
                mtMembers.map(m => (
                  <div key={m.full_name} className="flex flex-col md:flex-row gap-3 p-3.5 bg-muted/20 border border-border/60 rounded-2xl items-center">
                    <div className="flex-1 w-full space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{t('kpp:office_holder_name', 'Nama Pemegang Jawatan')}</Label>
                      <div className="h-9 rounded-xl bg-card border border-border/60 font-bold text-xs flex items-center px-3 text-foreground truncate">
                        {m.full_name}
                      </div>
                    </div>

                    <div className="w-full md:w-1/3 shrink-0 space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{t('kpp:committee_category', 'Kategori')}</Label>
                      <Select
                        value={m.category}
                        onValueChange={(val) => handleCommitteeChange(m.full_name, 'category', val)}
                      >
                        <SelectTrigger className="h-9 bg-card rounded-xl font-medium border-border/60 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="MT" className="font-semibold text-xs">Majlis Tertinggi (MT)</SelectItem>
                          <SelectItem value="EXCO" className="font-semibold text-xs">Exco / AJK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-2/5 shrink-0 space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{t('kpp:position_title', 'Gelaran Jawatan')}</Label>
                      <Input
                        value={m.position_title}
                        onChange={(e) => handleCommitteeChange(m.full_name, 'position_title', e.target.value)}
                        className="h-9 font-medium border-border/60 rounded-xl text-xs"
                        placeholder="Contoh: Bendahari Kehormat"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center rounded-2xl bg-muted/20 border border-dashed border-border/80">
                  <Users className="w-7 h-7 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-xs font-semibold text-muted-foreground">Tiada Rekod Majlis Tertinggi Dikesan</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    Lantik peranan kepimpinan melalui modul Pengurusan Ahli terlebih dahulu.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Barisan Exco & AJK */}
          <Card className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <CardHeader className="bg-emerald-500/5 p-5 border-b border-emerald-500/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-300">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">{t('kpp:exco_committee_title', 'Barisan Exco & AJK')}</CardTitle>
                  <p className="text-[11px] text-muted-foreground">{t('kpp:exco_committee_desc', 'Ketua biro, publisiti, teknikal, dan penyelaras program')}</p>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{excoMembers.length} Orang</span>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {excoMembers.length > 0 ? (
                excoMembers.map(m => (
                  <div key={m.full_name} className="flex flex-col md:flex-row gap-3 p-3.5 bg-muted/20 border border-border/60 rounded-2xl items-center">
                    <div className="flex-1 w-full space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{t('kpp:office_holder_name', 'Nama Pemegang Jawatan')}</Label>
                      <div className="h-9 rounded-xl bg-card border border-border/60 font-bold text-xs flex items-center px-3 text-foreground truncate">
                        {m.full_name}
                      </div>
                    </div>

                    <div className="w-full md:w-1/3 shrink-0 space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{t('kpp:committee_category', 'Kategori')}</Label>
                      <Select
                        value={m.category}
                        onValueChange={(val) => handleCommitteeChange(m.full_name, 'category', val)}
                      >
                        <SelectTrigger className="h-9 bg-card rounded-xl font-medium border-border/60 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="MT" className="font-semibold text-xs">Majlis Tertinggi (MT)</SelectItem>
                          <SelectItem value="EXCO" className="font-semibold text-xs">Exco / AJK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-2/5 shrink-0 space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{t('kpp:position_title', 'Gelaran Jawatan')}</Label>
                      <Input
                        value={m.position_title}
                        onChange={(e) => handleCommitteeChange(m.full_name, 'position_title', e.target.value)}
                        className="h-9 font-medium border-border/60 rounded-xl text-xs"
                        placeholder="Contoh: Ketua Biro Multimedia"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center rounded-2xl bg-muted/20 border border-dashed border-border/80">
                  <Users className="w-7 h-7 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-xs font-semibold text-muted-foreground">Tiada Ahli Jawatankuasa / Exco Dikesan</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    Ahli yang dilantik sebagai Exco akan dipaparkan di bahagian ini secara automatik.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

      {/* ── STICKY ACTION BAR BERKADAR MODEN ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 pointer-events-none">
        <div className="bg-card/90 backdrop-blur-md rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-xl border border-border/80 pointer-events-auto">
          <div className="flex items-center gap-2.5 pl-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Save size={16} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tetapan Profil</p>
              <p className="text-xs font-bold text-foreground">{t('kpp:ready_to_save', 'Sedia untuk disimpan?')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="rounded-xl h-9 px-3.5 text-xs font-semibold border-border hover:bg-muted"
            >
              {t('kpp:reset', 'Reset')}
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              size="sm"
              className="rounded-xl h-9 px-5 text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {saving ? t('kpp:saving', 'Menyimpan...') : t('kpp:save_all', 'Simpan Semua')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── DIALOG PENGESAHAN RESET MERIT ── */}
      <Dialog open={!!meritResetModal} onOpenChange={(open) => { if (!open) setMeritResetModal(null); }}>
        <DialogContent className="rounded-3xl max-w-md border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-xl tracking-tight text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              Sahkan Penyelarasan Kitaran Merit
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Adakah anda pasti ingin memulakan kitaran merit <strong>{meritResetModal}</strong> bagi kelab "{clubData?.name}"? Markah merit keahlian bagi kelab ini akan disetkan semula kepada 0 untuk kitaran baharu.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setMeritResetModal(null)} className="rounded-xl text-xs font-semibold">
              Batal
            </Button>
            <Button onClick={confirmResetMerit} disabled={resettingMerit} className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white">
              {resettingMerit ? 'Memproses...' : 'Sahkan Kitaran Baharu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG PENGESAHAN RESET KOHORT KEPIMPINAN ── */}
      <Dialog open={showKohortModal} onOpenChange={setShowKohortModal}>
        <DialogContent className="rounded-3xl max-w-md border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-xl tracking-tight text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Peralihan Sesi Kohort Kepimpinan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Tindakan ini akan menurunkan semua peranan <strong>Majlis Tertinggi & Presiden</strong> bagi "{clubData?.name}" kembali kepada <strong>Ahli Biasa</strong>. Rekod keahlian asal tetap kekal terpelihara.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-foreground">
              Taip <span className="font-mono font-bold text-rose-600">RESET</span> untuk mengesahkan:
            </Label>
            <Input
              value={kohortConfirmationInput}
              onChange={(e) => setKohortConfirmationInput(e.target.value.trim().toUpperCase())}
              placeholder="RESET"
              className="h-10 font-mono tracking-widest text-center font-bold uppercase rounded-xl border-border/80"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => { setShowKohortModal(false); setKohortConfirmationInput(''); }}
              className="rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              onClick={confirmResetKohort}
              disabled={resettingKohort || kohortConfirmationInput !== 'RESET'}
              className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {resettingKohort ? 'Sedang Mereset...' : 'Sahkan Reset Kohort'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function UrusKelabSkeleton() {
  return (
    <div className="page-container space-y-8 pb-32 pt-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded-xl" />
        <div className="h-4 w-96 bg-muted/60 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 h-96 bg-muted/60 rounded-3xl" />
        <div className="lg:col-span-8 space-y-6">
          <div className="h-20 bg-muted/50 rounded-2xl" />
          <div className="h-64 bg-muted/60 rounded-3xl" />
          <div className="h-64 bg-muted/60 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}