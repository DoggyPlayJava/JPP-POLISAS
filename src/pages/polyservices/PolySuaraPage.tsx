import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Send, Shield, AlertTriangle, MessageSquare, Flag, ThumbsDown, Flame, Lock, EyeOff, Search, Hash, Loader2, Image as ImageIcon, X, Pin, Check, ChevronLeft, Bell, BellRing, BarChart, XCircle, UserCircle2, CheckCircle, Clock, Share2, Ghost, Heart, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { sendNotificationToKebajikanExco, broadcastPolySuaraNewConfession } from '@/lib/notifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { PolySuaraPoll } from './PolySuaraPoll';
import { IGStoryExportCard } from '@/components/polysuara/IGStoryExportCard';

const CATEGORIES = ['UMUM', 'AKADEMIK', 'FASILITI', 'KAMSIS', 'KAUNSELING'];
const MAX_POLL_OPTIONS = 4;
const FEED_PAGE_SIZE = 20;

export function PolySuaraPage() {
  const { profile } = useAuth();
  const { isSubscribed, requestPermission, unsubscribe } = usePushNotifications();
  const navigate = useNavigate();

  // Core state
  const [confessions, setConfessions] = useState<any[]>([]);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [userDownvotes, setUserDownvotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(true);

  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedOffset, setFeedOffset] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        loadMoreConfessions();
      }
    }, { rootMargin: '200px' });
    if (node) observerRef.current.observe(node);
  }, [hasMore, loadingMore, loading]);

  // Filter & sort
  const [activeCategory, setActiveCategory] = useState<string>('SEMUA');
  const [sortBy, setSortBy] = useState<'LATEST'|'TRENDING'>('LATEST');

  // Compose state
  const [newContent, setNewContent] = useState('');
  const [postCategory, setPostCategory] = useState<string>('UMUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Poll compose state
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);

  // Feed metadata
  const [trendingTags, setTrendingTags] = useState<{tag: string, count: number}[]>([]);
  const [myConfessions, setMyConfessions] = useState<Set<string>>(new Set());

  // Share / export
  const [shareLoadingId, setShareLoadingId] = useState<string | null>(null);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);

  // JPP reply modal
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('RESOLVED');
  const [isReplying, setIsReplying] = useState(false);

  // Author reply modal
  const [authorReplyModalOpen, setAuthorReplyModalOpen] = useState(false);
  const [authorReplyTargetId, setAuthorReplyTargetId] = useState<string | null>(null);
  const [authorReplyText, setAuthorReplyText] = useState('');
  const [isAuthorReplying, setIsAuthorReplying] = useState(false);

  // Report modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Notification toggle (server-backed via polysuara_notif_optout table)
  // Default = ON (true). Jika user ada dalam opt-out table = OFF (false).
  const [polySuaraNotif, setPolySuaraNotif] = useState(true);
  const [notifToggleLoading, setNotifToggleLoading] = useState(false);

  // Fetch notification preference from DB on mount
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('polysuara_notif_optout')
      .select('user_id')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        // Jika record wujud = user telah opt-out = notif OFF
        setPolySuaraNotif(!data);
      });
  }, [profile?.id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setImagePreview(URL.createObjectURL(file));
      } else {
        toast.error('Sila muat naik format gambar sahaja.');
      }
    }
  };

  const processAndUploadImage = async (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX = 1200;
        if (width > height && width > MAX) {
          height *= MAX / width;
          width = MAX;
        } else if (height > MAX) {
          width *= MAX / height;
          height = MAX;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(async (blob) => {
          if (!blob) return resolve(null);
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
          try {
            const { data, error } = await supabase.storage.from('polysuara_attachments').upload(fileName, blob, { contentType: 'image/webp' });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('polysuara_attachments').getPublicUrl(data.path);
            resolve(publicUrl);
          } catch (e) {
            reject(e);
          }
        }, 'image/webp', 0.8);
      };
      img.onerror = () => reject('Gagal memproses gambar');
    });
  };

  useEffect(() => {
    checkModuleStatus();
    // Reset pagination on sort change
    setConfessions([]);
    setFeedOffset(0);
    setHasMore(true);
    fetchConfessions(0, true);
  }, [profile, sortBy]);

  const checkModuleStatus = async () => {
    const { data } = await supabase.from('portal_settings').select('is_enabled').eq('exco_module', 'polysuara').maybeSingle();
    if (data && data.is_enabled === false) {
      setModuleEnabled(false);
    }
  };

  const buildFeedQuery = (offset: number) => {
    let query = supabase
      .from('polysuara_confessions')
      .select('id, content, category, upvotes, downvotes, created_at, official_reply, official_reply_at, responder:replied_by(full_name), status, codename, hashtags, author_reply, author_reply_at, image_url, is_pinned, polysuara_polls(id, is_multiple_choice, polysuara_poll_options(id, option_text, vote_count, polysuara_poll_votes(user_id)))')
      .eq('is_archived', false);

    if (sortBy === 'TRENDING') {
      query = query.order('is_pinned', { ascending: false }).order('upvotes', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    }

    return query.range(offset, offset + FEED_PAGE_SIZE - 1);
  };

  const fetchConfessions = async (offset = 0, isInitial = false) => {
    if (!profile) return;
    try {
      if (isInitial) setLoading(true);
      
      const queries: any[] = [buildFeedQuery(offset)];

      // Only fetch metadata on initial load
      if (isInitial) {
        queries.push(
          supabase.from('polysuara_upvotes').select('confession_id').eq('user_id', profile.id),
          supabase.from('polysuara_downvotes').select('confession_id').eq('user_id', profile.id),
          supabase.rpc('get_trending_polysuara_tags'),
          supabase.rpc('get_my_polysuara_ids')
        );
      }

      const results = await Promise.all(queries);
      const confRes = results[0];

      if (confRes.error) throw confRes.error;
      
      const newData = confRes.data || [];
      
      if (isInitial) {
        setConfessions(newData);
        setUserUpvotes(new Set(results[1].data?.map((u: any) => u.confession_id) || []));
        setUserDownvotes(new Set(results[2].data?.map((d: any) => d.confession_id) || []));
        setTrendingTags(results[3].data || []);
        setMyConfessions(new Set(results[4].data?.map((r: any) => r.id) || []));
      } else {
        setConfessions(prev => [...prev, ...newData]);
      }

      setHasMore(newData.length === FEED_PAGE_SIZE);
      setFeedOffset(offset + newData.length);

    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuatkan luahan.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreConfessions = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchConfessions(feedOffset, false);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !profile) return;
    
    // Content censorship is handled by DB trigger (censor_polysuara_content)
    const cleanContent = newContent.trim();

    const hashtagsMatch = cleanContent.match(/#[a-zA-Z0-9_]+/g);
    const hashtags = hashtagsMatch ? hashtagsMatch.map(t => t.toLowerCase()) : [];

    setIsSubmitting(true);
    try {
      let imageUrl = null;
      if (selectedFile) {
        imageUrl = await processAndUploadImage(selectedFile);
      }

      const { data: insertedConf, error } = await supabase.from('polysuara_confessions').insert({
        content: cleanContent,
        author_id: profile.id,
        category: postCategory,
        hashtags: hashtags,
        image_url: imageUrl
      }).select('id').single();
      
      if (error) throw error;

      // Handle Poll Creation
      const validOptions = pollOptions.filter(o => o.trim());
      if (showPoll && validOptions.length >= 2 && insertedConf) {
        const { data: insertedPoll, error: pollError } = await supabase.from('polysuara_polls').insert({
          confession_id: insertedConf.id,
          is_multiple_choice: isMultipleChoice
        }).select('id').single();

        if (!pollError && insertedPoll) {
          const optionsToInsert = validOptions.map(o => ({
            poll_id: insertedPoll.id,
            option_text: o.trim()
          }));
          await supabase.from('polysuara_poll_options').insert(optionsToInsert);
        }
      }
      
      toast.success('Luahan anda berjaya dikongsi secara rahsia!');
      setNewContent('');
      setSelectedFile(null);
      setImagePreview(null);
      setShowPoll(false);
      setPollOptions(['', '']);
      fetchConfessions(0, true);

      // Broadcast push notification kepada semua subscriber (fire-and-forget)
      broadcastPolySuaraNewConfession(profile.id, postCategory).catch(console.error);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghantar luahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (confessionId: string) => {
    const isCurrentlyUpvoted = userUpvotes.has(confessionId);
    
    setUserUpvotes(prev => {
      const next = new Set(prev);
      if (isCurrentlyUpvoted) next.delete(confessionId);
      else {
        next.add(confessionId);
        // Mutual exclusion
        setUserDownvotes(down => {
          const downNext = new Set(down);
          downNext.delete(confessionId);
          return downNext;
        });
      }
      return next;
    });

    setConfessions(prev => prev.map(c => {
      if (c.id === confessionId) {
        return { 
          ...c, 
          upvotes: (c.upvotes || 0) + (isCurrentlyUpvoted ? -1 : 1),
          downvotes: userDownvotes.has(confessionId) ? (c.downvotes || 0) - 1 : (c.downvotes || 0)
        };
      }
      return c;
    }));

    try {
      const { error } = await supabase.rpc('toggle_polysuara_upvote', {
        p_confession_id: confessionId
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memproses sokongan.');
      fetchConfessions(0, true);
    }
  };

  const handleDownvote = async (confessionId: string) => {
    const isCurrentlyDownvoted = userDownvotes.has(confessionId);
    
    setUserDownvotes(prev => {
      const next = new Set(prev);
      if (isCurrentlyDownvoted) next.delete(confessionId);
      else {
        next.add(confessionId);
        // Mutual exclusion
        setUserUpvotes(up => {
          const upNext = new Set(up);
          upNext.delete(confessionId);
          return upNext;
        });
      }
      return next;
    });

    setConfessions(prev => prev.map(c => {
      if (c.id === confessionId) {
        return { 
          ...c, 
          downvotes: (c.downvotes || 0) + (isCurrentlyDownvoted ? -1 : 1),
          upvotes: userUpvotes.has(confessionId) ? (c.upvotes || 0) - 1 : (c.upvotes || 0)
        };
      }
      return c;
    }));

    try {
      const { data: justHidden, error } = await supabase.rpc('toggle_polysuara_downvote', {
        p_confession_id: confessionId
      });
      
      if (error) throw error;

      if (justHidden) {
         sendNotificationToKebajikanExco({
           title: '🚨 Luahan Disembunyikan Automatik',
           message: 'Luahan telah melebihi had downvote (>60% daripada 40 undian). Sila semak di panel Moderasi PolySuara.',
           type: 'ALERT',
           module: 'KEBAJIKAN',
           link: '/jpp/kebajikan'
         }).catch(console.error);
         setConfessions(prev => prev.filter(c => c.id !== confessionId));
         toast('Luahan ini telah disembunyikan dari awam', { icon: '🚨' });
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memproses undian.');
      fetchConfessions(0, true);
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      if (!currentPinned) {
        const pinCount = confessions.filter(c => c.is_pinned).length;
        if (pinCount >= 3) {
          toast.error('Had maksimum dicapai. Anda hanya boleh menyemat sehingga 3 luahan.');
          return;
        }
      }

      const { error } = await supabase
        .from('polysuara_confessions')
        .update({ is_pinned: !currentPinned })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(!currentPinned ? 'Luahan disematkan' : 'Luahan dinyahsemat');
      
      setConfessions(prev => {
        const updated = prev.map(c => c.id === id ? { ...c, is_pinned: !currentPinned } : c);
        return updated.sort((a, b) => {
          if (a.is_pinned === b.is_pinned) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return a.is_pinned ? -1 : 1;
        });
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menukar status pin');
    }
  };

  // (state moved to top of component)

  const submitReply = async () => {
    if (!replyTargetId || !replyText.trim() || !profile) return;
    setIsReplying(true);
    try {
      const { error } = await supabase.from('polysuara_confessions')
        .update({
          official_reply: replyText.trim(),
          official_reply_at: new Date().toISOString(),
          replied_by: profile.id,
          status: replyStatus
        })
        .eq('id', replyTargetId);
      
      if (error) throw error;
      toast.success('Maklum balas JPP telah dihantar');
      setReplyModalOpen(false);
      setReplyText('');
      setReplyTargetId(null);
      fetchConfessions(0, true);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghantar maklum balas');
    } finally {
      setIsReplying(false);
    }
  };

  const submitAuthorReply = async () => {
    if (!authorReplyTargetId || !authorReplyText.trim()) return;
    setIsAuthorReplying(true);
    try {
      const { error } = await supabase.from('polysuara_confessions')
        .update({
          author_reply: authorReplyText.trim(),
          author_reply_at: new Date().toISOString()
        })
        .eq('id', authorReplyTargetId);
      if (error) throw error;
      toast.success('Maklum balas anda telah dihantar kepada JPP');
      setAuthorReplyModalOpen(false);
      setAuthorReplyText('');
      fetchConfessions(0, true);

      sendNotificationToKebajikanExco({
        title: '💬 Balasan Pengguna PolySuara',
        message: 'Pengguna telah membalas maklum balas rasmi JPP.',
        type: 'INFO',
        module: 'KEBAJIKAN',
        link: '/jpp/kebajikan'
      }).catch(console.error);
    } catch (e) {
      toast.error('Gagal menghantar balas');
    } finally {
      setIsAuthorReplying(false);
    }
  };

  const handleShareImage = async (id: string) => {
    setActiveExportId(id);
    setTimeout(async () => {
      const el = document.getElementById(`export-card-${id}`);
      if (!el) {
        setActiveExportId(null);
        return;
      }
      try {
        setShareLoadingId(id);
        const canvas = await html2canvas(el, { 
          backgroundColor: '#020617', 
          scale: 2, 
          useCORS: true,
          logging: false
        });
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Failed to create image');
        
        const file = new File([blob], `polysuara-${id}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'PolySuara Confession',
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `polysuara-${id}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error(err);
        toast.error('Gagal mengeksport luahan.');
      } finally {
        setShareLoadingId(null);
        setActiveExportId(null);
      }
    }, 100);
  };
  // (state moved to top of component)

  const submitReport = async () => {
    if (!reportTargetId || !reportReason.trim()) return;
    setIsReporting(true);
    try {
      const { data, error } = await supabase.rpc('submit_polyservices_report', {
        p_target_id: reportTargetId,
        p_target_type: 'SUARA',
        p_reason: reportReason.trim()
      });
      
      if (error) throw error;
      
      toast.success('Laporan telah dihantar');
      if (data?.auto_hidden) {
        toast.success('Confession ini telah disembunyikan untuk semakan.');
        setConfessions(prev => prev.filter(c => c.id !== reportTargetId));
      }
      setReportModalOpen(false);
      setReportReason('');
      setReportTargetId(null);

      sendNotificationToKebajikanExco({
        title: '⚠️ Laporan PolySuara Baru',
        message: 'Terdapat satu luahan baru yang dilaporkan dan memerlukan semakan moderasi.',
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

  return (
    <div className="min-h-[100dvh] bg-slate-950 pb-24 md:pb-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-rose-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/portal')}
            className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <button
              disabled={notifToggleLoading}
              onClick={async () => {
                if (!profile?.id || notifToggleLoading) return;
                const next = !polySuaraNotif;
                setNotifToggleLoading(true);
                try {
                  if (next) {
                    // Opt-IN: padam record dari opt-out table
                    await supabase.from('polysuara_notif_optout').delete().eq('user_id', profile.id);
                    toast.success('Notifikasi PolySuara diaktifkan.');
                    if (!isSubscribed) requestPermission();
                  } else {
                    // Opt-OUT: tambah record ke opt-out table
                    await supabase.from('polysuara_notif_optout').upsert({ user_id: profile.id }, { onConflict: 'user_id' });
                    toast.success('Notifikasi PolySuara ditutup.');
                  }
                  setPolySuaraNotif(next);
                } catch (err) {
                  console.error('[PolySuara Notif Toggle]', err);
                  toast.error('Gagal menukar tetapan notifikasi.');
                } finally {
                  setNotifToggleLoading(false);
                }
              }}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                notifToggleLoading && "opacity-50 cursor-wait",
                polySuaraNotif ? "bg-teal-500/20 text-teal-400" : "bg-white/5 text-white/40 hover:bg-white/10"
              )}
              title={polySuaraNotif ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
            >
              {polySuaraNotif ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Anon Mode
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 relative z-10 pb-32">
        <div className="mb-8 flex flex-col">
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            Poly<span className="text-rose-500">Suara</span>
            <Ghost className="w-8 h-8 text-rose-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Ruang selamat untuk meluahkan perasaan. 100% Rahsia.
          </p>
        </div>

        {!moduleEnabled ? (
          <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-16 text-center flex flex-col items-center mt-8 mb-16">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
              <Shield className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Modul Ditutup Sementara</h3>
            <p className="text-slate-400 max-w-md">Modul PolySuara sedang ditutup sementara oleh pihak Exco Kebajikan. Sila kembali semula nanti.</p>
          </div>
        ) : (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-8 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Sparkles className="w-24 h-24" />
              </div>
              
              <form onSubmit={handlePost} className="relative z-10">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Apa yang bermain di fikiran anda?"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none transition-all"
                  rows={3}
                  maxLength={500}
                />
                
                {imagePreview && (
                  <div className="relative mt-3 w-32 h-32 rounded-xl overflow-hidden border border-slate-700 group">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => { setSelectedFile(null); setImagePreview(null); }}
                      className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-rose-500 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {showPoll && (
                  <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Pilihan Undian</span>
                      <button type="button" onClick={() => setIsMultipleChoice(!isMultipleChoice)} className={cn("text-[10px] font-bold px-2 py-1 rounded-md", isMultipleChoice ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-500")}>
                        {isMultipleChoice ? 'Pilihan Pelbagai' : 'Pilihan Tunggal'}
                      </button>
                    </div>
                    {pollOptions.map((opt, idx) => (
                      <input key={idx} placeholder={`Pilihan ${idx + 1}`} value={opt} onChange={(e) => {
                        const next = [...pollOptions]; next[idx] = e.target.value; setPollOptions(next);
                      }} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white mb-2" />
                    ))}
                    {pollOptions.length < MAX_POLL_OPTIONS && (
                      <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-[10px] font-bold text-rose-500">+ Tambah Pilihan (max {MAX_POLL_OPTIONS})</button>
                    )}
                  </div>
                )}
                
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <select
                      value={postCategory}
                      onChange={(e) => setPostCategory(e.target.value)}
                      className="bg-slate-950/50 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-rose-500/50"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <label className="cursor-pointer bg-slate-950/50 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none transition-colors flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Imej</span>
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </label>

                    <button type="button" onClick={() => setShowPoll(!showPoll)} className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", showPoll ? "bg-rose-500/20 text-rose-400" : "bg-slate-950/50 border border-slate-800 text-slate-300")}>
                      <BarChart className="w-4 h-4" />
                    </button>

                    <span className="text-xs text-slate-500 font-medium">
                      {500 - newContent.length} aksara baki
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={!newContent.trim() || isSubmitting}
                    className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-500 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Luahkan
                  </button>
                </div>
              </form>
            </motion.div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setActiveCategory('SEMUA')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                    activeCategory === 'SEMUA' ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  SEMUA
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                      activeCategory === cat ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex bg-slate-900 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setSortBy('LATEST')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                    sortBy === 'LATEST' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white"
                  )}
                >
                  <Ghost className="w-3 h-3" /> Terkini
                </button>
                <button
                  onClick={() => setSortBy('TRENDING')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                    sortBy === 'TRENDING' ? "bg-rose-500/20 text-rose-400" : "text-slate-500 hover:text-white"
                  )}
                >
                  <Flame className="w-3 h-3" /> Hangat
                </button>
              </div>
            </div>

            {trendingTags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
                <span className="text-xs font-bold text-slate-500 py-1.5 flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-rose-500"/> Trending:</span>
                {trendingTags.map((tag, i) => (
                  <button key={i} onClick={() => setNewContent(prev => prev + ' ' + tag.tag)} className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold whitespace-nowrap transition-colors">
                    {tag.tag} ({tag.count})
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <p className="text-sm font-bold tracking-wide">Membaca minda pelajar...</p>
                </div>
              ) : confessions.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl">
                  <Ghost className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-300">Tiada Luahan Buat Masa Ini</h3>
                  <p className="text-sm text-slate-500 mt-1">Jadilah yang pertama berkongsi rahsia.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {confessions.filter(c => activeCategory === 'SEMUA' || c.category === activeCategory).map((confession, index) => {
                    const isUpvoted = userUpvotes.has(confession.id);
                    const isMine = myConfessions.has(confession.id);
                    const isTrending = confession.upvotes > 30 && (new Date().getTime() - new Date(confession.created_at).getTime() < 24 * 60 * 60 * 1000);
                    return (
                      <motion.div
                        id={`confession-${confession.id}`}
                        key={confession.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "bg-slate-900/80 border transition-all rounded-3xl p-5 relative overflow-hidden",
                          isTrending ? "border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]" : "border-slate-800 hover:border-slate-700"
                        )}
                      >
                        {isTrending && (
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isMine ? "bg-rose-500/20" : "bg-slate-800")}>
                              {isMine ? <UserCircle2 className="w-5 h-5 text-rose-500" /> : <Ghost className="w-5 h-5 text-slate-500" />}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-200">{confession.codename || 'Pelajar Anon'}</h4>
                                {isMine && <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase shrink-0" data-html2canvas-ignore>Milik Anda</span>}
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                                  {confession.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
                                {formatDistanceToNow(new Date(confession.created_at), { addSuffix: true, locale: ms })}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 shrink-0" data-html2canvas-ignore>
                            {isTrending && <span className="bg-rose-500/20 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0"><Flame className="w-3 h-3" /> Hangat</span>}
                            {confession.is_pinned && <span className="bg-yellow-500/20 text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0"><Pin className="w-3 h-3" /> Pinned</span>}
                            {confession.status === 'NEW' && <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">Baru</span>}
                            {confession.status === 'ACKNOWLEDGED' && <span className="bg-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0"><Check className="w-3 h-3"/> Diterima</span>}
                            {confession.status === 'INVESTIGATING' && <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0"><Clock className="w-3 h-3"/> Disiasat</span>}
                            {confession.status === 'RESOLVED' && <span className="bg-green-500/20 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0"><CheckCircle className="w-3 h-3"/> Selesai</span>}
                          </div>
                        </div>

                        <p className="text-slate-300 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                          {confession.content}
                        </p>

                        {confession.polysuara_polls && confession.polysuara_polls.length > 0 && (
                          <div className="mb-4">
                            <PolySuaraPoll poll={confession.polysuara_polls[0]} currentUserId={profile?.id || ''} />
                          </div>
                        )}

                        {confession.image_url && (
                          <div className="mb-4 rounded-xl overflow-hidden border border-slate-800 bg-black/40">
                            <img src={confession.image_url} alt="Attachment" className="w-full max-h-[250px] object-contain" />
                          </div>
                        )}

                        {/* Hashtags */}
                        {confession.hashtags && confession.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {confession.hashtags.map((tag: string, i: number) => (
                              <span key={i} className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{tag}</span>
                            ))}
                          </div>
                        )}

                        {confession.official_reply && (
                          <div className="mb-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-teal-400" />
                              <span className="text-xs font-black text-teal-400 uppercase tracking-widest">Maklum Balas JPP</span>
                            </div>
                            <p className="text-teal-50 text-sm leading-relaxed">
                              {confession.official_reply}
                            </p>
                            <div className="mt-2 text-[10px] text-teal-500/60 font-bold uppercase tracking-widest">
                              Oleh: {confession.responder?.full_name || 'Wakil JPP'} • {formatDistanceToNow(new Date(confession.official_reply_at), { addSuffix: true, locale: ms })}
                            </div>
                          </div>
                        )}

                        {/* Author Reply Section */}
                        {confession.author_reply && (
                           <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 ml-8">
                            <div className="flex items-center gap-2 mb-2">
                              <UserCircle2 className="w-4 h-4 text-rose-400" />
                              <span className="text-xs font-black text-rose-400 uppercase tracking-widest">Balasan Pengarang</span>
                            </div>
                            <p className="text-rose-50 text-sm leading-relaxed">
                              {confession.author_reply}
                            </p>
                            <div className="mt-2 text-[10px] text-rose-500/60 font-bold uppercase tracking-widest">
                              {formatDistanceToNow(new Date(confession.author_reply_at), { addSuffix: true, locale: ms })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800/50" data-html2canvas-ignore>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpvote(confession.id)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all group",
                                isUpvoted ? "bg-rose-500/10 text-rose-500" : "hover:bg-slate-800 text-slate-500 hover:text-rose-400"
                              )}
                            >
                              <motion.div
                                animate={isUpvoted ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 0.3 }}
                              >
                                <Heart className={cn("w-4 h-4", isUpvoted ? "fill-rose-500" : "group-hover:fill-rose-400/20")} />
                              </motion.div>
                              <span className="text-xs font-bold">{confession.upvotes}</span>
                            </button>
                            <button
                              onClick={() => handleDownvote(confession.id)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all group",
                                userDownvotes.has(confession.id) ? "bg-indigo-500/10 text-indigo-500" : "hover:bg-slate-800 text-slate-500 hover:text-indigo-400"
                              )}
                            >
                              <motion.div
                                animate={userDownvotes.has(confession.id) ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 0.3 }}
                              >
                                <ThumbsDown className={cn("w-4 h-4", userDownvotes.has(confession.id) && "fill-indigo-500")} />
                              </motion.div>
                              <span className="text-xs font-bold">{confession.downvotes || 0}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleShareImage(confession.id)}
                              className="text-slate-500 hover:text-indigo-400 transition-colors p-2 flex items-center justify-center"
                              title="Kongsi Grafik"
                            >
                              {shareLoadingId === confession.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Share2 className="w-4 h-4" />}
                            </button>

                            {isMine && confession.official_reply && !confession.author_reply && (
                               <button
                               onClick={() => {
                                 setAuthorReplyTargetId(confession.id);
                                 setAuthorReplyModalOpen(true);
                               }}
                               className="text-[10px] font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 mr-2 uppercase tracking-wider"
                             >
                               <MessageSquare className="w-3.5 h-3.5" />
                               Balas JPP
                             </button>
                            )}

                            {['JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'SUPER_ADMIN'].includes(profile?.role || '') && !confession.official_reply && (
                              <button
                                onClick={() => {
                                  setReplyTargetId(confession.id);
                                  setReplyModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 mr-2 uppercase tracking-wider"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Reply as JPP
                              </button>
                            )}
                            {['JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'SUPER_ADMIN'].includes(profile?.role || '') && (
                              <button
                                onClick={() => handleTogglePin(confession.id, !!confession.is_pinned)}
                                className={cn(
                                  "text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 mr-2 uppercase tracking-wider",
                                  confession.is_pinned ? "text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20" : "text-slate-400 bg-white/5 hover:bg-white/10"
                                )}
                              >
                                <Pin className="w-3.5 h-3.5" />
                                {confession.is_pinned ? 'Unpin' : 'Pin'}
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setReportTargetId(confession.id);
                                setReportModalOpen(true);
                              }}
                              title="Laporkan kandungan ini"
                              className="text-slate-600 hover:text-amber-500 transition-colors p-2"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}

              {/* Infinite scroll trigger */}
              {!loading && hasMore && (
                <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                  {loadingMore && (
                    <div className="flex items-center gap-3 text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                      <span className="text-xs font-bold uppercase tracking-widest">Memuatkan lagi...</span>
                    </div>
                  )}
                </div>
              )}

              {!loading && !hasMore && confessions.length > FEED_PAGE_SIZE && (
                <div className="text-center py-6">
                  <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">Anda telah melihat semua luahan 🎉</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {activeExportId && confessions.find(c => c.id === activeExportId) && (
        <IGStoryExportCard 
          confession={confessions.find(c => c.id === activeExportId)} 
          elementId={`export-card-${activeExportId}`} 
        />
      )}

      {/* Report Modal */}
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
                className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl p-6 pointer-events-auto"
              >
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Laporkan Kandungan
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Nyatakan sebab laporan (contoh: Scam, Lucah, Maklumat Palsu).
                </p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Sebab laporan..."
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none transition-all mb-4"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    disabled={!reportReason.trim() || isReporting}
                    onClick={submitReport}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-900 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
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

      {/* JPP Reply Modal */}
      <AnimatePresence>
        {replyModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReplyModalOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200]"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-slate-900 border border-teal-500/30 rounded-[2rem] shadow-2xl p-6 pointer-events-auto"
              >
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-400" />
                  Maklum Balas JPP
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Berikan maklum balas rasmi dari pihak pengurusan/JPP untuk luahan ini.
                </p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Taip jawapan rasmi di sini..."
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none transition-all mb-4"
                  rows={4}
                />
                
                <div className="mb-6">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Status Laporan</label>
                  <select 
                    value={replyStatus} 
                    onChange={(e) => setReplyStatus(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-medium text-white outline-none focus:border-teal-500/50"
                  >
                    <option value="ACKNOWLEDGED">Maklumat Diterima (Acknowledged)</option>
                    <option value="INVESTIGATING">Sedang Disiasat (Investigating)</option>
                    <option value="RESOLVED">Selesai (Resolved)</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setReplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    disabled={!replyText.trim() || isReplying}
                    onClick={submitReply}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                  >
                    {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Hantar Jawapan
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Author Reply Modal */}
      <AnimatePresence>
        {authorReplyModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthorReplyModalOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200]"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-[2rem] shadow-2xl p-6 pointer-events-auto"
              >
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <UserCircle2 className="w-5 h-5 text-rose-400" />
                  Balas Kepada JPP
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Berikan maklum balas tambahan kepada wakil JPP secara rahsia.
                </p>
                <textarea
                  value={authorReplyText}
                  onChange={(e) => setAuthorReplyText(e.target.value)}
                  placeholder="Taip balasan anda di sini..."
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none transition-all mb-4"
                  rows={4}
                />

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setAuthorReplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    disabled={!authorReplyText.trim() || isAuthorReplying}
                    onClick={submitAuthorReply}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                  >
                    {isAuthorReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Hantar Balasan
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Include BottomNav to prevent the bottom from being cut off on mobile without navigation */}
      <BottomNav />
    </div>
  );
}
