import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Send, ShieldAlert, Trash2, Copy, Check, ExternalLink,
  MessageSquare, Store, Home, Shield, QrCode, Phone, ArrowLeft, Megaphone, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAiAssistant, ChatMessage, ChatContext } from '@/hooks/useAiAssistant';
import { ALL_CLUBS } from '@/types';
import { useAiSettings } from '@/contexts/AiSettingsContext';
import { useJppConfig } from '@/contexts/JppConfigContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getMalaysianNickname } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';

// ─── Storage helpers for AI Chat History ────────────────────────────────────
const STORAGE_KEY = 'nexus_chat_history_v1';
const TTL_HOURS = 24;
const MAX_PERSISTED = 20;

function loadMessages(userId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const { savedAt, userId: uid, messages } = JSON.parse(raw);
    if (uid !== userId) return [];
    const ageHours = (Date.now() - new Date(savedAt).getTime()) / 3_600_000;
    if (ageHours > TTL_HOURS) return [];
    return messages as ChatMessage[];
  } catch {
    return [];
  }
}

function saveMessages(userId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        userId,
        messages: messages.slice(-MAX_PERSISTED),
      })
    );
  } catch {}
}

function clearStoredMessages() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
}

function generateId() {
  return window.crypto.randomUUID();
}

function parseProductCard(content: string) {
  if (!content || !content.startsWith('[PRODUCT_CARD:')) return null;
  try {
    const raw = content.slice('[PRODUCT_CARD:'.length, -1);
    const [id, name, price, imageUrl] = raw.split('|');
    return { id, name, price: parseFloat(price), imageUrl };
  } catch {
    return null;
  }
}

function parseRentCard(content: string) {
  if (!content || !content.startsWith('[RENT_CARD:')) return null;
  try {
    const raw = content.slice('[RENT_CARD:'.length, -1);
    const [id, title, price, imageUrl] = raw.split('|');
    return { id, title, price: parseFloat(price), imageUrl };
  } catch {
    return null;
  }
}

function parseTicketCard(content: string) {
  if (!content || !content.startsWith('[TICKET_CARD:')) return null;
  try {
    const raw = content.slice('[TICKET_CARD:'.length, -1);
    const [id, ticketNo, title, status] = raw.split('|');
    return { id, ticketNo, title, status };
  } catch {
    return null;
  }
}

export function FloatingAiChat() {
  const { profile, user } = useAuth();
  const { allowAiChat } = useAiSettings();
  const { positionLabels, unitLabels } = useJppConfig();
  const location = useLocation();
  const navigate = useNavigate();

  // Widget Open/Close State
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Tabs: 'ai' | 'messages' | 'developer'
  const [activeTab, setActiveTab] = useState<'ai' | 'messages' | 'developer'>('messages');

  // AI Tab State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);
  const { sendChatMessage, sendKebajikanExcoMessage, isLoading: isActionLoading, isChatLoading, retryCount } = useAiAssistant();

  // Unified Inbox Tab State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [inboxList, setInboxList] = useState<any[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isInboxLoading, setIsInboxLoading] = useState(false);

  // Detailed Inline Chat State
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [activeProduct, setActiveProduct] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inboxMessagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const lastUserIdRef = useRef<string | null>(null);

  // ── Dynamic Theme Selector based on path ──
  const getThemeColors = useCallback(() => {
    const p = location.pathname;
    if (p.startsWith('/polymart')) {
      return {
        accent: '#D97706',
        bg: 'from-amber-600 to-amber-700',
        text: 'text-amber-500',
        border: 'border-amber-500/20',
        tint: 'rgba(217,119,6,0.08)',
        glow: 'shadow-amber-500/30'
      };
    }
    if (p.startsWith('/kebajikan') || p.startsWith('/jpp/unit/kebajikan')) {
      return {
        accent: '#0d7377',
        bg: 'from-teal-700 to-teal-800',
        text: 'text-[#0d7377]',
        border: 'border-[#0d7377]/20',
        tint: 'rgba(13,115,119,0.08)',
        glow: 'shadow-teal-500/30'
      };
    }
    if (p.startsWith('/polyrent')) {
      return {
        accent: '#0ea5e9',
        bg: 'from-sky-600 to-sky-700',
        text: 'text-sky-500',
        border: 'border-sky-500/20',
        tint: 'rgba(14,165,233,0.08)',
        glow: 'shadow-sky-500/30'
      };
    }
    return {
      accent: '#6366f1',
      bg: 'from-indigo-600 to-violet-600',
      text: 'text-indigo-500',
      border: 'border-indigo-500/20',
      tint: 'rgba(99,102,241,0.08)',
      glow: 'shadow-indigo-500/30'
    };
  }, [location.pathname]);

  const themeColors = getThemeColors();

  // ── Single AI message appender ──
  const appendMsg = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
    const newMsg: ChatMessage = {
      ...msg,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  }, []);

  // ── Load history ──
  useEffect(() => {
    if (!profile?.id) {
      if (lastUserIdRef.current !== null) {
        setMessages([]);
        lastUserIdRef.current = null;
      }
      return;
    }
    if (lastUserIdRef.current === profile.id) return;
    lastUserIdRef.current = profile.id;
    setMessages(loadMessages(profile.id));
  }, [profile?.id]);

  // ── Persist history ──
  useEffect(() => {
    if (profile?.id && lastUserIdRef.current === profile.id) {
      saveMessages(profile.id, messages);
    }
  }, [messages]);

  // ── Auto-scroll AI ──
  useEffect(() => {
    if (isOpen && activeTab === 'ai') {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [messages, isChatLoading, isOpen, activeTab]);

  // ── Auto-scroll Inline Chat ──
  useEffect(() => {
    if (selectedChat) {
      setTimeout(() => inboxMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [chatMessages, selectedChat]);

  // ── Scroll detection for auto-hide FAB ──
  useEffect(() => {
    let ticking = false;
    const handleScroll = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('#nexus-chat-container')) return;

      if (!ticking) {
        requestAnimationFrame(() => {
          let scrollY = window.scrollY;
          if (e.target instanceof HTMLElement) {
             if (e.target.clientHeight > window.innerHeight * 0.4) {
                scrollY = e.target.scrollTop;
             }
          }
          setIsScrolled(scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    setIsScrolled(window.scrollY > 40);
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  // ── Auto-grow textarea ──
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  // ── Close panel when clicking outside ──
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const fab = document.getElementById('nexus-chat-fab');
        if (fab && fab.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // ── Fetch AI Chat Context ──
  useEffect(() => {
    if (isOpen && profile?.id && activeTab === 'ai') {
      const fetchContext = async () => {
        try {
          const [notosRes, jppRes] = await Promise.all([
            supabase
              .from('notifications')
              .select('title')
              .eq('user_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(3),
            supabase
              .from('profiles')
              .select('full_name, jpp_position, jpp_unit')
              .eq('role', 'JPP')
          ]);

          let jppOrgText = undefined;
          if (jppRes.data && jppRes.data.length > 0) {
            jppOrgText = jppRes.data.map(m => {
              const pos = m.jpp_position ? (positionLabels[m.jpp_position as string] || m.jpp_position) : 'Ahli JPP';
              const unit = m.jpp_unit ? (unitLabels[m.jpp_unit as string] || m.jpp_unit) : '';
              return `- ${m.full_name} (${pos}${unit ? ' - ' + unit : ''})`;
            }).join('\n');
          }

          let ctx: ChatContext = {
            currentPage: location.pathname,
            userRole: profile.role,
            recentNotifications: notosRes.data?.map(n => n.title) || [],
            tokenBalance: profile.ai_token_balance,
            subscriptionTier: profile.subscription_tier,
            jppOrganization: jppOrgText,
            allClubs: ALL_CLUBS.length > 0 
              ? ALL_CLUBS.map(c => `- ${c.name} (${c.shortName || 'N/A'})`).join('\n')
              : undefined,
          };

          const p = location.pathname;

          if (p.startsWith('/kelab') || p.startsWith('/aktiviti') || p === '/') {
            const targetClubId = profile.club_id;
            if (targetClubId) {
              const { data: club } = await supabase.from('clubs').select('name, members_count').eq('id', targetClubId).single();
              if (club) {
                const { count: pr } = await supabase.from('club_reports').select('id', { count: 'exact', head: true }).eq('club_id', targetClubId).eq('status', 'draft');
                ctx.clubInfo = { name: club.name, membersCount: club.members_count, pendingReports: pr || 0 };

                const { data: progs } = await supabase.from('programs').select('nama_program, tarikh_mula, location')
                  .eq('club_id', targetClubId).not('status', 'eq', 'COMPLETED').order('tarikh_mula', { ascending: true }).limit(3);
                if (progs?.length) ctx.upcomingPrograms = progs.map(pr => `- ${pr.nama_program} (${pr.tarikh_mula || 'TBA'})`).join('\n');
              }
            }
          } 
          else if (p.startsWith('/akademik')) {
            const [cgpaRes, meritRes] = await Promise.all([
              supabase.from('akademik_cgpa_records').select('cgpa').eq('user_id', profile.id).order('semester', { ascending: false }).limit(1).maybeSingle(),
              supabase.from('akademik_pencapaian').select('merit_override').eq('user_id', profile.id).eq('status', 'APPROVED'),
            ]);
            const totalMerits = meritRes.data?.reduce((acc: number, curr: any) => acc + (curr.merit_override || 0), 0) || 0;
            ctx.akademikInfo = {
              cgpa: cgpaRes.data?.cgpa,
              meritPoints: totalMerits,
              statusUnlock: 'Tiada Request'
            };
          }
          else if (p.startsWith('/keusahawanan')) {
             const { data: memberships } = await supabase.from('student_business_memberships')
               .select('business_id, role, status, business:keusahawanan_businesses(name)')
               .eq('user_id', profile.id)
               .eq('status', 'ACTIVE')
               .limit(1).maybeSingle();
             
             if (memberships?.business) {
               ctx.keusahawananInfo = {
                 shopName: (memberships.business as any).name,
                 isManager: memberships.role === 'MANAGER' || memberships.role === 'OWNER',
               };
             }
          }
          setChatContext(ctx);
        } catch (err) {
          console.error('Failed to fetch chat context:', err);
        }
      };
      fetchContext();
    }
  }, [isOpen, profile?.id, location.pathname, positionLabels, unitLabels, activeTab]);

  // ── Unified Inbox Data Fetcher ──
  const fetchInboxData = useCallback(async () => {
    if (!profile?.id) return;
    setIsInboxLoading(true);
    try {
      // 1. Fetch active announcements (select only required columns)
      const { data: anns } = await supabase
        .from('system_announcements')
        .select('title, content_body, action_url, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setAnnouncements(anns || []);

      // 2. Fetch PolyMart conversations (select only required columns)
      const { data: polymartConvs } = await supabase
        .from('polymart_conversations')
        .select('id, buyer_id, vendor_business_id, last_message_at, created_at')
        .order('last_message_at', { ascending: false });

      let enrichedPolymart: any[] = [];
      if (polymartConvs && polymartConvs.length > 0) {
        const bizIds = [...new Set(polymartConvs.map(c => c.vendor_business_id))];
        const buyerIds = [...new Set(polymartConvs.map(c => c.buyer_id))];

        const [bizRes, buyerRes, lastMsgsRes] = await Promise.all([
          supabase.from('keusahawanan_businesses').select('id, name, logo_url').in('id', bizIds),
          supabase.from('profiles').select('id, full_name').in('id', buyerIds),
          supabase.from('polymart_messages')
            .select('conversation_id, sender_id, content, is_read, created_at')
            .in('conversation_id', polymartConvs.map(c => c.id))
            .order('created_at', { ascending: false })
        ]);

        const bizMap = new Map((bizRes.data ?? []).map(b => [b.id, b]));
        const buyerMap = new Map((buyerRes.data ?? []).map(b => [b.id, b]));

        const lastMsgMap = new Map<string, any>();
        const unreadCountMap = new Map<string, number>();

        (lastMsgsRes.data ?? []).forEach(msg => {
          if (!lastMsgMap.has(msg.conversation_id)) {
            lastMsgMap.set(msg.conversation_id, msg);
          }
          if (msg.sender_id !== profile.id && !msg.is_read) {
            const currentCount = unreadCountMap.get(msg.conversation_id) || 0;
            unreadCountMap.set(msg.conversation_id, currentCount + 1);
          }
        });

        enrichedPolymart = polymartConvs.map(c => {
          const isUserBuyer = c.buyer_id === profile.id;
          const biz = bizMap.get(c.vendor_business_id);
          const buyer = buyerMap.get(c.buyer_id);
          const lastMsg = lastMsgMap.get(c.id);
          const unreadCount = unreadCountMap.get(c.id) || 0;

          return {
            id: c.id,
            type: 'polymart',
            title: isUserBuyer ? (biz?.name ?? 'Kedai PolyMart') : (buyer?.full_name ?? 'Pembeli'),
            logoUrl: isUserBuyer ? biz?.logo_url : null,
            lastMessage: lastMsg?.content ?? '',
            updatedAt: c.last_message_at || c.created_at,
            unreadCount,
            originalData: c
          };
        });
      }

      // 3. Fetch PolyRent conversations (select only required columns)
      const { data: rentMsgs } = await supabase
        .from('polyrent_messages')
        .select('id, sender_id, receiver_id, content, is_read, created_at')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      let enrichedPolyrent: any[] = [];
      if (rentMsgs && rentMsgs.length > 0) {
        const partnersMap = new Map<string, any[]>();
        rentMsgs.forEach(msg => {
          const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
          if (!partnersMap.has(partnerId)) {
            partnersMap.set(partnerId, []);
          }
          partnersMap.get(partnerId)!.push(msg);
        });

        const partnerIds = Array.from(partnersMap.keys());
        const { data: partnerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', partnerIds);

        const profilesMap = new Map((partnerProfiles ?? []).map(p => [p.id, p]));

        enrichedPolyrent = partnerIds.map(pId => {
          const msgs = partnersMap.get(pId) || [];
          const lastMsg = msgs[0];
          const unreadCount = msgs.filter(m => m.sender_id === pId && !m.is_read).length;
          const partnerProf = profilesMap.get(pId);

          return {
            id: pId,
            type: 'polyrent',
            title: partnerProf?.full_name ?? 'Pengguna PolyRent',
            lastMessage: lastMsg?.content ?? '',
            updatedAt: lastMsg?.created_at,
            unreadCount,
            originalData: { partnerId: pId }
          };
        });
      }

      // 4. Fetch e-Kebajikan tickets (Exco sees their assigned/delegated tickets + their own submitted ones)
      let kebajikanQuery = supabase
        .from('kebajikan_tickets')
        .select('id, ticket_no, title, status, updated_at, created_at');

      const isExco = profile.role === 'SUPER_ADMIN_JPP' || (profile.role === 'JPP' && profile.jpp_unit === 'KEBAJIKAN');
      if (isExco) {
        kebajikanQuery = kebajikanQuery.or(`submitter_id.eq.${profile.id},assigned_to.eq.${profile.id},delegated_to.eq.${profile.id}`);
      } else {
        kebajikanQuery = kebajikanQuery.eq('submitter_id', profile.id);
      }

      const { data: tickets } = await kebajikanQuery.order('updated_at', { ascending: false });

      let enrichedKebajikan: any[] = [];
      if (tickets && tickets.length > 0) {
        const { data: comments } = await supabase
          .from('kebajikan_ticket_comments')
          .select('ticket_id, content, created_at, author_id')
          .in('ticket_id', tickets.map(t => t.id))
          .order('created_at', { ascending: false });

        const lastCommentMap = new Map<string, any>();
        (comments ?? []).forEach(c => {
          if (!lastCommentMap.has(c.ticket_id)) {
            lastCommentMap.set(c.ticket_id, c);
          }
        });

        enrichedKebajikan = tickets.map(t => {
          const lastCmt = lastCommentMap.get(t.id);
          const hasUnreadComment = lastCmt && lastCmt.author_id !== profile.id;
          
          return {
            id: t.id,
            type: 'kebajikan',
            title: `[${t.ticket_no}] ${t.title}`,
            lastMessage: lastCmt ? lastCmt.content : 'Tiada komen lagi.',
            updatedAt: t.updated_at || t.created_at,
            unreadCount: hasUnreadComment ? 1 : 0,
            originalData: t
          };
        });
      }

      const combined = [...enrichedPolymart, ...enrichedPolyrent, ...enrichedKebajikan];
      combined.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setInboxList(combined);

      // Compute total unread
      const totalUnread = combined.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
      setUnreadTotal(totalUnread);

    } catch (e) {
      console.error('Error fetching inbox data:', e);
    } finally {
      setIsInboxLoading(false);
    }
  }, [profile]);

  // ── Fetch unread counts via lightweight REST polling ──
  const fetchUnreadCounts = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [martRes, rentRes] = await Promise.all([
        supabase.from('polymart_messages').select('id', { count: 'exact', head: true }).neq('sender_id', profile.id).eq('is_read', false),
        supabase.from('polyrent_messages').select('id', { count: 'exact', head: true }).eq('receiver_id', profile.id).eq('is_read', false)
      ]);
      setUnreadTotal((martRes.count || 0) + (rentRes.count || 0));
    } catch (e) {
      console.warn('Failed to fetch unread counts:', e);
    }
  }, [profile?.id]);

  // Poll unread counts every 60s when widget is closed
  useEffect(() => {
    if (!profile?.id) return;
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 60000);
    return () => clearInterval(interval);
  }, [profile?.id, fetchUnreadCounts]);

  // Fetch complete inbox whenever user switches to messages tab
  useEffect(() => {
    if (isOpen && activeTab === 'messages' && !selectedChat) {
      fetchInboxData();
    }
  }, [isOpen, activeTab, selectedChat, fetchInboxData]);

  // Listen to open-polymart-chat event to open vendor chat directly inside floating chatbox
  useEffect(() => {
    const handleOpenPolymartChat = async (e: Event) => {
      const customEvent = e as CustomEvent<{ businessId: string; product?: any }>;
      const bizId = customEvent.detail.businessId;
      const prod = customEvent.detail.product;
      if (!bizId || !profile?.id) return;

      // Open the widget
      setIsOpen(true);
      setActiveTab('messages');

      try {
        // Query if a conversation already exists using limit(1) to avoid multi-row exceptions
        const { data: existingConvs } = await supabase
          .from('polymart_conversations')
          .select('id, buyer_id, vendor_business_id, last_message_at, created_at')
          .eq('buyer_id', profile.id)
          .eq('vendor_business_id', bizId)
          .order('last_message_at', { ascending: false })
          .limit(1);

        let conv = existingConvs && existingConvs.length > 0 ? existingConvs[0] : null;

        if (!conv) {
          // Create new conversation
          const { data: newConv, error } = await supabase
            .from('polymart_conversations')
            .insert({
              buyer_id: profile.id,
              vendor_business_id: bizId
            })
            .select('id, buyer_id, vendor_business_id, last_message_at, created_at')
            .single();

          if (error) throw error;
          conv = newConv;
        }

        // Fetch vendor business name and logo
        const { data: biz } = await supabase
          .from('keusahawanan_businesses')
          .select('name, logo_url')
          .eq('id', bizId)
          .maybeSingle();

        const enrichedChat = {
          id: conv.id,
          type: 'polymart',
          title: biz?.name ?? 'Kedai PolyMart',
          logoUrl: biz?.logo_url || null,
          lastMessage: '',
          updatedAt: conv.last_message_at || conv.created_at,
          unreadCount: 0,
          originalData: conv
        };

        setSelectedChat(enrichedChat);
        fetchChatMessages(enrichedChat);

        if (prod) {
          setActiveProduct({
            id: prod.id,
            name: prod.name,
            price: prod.price,
            image_url: prod.image_url,
            type: 'polymart'
          });
        }
      } catch (err) {
        console.error('Failed to open/create conversation:', err);
        toast.error('Gagal membuka perbualan');
      }
    };

    window.addEventListener('open-polymart-chat', handleOpenPolymartChat);
    return () => window.removeEventListener('open-polymart-chat', handleOpenPolymartChat);
  }, [profile?.id]);

  // Listen to open-polyrent-chat event
  useEffect(() => {
    const handleOpenPolyrentChat = async (e: Event) => {
      const customEvent = e as CustomEvent<{ partnerId: string; partnerName: string; listing?: any }>;
      const { partnerId, partnerName, listing } = customEvent.detail;
      if (!partnerId || !profile?.id) return;

      // Open the widget
      setIsOpen(true);
      setActiveTab('messages');

      try {
        const enrichedChat = {
          id: partnerId,
          type: 'polyrent',
          title: partnerName || 'Pengguna PolyRent',
          lastMessage: '',
          updatedAt: new Date().toISOString(),
          unreadCount: 0,
          originalData: { partnerId }
        };

        setSelectedChat(enrichedChat);
        fetchChatMessages(enrichedChat);

        if (listing) {
          setActiveProduct({
            id: listing.id,
            name: listing.title,
            price: listing.sewa_bulanan || listing.sewa || 0,
            image_url: listing.images?.[0] || listing.image_url,
            type: 'polyrent'
          });
        }
      } catch (err) {
        console.error('Failed to open polyrent chat:', err);
      }
    };

    window.addEventListener('open-polyrent-chat', handleOpenPolyrentChat);
    return () => window.removeEventListener('open-polyrent-chat', handleOpenPolyrentChat);
  }, [profile?.id]);

  // Listen to open-kebajikan-chat event
  useEffect(() => {
    const handleOpenKebajikanChat = async (e: Event) => {
      const customEvent = e as CustomEvent<{ ticketId: string; ticketNo: string; title: string; status: string }>;
      const { ticketId, ticketNo, title, status } = customEvent.detail;
      if (!ticketId || !profile?.id) return;

      // Open the widget
      setIsOpen(true);
      setActiveTab('messages');

      try {
        // Find ticket submitter_id from backend first
        const { data: ticket } = await supabase
          .from('kebajikan_tickets')
          .select('submitter_id')
          .eq('id', ticketId)
          .maybeSingle();

        const enrichedChat = {
          id: ticketId,
          type: 'kebajikan',
          title: `[${ticketNo}] ${title}`,
          lastMessage: '',
          updatedAt: new Date().toISOString(),
          unreadCount: 0,
          originalData: { id: ticketId, ticket_no: ticketNo, title, status, submitter_id: ticket?.submitter_id }
        };

        setSelectedChat(enrichedChat);
        fetchChatMessages(enrichedChat);

        setActiveProduct({
          id: ticketId,
          name: `[${ticketNo}] ${title}`,
          price: 0,
          type: 'kebajikan',
          additionalInfo: { ticketNo, status }
        });
      } catch (err) {
        console.error('Failed to open kebajikan chat:', err);
      }
    };

    window.addEventListener('open-kebajikan-chat', handleOpenKebajikanChat);
    return () => window.removeEventListener('open-kebajikan-chat', handleOpenKebajikanChat);
  }, [profile?.id]);

  // Listen to open-inbox event to open the messaging panel directly
  useEffect(() => {
    const handleOpenInbox = () => {
      setIsOpen(true);
      setActiveTab('messages');
      setSelectedChat(null);
    };

    window.addEventListener('open-inbox', handleOpenInbox);
    return () => window.removeEventListener('open-inbox', handleOpenInbox);
  }, []);

  // ── Fetch Detailed Chat Messages ──
  const fetchChatMessages = async (chat: any) => {
    if (!profile?.id) return;
    try {
      if (chat.type === 'polymart') {
        const { data } = await supabase
          .from('polymart_messages')
          .select('id, conversation_id, sender_id, content, is_read, created_at')
          .eq('conversation_id', chat.id)
          .order('created_at', { ascending: true });
        setChatMessages(data || []);

        await supabase
          .from('polymart_messages')
          .update({ is_read: true })
          .eq('conversation_id', chat.id)
          .neq('sender_id', profile.id)
          .eq('is_read', false);
      } else if (chat.type === 'polyrent') {
        const partnerId = chat.originalData.partnerId;
        const { data } = await supabase
          .from('polyrent_messages')
          .select('id, sender_id, receiver_id, content, is_read, created_at')
          .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${profile.id})`)
          .order('created_at', { ascending: true });
        setChatMessages(data || []);

        await supabase
          .from('polyrent_messages')
          .update({ is_read: true })
          .eq('receiver_id', profile.id)
          .eq('sender_id', partnerId)
          .eq('is_read', false);
      } else if (chat.type === 'kebajikan') {
        const { data } = await supabase
          .from('kebajikan_ticket_comments')
          .select('id, ticket_id, author_id, author_name, author_role, content, created_at')
          .eq('ticket_id', chat.id)
          .eq('is_internal', false)
          .order('created_at', { ascending: true });
        setChatMessages(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch chat details:', e);
    }
  };

  // ── Real-time Active Inline Chat Listener ──
  useEffect(() => {
    if (!selectedChat || !profile?.id) return;

    let channel: any;

    if (selectedChat.type === 'polymart') {
      channel = supabase.channel(`inbox_chat_polymart_${selectedChat.id}`)
        .on('postgres_changes', {
          event: '*', // Listen to INSERT, UPDATE, DELETE!
          schema: 'public',
          table: 'polymart_messages',
          filter: `conversation_id=eq.${selectedChat.id}`
        }, (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            setChatMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.sender_id !== profile.id) {
              supabase.from('polymart_messages').update({ is_read: true }).eq('id', newMsg.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new;
            setChatMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
          }
        })
        .subscribe();
    } else if (selectedChat.type === 'polyrent') {
      const partnerId = selectedChat.originalData.partnerId;
      channel = supabase.channel(`inbox_chat_polyrent_${partnerId}`)
        .on('postgres_changes', {
          event: '*', // Listen to INSERT, UPDATE, DELETE!
          schema: 'public',
          table: 'polyrent_messages'
        }, (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            if (
              (newMsg.sender_id === profile.id && newMsg.receiver_id === partnerId) ||
              (newMsg.sender_id === partnerId && newMsg.receiver_id === profile.id)
            ) {
              setChatMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              if (newMsg.sender_id !== profile.id) {
                supabase.from('polyrent_messages').update({ is_read: true }).eq('id', newMsg.id);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new;
            if (
              (updatedMsg.sender_id === profile.id && updatedMsg.receiver_id === partnerId) ||
              (updatedMsg.sender_id === partnerId && updatedMsg.receiver_id === profile.id)
            ) {
              setChatMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
            }
          }
        })
        .subscribe();
    } else if (selectedChat.type === 'kebajikan') {
      channel = supabase.channel(`inbox_chat_kebajikan_${selectedChat.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'kebajikan_ticket_comments',
          filter: `ticket_id=eq.${selectedChat.id}`
        }, (payload: any) => {
          const incoming = payload.new;
          if (!incoming.is_internal) {
            setChatMessages(prev => {
              if (prev.some(m => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });
          }
        })
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedChat, profile]);

  const handleSendInboxMessage = async (e?: React.FormEvent, customContent?: string) => {
    if (e) e.preventDefault();
    const content = (customContent || chatInput).trim();
    if (!content || !selectedChat || !profile?.id || isSendingMessage) return;

    setIsSendingMessage(true);
    if (!customContent) {
      setChatInput('');
    }

    try {
      if (selectedChat.type === 'polymart') {
        const { error } = await supabase.from('polymart_messages').insert({
          conversation_id: selectedChat.id,
          sender_id: profile.id,
          content
        });
        if (error) throw error;

        await supabase.from('polymart_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', selectedChat.id);

        // Push notification
        try {
          const isUserBuyer = selectedChat.originalData.buyer_id === profile.id;
          if (isUserBuyer) {
            // Sender is buyer, recipient is vendor business
            const { sendNotificationToBusinessVendor } = await import('@/lib/notifications');
            await sendNotificationToBusinessVendor(selectedChat.originalData.vendor_business_id, {
              title: '🛍️ Mesej Sembang Peniaga!',
              message: `${profile.full_name || 'Pembeli'}: ${content.startsWith('[PRODUCT_CARD:') ? 'Menghantar pautan produk' : content}`,
              type: 'polymart_chat_msg',
              module: 'POLYMART',
              link: `/polymart`,
              reference_id: selectedChat.id,
              actor_name: profile.full_name,
            });
          } else {
            // Sender is vendor, recipient is buyer profile
            const { sendNotificationToUser } = await import('@/lib/notifications');
            await sendNotificationToUser(selectedChat.originalData.buyer_id, {
              title: `💬 Mesej dari ${selectedChat.title}`,
              message: content.startsWith('[PRODUCT_CARD:') ? 'Menghantar pautan produk' : content,
              type: 'polymart_chat_msg',
              module: 'POLYMART',
              link: `/polymart`,
              reference_id: selectedChat.id,
              actor_name: selectedChat.title,
            });
          }
        } catch (e) {
          console.error('Failed to send push notification:', e);
        }

      } else if (selectedChat.type === 'polyrent') {
        const partnerId = selectedChat.originalData.partnerId;
        const { error } = await supabase.from('polyrent_messages').insert({
          sender_id: profile.id,
          receiver_id: partnerId,
          content
        });
        if (error) throw error;

        // Push notification
        try {
          const { sendNotificationToUser } = await import('@/lib/notifications');
          await sendNotificationToUser(partnerId, {
            title: `🏠 Mesej PolyRent dari ${profile.full_name || 'Pelajar'}`,
            message: content.startsWith('[RENT_CARD:') ? 'Menghantar pautan kediaman' : content,
            type: 'polyrent_chat_msg',
            module: 'POLYRENT',
            link: `/polyrent`,
            reference_id: profile.id,
            actor_name: profile.full_name,
          });
        } catch (e) {
          console.error('Failed to send push notification:', e);
        }

      } else if (selectedChat.type === 'kebajikan') {
        const { error } = await supabase.from('kebajikan_ticket_comments').insert({
          ticket_id: selectedChat.id,
          author_id: profile.id,
          author_name: profile.full_name || 'Pelajar',
          author_role: profile.role === 'JPP' || profile.role === 'SUPER_ADMIN_JPP' ? 'EXCO' : 'PELAJAR',
          is_internal: false,
          content
        });
        if (error) throw error;

        await supabase.from('kebajikan_tickets')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', selectedChat.id);

        // Push notification
        try {
          const { sendNotificationToKebajikanExco, sendNotificationToUser } = await import('@/lib/notifications');
          const isExco = profile.role === 'SUPER_ADMIN_JPP' || (profile.role === 'JPP' && profile.jpp_unit === 'KEBAJIKAN');
          if (!isExco) {
            // Student comment, notify exco
            await sendNotificationToKebajikanExco({
              title: `🛡️ Komen Baru Tiket [${selectedChat.originalData.ticket_no}]`,
              message: `${profile.full_name || 'Pelajar'}: ${content.startsWith('[TICKET_CARD:') ? 'Menghantar pautan tiket' : content}`,
              type: 'kebajikan_ticket_comment',
              module: 'KEBAJIKAN',
              link: `/kebajikan/buat-aduan`,
              reference_id: selectedChat.id,
              actor_name: profile.full_name,
            });
          } else {
            // Exco comment, notify student (submitter)
            const submitterId = selectedChat.originalData.submitter_id;
            if (submitterId && submitterId !== profile.id) {
              await sendNotificationToUser(submitterId, {
                title: `🛡️ Maklumbalas Tiket [${selectedChat.originalData.ticket_no}]`,
                message: `${profile.full_name || 'Urusetia'}: ${content.startsWith('[TICKET_CARD:') ? 'Menghantar pautan tiket' : content}`,
                type: 'kebajikan_ticket_comment',
                module: 'KEBAJIKAN',
                link: `/kebajikan/buat-aduan`,
                reference_id: selectedChat.id,
                actor_name: profile.full_name,
              });
            }
          }
        } catch (e) {
          console.error('Failed to send push notification:', e);
        }
      }
      
      // Refresh chat list details
      fetchChatMessages(selectedChat);
      
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Gagal menghantar mesej');
      setChatInput(content);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ── Clear AI History ──
  const clearHistory = () => {
    setMessages([]);
    clearStoredMessages();
  };

  // ── Send Free-Text AI Message ──
  const MAX_INPUT_LENGTH = 700;

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isChatLoading) return;

    if (text.length > MAX_INPUT_LENGTH) {
      toast.error(`Mesej terlalu panjang (${text.length}/${MAX_INPUT_LENGTH} aksara). Sila pendekkan.`);
      return;
    }

    setInputValue('');

    const lowerText = text.toLowerCase().replace(/\s+/g, ' ');
    const isDynamicQuery = lowerText.includes('sekarang') || lowerText.includes('baru') || lowerText.includes('hari ini');
    if (text.length >= 2 && text.length < 150 && !isDynamicQuery) {
      const historyArr = messagesRef.current;
      for (let i = historyArr.length - 1; i >= 0; i--) {
        if (historyArr[i].role === 'user' && historyArr[i].content.toLowerCase().replace(/\s+/g, ' ') === lowerText) {
          const nextMsg = historyArr[i + 1];
          if (nextMsg && nextMsg.role === 'ai') {
            const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text, timestamp: new Date().toISOString() };
            const aiMsg: ChatMessage = { id: generateId(), role: 'ai', content: nextMsg.content, timestamp: new Date().toISOString() };
            setMessages((prev) => [...prev, userMsg, aiMsg]);
            return;
          }
        }
      }
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    const historyForApi = [
      ...messagesRef.current.filter((m) => m.role !== 'error'),
      userMsg,
    ];

    const isExcoOnKebajikan = profile?.role === 'SUPER_ADMIN_JPP' || (profile?.role === 'JPP' && profile?.jpp_unit === 'KEBAJIKAN') && location.pathname.startsWith('/kebajikan');
    let aiText = isExcoOnKebajikan
      ? await sendKebajikanExcoMessage(text, historyForApi, chatContext || undefined)
      : await sendChatMessage(text, historyForApi, chatContext || undefined);

    if (aiText) {
      const navMatch = aiText.match(/\[NAVIGATE:([^\]]+)\]/);
      if (navMatch && navMatch[1]) {
        const targetRoute = navMatch[1].trim();
        aiText = aiText.replace(/\[NAVIGATE:([^\]]+)\]/g, '').trim();
        setTimeout(() => {
          navigate(targetRoute);
        }, 1500);
      }
    }

    if (aiText) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'ai',
          content: aiText,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'error',
          content: 'Sistem sedang sibuk. Sila cuba lagi sebentar!',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!allowAiChat || !profile?.id) return null;

  const isBusy = isChatLoading || isActionLoading;
  const isPolymart = location.pathname.startsWith('/polymart');
  const isKebajikanChat = location.pathname.match(/^\/kebajikan\/(tiket|aduan)\/[^/]+/);
  const isExcoMode = (profile?.role === 'SUPER_ADMIN_JPP' || (profile?.role === 'JPP' && profile?.jpp_unit === 'KEBAJIKAN')) && location.pathname.startsWith('/kebajikan');
  
  const bottomMarginClass = isKebajikanChat 
    ? 'mb-24'
    : '';

  const EXCO_CHIPS: { icon: string; label: string; prompt: string }[] = [
    {
      icon: '💬',
      label: 'Berikan Pendapat',
      prompt: chatContext?.kebajikanInfo?.currentTicket
        ? `Saya sedang melihat tiket ini:\n${chatContext.kebajikanInfo.currentTicket}\n\nBerikan pendapat anda: apakah punca masalah yang paling munasabah dan apakah langkah-langkah konkrit untuk menyelesaikannya?`
        : 'Berdasarkan situasi semasa, berikan pendapat anda tentang apa yang perlu saya lakukan sekarang sebagai Exco Kebajikan.',
    },
    { icon: '📊', label: 'Analisis Hari Ini', prompt: 'Bagi saya ringkasan situasi tiket hari ini dan cadangan tindakan segera.' },
    { icon: '⚠️', label: 'Tiket Urgent', prompt: 'Senaraikan tiket yang paling kritikal dan cadangkan tindakan yang perlu diambil.' },
    { icon: '📝', label: 'Draft Balasan', prompt: 'Bantu saya draf balasan profesional untuk tiket yang masih belum dibalas.' },
  ];

  const KEUSAHAWANAN_CHIPS: { icon: string; label: string; prompt: string }[] = [
    { icon: '💰', label: 'Ringkasan Jualan', prompt: 'Berapa total jualan hari ini dan ada produk kurang stok?' },
    { icon: '🛒', label: 'Cara Guna POS', prompt: 'Boleh ajar macam mana nak buat transaksi POS?' },
    { icon: '⏰', label: 'Urus Syif', prompt: 'Bagaimana cara nak rekod syif masuk kerja?' },
  ];

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'polymart': return <Store size={15} className="text-amber-500" />;
      case 'polyrent': return <Home size={15} className="text-sky-400" />;
      case 'kebajikan': return <Shield size={15} className="text-[#0d7377]" />;
      default: return <MessageSquare size={15} className="text-slate-400" />;
    }
  };

  const getModuleBadgeColor = (type: string) => {
    switch (type) {
      case 'polymart': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'polyrent': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'kebajikan': return 'bg-[#0d7377]/10 text-[#0d7377] border-[#0d7377]/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const content = (
    <div id="nexus-chat-container" className={`fixed bottom-6 max-md:bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 md:right-6 z-[120] transition-all duration-300 ease-in-out ${bottomMarginClass}`}>
      
      {/* ── FAB Trigger ── */}
      <motion.button
        id="nexus-chat-fab"
        initial={false}
        animate={{ 
          scale: !isOpen && isScrolled ? 0.85 : 1, 
          opacity: !isOpen && isScrolled ? 0.8 : 1,
          x: !isOpen && isScrolled ? 10 : 0
        }}
        whileHover={{ scale: 1.05, opacity: 1, x: 0 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr ${themeColors.bg} flex items-center justify-center shadow-xl ${themeColors.glow} text-white relative overflow-hidden group`}
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span key="x" initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 90, scale: 0 }} transition={{ duration: 0.18 }}>
              <X size={26} />
            </motion.span>
          ) : (
            <motion.span key="s" className="relative flex items-center justify-center" initial={{ rotate: 90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: -90, scale: 0 }} transition={{ duration: 0.18 }}>
              <MessageSquare size={26} />
              
              {/* Unread badge on closed FAB */}
              {unreadTotal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5.5 h-5.5 bg-rose-600 border-2 border-slate-950 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-bounce">
                  {unreadTotal}
                </span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-[4.5rem] right-0 w-[calc(100vw-2rem)] sm:w-80 md:w-96 rounded-[2.5rem] shadow-2xl bg-card overflow-hidden flex flex-col border border-white/[0.05]"
            style={{ height: 'min(580px, calc(100dvh - 12rem))' }}
          >
            {/* Header */}
            <div className={`p-5 text-white relative shrink-0 flex items-center justify-between bg-gradient-to-r ${themeColors.bg}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-black text-lg italic flex items-center gap-2">
                  <Sparkles size={18} className="text-white/80" />
                  {selectedChat ? selectedChat.title : (isExcoMode ? 'Kebajikan AI' : 'JPP Nexus')}
                </h3>
                <p className="text-[11px] text-white/70 font-medium mt-0.5">
                  {selectedChat 
                    ? `Perbualan ${selectedChat.type.toUpperCase()}` 
                    : (isExcoMode ? 'Pembantu peribadi Exco Kebajikan POLISAS' : 'Pembantu pintar & Sembang berpusat')}
                </p>
              </div>
              
              {activeTab === 'ai' && !selectedChat && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={clearHistory}
                  disabled={messages.length === 0}
                  title="Kosongkan sembang"
                  className="relative z-10 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                </motion.button>
              )}
            </div>

            {/* Tab bar (only when no inline chat is active) */}
            {!selectedChat && (
              <div className="flex border-b border-border/40 bg-background/50 p-1.5 gap-1 shrink-0">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-2 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'ai' 
                      ? `bg-gradient-to-r ${themeColors.bg} text-white shadow-sm` 
                      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                  }`}
                >
                  <Sparkles size={12} /> Tanya AI
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex-1 py-2 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'messages' 
                      ? `bg-gradient-to-r ${themeColors.bg} text-white shadow-sm` 
                      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                  }`}
                >
                  <MessageSquare size={12} /> Peti Mesej
                  {unreadTotal > 0 && (
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full border border-card" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('developer')}
                  className={`flex-1 py-2 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'developer' 
                      ? `bg-gradient-to-r ${themeColors.bg} text-white shadow-sm` 
                      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                  }`}
                >
                  <QrCode size={12} /> Dev Tab
                </button>
              </div>
            )}

            {/* Chat Content Body */}
            {selectedChat ? (
              // ── Detailed Inline Chat Screen ──
              <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {/* Inline Header Back button bar */}
                <div className="px-4 py-2 bg-muted/20 border-b border-border/30 flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setSelectedChat(null); setChatMessages([]); fetchInboxData(); }}
                    className="flex items-center gap-1 text-[10px] font-black text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors py-1 px-2.5 bg-muted/40 hover:bg-muted/70 rounded-xl"
                  >
                    <ArrowLeft size={12} /> Kembali
                  </button>
                </div>

                {/* Pinned Shopee-style Product Banner */}
                {activeProduct && activeProduct.type === selectedChat.type && (
                  <div className="mx-4 mt-2 p-2.5 rounded-2xl bg-card/65 backdrop-blur-md border border-border/40 flex items-center justify-between gap-3 shadow-sm select-none animate-in slide-in-from-top duration-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted border border-border/20 flex items-center justify-center shrink-0 text-lg">
                        {activeProduct.image_url ? (
                          <img src={activeProduct.image_url} alt={activeProduct.name} className="w-full h-full object-cover" />
                        ) : (
                          activeProduct.type === 'polymart' ? '📦' : activeProduct.type === 'polyrent' ? '🏠' : '🛡️'
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black leading-snug truncate text-foreground">
                          {activeProduct.name}
                        </p>
                        {activeProduct.price > 0 ? (
                          <p className="text-[10px] font-black text-amber-500 mt-0.5">
                            RM {activeProduct.price.toFixed(2)}{activeProduct.type === 'polyrent' ? '/bulan' : ''}
                          </p>
                        ) : activeProduct.additionalInfo?.ticketNo ? (
                          <span className="inline-block text-[8px] font-black uppercase text-[#0d7377] bg-[#0d7377]/10 border border-[#0d7377]/20 px-1.5 py-0.5 rounded-md mt-0.5">
                            Aduan: {activeProduct.additionalInfo.ticketNo}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          let cardText = '';
                          if (activeProduct.type === 'polymart') {
                            cardText = `[PRODUCT_CARD:${activeProduct.id}|${activeProduct.name}|${activeProduct.price}|${activeProduct.image_url || ''}]`;
                          } else if (activeProduct.type === 'polyrent') {
                            cardText = `[RENT_CARD:${activeProduct.id}|${activeProduct.name}|${activeProduct.price}|${activeProduct.image_url || ''}]`;
                          } else if (activeProduct.type === 'kebajikan') {
                            cardText = `[TICKET_CARD:${activeProduct.id}|${activeProduct.additionalInfo?.ticketNo || ''}|${activeProduct.name}|${activeProduct.additionalInfo?.status || ''}]`;
                          }
                          if (cardText) {
                            await handleSendInboxMessage(undefined, cardText);
                            setActiveProduct(null);
                          }
                        }}
                        className="text-[10px] font-black text-white hover:opacity-90 bg-amber-500 hover:bg-amber-600 transition-all py-1.5 px-3 rounded-xl shadow-sm flex items-center gap-1 active:scale-95 duration-150"
                        style={selectedChat.type === 'polyrent' ? { backgroundColor: '#0284c7' } : selectedChat.type === 'kebajikan' ? { backgroundColor: '#0d7377' } : {}}
                      >
                        Hantar Link
                      </button>
                      <button
                        onClick={() => setActiveProduct(null)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages feed */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/20">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500 text-center py-10">
                      <MessageSquare size={20} className="opacity-20 animate-pulse" />
                      <p className="text-[11px] font-bold text-muted-foreground">Mula perbualan</p>
                      <p className="text-[10px] text-muted-foreground/50">Hantar mesej pertama di bawah.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => {
                      // e-kebajikan author roles, polymart/polyrent uses IDs
                      const isMe = selectedChat.type === 'kebajikan'
                        ? msg.author_id === profile?.id
                        : msg.sender_id === profile?.id;
                      
                      const senderName = selectedChat.type === 'kebajikan' ? msg.author_name : '';
                      const msgText = msg.content || msg.message || '';

                      // Try parsing cards
                      const pmProduct = parseProductCard(msgText);
                      const prListing = parseRentCard(msgText);
                      const kbTicket = parseTicketCard(msgText);

                      return (
                        <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {senderName && !isMe && (
                            <span className="text-[9px] font-black text-muted-foreground mb-1 px-1">{senderName}</span>
                          )}
                          
                          {pmProduct ? (
                            /* Visual PolyMart Product Card */
                            <div
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/polymart/produk/${pmProduct.id}`);
                              }}
                              className="p-2.5 rounded-2xl bg-card border border-border/50 hover:border-amber-500/50 cursor-pointer transition-all flex gap-3 text-foreground w-64 shadow-md active:scale-95 duration-200"
                            >
                              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/20 flex items-center justify-center text-lg">
                                {pmProduct.imageUrl ? (
                                  <img src={pmProduct.imageUrl} alt={pmProduct.name} className="w-full h-full object-cover" />
                                ) : (
                                  '📦'
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <p className="text-[11px] font-black leading-tight truncate text-foreground">{pmProduct.name}</p>
                                <p className="text-xs font-black text-amber-500 mt-1">RM {pmProduct.price.toFixed(2)}</p>
                                <span className="text-[9px] text-muted-foreground/60 flex items-center gap-1 mt-0.5 font-bold">
                                  Lihat Produk <ExternalLink size={8} />
                                </span>
                              </div>
                            </div>
                          ) : prListing ? (
                            /* Visual PolyRent Listing Card */
                            <div
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/polyrent?listingId=${prListing.id}`);
                              }}
                              className="p-2.5 rounded-2xl bg-card border border-border/50 hover:border-sky-500/50 cursor-pointer transition-all flex gap-3 text-foreground w-64 shadow-md active:scale-95 duration-200"
                            >
                              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/20 flex items-center justify-center text-lg">
                                {prListing.imageUrl ? (
                                  <img src={prListing.imageUrl} alt={prListing.title} className="w-full h-full object-cover" />
                                ) : (
                                  '🏠'
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <p className="text-[11px] font-black leading-tight truncate text-foreground">{prListing.title}</p>
                                <p className="text-xs font-black text-sky-500 mt-1">RM {prListing.price.toFixed(2)}/bulan</p>
                                <span className="text-[9px] text-muted-foreground/60 flex items-center gap-1 mt-0.5 font-bold">
                                  Lihat Kediaman <ExternalLink size={8} />
                                </span>
                              </div>
                            </div>
                          ) : kbTicket ? (
                            /* Visual Kebajikan Ticket Card */
                            <div
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/kebajikan/buat-aduan`);
                              }}
                              className="p-2.5 rounded-2xl bg-card border border-border/50 hover:border-teal-500/50 cursor-pointer transition-all flex gap-3 text-foreground w-64 shadow-md active:scale-95 duration-200"
                            >
                              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 text-sm font-black">
                                🛡️
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest leading-none">Aduan [{kbTicket.ticketNo}]</p>
                                <p className="text-[11px] font-black leading-tight truncate text-foreground mt-1.5">{kbTicket.title}</p>
                                <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full border self-start mt-1.5 ${
                                  kbTicket.status === 'RESOLVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>
                                  {kbTicket.status}
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Standard Text Message bubble */
                            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                              isMe 
                                ? `text-white rounded-br-sm` 
                                : `bg-card border border-border/50 text-foreground rounded-bl-sm`
                            }`}
                            style={isMe ? { backgroundColor: themeColors.accent } : {}}
                            >
                              <p className="whitespace-pre-wrap break-words">{msgText}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-1 mt-1 px-1 text-muted-foreground/40 font-medium">
                            <span className="text-[8px]">
                              {msg.created_at ? fmt(msg.created_at) : 'Kini'}
                            </span>
                            {isMe && selectedChat.type !== 'kebajikan' && (
                              <span className="text-[9px] font-black leading-none select-none ml-0.5">
                                {msg.is_read ? (
                                  <span className="text-sky-500 dark:text-sky-400">✓✓</span>
                                ) : (
                                  <span className="text-muted-foreground/30">✓</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={inboxMessagesEndRef} />
                </div>

                {/* Inline Message Input */}
                <form onSubmit={handleSendInboxMessage} className="p-3 bg-background border-t border-border/50 flex gap-2 items-end shrink-0">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Taip mesej..."
                    rows={1}
                    disabled={isSendingMessage}
                    className="flex-1 text-xs bg-muted/30 border border-border focus:border-indigo-500 rounded-2xl py-3 px-4 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all overflow-y-auto"
                    style={{ maxHeight: '100px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendInboxMessage(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !chatInput.trim()}
                    className="w-10 h-10 rounded-2xl text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: themeColors.accent }}
                  >
                    {isSendingMessage ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </form>
              </div>
            ) : activeTab === 'ai' ? (
              // ── AI ASSISTANT TAB ──
              <div className="flex-1 flex flex-col overflow-hidden bg-background">
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth">
                  {/* Pinned Welcome */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={14} />
                    </div>
                    <div className="bg-card border border-border/50 p-4 rounded-2xl rounded-tl-sm text-sm text-foreground shadow-sm flex-1">
                      <p className="font-bold mb-1">{isExcoMode ? `Hai ${getMalaysianNickname(profile?.full_name)}! 🛡️` : `Hai ${getMalaysianNickname(profile?.full_name)}! 👋`}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed font-medium">
                        {isExcoMode
                          ? "Saya penasihat AI peribadi anda. Tanya apa sahaja — analisis tiket, draf surat, atau sekadar minta pendapat. Sedia membantu!"
                          : "Saya pembantu AI JPP anda. Sila tanya apa sahaja soalan berkaitan kelab atau aktiviti POLISAS!"
                        }
                      </p>
                    </div>
                  </motion.div>

                  {/* Message stream */}
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role !== 'user' && (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                            msg.role === 'error'
                              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500'
                              : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600'
                          }`}>
                            {msg.role === 'error' ? <ShieldAlert size={13} /> : <Sparkles size={13} />}
                          </div>
                        )}

                        <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`relative group px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm'
                              : msg.role === 'error'
                              ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-tl-sm'
                              : 'bg-card border border-border/50 text-foreground rounded-tl-sm'
                          }`}>
                            {msg.role === 'ai' ? (
                              <div className="prose prose-sm dark:prose-invert prose-headings:font-black prose-p:leading-snug max-w-none overflow-hidden text-xs">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}

                            {msg.role === 'ai' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleCopy(msg.id, msg.content)}
                                title="Salin"
                                className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              >
                                {copiedId === msg.id
                                  ? <Check size={11} className="text-green-500" />
                                  : <Copy size={11} className="text-muted-foreground" />}
                              </motion.button>
                            )}
                          </div>
                          <span className="text-[8px] text-muted-foreground/50 mt-0.5 px-1">{fmt(msg.timestamp)}</span>
                        </div>

                        {msg.role === 'user' && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0 mt-1 text-[10px] font-black">
                            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing Indicator */}
                  <AnimatePresence>
                    {isChatLoading && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0 mt-1">
                          <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                        <div className="bg-card border border-border/50 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[34px]">
                          {retryCount > 0 ? (
                            <span className="text-[10px] font-bold animate-pulse text-amber-500">Percubaan {retryCount}/3...</span>
                          ) : (
                            [0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1 h-1 bg-indigo-400 rounded-full"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.55, delay: i * 0.13, repeat: Infinity }}
                              />
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {/* AI Input Area */}
                <div className="p-3 bg-background border-t border-border/50 shrink-0">
                  {/* Chips */}
                  {isExcoMode ? (
                    <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                      {EXCO_CHIPS.map((chip) => (
                        <button
                          key={chip.label}
                          onClick={() => setInputValue(chip.prompt)}
                          disabled={isChatLoading}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-black whitespace-nowrap transition-all border shrink-0 bg-teal-500/10 border-teal-500/35 text-teal-500"
                        >
                          <span>{chip.icon}</span>{chip.label}
                        </button>
                      ))}
                    </div>
                  ) : location.pathname.startsWith('/keusahawanan') && (
                    <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                      {KEUSAHAWANAN_CHIPS.map((chip) => (
                        <button
                          key={chip.label}
                          onClick={() => setInputValue(chip.prompt)}
                          disabled={isChatLoading}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-black whitespace-nowrap transition-all border shrink-0 bg-indigo-500/10 border-indigo-500/35 text-indigo-500"
                        >
                          <span>{chip.icon}</span>{chip.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                      placeholder={isBusy ? "AI sedang berfikir..." : "Tanya sesuatu..."}
                      rows={1}
                      maxLength={700}
                      disabled={isBusy}
                      className="flex-1 text-xs bg-muted/30 border border-border focus:border-indigo-500 rounded-2xl py-3 px-4 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-muted-foreground/50 overflow-y-auto"
                      style={{ maxHeight: '120px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSend}
                      disabled={isBusy || !inputValue.trim()}
                      className={`w-10 h-10 text-white rounded-2xl flex items-center justify-center transition-colors shrink-0 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed`}
                      style={{ backgroundColor: themeColors.accent }}
                      title="Hantar (Enter)"
                    >
                      <Send size={15} />
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'messages' ? (
              // ── UNIFIED INBOX TAB ──
              <div className="flex-1 flex flex-col overflow-hidden bg-background p-4 space-y-4">
                {/* 1. JPP Pinned Announcement Broadcast */}
                {announcements.length > 0 && (
                  <div className="bg-indigo-500/5 border border-indigo-500/15 p-3 rounded-2xl flex items-start gap-2.5 relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                    <Megaphone size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em]">Pengumuman JPP</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      </div>
                      <p className="font-bold text-[10px] text-white mt-0.5 leading-snug truncate">{announcements[0].title}</p>
                      <p className="text-[9px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{announcements[0].content_body}</p>
                      {announcements[0].action_url && (
                        <a href={announcements[0].action_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[8px] font-black text-indigo-300 hover:text-white uppercase tracking-widest mt-2">
                          Pautan Tindakan <ExternalLink size={8} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Quick Action Shortcuts */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => { navigate('/kebajikan/buat-aduan'); setIsOpen(false); }} className="flex-1 bg-[#0d7377]/10 hover:bg-[#0d7377]/20 border border-[#0d7377]/25 text-[#0d7377] font-black text-[9px] uppercase tracking-widest py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors">
                    <Shield size={11} /> + Aduan
                  </button>
                  <button onClick={() => { navigate('/polymart'); setIsOpen(false); }} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 font-black text-[9px] uppercase tracking-widest py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors">
                    <Store size={11} /> PolyMart
                  </button>
                  <button onClick={() => { navigate('/polyrent'); setIsOpen(false); }} className="flex-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-500 font-black text-[9px] uppercase tracking-widest py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors">
                    <Home size={11} /> PolyRent
                  </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-border/40 shrink-0" />

                {/* 3. Conversation List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {isInboxLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Memuatkan Inbox...</p>
                    </div>
                  ) : inboxList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500 text-center">
                      <MessageSquare size={24} className="opacity-15" />
                      <p className="text-[11px] font-bold text-muted-foreground">Tiada Sembang Aktif</p>
                      <p className="text-[9px] text-muted-foreground/40 max-w-[200px]">Mulakan perbualan dalam modul PolyMart atau PolyRent, atau failkan aduan Kebajikan!</p>
                    </div>
                  ) : (
                    inboxList.map((chat) => (
                      <button
                        key={`${chat.type}-${chat.id}`}
                        onClick={() => { setSelectedChat(chat); fetchChatMessages(chat); }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-card hover:bg-muted/40 text-left transition-all relative"
                      >
                        {/* Module Indicator Icon */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-muted/40 border border-border/40`}>
                          {getModuleIcon(chat.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-foreground truncate max-w-[140px]">{chat.title}</span>
                            <span className="text-[8px] text-muted-foreground/40 shrink-0">{new Date(chat.updatedAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{chat.lastMessage || 'Tiada mesej.'}</p>
                        </div>

                        {/* Unread Indicator Badge */}
                        {chat.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[8px] font-black flex items-center justify-center shrink-0 absolute right-2.5 bottom-2.5">
                            {chat.unreadCount}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // ── DEVELOPER TAB ──
              <div className="flex-1 flex flex-col overflow-hidden bg-background p-6 items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
                  <QrCode size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-foreground">Hubungi Pembangun Portal</h4>
                  <p className="text-[10px] text-muted-foreground/60 max-w-[220px] mt-1 leading-relaxed">
                    Sila imbas kod QR di bawah atau klik pautan jika anda ingin melaporkan sebarang pepijat, memberi maklum balas atau mencadangkan penambahbaikan.
                  </p>
                </div>

                {/* QR Code container (Desktop friendly) */}
                <div className="p-3 bg-white border-2 border-border/50 rounded-2xl shadow-lg relative overflow-hidden">
                  <QRCodeSVG 
                    value="https://wa.me/601139413699?text=Hai%20developer%2C%20saya%20ingin%20mencadangkan%20penambahbaikan%20untuk%20JPP%20Digital%20Portal..." 
                    size={110}
                    level="H"
                  />
                </div>

                {/* Direct WhatsApp Call to Action Button */}
                <a
                  href="https://wa.me/601139413699?text=Hai%20developer%2C%20saya%20ingin%20mencadangkan%20penambahbaikan%20untuk%20JPP%20Digital%20Portal..."
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-gradient-to-r ${themeColors.bg} text-white font-black text-[10px] uppercase tracking-widest shadow-lg ${themeColors.glow} hover:brightness-105 active:scale-[0.98] transition-all`}
                >
                  <Phone size={13} /> Chat WhatsApp (+601139413699)
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(content, document.body);
}
