import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Store, Lightbulb, Users, Plus, Building2, CheckCircle2, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useBusinessData } from '@/hooks/useBusinessData';
import { getContrastText, hexToRgba } from '@/lib/utils';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

const color = '#1B5E20'; // Base Keusahawanan theme

export function KeusahawananOnboarding() {
  const { t } = useTranslation(['keusahawanan', 'common']);
  const navigate = useNavigate();
  const { categories, businesses, myMemberships, isLoading, createBusiness, joinBusiness, refresh } = useBusinessData();
  const [view, setView] = useState<'SELECT' | 'JOIN' | 'CREATE'>('SELECT');

  // Form State
  const [bName, setBName] = useState('');
  const [bDesc, setBDesc] = useState('');
  const [bCat, setBCat] = useState('');
  const [bSsm, setBSsm] = useState('');
  const [bMentors, setBMentors] = useState<{name: string, department: string}[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Check state early: If user has reached the 2 active business limit, push them to dashboard
  useEffect(() => {
    if (!isLoading) {
      const activeOrPending = myMemberships.filter(m => m.status === 'ACTIVE' || m.status === 'PENDING').length;
      if (activeOrPending >= 2) {
        navigate('/keusahawanan/dashboard', { replace: true });
      }
    }
  }, [isLoading, myMemberships, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await createBusiness(bName, bDesc, bCat, bSsm, bMentors.filter(m => m.name.trim() !== ''));
    setSubmitting(false);
    if (!res.error) {
      // --- Trigger Push Notification ---
      try {
        const { sendNotificationToKeusahawananExco } = await import('@/lib/notifications');
        await sendNotificationToKeusahawananExco({
          title: t('keusahawanan:onboarding_notif_title', 'Permohonan Perniagaan Baru'),
          message: t('keusahawanan:onboarding_notif_msg', 'Satu permohonan perniagaan baru ({{name}}) telah didaftarkan. Sila semak dan jadualkan temuduga.', { name: bName }),
          type: 'INFO',
          module: 'KEUSAHAWANAN',
          link: '/keusahawanan/dashboard'
        });
      } catch (e) {
        console.error("Gagal menghantar notifikasi push", e);
      }
      setView('SELECT');
    }
  };

  const handleJoin = async (id: string) => {
    await joinBusiness(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const pendingMemberships = myMemberships.filter(m => m.status === 'PENDING');
  const isWaiting = pendingMemberships.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden pb-28 md:pb-8">
      {/* Background Enhancements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      </div>

      <div className="z-10 w-full max-w-4xl">
        <button
          onClick={() => navigate('/portal')}
          className="mb-8 flex items-center gap-2 group text-white/50 hover:text-white/90 transition-colors"
        >
          <div className="bg-white/10 p-2 rounded-full group-hover:-translate-x-1 transition-transform">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-black uppercase tracking-widest">{t('common:back_to_portal', 'Kembali ke Portal')}</span>
        </button>

        {isWaiting && view === 'SELECT' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center bg-white/5 border border-white/10 rounded-[2rem] p-12  shadow-2xl">
            <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <Lightbulb className="w-10 h-10 animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              {t('keusahawanan:onboarding_processing_title', 'Permohonan Sedang Diproses')}
            </h1>
            <p className="text-white/60 mb-8 max-w-lg mx-auto">
              {t('keusahawanan:onboarding_processing_desc', 'Anda mempunyai permohonan keusahawanan yang sedang didalam pertimbangan.')}
              {' '}
              {pendingMemberships[0].role === 'OWNER'
                ? t('keusahawanan:onboarding_owner_notice', 'Pihak Unit Keusahawanan akan menetapkan tarikh temu duga bersama anda sebelum meluluskan penubuhan perniagaan ini.')
                : t('keusahawanan:onboarding_member_notice', 'Presiden perniagaan sedang menyemak permohonan penyertaan anda.')}
            </p>

            <div className="space-y-4 max-w-sm mx-auto text-left">
              {pendingMemberships.map(pm => (
                <div key={pm.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                     <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarImage src={pm.business?.logo_url || ''} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-xs font-black">{pm.business?.name.slice(0,2).toUpperCase()}</AvatarFallback>
                     </Avatar>
                     <div>
                       <p className="font-bold text-sm">{pm.business?.name}</p>
                       <p className="text-[10px] text-white/50 uppercase tracking-widest">
                         {pm.role === 'OWNER'
                           ? t('keusahawanan:onboarding_role_owner', 'Penubuhan Perniagaan')
                           : t('keusahawanan:onboarding_role_member', 'Ahli Biasa')}
                       </p>
                     </div>
                  </div>
                  {pm.role === 'OWNER' && pm.business?.interview_date && (
                     <div className="mt-2 text-xs text-amber-400 font-semibold bg-amber-400/10 px-3 py-1.5 rounded-lg text-center">
                       {t('keusahawanan:onboarding_interview_label', 'Temuduga: {{date}}', {
                         date: format(new Date(pm.business.interview_date), 'dd MMM yyyy, hh:mm a', { locale: ms })
                       })}
                     </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 mt-10">
              {myMemberships.filter(m => m.status === 'ACTIVE' || m.status === 'PENDING').length < 2 && (
                <Button onClick={() => setView('SELECT')} className="uppercase tracking-widest text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-12 w-full max-w-sm mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all">
                  {t('keusahawanan:onboarding_slot2_btn', 'Daftar/Sertai Perniagaan Lain (Slot ke-2)')}
                </Button>
              )}
              <Button onClick={refresh} variant="ghost" className="uppercase tracking-widest text-[10px] font-black opacity-50 hover:opacity-100 max-w-sm mx-auto w-full">
                {t('keusahawanan:onboarding_recheck_status', 'Semak Semula Status')}
              </Button>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {view === 'SELECT' && (
              <motion.div key="SELECT" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="text-center mb-12">
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                    {t('keusahawanan:onboarding_system_title', 'Sistem Keusahawanan')}
                  </h1>
                  <p className="text-white/50 text-lg">
                    {t('keusahawanan:onboarding_system_tagline', 'Platform rasmi pengurusan perniagaan pelajar Polisas.')}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl mx-auto">
                  {/* Join Existing */}
                  <div
                    onClick={() => setView('JOIN')}
                    className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-white/5 border border-white/10  p-8 hover:bg-white/10 transition-all duration-500"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-emerald-500/30">
                      <Users className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-emerald-400">
                      {t('keusahawanan:onboarding_join_title', 'Sertai Perniagaan')}
                    </h2>
                    <p className="text-white/70 tracking-tight leading-relaxed">
                      {t('keusahawanan:onboarding_join_desc', 'Mohon untuk menjadi ahli dalam perniagaan sedia ada yang telah didaftarkan dan aktif di kampus.')}
                    </p>
                  </div>

                  {/* Create New */}
                  <div
                    onClick={() => setView('CREATE')}
                    className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-white/5 border border-white/10  p-8 hover:bg-white/10 transition-all duration-500"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-amber-500/30">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-amber-400">
                      {t('keusahawanan:onboarding_create_title', 'Cipta Perniagaan')}
                    </h2>
                    <p className="text-white/70 tracking-tight leading-relaxed">
                      {t('keusahawanan:onboarding_create_desc', 'Daftarkan profil perniagaan anda, jadual temu duga bersama Unit Keusahawanan, dan mulakan empayar.')}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'JOIN' && (
              <motion.div key="JOIN" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-4 mb-8">
                   <button onClick={() => setView('SELECT')} className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white">
                      <ChevronLeft className="w-5 h-5" />
                   </button>
                   <div>
                      <h2 className="text-3xl font-black text-white">
                        {t('keusahawanan:onboarding_list_title', 'Senarai Perniagaan')}
                      </h2>
                      <p className="text-white/50">
                        {t('keusahawanan:onboarding_list_desc', 'Pilih perniagaan yang anda ingin sertai.')}
                      </p>
                   </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {businesses.length === 0 && (
                    <div className="col-span-full p-12 text-center border border-white/10 rounded-3xl bg-white/5 ">
                       <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
                       <p className="text-white/50">
                         {t('keusahawanan:onboarding_empty_businesses', 'Tiada perniagaan aktif berdaftar buat masa ini.')}
                       </p>
                    </div>
                  )}
                  {businesses.map(b => {
                    const membership = myMemberships.find(m => m.business_id === b.id);
                    const isPending = membership?.status === 'PENDING';
                    const isActive = membership?.status === 'ACTIVE';
                    const isRejected = membership?.status === 'REJECTED';
                    
                    let btnText = t('keusahawanan:onboarding_apply_join', 'Mohon Sertai');
                    let btnDisabled = false;
                    
                    if (isPending) { btnText = t('keusahawanan:onboarding_btn_pending', 'Sedang Diproses'); btnDisabled = true; }
                    else if (isActive) { btnText = t('keusahawanan:onboarding_btn_joined', 'Telah Disertai'); btnDisabled = true; }
                    else if (isRejected) { btnText = t('keusahawanan:onboarding_btn_appeal', 'Buat Rayuan (Appeal)'); btnDisabled = false; }
                    
                    return (
                    <div key={b.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between group hover:bg-white/10 transition-colors">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <Avatar className="h-12 w-12 border-2 border-slate-800 shadow-xl">
                             <AvatarImage src={b.logo_url || ''} className="object-cover" />
                             <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black">{b.name.slice(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md">
                            {b.category?.name || t('keusahawanan:onboarding_cat_general', 'UMUM')}
                          </span>
                        </div>
                        <h3 className="font-black text-xl mb-1 text-white">{b.name}</h3>
                        <p className="text-white/50 text-sm line-clamp-2 mb-4 leading-relaxed">
                          {b.description || t('keusahawanan:onboarding_no_desc', 'Tiada deskripsi disediakan.')}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                         <div className="flex items-center gap-2 text-xs text-white/40">
                            <Avatar className="h-5 w-5">
                               <AvatarImage src={b.owner?.avatar_url || ''} />
                               <AvatarFallback className="text-[8px] bg-slate-700">{b.owner?.full_name?.slice(0,2)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{b.owner?.full_name}</span>
                         </div>
                         <Button 
                            onClick={() => handleJoin(b.id)} 
                            disabled={btnDisabled}
                            className={`w-full font-black uppercase tracking-widest text-xs h-10 ${
                               btnDisabled 
                                 ? 'bg-white/10 text-white/40' 
                                 : (isRejected 
                                     ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)]'
                                     : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]')
                            } rounded-xl transition-all`}>
                           {btnText}
                         </Button>
                      </div>
                    </div>
                  )})}
                </div>
              </motion.div>
            )}

            {view === 'CREATE' && (
              <motion.div key="CREATE" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-4 mb-8">
                   <button onClick={() => setView('SELECT')} className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white">
                      <ChevronLeft className="w-5 h-5" />
                   </button>
                   <div>
                      <h2 className="text-3xl font-black text-white">
                        {t('keusahawanan:onboarding_reg_title', 'Pendaftaran Profil Perniagaan')}
                      </h2>
                      <p className="text-white/50">
                        {t('keusahawanan:onboarding_reg_desc', 'Lengkapkan maklumat, dan sediakan diri untuk sesi temuduga.')}
                      </p>
                   </div>
                </div>

                <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-3xl  p-6 md:p-10 shadow-2xl space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/60">
                      {t('keusahawanan:onboarding_biz_name_label', 'Nama Perniagaan / Syarikat')}
                    </label>
                    <Input required placeholder={t('keusahawanan:onboarding_biz_name_placeholder', 'Contoh: Koperasi Mahasiswa Polisas')} 
                      value={bName} onChange={e => setBName(e.target.value)}
                      className="bg-white/5 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-white/20 h-12 rounded-xl" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/60">
                      {t('keusahawanan:onboarding_cat_label', 'Kategori')}
                    </label>
                    <Select required value={bCat} onValueChange={setBCat}>
                      <SelectTrigger className="bg-white/5 border-white/10 focus:ring-amber-500 text-white h-12 rounded-xl">
                        <SelectValue placeholder={t('keusahawanan:onboarding_select_cat', 'Pilih Kategori...')} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/60">
                      {t('keusahawanan:onboarding_desc_label', 'Penerangan Bisnes')}
                    </label>
                    <Textarea required placeholder={t('keusahawanan:onboarding_desc_placeholder', 'Apakah produk/servis yang anda tawarkan? Apakah keunikan perniagaan ini?')} 
                      value={bDesc} onChange={e => setBDesc(e.target.value)}
                      className="bg-white/5 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-white/20 rounded-xl min-h-[120px] resize-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/60">
                      {t('keusahawanan:onboarding_ssm_label', 'No. Pendaftaran SSM (Optional)')}
                    </label>
                    <Input placeholder={t('keusahawanan:onboarding_ssm_placeholder', "Contoh: 202101000001 / '-' jika tiada")} 
                      value={bSsm} onChange={e => setBSsm(e.target.value)}
                      className="bg-white/5 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-white/20 h-12 rounded-xl" />
                    <p className="text-[10px] text-white/40">
                      {t('keusahawanan:onboarding_ssm_hint', 'Biarkan kosong untuk daftar di bawah PUSKEP-POLISAS.')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-widest text-white/60">
                        {t('keusahawanan:onboarding_mentors_label', 'Mentor Penasihat (Maks 5)')}
                      </label>
                      {bMentors.length < 5 && (
                        <button type="button" onClick={() => setBMentors([...bMentors, { name: '', department: '' }])}
                          className="text-xs text-amber-400 font-bold hover:text-amber-300 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> {t('keusahawanan:onboarding_add_mentor', 'Tambah Mentor')}
                        </button>
                      )}
                    </div>
                    {bMentors.map((m, i) => (
                      <div key={i} className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl relative group">
                        <button type="button" onClick={() => setBMentors(bMentors.filter((_, idx) => idx !== i))}
                          className="absolute top-2 right-2 text-white/30 hover:text-rose-400">
                          {t('keusahawanan:onboarding_close', 'Tutup')}
                        </button>
                        <Input placeholder={t('keusahawanan:onboarding_mentor_name_ph', 'Contoh: Dr. Ahmad Ali')} 
                          value={m.name} onChange={e => {
                            const newMentors = [...bMentors];
                            newMentors[i].name = e.target.value;
                            setBMentors(newMentors);
                          }}
                          className="bg-white/5 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-white/20 h-11 rounded-xl" />
                        <Input placeholder={t('keusahawanan:onboarding_mentor_dept_ph', 'Contoh: Jabatan Teknologi Maklumat')} 
                          value={m.department} onChange={e => {
                            const newMentors = [...bMentors];
                            newMentors[i].department = e.target.value;
                            setBMentors(newMentors);
                          }}
                          className="bg-white/5 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-white/20 h-11 rounded-xl" />
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <Button type="submit" disabled={submitting} 
                      className="w-full h-auto py-4 px-4 whitespace-normal leading-relaxed text-center bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs sm:text-sm uppercase tracking-wider sm:tracking-widest rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all">
                      {submitting
                        ? t('keusahawanan:onboarding_submitting', 'Sedang Diproses...')
                        : t('keusahawanan:onboarding_submit_btn', 'Hantar Permohonan & Jadual Temuduga')}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export { KeusahawananOnboardingPage } from './KeusahawananOnboardingPage';
