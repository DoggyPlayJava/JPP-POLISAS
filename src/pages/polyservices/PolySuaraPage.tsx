import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Send, Shield, AlertTriangle, MessageSquare, Flag, ThumbsDown, Flame, Lock, EyeOff, Search, Hash, Loader2, Image as ImageIcon, X, Pin, Check, ChevronLeft, Bell, BellRing, BarChart, XCircle, UserCircle2, CheckCircle, Clock, Share2, Ghost, Heart, Sparkles, MessageCircle, Eye, ShieldAlert, Bookmark } from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { sendNotificationToKebajikanExco } from '@/lib/notifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { PolySuaraPoll } from './PolySuaraPoll';
import { IGStoryExportCard } from '@/components/polysuara/IGStoryExportCard';
import { FloatingAiChat } from '@/components/ai/FloatingAiChat';
import ReactMarkdown from 'react-markdown';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PolySuaraReactions } from '@/components/polysuara/PolySuaraReactions';
import {
  cleanConfessionText,
  getAnimalAvatarFromCodename,
  aggregateReactions,
} from '@/lib/polySuaraHelpers';

const CATEGORIES = ['UMUM', 'AKADEMIK', 'FASILITI', 'KAMSIS', 'KAUNSELING'];
const FEED_CATEGORIES = ['AKADEMIK', 'FASILITI', 'KAMSIS', 'KAUNSELING'];
const MAX_POLL_OPTIONS = 4;
const FEED_PAGE_SIZE = 20;

export function PolySuaraPage() {
  const { profile } = useAuth();
  const canReplyJpp = ['JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'SUPER_ADMIN'].includes(profile?.role || '');
  const { isSubscribed, requestPermission, unsubscribe } = usePushNotifications();
  const navigate = useNavigate();

  // Core state
  const [confessions, setConfessions] = useState<any[]>([]);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [userDownvotes, setUserDownvotes] = useState<Set<string>>(new Set());
  const [confessionReactions, setConfessionReactions] = useState<Record<string, Array<{ reaction_type: string; user_id?: string }>>>({});
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
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const toggleBookmark = (confessionId: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(confessionId)) {
        next.delete(confessionId);
        toast.success('Dikeluarkan dari simpanan');
      } else {
        next.add(confessionId);
        toast.success('Disimpan ke penanda buku');
      }
      return next;
    });
  };

  // Compose state
  const [composeModalOpen, setComposeModalOpen] = useState(false);
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

  // Limit reached modal
  const [limitReachedModalOpen, setLimitReachedModalOpen] = useState(false);

  // Notification toggle (server-backed via polysuara_notif_optout table)
  // Default = ON (true). Jika user ada dalam opt-out table = OFF (false).
  const [polySuaraNotif, setPolySuaraNotif] = useState(true);
  const [notifToggleLoading, setNotifToggleLoading] = useState(false);

  // Comments (Ulasan) States
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [activeConfessionForComments, setActiveConfessionForComments] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSensitiveComment, setIsSensitiveComment] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyCommentText, setReplyCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSortBy, setCommentSortBy] = useState<'LATEST' | 'TOP'>('LATEST');
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  
  // Comments votes tracking
  const [commentUpvotes, setCommentUpvotes] = useState<Set<string>>(new Set());
  const [commentDownvotes, setCommentDownvotes] = useState<Set<string>>(new Set());
  const [escalatingCommentId, setEscalatingCommentId] = useState<string | null>(null);

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

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setCommentFile(file);
        setCommentImagePreview(URL.createObjectURL(file));
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
      .select('id, content, category, upvotes, downvotes, comments_count, created_at, official_reply, official_reply_at, responder:replied_by(full_name), status, codename, hashtags, author_reply, author_reply_at, image_url, is_pinned, polysuara_polls(id, is_multiple_choice, polysuara_poll_options(id, option_text, vote_count, polysuara_poll_votes(user_id)))')
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

      // Fetch reactions from polysuara_reactions table for returned confession IDs
      const confessionIds = newData.map((c: any) => c.id);
      if (confessionIds.length > 0) {
        try {
          const { data: rxData } = await supabase
            .from('polysuara_reactions')
            .select('confession_id, reaction_type, user_id')
            .in('confession_id', confessionIds);
          if (rxData) {
            const grouped: Record<string, any[]> = {};
            rxData.forEach((r: any) => {
              if (!grouped[r.confession_id]) grouped[r.confession_id] = [];
              grouped[r.confession_id].push(r);
            });
            setConfessionReactions(prev => ({ ...prev, ...grouped }));
          }
        } catch (rxErr) {
          console.warn('Reactions fetch fallback:', rxErr);
        }
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
      setComposeModalOpen(false);
      fetchConfessions(0, true);
      // Notification broadcast kini diurus oleh Supabase Database Webhook
      // (server endpoint /api/polysuara-new-confession-notify)
      // — tidak perlu trigger manual dari frontend
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'P0001' || err?.message?.includes('5/hari') || err?.message?.includes('5/jam')) {
        setLimitReachedModalOpen(true);
      } else {
        toast.error('Gagal menghantar luahan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReaction = async (confessionId: string, reactionType: string) => {
    if (!profile?.id) {
      toast.error('Sila log masuk untuk memberi reaksi.');
      return;
    }

    const currentList = confessionReactions[confessionId] || [];
    const hasReacted = currentList.some(
      (r: any) => r.reaction_type === reactionType && r.user_id === profile.id
    );

    // Optimistically updates confessionReactions[confessionId]
    setConfessionReactions(prev => {
      const list = prev[confessionId] || [];
      if (hasReacted) {
        return {
          ...prev,
          [confessionId]: list.filter(
            (r: any) => !(r.reaction_type === reactionType && r.user_id === profile.id)
          )
        };
      } else {
        return {
          ...prev,
          [confessionId]: [...list, { reaction_type: reactionType, user_id: profile.id }]
        };
      }
    });

    // Also increments confession.upvotes optimistically if user is adding reaction
    if (!hasReacted) {
      setConfessions(prev =>
        prev.map(c => (c.id === confessionId ? { ...c, upvotes: (c.upvotes || 0) + 1 } : c))
      );
    }

    try {
      if (hasReacted) {
        const { error } = await supabase
          .from('polysuara_reactions')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', profile.id)
          .eq('reaction_type', reactionType);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('polysuara_reactions')
          .insert({
            confession_id: confessionId,
            user_id: profile.id,
            reaction_type: reactionType
          });
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Reactions toggle error:', err);
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
           link: '/jpp/polyservices'
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
        link: '/jpp/polyservices'
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
        link: '/jpp/polyservices'
      }).catch(console.error);
      
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghantar laporan');
    } finally {
      setIsReporting(false);
    }
  };

  // ==========================================
  // COMMENTS / ULASAN LOGIC
  // ==========================================
  const fetchComments = async (confessionId: string) => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('polysuara_comments')
        .select('id, confession_id, parent_id, content, codename, is_jpp_official, is_sensitive, is_hidden_by_community, is_deleted_by_moderator, image_url, upvotes, downvotes, reports_count, created_at')
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setComments(data || []);
      
      if (profile?.id) {
        const { data: voteData } = await supabase
          .from('polysuara_comment_votes')
          .select('comment_id, vote_type')
          .eq('user_id', profile.id);
          
        if (voteData) {
          const ups = new Set<string>();
          const downs = new Set<string>();
          voteData.forEach((v: any) => {
            if (v.vote_type === 'UPVOTE') ups.add(v.comment_id);
            else downs.add(v.comment_id);
          });
          setCommentUpvotes(ups);
          setCommentDownvotes(downs);
        }
      }
    } catch (err) {
      console.error('[Fetch Comments Error]', err);
      toast.error('Gagal memuatkan ulasan.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const commentText = parentId ? replyCommentText : newCommentText;
    const finalCommentContent = commentText.trim();
    if (!finalCommentContent || !profile || !activeConfessionForComments) return;

    setSubmittingComment(true);
    try {
      let commentImageUrl = null;
      if (parentId === null && commentFile) {
        commentImageUrl = await processAndUploadImage(commentFile);
      }

      const { data, error } = await supabase
        .from('polysuara_comments')
        .insert({
          confession_id: activeConfessionForComments.id,
          user_id: profile.id,
          parent_id: parentId,
          content: finalCommentContent,
          is_sensitive: parentId ? false : isSensitiveComment,
          image_url: commentImageUrl
        })
        .select('id, confession_id, parent_id, content, codename, is_jpp_official, is_sensitive, is_hidden_by_community, is_deleted_by_moderator, image_url, upvotes, downvotes, reports_count, created_at')
        .single();

      if (error) throw error;

      toast.success(parentId ? 'Balasan dihantar!' : 'Ulasan dikongsi!');
      if (parentId) {
        setReplyCommentText('');
        setReplyingToCommentId(null);
      } else {
        setNewCommentText('');
        setIsSensitiveComment(false);
        setCommentFile(null);
        setCommentImagePreview(null);
      }
      
      setComments(prev => [...prev, data]);
      
      setConfessions(prev => prev.map(c => {
        if (c.id === activeConfessionForComments.id) {
          return {
            ...c,
            comments_count: (c.comments_count || 0) + 1
          };
        }
        return c;
      }));
    } catch (err: any) {
      console.error('[Add Comment Error]', err);
      toast.error('Gagal menghantar ulasan.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentVote = async (commentId: string, voteType: 'UPVOTE' | 'DOWNVOTE') => {
    if (!profile) return;
    
    const isUp = voteType === 'UPVOTE';
    const hasUpvoted = commentUpvotes.has(commentId);
    const hasDownvoted = commentDownvotes.has(commentId);

    // Optimistic UI updates
    setCommentUpvotes(prev => {
      const next = new Set(prev);
      if (isUp) {
        if (hasUpvoted) next.delete(commentId);
        else next.add(commentId);
      } else {
        next.delete(commentId);
      }
      return next;
    });

    setCommentDownvotes(prev => {
      const next = new Set(prev);
      if (!isUp) {
        if (hasDownvoted) next.delete(commentId);
        else next.add(commentId);
      } else {
        next.delete(commentId);
      }
      return next;
    });

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        let ups = c.upvotes || 0;
        let downs = c.downvotes || 0;
        
        if (isUp) {
          if (hasUpvoted) ups--;
          else {
            ups++;
            if (hasDownvoted) downs--;
          }
        } else {
          if (hasDownvoted) downs--;
          else {
            downs++;
            if (hasUpvoted) ups--;
          }
        }
        
        return { ...c, upvotes: ups, downvotes: downs };
      }
      return c;
    }));

    try {
      const { data: justHidden, error } = await supabase.rpc('toggle_polysuara_comment_vote', {
        p_comment_id: commentId,
        p_vote_type: voteType
      });

      if (error) throw error;
      
      if (justHidden) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast('Ulasan disembunyikan oleh komuniti', { icon: '🚨' });
      }
    } catch (err) {
      console.error('[Comment Vote Error]', err);
      toast.error('Gagal memproses undian.');
      if (activeConfessionForComments) fetchComments(activeConfessionForComments.id);
    }
  };

  const handleReportComment = async (commentId: string) => {
    const reason = window.prompt('Sebab melaporkan ulasan ini (minimum 3 aksara):');
    if (!reason || reason.trim().length < 3) {
      if (reason != null) toast.error('Sebab laporan tidak sah.');
      return;
    }

    try {
      const { data: justHidden, error } = await supabase.rpc('report_polysuara_comment', {
        p_comment_id: commentId,
        p_reason: reason.trim()
      });

      if (error) throw error;

      toast.success('Ulasan dilaporkan.');
      if (justHidden) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast('Ulasan disembunyikan untuk semakan.', { icon: '🚨' });
      }
    } catch (err: any) {
      console.error('[Report Comment Error]', err);
      toast.error(err.message || 'Gagal menghantar laporan.');
    }
  };

  const handleEscalateComment = async (comment: any) => {
    if (!window.confirm('Hantar laporan krisis/kebajikan kecemasan bagi ulasan ini ke Exco Kebajikan? Tindakan ini 100% rahsia.')) return;
    
    setEscalatingCommentId(comment.id);
    try {
      const { error } = await supabase.rpc('report_polysuara_comment', {
        p_comment_id: comment.id,
        p_reason: '🚨 KECEMASAN/KRISIS ESKALASI: Pelajar melaporkan ulasan ini memerlukan perhatian kecemasan Exco Kebajikan.'
      });

      if (error && !error.message?.includes('sudah melaporkan')) throw error;

      await sendNotificationToKebajikanExco({
        title: '🚨 Kecemasan Ulasan PolySuara',
        message: `Pelajar melaporkan ulasan ("${comment.content.substring(0, 30)}...") memerlukan tindakan kebajikan segera.`,
        type: 'ALERT',
        module: 'KEBAJIKAN',
        link: '/jpp/polyservices'
      });

      toast.success('Bantuan Kebajikan telah disegerakan! Exco Kebajikan telah dimaklumkan secara sulit.', { duration: 5000 });
    } catch (err) {
      console.error('[Escalate Comment Error]', err);
      toast.error('Gagal menghantar eskalasi kecemasan.');
    } finally {
      setEscalatingCommentId(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-36 md:pb-32 relative overflow-hidden transition-colors duration-200">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-rose-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="sticky top-0 z-50 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/portal')}
            className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors text-slate-800 dark:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              disabled={notifToggleLoading}
              onClick={async () => {
                if (!profile?.id || notifToggleLoading) return;
                const next = !polySuaraNotif;
                setNotifToggleLoading(true);
                try {
                  if (next) {
                    // Opt-IN: padam record dari opt-out table
                    const { error: delErr } = await supabase
                      .from('polysuara_notif_optout')
                      .delete()
                      .eq('user_id', profile.id);
                    if (delErr) throw delErr;
                    toast.success('Notifikasi PolySuara diaktifkan.');
                    if (!isSubscribed) requestPermission();
                  } else {
                    // Opt-OUT: tambah record ke opt-out table
                    const { error: upsertErr } = await supabase
                      .from('polysuara_notif_optout')
                      .upsert({ user_id: profile.id }, { onConflict: 'user_id', ignoreDuplicates: true });
                    if (upsertErr) throw upsertErr;
                    toast.success('Notifikasi PolySuara ditutup.');
                  }
                  setPolySuaraNotif(next);
                } catch (err: any) {
                  console.error('[PolySuara Notif Toggle]', err);
                  toast.error(`Gagal menukar tetapan notifikasi: ${err?.message ?? 'Cuba lagi.'}`);
                } finally {
                  setNotifToggleLoading(false);
                }
              }}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                notifToggleLoading && "opacity-50 cursor-wait",
                polySuaraNotif ? "bg-teal-500/20 text-teal-600 dark:text-teal-400" : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/10"
              )}
              title={polySuaraNotif ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
            >
              {polySuaraNotif ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
            <span className="text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Anon Mode
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 relative z-10 pb-32">
        <div className="mb-8 flex flex-col">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            Poly<span className="text-rose-500">Suara</span>
            <Ghost className="w-8 h-8 text-rose-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Ruang selamat untuk meluahkan perasaan. 100% Rahsia.
          </p>
        </div>

        {!moduleEnabled ? (
          <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-16 text-center flex flex-col items-center mt-8 mb-16">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
              <Shield className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Modul Ditutup Sementara</h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md">Modul PolySuara sedang ditutup sementara oleh pihak Exco Kebajikan. Sila kembali semula nanti.</p>
          </div>
        ) : (
          <>
            {/* Quick-compose capsule */}
            <div
              onClick={() => setComposeModalOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setComposeModalOpen(true);
                }
              }}
              className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/[0.08] hover:border-rose-400/50 dark:hover:border-rose-500/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 mb-4 shadow-xs flex items-center justify-between gap-3 cursor-pointer group transition-all"
              role="button"
              tabIndex={0}
              aria-label="Tulis luahan kampus baharu"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                  ✍️
                </div>
                <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 font-medium truncate">
                  Ada luahan atau rahsia kampus? Kongsi secara rahsia...
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1 group-hover:bg-rose-500 group-hover:text-white transition-all">
                  Luahkan
                </span>
              </div>
            </div>

            {/* Executive Single-Line Feed Navigation Track */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none snap-x w-full">
              {/* Sort Segmented Toggle */}
              <div className="flex items-center p-0.5 rounded-2xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setSortBy('LATEST')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                    sortBy === 'LATEST'
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" /> Terkini
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('TRENDING')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                    sortBy === 'TRENDING'
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  <Flame className="w-3.5 h-3.5" /> Hangat
                </button>
              </div>

              {/* Subtle Vertical Hairline Divider */}
              <div className="w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0" aria-hidden="true" />

              {/* Category Filter Chips inside horizontal snap track */}
              <div className="overflow-x-auto scrollbar-none snap-x flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveCategory('SEMUA')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
                    activeCategory === 'SEMUA'
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                      : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/5"
                  )}
                >
                  Semua
                </button>
                {FEED_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
                      activeCategory === cat
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                        : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/5"
                    )}
                  >
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Compose Modal */}
            <AnimatePresence>
              {composeModalOpen && (
                <>
                  <motion.div
                    key="compose-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setComposeModalOpen(false)}
                    className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[990]"
                  />
                  <motion.div
                    key="compose-modal"
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.96 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[2.5rem] sm:rounded-3xl p-5 sm:p-6 shadow-2xl z-[999] max-h-[90vh] overflow-y-auto pb-28 sm:pb-6"
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            Tulis Luahan Rahsia
                          </h3>
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            100% Rahsia
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setComposeModalOpen(false)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Tutup"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handlePost}>
                      <textarea
                        autoFocus
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Apa yang bermain di fikiran anda?"
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none transition-all text-sm leading-relaxed"
                        rows={4}
                        maxLength={500}
                      />

                      {imagePreview && (
                        <div className="relative mt-3 w-32 h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
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
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Pilihan Undian</span>
                            <button
                              type="button"
                              onClick={() => setIsMultipleChoice(!isMultipleChoice)}
                              className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded-md transition-colors",
                                isMultipleChoice ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              )}
                            >
                              {isMultipleChoice ? 'Pilihan Pelbagai' : 'Pilihan Tunggal'}
                            </button>
                          </div>
                          {pollOptions.map((opt, idx) => (
                            <input
                              key={idx}
                              placeholder={`Pilihan ${idx + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const next = [...pollOptions];
                                next[idx] = e.target.value;
                                setPollOptions(next);
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white mb-2 focus:outline-none focus:ring-1 focus:ring-rose-500/40"
                            />
                          ))}
                          {pollOptions.length < MAX_POLL_OPTIONS && (
                            <button
                              type="button"
                              onClick={() => setPollOptions([...pollOptions, ''])}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-600"
                            >
                              + Tambah Pilihan (max {MAX_POLL_OPTIONS})
                            </button>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={postCategory}
                            onChange={(e) => setPostCategory(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-rose-500/50 font-medium"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>

                          <label className="cursor-pointer bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2 outline-none transition-colors flex items-center gap-2 font-medium">
                            <ImageIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span>Imej</span>
                            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                          </label>

                          <button
                            type="button"
                            onClick={() => setShowPoll(!showPoll)}
                            className={cn(
                              "px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5",
                              showPoll
                                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                : "bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            )}
                          >
                            <BarChart className="w-4 h-4" />
                            <span>Undian</span>
                          </button>

                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-1">
                            {500 - newContent.length} aksara baki
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={!newContent.trim() || isSubmitting}
                          className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs shrink-0"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          <span>Kongsi Luahan</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {trendingTags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 py-1.5 flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-rose-500"/> Trending:</span>
                {trendingTags.map((tag, i) => (
                  <button key={i} onClick={() => setNewContent(prev => prev + ' ' + tag.tag)} className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold whitespace-nowrap transition-colors">
                    {tag.tag} ({tag.count})
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <p className="text-sm font-bold tracking-wide">Membaca minda pelajar...</p>
                </div>
              ) : confessions.length === 0 ? (
                <div className="text-center py-20 bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl">
                  <Ghost className="w-12 h-12 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Tiada Luahan Buat Masa Ini</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Jadilah yang pertama berkongsi rahsia.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {confessions.filter(c => activeCategory === 'SEMUA' || c.category === activeCategory).map((confession, index) => {
                    const isUpvoted = userUpvotes.has(confession.id);
                    const isMine = myConfessions.has(confession.id);
                    const isTrending = confession.upvotes > 30 && (new Date().getTime() - new Date(confession.created_at).getTime() < 24 * 60 * 60 * 1000);
                    const avatar = getAnimalAvatarFromCodename(confession.codename);

                    return (
                      <motion.div
                        id={`confession-${confession.id}`}
                        key={confession.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl border border-slate-100 dark:border-white/[0.07] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.07)] rounded-[2rem] p-5 sm:p-6 mb-5 transition-all duration-300 relative overflow-hidden",
                          isTrending && "border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                        )}
                      >
                        {isTrending && (
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
                        )}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-[2px] rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 shrink-0">
                              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-lg bg-white dark:bg-slate-900 shadow-inner", isMine ? "text-rose-500" : "")}>
                                {isMine ? <UserCircle2 className="w-5 h-5 text-rose-500" /> : avatar.emoji}
                              </div>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                                  {confession.codename || 'Pelajar Anon'}
                                </h4>
                                <span className="w-4 h-4 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-[10px] font-black shrink-0" title="Identiti Anon Sah Disahkan">
                                  ✓
                                </span>
                                {isMine && (
                                  <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider" data-html2canvas-ignore>
                                    Anda
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {formatDistanceToNow(new Date(confession.created_at), { addSuffix: true, locale: ms })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0" data-html2canvas-ignore>
                            {isTrending && <span className="bg-rose-500/20 text-rose-500 dark:text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0"><Flame className="w-3 h-3" /> Hangat</span>}
                            {confession.is_pinned && <span className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0"><Pin className="w-3 h-3" /> Pinned</span>}
                            {confession.status === 'NEW' && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Baru</span>}
                            {confession.status === 'ACKNOWLEDGED' && <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0"><Check className="w-3 h-3"/> Diterima</span>}
                            {confession.status === 'INVESTIGATING' && <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0"><Clock className="w-3 h-3"/> Disiasat</span>}
                            {confession.status === 'RESOLVED' && <span className="bg-green-500/20 text-green-600 dark:text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0"><CheckCircle className="w-3 h-3"/> Selesai</span>}
                            <span className="text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 shrink-0">
                              {confession.category}
                            </span>
                            <button 
                              onClick={() => {
                                setReportTargetId(confession.id);
                                setReportModalOpen(true);
                              }}
                              title="Laporkan kandungan ini"
                              className="text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[15px] sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-normal mb-3.5">
                          {cleanConfessionText(confession.content)}
                        </p>

                        {confession.polysuara_polls && confession.polysuara_polls.length > 0 && (
                          <div className="mb-4">
                            <PolySuaraPoll poll={confession.polysuara_polls[0]} currentUserId={profile?.id || ''} />
                          </div>
                        )}

                        {confession.image_url && (
                          <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-black/40 group/media">
                            <img src={confession.image_url} alt="Attachment" className="w-full max-h-[350px] object-cover transition-transform duration-300 group-hover/media:scale-105" />
                          </div>
                        )}

                        {/* Hashtags */}
                        {confession.hashtags && confession.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {confession.hashtags.map((tag: string, i: number) => (
                              <span key={i} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">{tag}</span>
                            ))}
                          </div>
                        )}

                        {confession.official_reply && (
                          <div className="mb-4 border-l-2 border-teal-500 bg-teal-50 dark:bg-teal-500/[0.04] p-3.5 rounded-r-2xl">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              <span className="text-xs font-black text-teal-700 dark:text-teal-400 uppercase tracking-widest">Maklum Balas JPP</span>
                            </div>
                            <div className="text-teal-900 dark:text-teal-100 text-sm leading-relaxed">
                              <ReactMarkdown 
                                components={{
                                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-extrabold text-teal-700 dark:text-teal-300" {...props} />,
                                  a: ({node, ...props}) => <a className="text-teal-700 dark:text-teal-300 underline hover:text-teal-800 dark:hover:text-teal-200 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
                                }}
                              >
                                {confession.official_reply}
                              </ReactMarkdown>
                            </div>
                            <div className="mt-2 text-[10px] text-teal-600/70 dark:text-teal-500/60 font-bold uppercase tracking-widest">
                              Oleh: {confession.responder?.full_name || 'Wakil JPP'} • {formatDistanceToNow(new Date(confession.official_reply_at), { addSuffix: true, locale: ms })}
                            </div>
                          </div>
                        )}

                        {/* Author Reply Section */}
                        {confession.author_reply && (
                           <div className="mb-4 border-l-2 border-rose-500 bg-rose-50 dark:bg-rose-500/[0.04] p-3.5 rounded-r-2xl ml-4 sm:ml-6">
                            <div className="flex items-center gap-2 mb-2">
                              <UserCircle2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                              <span className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Balasan Pengarang</span>
                            </div>
                            <p className="text-rose-950 dark:text-rose-100 text-sm leading-relaxed">
                              {cleanConfessionText(confession.author_reply)}
                            </p>
                            <div className="mt-2 text-[10px] text-rose-600/70 dark:text-rose-500/60 font-bold uppercase tracking-widest">
                              {formatDistanceToNow(new Date(confession.author_reply_at), { addSuffix: true, locale: ms })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/5 flex-nowrap overflow-x-auto scrollbar-none" data-html2canvas-ignore>
                          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                            <PolySuaraReactions
                              confessionId={confession.id}
                              reactions={aggregateReactions(confessionReactions[confession.id] || [], profile?.id)}
                              onToggleReaction={handleToggleReaction}
                              totalUpvotes={confession.upvotes}
                            />
                            <button
                              type="button"
                              onClick={() => handleDownvote(confession.id)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 flex-nowrap cursor-pointer",
                                userDownvotes.has(confession.id)
                                  ? "bg-slate-800 text-white dark:bg-slate-700"
                                  : "bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                              )}
                              title="Tidak setuju (Auto-moderasi)"
                            >
                              <ThumbsDown className={cn("w-3.5 h-3.5", userDownvotes.has(confession.id) && "fill-current")} />
                              <span className="font-mono text-[11px] leading-none">{confession.downvotes || 0}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveConfessionForComments(confession);
                                fetchComments(confession.id);
                                setCommentDrawerOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0 flex-nowrap cursor-pointer"
                              title="Ulasan Pelajar"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-mono text-[11px] leading-none">{confession.comments_count || 0}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                            <button
                              type="button"
                              onClick={() => handleShareImage(confession.id)}
                              className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                              title="Kongsi Grafik"
                            >
                              {shareLoadingId === confession.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Share2 className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleBookmark(confession.id)}
                              className={cn(
                                "p-1.5 sm:p-2 rounded-full transition-colors shrink-0 flex items-center justify-center cursor-pointer",
                                bookmarkedIds.has(confession.id)
                                  ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10"
                                  : "text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                              )}
                              title={bookmarkedIds.has(confession.id) ? "Padam Penanda Buku" : "Simpan Penanda Buku"}
                            >
                              <Bookmark className={cn("w-4 h-4", bookmarkedIds.has(confession.id) && "fill-rose-500")} />
                            </button>

                            {canReplyJpp && !confession.official_reply && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyTargetId(confession.id);
                                  setReplyModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 hover:bg-teal-500/25 transition-colors shrink-0 flex-nowrap cursor-pointer flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                Balas JPP
                              </button>
                            )}

                            {isMine && confession.official_reply && !confession.author_reply && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthorReplyTargetId(confession.id);
                                  setAuthorReplyModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-rose-500 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 uppercase tracking-wider shrink-0 flex-nowrap cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                Balas JPP
                              </button>
                            )}

                            {canReplyJpp && (
                              <button
                                type="button"
                                onClick={() => handleTogglePin(confession.id, !!confession.is_pinned)}
                                className={cn(
                                  "p-1.5 rounded-full transition-colors shrink-0 cursor-pointer",
                                  confession.is_pinned
                                    ? "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20"
                                    : "text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-500/10"
                                )}
                                title={confession.is_pinned ? "Nyah-pin luahan" : "Pin ke atas suapan"}
                              >
                                <Pin className={cn("w-4 h-4", confession.is_pinned && "fill-yellow-500")} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}

              {/* Mobile dock spacer at bottom of main feed */}
              <div className="h-32 md:hidden" aria-hidden="true" />

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

      {/* Limit Reached Modal */}
      <AnimatePresence>
        {limitReachedModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLimitReachedModalOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200]"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-slate-900 border border-rose-500/20 rounded-[2rem] shadow-2xl p-8 pointer-events-auto relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-indigo-500" />
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center rotate-3 border border-rose-500/20">
                    <Clock className="w-8 h-8 text-rose-500 -rotate-3" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white mb-3 text-center tracking-tight">
                  Rehat Sekejap! 🛑
                </h3>
                <p className="text-sm text-slate-400 mb-8 text-center leading-relaxed">
                  Anda telah mencapai had maksimum <strong className="text-white">5 luahan sejam</strong>. Kami menetapkan had ini untuk menjaga kualiti komuniti dan mengelakkan spam. Cuba lagi selepas 1 jam!
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => setLimitReachedModalOpen(false)}
                    className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)]"
                  >
                    Baik, Saya Faham
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


      {/* Comments Drawer */}
      <AnimatePresence>
        {commentDrawerOpen && activeConfessionForComments && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCommentDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[990]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[2.5rem] shadow-2xl z-[999] flex flex-col max-h-[85vh] overflow-hidden pointer-events-auto pb-8 sm:pb-4 text-slate-900 dark:text-white"
            >
              {/* Drawer drag indicator/Header */}
              <div className="flex flex-col items-center py-3.5 border-b border-slate-100 dark:border-white/5 shrink-0">
                <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 cursor-pointer" onClick={() => setCommentDrawerOpen(false)} />
                <div className="flex items-center justify-between w-full px-5 sm:px-6">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-rose-500" />
                    <span>Ulasan Pelajar</span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-mono">
                      ({comments.length})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* Sort Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-950 rounded-xl p-0.5 border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCommentSortBy('LATEST')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                          commentSortBy === 'LATEST' ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        Terkini
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentSortBy('TOP')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1",
                          commentSortBy === 'TOP' ? "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        Terbaik
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setCommentDrawerOpen(false)}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
                      aria-label="Tutup ulasan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Confession Preview */}
              <div className="bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 p-4 text-xs px-5 sm:px-6 text-slate-700 dark:text-slate-300 shrink-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Ghost className="w-3.5 h-3.5 text-rose-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{activeConfessionForComments.codename || 'Pelajar Anon'}</span>
                  <span className="bg-slate-200/80 dark:bg-white/10 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">{activeConfessionForComments.category}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 italic line-clamp-2">"{cleanConfessionText(activeConfessionForComments.content)}"</p>
              </div>

              {/* Comments Scrollable Feed */}
              <div className="flex-1 overflow-y-auto">
                {commentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                    <p className="text-xs font-bold uppercase tracking-widest">Membaca maklum balas...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-600 px-4">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-400">Tiada Ulasan Lagi</p>
                    <p className="text-xs text-slate-500 mt-0.5">Jadilah yang pertama menulis pendapat anda.</p>
                  </div>
                ) : (
                  <div>
                    {comments
                      .filter(c => !c.parent_id)
                      .sort((a, b) => {
                        if (commentSortBy === 'TOP') {
                          const netA = (a.upvotes || 0) - (a.downvotes || 0);
                          const netB = (b.upvotes || 0) - (b.downvotes || 0);
                          if (netA !== netB) return netB - netA;
                        }
                        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                      })
                      .map(comment => {
                        const replies = comments.filter(r => r.parent_id === comment.id);
                        const isCommUpvoted = commentUpvotes.has(comment.id);
                        const isCommDownvoted = commentDownvotes.has(comment.id);
                        const isOP = comment.codename.includes('[Penulis]');
                        const displayName = isOP ? comment.codename.replace(' [Penulis]', '') : comment.codename;
                        const cleanCommContent = cleanConfessionText(comment.content);

                        return (
                          <div key={comment.id} className="border-b border-slate-100 dark:border-white/5 py-3.5 px-4">
                            {/* Tier-1 Comment Header */}
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "text-xs font-bold flex items-center gap-1",
                                  comment.is_jpp_official ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-200"
                                )}>
                                  {displayName}
                                </span>
                                {isOP && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
                                    <UserCircle2 className="w-2.5 h-2.5" />
                                    OP
                                  </span>
                                )}
                                {comment.is_jpp_official && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                    <Shield className="w-2.5 h-2.5" />
                                    JPP RASMI
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ms })}
                              </span>
                            </div>

                            {/* Comment Content (With Sensitive Content Blur) */}
                            {comment.is_deleted_by_moderator ? (
                              <div className="bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5 p-3 rounded-xl flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic select-none">
                                <ShieldAlert className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                {cleanCommContent}
                              </div>
                            ) : comment.is_sensitive ? (
                              <SensitiveCommentContent content={cleanCommContent} />
                            ) : (
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">{cleanCommContent}</p>
                            )}

                            {comment.image_url && !comment.is_deleted_by_moderator && (
                              <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 max-w-xs">
                                <img 
                                  src={comment.image_url} 
                                  alt="Bukti Lampiran" 
                                  className="w-full max-h-[160px] object-contain cursor-zoom-in hover:scale-[1.02] transition-transform" 
                                  onClick={() => window.open(comment.image_url, '_blank')} 
                                />
                              </div>
                            )}

                            {/* Comment Action Buttons */}
                            {!comment.is_deleted_by_moderator && (
                              <div className="flex items-center justify-between mt-2.5 pt-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCommentVote(comment.id, 'UPVOTE')}
                                    className={cn(
                                      "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all",
                                      isCommUpvoted ? "bg-rose-500/10 text-rose-500" : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-rose-500"
                                    )}
                                    aria-label="Suka komen"
                                  >
                                    <Heart className={cn("w-3.5 h-3.5", isCommUpvoted && "fill-rose-500")} />
                                    <span>{comment.upvotes || 0}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCommentVote(comment.id, 'DOWNVOTE')}
                                    className={cn(
                                      "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all",
                                      isCommDownvoted ? "bg-indigo-500/10 text-indigo-500" : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-indigo-500"
                                    )}
                                    aria-label="Tidak suka komen"
                                  >
                                    <ThumbsDown className={cn("w-3.5 h-3.5", isCommDownvoted && "fill-indigo-500")} />
                                    <span>{comment.downvotes || 0}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingToCommentId(comment.id);
                                      setReplyCommentText('');
                                    }}
                                    className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
                                    aria-label="Balas komen"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Balas</span>
                                  </button>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEscalateComment(comment)}
                                    disabled={escalatingCommentId === comment.id}
                                    className="text-slate-400 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-400 p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors"
                                    title="Eskalasi kecemasan ke Kebajikan (Rahsia)"
                                    aria-label="Eskalasi kecemasan ke Kebajikan"
                                  >
                                    {escalatingCommentId === comment.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                    ) : (
                                      <ShieldAlert className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReportComment(comment.id)}
                                    className="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                                    title="Lapor ulasan"
                                    aria-label="Lapor ulasan"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Reply Input Form (Tier-1 Specific) */}
                            {replyingToCommentId === comment.id && (
                              <form onSubmit={(e) => handleAddComment(e, comment.id)} className="mt-2.5 p-2.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <input
                                  type="text"
                                  placeholder={`Balas kepada ${displayName}...`}
                                  value={replyCommentText}
                                  onChange={(e) => setReplyCommentText(e.target.value)}
                                  className="flex-1 bg-transparent px-2 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                                  maxLength={300}
                                  required
                                />
                                <button
                                  type="submit"
                                  disabled={!replyCommentText.trim() || submittingComment}
                                  className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-500 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                                >
                                  {submittingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                  Balas
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReplyingToCommentId(null)}
                                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 text-xs font-bold transition-all shrink-0"
                                >
                                  Batal
                                </button>
                              </form>
                            )}

                            {/* Tier-2 Nested Replies Section */}
                            {replies.length > 0 && (
                              <div className="border-l-2 border-slate-200 dark:border-white/10 pl-3 ml-2 mt-2 space-y-2.5">
                                {replies.map(reply => {
                                  const isReplyUp = commentUpvotes.has(reply.id);
                                  const isReplyDown = commentDownvotes.has(reply.id);
                                  const isReplyOP = reply.codename.includes('[Penulis]');
                                  const displayReplyName = isReplyOP ? reply.codename.replace(' [Penulis]', '') : reply.codename;
                                  const cleanReplyContent = cleanConfessionText(reply.content);

                                  return (
                                    <div key={reply.id} className="py-2">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className={cn(
                                            "text-xs font-bold flex items-center gap-1",
                                            reply.is_jpp_official ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-300"
                                          )}>
                                            {displayReplyName}
                                          </span>
                                          {isReplyOP && (
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
                                              <UserCircle2 className="w-2.5 h-2.5" />
                                              OP
                                            </span>
                                          )}
                                          {reply.is_jpp_official && (
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                              <Shield className="w-2.5 h-2.5" />
                                              JPP RASMI
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ms })}
                                        </span>
                                      </div>

                                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">{cleanReplyContent}</p>

                                      {/* Action Buttons for Tier 2 */}
                                      <div className="flex items-center justify-between mt-1.5 pt-1 text-xs">
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleCommentVote(reply.id, 'UPVOTE')}
                                            className={cn(
                                              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold transition-all",
                                              isReplyUp ? "bg-rose-500/10 text-rose-500" : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400"
                                            )}
                                            aria-label="Suka balasan"
                                          >
                                            <Heart className="w-3 h-3" />
                                            <span>{reply.upvotes || 0}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleCommentVote(reply.id, 'DOWNVOTE')}
                                            className={cn(
                                              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold transition-all",
                                              isReplyDown ? "bg-indigo-500/10 text-indigo-500" : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400"
                                            )}
                                            aria-label="Tidak suka balasan"
                                          >
                                            <ThumbsDown className="w-3 h-3" />
                                            <span>{reply.downvotes || 0}</span>
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleReportComment(reply.id)}
                                          className="text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 p-1 rounded transition-colors"
                                          title="Lapor ulasan"
                                          aria-label="Lapor ulasan"
                                        >
                                          <AlertTriangle className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Comments Input Form Footer */}
              <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 p-4 shrink-0 px-4 sm:px-6">
                <form onSubmit={(e) => handleAddComment(e, null)} className="space-y-3">
                  {commentImagePreview && (
                    <div className="relative mb-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group animate-in fade-in zoom-in duration-200">
                      <img src={commentImagePreview} alt="Pratonton" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => { setCommentFile(null); setCommentImagePreview(null); }}
                        className="absolute top-0.5 right-0.5 bg-black/60 p-1 rounded-full text-white hover:bg-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Tulis ulasan sulit anda..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50 transition-all"
                      maxLength={300}
                    />
                    
                    {/* Camera/Image Selector Button */}
                    <label className="cursor-pointer bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-3 rounded-2xl transition-all flex items-center justify-center shrink-0 min-w-[42px] min-h-[42px]" title="Lampirkan Imej">
                      <ImageIcon className="w-4 h-4" />
                      <input type="file" accept="image/*" onChange={handleCommentImageSelect} className="hidden" />
                    </label>

                    <button
                      type="submit"
                      disabled={!newCommentText.trim() || submittingComment}
                      className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-500 p-3 rounded-2xl font-bold transition-all shrink-0 flex items-center justify-center min-w-[42px] min-h-[42px] shadow-sm hover:shadow-rose-500/20"
                      aria-label="Hantar ulasan"
                    >
                      {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Sensitive Comment Blur checkbox */}
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={isSensitiveComment}
                        onChange={(e) => setIsSensitiveComment(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-rose-500 focus:ring-rose-500/30"
                      />
                      <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors uppercase tracking-wider flex items-center gap-1">
                        <EyeOff className="w-3.5 h-3.5" />
                        Tanda sebagai Sensitif (Blur)
                      </span>
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {300 - newCommentText.length} baki
                    </span>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
      <FloatingAiChat />
    </div>
  );
}

function SensitiveCommentContent({ content }: { content: string }) {
  const [revealed, setRevealed] = React.useState(false);
  
  if (revealed) {
    return <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words animate-in fade-in duration-300">{content}</p>;
  }

  return (
    <div 
      onClick={() => setRevealed(true)}
      className="bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-950 transition-colors flex items-center gap-2 group"
    >
      <EyeOff className="w-4 h-4 text-rose-500/70 shrink-0 group-hover:scale-105 transition-transform" />
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors select-none">
        Ulasan ini mengandungi kandungan sensitif. Klik untuk baca.
      </span>
    </div>
  );
}

export default PolySuaraPage;
