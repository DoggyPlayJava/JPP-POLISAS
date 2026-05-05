import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const navigate = useNavigate();
  const { categories, businesses, myMemberships, isLoading, createBusiness, joinBusiness, refresh } = useBusinessData();
  const [view, setView] = useState<'SELECT' | 'JOIN' | 'CREATE'>('SELECT');

  // Form State
  const [bName, setBName] = useState('');
  const [bDesc, setBDesc] = useState('');
  const [bCat, setBCat] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check state early: If user has an ACTIVE membership, push them to dashboard
  useEffect(() => {
    if (!isLoading) {
      const hasActive = myMemberships.some(m => m.status === 'ACTIVE');
      if (hasActive) {
        navigate('/keusahawanan/dashboard', { replace: true });
      }
    }
  }, [isLoading, myMemberships, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await createBusiness(bName, bDesc, bCat);
    setSubmitting(false);
    if (!res.error) {
      // --- Trigger Push Notification ---
      try {
        const { sendNotificationToKeusahawananExco } = await import('@/lib/notifications');
        await sendNotificationToKeusahawananExco({
          title: 'Permohonan Perniagaan Baru',
          message: `Satu permohonan perniagaan baru (${bName}) telah didaftarkan. Sila semak dan jadualkan temuduga.`,
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

  // If there are pending memberships, show them the status screen
  const pendingMemberships = myMemberships.filter(m => m.status === 'PENDING');
  const isWaiting = pendingMemberships.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Enhancements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen filter blur-[120px] opacity-20 bg-emerald-700 animate-slow-spin" />
        <div className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[100px] opacity-10 bg-teal-600" />
      </div>

      <div className="z-10 w-full max-w-4xl">
        <button
          onClick={() => navigate('/portal')}
          className="mb-8 flex items-center gap-2 group text-white/50 hover:text-white/90 transition-colors"
        >
          <div className="bg-white/10 p-2 rounded-full group-hover:-translate-x-1 transition-transform">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-black uppercase tracking-widest">Kembali ke Portal</span>
        </button>

        {isWaiting && view === 'SELECT' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center bg-white/5 border border-white/10 rounded-[2rem] p-12 backdrop-blur-3xl shadow-2xl">
            <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <Lightbulb className="w-10 h-10 animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              Permohonan Sedang Diproses
            </h1>
            <p className="text-white/60 mb-8 max-w-lg mx-auto">
              Anda mempunyai permohonan keusahawanan yang sedang didalam pertimbangan. 
              {pendingMemberships[0].role === 'OWNER' ? ' Pihak Unit Keusahawanan akan menetapkan tarikh temu duga bersama anda sebelum meluluskan penubuhan perniagaan ini.' : ' Presiden perniagaan sedang menyemak permohonan penyertaan anda.'}
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
                       <p className="text-[10px] text-white/50 uppercase tracking-widest">{pm.role === 'OWNER' ? 'Penubuhan Perniagaan' : 'Ahli Biasa'}</p>
                     </div>
                  </div>
                  {pm.role === 'OWNER' && pm.business?.interview_date && (
                     <div className="mt-2 text-xs text-amber-400 font-semibold bg-amber-400/10 px-3 py-1.5 rounded-lg text-center">
                       Temuduga: {format(new Date(pm.business.interview_date), 'dd MMM yyyy, hh:mm a', { locale: ms })}
                     </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={refresh} variant="ghost" className="mt-10 uppercase tracking-widest text-[10px] font-black opacity-50 hover:opacity-100">
              Semak Semula Status
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {view === 'SELECT' && (
              <motion.div key="SELECT" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="text-center mb-12">
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                    Sistem Keusahawanan
                  </h1>
                  <p className="text-white/50 text-lg">Platform rasmi pengurusan perniagaan pelajar Polisas.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl mx-auto">
                  {/* Join Existing */}
                  <div
                    onClick={() => setView('JOIN')}
                    className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-2xl p-8 hover:bg-white/10 transition-all duration-500"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-emerald-500/30">
                      <Users className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-emerald-400">Sertai Perniagaan</h2>
                    <p className="text-white/70 tracking-tight leading-relaxed">Mohon untuk menjadi ahli dalam perniagaan sedia ada yang telah didaftarkan dan aktif di kampus.</p>
                  </div>

                  {/* Create New */}
                  <div
                    onClick={() => setView('CREATE')}
                    className="group relative cursor-pointer overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-2xl p-8 hover:bg-white/10 transition-all duration-500"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-amber-500/30">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-amber-400">Cipta Perniagaan</h2>
                    <p className="text-white/70 tracking-tight leading-relaxed">Daftarkan profil perniagaan anda, jadual temu duga bersama Unit Keusahawanan, dan mulakan empayar.</p>
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
                      <h2 className="text-3xl font-black text-white">Senarai Perniagaan</h2>
                      <p className="text-white/50">Pilih perniagaan yang anda ingin sertai.</p>
                   </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {businesses.length === 0 && (
                    <div className="col-span-full p-12 text-center border border-white/10 rounded-3xl bg-white/5 backdrop-blur-lg">
                       <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
                       <p className="text-white/50">Tiada perniagaan aktif berdaftar buat masa ini.</p>
                    </div>
                  )}
                  {businesses.map(b => {
                    const membership = myMemberships.find(m => m.business_id === b.id);
                    const isPending = membership?.status === 'PENDING';
                    const isActive = membership?.status === 'ACTIVE';
                    const isRejected = membership?.status === 'REJECTED';
                    
                    let btnText = 'Mohon Sertai';
                    let btnDisabled = false;
                    
                    if (isPending) { btnText = 'Sedang Diproses'; btnDisabled = true; }
                    else if (isActive) { btnText = 'Telah Disertai'; btnDisabled = true; }
                    else if (isRejected) { btnText = 'Buat Rayuan (Appeal)'; btnDisabled = false; }
                    
                    return (
                    <div key={b.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between group hover:bg-white/10 transition-colors">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <Avatar className="h-12 w-12 border-2 border-slate-800 shadow-xl">
                             <AvatarImage src={b.logo_url || ''} className="object-cover" />
                             <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black">{b.name.slice(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md">
                            {b.category?.name || 'UMUM'}
                          </span>
                        </div>
                        <h3 className="font-black text-xl mb-1 text-white">{b.name}</h3>
                        <p className="text-white/50 text-sm line-clamp-2 mb-4 leading-relaxed">{b.description || 'Tiada deskripsi disediakan.'}</p>
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
                      <h2 className="text-3xl font-black text-white">Pendaftaran Profil Perniagaan</h2>
                      <p className="text-white/50">Lengkapkan maklumat, dan sediakan diri untuk sesi temuduga.</p>
                   </div>
                </div>

                <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-2xl p-6 md:p-10 shadow-2xl space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/60">Nama Perniagaan / Syarikat</label>
                    <Input required placeholder="Contoh: Koperasi Mahasiswa Polisas" 
                      value={bName} onChange={e => setBName(e.target.value)}
                      className="bg-white/5 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-white/20 h-12 rounded-xl" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/60">Kategori</label>
                    <Select required value={bCat} onValueChange={setBCat}>
                      <SelectTrigger className="bg-white/5 border-white/10 focus:ring-amber-500 text-white h-12 rounded-xl">
                        <SelectValue placeholder="Pilih Kategori..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/60">Penerangan Bisnes</label>
                    <Textarea required placeholder="Apakah produk/servis yang anda tawarkan? Apakah keunikan perniagaan ini?" 
                      value={bDesc} onChange={e => setBDesc(e.target.value)}
                      className="bg-white/5 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-white/20 rounded-xl min-h-[120px] resize-none" />
                  </div>

                  <div className="pt-4">
                    <Button type="submit" disabled={submitting} 
                      className="w-full h-14 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all">
                      {submitting ? 'Sedang Diproses...' : 'Hantar Permohonan & Jadual Temuduga'}
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
