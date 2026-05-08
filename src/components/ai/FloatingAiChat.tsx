import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, FileLineChart, Send, ShieldAlert,
  Trash2, Copy, Check, FileText, BookOpen, Megaphone,
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

// ─── Storage helpers ────────────────────────────────────────────────────────

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

// ─── ID Generator ─────────────────────────────────────────────────────────────

function generateId() {
  return window.crypto.randomUUID();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FloatingAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);
  
  // Hint bubble state
  const [hintIndex, setHintIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { profile, isSuperAdmin, isAdvisor, isPresident, isMT, selectedClubId, hasKebajikanAccess } = useAuth();
  const { callAi, sendChatMessage, sendKebajikanExcoMessage, isLoading: isActionLoading, isChatLoading, retryCount } = useAiAssistant();
  const { allowAiChat } = useAiSettings();
  const { positionLabels, unitLabels } = useJppConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── messagesRef — always mirrors messages state, eliminates stale closures ──
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── Guards: only load localStorage once per user ──
  const lastUserIdRef = useRef<string | null>(null);


  // ── Single message appender — always functional update, never stale ──────
  const appendMsg = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
    const newMsg: ChatMessage = {
      ...msg,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  }, []);

  // ── Load history — ONE-SHOT per user ────────────────────────────────────
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

  // ── Persist history whenever messages change ─────────────────────────────
  useEffect(() => {
    if (profile?.id && lastUserIdRef.current === profile.id) {
      saveMessages(profile.id, messages);
    }
  }, [messages]); // intentionally omit profile.id to avoid re-run on profile refresh

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [messages, isChatLoading, isOpen]);

  // ── Scroll detection for auto-hide ───────────────────────────────────────
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Auto-grow textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  // ── Close panel when clicking outside ───────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      // Do not close if click is inside the panel or the FAB trigger
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Check if target is the FAB button itself (to allow toggle)
        const fab = document.getElementById('nexus-chat-fab');
        if (fab && fab.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    // Small delay so the opening click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // ── Rotating Hints Logic ────────────────────────────────────────────────
  const getHints = useCallback(() => {
    const p = location.pathname;
    // Exco Kebajikan — specialised operational hints
    if (p.startsWith('/kebajikan') && hasKebajikanAccess) return [
      "Berikan pendapat tentang situasi tiket hari ini.",
      "Ada tiket urgent yang perlu saya selesaikan?",
      "Bantu saya draf balasan rasmi untuk tiket baru.",
    ];
    if (p.startsWith('/akademik')) return ["Berapa jumlah merit saya?", "Kira purata skor (CGPA) saya.", "Bagaimana nak mohon folder khas?"];
    if (p.startsWith('/keusahawanan')) return ["Adakah saya bertugas lusa?", "Bantu saya rancang jualan POS.", "Siapa pengurus perniagaan ni?"];
    if (p.startsWith('/jpp')) return ["Semak bilangan laporan kelab tertunggak.", "Ada permohonan merit baru tak?", "Ada apa dalam takwim JPP minggu depan?"];
    if (p.startsWith('/kebajikan')) return ["Apa status aduan saya?", "Bagaimana nak lapor kerosakan fasiliti?", "Berapa aduan belum diselesaikan?"];
    if (p.startsWith('/polymart')) return ["Di mana pesanan makanan saya?", "Macam mana nak bayar pesanan?", "Ada diskaun tak hari ini?"];
    if (p.startsWith('/aktiviti') || p.startsWith('/kelab')) return ["Bila program kelab saya seterusnya?", "Ada apa dalam takwim minggu depan?", "Berapa lama lagi sebelum cuti?"];
    return ["Bila cuti semester seterusnya?", "Ada apa dalam takwim minggu depan?", "Bantu drafkan kertas kerja laporan."];
  }, [location.pathname, hasKebajikanAccess]);

  useEffect(() => {
    if (isOpen || !allowAiChat) {
      setShowHint(false);
      return;
    }
    
    // Pick a random hint so it varies per visit
    const hints = getHints();
    setHintIndex(Math.floor(Math.random() * hints.length));

    // Muncul selepas 5 saat pengguna melihat skrin
    const showDelay = setTimeout(() => {
      setShowHint(true);
    }, 5000);

    // Hilang secara automatik 7 saat selepas ia muncul (t=12s) supaya tak ganggu fokus
    const hideDelay = setTimeout(() => {
      setShowHint(false);
    }, 12000); 

    return () => {
      clearTimeout(showDelay);
      clearTimeout(hideDelay);
    };
  }, [isOpen, allowAiChat, location.pathname, getHints]);

  // ── Fetch dynamic context when opened ───────────────────────────────────
  useEffect(() => {
    if (isOpen && profile?.id) {
      const fetchContext = async () => {
        try {
          // 1. Get Base Notifications & JPP Organization List (Global)
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

          // ─ 2A. DATA KELAB (End-User) ──────────────────────────
          if (p.startsWith('/kelab') || p.startsWith('/aktiviti') || p === '/') {
            const targetClubId = selectedClubId || profile.club_id;
            if (targetClubId) {
              const { data: club } = await supabase.from('clubs').select('name, members_count').eq('id', targetClubId).single();
              if (club) {
                const { count: pr } = await supabase.from('club_reports').select('id', { count: 'exact', head: true }).eq('club_id', targetClubId).eq('status', 'draft');
                ctx.clubInfo = { name: club.name, membersCount: club.members_count, pendingReports: pr || 0 };

                const { data: progs } = await supabase.from('programs').select('nama_program, tarikh_mula, location')
                  .eq('club_id', targetClubId).not('status', 'eq', 'COMPLETED').order('tarikh_mula', { ascending: true }).limit(3);
                if (progs?.length) ctx.upcomingPrograms = progs.map(pr => `- ${pr.nama_program} (${pr.tarikh_mula || 'TBA'})`).join('\n');

                const { data: ldrs } = await supabase.from('profiles').select('full_name, role')
                  .eq('club_id', targetClubId).in('role', ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT']).limit(5);
                if (ldrs?.length) ctx.committee = ldrs.map(l => `- ${l.full_name} (${l.role})`).join('\n');
                
                const { count: tsks } = await supabase.from('club_tasks').select('id', { count: 'exact', head: true })
                  .eq('assigned_to', profile.id).eq('club_id', targetClubId).eq('status', 'ACTIVE');
                ctx.pendingTasksCount = tsks || 0;
              }
            }
          } 
          // ─ 2B. DATA E-AKADEMIK ────────────────────────────────
          else if (p.startsWith('/akademik')) {
            const [cgpaRes, meritRes, unlockRes] = await Promise.all([
              supabase.from('akademik_cgpa_records').select('cgpa').eq('user_id', profile.id).order('semester', { ascending: false }).limit(1).maybeSingle(),
              supabase.from('akademik_pencapaian').select('merit_override').eq('user_id', profile.id).eq('status', 'APPROVED'),
              supabase.from('akademik_unlock_requests').select('status').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
            ]);
            const totalMerits = meritRes.data?.reduce((acc: number, curr: any) => acc + (curr.merit_override || 0), 0) || 0;
            ctx.akademikInfo = {
              cgpa: cgpaRes.data?.cgpa,
              meritPoints: totalMerits,
              statusUnlock: unlockRes.data?.status || 'Tiada Request'
            };
          }
          // ─ 2C. DATA E-KEUSAHAWANAN ────────────────────────────
          else if (p.startsWith('/keusahawanan')) {
             const { data: memberships } = await supabase.from('student_business_memberships')
               .select('business_id, role, status, business:keusahawanan_businesses(name)')
               .eq('user_id', profile.id)
               .eq('status', 'ACTIVE')
               .limit(1).maybeSingle();
             
             if (memberships?.business) {
               // Live data fetching
               const startOfDay = new Date();
               startOfDay.setHours(0, 0, 0, 0);

               const [txsRes, stockRes] = await Promise.all([
                 supabase.from('business_transactions')
                   .select('total_amount')
                   .eq('business_id', memberships.business_id)
                   .gte('created_at', startOfDay.toISOString()),
                 supabase.from('business_products')
                   .select('id', { count: 'exact', head: true })
                   .eq('business_id', memberships.business_id)
                   .lt('stock_quantity', 5)
               ]);

               const todaySales = txsRes.data?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
               const lowStockCount = stockRes.count || 0;

               ctx.keusahawananInfo = {
                 shopName: (memberships.business as any).name,
                 isManager: memberships.role === 'MANAGER' || memberships.role === 'OWNER',
                 activeShifts: 'Disembunyikan (Lazy Loaded)',
                 todaySales,
                 lowStockCount
               };
             } else {
               ctx.keusahawananInfo = { shopName: 'Bukan Ahli', isManager: false };
             }
          }
          // ─ 2D. DATA JPP HQ ────────────────────────────────────
          else if (p.startsWith('/jpp')) {
             const { count: pdgReports } = await supabase.from('club_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending');
             const { count: pdgMerits }  = await supabase.from('akademik_pencapaian').select('id', { count: 'exact', head: true }).eq('status', 'PENDING');
             ctx.jppHqInfo = {
               totalPendingReports: pdgReports || 0,
               totalMeritPending: pdgMerits || 0
             };
          }
          // ─ 2E. DATA E-KEBAJIKAN ────────────────────────────────
          else if (p.startsWith('/kebajikan') || p.startsWith('/jpp/unit/kebajikan')) {
            if (profile.role === 'SUPER_ADMIN_JPP' || (profile.role === 'JPP' && profile.jpp_unit === 'KEBAJIKAN')) {
              // ── Rich Exco context: 8 parallel queries ──
              const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
              const monthAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
              const ageHours = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);

              const [
                urgentRes, warningCount, escalatedCount,
                assignedRes, unassignedCount, resolvedWeekCount,
                categoryRes, slaRes
              ] = await Promise.all([
                supabase.from('kebajikan_tickets')
                  .select('ticket_no, title, category, status, created_at')
                  .in('status', ['NEW', 'ESCALATED', 'REOPENED'])
                  .order('created_at', { ascending: true }).limit(7),
                supabase.from('kebajikan_tickets')
                  .select('id', { count: 'exact', head: true }).eq('status', 'WARNING'),
                supabase.from('kebajikan_tickets')
                  .select('id', { count: 'exact', head: true }).eq('status', 'ESCALATED'),
                supabase.from('kebajikan_tickets')
                  .select('ticket_no, title, status, created_at')
                  .eq('assigned_to', profile.id)
                  .not('status', 'in', '("RESOLVED","CLOSED","CANCELLED")')
                  .order('created_at', { ascending: true }).limit(5),
                supabase.from('kebajikan_tickets')
                  .select('id', { count: 'exact', head: true })
                  .is('assigned_to', null)
                  .not('status', 'in', '("RESOLVED","CLOSED","CANCELLED")'),
                supabase.from('kebajikan_tickets')
                  .select('id', { count: 'exact', head: true })
                  .eq('status', 'RESOLVED').gte('updated_at', weekAgo),
                supabase.from('kebajikan_tickets')
                  .select('category').gte('created_at', monthAgo),
                supabase.from('kebajikan_settings')
                  .select('sla_warning_hours, sla_escalate_hours').limit(1).maybeSingle(),
              ]);

              // Format urgent list
              const urgentList = urgentRes.data?.map(t =>
                `  • [${t.ticket_no}] ${t.title} | ${t.category || 'UMUM'} | ${t.status} | ${ageHours(t.created_at)}j lalu`
              ).join('\n') || 'Tiada';

              // Format my assigned list
              const assignedList = assignedRes.data?.map(t =>
                `  • [${t.ticket_no}] ${t.title} | ${t.status} | ${ageHours(t.created_at)}j lalu`
              ).join('\n') || 'Tiada';

              // Top category this month
              const catMap: Record<string, number> = {};
              categoryRes.data?.forEach((t: any) => {
                if (t.category) catMap[t.category] = (catMap[t.category] || 0) + 1;
              });
              const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

              ctx.kebajikanInfo = {
                role: 'EXCO/ADMIN',
                urgentTicketsUnresolved: urgentRes.data?.length || 0,
                urgentTicketsList: urgentList,
                totalWarning: warningCount.count || 0,
                totalEscalated: escalatedCount.count || 0,
                assignedToMe: assignedRes.data?.length || 0,
                assignedToMeList: assignedList,
                unassignedCount: unassignedCount.count || 0,
                resolvedThisWeek: resolvedWeekCount.count || 0,
                topCategoryThisMonth: topCat ? `${topCat[0]} (${topCat[1]} aduan)` : 'Tiada data',
                slaConfig: slaRes.data
                  ? `Warning: ${slaRes.data.sla_warning_hours}j, Escalation: ${slaRes.data.sla_escalate_hours}j`
                  : 'Warning: 48j, Escalation: 72j',
              };

              // ─ If on ticket detail page, fetch that specific ticket's full info ─
              const ticketDetailMatch = p.match(/^\/kebajikan\/(tiket|aduan)\/([^/]+)/);
              const ticketDetailId = ticketDetailMatch?.[2];
              if (ticketDetailId) {
                const { data: tkt } = await supabase
                  .from('kebajikan_tickets')
                  .select('ticket_no, title, description, status, category, created_at, priority')
                  .eq('id', ticketDetailId)
                  .maybeSingle();
                if (tkt) {
                  const tktAge = ageHours(tkt.created_at);
                  ctx.kebajikanInfo.currentTicket = [
                    `Nombor: ${tkt.ticket_no}`,
                    `Tajuk: ${tkt.title}`,
                    `Kategori: ${tkt.category || 'UMUM'}`,
                    `Status: ${tkt.status}`,
                    `Umur: ${tktAge} jam`,
                    tkt.priority ? `Keutamaan: ${tkt.priority}` : '',
                    `Keterangan pelajar: ${tkt.description || 'Tiada keterangan diberikan'}`,
                  ].filter(Boolean).join(' | ');
                }
              }
            } else {
              const { data: myTkts } = await supabase.from('kebajikan_tickets').select('ticket_no, status, title').eq('submitter_id', profile.id).order('created_at', { ascending: false }).limit(3);
              const { count: activeCount } = await supabase.from('kebajikan_tickets').select('id', { count: 'exact', head: true }).eq('submitter_id', profile.id).not('status', 'in', '("RESOLVED", "CLOSED", "CANCELLED")');

              ctx.kebajikanInfo = {
                role: 'PELAJAR',
                activeTicketsCount: activeCount || 0,
                recentTickets: myTkts?.map(t => `- [${t.ticket_no}] ${t.title} (${t.status})`).join('\n') || 'Tiada tiket difailkan'
              };
            }
          }
          // ─ 2F. DATA POLYMART ────────────────────────────────
          else if (p.startsWith('/polymart')) {
             const { count: buyerCount } = await supabase.from('polymart_orders').select('id', { count: 'exact', head: true }).eq('buyer_id', profile.id).not('status', 'in', '("COMPLETED", "CANCELLED", "REJECTED")');
             const { data: myOrders } = await supabase.from('polymart_orders').select('status, total_amount, keusahawanan_businesses(name)').eq('buyer_id', profile.id).not('status', 'in', '("COMPLETED", "CANCELLED", "REJECTED")').limit(2);
             
             // Check if vendor
             const { data: myShops } = await supabase.from('keusahawanan_businesses').select('id, name').eq('owner_id', profile.id).eq('status', 'ACTIVE');
             let pendingVendorOrders = 0;
             if (myShops && myShops.length > 0) {
               const shopIds = myShops.map((s: any) => s.id);
               const { count: vendorCount } = await supabase.from('polymart_orders').select('id', { count: 'exact', head: true }).in('business_id', shopIds).eq('status', 'PENDING');
               pendingVendorOrders = vendorCount || 0;
             }

             ctx.polymartInfo = {
               userType: myShops && myShops.length > 0 ? `Vendor (${myShops.map((s: any) => s.name).join(', ')})` : 'Pelanggan Biasa',
               activePurchases: buyerCount || 0,
               recentPurchases: myOrders?.map((o: any) => `- RM${o.total_amount} di ${(o.keusahawanan_businesses as any)?.name} (${o.status})`).join('\n') || 'Tiada pesanan aktif',
               pendingIncomingOrders: pendingVendorOrders,
               systemNote: 'PolyMart ialah platform Request-to-Order PERCUMA. Pelanggan memohon beli produk kawan kampus, vendor mengesahkannya. Pembayaran TIDAK DIBUAT secara online dalam sistem (hanya COD manual atau Cash/QR semasa berjumpa).'
             };
          }
          // ─ 3. GLOBAL: TAKWIM BERPUSAT (access-scoped) ────────
          try {
            const today = new Date().toISOString().split('T')[0];
            const isJPP = profile.role === 'JPP' || profile.role === 'SUPER_ADMIN_JPP';
            const accessScope = isJPP ? 'JPP_FULL' : 'STUDENT';

            // ── 3A. Upcoming takwim (limit 10 for token efficiency) ──
            let takwimQuery = supabase
              .from('takwim_pusat')
              .select('tajuk, jenis, tarikh_mula, tarikh_tamat, catatan, bil_minggu, kelab_kediaman_label')
              .gte('tarikh_mula', today)
              .order('tarikh_mula', { ascending: true })
              .limit(10);

            // Access-scoping: students cannot see KELAB_KEDIAMAN entries
            if (!isJPP) {
              takwimQuery = takwimQuery.neq('jenis', 'KELAB_KEDIAMAN');
            }

            // ── 3B. Past events (last 5 before today) for historical queries ──
            let pastQuery = supabase
              .from('takwim_pusat')
              .select('tajuk, jenis, tarikh_mula, tarikh_tamat, catatan, bil_minggu')
              .lt('tarikh_mula', today)
              .order('tarikh_mula', { ascending: false })
              .limit(5);

            if (!isJPP) {
              pastQuery = pastQuery.neq('jenis', 'KELAB_KEDIAMAN');
            }

            const [{ data: takwimRows }, { data: pastRows }] = await Promise.all([
              takwimQuery,
              pastQuery,
            ]);

            const formatRow = (t: any, showKelabLabel = true) => {
              const dateStr = t.tarikh_tamat && t.tarikh_tamat !== t.tarikh_mula
                ? `${t.tarikh_mula} ~ ${t.tarikh_tamat}`
                : t.tarikh_mula;
              const minggu = t.bil_minggu ? ` (Minggu ${t.bil_minggu})` : '';
              const catatan = t.catatan ? ` — ${t.catatan}` : '';
              const kelabLabel = showKelabLabel && t.kelab_kediaman_label ? ` [${t.kelab_kediaman_label}]` : '';
              return `- ${t.tajuk} (${t.jenis}${kelabLabel}) — ${dateStr}${minggu}${catatan}`;
            };

            if ((takwimRows && takwimRows.length > 0) || (pastRows && pastRows.length > 0)) {
              const events: string[] = [];
              const cuti: string[] = [];

              takwimRows?.forEach((t: any) => {
                if (t.jenis === 'CUTI_UMUM') {
                  const dateStr = t.tarikh_tamat && t.tarikh_tamat !== t.tarikh_mula
                    ? `${t.tarikh_mula} ~ ${t.tarikh_tamat}`
                    : t.tarikh_mula;
                  cuti.push(`- ${t.tajuk} — ${dateStr}${t.catatan ? ' — ' + t.catatan : ''}`);
                } else {
                  events.push(formatRow(t));
                }
              });

              const pastFormatted = pastRows
                ?.filter((t: any) => t.jenis !== 'CUTI_UMUM')
                .map((t: any) => formatRow(t))
                .join('\n');

              ctx.takwimInfo = {
                upcomingEvents: events.length > 0 ? events.join('\n') : undefined,
                pastEvents: pastFormatted || undefined,
                upcomingCuti: cuti.length > 0 ? cuti.join('\n') : undefined,
                totalUpcoming: takwimRows?.length || 0,
                accessScope,
              };
            }

            // ── 3C. Club-specific programs (only for registered members) ──
            // Fetch all clubs the user is a member of (active)
            const { data: memberships } = await supabase
              .from('student_club_memberships')
              .select('club_id, clubs(name)')
              .eq('user_id', profile.id)
              .eq('account_status', 'ACTIVE');

            if (memberships && memberships.length > 0) {
              const clubIds = memberships.map((m: any) => m.club_id);
              const clubNames = memberships.map((m: any) => (m.clubs as any)?.name || m.club_id).join(', ');

              const { data: clubProgs } = await supabase
                .from('programs')
                .select('nama_program, tarikh_mula, tarikh_tamat, location, status, club_id')
                .in('club_id', clubIds)
                .gte('tarikh_mula', today)
                .not('status', 'eq', 'COMPLETED')
                .not('status', 'eq', 'CANCELLED')
                .order('tarikh_mula', { ascending: true })
                .limit(8);

              if (clubProgs && clubProgs.length > 0) {
                const formatted = clubProgs.map((p: any) => {
                  const dateStr = p.tarikh_tamat && p.tarikh_tamat !== p.tarikh_mula
                    ? `${p.tarikh_mula} ~ ${p.tarikh_tamat}`
                    : p.tarikh_mula;
                  const loc = p.location ? ` @ ${p.location}` : '';
                  // Find which club this program belongs to
                  const memberClub = memberships.find((m: any) => m.club_id === p.club_id);
                  const clubLabel = memberClub ? ` [${(memberClub.clubs as any)?.name || p.club_id}]` : '';
                  return `- ${p.nama_program}${clubLabel} — ${dateStr}${loc} (${p.status})`;
                }).join('\n');

                ctx.takwimInfo = {
                  ...ctx.takwimInfo,
                  clubPrograms: formatted,
                  clubProgramsName: clubNames,
                };
              }
            }
          } catch (takwimErr) {
            console.warn('Takwim context fetch failed:', takwimErr);
          }

          setChatContext(ctx);
        } catch (err) {
          console.error('Failed to fetch chat context:', err);
        }
      };
      fetchContext();
    }
  }, [isOpen, profile?.id, location.pathname, selectedClubId, positionLabels, unitLabels]);

  // ── Clear history ────────────────────────────────────────────────────────
  const clearHistory = () => {
    setMessages([]);
    clearStoredMessages();
  };

  // ── Send free-text message ───────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isChatLoading) return;

    // 1. Clear input immediately
    setInputValue('');

    // 2. Build user message object manually
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    // 3. Append user message to state
    setMessages((prev) => [...prev, userMsg]);

    // 4. Build API history from messagesRef (always up-to-date, no stale closure)
    //    Include the new userMsg so the API has full context
    const historyForApi = [
      ...messagesRef.current.filter((m) => m.role !== 'error'),
      userMsg,
    ];

    // 5. Call API — route to Exco AI if applicable
    const isExcoOnKebajikan = hasKebajikanAccess && location.pathname.startsWith('/kebajikan');
    let aiText = isExcoOnKebajikan
      ? await sendKebajikanExcoMessage(text, historyForApi, chatContext || undefined)
      : await sendChatMessage(text, historyForApi, chatContext || undefined);

    // ── Smart Routing Interceptor ──
    if (aiText) {
      const navMatch = aiText.match(/\[NAVIGATE:([^\]]+)\]/);
      if (navMatch && navMatch[1]) {
        const targetRoute = navMatch[1].trim();
        // Remove the command tag from the text displayed to the user
        aiText = aiText.replace(/\[NAVIGATE:([^\]]+)\]/g, '').trim();
        // Trigger navigation after a short delay to allow reading
        setTimeout(() => {
          navigate(targetRoute);
        }, 1500);
      }
    }

    // 6. Append AI or error response
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

  // ── Copy to clipboard ────────────────────────────────────────────────────
  const handleCopy = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!allowAiChat) return null;

  // Derived loading states for UI
  const isBusy = isChatLoading || isActionLoading;

  // ── Derived state ─────────────────────────────────────────────────────────
  const isPolymart = location.pathname.startsWith('/polymart');
  const isKebajikanChat = location.pathname.match(/^\/kebajikan\/(tiket|aduan)\/[^/]+/);
  const isExcoMode = hasKebajikanAccess && location.pathname.startsWith('/kebajikan');
  
  const bottomMarginClass = isKebajikanChat 
    ? 'mb-24'
    : isPolymart 
    ? 'max-md:mb-16'
    : '';

  // ── Exco quick-action chips ──────────────────────────────────────────────
  const EXCO_CHIPS: { icon: string; label: string; prompt: string }[] = [
    {
      icon: '💬',
      label: 'Berikan Pendapat',
      prompt: chatContext?.kebajikanInfo?.currentTicket
        ? `Saya sedang melihat tiket ini:\n${chatContext.kebajikanInfo.currentTicket}\n\nBerikan pendapat anda: apakah punca masalah yang paling munasabah dan apakah langkah-langkah konkrit untuk menyelesaikannya? Siapa yang patut dipertanggungjawabkan?`
        : 'Berdasarkan situasi semasa, berikan pendapat anda tentang apa yang perlu saya lakukan sekarang sebagai Exco Kebajikan.',
    },
    { icon: '📊', label: 'Analisis Hari Ini', prompt: 'Bagi saya ringkasan situasi tiket hari ini dan cadangan tindakan segera.' },
    { icon: '⚠️', label: 'Tiket Urgent', prompt: 'Senaraikan tiket yang paling kritikal dan cadangkan tindakan yang perlu diambil.' },
    { icon: '📝', label: 'Draft Balasan', prompt: 'Bantu saya draf balasan profesional untuk tiket yang masih belum dibalas.' },
    { icon: '📈', label: 'Trend Aduan', prompt: 'Apa trend aduan bulan ini? Ada pattern yang perlu diberi perhatian?' },
    { icon: '📋', label: 'Laporan Ringkas', prompt: 'Jana laporan status ringkas yang boleh saya kongsikan dalam mesyuarat.' },
  ];

  const KEUSAHAWANAN_CHIPS: { icon: string; label: string; prompt: string }[] = [
    { icon: '💰', label: 'Ringkasan Jualan', prompt: 'Berapa total jualan hari ini dan ada produk kurang stok?' },
    { icon: '🛒', label: 'Cara Guna POS', prompt: 'Boleh ajar macam mana nak buat transaksi POS?' },
    { icon: '⏰', label: 'Urus Syif', prompt: 'Bagaimana cara nak rekod syif masuk kerja?' },
    { icon: '📊', label: 'Laporan', prompt: 'Di mana nak semak rekod transaksi lepas?' },
    { icon: '💡', label: 'Idea Bisnes', prompt: 'Ada cadangan bisnes menarik untuk student kampus?' }
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  const content = (
    <div className={`fixed max-md:bottom-28 bottom-6 right-4 md:right-6 z-[120] transition-all duration-300 ease-in-out ${bottomMarginClass}`}>
      {/* ── FAB trigger ── */}
      <motion.button
        id="nexus-chat-fab"
        initial={false}
        animate={{ 
          scale: !isOpen && isScrolled ? 0.85 : 1, 
          opacity: !isOpen && isScrolled ? 0.6 : 1,
          x: !isOpen && isScrolled ? 10 : 0
        }}
        whileHover={{ scale: 1.05, opacity: 1, x: 0 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 text-white relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span key="x" initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 90, scale: 0 }} transition={{ duration: 0.18 }}>
              <X size={26} />
            </motion.span>
          ) : (
            <motion.span key="s" initial={{ rotate: 90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: -90, scale: 0 }} transition={{ duration: 0.18 }}>
              <Sparkles size={26} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Context-Aware Hover Hint ── */}
      <AnimatePresence>
        {!isOpen && showHint && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="absolute right-[110%] top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block md:w-max max-w-[200px]"
          >
            {/* Desktop Version */}
            <div className="relative">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[9px] font-medium py-1.5 px-3 rounded-2xl rounded-tr-sm shadow-xl shadow-indigo-600/20 backdrop-blur-md border border-white/10 flex items-center gap-2">
                <Sparkles size={10} className="text-indigo-200 shrink-0" />
                <span className="leading-tight line-clamp-2">"{getHints()[hintIndex]}"</span>
              </div>
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 bg-violet-600 rotate-45 rounded-sm z-[-1]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && showHint && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="absolute bottom-[calc(100%+12px)] right-0 pointer-events-none sm:hidden w-max max-w-[170px]"
          >
            {/* Mobile Version (Compact & Top) */}
            <div className="relative">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[8px] sm:text-[9px] font-medium py-1 px-2.5 rounded-xl rounded-br-sm shadow-lg shadow-indigo-600/20 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                <Sparkles size={8} className="text-indigo-200 shrink-0" />
                <span className="leading-tight line-clamp-1 truncate w-full">"{getHints()[hintIndex]}"</span>
              </div>
              <div className="absolute -bottom-1 right-3 w-2 h-2 bg-violet-600 rotate-45 rounded-sm z-[-1]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat panel — controlled div (not Popover) to prevent auto-dismiss ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-[4.5rem] right-0 w-[calc(100vw-2rem)] sm:w-80 md:w-96 rounded-[2.5rem] shadow-2xl bg-card overflow-hidden flex flex-col"
            style={{ height: 'min(580px, calc(100dvh - 12rem))', border: 'none' }}
          >
            {/* Header */}
            <div className={`p-5 text-white relative shrink-0 flex items-center justify-between ${
              isExcoMode
                ? 'bg-gradient-to-r from-teal-700 to-emerald-600'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-black text-lg italic flex items-center gap-2">
                  <Sparkles size={18} className={isExcoMode ? 'text-teal-200' : 'text-violet-200'} />
                  {isExcoMode ? 'Kebajikan AI' : 'JPP Nexus'}
                </h3>
                <p className="text-[11px] text-white/70 font-medium mt-0.5">
                  {isExcoMode ? 'Pembantu peribadi Exco Kebajikan POLISAS' : 'Pembantu pintar rasmi POLISAS'}
                </p>
              </div>
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
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth">

              {/* Welcome card — always pinned at top */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={14} />
                </div>
                <div className="bg-card border border-border/50 p-4 rounded-2xl rounded-tl-sm text-sm text-foreground shadow-sm flex-1">
                  <p className="font-bold mb-1">{isExcoMode ? `Hai ${getMalaysianNickname(profile?.full_name)}! 🛡️` : `Hai ${getMalaysianNickname(profile?.full_name)}! 👋`}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {isExcoMode
                      ? "Saya penasihat AI peribadi anda. Tanya apa sahaja — analisis tiket, draf surat, atau sekadar minta pendapat. Sedia membantu!"
                      : "Saya pembantu AI JPP anda. Sila tanya apa sahaja soalan berkaitan kelab atau aktiviti POLISAS!"
                    }
                  </p>
                </div>
              </motion.div>

              {/* Message feed */}
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
                    {/* AI / Error avatar */}
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
                      {/* Bubble */}
                      <div className={`relative group px-4 py-3 rounded-2xl text-sm shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm'
                          : msg.role === 'error'
                          ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-tl-sm'
                          : 'bg-card border border-border/50 text-foreground rounded-tl-sm'
                      }`}>
                        {msg.role === 'ai' ? (
                          <div className="prose prose-sm dark:prose-invert prose-headings:font-black prose-p:leading-snug max-w-none overflow-hidden">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}

                        {/* Copy button — AI messages only */}
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
                      {/* Timestamp */}
                      <span className="text-[10px] text-muted-foreground/50 mt-0.5 px-1">{fmt(msg.timestamp)}</span>
                    </div>

                    {/* User avatar */}
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0 mt-1 text-[11px] font-black">
                        {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Animated typing indicator — shown only during chat loading */}
              <AnimatePresence>
                {isChatLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0 mt-1">
                      <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                    <div className="bg-card border border-border/50 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[38px]">
                      {retryCount > 0 ? (
                        <span className="text-[11px] font-bold animate-pulse text-amber-500">Percubaan {retryCount}/3...</span>
                      ) : (
                        [0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                            animate={{ y: [0, -5, 0] }}
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

            {/* Input area */}
            <div className="p-3 bg-background border-t border-border/50 shrink-0">
              {/* Exco quick-action chips */}
              {isExcoMode && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                  {EXCO_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => setInputValue(chip.prompt)}
                      disabled={isChatLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all border shrink-0"
                      style={{
                        background: 'rgba(45,212,191,0.08)',
                        borderColor: 'rgba(45,212,191,0.25)',
                        color: '#2DD4BF',
                      }}
                    >
                      <span>{chip.icon}</span>
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Keusahawanan quick-action chips */}
              {location.pathname.startsWith('/keusahawanan') && !isExcoMode && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                  {KEUSAHAWANAN_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => setInputValue(chip.prompt)}
                      disabled={isChatLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all border shrink-0"
                      style={{
                        background: 'rgba(99,102,241,0.08)', // indigo-500 tint
                        borderColor: 'rgba(99,102,241,0.25)',
                        color: '#6366f1',
                      }}
                    >
                      <span>{chip.icon}</span>
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Tanya sesuatu... (Shift+Enter = baris baru)"
                  rows={1}
                  maxLength={700}
                  disabled={isChatLoading}
                  className="flex-1 text-sm bg-muted/30 border border-border focus:border-indigo-500 rounded-2xl py-3 px-4 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-muted-foreground/50 overflow-y-auto"
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
                  disabled={isChatLoading || !inputValue.trim()}
                  className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-muted disabled:text-muted-foreground text-white rounded-2xl flex items-center justify-center transition-colors shrink-0 disabled:cursor-not-allowed"
                  title="Hantar (Enter)"
                >
                  <Send size={16} className={inputValue.trim() && !isChatLoading ? 'ml-0.5' : ''} />
                </motion.button>
              </div>
              {inputValue.length > 500 && (
                <p className={`text-[10px] text-right mt-1 font-medium ${inputValue.length >= 650 ? 'text-red-500' : 'text-muted-foreground/60'}`}>
                  {inputValue.length} / 700
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(content, document.body);
}
