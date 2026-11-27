import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  Send, Shield, AlertTriangle, MessageSquare, ThumbsDown, Flame, EyeOff, Search,
  Loader2, Image as ImageIcon, X, Pin, Check, ChevronLeft, Bell, BellRing, BarChart,
  XCircle, UserCircle2, CheckCircle, Clock, Share2, Ghost, Heart, Sparkles,
  MessageCircle, ShieldAlert, Bookmark, Trash2, Link2, MapPin, HeartHandshake,
  ShieldCheck, UserCheck, Focus, ArrowUp, CheckCircle2, Eye, HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
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
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { queryCache, CACHE_TTL } from '@/lib/cache';
import { PolySuaraConfessionCard } from '@/components/polysuara/PolySuaraConfessionCard';
import { PolySuaraMediaViewer } from '@/components/polysuara/PolySuaraMediaViewer';
import {
  PolySuaraLeftRail,
  PolySuaraRightRail,
  PolySuaraMobileDrawer,
  type FeedSortMode,
  type FeedFormatFilter,
  type JppActionHighlight,
} from '@/components/polysuara/PolySuaraSideRails';
import {
  PolySuaraQuickReportModal,
} from '@/components/polysuara/PolySuaraOverlays';
import {
  PolySuaraEscalationModal,
  type PolySuaraEscalationResult,
} from '@/components/polysuara/PolySuaraEscalationModal';
import {
  detectComplaintNudge,
  buildKebajikanPrefillState,
} from '@/lib/polySuaraEscalation';
import {
  cleanConfessionText,
  aggregateReactions,
  getFriendlyAnonName,
  isWithin1Hour,
  embedSpoilerImageToken,
  detectPostIntent,
  checkEmpathyNudge,
} from '@/lib/polySuaraHelpers';

const CATEGORIES = ['UMUM', 'AKADEMIK', 'FASILITI', 'KAMSIS', 'KAUNSELING'];
const FEED_CATEGORIES = ['UMUM', 'AKADEMIK', 'FASILITI', 'KAMSIS', 'KAUNSELING'];
const MAX_POLL_OPTIONS = 4;
const FEED_PAGE_SIZE = 20;
const BOOKMARKS_STORAGE_KEY = 'polysuara_bookmarks_v1';
const DRAFT_STORAGE_KEY = 'polysuara_draft_v1';
let supportsEscalationCols = true;

export interface ConfessionVoteItem {
  id: string;
  upvotes: number;
  downvotes: number;
}

export interface ConfessionVoteState {
  confessions: ConfessionVoteItem[];
  confessionReactions: Record<string, Array<{ reaction_type: string; user_id?: string }>>;
  userDownvotes: Set<string>;
}

export function syncReactionToggleState(
  prevState: ConfessionVoteState,
  confessionId: string,
  reactionType: string,
  userId: string
): ConfessionVoteState {
  const currentList = prevState.confessionReactions[confessionId] || [];
  const existingReaction = currentList.find(r => r.user_id === userId);
  const isSameReaction = existingReaction?.reaction_type === reactionType;
  const wasDownvoted = prevState.userDownvotes.has(confessionId);

  // 1. Next userDownvotes: cancel downvote if active
  const nextUserDownvotes = new Set(prevState.userDownvotes);
  if (wasDownvoted) {
    nextUserDownvotes.delete(confessionId);
  }

  // 2. Next reactions: remove user reaction if same, or update to new reactionType
  const listWithoutUser = currentList.filter(r => r.user_id !== userId);
  const nextReactions = isSameReaction
    ? listWithoutUser
    : [...listWithoutUser, { reaction_type: reactionType, user_id: userId }];

  // 3. Next confessions: adjust upvotes and downvotes
  const nextConfessions = prevState.confessions.map(c => {
    if (c.id !== confessionId) return c;
    let ups = c.upvotes || 0;
    let downs = c.downvotes || 0;

    if (wasDownvoted) {
      downs = Math.max(downs - 1, 0);
    }

    if (isSameReaction) {
      // Un-liking / removing reaction: decrement upvotes
      ups = Math.max(ups - 1, 0);
    } else if (!existingReaction) {
      // New reaction/like: increment upvotes
      ups = ups + 1;
    }

    return { ...c, upvotes: ups, downvotes: downs };
  });

  return {
    confessions: nextConfessions,
    confessionReactions: {
      ...prevState.confessionReactions,
      [confessionId]: nextReactions,
    },
    userDownvotes: nextUserDownvotes,
  };
}

export function syncDownvoteToggleState(
  prevState: ConfessionVoteState,
  confessionId: string,
  userId: string
): ConfessionVoteState {
  const currentReactions = prevState.confessionReactions[confessionId] || [];
  const existingReaction = currentReactions.find(r => r.user_id === userId);
  const isCurrentlyDownvoted = prevState.userDownvotes.has(confessionId);

  // 1. Next userDownvotes
  const nextUserDownvotes = new Set(prevState.userDownvotes);
  if (isCurrentlyDownvoted) {
    nextUserDownvotes.delete(confessionId);
  } else {
    nextUserDownvotes.add(confessionId);
  }

  // 2. Next reactions: cancel user reactions if downvoting
  let nextReactions = currentReactions;
  if (!isCurrentlyDownvoted && existingReaction) {
    nextReactions = currentReactions.filter(r => r.user_id !== userId);
  }

  // 3. Next confessions: adjust downvotes and upvotes
  const nextConfessions = prevState.confessions.map(c => {
    if (c.id !== confessionId) return c;
    let ups = c.upvotes || 0;
    let downs = c.downvotes || 0;

    if (isCurrentlyDownvoted) {
      // Un-downvoting: decrement downvotes
      downs = Math.max(downs - 1, 0);
    } else {
      // Downvoting: increment downvotes
      downs = downs + 1;
      // Dislike cancels Like: decrement upvotes if user had active reaction
      if (existingReaction) {
        ups = Math.max(ups - 1, 0);
      }
    }

    return { ...c, upvotes: ups, downvotes: downs };
  });

  return {
    confessions: nextConfessions,
    confessionReactions: {
      ...prevState.confessionReactions,
      [confessionId]: nextReactions,
    },
    userDownvotes: nextUserDownvotes,
  };
}

export interface PolySuaraPageProps {
  initialComposeModalOpen?: boolean;
  initialCommentDrawerOpen?: boolean;
  initialConfessions?: any[];
  initialComments?: any[];
  initialActiveConfession?: any;
  initialMyConfessions?: Set<string>;
}

export function PolySuaraPage({
  initialComposeModalOpen = false,
  initialCommentDrawerOpen = false,
  initialConfessions,
  initialComments,
  initialActiveConfession,
  initialMyConfessions,
}: PolySuaraPageProps = {}) {
  const { t, i18n } = useTranslation(['services', 'common']);
  const { profile } = useAuth();
  const canReplyJpp = ['JPP', 'SUPER_ADMIN_JPP', 'ADMIN', 'SUPER_ADMIN'].includes(profile?.role || '');
  const { isSubscribed, requestPermission, unsubscribe } = usePushNotifications();
  const navigate = useNavigate();

  // Core state
  const [confessions, setConfessions] = useState<any[]>(initialConfessions || []);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [userDownvotes, setUserDownvotes] = useState<Set<string>>(new Set());
  const [confessionReactions, setConfessionReactions] = useState<Record<string, Array<{ reaction_type: string; user_id?: string }>>>({});
  const [loading, setLoading] = useState(() => typeof window === 'undefined' ? false : !initialConfessions);
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
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<FeedFormatFilter>('ALL');
  const [sortBy, setSortBy] = useState<FeedSortMode>('LATEST');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      }
    } catch {}
    return new Set();
  });

  const toggleBookmark = (confessionId: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(confessionId)) {
        next.delete(confessionId);
        toast.success(t('services:removed_from_saved', 'Dikeluarkan dari simpanan'));
      } else {
        next.add(confessionId);
        toast.success(t('services:saved_to_bookmarks', 'Disimpan ke penanda buku'));
      }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(next)));
        }
      } catch {}
      return next;
    });
  };

  // Compose state (with automatic draft persistence)
  const [composeModalOpen, setComposeModalOpen] = useState(initialComposeModalOpen);

  useEffect(() => {
    if (!composeModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setComposeModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [composeModalOpen]);
  const [newContent, setNewContent] = useState(() => {
    if (initialComposeModalOpen) return '';
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(DRAFT_STORAGE_KEY) || '';
      }
    } catch {}
    return '';
  });
  const [draftRestoredNotice, setDraftRestoredNotice] = useState(() => {
    if (initialComposeModalOpen) return false;
    try {
      return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(DRAFT_STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const [postCategory, setPostCategory] = useState<string>('UMUM');
  const [composeIntent, setComposeIntent] = useState<'STANDARD' | 'QNA' | 'SHOUTOUT' | 'DEBATE'>('STANDARD');
  const [isSpoilerImage, setIsSpoilerImage] = useState(false);
  const [empathyConfirmed, setEmpathyConfirmed] = useState(false);
  const [complaintNudgeDismissed, setComplaintNudgeDismissed] = useState(false);
  const [escalateTarget, setEscalateTarget] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Poll compose state
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);

  // Feed metadata & progressive UX state
  const [trendingTags, setTrendingTags] = useState<{tag: string, count: number}[]>([]);
  const [myConfessions, setMyConfessions] = useState<Set<string>>(initialMyConfessions || new Set());
  const [myIdsLoaded, setMyIdsLoaded] = useState(Boolean(initialMyConfessions));
  const [topCommentsMap, setTopCommentsMap] = useState<Record<string, any>>({});
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const [lightboxPost, setLightboxPost] = useState<any | null>(null);
  const [campusImpactStats, setCampusImpactStats] = useState<{
    resolvedCount: number;
    inActionCount: number;
    jppRepliedCount: number;
    recentActionItems: JppActionHighlight[];
  } | null>(null);
  const [hasNewWhispers, setHasNewWhispers] = useState(false);
  const lastVisibilityCheckRef = useRef<number>(Date.now());
  const deepLinkHandledRef = useRef<boolean>(false);

  // Share / export
  const [shareLoadingId, setShareLoadingId] = useState<string | null>(null);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);

  // Confirm Dialog state (replaces blocking window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    action: null | (() => Promise<void>);
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: '',
    variant: 'danger',
    action: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // JPP reply modal
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('OFFICIAL_NOTE');
  const [isReplying, setIsReplying] = useState(false);

  // Author reply modal
  const [authorReplyModalOpen, setAuthorReplyModalOpen] = useState(false);
  const [authorReplyTargetId, setAuthorReplyTargetId] = useState<string | null>(null);
  const [authorReplyText, setAuthorReplyText] = useState('');
  const [isAuthorReplying, setIsAuthorReplying] = useState(false);

  // Quick Report modal (supports both confessions and comments)
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<'CONFESSION' | 'COMMENT'>('CONFESSION');
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
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(initialCommentDrawerOpen);
  const [activeConfessionForComments, setActiveConfessionForComments] = useState<any | null>(initialActiveConfession || null);
  const [comments, setComments] = useState<any[]>(initialComments || []);
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
  const [commentMenuOpenId, setCommentMenuOpenId] = useState<string | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Persist composer draft automatically
  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') return;
      if (newContent.trim()) {
        localStorage.setItem(DRAFT_STORAGE_KEY, newContent);
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch {}
  }, [newContent]);

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
        toast.error(t('services:image_format_only', 'Sila muat naik format gambar sahaja.'));
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
        toast.error(t('services:image_format_only', 'Sila muat naik format gambar sahaja.'));
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
      img.onerror = () => reject(new Error(t('services:failed_process_image', 'Gagal memproses gambar')));
    });
  };

  const fetchImpactSummary = async (forceRefresh = false) => {
    try {
      const cacheKey = 'polysuara:impact_summary';
      if (!forceRefresh) {
        const cached = queryCache.get<{
          resolvedCount: number;
          inActionCount: number;
          jppRepliedCount: number;
          recentActionItems: JppActionHighlight[];
        }>(cacheKey);
        if (cached) {
          setCampusImpactStats(cached);
          return;
        }
      }
      const { data, error } = await supabase.rpc('get_polysuara_impact_summary');
      if (!error && data) {
        const payload = Array.isArray(data) ? data[0] : data;
        if (payload && typeof payload === 'object') {
          const parsed = {
            resolvedCount: Number(payload.resolved_count || 0),
            inActionCount: Number(payload.in_action_count || 0),
            jppRepliedCount: Number(payload.jpp_replied_count || 0),
            recentActionItems: Array.isArray(payload.recent_action_items) ? payload.recent_action_items : [],
          };
          queryCache.set(cacheKey, parsed, CACHE_TTL.ANNOUNCEMENT);
          setCampusImpactStats(parsed);
        }
      }
    } catch (err) {
      console.warn('[PolySuara Impact RPC fallback]', err);
    }
  };

  useEffect(() => {
    checkModuleStatus();
    if (initialConfessions) return;
    // Reset pagination on filter/sort/search change
    setConfessions([]);
    setFeedOffset(0);
    setHasMore(true);
    setHasNewWhispers(false);
    fetchConfessions(0, true);
    fetchImpactSummary(false);
  }, [profile, sortBy, activeCategory, activeFormat, activeTag, focusMode, debouncedSearch]);

  // Throttled check on visibility return (zero WebSocket subscriptions per 1,500-user scaling guideline)
  useEffect(() => {
    if (typeof document === 'undefined' || !profile) return;
    const onVisibilityChange = async () => {
      if (document.hidden || sortBy !== 'LATEST') return;
      if (Date.now() - lastVisibilityCheckRef.current < 60000) return;
      lastVisibilityCheckRef.current = Date.now();
      const latestLoaded = confessions[0]?.created_at;
      if (!latestLoaded) return;
      try {
        const { data } = await supabase
          .from('polysuara_confessions')
          .select('created_at')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.created_at && new Date(data.created_at).getTime() > new Date(latestLoaded).getTime()) {
          setHasNewWhispers(true);
        }
      } catch {}
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [profile, sortBy, confessions]);

  const checkModuleStatus = async () => {
    const { data } = await supabase.from('portal_settings').select('is_enabled').eq('exco_module', 'polysuara').maybeSingle();
    if (data && data.is_enabled === false) {
      setModuleEnabled(false);
    }
  };

  const buildFeedQuery = (offset: number, includeEscalation = supportsEscalationCols) => {
    const baseCols = 'id, content, category, upvotes, downvotes, comments_count, created_at, official_reply, official_reply_at, responder:replied_by(full_name), status, codename, hashtags, author_reply, author_reply_at, image_url, is_pinned, polysuara_polls(id, is_multiple_choice, polysuara_poll_options(id, option_text, vote_count, polysuara_poll_votes(user_id)))';
    let query = supabase
      .from('polysuara_confessions')
      .select(includeEscalation ? `${baseCols}, escalated_ticket_id, escalated_ticket_no` : baseCols)
      .eq('is_archived', false);

    if (activeCategory !== 'SEMUA') {
      query = query.eq('category', activeCategory);
    }

    if (activeTag) {
      const normalizedTag = activeTag.startsWith('#') ? activeTag.toLowerCase() : `#${activeTag.toLowerCase()}`;
      query = query.contains('hashtags', [normalizedTag]);
    }

    if (focusMode) {
      query = query.or('category.in.(AKADEMIK,FASILITI),official_reply.not.is.null,is_pinned.eq.true');
    }

    if (activeFormat === 'QNA') {
      query = query.or('hashtags.cs.{#tanyakampus},hashtags.cs.{#qna},hashtags.cs.{#soalan}');
    } else if (activeFormat === 'SHOUTOUT') {
      query = query.or('hashtags.cs.{#apresiasi},hashtags.cs.{#terimakasih},hashtags.cs.{#shoutout}');
    } else if (activeFormat === 'DEBATE') {
      query = query.or('hashtags.cs.{#debat},hashtags.cs.{#debate}');
    }

    if (sortBy === 'JPP_REPLIED') {
      query = query.not('official_reply', 'is', null);
    } else if (sortBy === 'MINE' && myConfessions.size > 0) {
      query = query.in('id', Array.from(myConfessions));
    } else if (sortBy === 'BOOKMARKS' && bookmarkedIds.size > 0) {
      query = query.in('id', Array.from(bookmarkedIds));
    }

    if (debouncedSearch.trim()) {
      query = query.ilike('content', `%${debouncedSearch.trim()}%`);
    }

    if (sortBy === 'TRENDING') {
      query = query.order('is_pinned', { ascending: false }).order('upvotes', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    }

    return query.range(offset, offset + FEED_PAGE_SIZE - 1);
  };

  const fetchConfessions = async (offset = 0, isInitial = false) => {
    if (!profile) return;
    if (sortBy === 'BOOKMARKS' && bookmarkedIds.size === 0) {
      setConfessions([]);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    if (sortBy === 'MINE' && myIdsLoaded && myConfessions.size === 0) {
      setConfessions([]);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    try {
      if (isInitial) setLoading(true);
      
      const requestedEscalation = supportsEscalationCols;
      const queries: any[] = [buildFeedQuery(offset, requestedEscalation)];

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
      let confRes = results[0];

      if (
        confRes.error &&
        requestedEscalation &&
        (confRes.error.code === '42703' || confRes.error.message?.includes('escalated_ticket'))
      ) {
        supportsEscalationCols = false;
        confRes = await buildFeedQuery(offset, false);
      }

      if (confRes.error) throw confRes.error;
      
      const newData = confRes.data || [];
      
      if (isInitial) {
        setConfessions(newData);
        setUserUpvotes(new Set(results[1].data?.map((u: any) => u.confession_id) || []));
        setUserDownvotes(new Set(results[2].data?.map((d: any) => d.confession_id) || []));
        setTrendingTags(results[3].data || []);
        setMyConfessions(new Set(results[4].data?.map((r: any) => r.id) || []));
        setMyIdsLoaded(true);
      } else {
        setConfessions(prev => [...prev, ...newData]);
      }

      // Batch fetch reactions & 1 root top comment per confession via RPC (zero N+1 / unbounded reads)
      const confessionIds = newData.map((c: any) => c.id);
      if (confessionIds.length > 0) {
        try {
          const [rxRes, topRpcRes] = await Promise.all([
            supabase
              .from('polysuara_reactions')
              .select('confession_id, reaction_type, user_id')
              .in('confession_id', confessionIds),
            supabase.rpc('get_polysuara_top_comments', {
              p_confession_ids: confessionIds,
            }),
          ]);

          if (rxRes.data) {
            const grouped: Record<string, any[]> = {};
            rxRes.data.forEach((r: any) => {
              if (!grouped[r.confession_id]) grouped[r.confession_id] = [];
              grouped[r.confession_id].push(r);
            });
            setConfessionReactions(prev => ({ ...prev, ...grouped }));
          }

          let topRows: any[] = Array.isArray(topRpcRes?.data) ? topRpcRes.data : [];
          if (topRpcRes?.error || !Array.isArray(topRpcRes?.data)) {
            const fallbackRes = await supabase
              .from('polysuara_comments')
              .select('id, confession_id, content, codename, is_jpp_official, upvotes, created_at')
              .in('confession_id', confessionIds)
              .is('parent_id', null)
              .eq('is_sensitive', false)
              .eq('is_hidden_by_community', false)
              .eq('is_deleted_by_moderator', false)
              .order('upvotes', { ascending: false })
              .limit(40);
            topRows = fallbackRes.data || [];
          }

          if (topRows.length > 0) {
            const nextTop: Record<string, any> = {};
            topRows.forEach((cm: any) => {
              if (cm.content === '[deleted]') return;
              if (!nextTop[cm.confession_id]) {
                nextTop[cm.confession_id] = cm;
              }
            });
            setTopCommentsMap(prev => ({ ...prev, ...nextTop }));
          }
        } catch (rxErr) {
          console.warn('Metadata batch fetch fallback:', rxErr);
        }
      }

      setHasMore(newData.length === FEED_PAGE_SIZE);
      setFeedOffset(offset + newData.length);

    } catch (err: any) {
      console.error(err);
      toast.error(t('services:failed_load_whispers', 'Gagal memuatkan luahan.'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Support deep link /polysuara?post=<id>
  useEffect(() => {
    if (typeof window === 'undefined' || !profile || deepLinkHandledRef.current || loading) return;
    const postId = new URLSearchParams(window.location.search).get('post');
    if (!postId) return;
    deepLinkHandledRef.current = true;
    const existing = confessions.find(c => c.id === postId);
    if (existing) {
      setActiveConfessionForComments(existing);
      fetchComments(existing.id);
      setCommentDrawerOpen(true);
      return;
    }
    const deepLinkBaseCols = 'id, content, category, upvotes, downvotes, comments_count, created_at, official_reply, official_reply_at, responder:replied_by(full_name), status, codename, hashtags, author_reply, author_reply_at, image_url, is_pinned, polysuara_polls(id, is_multiple_choice, polysuara_poll_options(id, option_text, vote_count, polysuara_poll_votes(user_id)))';
    const requestedDeepLinkEscalation = supportsEscalationCols;
    supabase
      .from('polysuara_confessions')
      .select(requestedDeepLinkEscalation ? `${deepLinkBaseCols}, escalated_ticket_id, escalated_ticket_no` : deepLinkBaseCols)
      .eq('id', postId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        let resolvedData = data;
        if (error && requestedDeepLinkEscalation && (error.code === '42703' || error.message?.includes('escalated_ticket'))) {
          supportsEscalationCols = false;
          const retry = await supabase
            .from('polysuara_confessions')
            .select(deepLinkBaseCols)
            .eq('id', postId)
            .maybeSingle();
          resolvedData = retry.data;
        }
        if (resolvedData) {
          setConfessions(prev => (prev.some(p => p.id === resolvedData.id) ? prev : [resolvedData, ...prev]));
          setActiveConfessionForComments(resolvedData);
          fetchComments(resolvedData.id);
          setCommentDrawerOpen(true);
        }
      });
  }, [profile, loading, confessions]);

  const handleIntentSelect = (intent: 'STANDARD' | 'QNA' | 'SHOUTOUT' | 'DEBATE') => {
    setComposeIntent(intent);
    if (intent === 'DEBATE') {
      setShowPoll(true);
      setIsMultipleChoice(false);
      setPollOptions([
        t('services:suara_debate_agree', 'Setuju'),
        t('services:suara_debate_disagree', 'Tidak'),
      ]);
    } else if (composeIntent === 'DEBATE') {
      setShowPoll(false);
      setPollOptions(['', '']);
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

    const empathyCheck = checkEmpathyNudge(newContent);
    if (empathyCheck.triggered && !empathyConfirmed) {
      setEmpathyConfirmed(true);
      return;
    }

    // Content censorship is handled by DB trigger (censor_polysuara_content)
    let cleanContent = newContent.trim();
    let tagSuffix = '';
    if (composeIntent === 'QNA' && !/#(tanyakampus|qna|soalan)\b/i.test(cleanContent)) {
      tagSuffix = ' #TanyaKampus';
    } else if (composeIntent === 'SHOUTOUT' && !/#(apresiasi|terimakasih|shoutout)\b/i.test(cleanContent)) {
      tagSuffix = ' #Apresiasi';
    } else if (composeIntent === 'DEBATE' && !/#(debat|debate)\b/i.test(cleanContent)) {
      tagSuffix = ' #Debat';
    }
    if (tagSuffix) {
      const maxBody = Math.max(0, 500 - tagSuffix.length);
      cleanContent = `${cleanContent.slice(0, maxBody).trimEnd()}${tagSuffix}`;
    }
    if (selectedFile && isSpoilerImage) {
      cleanContent = embedSpoilerImageToken(cleanContent, true);
    }

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

      // Handle Poll Creation (or automatic Agree/Disagree Debate poll)
      const effectiveOptions = composeIntent === 'DEBATE'
        ? [t('services:suara_debate_agree', 'Setuju'), t('services:suara_debate_disagree', 'Tidak')]
        : pollOptions.filter(o => o.trim());
      if ((showPoll || composeIntent === 'DEBATE') && effectiveOptions.length >= 2 && insertedConf) {
        const { data: insertedPoll, error: pollError } = await supabase.from('polysuara_polls').insert({
          confession_id: insertedConf.id,
          is_multiple_choice: composeIntent === 'DEBATE' ? false : isMultipleChoice
        }).select('id').single();

        if (!pollError && insertedPoll) {
          const optionsToInsert = effectiveOptions.map(o => ({
            poll_id: insertedPoll.id,
            option_text: o.trim()
          }));
          await supabase.from('polysuara_poll_options').insert(optionsToInsert);
        }
      }
      
      toast.success(t('services:whisper_posted_success', 'Luahan anda berjaya dikongsi secara rahsia!'));
      setNewContent('');
      setDraftRestoredNotice(false);
      setComposeIntent('STANDARD');
      setIsSpoilerImage(false);
      setEmpathyConfirmed(false);
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
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
        toast.error(t('services:whisper_post_failed', 'Gagal menghantar luahan.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReaction = async (confessionId: string, reactionType: string) => {
    if (!profile?.id) {
      toast.error(t('services:login_to_react', 'Sila log masuk untuk memberi reaksi.'));
      return;
    }

    const currentList = confessionReactions[confessionId] || [];
    const existingReaction = currentList.find((r: any) => r.user_id === profile.id);
    const isSameReaction = existingReaction?.reaction_type === reactionType;
    const wasDownvoted = userDownvotes.has(confessionId);

    // 1. Cancel downvote if active (mutual exclusivity)
    if (wasDownvoted) {
      setUserDownvotes(prev => {
        const next = new Set(prev);
        next.delete(confessionId);
        return next;
      });
    }

    // 2. Optimistically update confessionReactions
    setConfessionReactions(prev => {
      const list = (prev[confessionId] || []).filter((r: any) => r.user_id !== profile.id);
      if (isSameReaction) {
        return { ...prev, [confessionId]: list };
      } else {
        return {
          ...prev,
          [confessionId]: [...list, { reaction_type: reactionType, user_id: profile.id }]
        };
      }
    });

    // Sync legacy userUpvotes for backward compatibility
    setUserUpvotes(prev => {
      const next = new Set(prev);
      if (isSameReaction) {
        next.delete(confessionId);
      } else {
        next.add(confessionId);
      }
      return next;
    });

    // 3. Optimistically update confession upvotes & downvotes
    setConfessions(prev =>
      prev.map(c => {
        if (c.id !== confessionId) return c;
        let ups = c.upvotes || 0;
        let downs = c.downvotes || 0;

        // Like cancels downvote
        if (wasDownvoted) {
          downs = Math.max(downs - 1, 0);
        }

        if (isSameReaction) {
          // Un-react / un-like: decrement upvotes
          ups = Math.max(ups - 1, 0);
        } else if (!existingReaction) {
          // New reaction/like: increment upvotes
          ups = ups + 1;
        }

        return { ...c, upvotes: ups, downvotes: downs };
      })
    );

    // 4. Database synchronization
    try {
      if (wasDownvoted) {
        await supabase
          .from('polysuara_downvotes')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', profile.id);
      }

      if (isSameReaction) {
        const { error } = await supabase
          .from('polysuara_reactions')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', profile.id);
        if (error) throw error;
      } else {
        await supabase
          .from('polysuara_reactions')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', profile.id);

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
    const wasDownvoted = userDownvotes.has(confessionId);
    
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
          downvotes: wasDownvoted ? Math.max((c.downvotes || 0) - 1, 0) : (c.downvotes || 0)
        };
      }
      return c;
    }));

    try {
      if (wasDownvoted) {
        await supabase
          .from('polysuara_downvotes')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', profile?.id || '');
      }

      const { error } = await supabase.rpc('toggle_polysuara_upvote', {
        p_confession_id: confessionId
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      toast.error(t('services:process_reaction_failed', 'Gagal memproses sokongan.'));
      fetchConfessions(0, true);
    }
  };

  const handleDownvote = async (confessionId: string) => {
    if (!profile?.id) {
      toast.error(t('services:login_to_vote', 'Sila log masuk untuk mengundi.'));
      return;
    }

    const currentReactions = confessionReactions[confessionId] || [];
    const existingReaction = currentReactions.find((r: any) => r.user_id === profile.id);
    const isCurrentlyDownvoted = userDownvotes.has(confessionId);
    const hasAnyReaction = Boolean(existingReaction);

    // 1. If downvoting (not un-downvoting) and user has active reaction/like, cancel it
    if (!isCurrentlyDownvoted && hasAnyReaction) {
      setConfessionReactions(prev => {
        const list = (prev[confessionId] || []).filter((r: any) => r.user_id !== profile.id);
        return { ...prev, [confessionId]: list };
      });
      setUserUpvotes(prev => {
        const next = new Set(prev);
        next.delete(confessionId);
        return next;
      });
    }

    // 2. Update userDownvotes
    setUserDownvotes(prev => {
      const next = new Set(prev);
      if (isCurrentlyDownvoted) {
        next.delete(confessionId);
      } else {
        next.add(confessionId);
      }
      return next;
    });

    // 3. Optimistically update confession counts
    setConfessions(prev =>
      prev.map(c => {
        if (c.id !== confessionId) return c;
        let ups = c.upvotes || 0;
        let downs = c.downvotes || 0;

        if (isCurrentlyDownvoted) {
          // Un-downvoting: decrement downvotes
          downs = Math.max(downs - 1, 0);
        } else {
          // Downvoting: increment downvotes
          downs = downs + 1;
          // Dislike cancels Like: decrement upvotes if user had active reaction or upvote
          if (hasAnyReaction || userUpvotes.has(confessionId)) {
            ups = Math.max(ups - 1, 0);
          }
        }

        return { ...c, upvotes: ups, downvotes: downs };
      })
    );

    // 4. Database synchronization
    try {
      if (!isCurrentlyDownvoted && hasAnyReaction) {
        await supabase
          .from('polysuara_reactions')
          .delete()
          .eq('confession_id', confessionId)
          .eq('user_id', profile.id);
      }

      const { data: justHidden, error } = await supabase.rpc('toggle_polysuara_downvote', {
        p_confession_id: confessionId
      });
      
      if (error) throw error;

      if (justHidden) {
         sendNotificationToKebajikanExco({
           title: t('services:notif_confession_hidden_auto_title', '🚨 Luahan Disembunyikan Automatik'),
           message: t('services:notif_confession_hidden_auto_msg', 'Luahan telah melebihi had downvote (>60% daripada 40 undian). Sila semak di panel Moderasi PolySuara.'),
           type: 'ALERT',
           module: 'KEBAJIKAN',
           link: '/jpp/polyservices'
         }).catch(console.error);
         setConfessions(prev => prev.filter(c => c.id !== confessionId));
         toast(t('services:confession_hidden_from_public_toast', 'Luahan ini telah disembunyikan dari awam'), { icon: '🚨' });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t('services:process_vote_failed', 'Gagal memproses undian.'));
      fetchConfessions(0, true);
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      if (!currentPinned) {
        const pinCount = confessions.filter(c => c.is_pinned).length;
        if (pinCount >= 3) {
          toast.error(t('services:pin_limit_reached', 'Had maksimum dicapai. Anda hanya boleh menyemat sehingga 3 luahan.'));
          return;
        }
      }

      const { error } = await supabase
        .from('polysuara_confessions')
        .update({ is_pinned: !currentPinned })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(!currentPinned ? t('services:whisper_pinned', 'Luahan disematkan') : t('services:whisper_unpinned', 'Luahan dinyahsemat'));
      
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
      toast.error(t('services:pin_status_failed', 'Gagal menukar status pin'));
    }
  };

  const handleDeleteConfession = (confessionId: string) => {
    const confession = confessions.find(c => c.id === confessionId);
    if (!confession) return;
    const isAuthor = Boolean(myConfessions.has(confessionId) || (profile?.id && confession.author_id === profile.id));
    if (!isAuthor || !isWithin1Hour(confession.created_at)) {
      toast.error(t('services:delete_time_limit', 'Hanya boleh dipadam dalam tempoh 1 jam selepas diterbitkan.'));
      return;
    }

    setConfirmDialog({
      open: true,
      title: t('services:delete_confession', 'Padam Luahan'),
      description: t('services:delete_confession_confirm', 'Adakah anda pasti ingin memadamkan luahan ini?'),
      confirmLabel: t('services:suara_confirmed_delete_action', 'Ya, Padam'),
      variant: 'danger',
      action: async () => {
        setConfessions(prev => prev.map(c => {
          if (c.id === confessionId) {
            return {
              ...c,
              content: '[deleted]',
              is_deleted_by_author: true,
            };
          }
          return c;
        }));

        toast.success(t('services:whisper_deleted_success', 'Luahan telah dipadamkan.'));

        try {
          const { error } = await supabase
            .from('polysuara_confessions')
            .update({ content: '[deleted]' })
            .eq('id', confessionId);

          if (error) {
            console.error('[Delete Confession DB Error]', error);
          }
        } catch (err) {
          console.error('[Delete Confession Catch Error]', err);
        }
      },
    });
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
      queryCache.invalidate('polysuara:');
      toast.success(t('services:jpp_feedback_sent', 'Maklum balas JPP telah dihantar'));
      setReplyModalOpen(false);
      setReplyText('');
      setReplyTargetId(null);
      fetchConfessions(0, true);
      fetchImpactSummary(true);
    } catch (err: any) {
      console.error(err);
      toast.error(t('services:jpp_feedback_failed', 'Gagal menghantar maklum balas'));
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
      toast.success(t('services:author_reply_sent', 'Maklum balas anda telah dihantar kepada JPP'));
      setAuthorReplyModalOpen(false);
      setAuthorReplyText('');
      fetchConfessions(0, true);

      sendNotificationToKebajikanExco({
        title: t('services:notif_user_reply_title', '💬 Balasan Pengguna PolySuara'),
        message: t('services:notif_user_reply_msg', 'Pengguna telah membalas maklum balas rasmi JPP.'),
        type: 'INFO',
        module: 'KEBAJIKAN',
        link: '/jpp/polyservices'
      }).catch(console.error);
    } catch (e) {
      toast.error(t('services:author_reply_failed', 'Gagal menghantar balas'));
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
          backgroundColor: '#061714', 
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
        toast.error(t('services:export_whisper_failed', 'Gagal mengeksport luahan.'));
      } finally {
        setShareLoadingId(null);
        setActiveExportId(null);
      }
    }, 100);
  };
  // (state moved to top of component)

  const submitReport = async () => {
    if (!reportTargetId || reportReason.trim().length < 3) {
      toast.error(t('services:invalid_report_reason', 'Sebab laporan tidak sah.'));
      return;
    }
    setIsReporting(true);
    try {
      if (reportTargetType === 'COMMENT') {
        const { data: justHidden, error } = await supabase.rpc('report_polysuara_comment', {
          p_comment_id: reportTargetId,
          p_reason: reportReason.trim(),
        });
        if (error) throw error;
        toast.success(t('services:comment_reported', 'Ulasan dilaporkan.'));
        if (justHidden) {
          setComments(prev => prev.filter(c => c.id !== reportTargetId));
          toast(t('services:comment_hidden_for_review', 'Ulasan disembunyikan untuk semakan.'), { icon: '🚨' });
        }
      } else {
        const { data, error } = await supabase.rpc('submit_polyservices_report', {
          p_target_id: reportTargetId,
          p_target_type: 'SUARA',
          p_reason: reportReason.trim()
        });
        if (error) throw error;
        toast.success(t('services:report_submitted', 'Laporan telah dihantar'));
        if (data?.auto_hidden) {
          toast.success(t('services:confession_hidden_for_review', 'Confession ini telah disembunyikan untuk semakan.'));
          setConfessions(prev => prev.filter(c => c.id !== reportTargetId));
        }

        sendNotificationToKebajikanExco({
          title: t('services:notif_new_report_title', '⚠️ Laporan PolySuara Baru'),
          message: t('services:notif_new_report_msg', 'Terdapat satu luahan baru yang dilaporkan dan memerlukan semakan moderasi.'),
          type: 'WARNING',
          module: 'KEBAJIKAN',
          link: '/jpp/polyservices'
        }).catch(console.error);
      }
      setReportModalOpen(false);
      setReportReason('');
      setReportTargetId(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || t('services:report_failed', 'Gagal menghantar laporan'));
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
        .select('id, confession_id, parent_id, user_id, content, codename, is_jpp_official, is_sensitive, is_hidden_by_community, is_deleted_by_moderator, image_url, upvotes, downvotes, reports_count, created_at')
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
      toast.error(t('services:comments_load_failed', 'Gagal memuatkan ulasan.'));
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
        .select('id, confession_id, parent_id, user_id, content, codename, is_jpp_official, is_sensitive, is_hidden_by_community, is_deleted_by_moderator, image_url, upvotes, downvotes, reports_count, created_at')
        .single();

      if (error) throw error;

      toast.success(parentId ? t('services:reply_sent', 'Balasan dihantar!') : t('services:comment_posted', 'Ulasan dikongsi!'));
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
      toast.error(t('services:comment_failed', 'Gagal menghantar ulasan.'));
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
        toast(t('services:comment_hidden_by_community', 'Ulasan disembunyikan oleh komuniti'), { icon: '🚨' });
      }
    } catch (err) {
      console.error('[Comment Vote Error]', err);
      toast.error(t('services:process_vote_failed', 'Gagal memproses undian.'));
      if (activeConfessionForComments) fetchComments(activeConfessionForComments.id);
    }
  };

  const handleReportComment = (commentId: string) => {
    setReportTargetType('COMMENT');
    setReportTargetId(commentId);
    setReportReason('');
    setReportModalOpen(true);
  };

  const handleDeleteComment = (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    const isCommentAuthor = Boolean(profile?.id && comment.user_id === profile.id);
    if (!isCommentAuthor || !isWithin1Hour(comment.created_at)) {
      toast.error(t('services:delete_time_limit', 'Hanya boleh dipadam dalam tempoh 1 jam selepas diterbitkan.'));
      return;
    }

    setConfirmDialog({
      open: true,
      title: t('services:delete_comment', 'Padam Ulasan'),
      description: t('services:delete_comment_confirm', 'Adakah anda pasti ingin memadamkan ulasan ini?'),
      confirmLabel: t('services:suara_confirmed_delete_action', 'Ya, Padam'),
      variant: 'danger',
      action: async () => {
        // Optimistically update local state: mark is_deleted_by_author = true and content to '[deleted]'
        setComments(prev => prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              content: '[deleted]',
              is_deleted_by_author: true,
            };
          }
          return c;
        }));

        toast.success(t('services:comment_deleted_success', 'Ulasan telah dipadamkan.'));

        try {
          const { error } = await supabase
            .from('polysuara_comments')
            .update({ content: '[deleted]' })
            .eq('id', commentId);

          if (error) {
            console.error('[Delete Comment DB Error]', error);
          }
        } catch (err) {
          console.error('[Delete Comment Catch Error]', err);
        }
      },
    });
  };

  const handleEscalateComment = (comment: any) => {
    setConfirmDialog({
      open: true,
      title: t('services:emergency_btn', 'Kecemasan'),
      description: t('services:emergency_escalate_confirm', 'Hantar laporan krisis/kebajikan kecemasan bagi ulasan ini ke Exco Kebajikan? Tindakan ini 100% rahsia.'),
      confirmLabel: t('services:suara_confirmed_escalate_action', 'Ya, Hantar Kecemasan'),
      variant: 'warning',
      action: async () => {
        setEscalatingCommentId(comment.id);
        try {
          const { error } = await supabase.rpc('report_polysuara_comment', {
            p_comment_id: comment.id,
            p_reason: t('services:rpc_comment_emergency_escalate_reason', '🚨 KECEMASAN/KRISIS ESKALASI: Pelajar melaporkan ulasan ini memerlukan perhatian kecemasan Exco Kebajikan.')
          });

          if (error && !error.message?.includes(t('services:already_reported_substr', 'sudah melaporkan'))) throw error;

          await sendNotificationToKebajikanExco({
            title: t('services:notif_comment_emergency_title', '🚨 Kecemasan Ulasan PolySuara'),
            message: t('services:notif_comment_emergency_msg', 'Pelajar melaporkan ulasan ("{{snippet}}...") memerlukan tindakan kebajikan segera.', {
              snippet: comment.content.substring(0, 30)
            }),
            type: 'ALERT',
            module: 'KEBAJIKAN',
            link: '/jpp/polyservices'
          });

          toast.success(t('services:welfare_escalated_success', 'Bantuan Kebajikan telah disegerakan! Exco Kebajikan telah dimaklumkan secara sulit.'), { duration: 5000 });
        } catch (err) {
          console.error('[Escalate Comment Error]', err);
          toast.error(t('services:emergency_escalation_failed', 'Gagal menghantar eskalasi kecemasan.'));
        } finally {
          setEscalatingCommentId(null);
        }
      },
    });
  };

  const renderCommentThread = (comment: any, depth = 1, isBestAnswer = false): React.ReactNode => {
    const childReplies = comments
      .filter(r => r.parent_id === comment.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const persona = getFriendlyAnonName(comment.codename);
    const isOP = Boolean(comment.codename?.includes('[Penulis]'));
    const displayName = comment.is_jpp_official ? t('services:jpp_official_badge', 'JPP RASMI') : persona.displayName;
    const isCommUpvoted = commentUpvotes.has(comment.id);
    const cleanCommContent = cleanConfessionText(comment.content);
    const isCommentAuthor = Boolean(profile?.id && comment.user_id === profile.id);
    const isCommentDeletedByAuthor = Boolean(comment.is_deleted_by_author || comment.content === '[deleted]');
    const canDeleteComment = isCommentAuthor && !isCommentDeletedByAuthor && isWithin1Hour(comment.created_at);

    return (
      <div
        key={comment.id}
        className={cn(
          "border-b border-[#B8E4DC]/50 dark:border-[#252B35] py-3.5 px-4 transition-colors",
          isBestAnswer && "bg-[#EBF7F4]/70 dark:bg-[#1B2028]/50",
          depth > 1 && "border-b-0 py-1.5 px-0 bg-transparent dark:bg-transparent"
        )}
      >
        {isBestAnswer && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0F766E] text-white dark:bg-[#2DD4BF] dark:text-[#090B0E]">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>{t('services:suara_best_answer_badge', 'Jawapan Paling Membantu')}</span>
          </div>
        )}
        <div className="flex items-start gap-2.5">
          {/* Persona Avatar Squircle */}
          <div
            className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-xs select-none",
              comment.is_jpp_official
                ? "bg-[#EBF7F4] text-[#0F766E] dark:bg-[#1B2028] dark:text-[#2DD4BF]"
                : persona.bgClass
            )}
          >
            {comment.is_jpp_official ? '🛡️' : persona.emoji}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header: Name, Badges, Dot, Relative Time */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn(
                  "text-xs sm:text-sm font-bold flex items-center gap-1",
                  comment.is_jpp_official ? "text-[#0F766E] dark:text-[#2DD4BF]" : "text-[#0B2420] dark:text-[#F1F5F9]"
                )}>
                  {displayName}
                </span>
                {isOP && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#0F766E]/25 flex items-center gap-1">
                    <UserCircle2 className="w-2.5 h-2.5" />
                    OP
                  </span>
                )}
                {comment.is_jpp_official && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" />
                    {t('services:jpp_official_badge', 'JPP RASMI')}
                  </span>
                )}
                <span className="text-[10px] text-[#B8E4DC] dark:text-[#252B35] select-none">•</span>
                <span className="text-[11px] text-[#3B635C] dark:text-[#94A0B2]">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ms })}
                </span>
              </div>
            </div>

            {/* Comment Content (With Sensitive Content Blur) */}
            {comment.is_deleted_by_moderator ? (
              <div className="bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/70 dark:border-[#252B35] p-3 rounded-xl flex items-center gap-2 text-xs text-[#3B635C] dark:text-[#94A0B2] italic select-none">
                <ShieldAlert className="w-4 h-4 text-[#3B635C] dark:text-[#94A0B2] shrink-0" />
                {cleanCommContent}
              </div>
            ) : isCommentDeletedByAuthor ? (
              <div className="py-1">
                <span className="text-[#3B635C] dark:text-[#94A0B2] italic text-xs flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5 opacity-70" /> {t('services:author_deleted_comment', '{{author}} telah memadamkan ruangan ini', { author: displayName }).replace('{{author}}', displayName)}
                </span>
              </div>
            ) : comment.is_sensitive ? (
              <SensitiveCommentContent content={cleanCommContent} />
            ) : (
              <p className="leading-relaxed text-sm text-[#0B2420] dark:text-[#F1F5F9] break-words">{cleanCommContent}</p>
            )}

            {comment.image_url && !comment.is_deleted_by_moderator && !isCommentDeletedByAuthor && (
              <div className="mt-2 rounded-xl overflow-hidden border border-[#B8E4DC]/80 dark:border-[#252B35] bg-[#EBF7F4] dark:bg-[#0E1116] max-w-xs">
                <img
                  src={comment.image_url}
                  alt={t('services:attachment_proof', 'Bukti Lampiran')}
                  className="w-full max-h-[160px] object-contain cursor-zoom-in hover:scale-[1.02] transition-transform"
                  onClick={() =>
                    setLightboxPost({
                      id: comment.id,
                      content: comment.content,
                      codename: comment.codename,
                      category: activeConfessionForComments?.category || 'UMUM',
                      created_at: comment.created_at,
                      image_url: comment.image_url,
                    })
                  }
                />
              </div>
            )}

            {/* Threads-Style Micro-Actions */}
            {isCommentDeletedByAuthor ? (
              <div className="flex items-center gap-3 mt-1.5 pt-0.5 text-xs text-[#3B635C]/50 dark:text-[#94A0B2]/40">
                <button
                  type="button"
                  disabled
                  className="text-[11px] font-semibold text-[#3B635C]/40 dark:text-[#94A0B2]/40 cursor-not-allowed flex items-center gap-1 select-none"
                  aria-label={t('services:reply_comment', 'Balas komen')}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{t('services:reply', 'Balas')}</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-1 text-[11px] font-medium text-[#3B635C]/40 dark:text-[#94A0B2]/40 cursor-not-allowed select-none"
                  aria-label={t('services:like_comment', 'Suka ulasan')}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>0</span>
                </button>
              </div>
            ) : !comment.is_deleted_by_moderator ? (
              <div className="flex items-center justify-between mt-2 pt-0.5 text-xs">
                {/* Left: Subtle Balas button & optional Padam Ulasan button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingToCommentId(comment.id);
                      setReplyCommentText(`@${displayName} `);
                    }}
                    className="text-[11px] font-semibold text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0F766E] dark:hover:text-[#2DD4BF] px-2 py-0.5 rounded-full hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors flex items-center gap-1 cursor-pointer"
                    aria-label={t('services:reply_comment', 'Balas komen')}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{t('services:reply', 'Balas')}</span>
                  </button>

                  {canDeleteComment && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                      title={t('services:delete_comment', 'Padam Ulasan')}
                      aria-label={t('services:delete_comment', 'Padam Ulasan')}
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>{t('services:delete_comment', 'Padam Ulasan')}</span>
                    </button>
                  )}
                </div>

                {/* Right: Micro-Heart & Discrete ··· Action Trigger */}
                <div className="flex items-center gap-1.5 relative">
                  <button
                    type="button"
                    onClick={() => handleCommentVote(comment.id, 'UPVOTE')}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer",
                      isCommUpvoted
                        ? "text-[#0F766E] dark:text-[#2DD4BF] font-semibold"
                        : "text-[#3B635C] hover:text-[#0F766E] dark:text-[#94A0B2] dark:hover:text-[#2DD4BF]"
                    )}
                    aria-label={t('services:like_comment', 'Suka ulasan')}
                  >
                    <Heart className={cn("w-3.5 h-3.5", isCommUpvoted && "fill-current")} />
                    <span>{comment.upvotes || 0}</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCommentMenuOpenId(commentMenuOpenId === comment.id ? null : comment.id)}
                      className="text-[#3B635C] hover:text-[#0B2420] dark:text-[#94A0B2] dark:hover:text-[#F1F5F9] p-1 rounded-full hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors font-bold tracking-widest text-xs flex items-center justify-center w-7 h-7 leading-none cursor-pointer"
                      title={t('services:comment_options', 'Pilihan ulasan')}
                      aria-label={t('services:comment_options', 'Pilihan ulasan')}
                    >
                      ···
                    </button>

                    {commentMenuOpenId === comment.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setCommentMenuOpenId(null)}
                        />
                        <div className="absolute right-0 bottom-full mb-1 z-50 w-44 bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-xl shadow-lg p-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                          {canDeleteComment && (
                            <button
                              type="button"
                              onClick={() => {
                                setCommentMenuOpenId(null);
                                handleDeleteComment(comment.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                              title={t('services:delete_comment', 'Padam Ulasan')}
                              aria-label={t('services:delete_comment', 'Padam Ulasan')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t('services:delete_comment', 'Padam Ulasan')}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setCommentMenuOpenId(null);
                              handleEscalateComment(comment);
                            }}
                            disabled={escalatingCommentId === comment.id}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                            title={t('services:welfare_escalation_tooltip', 'Eskalasi kecemasan ke Kebajikan (Rahsia)')}
                            aria-label={t('services:welfare_escalation', 'Eskalasi kecemasan ke Kebajikan')}
                          >
                            {escalatingCommentId === comment.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            ) : (
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span>{t('services:welfare_assistance', 'Bantuan Kebajikan')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCommentMenuOpenId(null);
                              handleReportComment(comment.id);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                            title={t('services:report_comment_tooltip', 'Lapor ulasan')}
                            aria-label={t('services:report_comment_tooltip', 'Lapor ulasan')}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{t('services:report_comment', 'Lapor Ulasan')}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Reply Input Form */}
            {replyingToCommentId === comment.id && !isCommentDeletedByAuthor && (
              <form onSubmit={(e) => handleAddComment(e, comment.id)} className="mt-2.5 p-2 bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
                <input
                  type="text"
                  placeholder={t('services:reply_to_user', 'Balas kepada {{name}}...', { name: displayName })}
                  value={replyCommentText}
                  onChange={(e) => setReplyCommentText(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-1 text-xs text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/70 dark:placeholder:text-[#94A0B2]/60 focus:outline-none"
                  maxLength={300}
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={!replyCommentText.trim() || submittingComment}
                  className="bg-[#0F766E] hover:bg-[#0D9488] dark:bg-[#2DD4BF] disabled:bg-[#EBF7F4] dark:disabled:bg-[#1B2028] text-white dark:text-[#090B0E] disabled:text-[#3B635C]/50 dark:disabled:text-[#94A0B2]/40 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                >
                  {submittingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {t('services:reply', 'Balas')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingToCommentId(null);
                    setReplyCommentText('');
                  }}
                  className="text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] px-2 py-1 text-xs font-bold transition-colors shrink-0 cursor-pointer"
                >
                  {t('common:cancel', 'Batal')}
                </button>
              </form>
            )}

            {/* Hierarchical 4-Depth Nested Replies */}
            {childReplies.length > 0 && (
              <div className="border-l-2 border-[#B8E4DC] dark:border-[#252B35] pl-3 ml-2 mt-2 space-y-2.5">
                {childReplies.map(reply => renderCommentThread(reply, Math.min(depth + 1, 4)))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const categoryOptions = useMemo(() => [
    { key: 'SEMUA', label: t('suara_category_all', 'Semua') },
    { key: 'UMUM', label: t('services:suara_category_umum', 'Umum') },
    { key: 'AKADEMIK', label: t('services:suara_category_akademik', 'Akademik') },
    { key: 'FASILITI', label: t('services:fasiliti_label', 'Fasiliti') },
    { key: 'KAMSIS', label: 'Kamsis' },
    { key: 'KAUNSELING', label: t('services:kaunseling_label', 'Kaunseling') },
  ], [t]);

  const displayedConfessions = useMemo(() => {
    const queryLower = debouncedSearch.trim().toLowerCase();
    return confessions.filter((c) => {
      const catOk = activeCategory === 'SEMUA' || c.category === activeCategory;
      const tagOk = !activeTag || (c.hashtags && c.hashtags.includes(activeTag));
      const formatOk = activeFormat === 'ALL' || detectPostIntent(c) === activeFormat;
      const focusOk =
        !focusMode ||
        c.category === 'AKADEMIK' ||
        c.category === 'FASILITI' ||
        Boolean(c.official_reply) ||
        Boolean(c.is_pinned);
      const searchOk =
        !queryLower ||
        cleanConfessionText(c.content || '').toLowerCase().includes(queryLower) ||
        (c.codename || '').toLowerCase().includes(queryLower);
      const modeOk =
        sortBy === 'JPP_REPLIED'
          ? Boolean(c.official_reply)
          : sortBy === 'MINE'
          ? myConfessions.has(c.id) || Boolean(profile?.id && c.author_id === profile.id)
          : sortBy === 'BOOKMARKS'
          ? bookmarkedIds.has(c.id)
          : true;
      return catOk && tagOk && formatOk && focusOk && searchOk && modeOk;
    });
  }, [
    confessions,
    activeCategory,
    activeTag,
    activeFormat,
    focusMode,
    debouncedSearch,
    sortBy,
    myConfessions,
    bookmarkedIds,
    profile?.id,
  ]);

  const jppImpactSummary = useMemo(() => {
    if (campusImpactStats) {
      return {
        resolvedCount: campusImpactStats.resolvedCount,
        acknowledgedCount: campusImpactStats.inActionCount,
        jppRepliedCount: campusImpactStats.jppRepliedCount,
        recentActionItems: campusImpactStats.recentActionItems,
      };
    }
    const resolved = confessions.filter((c) => c.status === 'RESOLVED');
    const inAction = confessions.filter(
      (c) => c.status === 'ACKNOWLEDGED' || c.status === 'INVESTIGATING'
    );
    const replied = confessions.filter((c) => Boolean(c.official_reply));
    const highlights = confessions
      .filter(
        (c) =>
          Boolean(c.official_reply) ||
          ['RESOLVED', 'INVESTIGATING', 'ACKNOWLEDGED', 'FACT_CHECK', 'OFFICIAL_NOTE'].includes(
            (c.status || '').toUpperCase()
          )
      )
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        content: cleanConfessionText(c.content || ''),
        status: c.status || 'OFFICIAL_NOTE',
        category: c.category || 'UMUM',
      }));
    return {
      resolvedCount: resolved.length,
      acknowledgedCount: inAction.length,
      jppRepliedCount: replied.length,
      recentActionItems: highlights,
    };
  }, [campusImpactStats, confessions]);

  const empathyCheck = useMemo(() => checkEmpathyNudge(newContent), [newContent]);

  const handleCopyPostLink = async (confessionId: string) => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/polysuara?post=${confessionId}`
        : `/polysuara?post=${confessionId}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      toast.success(t('services:suara_link_copied', 'Pautan PolySuara disalin!'));
    } catch {
      toast.success(t('services:suara_link_copied', 'Pautan PolySuara disalin!'));
    }
  };

  const isActiveQna = Boolean(
    activeConfessionForComments && detectPostIntent(activeConfessionForComments) === 'QNA'
  );

  const sortedRootComments = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id);
    const sorted = [...roots].sort((a, b) => {
      if (commentSortBy === 'TOP') {
        const netA = (a.upvotes || 0) - (a.downvotes || 0);
        const netB = (b.upvotes || 0) - (b.downvotes || 0);
        if (netA !== netB) return netB - netA;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    if (!isActiveQna) return { list: sorted, bestId: null as string | null };
    const topHelpful = [...roots]
      .filter((c) => c.content !== '[deleted]' && !c.is_deleted_by_moderator && (c.upvotes || 0) > 0)
      .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))[0];
    if (!topHelpful) return { list: sorted, bestId: null as string | null };
    return {
      list: [topHelpful, ...sorted.filter((c) => c.id !== topHelpful.id)],
      bestId: topHelpful.id as string,
    };
  }, [comments, commentSortBy, isActiveQna]);

  return (
    <div className="min-h-[100dvh] bg-[#F6FBF9] dark:bg-[#090B0E] text-[#0B2420] dark:text-[#F1F5F9] pb-36 md:pb-32 relative overflow-x-clip transition-colors duration-200">
      {/* Mineral Teal Opaque Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#F6FBF9] dark:bg-[#090B0E] border-b border-[#B8E4DC]/80 dark:border-[#252B35] pt-[var(--sat,env(safe-area-inset-top,0px))]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/portal')}
              aria-label={t('common:back', 'Kembali')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] flex items-center justify-center transition-colors text-[#0B2420] dark:text-[#F1F5F9] shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] flex items-center justify-center shrink-0">
                <Ghost className="w-4 h-4" />
              </div>
              <span className="font-black text-base tracking-tight whitespace-nowrap">
                Poly<span className="text-[#0F766E] dark:text-[#2DD4BF]">Suara</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              disabled={notifToggleLoading}
              onClick={async () => {
                if (!profile?.id || notifToggleLoading) return;
                const next = !polySuaraNotif;
                setNotifToggleLoading(true);
                try {
                  if (next) {
                    const { error: delErr } = await supabase
                      .from('polysuara_notif_optout')
                      .delete()
                      .eq('user_id', profile.id);
                    if (delErr) throw delErr;
                    toast.success(t('services:notifications_enabled', 'Notifikasi PolySuara diaktifkan.'));
                    if (!isSubscribed) requestPermission();
                  } else {
                    const { error: upsertErr } = await supabase
                      .from('polysuara_notif_optout')
                      .upsert({ user_id: profile.id }, { onConflict: 'user_id', ignoreDuplicates: true });
                    if (upsertErr) throw upsertErr;
                    toast.success(t('services:notifications_disabled', 'Notifikasi PolySuara ditutup.'));
                  }
                  setPolySuaraNotif(next);
                } catch (err: any) {
                  console.error('[PolySuara Notif Toggle]', err);
                  toast.error(t('services:notifications_failed', 'Gagal menukar tetapan notifikasi: {{error}}', { error: err?.message ?? t('common:try_again', 'Cuba lagi.') }));
                } finally {
                  setNotifToggleLoading(false);
                }
              }}
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer",
                notifToggleLoading && "opacity-50 cursor-wait",
                polySuaraNotif
                  ? "bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#0F766E]/25 dark:border-[#2DD4BF]/30"
                  : "bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2]"
              )}
              title={polySuaraNotif ? t('services:notifications_active', 'Notifikasi Aktif') : t('services:enable_notifications', 'Aktifkan Notifikasi')}
            >
              {polySuaraNotif ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
            <span className="hidden sm:inline-flex text-xs font-bold text-[#0F766E] dark:text-[#2DD4BF] bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] px-3 py-1.5 rounded-full items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Anon Mode</span>
            </span>
          </div>
        </div>
      </header>

      {/* X/Threads-Inspired Adaptive Mineral Teal Shell (2-col on lg, 3-col on xl) */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 sm:pt-6 relative z-10 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <PolySuaraLeftRail
            sortBy={sortBy}
            onSelectSort={(mode) => setSortBy(mode)}
            activeCategory={activeCategory}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              setActiveTag(null);
            }}
            activeFormat={activeFormat}
            onSelectFormat={(fmt) => setActiveFormat(fmt)}
            focusMode={focusMode}
            onToggleFocusMode={() => setFocusMode((prev) => !prev)}
            onOpenCompose={() => setComposeModalOpen(true)}
            jppRepliedCount={jppImpactSummary.jppRepliedCount}
            myCount={myConfessions.size}
            bookmarkCount={bookmarkedIds.size}
            categoryOptions={categoryOptions}
          />

          <main className="lg:col-span-6 min-w-0">
            {/* Hero Title Header (desktop only — avoids redundant chrome above fold on mobile) */}
            <div className="hidden lg:flex mb-4 flex-col">
              <div className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] uppercase tracking-wider mb-1">
                {t('services:moderated_community', 'Komuniti Mahasiswa Politeknik Terkawal')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B2420] dark:text-[#F1F5F9] flex items-center gap-2 tracking-tight">
                <span>
                  Poly<span className="text-[#0F766E] dark:text-[#2DD4BF]">Suara</span>
                </span>
                <Ghost className="w-6 h-6 sm:w-7 sm:h-7 text-[#0F766E] dark:text-[#2DD4BF]" />
              </h1>
              <p className="text-xs sm:text-sm text-[#3B635C] dark:text-[#94A0B2] mt-1 font-medium">
                {t('services:polysuara_title', 'PolySuara: Suara Siswa & Forum Wacana')} • {t('services:safe_space_subtitle', 'Ruang selamat untuk meluahkan perasaan. 100% Rahsia.')}
              </p>
            </div>

            {!moduleEnabled ? (
              <div className="bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-[2rem] p-14 text-center flex flex-col items-center mt-6 mb-16">
                <div className="w-16 h-16 bg-[#EBF7F4] dark:bg-[#1B2028] rounded-full flex items-center justify-center mb-5 border border-[#B8E4DC] dark:border-[#252B35]">
                  <Shield className="w-8 h-8 text-[#0F766E] dark:text-[#2DD4BF]" />
                </div>
                <h3 className="text-xl font-black text-[#0B2420] dark:text-[#F1F5F9] mb-2">
                  {t('services:polysuara_module_closed_title', 'Modul Ditutup Sementara')}
                </h3>
                <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] max-w-md">
                  {t('services:polysuara_maintenance_notice', 'Modul PolySuara sedang ditutup sementara oleh pihak Exco Kebajikan. Sila kembali semula nanti.')}
                </p>
              </div>
            ) : (
              <>
                {/* Search Bar for < 1024px (lg+) where RightRail handles desktop search */}
                <div className="lg:hidden mb-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#3B635C] dark:text-[#94A0B2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('services:suara_search_placeholder', 'Cari luahan, lokasi atau #hashtag...')}
                      className="w-full h-10 pl-10 pr-4 rounded-full bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] text-xs text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/70 dark:placeholder:text-[#94A0B2]/60 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/35"
                    />
                  </div>
                </div>

                {/* Quick-compose capsule */}
                <div
                  onClick={() => setComposeModalOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setComposeModalOpen(true);
                    }
                  }}
                  className="bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] hover:border-[#0F766E]/50 dark:hover:border-[#2DD4BF]/50 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 mb-3 sm:mb-4 shadow-xs flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer group transition-colors"
                  role="button"
                  tabIndex={0}
                  aria-label={t('services:write_new_confession_aria', 'Tulis luahan kampus baharu')}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm text-[#3B635C] dark:text-[#94A0B2] group-hover:text-[#0B2420] dark:group-hover:text-[#F1F5F9] font-medium truncate">
                      <span className="sm:hidden">{t('services:suara_quick_compose_short', 'Ada luahan kampus? Kongsi rahsia...')}</span>
                      <span className="hidden sm:inline">{t('services:suara_quick_compose_placeholder', 'Ada luahan atau rahsia kampus? Kongsi secara rahsia...')}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-white dark:text-[#090B0E] bg-[#0F766E] dark:bg-[#2DD4BF] px-3 sm:px-3.5 py-1.5 rounded-full inline-flex items-center gap-1 group-hover:opacity-90 transition-opacity whitespace-nowrap">
                      <span className="sm:hidden">{t('services:suara_quick_cta_short', 'Luah')}</span>
                      <span className="hidden sm:inline">{t('suara_post_confession_btn', 'Luahkan')}</span>
                    </span>
                  </div>
                </div>

                {/* New Whispers Pill (throttled visibilitychange refresh) */}
                {hasNewWhispers && (
                  <div className="flex justify-center mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setHasNewWhispers(false);
                        fetchConfessions(0, true);
                        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] text-xs font-bold shadow-md cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>{t('services:suara_new_whispers_pill', 'Muat semula suapan baharu')}</span>
                    </button>
                  </div>
                )}

                {/* X / Threads Clean 3-Tab Underline Navigation + Saluran & Tapis Drawer Trigger */}
                <div className="flex items-center justify-between gap-1.5 border-b border-[#B8E4DC]/80 dark:border-[#252B35] mb-3 sm:mb-4">
                  <div className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto scrollbar-none min-w-0">
                    {([
                      { id: 'LATEST', label: t('suara_sort_newest', 'Terkini'), icon: Clock },
                      { id: 'TRENDING', label: t('services:suara_sort_trending', 'Hangat'), icon: Flame },
                      { id: 'JPP_REPLIED', label: t('services:suara_tab_jpp_replied', 'Dijawab JPP'), icon: ShieldCheck },
                    ] as const).map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = sortBy === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSortBy(tab.id)}
                          className={cn(
                            'relative py-2.5 sm:py-3 px-2 sm:px-3.5 text-[11px] sm:text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0',
                            isActive
                              ? 'text-[#0F766E] dark:text-[#2DD4BF]'
                              : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
                          )}
                        >
                          <TabIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{tab.label}</span>
                          {isActive && (
                            <span className="absolute bottom-0 inset-x-1.5 sm:inset-x-2 h-[3px] rounded-full bg-[#0F766E] dark:bg-[#2DD4BF]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(true)}
                    className="lg:hidden inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 mb-1 rounded-full text-xs font-semibold bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] shrink-0 cursor-pointer hover:border-[#0F766E]/50"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" />
                    <span className="hidden min-[420px]:inline">{t('services:suara_channels_filters_btn', 'Saluran & Tapis')}</span>
                    <span className="min-[420px]:hidden">{t('services:suara_filter_short', i18n?.language?.startsWith('en') ? 'Filters' : 'Tapis')}</span>
                    {(activeCategory !== 'SEMUA' || activeFormat !== 'ALL' || focusMode || activeTag || sortBy === 'MINE' || sortBy === 'BOOKMARKS') && (
                      <span className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF]" />
                    )}
                  </button>
                </div>

                {/* Active secondary filter indicator (single clean dismissible strip) */}
                {(activeCategory !== 'SEMUA' || activeFormat !== 'ALL' || focusMode || activeTag || sortBy === 'MINE' || sortBy === 'BOOKMARKS') && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {activeCategory !== 'SEMUA' && (
                      <button
                        type="button"
                        onClick={() => setActiveCategory('SEMUA')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0F766E] text-white dark:bg-[#2DD4BF] dark:text-[#090B0E] cursor-pointer"
                      >
                        <span>{categoryOptions.find((c) => c.key === activeCategory)?.label || activeCategory}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {activeFormat !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setActiveFormat('ALL')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] cursor-pointer"
                      >
                        <span>{activeFormat}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {focusMode && (
                      <button
                        type="button"
                        onClick={() => setFocusMode(false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] cursor-pointer"
                      >
                        <Focus className="w-3 h-3" />
                        <span>{t('services:suara_focus_mode_title', 'Mod Fokus')}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {activeTag && (
                      <button
                        type="button"
                        onClick={() => setActiveTag(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0F766E] text-white dark:bg-[#2DD4BF] dark:text-[#090B0E] cursor-pointer"
                      >
                        <span>{activeTag.startsWith('#') ? activeTag : `#${activeTag}`}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {(sortBy === 'MINE' || sortBy === 'BOOKMARKS') && (
                      <button
                        type="button"
                        onClick={() => setSortBy('LATEST')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] cursor-pointer"
                      >
                        <span>
                          {sortBy === 'MINE'
                            ? t('services:suara_tab_my_voice', 'Suara Saya')
                            : t('services:suara_tab_saved', 'Disimpan')}
                        </span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Safe Space Support Banner for KAUNSELING */}
                {activeCategory === 'KAUNSELING' && (
                  <div className="mb-4 rounded-3xl bg-[#EBF7F4] dark:bg-[#13171D] border border-[#0F766E]/30 dark:border-[#2DD4BF]/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] flex items-center justify-center shrink-0">
                        <HeartHandshake className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xs sm:text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                          {t('services:suara_counseling_banner_title', 'Ruang Selamat & Sokongan Kaunseling POLISAS')}
                        </h3>
                        <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                          {t('services:suara_counseling_banner_desc', 'Jika anda sedang melalui tekanan emosi atau perlukan bantuan sulit segera, pasukan e-Kebajikan & kaunseling bersedia mendengar.')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/kebajikan/buat-aduan')}
                      className="px-3.5 py-2 rounded-xl bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] text-xs font-bold shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      {t('services:suara_counseling_banner_cta', 'Hubungi Bantuan Sulit')}
                    </button>
                  </div>
                )}

                {/* Compose Modal */}
                {typeof document !== 'undefined' && createPortal(
                  <AnimatePresence>
                    {composeModalOpen && (
                      <>
                        <motion.div
                          key="compose-backdrop"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setComposeModalOpen(false)}
                          className="fixed inset-0 bg-[#090B0E]/75 z-[99990]"
                        />
                        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                          <motion.div
                            key="compose-modal"
                            initial={{ opacity: 0, y: 24, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.96 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="pointer-events-auto relative w-full sm:max-w-lg bg-white dark:bg-[#13171D] border-t sm:border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-t-[2.5rem] sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto pb-28 sm:pb-6 text-[#0B2420] dark:text-[#F1F5F9]"
                          >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-[#B8E4DC]/60 dark:border-[#252B35] mb-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center">
                                  <Shield className="w-4 h-4" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-base">
                                    {t('services:write_secret_whisper', 'Tulis Luahan Rahsia')}
                                  </h3>
                                  <span className="text-[11px] font-bold text-[#0F766E] dark:text-[#2DD4BF] bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] px-2 py-0.5 rounded-full">
                                    {t('services:hundred_percent_secret', '100% Rahsia')}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setComposeModalOpen(false)}
                                className="p-1.5 rounded-full text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors cursor-pointer"
                                aria-label={t('common:close', 'Tutup')}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Intent Format Chips */}
                            <div className="mb-3 space-y-1.5">
                              <span className="text-[11px] font-semibold text-[#3B635C] dark:text-[#94A0B2] block">
                                {t('services:suara_intent_label', 'Format Kiriman')}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {([
                                  { id: 'STANDARD', label: t('services:suara_intent_standard', 'Luahan') },
                                  { id: 'QNA', label: t('services:suara_intent_qna', 'Tanya Kampus') },
                                  { id: 'SHOUTOUT', label: t('services:suara_intent_shoutout', 'Apresiasi') },
                                  { id: 'DEBATE', label: t('services:suara_intent_debate', 'Debat Setuju/Tidak') },
                                ] as const).map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleIntentSelect(item.id)}
                                    className={cn(
                                      'px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer',
                                      composeIntent === item.id
                                        ? 'bg-[#0F766E] border-[#0F766E] text-white dark:bg-[#2DD4BF] dark:border-[#2DD4BF] dark:text-[#090B0E]'
                                        : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/80 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2]'
                                    )}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {draftRestoredNotice && newContent.trim() && (
                              <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-between text-xs text-[#0F766E] dark:text-[#2DD4BF]">
                                <span>{t('services:suara_draft_restored', 'Draf terakhir anda dipulihkan')}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewContent('');
                                    setDraftRestoredNotice(false);
                                  }}
                                  className="font-bold underline cursor-pointer"
                                >
                                  {t('common:reset', 'Set Semula')}
                                </button>
                              </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handlePost}>
                              <textarea
                                autoFocus
                                value={newContent}
                                onChange={(e) => {
                                  setNewContent(e.target.value);
                                  setEmpathyConfirmed(false);
                                  setComplaintNudgeDismissed(false);
                                }}
                                placeholder={t('services:whisper_input_placeholder', 'Apa yang bermain di fikiran anda?')}
                                className="w-full bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-2xl p-4 text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/70 dark:placeholder:text-[#94A0B2]/60 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 resize-none transition-colors text-sm leading-relaxed"
                                rows={4}
                                maxLength={500}
                              />

                              {/* Layer 1: Pre-submit e-Kebajikan Complaint Nudge */}
                              {(() => {
                                const complaintNudge = detectComplaintNudge(newContent, postCategory);
                                if (!complaintNudge.triggered || complaintNudgeDismissed) return null;
                                return (
                                  <div
                                    data-testid="polysuara-complaint-nudge"
                                    className="mt-3 p-3.5 rounded-2xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#0F766E]/30 dark:border-[#2DD4BF]/30 text-xs space-y-2.5"
                                  >
                                    <div className="flex items-start gap-2">
                                      <HeartHandshake className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF] shrink-0 mt-0.5" />
                                      <div className="space-y-0.5 min-w-0">
                                        <p className="font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                                          {t('services:suara_nudge_complaint_title', 'Nampak macam aduan rasmi kampus?')}
                                        </p>
                                        <p className="text-[#3B635C] dark:text-[#94A0B2] leading-relaxed">
                                          {t(
                                            'services:suara_nudge_complaint_desc',
                                            'Aduan fasiliti, kamsis, atau kafeteria lebih cepat dipantau dengan SLA rasmi di e-Kebajikan. Draf anda akan dibawa terus ke borang.'
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const prefill = buildKebajikanPrefillState(newContent, complaintNudge);
                                          try {
                                            localStorage.removeItem(DRAFT_STORAGE_KEY);
                                          } catch {}
                                          setComposeModalOpen(false);
                                          navigate('/kebajikan/buat-aduan', { state: prefill });
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl bg-[#0F766E] hover:bg-[#0D9488] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] text-white dark:text-[#090B0E] font-bold transition-colors cursor-pointer"
                                      >
                                        {t('services:suara_nudge_switch_kebajikan_btn', 'Hantar ke e-Kebajikan')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setComplaintNudgeDismissed(true)}
                                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] font-semibold transition-colors cursor-pointer"
                                      >
                                        {t('services:suara_nudge_stay_anon_btn', 'Kekal Rahsia di PolySuara')}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Pre-submit Empathy & PII Nudge */}
                              {empathyCheck.triggered && (
                                <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                                  <div className="font-bold flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span>{t('services:suara_empathy_nudge_title', 'Semakan Privasi Sebelum Hantar')}</span>
                                  </div>
                                  <p>
                                    {empathyCheck.reasonKey === 'phone'
                                      ? t('services:suara_empathy_nudge_phone', 'Kelihatan seperti terdapat nombor telefon dalam mesej anda. Elakkan pendedahan maklumat peribadi jika tidak disengajakan.')
                                      : empathyCheck.reasonKey === 'matric'
                                      ? t('services:suara_empathy_nudge_matric', 'Kelihatan seperti nombor matrik pelajar dikesan. Pastikan identiti peribadi tidak didedahkan.')
                                      : t('services:suara_empathy_nudge_name', 'Kelihatan seperti ada nama penuh individu. Elakkan serangan peribadi supaya luahan anda tidak dipadam.')}
                                  </p>
                                </div>
                              )}

                              {imagePreview && (
                                <div className="mt-3 space-y-2">
                                  <div className="relative w-full rounded-2xl overflow-hidden border border-[#B8E4DC] dark:border-[#252B35] bg-[#F6FBF9] dark:bg-[#0E1116] group">
                                    <img
                                      src={imagePreview}
                                      alt="Preview"
                                      className="w-full max-h-60 object-contain mx-auto"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => { setSelectedFile(null); setImagePreview(null); setIsSpoilerImage(false); }}
                                      className="absolute top-2 right-2 bg-[#061714]/75 p-1.5 rounded-full text-white hover:bg-rose-500 transition-colors cursor-pointer"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <label className="inline-flex items-center gap-2 text-xs text-[#3B635C] dark:text-[#94A0B2] cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSpoilerImage}
                                      onChange={(e) => setIsSpoilerImage(e.target.checked)}
                                      className="rounded border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E]"
                                    />
                                    <span>{t('services:suara_spoiler_image_toggle', 'Kaburkan gambar (Spoiler)')}</span>
                                  </label>
                                </div>
                              )}

                              {composeIntent === 'DEBATE' ? (
                                <div className="mt-4 p-3.5 bg-[#EBF7F4] dark:bg-[#0E1116] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] text-xs text-[#0F766E] dark:text-[#2DD4BF] font-medium">
                                  {t('services:suara_debate_note', 'Undian tarik-tali Setuju lwn Tidak akan dilampirkan secara automatik.')}
                                </div>
                              ) : showPoll && (
                                <div className="mt-4 p-4 bg-[#F6FBF9] dark:bg-[#0E1116] rounded-2xl border border-[#B8E4DC]/80 dark:border-[#252B35]">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-[#3B635C] dark:text-[#94A0B2] uppercase">
                                      {t('services:poll_question', 'Undian Pendapat Mahasiswa')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setIsMultipleChoice(!isMultipleChoice)}
                                      className={cn(
                                        "text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                                        isMultipleChoice
                                          ? "bg-[#0F766E]/15 text-[#0F766E] dark:bg-[#2DD4BF]/20 dark:text-[#2DD4BF]"
                                          : "bg-[#EBF7F4] dark:bg-[#1B2028] text-[#3B635C] dark:text-[#94A0B2]"
                                      )}
                                    >
                                      {isMultipleChoice ? t('services:poll_multiple_choice', 'Pilihan Pelbagai') : t('services:poll_single_choice', 'Pilihan Tunggal')}
                                    </button>
                                  </div>
                                  {pollOptions.map((opt, idx) => (
                                    <input
                                      key={idx}
                                      placeholder={t('services:poll_option_placeholder', 'Pilihan {{num}}', { num: idx + 1 })}
                                      value={opt}
                                      onChange={(e) => {
                                        const next = [...pollOptions];
                                        next[idx] = e.target.value;
                                        setPollOptions(next);
                                      }}
                                      className="w-full bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-xl px-3 py-2 text-sm text-[#0B2420] dark:text-[#F1F5F9] mb-2 focus:outline-none focus:ring-1 focus:ring-[#0F766E]/40"
                                    />
                                  ))}
                                  {pollOptions.length < MAX_POLL_OPTIONS && (
                                    <button
                                      type="button"
                                      onClick={() => setPollOptions([...pollOptions, ''])}
                                      className="text-xs font-bold text-[#0F766E] dark:text-[#2DD4BF] hover:underline cursor-pointer"
                                    >
                                      {t('services:add_poll_option', '+ Tambah Pilihan (max {{max}})', { max: MAX_POLL_OPTIONS })}
                                    </button>
                                  )}
                                </div>
                              )}

                              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <select
                                    value={postCategory}
                                    onChange={(e) => setPostCategory(e.target.value)}
                                    className="bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#0F766E] font-medium"
                                  >
                                    {CATEGORIES.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>

                                  <label className="cursor-pointer bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] hover:border-[#0F766E]/40 text-[#0B2420] dark:text-[#F1F5F9] text-xs rounded-xl px-3 py-2 outline-none transition-colors flex items-center gap-2 font-medium">
                                    <ImageIcon className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
                                    <span>{t('services:whisper_image', 'Imej')}</span>
                                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                  </label>

                                  {composeIntent !== 'DEBATE' && (
                                    <button
                                      type="button"
                                      onClick={() => setShowPoll(!showPoll)}
                                      className={cn(
                                        "px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer border",
                                        showPoll
                                          ? "bg-[#0F766E]/15 text-[#0F766E] dark:bg-[#2DD4BF]/20 dark:text-[#2DD4BF] border-[#0F766E]/30"
                                          : "bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9]"
                                      )}
                                    >
                                      <BarChart className="w-4 h-4" />
                                      <span>{t('services:whisper_poll', 'Undian')}</span>
                                    </button>
                                  )}

                                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium ml-1 font-mono tabular-nums">
                                    {t('services:chars_remaining', '{{count}} aksara baki', { count: 500 - newContent.length })}
                                  </span>
                                </div>

                                <button
                                  type="submit"
                                  disabled={!newContent.trim() || isSubmitting}
                                  className="bg-[#0F766E] hover:bg-[#0D9488] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] disabled:bg-[#EBF7F4] dark:disabled:bg-[#1B2028] disabled:text-[#3B635C]/50 dark:disabled:text-[#94A0B2]/40 text-white dark:text-[#090B0E] px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer"
                                >
                                  {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                  <span>
                                    {empathyCheck.triggered && empathyConfirmed
                                      ? t('services:suara_empathy_send_anyway', 'Sahkan & Hantar')
                                      : t('services:share_whisper', 'Kongsi Luahan')}
                                  </span>
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        </div>
                      </>
                    )}
                  </AnimatePresence>,
                  document.body
                )}

                {trendingTags.length > 0 && (
                  <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-2">
                    <span className="text-xs font-bold text-[#3B635C] dark:text-[#94A0B2] py-1.5 flex items-center gap-1 shrink-0">
                      <Flame className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" /> Trending:
                    </span>
                    {trendingTags.map((tag, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setActiveTag(activeTag === tag.tag ? null : tag.tag); setActiveCategory('SEMUA'); }}
                        className={cn(
                          'px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                          activeTag === tag.tag
                            ? 'bg-[#0F766E] border-[#0F766E] text-white dark:bg-[#2DD4BF] dark:border-[#2DD4BF] dark:text-[#090B0E]'
                            : 'bg-white dark:bg-[#13171D] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] border-[#B8E4DC]/80 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2]'
                        )}
                      >
                        {tag.tag} ({tag.count})
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
                    {t('services:forum_discussions', 'Topik Perbincangan Pelajar')}
                  </h2>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="space-y-4 py-2">
                      <div className="flex items-center gap-2 text-[#3B635C] dark:text-[#94A0B2] px-1">
                        <Loader2 className="w-4 h-4 animate-spin text-[#0F766E] dark:text-[#2DD4BF]" />
                        <p className="text-xs sm:text-sm font-bold tracking-wide">{t('services:loading_whispers', 'Membaca minda pelajar...')}</p>
                      </div>
                      {[1, 2, 3].map((sk) => (
                        <div
                          key={sk}
                          className="bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-[2rem] p-5 space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028]" />
                            <div className="space-y-1.5 flex-1">
                              <div className="w-32 h-3.5 rounded bg-[#EBF7F4] dark:bg-[#1B2028]" />
                              <div className="w-20 h-2.5 rounded bg-[#EBF7F4] dark:bg-[#1B2028]" />
                            </div>
                          </div>
                          <div className="w-full h-3.5 rounded bg-[#EBF7F4] dark:bg-[#1B2028]" />
                          <div className="w-4/5 h-3.5 rounded bg-[#EBF7F4] dark:bg-[#1B2028]" />
                        </div>
                      ))}
                    </div>
                  ) : displayedConfessions.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-3xl">
                      <Ghost className="w-12 h-12 text-[#0F766E]/40 dark:text-[#2DD4BF]/40 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                        {t('services:no_whispers_title', 'Tiada Luahan Buat Masa Ini')}
                      </h3>
                      <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] mt-1">
                        {sortBy === 'BOOKMARKS'
                          ? t('services:suara_empty_saved', 'Belum ada kiriman yang anda simpan dalam penanda buku.')
                          : sortBy === 'MINE'
                          ? t('services:suara_empty_mine', 'Anda belum menghantar sebarang suara atau ia tiada dalam carian ini.')
                          : sortBy === 'JPP_REPLIED'
                          ? t('services:suara_empty_jpp', 'Belum ada maklum balas rasmi JPP yang sepadan dengan penapis ini.')
                          : t('services:no_whispers_subtitle', 'Jadilah yang pertama berkongsi rahsia.')}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {displayedConfessions.map((confession, index) => (
                        <React.Fragment key={confession.id}>
                          <PolySuaraConfessionCard
                            confession={confession}
                            index={index}
                            profileId={profile?.id}
                            canReplyJpp={canReplyJpp}
                            isMine={Boolean(myConfessions.has(confession.id) || (profile?.id && confession.author_id === profile.id))}
                            isBookmarked={bookmarkedIds.has(confession.id)}
                            isDownvoted={userDownvotes.has(confession.id)}
                            isSpoilerRevealed={revealedSpoilers.has(confession.id)}
                            activeTag={activeTag}
                            reactions={confessionReactions[confession.id] || []}
                            topComment={topCommentsMap[confession.id]}
                            shareLoading={shareLoadingId === confession.id}
                            onRevealSpoiler={(id) => setRevealedSpoilers((prev) => new Set(prev).add(id))}
                            onOpenMedia={(item) => setLightboxPost(item)}
                            onToggleReaction={handleToggleReaction}
                            onDownvote={handleDownvote}
                            onOpenComments={(item) => {
                              setActiveConfessionForComments(item);
                              fetchComments(item.id);
                              setCommentDrawerOpen(true);
                            }}
                            onCopyLink={handleCopyPostLink}
                            onShareImage={handleShareImage}
                            onToggleBookmark={toggleBookmark}
                            onDeleteConfession={handleDeleteConfession}
                            onOpenReport={(id) => {
                              setReportTargetType('CONFESSION');
                              setReportTargetId(id);
                              setReportModalOpen(true);
                            }}
                            onOpenJppReply={(item) => {
                              setReplyTargetId(item.id);
                              setReplyStatus(
                                item.category === 'FASILITI' || item.category === 'KAMSIS'
                                  ? 'ACKNOWLEDGED'
                                  : 'OFFICIAL_NOTE'
                              );
                              setReplyModalOpen(true);
                            }}
                            onOpenAuthorReply={(id) => {
                              setAuthorReplyTargetId(id);
                              setAuthorReplyModalOpen(true);
                            }}
                            onOpenEscalate={(item) => setEscalateTarget(item)}
                            onOpenTicket={(ticketId) => navigate(`/kebajikan/tiket/${ticketId}`)}
                            onTogglePin={handleTogglePin}
                            onSelectTag={(tag) => {
                              setActiveTag(tag);
                              setActiveCategory('SEMUA');
                            }}
                            onNavigatePolyMaps={(roomQuery) =>
                              navigate(`/polymaps?q=${encodeURIComponent(roomQuery)}`)
                            }
                          />
                        </React.Fragment>
                      ))}
                    </AnimatePresence>
                  )}

                  {/* Mobile dock spacer at bottom of main feed */}
                  <div className="h-32 md:hidden" aria-hidden="true" />

                  {/* Infinite scroll trigger */}
                  {!loading && hasMore && (
                    <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                      {loadingMore && (
                        <div className="flex items-center gap-3 text-[#3B635C] dark:text-[#94A0B2]">
                          <Loader2 className="w-5 h-5 animate-spin text-[#0F766E] dark:text-[#2DD4BF]" />
                          <span className="text-xs font-bold uppercase tracking-wider">{t('services:loading_more', 'Memuatkan lagi...')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!loading && !hasMore && confessions.length > FEED_PAGE_SIZE && (
                    <div className="text-center py-6">
                      <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-bold">{t('services:all_whispers_seen', 'Anda telah melihat semua luahan 🎉')}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>

          <PolySuaraRightRail
            resolvedCount={jppImpactSummary.resolvedCount}
            acknowledgedCount={jppImpactSummary.acknowledgedCount}
            recentActionItems={jppImpactSummary.recentActionItems}
            trendingTags={trendingTags}
            activeTag={activeTag}
            onSelectTag={(tag) => setActiveTag(tag)}
            onViewJppReplied={() => setSortBy('JPP_REPLIED')}
            onFocusConfession={(confessionId) => {
              const target = confessions.find((c) => c.id === confessionId);
              if (target) {
                setActiveConfessionForComments(target);
                fetchComments(target.id);
                setCommentDrawerOpen(true);
              }
            }}
            onNavigate={(path) => navigate(path)}
            searchQuery={searchQuery}
            onSearchChange={(val) => setSearchQuery(val)}
          />
        </div>
      </div>

      {activeExportId && confessions.find(c => c.id === activeExportId) && (
        <IGStoryExportCard 
          confession={confessions.find(c => c.id === activeExportId)} 
          elementId={`export-card-${activeExportId}`} 
        />
      )}

      {/* Report Modal (Dual Light/Dark Mineral Teal) & Split Media Viewer */}
      <PolySuaraQuickReportModal
        isOpen={reportModalOpen}
        targetType={reportTargetType}
        reason={reportReason}
        onReasonChange={setReportReason}
        isSubmitting={isReporting}
        onClose={() => {
          setReportModalOpen(false);
          setReportReason('');
          setReportTargetId(null);
        }}
        onSubmit={submitReport}
      />

      <PolySuaraMediaViewer
        imageUrl={lightboxPost?.image_url || null}
        confession={lightboxPost}
        onClose={() => setLightboxPost(null)}
        onOpenComments={(item) => {
          setActiveConfessionForComments(item);
          fetchComments(item.id);
          setCommentDrawerOpen(true);
        }}
        onToggleHeart={(id) => handleToggleReaction(id, 'heart')}
        onCopyLink={handleCopyPostLink}
      />

      <PolySuaraEscalationModal
        isOpen={Boolean(escalateTarget)}
        confession={escalateTarget}
        onClose={() => setEscalateTarget(null)}
        onEscalated={(res: PolySuaraEscalationResult) => {
          queryCache.invalidate('polysuara:');
          setConfessions((prev) =>
            prev.map((item) => {
              if (item.id !== res.confessionId) return item;
              const addition = `Aduan ini telah dieskalasi secara rasmi ke e-Kebajikan (**${res.ticket_no}**) untuk tindakan lanjut tanpa mendedahkan identiti pengarang.${res.note ? `\n\nNota JPP: ${res.note}` : ''}`;
              const nextReply = item.official_reply?.includes(res.ticket_no)
                ? item.official_reply
                : item.official_reply
                ? `${item.official_reply}\n\n---\n${addition}`
                : addition;
              return {
                ...item,
                escalated_ticket_id: res.ticket_id,
                escalated_ticket_no: res.ticket_no,
                status: 'INVESTIGATING',
                official_reply: nextReply,
                official_reply_at: new Date().toISOString(),
              };
            })
          );
          fetchImpactSummary(true);
        }}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!confirmLoading) {
            setConfirmDialog((prev) => ({ ...prev, open }));
          }
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        isLoading={confirmLoading}
        onConfirm={async () => {
          if (!confirmDialog.action) return;
          setConfirmLoading(true);
          try {
            await confirmDialog.action();
          } finally {
            setConfirmLoading(false);
          }
        }}
      />

      {/* Limit Reached Modal */}
      <AnimatePresence>
        {limitReachedModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLimitReachedModalOpen(false)}
              className="fixed inset-0 bg-[#090B0E]/75 z-[200]"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-[2rem] shadow-2xl p-8 pointer-events-auto relative overflow-hidden text-[#0B2420] dark:text-[#F1F5F9]"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0F766E] to-[#2DD4BF]" />
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-[#EBF7F4] dark:bg-[#1B2028] rounded-2xl flex items-center justify-center rotate-3 border border-[#B8E4DC] dark:border-[#252B35]">
                    <Clock className="w-8 h-8 text-[#0F766E] dark:text-[#2DD4BF] -rotate-3" />
                  </div>
                </div>
                <h3 className="text-2xl font-black mb-3 text-center tracking-tight">
                  {t('services:limit_reached_title', 'Rehat Sekejap! 🛑')}
                </h3>
                <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] mb-8 text-center leading-relaxed">
                  {t('services:limit_reached_desc', 'Anda telah mencapai had maksimum 5 luahan sejam. Kami menetapkan had ini untuk menjaga kualiti komuniti dan mengelakkan spam. Cuba lagi selepas 1 jam!')}
                </p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setLimitReachedModalOpen(false)}
                    className="w-full py-3.5 bg-[#0F766E] hover:bg-[#0D9488] text-white rounded-xl text-sm font-bold transition-colors shadow-lg cursor-pointer"
                  >
                    {t('services:i_understand', 'Baik, Saya Faham')}
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
              className="fixed inset-0 bg-[#090B0E]/75 z-[200]"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-[2rem] shadow-2xl p-6 pointer-events-auto text-[#0B2420] dark:text-[#F1F5F9]"
              >
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#0F766E] dark:text-[#2DD4BF]" />
                  {t('services:jpp_feedback', 'Maklum Balas JPP')}
                </h3>
                <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] mb-4">
                  {t('services:jpp_reply_desc', 'Berikan maklum balas rasmi dari pihak pengurusan/JPP untuk luahan ini.')}
                </p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('services:jpp_reply_placeholder', 'Taip jawapan rasmi di sini...')}
                  className="w-full bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-2xl p-4 text-sm text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/70 dark:placeholder:text-[#94A0B2]/60 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 resize-none transition-all mb-4"
                  rows={4}
                />

                <div className="mb-6">
                  <label className="text-xs font-bold text-[#3B635C] dark:text-[#94A0B2] uppercase tracking-wider mb-2 block">
                    {t('services:report_status', 'Status Laporan')}
                  </label>
                  <select
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    className="w-full bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-xl p-3 text-sm font-medium text-[#0B2420] dark:text-[#F1F5F9] outline-none focus:border-[#0F766E]"
                  >
                    <option value="OFFICIAL_NOTE">{t('services:status_official_note_opt', 'Maklum Balas Rasmi JPP (Nota Tanpa Penjejak)')}</option>
                    <option value="ACKNOWLEDGED">{t('services:status_acknowledged_full', 'Maklumat Diterima (Acknowledged)')}</option>
                    <option value="INVESTIGATING">{t('services:status_investigating_full', 'Sedang Disiasat (Investigating)')}</option>
                    <option value="RESOLVED">{t('services:status_resolved_full', 'Selesai (Resolved)')}</option>
                    <option value="FACT_CHECK">{t('services:status_fact_check_opt', 'Nota Komuniti / Semak Fakta')}</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setReplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors text-sm font-medium cursor-pointer"
                  >
                    {t('common:cancel', 'Batal')}
                  </button>
                  <button
                    type="button"
                    disabled={!replyText.trim() || isReplying}
                    onClick={submitReply}
                    className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D9488] disabled:bg-[#EBF7F4] dark:disabled:bg-[#1B2028] disabled:text-[#3B635C]/50 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {t('services:submit_reply', 'Hantar Jawapan')}
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
              className="fixed inset-0 bg-[#090B0E]/75 z-[200]"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-[2rem] shadow-2xl p-6 pointer-events-auto text-[#0B2420] dark:text-[#F1F5F9]"
              >
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <UserCircle2 className="w-5 h-5 text-[#0F766E] dark:text-[#2DD4BF]" />
                  {t('services:reply_to_jpp', 'Balas Kepada JPP')}
                </h3>
                <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] mb-4">
                  {t('services:author_reply_desc', 'Berikan maklum balas tambahan kepada wakil JPP secara rahsia.')}
                </p>
                <textarea
                  value={authorReplyText}
                  onChange={(e) => setAuthorReplyText(e.target.value)}
                  placeholder={t('services:author_reply_placeholder', 'Taip balasan anda di sini...')}
                  className="w-full bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-2xl p-4 text-sm text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/70 dark:placeholder:text-[#94A0B2]/60 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 resize-none transition-all mb-4"
                  rows={4}
                />

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setAuthorReplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors text-sm font-medium cursor-pointer"
                  >
                    {t('common:cancel', 'Batal')}
                  </button>
                  <button
                    type="button"
                    disabled={!authorReplyText.trim() || isAuthorReplying}
                    onClick={submitAuthorReply}
                    className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D9488] disabled:bg-[#EBF7F4] dark:disabled:bg-[#1B2028] disabled:text-[#3B635C]/50 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isAuthorReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {t('services:submit_author_reply', 'Hantar Balasan')}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Comments Drawer */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {commentDrawerOpen && activeConfessionForComments && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCommentDrawerOpen(false)}
                className="fixed inset-0 bg-[#090B0E]/75 z-[990]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white dark:bg-[#13171D] border-t sm:border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-t-[2.5rem] shadow-2xl z-[999] flex flex-col max-h-[85dvh] overflow-hidden pointer-events-auto pb-8 sm:pb-4 text-[#0B2420] dark:text-[#F1F5F9]"
              >
              {/* Drawer drag indicator/Header */}
              <div className="flex flex-col items-center py-3.5 border-b border-[#B8E4DC]/60 dark:border-[#252B35] shrink-0">
                <div className="w-12 h-1 bg-[#B8E4DC] dark:bg-[#252B35] rounded-full mb-3 cursor-pointer" onClick={() => setCommentDrawerOpen(false)} />
                <div className="flex items-center justify-between w-full px-5 sm:px-6">
                  <h3 className="text-base sm:text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-[#0F766E] dark:text-[#2DD4BF]" />
                    <span>{t('services:student_comments', 'Ulasan Pelajar')}</span>
                    <span className="text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2] font-mono">
                      ({comments.length})
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* Sort Toggle */}
                    <div className="flex bg-[#F6FBF9] dark:bg-[#0E1116] rounded-xl p-0.5 border border-[#B8E4DC]/80 dark:border-[#252B35]">
                      <button
                        type="button"
                        onClick={() => setCommentSortBy('LATEST')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                          commentSortBy === 'LATEST'
                            ? "bg-white dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] shadow-xs"
                            : "text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-white"
                        )}
                      >
                        {t('services:sort_latest', 'Terkini')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentSortBy('TOP')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer",
                          commentSortBy === 'TOP'
                            ? "bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]"
                            : "text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-white"
                        )}
                      >
                        {t('services:sort_top', 'Terbaik')}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCommentDrawerOpen(false)}
                      className="w-8 h-8 rounded-full bg-[#F6FBF9] dark:bg-[#0E1116] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-white flex items-center justify-center transition-colors text-xs font-bold cursor-pointer"
                      aria-label={t('services:close_comments', 'Tutup ulasan')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Confession Preview */}
              <div className="bg-[#F6FBF9] dark:bg-[#0E1116] border-b border-[#B8E4DC]/60 dark:border-[#252B35] p-4 text-xs px-5 sm:px-6 text-[#0B2420] dark:text-[#F1F5F9] shrink-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Ghost className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" />
                  <span className="font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                    {getFriendlyAnonName(activeConfessionForComments.codename).displayName}
                  </span>
                  <span className="bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC]/70 dark:border-[#252B35] text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-[#0F766E] dark:text-[#2DD4BF]">
                    {activeConfessionForComments.category}
                  </span>
                </div>
                <p className="text-[#3B635C] dark:text-[#94A0B2] italic line-clamp-2">"{cleanConfessionText(activeConfessionForComments.content)}"</p>
              </div>

              {/* Comments Scrollable Feed */}
              <div className="flex-1 overflow-y-auto">
                {commentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#3B635C] dark:text-[#94A0B2] gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#0F766E] dark:text-[#2DD4BF]" />
                    <p className="text-xs font-bold uppercase tracking-wider">{t('services:reading_comments', 'Membaca maklum balas...')}</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12 text-[#3B635C] dark:text-[#94A0B2] px-4">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9]">{t('services:no_comments_title', 'Tiada Ulasan Lagi')}</p>
                    <p className="text-xs mt-0.5">{t('services:no_comments_desc', 'Jadilah yang pertama menulis pendapat anda.')}</p>
                  </div>
                ) : (
                  <div>
                    {sortedRootComments.list.map((comment) =>
                      renderCommentThread(comment, 1, comment.id === sortedRootComments.bestId)
                    )}
                  </div>
                )}
              </div>

              {/* Comments Input Form Footer */}
              <div className="bg-white dark:bg-[#13171D] border-t border-[#B8E4DC]/60 dark:border-[#252B35] p-3 sm:p-4 shrink-0 px-4 sm:px-6">
                <form onSubmit={(e) => handleAddComment(e, null)} className="space-y-2">
                  {commentImagePreview && (
                    <div className="relative mb-2 w-16 h-16 rounded-xl overflow-hidden border border-[#B8E4DC] dark:border-[#252B35] group animate-in fade-in zoom-in duration-200">
                      <img src={commentImagePreview} alt={t('services:preview', 'Pratonton')} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setCommentFile(null); setCommentImagePreview(null); }}
                        className="absolute top-0.5 right-0.5 bg-black/60 p-1 rounded-full text-white hover:bg-rose-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Rounded-full floating capsule pill */}
                  <div className="rounded-full bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] p-1.5 flex items-center gap-2">
                    {/* Camera/Image Selector Button */}
                    <label className="cursor-pointer text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0F766E] dark:hover:text-[#2DD4BF] p-2 rounded-full hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-all flex items-center justify-center shrink-0 w-8 h-8" title={t('services:attach_image', 'Lampirkan Imej')}>
                      <ImageIcon className="w-4 h-4" />
                      <input type="file" accept="image/*" onChange={handleCommentImageSelect} className="hidden" />
                    </label>

                    <input
                      type="text"
                      placeholder={t('services:write_confidential_comment', 'Tulis ulasan sulit anda...')}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 bg-transparent px-2 py-1 text-sm text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/70 dark:placeholder:text-[#94A0B2]/60 focus:outline-none"
                      maxLength={300}
                    />

                    {/* Mineral Teal circular send button */}
                    <button
                      type="submit"
                      disabled={!newCommentText.trim() || submittingComment}
                      className="bg-[#0F766E] hover:bg-[#0D9488] disabled:bg-[#EBF7F4] dark:disabled:bg-[#1B2028] text-white disabled:text-[#3B635C]/40 dark:disabled:text-[#94A0B2]/40 w-8 h-8 rounded-full font-bold transition-all shrink-0 flex items-center justify-center shadow-xs cursor-pointer"
                      aria-label={t('services:post_comment', 'Hantar Pandangan')}
                      title={t('services:post_comment', 'Hantar Pandangan')}
                    >
                      {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Sensitive Comment Blur checkbox */}
                  <div className="flex items-center justify-between px-2 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isSensitiveComment}
                        onChange={(e) => setIsSensitiveComment(e.target.checked)}
                        className="rounded border-[#B8E4DC] dark:border-[#252B35] bg-white dark:bg-[#0E1116] text-[#0F766E] focus:ring-[#0F766E]/30"
                      />
                      <span className="text-[11px] font-bold text-[#3B635C] dark:text-[#94A0B2] group-hover:text-[#0B2420] dark:group-hover:text-[#F1F5F9] transition-colors flex items-center gap-1">
                        <EyeOff className="w-3.5 h-3.5" />
                        {t('services:mark_sensitive', 'Tanda sebagai Sensitif (Blur)')}
                      </span>
                    </label>
                    <span className="text-[11px] text-[#3B635C] dark:text-[#94A0B2] font-medium">
                      {t('services:chars_remaining_short', '{{count}} baki', { count: 300 - newCommentText.length })}
                    </span>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}

    <PolySuaraMobileDrawer
      isOpen={mobileDrawerOpen}
      onClose={() => setMobileDrawerOpen(false)}
      sortBy={sortBy}
      onSelectSort={(mode) => setSortBy(mode)}
      activeCategory={activeCategory}
      onSelectCategory={(cat) => {
        setActiveCategory(cat);
        setActiveTag(null);
      }}
      activeFormat={activeFormat}
      onSelectFormat={(fmt) => setActiveFormat(fmt)}
      focusMode={focusMode}
      onToggleFocusMode={() => setFocusMode((prev) => !prev)}
      jppRepliedCount={jppImpactSummary.jppRepliedCount}
      myCount={myConfessions.size}
      bookmarkCount={bookmarkedIds.size}
      categoryOptions={categoryOptions}
      trendingTags={trendingTags}
      activeTag={activeTag}
      onSelectTag={(tag) => setActiveTag(tag)}
    />

    {!composeModalOpen && !commentDrawerOpen && (
      <>
        <BottomNav onOpenSidebar={() => setMobileDrawerOpen(true)} />
        <FloatingAiChat />
      </>
    )}
    </div>
  );
}

function SensitiveCommentContent({ content }: { content: string }) {
  const { t } = useTranslation(['services']);
  const [revealed, setRevealed] = React.useState(false);

  if (revealed) {
    return <p className="text-xs sm:text-sm text-[#0B2420] dark:text-[#F1F5F9] leading-relaxed break-words animate-in fade-in duration-300">{content}</p>;
  }

  return (
    <div
      onClick={() => setRevealed(true)}
      className="bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] p-3.5 rounded-xl cursor-pointer hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors flex items-center gap-2 group"
    >
      <EyeOff className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF] shrink-0 group-hover:scale-105 transition-transform" />
      <span className="text-xs font-bold text-[#3B635C] dark:text-[#94A0B2] group-hover:text-[#0B2420] dark:group-hover:text-[#F1F5F9] transition-colors select-none">
        {t('services:sensitive_comment_notice', 'Ulasan ini mengandungi kandungan sensitif. Klik untuk baca.')}
      </span>
    </div>
  );
}

export default PolySuaraPage;
