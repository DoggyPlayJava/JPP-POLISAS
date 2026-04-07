import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, FileLineChart, Send, ShieldAlert,
  Trash2, Copy, Check, FileText, BookOpen, Megaphone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAiAssistant, ChatMessage, ChatContext } from '@/hooks/useAiAssistant';
import { useAiSettings } from '@/contexts/AiSettingsContext';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

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

// ─── Quick actions config ───────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id: 'analyze',
    label: 'Analisis Kelab',
    icon: FileLineChart,
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600',
    border: 'border-indigo-500/20',
    committeeOnly: true,
    task: 'analyze_performance' as const,
  },
  {
    id: 'suggest',
    label: 'Cadangan Aktiviti',
    icon: Sparkles,
    bg: 'bg-violet-500/10',
    text: 'text-violet-600',
    border: 'border-violet-500/20',
    committeeOnly: false,
    task: 'suggest_program' as const,
  },
  {
    id: 'draft',
    label: 'Draf Kertas Kerja',
    icon: FileText,
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/20',
    committeeOnly: true,
    scaffold: 'Tolong bantu saya buat draf kertas kerja untuk program: [NAMA PROGRAM]',
  },
  {
    id: 'summarize',
    label: 'Rumuskan Laporan Bulanan',
    icon: BookOpen,
    bg: 'bg-teal-500/10',
    text: 'text-teal-600',
    border: 'border-teal-500/20',
    committeeOnly: true,
    scaffold: 'Boleh tolong rumuskan laporan bulanan untuk program: [NAMA PROGRAM]',
  },
  {
    id: 'announce',
    label: 'Cadangan Pengumuman',
    icon: Megaphone,
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
    border: 'border-orange-500/20',
    committeeOnly: true,
    scaffold: 'Bantu saya buat teks pengumuman rasmi untuk: [TAJUK PENGUMUMAN]',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function FloatingAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);

  const { profile, isSuperAdmin, isAdvisor, isPresident, isMT, selectedClubId } = useAuth();
  const { callAi, sendChatMessage, isLoading: isActionLoading, isChatLoading } = useAiAssistant();
  const { allowAiChat } = useAiSettings();
  const location = useLocation();

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

  const isCommittee = isSuperAdmin || isAdvisor || isPresident || isMT;
  const visibleActions = QUICK_ACTIONS.filter((a) => !a.committeeOnly || isCommittee);

  // ── Single message appender — always functional update, never stale ──────
  const appendMsg = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
    const newMsg: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
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

  // ── Fetch dynamic context when opened ───────────────────────────────────
  useEffect(() => {
    if (isOpen && profile?.id) {
      const fetchContext = async () => {
        try {
          // 1. Get notifications
          const { data: notos } = await supabase
            .from('notifications')
            .select('title, content')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(3);

          // 2. Get club metadata if applicable
          let clubMeta = undefined;
          const targetClubId = selectedClubId ?? profile.club_id;
          
          if (targetClubId) {
            const { data: club } = await supabase
              .from('clubs')
              .select('name, members_count')
              .eq('id', targetClubId)
              .single();
            
            if (club) {
              // Get pending reports count
              const { count: pendingReports } = await supabase
                .from('activity_reports')
                .select('*', { count: 'exact', head: true })
                .eq('club_id', targetClubId)
                .eq('status', 'draft');

              clubMeta = {
                name: club.name,
                membersCount: club.members_count,
                pendingReports: pendingReports || 0
              };
            }
          }

          setChatContext({
            currentPage: location.pathname,
            userRole: profile.role,
            recentNotifications: notos?.map(n => n.title) || [],
            clubInfo: clubMeta
          });
        } catch (err) {
          console.error('Failed to fetch chat context:', err);
        }
      };
      fetchContext();
    }
  }, [isOpen, profile?.id, location.pathname, selectedClubId]);

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
      id: crypto.randomUUID(),
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

    // 5. Call API
    const aiText = await sendChatMessage(text, historyForApi, chatContext || undefined);

    // 6. Append AI or error response
    if (aiText) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'ai',
          content: aiText,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'error',
          content: 'Sistem sedang sibuk. Sila cuba lagi sebentar!',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // ── Quick action ─────────────────────────────────────────────────────────
  const handleQuickAction = async (action: typeof QUICK_ACTIONS[0]) => {
    // Scaffold-prompt: inject template into textarea
    if ('scaffold' in action && action.scaffold) {
      setInputValue(action.scaffold);
      setTimeout(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        const start = action.scaffold!.indexOf('[');
        const end = action.scaffold!.indexOf(']') + 1;
        el.setSelectionRange(start, end);
      }, 50);
      return;
    }

    // Direct API action
    appendMsg({ role: 'user', content: `📊 ${action.label}` });

    let res: string | null = null;
    if (action.task === 'analyze_performance') {
      const clubId = selectedClubId ?? profile?.club_id;
      if (!clubId) {
        appendMsg({ role: 'error', content: 'Sila pilih sebuah kelab dahulu melalui menu utama sebelum menjalankan analisis.' });
        return;
      }
      res = await callAi({ task: 'analyze_performance', clubId });
    } else if (action.task === 'suggest_program') {
      res = await callAi({ task: 'suggest_program', data: { fokus: 'Meningkatkan perpaduan dan penyertaan pelajar POLISAS' } });
    }

    if (res) {
      appendMsg({ role: 'ai', content: res });
    } else {
      appendMsg({ role: 'error', content: 'Sistem sedang sibuk. Sila cuba sekali lagi!' });
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[120]">
      {/* ── FAB trigger ── */}
      <motion.button
        id="nexus-chat-fab"
        whileHover={{ scale: 1.05 }}
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
            className="absolute bottom-[4.5rem] right-0 w-80 md:w-96 rounded-[2rem] shadow-2xl bg-card overflow-hidden flex flex-col"
            style={{ height: '580px', border: 'none' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white relative shrink-0 flex items-center justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-black text-lg italic flex items-center gap-2">
                  <Sparkles size={18} className="text-violet-200" /> JPP Nexus
                </h3>
                <p className="text-[11px] text-violet-100/80 font-medium mt-0.5">Pembantu pintar rasmi POLISAS</p>
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
                  <p className="font-bold mb-1">Hai {profile?.full_name?.split(' ')[0] ?? 'Pelajar'}! 👋</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Saya pembantu AI JPP anda. Pilih tindakan pantas atau tanya apa sahaja!
                  </p>
                  {/* Quick-action grid */}
                  <div className={`grid gap-2 mt-3 ${visibleActions.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {visibleActions.map((action) => (
                      <motion.button
                        key={action.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleQuickAction(action)}
                        disabled={isBusy}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border ${action.border} ${action.bg} hover:brightness-95 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${action.bg}`}>
                          <action.icon size={13} className={action.text} />
                        </div>
                        <span className={`text-[11px] font-bold leading-tight ${action.text}`}>{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
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
                    <div className="bg-card border border-border/50 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.55, delay: i * 0.13, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-3 bg-background border-t border-border/50 shrink-0">
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
}
