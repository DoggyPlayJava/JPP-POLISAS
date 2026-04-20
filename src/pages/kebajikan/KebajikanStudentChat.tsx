/**
 * KebajikanStudentChat — Student view of their own ticket.
 * Shows ticket info at top, then a chat-style comment thread below.
 * Students can send public messages. Exco replies appear on the left.
 * Internal (staff-only) comments are hidden from students.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, HeartHandshake, Send, CheckCircle2, Clock,
  AlertTriangle, XCircle, Star, RefreshCw, Lock, Loader2,
  Image as ImageIcon, ShieldCheck, MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ms } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { sendNotificationToKebajikanExco, sendNotificationToUser } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import {
  KebajikanTicket, KebajikanTicketComment,
  KEBAJIKAN_STATUS_LABELS, KEBAJIKAN_STATUS_COLORS,
  KEBAJIKAN_CATEGORY_LABELS, KEBAJIKAN_THEME_COLOR, KebajikanTicketStatus,
} from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hexToRgba } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const TEAL = KEBAJIKAN_THEME_COLOR;

/* ─── helpers ──────────────────────────────────────────────── */
function statusMeta(s: KebajikanTicketStatus) {
  const map: Record<string, { icon: React.ElementType; color: string; glow: string }> = {
    NEW:          { icon: Clock,          color: TEAL,      glow: hexToRgba(TEAL, 0.25) },
    IN_PROGRESS:  { icon: Clock,          color: '#3B82F6', glow: 'rgba(59,130,246,0.25)' },
    WAITING_INFO: { icon: Clock,          color: '#F59E0B', glow: 'rgba(245,158,11,0.25)' },
    DELEGATED:    { icon: ShieldCheck,    color: '#8B5CF6', glow: 'rgba(139,92,246,0.25)' },
    ESCALATED:    { icon: AlertTriangle,  color: '#EF4444', glow: 'rgba(239,68,68,0.25)' },
    REOPENED:     { icon: RefreshCw,      color: '#8B5CF6', glow: 'rgba(139,92,246,0.25)' },
    RESOLVED:     { icon: CheckCircle2,   color: '#10B981', glow: 'rgba(16,185,129,0.25)' },
    CLOSED:       { icon: CheckCircle2,   color: '#6B7280', glow: 'rgba(107,114,128,0.25)' },
    CANCELLED:    { icon: XCircle,        color: '#6B7280', glow: 'rgba(107,114,128,0.25)' },
  };
  return map[s] ?? map.NEW;
}

/* ─── component ──────────────────────────────────────────────── */
export function KebajikanStudentChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [ticket,   setTicket]   = useState<KebajikanTicket | null>(null);
  const [comments, setComments] = useState<KebajikanTicketComment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);

  // Rating
  const [showRating,  setShowRating]  = useState(false);
  const [rating,      setRating]      = useState(0);
  const [ratingNote,  setRatingNote]  = useState('');
  const [ratingBusy,  setRatingBusy]  = useState(false);

  // Reopen
  const [showReopen,  setShowReopen]  = useState(false);
  const [reopenNote,  setReopenNote]  = useState('');
  const [reopenBusy,  setReopenBusy]  = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  /* ─── data fetching ─── */
  const fetchTicket = useCallback(async () => {
    if (!id || !user) return;
    const { data, error } = await supabase
      .from('kebajikan_tickets')
      .select('*')
      .eq('id', id)
      .eq('submitter_id', user.id)
      .single();
    if (error || !data) {
      navigate('/kebajikan/aduan-saya', { replace: true });
      return;
    }
    setTicket(data as KebajikanTicket);
    setLoading(false);
  }, [id, user, navigate]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('kebajikan_ticket_comments')
      .select('*')
      .eq('ticket_id', id)
      .eq('is_internal', false)
      .order('created_at');
    setComments((data as KebajikanTicketComment[]) || []);
  }, [id]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchTicket(), fetchComments()]);
  }, [fetchTicket, fetchComments]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  // scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current?.parentElement) {
      const parent = bottomRef.current.parentElement;
      parent.scrollTo({ top: parent.scrollHeight, behavior: 'smooth' });
    }
  }, [comments]);

  // Realtime — only fetch comments on INSERT (for Exco replies)
  // ticket UPDATE triggers a full fetchAll (status change etc.)
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`student_chat_${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'kebajikan_ticket_comments',
        filter: `ticket_id=eq.${id}`,
      }, (payload) => {
        // Only update from realtime if it's NOT from the current user
        // (our own messages are already added optimistically)
        const incoming = payload.new as KebajikanTicketComment;
        if (incoming.author_id !== user?.id) {
          setComments(prev => {
            // avoid duplicates
            if (prev.some(c => c.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'kebajikan_tickets',
        filter: `id=eq.${id}`,
      }, fetchTicket)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, user?.id, fetchTicket]);

  /* ─── send message (optimistic) ─── */
  const sendMessage = async () => {
    if (!message.trim() || !ticket || !user || sending) return;
    if (['CLOSED', 'CANCELLED', 'RESOLVED'].includes(ticket.status)) {
      toast.error('Tiket ini sudah ditutup. Sila buka semula jika perlu.');
      return;
    }

    const content = message.trim();
    const tempId  = `temp_${Date.now()}`;
    const now     = new Date().toISOString();

    // 1. Optimistic: add to local state immediately
    const optimistic: KebajikanTicketComment = {
      id:              tempId as any,
      ticket_id:       ticket.id,
      author_id:       user.id,
      author_name:     profile?.full_name || 'Pelajar',
      author_role:     'PELAJAR',
      is_internal:     false,
      is_delegation_note: false,
      content,
      attachments:     [],
      created_at:      now,
    };
    setComments(prev => [...prev, optimistic]);
    setMessage('');
    setSending(true);

    // 2. Persist to DB
    const { data: inserted, error } = await supabase
      .from('kebajikan_ticket_comments')
      .insert({
        ticket_id:   ticket.id,
        author_id:   user.id,
        author_name: profile?.full_name || 'Pelajar',
        author_role: 'PELAJAR',
        is_internal: false,
        content,
      })
      .select()
      .single();

    if (error) {
      // rollback
      setComments(prev => prev.filter(c => c.id !== (tempId as any)));
      setMessage(content);
      toast.error('Gagal hantar mesej. Cuba lagi.');
    } else if (inserted) {
      // replace temp with real record
      setComments(prev => prev.map(c => c.id === (tempId as any) ? inserted as KebajikanTicketComment : c));
      // reset SLA timer
      await supabase.from('kebajikan_tickets')
        .update({ updated_at: now })
        .eq('id', ticket.id);
        
      // NOTIFY Exco
      if (ticket.assigned_to) {
        await sendNotificationToUser(ticket.assigned_to, {
          title: `Mesej Baharu daripada Pelajar: ${ticket.ticket_no}`,
          message: `${profile?.full_name || 'Pelajar'}: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`,
          type: 'NEW_MESSAGE',
          module: 'KEBAJIKAN',
          link: `/kebajikan/aduan/${ticket.id}`,
          reference_id: ticket.id,
          actor_name: profile?.full_name || 'Pelajar',
        });
      } else {
        await sendNotificationToKebajikanExco({
          title: `Mesej Baharu daripada Pelajar: ${ticket.ticket_no}`,
          message: `${profile?.full_name || 'Pelajar'}: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`,
          type: 'NEW_MESSAGE',
          module: 'KEBAJIKAN',
          link: `/kebajikan/aduan/${ticket.id}`,
          reference_id: ticket.id,
          actor_name: profile?.full_name || 'Pelajar',
        });
      }
    }
    setSending(false);
  };

  /* submit rating */
  const submitRating = async () => {
    if (!ticket || rating === 0) return;
    setRatingBusy(true);
    await supabase.from('kebajikan_tickets').update({
      rating,
      rating_comment: ratingNote,
      rating_at: new Date().toISOString(),
      status: 'CLOSED',
    }).eq('id', ticket.id);
    await fetchAll();
    setRatingBusy(false);
    setShowRating(false);
    toast.success('Terima kasih atas penilaian anda! ⭐');
  };

  /* reopen request */
  const submitReopen = async () => {
    if (!ticket || !reopenNote.trim()) return;
    setReopenBusy(true);
    await supabase.from('kebajikan_tickets').update({
      status: 'REOPENED',
      reopen_reason: reopenNote,
      reopen_requested_at: new Date().toISOString(),
    }).eq('id', ticket.id);
    await supabase.from('kebajikan_ticket_status_log').insert({
      ticket_id: ticket.id, actor_id: user?.id, actor_role: 'PELAJAR',
      old_status: 'RESOLVED', new_status: 'REOPENED', note: reopenNote,
    });
    await sendNotificationToKebajikanExco({
      title:       `Permintaan Buka Semula: ${ticket.ticket_no}`,
      message:     `Pelajar meminta tiket dibuka semula. Sebab: ${reopenNote}`,
      type:        'REOPEN_REQUEST',
      module:      'KEBAJIKAN',
      link:        `/kebajikan/tiket/${ticket.id}`,
      reference_id: ticket.id,
      actor_name:  profile?.full_name || 'Pelajar',
    });
    setReopenBusy(false);
    setShowReopen(false);
    setReopenNote('');
    toast.success('Permintaan buka semula telah dihantar.');
    await fetchAll();
  };

  /* ─── loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  if (!ticket) return null;

  const meta = statusMeta(ticket.status);
  const Icon = meta.icon;
  const isTerminal = ['CLOSED', 'CANCELLED'].includes(ticket.status);
  const isResolved = ticket.status === 'RESOLVED';
  const canChat = !isTerminal && !isResolved;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1117 100%)' }}>

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-40 flex-shrink-0 border-b border-white/[0.06] backdrop-blur-2xl bg-slate-950/80">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/kebajikan/aduan-saya')}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-teal-400 hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Status icon */}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: hexToRgba(meta.color, 0.12), border: `1px solid ${hexToRgba(meta.color, 0.25)}` }}>
            <Icon className="w-4 h-4" style={{ color: meta.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-slate-100 truncate leading-tight">{ticket.title}</p>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: meta.color }}>
              {ticket.ticket_no} · {KEBAJIKAN_STATUS_LABELS[ticket.status]}
            </p>
          </div>

          <Link to="/kebajikan/buat-aduan">
            <button className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-white/10 text-slate-400 hover:border-teal-500/30 hover:text-teal-400 transition-all">
              + Baru
            </button>
          </Link>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

          {/* ── Ticket info card ── */}
          <div
            className="rounded-3xl p-5 border shadow-2xl relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {/* glow strip */}
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }} />

            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: hexToRgba(meta.color, 0.1), border: `1px solid ${hexToRgba(meta.color, 0.2)}` }}>
                <Icon className="w-5 h-5" style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-50 text-[15px] leading-tight mb-1">{ticket.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest', KEBAJIKAN_STATUS_COLORS[ticket.status])}>
                    {KEBAJIKAN_STATUS_LABELS[ticket.status]}
                  </span>
                  <span className="text-[10px] text-slate-500">{KEBAJIKAN_CATEGORY_LABELS[ticket.category]}</span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ms })}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">{ticket.description}</p>

            {/* Resolution note */}
            {ticket.resolution_note && (
              <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Nota Resolusi Exco
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">{ticket.resolution_note}</p>
              </div>
            )}

            {/* Star rating display */}
            {ticket.rating && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Penilaian Anda</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className="w-3.5 h-3.5" fill={s <= ticket.rating! ? '#F59E0B' : 'transparent'} style={{ color: s <= ticket.rating! ? '#F59E0B' : 'rgba(255,255,255,0.2)' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {(isResolved || isTerminal) && (
              <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-white/[0.05]">
                {(isResolved || ticket.status === 'CLOSED') && !ticket.rating && (
                  <button
                    onClick={() => setShowRating(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <Star className="w-3 h-3" /> Beri Penilaian
                  </button>
                )}
                {isResolved && (
                  <button
                    onClick={() => setShowReopen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border border-white/10 text-slate-400 hover:border-white/20 hover:text-white transition-all"
                  >
                    <RefreshCw className="w-3 h-3" /> Buka Semula
                  </button>
                )}
                {isTerminal && (
                  <Link to="/kebajikan/buat-aduan">
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all" style={{ background: hexToRgba(TEAL, 0.1), color: TEAL, border: `1px solid ${hexToRgba(TEAL, 0.2)}` }}>
                      <HeartHandshake className="w-3 h-3" /> Aduan Baru
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* ── Chat divider ── */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex-1 h-px bg-white/[0.05]" />
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" /> Thread Komunikasi
            </p>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>

          {/* ── Chat messages ── */}
          {comments.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-15" style={{ color: TEAL }} />
              <p className="text-xs text-slate-600 font-medium">Belum ada mesej</p>
              <p className="text-[11px] text-slate-700 mt-1">Hantar mesej di bawah untuk berkomunikasi dengan Exco Kebajikan</p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {comments.map((c, i) => {
                const isMe = c.author_role === 'PELAJAR';
                const isSystem = c.author_role === 'SISTEM';
                const showDate = i === 0 || format(new Date(comments[i-1].created_at), 'ddMMyyyy') !== format(new Date(c.created_at), 'ddMMyyyy');

                return (
                  <React.Fragment key={c.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-white/[0.04]" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 bg-slate-950 px-2">
                          {format(new Date(c.created_at), 'dd MMMM yyyy', { locale: ms })}
                        </p>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                      </div>
                    )}

                    {/* System message — centered */}
                    {isSystem ? (
                      <div className="flex justify-center">
                        <div className="px-4 py-2 rounded-full text-[10px] text-slate-500 border border-white/[0.04] bg-white/[0.02]">
                          {c.content}
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
                      >
                        {/* Avatar */}
                        {!isMe && (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mb-1"
                            style={{ background: hexToRgba(TEAL, 0.15), color: TEAL }}
                          >
                            {c.author_name[0]?.toUpperCase()}
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={cn('max-w-[78%] space-y-1', isMe && 'items-end flex flex-col')}>
                          {!isMe && (
                            <p className="text-[10px] font-black text-slate-500 px-1">{c.author_name}</p>
                          )}
                          <div
                            className={cn('px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg', isMe ? 'rounded-br-sm' : 'rounded-bl-sm')}
                            style={isMe
                              ? { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.2)', color: '#E2E8F0' }
                              : { background: hexToRgba(TEAL, 0.08), border: `1px solid ${hexToRgba(TEAL, 0.15)}`, color: '#E2E8F0' }
                            }
                          >
                            <p className="whitespace-pre-wrap">{c.content}</p>
                          </div>
                          <p className={cn('text-[10px] text-slate-600 px-1', isMe && 'text-right')}>
                            {format(new Date(c.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </React.Fragment>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {/* ── Terminal state notice ── */}
          {(isTerminal || isResolved) && (
            <div className="rounded-2xl p-4 text-center border border-white/[0.05] bg-white/[0.01]">
              <p className="text-[11px] text-slate-600">
                {isResolved
                  ? 'Aduan ini telah diselesaikan. Gunakan butang "Buka Semula" jika masalah masih berterusan.'
                  : 'Aduan ini telah ditutup. Sila kemukakan aduan baru jika memerlukan bantuan lanjut.'
                }
              </p>
            </div>
          )}

          {/* bottom padding for input bar */}
          <div className="h-24" />
        </div>
      </div>

      {/* ── Sticky input bar (only when can chat) ── */}
      {canChat && (
        <div className="flex-shrink-0 sticky bottom-0 z-40 border-t border-white/[0.06] backdrop-blur-2xl bg-slate-950/90">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-end gap-3">
            <div className="flex-1 relative">
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Tulis mesej kepada Exco Kebajikan..."
                rows={1}
                className="w-full resize-none rounded-2xl text-sm border border-white/[0.08] bg-white/[0.03] text-slate-200 placeholder:text-slate-600 focus:border-teal-500/40 focus:ring-0 focus:outline-none transition-colors p-3 pr-4 leading-relaxed"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!message.trim() || sending}
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 shadow-lg"
              style={{ background: TEAL }}
            >
              {sending
                ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                : <Send className="w-4 h-4 text-slate-950" />
              }
            </button>
          </div>
          <p className="text-center text-[9px] text-slate-700 pb-2">Enter untuk hantar · Shift+Enter untuk baris baru</p>
        </div>
      )}

      {/* ══ Rating Dialog ══ */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowRating(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-7 border border-white/10 bg-slate-900 shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 inset-x-0 h-24 opacity-30 rounded-full -translate-y-1/2" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <p className="font-black text-white text-base mb-0.5">Beri Penilaian</p>
                <p className="text-[11px] text-slate-500 mb-6">{ticket.ticket_no} · Bagaimana layanan Exco Kebajikan?</p>

                <div className="flex gap-2 justify-center mb-6">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                      <Star className="w-10 h-10 transition-all duration-200" fill={s <= rating ? '#F59E0B' : 'transparent'} style={{ color: s <= rating ? '#F59E0B' : 'rgba(255,255,255,0.15)', filter: s <= rating ? 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' : 'none' }} />
                    </button>
                  ))}
                </div>

                <Textarea
                  value={ratingNote}
                  onChange={e => setRatingNote(e.target.value)}
                  placeholder="Ulasan anda kepada Exco (opsional)..."
                  rows={3}
                  className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 rounded-2xl resize-none mb-5 text-sm"
                />

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowRating(false)} className="flex-1 h-11 rounded-2xl text-xs font-black border-white/10 text-white/50">
                    Batal
                  </Button>
                  <Button
                    disabled={rating === 0 || ratingBusy}
                    onClick={submitRating}
                    className="flex-1 h-11 rounded-2xl text-xs font-black text-slate-900 shadow-lg"
                    style={{ background: '#F59E0B' }}
                  >
                    {ratingBusy ? 'Menghantar...' : '⭐ Hantar Rating'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Reopen Dialog ══ */}
      <AnimatePresence>
        {showReopen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowReopen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-7 border border-white/10 bg-slate-900 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <p className="font-black text-white text-base mb-0.5">Buka Semula Aduan</p>
              <p className="text-[11px] text-slate-500 mb-5">Nyatakan sebab anda memerlukan aduan ini dibuka semula. Exco akan menilai permintaan anda.</p>
              <Textarea
                value={reopenNote}
                onChange={e => setReopenNote(e.target.value)}
                placeholder="Contoh: Masalah ini berlaku lagi selepas 2 hari..."
                rows={4}
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 rounded-2xl resize-none mb-5 text-sm"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowReopen(false)} className="flex-1 h-11 rounded-2xl text-xs font-black border-white/10 text-white/50">
                  Batal
                </Button>
                <Button
                  disabled={!reopenNote.trim() || reopenBusy}
                  onClick={submitReopen}
                  className="flex-1 h-11 rounded-2xl text-xs font-black text-slate-900"
                  style={{ background: TEAL }}
                >
                  {reopenBusy ? 'Menghantar...' : 'Hantar Permintaan'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
