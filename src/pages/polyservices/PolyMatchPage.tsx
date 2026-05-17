import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Heart, Send, AlertTriangle, Shield, Loader2, Search, User, Filter, MessageCircle, MoreVertical, Flame, ArrowRight, Zap, Target, Briefcase, Code, GraduationCap, Users, Home, Plus, X, Phone, ChevronLeft, Sparkles, Trash2 } from 'lucide-react';
import { cn, getMalaysianNickname } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { sendNotificationToKebajikanExco } from '@/lib/notifications';

type Category = 'PROJECT' | 'ROOMMATE';

export function PolyMatchPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | 'ALL'>('ALL');
  const [moduleEnabled, setModuleEnabled] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newListing, setNewListing] = useState({
    title: '',
    category: 'PROJECT' as Category,
    description: '',
    contact_info: '',
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkModuleStatus();
    fetchListings();
  }, []);

  const checkModuleStatus = async () => {
    const { data } = await supabase.from('portal_settings').select('is_enabled').eq('exco_module', 'polymatch').maybeSingle();
    if (data && data.is_enabled === false) {
      setModuleEnabled(false);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('polymatch_listings')
        .select(`
          *,
          profiles:author_id ( full_name )
        `)
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuatkan senarai carian.');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    if (!newListing.title.trim() || !newListing.description.trim() || !newListing.contact_info.trim()) {
      toast.error('Sila isi semua ruangan yang wajib.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = newListing.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .slice(0, 4); // Max 4 tags for bento

      const { error } = await supabase.from('polymatch_listings').insert({
        author_id: profile.id,
        category: newListing.category,
        title: newListing.title.trim(),
        description: newListing.description.trim(),
        contact_info: newListing.contact_info.trim(),
        tags: tagsArray
      });
      
      if (error) throw error;
      
      toast.success('Iklan carian berjaya diterbitkan!');
      setIsModalOpen(false);
      setNewListing({ title: '', category: 'PROJECT', description: '', contact_info: '', tags: '' });
      fetchListings();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menerbitkan iklan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Adakah anda pasti untuk memadam iklan ini?')) return;
    try {
      const { error } = await supabase
        .from('polymatch_listings')
        .delete()
        .eq('id', id)
        .eq('author_id', profile?.id);

      if (error) throw error;
      toast.success('Iklan dipadam');
      setListings(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memadam iklan.');
    }
  };

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const submitReport = async () => {
    if (!reportTargetId || !reportReason.trim()) return;
    setIsReporting(true);
    try {
      const { data, error } = await supabase.rpc('submit_polyservices_report', {
        p_target_id: reportTargetId,
        p_target_type: 'MATCH',
        p_reason: reportReason.trim()
      });
      
      if (error) throw error;
      
      toast.success('Laporan telah dihantar');
      if (data?.auto_hidden) {
        toast.success('Iklan ini telah disembunyikan untuk semakan.');
        setListings(prev => prev.filter(l => l.id !== reportTargetId));
      }
      setReportModalOpen(false);
      setReportReason('');
      setReportTargetId(null);

      // Trigger PWA Push Notification to Exco Kebajikan
      sendNotificationToKebajikanExco({
        title: '⚠️ Laporan PolyMatch Baru',
        message: 'Terdapat satu iklan PolyMatch yang dilaporkan dan memerlukan semakan moderasi.',
        type: 'WARNING',
        module: 'KEBAJIKAN',
        link: '/jpp/kebajikan'
      }).catch(console.error);

    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghantar laporan');
    } finally {
      setIsReporting(false);
    }
  };

  const filteredListings = activeCategory === 'ALL' 
    ? listings 
    : listings.filter(l => l.category === activeCategory);

  return (
    <div className="min-h-[100dvh] bg-[#020813] pb-24 relative overflow-hidden transition-colors font-sans selection:bg-teal-500/30">
      
      {/* ── PREMIUM BACKGROUND EFFECTS ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-teal-500/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen" />
        {/* Noise overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      </div>

      {/* ── TOP HEADER ── */}
      <div className="sticky top-0 z-40 bg-[#020813]/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <button 
            onClick={() => navigate('/portal')}
            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white border border-white/5"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Cipta Iklan
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 relative z-10">
        
        {/* ── PAGE HEADER ── */}
        <div className="mb-12">
          <h1 className="text-5xl sm:text-6xl font-black text-white flex items-center gap-4 tracking-tighter mb-4">
            Poly<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">Match</span>
          </h1>
          <p className="text-lg text-slate-400 font-medium max-w-xl leading-relaxed">
            Temui rakan sepasukan untuk projek FYP atau cari rakan sebilik yang serasi. Komuniti eksklusif pelajar POLISAS.
          </p>
        </div>

        {/* ── FILTER PILLS ── */}
        <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
          <FilterPill 
            active={activeCategory === 'ALL'} 
            onClick={() => setActiveCategory('ALL')}
            label="Eksplorasi"
          />
          <FilterPill 
            active={activeCategory === 'PROJECT'} 
            onClick={() => setActiveCategory('PROJECT')}
            icon={<Users className="w-4 h-4" />}
            label="Projek Akademik"
            colorClass="text-teal-400"
          />
          <FilterPill 
            active={activeCategory === 'ROOMMATE'} 
            onClick={() => setActiveCategory('ROOMMATE')}
            icon={<Home className="w-4 h-4" />}
            label="Bilik Sewa"
            colorClass="text-blue-400"
          />
        </div>

        {/* ── LISTINGS GRID (BENTO MASONRY) ── */}
        {!moduleEnabled ? (
          <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-16 text-center flex flex-col items-center mt-8 mb-16">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
              <Users className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Modul Ditutup Sementara</h3>
            <p className="text-slate-400 max-w-md">Modul PolyMatch sedang ditutup sementara oleh pihak Exco Kebajikan. Sila kembali semula nanti.</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-teal-500 mb-6" />
            <p className="text-sm font-bold tracking-widest uppercase">Menyusun Data...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-32 bg-white/[0.02] border border-white/5 rounded-[2.5rem] backdrop-blur-sm">
            <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Tiada Padanan Ditemui</h3>
            <p className="text-slate-400">Jadilah yang pertama untuk memulakan inisiatif ini.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            <AnimatePresence>
              {filteredListings.map((listing, index) => {
                const isMine = profile?.id === listing.author_id;
                const isProject = listing.category === 'PROJECT';

                return (
                  <motion.div
                    key={listing.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: (index % 6) * 0.05, duration: 0.4 }}
                    className="break-inside-avoid"
                  >
                    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-[2rem] p-6 sm:p-8 transition-all hover:bg-white/[0.05] group relative flex flex-col h-full shadow-2xl">
                      
                      {/* Top Header inside Card */}
                      <div className="flex items-start justify-between mb-6">
                        <div className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                          isProject ? "bg-teal-500/20 text-teal-300" : "bg-blue-500/20 text-blue-300"
                        )}>
                          {isProject ? <Users className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                          {isProject ? 'Projek' : 'Bilik Sewa'}
                        </div>

                        {isMine ? (
                          <button 
                            onClick={() => handleDelete(listing.id)}
                            title="Padam iklan saya"
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setReportTargetId(listing.id);
                              setReportModalOpen(true);
                            }}
                            title="Laporkan iklan ini"
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 flex items-center justify-center transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Main Content */}
                      <h3 className="text-2xl sm:text-3xl font-black text-white leading-[1.1] tracking-tight mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/60 transition-all">
                        {listing.title}
                      </h3>
                      
                      <p className="text-slate-400 leading-relaxed mb-8 flex-grow">
                        {listing.description}
                      </p>

                      {/* Tags (Bento Style) */}
                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                          {listing.tags.map((tag: string, i: number) => (
                            <span key={i} className="text-[11px] font-bold px-3 py-1.5 bg-white/5 text-slate-300 border border-white/5 rounded-xl">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bottom Footer (User & Actions) */}
                      <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-auto">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white mb-0.5">
                            {getMalaysianNickname(listing.profiles?.full_name)}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: ms })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a 
                            href={`https://wa.me/${listing.contact_info.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-10 h-10 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-900 flex items-center justify-center transition-transform hover:scale-110 shadow-lg shadow-teal-500/20"
                          >
                            <MessageCircle className="w-5 h-5 fill-current" />
                          </a>
                          <a 
                            href={`tel:${listing.contact_info.replace(/[^0-9]/g, '')}`} 
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform hover:scale-110 border border-white/5"
                          >
                            <Phone className="w-5 h-5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── CREATE LISTING MODAL (PREMIUM) ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020813]/80 backdrop-blur-xl"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/50 relative z-10 overflow-hidden flex flex-col max-h-[90dvh]"
            >
              <div className="p-8 pb-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Cipta Iklan Baru</h2>
                  <p className="text-sm text-slate-400 mt-1">Lengkapkan butiran untuk dipaparkan di papan PolyMatch.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-white/5 text-slate-400 rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <form id="listing-form" onSubmit={handlePost} className="space-y-6">
                  
                  {/* Category Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewListing(prev => ({ ...prev, category: 'PROJECT' }))}
                      className={cn(
                        "p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3",
                        newListing.category === 'PROJECT' 
                          ? "border-teal-500 bg-teal-500/10 text-teal-400" 
                          : "border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-slate-300"
                      )}
                    >
                      <Users className="w-8 h-8" />
                      <span className="text-xs font-black uppercase tracking-widest">Projek Akademik</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewListing(prev => ({ ...prev, category: 'ROOMMATE' }))}
                      className={cn(
                        "p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3",
                        newListing.category === 'ROOMMATE' 
                          ? "border-blue-500 bg-blue-500/10 text-blue-400" 
                          : "border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-slate-300"
                      )}
                    >
                      <Home className="w-8 h-8" />
                      <span className="text-xs font-black uppercase tracking-widest">Bilik Sewa</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tajuk Utama</label>
                    <input
                      type="text"
                      value={newListing.title}
                      onChange={(e) => setNewListing(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={newListing.category === 'PROJECT' ? "Cari Coder untuk Projek FYP" : "Mencari Housemate Lelaki di Semambu"}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:bg-white/[0.05] transition-all font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Penerangan Lanjut</label>
                    <textarea
                      value={newListing.description}
                      onChange={(e) => setNewListing(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Terangkan syarat atau kriteria yang anda cari..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:bg-white/[0.05] transition-all font-medium resize-none h-32"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">No Telefon (WhatsApp)</label>
                    <input
                      type="text"
                      value={newListing.contact_info}
                      onChange={(e) => setNewListing(prev => ({ ...prev, contact_info: e.target.value }))}
                      placeholder="0123456789"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:bg-white/[0.05] transition-all font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Label / Tags (Asingkan dengan koma)</label>
                    <input
                      type="text"
                      value={newListing.tags}
                      onChange={(e) => setNewListing(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Contoh: Lelaki, Non-Smoking, Semester 5"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 focus:bg-white/[0.05] transition-all font-medium"
                    />
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-white/5 bg-black/20 shrink-0">
                <button
                  type="submit"
                  form="listing-form"
                  disabled={isSubmitting}
                  className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-white/10 disabled:text-white/30 text-slate-950 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Terbitkan Iklan PolyMatch"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── REPORT LISTING MODAL ── */}
      <AnimatePresence>
        {reportModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportModalOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200]"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-[#020813] border border-white/10 rounded-[2rem] shadow-2xl p-6 pointer-events-auto"
              >
                <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2 tracking-tight">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Laporkan Iklan
                </h3>
                <p className="text-sm text-slate-400 mb-4 font-medium">
                  Nyatakan sebab laporan (contoh: Scam, Spam, Tidak Sesuai).
                </p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Sebab laporan..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.05] resize-none transition-all mb-4"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-all text-sm font-bold"
                  >
                    Batal
                  </button>
                  <button
                    disabled={!reportReason.trim() || isReporting}
                    onClick={submitReport}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-white/30 text-slate-950 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  >
                    {isReporting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Hantar Laporan
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function FilterPill({ active, onClick, icon, label, colorClass }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all whitespace-nowrap border border-white/10",
        active 
          ? "bg-white text-slate-900 border-transparent shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
          : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
      )}
    >
      {icon && <span className={cn(active ? "text-slate-900" : colorClass)}>{icon}</span>}
      {label}
    </button>
  );
}
