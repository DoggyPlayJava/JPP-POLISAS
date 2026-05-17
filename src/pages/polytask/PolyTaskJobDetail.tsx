import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft, MapPin, Clock, DollarSign, User, CheckCircle, ShieldAlert, Check, Star, AlertTriangle, MessageCircle, Share2, Upload, FileImage, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { formatMaskedName } from '@/lib/utils';
import { sendNotificationToUser } from '@/lib/notifications';
import { PolyTaskReviewModal } from './PolyTaskReviewModal';
import { PolyTaskDisputeModal } from './PolyTaskDisputeModal';
import { PolyTaskChatModal } from './PolyTaskChatModal';
import { PolyTaskJobDetailSkeleton } from './PolyTaskSkeleton';
import { TaskerProfileModal } from './TaskerProfileModal';

export function PolyTaskJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Feature states
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  // Tasker Profile state
  const [selectedTaskerId, setSelectedTaskerId] = useState<string | null>(null);
  const [isTaskerProfileOpen, setIsTaskerProfileOpen] = useState(false);
  
  // Bid form state
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  
  // Proof of work state
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    if (id && profile) {
      fetchJobDetails();
    }
  }, [id, profile]);

  const fetchJobDetails = async () => {
    setLoading(true);
    
    // §15.2: Parallel fetch with Promise.all (bukan sequential waterfall)
    const [jobRes, bidsRes] = await Promise.all([
      supabase
        .from('polytask_jobs')
        .select('*, requester:profiles!requester_id(id, full_name, avatar_url, phone)')
        .eq('id', id)
        .single(),
      supabase
        .from('polytask_bids')
        .select('*, tasker:profiles!tasker_id(id, full_name, avatar_url, phone)')
        .eq('job_id', id!)
        .order('created_at', { ascending: false }),
    ]);

    if (jobRes.error || !jobRes.data) {
      toast.error('Gagal memuatkan maklumat tugasan');
      navigate('/polytask');
      return;
    }

    const jobData = jobRes.data;
    setJob(jobData);
    if (bidsRes.data) setBids(bidsRes.data);

    // Check review status (only if needed — conditional fetch)
    if (jobData.status === 'COMPLETED' && profile?.id === jobData.requester_id) {
      const { data: reviewData } = await supabase
        .from('polytask_reviews')
        .select('id')
        .eq('job_id', id!)
        .eq('reviewer_id', profile.id)
        .maybeSingle();
      
      if (reviewData) setHasReviewed(true);
    }
    
    setLoading(false);
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !job) return;

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Sila masukkan nilai bidaan yang sah');
      return;
    }

    setSubmittingBid(true);
    const { error } = await supabase.from('polytask_bids').insert({
      job_id: job.id,
      tasker_id: profile.id,
      bid_amount: amount,
      proposal_note: bidMessage,
      status: 'PENDING'
    });
    setSubmittingBid(false);

    if (error) {
      toast.error('Gagal menghantar bidaan. Sila cuba lagi.');
      console.error(error);
    } else {
      toast.success('Bidaan anda berjaya dihantar!');
      setBidAmount('');
      setBidMessage('');
      
      if (job.requester_id) {
        sendNotificationToUser(job.requester_id, {
          title: 'Bidaan Baharu Diterima!',
          message: `${profile.full_name} telah membida RM ${amount.toFixed(2)} untuk tugasan "${job.title}".`,
          type: 'INFO',
          module: 'POLYTASK',
          link: `/polytask/job/${job.id}`,
        });
      }
      fetchJobDetails();
    }
  };

  const handleAcceptBid = async (bidId: string, taskerId: string) => {
    if (!confirm('Adakah anda pasti mahu menerima Tasker ini? Bidaan lain akan ditolak secara automatik.')) return;
    
    const toastId = toast.loading('Sedang mengesahkan...');
    const { error } = await supabase
      .from('polytask_bids')
      .update({ status: 'ACCEPTED' })
      .eq('id', bidId);

    if (error) {
      toast.error('Gagal menerima bidaan', { id: toastId });
    } else {
      toast.success('Tasker berjaya dilantik!', { id: toastId });
      
      sendNotificationToUser(taskerId, {
        title: 'Bidaan Anda Diterima!',
        message: `Tahniah! Bidaan anda untuk tugasan "${job.title}" telah diterima oleh peminta. Sila semak butiran lanjut.`,
        type: 'SUCCESS',
        module: 'POLYTASK',
        link: `/polytask/job/${job.id}`,
      });

      fetchJobDetails(); 
    }
  };

  const handleMarkCompleted = async () => {
    if (!confirm('Adakah tugasan ini sudah selesai sepenuhnya?')) return;

    const toastId = toast.loading('Mengemas kini status...');
    const { error } = await supabase
      .from('polytask_jobs')
      .update({ status: 'COMPLETED' })
      .eq('id', job.id);

    if (error) {
      toast.error('Gagal mengemas kini', { id: toastId });
    } else {
      toast.success('Tugasan ditandakan sebagai Selesai!', { id: toastId });
      fetchJobDetails();
      // Prompt user to review immediately after completion
      setIsReviewModalOpen(true);
    }
  };

  const handleCancelJobTasker = async () => {
    if (!myBid) return;
    if (!confirm('AMARAN: Membatalkan tugasan yang telah diterima akan menaikkan Cancellation Rate anda. Teruskan?')) return;

    const toastId = toast.loading('Sedang membatalkan...');

    // 1. Update Bid to WITHDRAWN
    const { error: bidError } = await supabase
      .from('polytask_bids')
      .update({ status: 'WITHDRAWN' })
      .eq('id', myBid.id);

    if (bidError) {
      toast.error('Gagal membatalkan bidaan', { id: toastId });
      return;
    }

    // 2. Update Job to OPEN and assigned_tasker_id to null
    const { error: jobError } = await supabase
      .from('polytask_jobs')
      .update({ status: 'OPEN', assigned_tasker_id: null })
      .eq('id', job.id);

    if (jobError) {
      toast.error('Ralat mengemas kini tugasan', { id: toastId });
    } else {
      toast.success('Tugasan dibatalkan. Rekod pembatalan anda telah dikemas kini.', { id: toastId });
      
      if (job.requester_id) {
        sendNotificationToUser(job.requester_id, {
          title: 'Tasker Menarik Diri!',
          message: `${profile?.full_name} telah membatalkan tugasan "${job.title}". Tugasan kini berstatus DIBUKA semula.`,
          type: 'WARNING',
          module: 'POLYTASK',
          link: `/polytask/job/${job.id}`,
        });
      }
      fetchJobDetails();
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const originalFile = e.target.files[0];
    
    setUploadingProof(true);
    const toastId = toast.loading('Memproses dan memuat naik bukti kerja...');

    try {
      // Image Optimization: Convert to WebP format to save bandwidth
      const optimizedFile = await convertToWebP(originalFile);
      const fileName = `${job.id}-${Date.now()}.webp`;
      const filePath = `${profile?.id}/${fileName}`;
      
      // 1. Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('polytask_proofs')
        .upload(filePath, optimizedFile);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('polytask_proofs')
        .getPublicUrl(filePath);

      // 3. Update job with proof_image_url
      const { error: updateError } = await supabase
        .from('polytask_jobs')
        .update({ proof_image_url: publicUrl })
        .eq('id', job.id);

      if (updateError) throw updateError;

      toast.success('Bukti kerja (WebP) berjaya dimuat naik!', { id: toastId });
      
      if (job.requester_id) {
        sendNotificationToUser(job.requester_id, {
          title: 'Bukti Kerja Telah Dihantar',
          message: `${profile?.full_name} telah memuat naik bukti kerja untuk tugasan "${job.title}". Sila semak dan sahkan.`,
          type: 'SUCCESS',
          module: 'POLYTASK',
          link: `/polytask/job/${job.id}`,
        });
      }
      
      fetchJobDetails();
    } catch (error) {
      console.error('Upload proof error:', error);
      toast.error('Gagal memuat naik bukti kerja', { id: toastId });
    } finally {
      setUploadingProof(false);
    }
  };

  // Helper function to compress and convert image to WebP
  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max width/height to resize
          const MAX_SIZE = 1200;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No context');
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to WebP with 0.8 quality
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          }, 'image/webp', 0.8);
        };
        img.onerror = () => reject(new Error('Image load error'));
        if (event.target?.result) img.src = event.target.result as string;
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(file);
    });
  };

  const handleShare = async () => {
    if (!job) return;
    const shareUrl = `${window.location.origin}/polytask/job/${job.id}`;
    const shareText = `Ada kerja kosong di PolyTask!\nUpah RM${job.budget.toFixed(2)} untuk tugasan "${job.title}".\nKlik link ini:`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tugasan PolyTask',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled share or other error
        console.error('Share cancelled or failed', err);
      }
    } else {
      // Fallback for desktop/unsupported browsers
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success('Pautan berjaya disalin ke papan keratan (clipboard)!');
      } catch (err) {
        toast.error('Gagal menyalin pautan.');
      }
    }
  };

  if (loading) {
    return <PolyTaskJobDetailSkeleton />;
  }

  if (!job) return null;

  const isRequester = profile?.id === job.requester_id;
  const myBid = bids.find(b => b.tasker_id === profile?.id);
  const acceptedBid = bids.find(b => b.status === 'ACCEPTED');
  const isAcceptedTasker = acceptedBid?.tasker_id === profile?.id;
  
  const chatOtherUserName = isRequester ? acceptedBid?.tasker?.full_name : job.requester?.full_name;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen pb-24">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold hover:bg-indigo-500/20 hover:text-indigo-200 transition-all active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5" /> Kongsi
        </button>
      </div>

      {/* Job Details Card */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 flex flex-col items-end gap-2">
           {job.status === 'OPEN' && <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">DIBUKA</span>}
           {job.status === 'IN_PROGRESS' && <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">SEDANG DIJALANKAN</span>}
           {job.status === 'COMPLETED' && <span className="px-4 py-1.5 bg-slate-500/10 text-slate-400 text-xs font-bold rounded-full border border-slate-500/20">SELESAI</span>}
           {job.status === 'DISPUTED' && <span className="px-4 py-1.5 bg-rose-500/10 text-rose-400 text-xs font-bold rounded-full border border-rose-500/20">DALAM PERTIKAIAN</span>}
           
           {/* Dispute Button */}
           {(isRequester || isAcceptedTasker) && (job.status === 'IN_PROGRESS') && (
             <button 
               onClick={() => setIsDisputeModalOpen(true)}
               className="mt-2 text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 transition-colors"
             >
               <AlertTriangle className="w-3 h-3" /> Lapor Isu
             </button>
           )}
        </div>

        <span className="inline-block px-3 py-1 bg-white/5 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/10 mb-4 mt-8 md:mt-0">
          {job.category}
        </span>
        
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 pr-24 leading-tight">{job.title}</h1>
        <p className="text-slate-300 mb-8 whitespace-pre-wrap leading-relaxed">{job.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Lokasi</p>
              <p className="text-sm font-semibold text-white truncate max-w-[150px]">{job.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Tarikh Akhir</p>
              <p className="text-sm font-semibold text-white">{new Date(job.deadline).toLocaleDateString('ms-MY')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-500/70 font-medium">Upah Ditawarkan</p>
              <p className="text-sm font-bold text-emerald-400">RM {job.budget.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Requester Info */}
        <div className="mt-8 p-4 bg-slate-950/50 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between border border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden">
              {job.requester?.avatar_url ? (
                <img src={job.requester.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-slate-500 m-3" />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Peminta (Requester)</p>
              <p className="text-sm font-bold text-white">{(isRequester || isAcceptedTasker) ? job.requester?.full_name : formatMaskedName(job.requester?.full_name)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
            {((job.status === 'IN_PROGRESS' || job.status === 'COMPLETED' || job.status === 'DISPUTED') && (isRequester || isAcceptedTasker)) && (
              <>
                <div className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <span className="text-xs text-indigo-300 hidden sm:inline">No. Tel Peminta:</span>
                  <a href={`https://wa.me/${job.requester?.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-indigo-400 hover:underline">
                    {job.requester?.phone || 'Tiada Nombor'}
                  </a>
                </div>
                <button
                  onClick={() => setIsChatModalOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                >
                  <MessageCircle className="w-4 h-4" /> Chat Maya
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- TASKER VIEW: BIDDING FORM --- */}
      {!isRequester && job.status === 'OPEN' && !myBid && (
        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-3xl p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            Hantar Bidaan <ShieldAlert className="w-5 h-5 text-indigo-400" />
          </h2>
          <p className="text-slate-400 text-sm mb-6">Tawarkan harga upah anda dan berikan sebab mengapa anda sesuai untuk tugasan ini.</p>
          
          <form onSubmit={handleSubmitBid} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-slate-300">Harga Bidaan Anda (RM)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">RM</span>
                  <input 
                    type="number" min="1" step="0.10" required
                    value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                    placeholder={job.budget.toString()} 
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <div className="flex-[2] space-y-2">
                <label className="text-xs font-medium text-slate-300">Mesej Kepada Peminta (Pilihan)</label>
                <input 
                  type="text" 
                  value={bidMessage} onChange={e => setBidMessage(e.target.value)}
                  placeholder="Cth: Saya ada laptop tool set dan boleh siapkan malam ni." 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
            <button 
              type="submit" disabled={submittingBid}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {submittingBid ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Hantar Bidaan'}
            </button>
          </form>
        </div>
      )}

      {/* --- TASKER VIEW: MY BID STATUS --- */}
      {!isRequester && myBid && (
        <div className={`border rounded-3xl p-6 md:p-8 mb-8 ${
          myBid.status === 'ACCEPTED' ? 'bg-emerald-950/20 border-emerald-500/30' :
          myBid.status === 'REJECTED' ? 'bg-rose-950/20 border-rose-500/20' :
          'bg-slate-900/50 border-white/10'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              myBid.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' :
              myBid.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' :
              'bg-indigo-500/20 text-indigo-400'
            }`}>
              {myBid.status === 'ACCEPTED' ? <CheckCircle className="w-5 h-5" /> : 
               myBid.status === 'REJECTED' ? <ShieldAlert className="w-5 h-5" /> : 
               <Clock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Status Bidaan Anda</h3>
              <p className={`text-sm font-semibold ${
                myBid.status === 'ACCEPTED' ? 'text-emerald-400' :
                myBid.status === 'REJECTED' ? 'text-rose-400' :
                'text-indigo-400'
              }`}>
                {myBid.status === 'PENDING' && 'Sedang Menunggu Maklum Balas'}
                {myBid.status === 'ACCEPTED' && 'Tahniah! Bidaan Diterima'}
                {myBid.status === 'REJECTED' && 'Bidaan Ditolak'}
              </p>
            </div>
          </div>
          
          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Harga Ditawarkan:</span>
              <span className="font-bold text-white">RM {myBid.bid_amount.toFixed(2)}</span>
            </div>
            {myBid.proposal_note && (
              <div className="text-sm text-slate-300 mt-2 p-3 bg-white/5 rounded-lg border border-white/5">
                "{myBid.proposal_note}"
              </div>
            )}

            {/* TASKER VIEW: PROOF OF WORK */}
            {myBid.status === 'ACCEPTED' && job.status === 'IN_PROGRESS' && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-emerald-400" /> Bukti Kerja (Proof of Work)
                </h4>
                
                {job.proof_image_url ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                    <p className="text-sm text-emerald-300 text-center font-bold">Bukti telah dihantar kepada Peminta</p>
                    <a href={job.proof_image_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 mt-1">
                      <ExternalLink className="w-3 h-3" /> Lihat Gambar Bukti
                    </a>
                    <p className="text-xs text-slate-400 mt-2 text-center">Menunggu pengesahan dan bayaran dari Peminta.</p>
                  </div>
                ) : (
                  <div className="bg-slate-900/50 border border-white/10 border-dashed p-6 rounded-xl flex flex-col items-center text-center">
                    <p className="text-sm text-slate-300 mb-4">Muat naik gambar bukti kerja anda setelah selesai untuk rujukan Peminta dan pihak JPP.</p>
                    <input
                      type="file"
                      id="proof-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadProof}
                      disabled={uploadingProof}
                    />
                    <label 
                      htmlFor="proof-upload"
                      className={`cursor-pointer px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
                        uploadingProof ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {uploadingProof ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingProof ? 'Memuat naik...' : 'Muat Naik Gambar'}
                    </label>
                  </div>
                )}
              </div>
            )}
            
            {myBid.status === 'ACCEPTED' && job.status === 'IN_PROGRESS' && (
              <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-rose-400 max-w-sm">
                  Menarik diri dari tugasan ini akan menaikkan Cancellation Rate anda dan direkodkan dalam sistem JPP.
                </p>
                <button 
                  onClick={handleCancelJobTasker}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-sm font-bold transition-colors shrink-0 flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" /> Batal & Tarik Diri
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- REQUESTER VIEW: MANAGE JOB --- */}
      {isRequester && job.status === 'IN_PROGRESS' && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-6 md:p-8 mb-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Tugasan Sedang Dijalankan</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Tasker yang dilantik sedang melaksanakan tugasan anda. Pastikan kerja siap sebelum mengesahkan.
          </p>

          {job.proof_image_url && (
            <div className="w-full max-w-md mb-8 bg-slate-900/50 p-4 rounded-2xl border border-emerald-500/30">
              <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center justify-center gap-2">
                <FileImage className="w-4 h-4" /> Tasker Telah Memuat Naik Bukti
              </h4>
              <img src={job.proof_image_url} alt="Bukti Kerja" className="w-full h-48 object-cover rounded-xl mb-2" />
              <a href={job.proof_image_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 underline">Lihat Imej Penuh</a>
            </div>
          )}

          <button 
            onClick={handleMarkCompleted}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
          >
            <Check className="w-5 h-5" /> Sahkan Tugasan Selesai
          </button>
        </div>
      )}

      {/* --- REQUESTER VIEW: REVIEW TASKER --- */}
      {isRequester && job.status === 'COMPLETED' && acceptedBid && (
        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-6 md:p-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Tugasan Selesai! 🎉</h2>
            <p className="text-slate-400 text-sm">
              {hasReviewed 
                ? 'Terima kasih kerana memberikan ulasan untuk Tasker ini.' 
                : 'Bagaimana hasil kerja Tasker ini? Berikan rating anda.'}
            </p>
          </div>
          {!hasReviewed && (
            <button 
              onClick={() => setIsReviewModalOpen(true)}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              <Star className="w-5 h-5 fill-white text-white" /> Nilaikan Tasker
            </button>
          )}
        </div>
      )}

      {/* --- REQUESTER VIEW: LIST OF BIDS --- */}
      {isRequester && job.status === 'OPEN' && (
        <div>
          <h2 className="text-xl font-bold text-white mb-6">Senarai Bidaan ({bids.length})</h2>
          
          {bids.length === 0 ? (
            <div className="bg-slate-900/30 border border-dashed border-white/10 rounded-3xl p-12 text-center">
              <p className="text-slate-400">Belum ada sebarang bidaan diterima daripada pelajar lain.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bids.map(bid => (
                <div key={bid.id} className={`bg-slate-900/60 border rounded-2xl p-6 transition-colors flex flex-col sm:flex-row gap-6 ${
                  bid.status === 'ACCEPTED' ? 'border-emerald-500/50 bg-emerald-950/10' : 
                  bid.status === 'REJECTED' ? 'border-white/5 opacity-50' : 
                  'border-white/10 hover:border-indigo-500/30'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <button 
                        onClick={() => {
                          setSelectedTaskerId(bid.tasker_id);
                          setIsTaskerProfileOpen(true);
                        }}
                        className="flex items-center gap-3 text-left group hover:opacity-80 transition-opacity"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden ring-2 ring-transparent group-hover:ring-indigo-500 transition-all">
                          {bid.tasker?.avatar_url ? (
                            <img src={bid.tasker.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-slate-500 m-2.5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-white group-hover:text-indigo-300 transition-colors">{bid.status === 'ACCEPTED' ? bid.tasker?.full_name : formatMaskedName(bid.tasker?.full_name)}</h4>
                          <p className="text-xs text-slate-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true, locale: ms })}
                          </p>
                        </div>
                      </button>
                    </div>
                    {bid.proposal_note && (
                      <p className="text-sm text-slate-300 italic p-3 bg-white/5 rounded-xl border border-white/5">
                        "{bid.proposal_note}"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 sm:border-l border-white/10 sm:pl-6 min-w-[140px]">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-medium mb-1">Tawaran Harga</p>
                      <p className="text-xl font-bold text-emerald-400">RM {bid.bid_amount.toFixed(2)}</p>
                    </div>

                    {job.status === 'OPEN' && bid.status === 'PENDING' && (
                      <button 
                        onClick={() => handleAcceptBid(bid.id, bid.tasker_id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold w-full transition-colors"
                      >
                        Terima Bid
                      </button>
                    )}

                    {bid.status === 'ACCEPTED' && (
                      <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold w-full text-center flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Diterima
                      </div>
                    )}
                    
                    {bid.status === 'REJECTED' && (
                      <div className="bg-white/5 text-slate-500 px-4 py-2 rounded-xl text-sm font-bold w-full text-center">
                        Ditolak
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {acceptedBid && profile && (
        <PolyTaskReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          jobId={job.id}
          reviewerId={profile.id}
          revieweeId={acceptedBid.tasker_id}
          revieweeName={acceptedBid.tasker?.full_name || 'Tasker'}
          onReviewSubmitted={() => fetchJobDetails()}
        />
      )}

      {profile && (
        <PolyTaskDisputeModal
          isOpen={isDisputeModalOpen}
          onClose={() => setIsDisputeModalOpen(false)}
          jobId={job.id}
          reporterId={profile.id}
          onDisputeSubmitted={() => fetchJobDetails()}
        />
      )}

      {profile && chatOtherUserName && (
        <PolyTaskChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          jobId={job.id}
          jobTitle={job.title}
          otherUserName={chatOtherUserName}
        />
      )}

      {selectedTaskerId && (
        <TaskerProfileModal
          isOpen={isTaskerProfileOpen}
          onClose={() => setIsTaskerProfileOpen(false)}
          taskerId={selectedTaskerId}
          isAccepted={selectedTaskerId === acceptedBid?.tasker_id || isRequester}
        />
      )}
    </div>
  );
}
