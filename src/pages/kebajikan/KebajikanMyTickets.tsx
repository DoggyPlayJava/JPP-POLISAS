import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, ChevronRight, Clock, CheckCircle2, XCircle, RefreshCw,
  AlertTriangle, HeartHandshake, Star, MessageSquare, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { sendNotificationToKebajikanExco } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import {
  KebajikanTicket, KEBAJIKAN_STATUS_LABELS, KEBAJIKAN_STATUS_COLORS,
  KEBAJIKAN_CATEGORY_LABELS, KEBAJIKAN_THEME_COLOR,
  KebajikanTicketStatus,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { hexToRgba } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/NotificationBell';

const TEAL = KEBAJIKAN_THEME_COLOR;

export function KebajikanMyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<KebajikanTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Rating dialog
  const [ratingTicket, setRatingTicket] = useState<KebajikanTicket | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  // Reopen dialog
  const [reopenTicket, setReopenTicket] = useState<KebajikanTicket | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenLoading, setReopenLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('kebajikan_tickets')
      .select('*')
      .eq('submitter_id', user.id)
      .order('created_at', { ascending: false });
    setTickets((data as KebajikanTicket[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Realtime update for own tickets
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel('mytickets_rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'kebajikan_tickets',
        filter: `submitter_id=eq.${user.id}`,
      }, fetchTickets)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, fetchTickets]);

  const handleCancel = async (t: KebajikanTicket) => {
    if (!confirm('Anda pasti mahu membatalkan aduan ini?')) return;
    await supabase.from('kebajikan_tickets').update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() }).eq('id', t.id);
    await supabase.from('kebajikan_ticket_status_log').insert({ ticket_id: t.id, actor_id: user?.id, actor_role: 'PELAJAR', old_status: 'NEW', new_status: 'CANCELLED', note: 'Dibatal oleh pelajar' });
    fetchTickets();
  };

  const handleReopenRequest = async () => {
    if (!reopenTicket || !reopenReason.trim()) return;
    setReopenLoading(true);
    await supabase.from('kebajikan_tickets').update({ status: 'REOPENED', reopen_reason: reopenReason, reopen_requested_at: new Date().toISOString() }).eq('id', reopenTicket.id);
    await supabase.from('kebajikan_ticket_status_log').insert({ ticket_id: reopenTicket.id, actor_id: user?.id, actor_role: 'PELAJAR', old_status: 'RESOLVED', new_status: 'REOPENED', note: reopenReason });
    await sendNotificationToKebajikanExco({
      title:       'Permintaan Buka Semula Tiket',
      message:     `Tiket ${reopenTicket.ticket_no} diminta dibuka semula. Sebab: ${reopenReason}`,
      type:        'REOPEN_REQUEST',
      module:      'KEBAJIKAN',
      link:        `/kebajikan/tiket/${reopenTicket.id}`,
      reference_id: reopenTicket.id,
    });
    setReopenLoading(false);
    setReopenTicket(null);
    setReopenReason('');
    fetchTickets();
  };

  const handleRating = async () => {
    if (!ratingTicket || rating === 0) return;
    setRatingLoading(true);
    await supabase.from('kebajikan_tickets').update({ rating, rating_comment: ratingComment, rating_at: new Date().toISOString(), status: 'CLOSED' }).eq('id', ratingTicket.id);
    setRatingLoading(false);
    setRatingTicket(null);
    setRating(0);
    setRatingComment('');
    fetchTickets();
  };

  const statusIcon = (s: KebajikanTicketStatus) => {
    if (s === 'RESOLVED' || s === 'CLOSED') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (s === 'ESCALATED') return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (s === 'CANCELLED') return <XCircle className="w-4 h-4 text-slate-400" />;
    return <Clock className="w-4 h-4" style={{ color: TEAL }} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 inset-x-0 h-[400px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2" />
      
      {/* Header */}
      <div className="sticky top-0 z-40 px-6 h-16 flex items-center justify-between border-b border-white/5 bg-slate-950/60 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <HeartHandshake className="w-6 h-6" style={{ color: TEAL }} />
          <div>
            <p className="font-black text-white text-[15px] tracking-tight">Aduan Saya</p>
            <p className="text-[9px] text-teal-400/70 font-black uppercase tracking-[0.2em] mt-0.5">E-Kebajikan</p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <NotificationBell variant="dark" />

          <Link to="/kebajikan/buat-aduan">
            <Button className="h-10 px-5 text-xs font-black uppercase tracking-widest rounded-xl text-slate-950 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(45,212,191,0.2)] transition-all" style={{ background: TEAL }}>
              <Plus className="w-4 h-4 mr-1.5" /> Aduan Baru
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20">
            <HeartHandshake className="w-14 h-14 mx-auto mb-4 opacity-20" style={{ color: TEAL }} />
            <p className="font-black text-white/30 text-sm mb-2">Tiada Aduan Dikemukakan</p>
            <p className="text-xs text-white/20 mb-6">Aduan yang anda kemukakan akan dipaparkan di sini</p>
            <Link to="/kebajikan/buat-aduan">
              <Button className="h-10 px-6 text-xs font-black uppercase tracking-widest rounded-xl text-slate-900" style={{ background: TEAL }}>
                Buat Aduan Pertama
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(t => (
              <motion.div
                key={t.id}
                layout
                className="relative rounded-3xl border border-white/5 overflow-hidden shadow-2xl bg-white/[0.02] backdrop-blur-xl group hover:border-white/10 transition-colors"
              >
                {/* Status Indicator Bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: KEBAJIKAN_STATUS_COLORS[t.status].replace(/text-/g, 'bg-').split(' ')[0] || TEAL }} />
                
                {/* Ticket header */}
                <button
                  className="w-full flex items-start gap-4 p-6 pl-8 text-left hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                >
                  <div className="flex-shrink-0 mt-1">{statusIcon(t.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-base font-black text-white/90 truncate flex-1">{t.title}</span>
                      <span className={cn('text-[9px] font-black px-2.5 py-1 rounded-full flex-shrink-0 uppercase tracking-widest', KEBAJIKAN_STATUS_COLORS[t.status])}>
                        {KEBAJIKAN_STATUS_LABELS[t.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/30">
                      <span className="font-black text-white/50">{t.ticket_no}</span>
                      <span>·</span>
                      <span>{KEBAJIKAN_CATEGORY_LABELS[t.category]}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ms })}</span>
                    </div>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-white/20 flex-shrink-0 transition-transform mt-0.5', expanded === t.id && 'rotate-180')} />
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded === t.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-4">
                        <p className="text-xs text-white/50 leading-relaxed">{t.description}</p>

                        {/* Resolution note */}
                        {t.resolution_note && (
                          <div className="p-3 rounded-xl" style={{ background: hexToRgba('#10B981', 0.08), border: `1px solid ${hexToRgba('#10B981', 0.2)}` }}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Nota Resolusi</p>
                            <p className="text-xs text-white/70">{t.resolution_note}</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {/* Cancel — only if NEW */}
                          {t.status === 'NEW' && (
                            <Button size="sm" variant="outline" onClick={() => handleCancel(t)} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl">
                              <XCircle className="w-3 h-3 mr-1" /> Batal Aduan
                            </Button>
                          )}
                          {/* Rate — if RESOLVED */}
                          {t.status === 'RESOLVED' && !t.rating && (
                            <Button size="sm" onClick={() => setRatingTicket(t)} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl text-slate-900" style={{ background: '#F59E0B' }}>
                              <Star className="w-3 h-3 mr-1" /> Beri Rating
                            </Button>
                          )}
                          {/* Reopen — if RESOLVED */}
                          {t.status === 'RESOLVED' && (
                            <Button size="sm" variant="outline" onClick={() => setReopenTicket(t)} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-white/15 text-white/50 hover:text-white rounded-xl">
                              <RefreshCw className="w-3 h-3 mr-1" /> Buka Semula
                            </Button>
                          )}
                          {/* View comments / chat */}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/kebajikan/aduan/${t.id}`)} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-white/[0.07] text-white/40 hover:text-white rounded-xl">
                            <MessageSquare className="w-3 h-3 mr-1" /> Chat
                          </Button>
                        </div>

                        {/* Existing rating */}
                        {t.rating && (
                          <div className="flex items-center gap-1.5">
                            {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5" fill={s <= t.rating! ? '#F59E0B' : 'transparent'} style={{ color: s <= t.rating! ? '#F59E0B' : 'rgba(255,255,255,0.2)' }} />)}
                            {t.rating_comment && <span className="text-[10px] text-white/30 ml-1">"{t.rating_comment}"</span>}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Rating Dialog */}
      <AnimatePresence>
        {ratingTicket && (
          <Modal onClose={() => setRatingTicket(null)}>
            <p className="font-black text-white text-sm mb-1">Beri Penilaian</p>
            <p className="text-[10px] text-white/40 mb-5">{ratingTicket.ticket_no} · {ratingTicket.title}</p>
            <div className="flex gap-2 justify-center mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star className="w-8 h-8 transition-all" fill={s <= rating ? '#F59E0B' : 'transparent'} style={{ color: s <= rating ? '#F59E0B' : 'rgba(255,255,255,0.2)' }} />
                </button>
              ))}
            </div>
            <Textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="Ulasan anda (opsional)..." rows={3} className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl resize-none mb-4" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRatingTicket(null)} className="flex-1 h-10 rounded-xl text-xs font-black border-white/10 text-white/50">Batal</Button>
              <Button disabled={rating === 0 || ratingLoading} onClick={handleRating} className="flex-1 h-10 rounded-xl text-xs font-black text-slate-900" style={{ background: '#F59E0B' }}>
                {ratingLoading ? 'Menyimpan...' : 'Hantar Rating'}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Reopen Dialog */}
      <AnimatePresence>
        {reopenTicket && (
          <Modal onClose={() => setReopenTicket(null)}>
            <p className="font-black text-white text-sm mb-1">Permintaan Buka Semula</p>
            <p className="text-[10px] text-white/40 mb-5">{reopenTicket.ticket_no}</p>
            <Textarea value={reopenReason} onChange={e => setReopenReason(e.target.value)} placeholder="Nyatakan sebab anda ingin membuka semula aduan ini..." rows={4} className="bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl resize-none mb-4" />
            <p className="text-[10px] text-white/30 mb-4">Permintaan ini akan dihantar kepada Exco Kebajikan untuk kelulusan.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReopenTicket(null)} className="flex-1 h-10 rounded-xl text-xs font-black border-white/10 text-white/50">Batal</Button>
              <Button disabled={!reopenReason.trim() || reopenLoading} onClick={handleReopenRequest} className="flex-1 h-10 rounded-xl text-xs font-black text-slate-900" style={{ background: TEAL }}>
                {reopenLoading ? 'Menghantar...' : 'Hantar Permintaan'}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden bg-slate-900" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 inset-x-0 h-32 bg-teal-500/10 blur-[50px] rounded-full pointer-events-none -translate-y-1/2" />
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
