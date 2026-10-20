import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Clock, CheckCircle2, XCircle, RefreshCw,
  AlertTriangle, HeartHandshake, Star, MessageSquare, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ms, enUS } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { sendNotificationToKebajikanExco } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  KebajikanTicket, KEBAJIKAN_STATUS_LABELS, KEBAJIKAN_STATUS_COLORS,
  KEBAJIKAN_CATEGORY_LABELS, KEBAJIKAN_THEME_COLOR,
  KebajikanTicketStatus,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/ui/NotificationBell';

const TEAL = KEBAJIKAN_THEME_COLOR;

export function KebajikanMyTickets({
  initialTickets = [],
  initialLoading = false,
}: {
  initialTickets?: KebajikanTicket[];
  initialLoading?: boolean;
} = {}) {
  const { t, i18n } = useTranslation(['kebajikan', 'common']);
  const dateLocale = i18n.language?.startsWith('en') ? enUS : ms;
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<KebajikanTicket[]>(initialTickets);
  const [loading, setLoading] = useState(initialLoading);
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

  const handleCancel = async (ticketItem: KebajikanTicket) => {
    if (!confirm(t('kebajikan:my_tickets_confirm_cancel', 'Anda pasti mahu membatalkan aduan ini?'))) return;
    await supabase.from('kebajikan_tickets').update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() }).eq('id', ticketItem.id);
    await supabase.from('kebajikan_ticket_status_log').insert({ ticket_id: ticketItem.id, actor_id: user?.id, actor_role: 'PELAJAR', old_status: 'NEW', new_status: 'CANCELLED', note: t('kebajikan:my_tickets_cancelled_by_student_note', 'Dibatal oleh pelajar') });
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

    // ── EMAIL NOTIFICATION: REOPEN REQUEST ──────────────────────────────
    try {
      const { data: settingsData } = await supabase
        .from('kebajikan_settings')
        .select('email_reopen')
        .limit(1)
        .single();

      if (settingsData?.email_reopen) {
        let emails: string[] = [];
        if (reopenTicket.assigned_to) {
          const { data: exco } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', reopenTicket.assigned_to)
            .single();
          if (exco?.email) emails = [exco.email];
        } else {
          const { data: excos } = await supabase
            .from('profiles')
            .select('email')
            .eq('role', 'JPP')
            .eq('jpp_unit', 'KEBAJIKAN');
          emails = (excos?.map(e => e.email).filter(Boolean) as string[]) || [];
        }

        if (emails.length > 0) {
          const { generateStaffNotificationEmail } = await import('@/lib/emailTemplates');
          const emailHtml = generateStaffNotificationEmail(
            'REOPEN',
            reopenTicket.ticket_no,
            reopenTicket.title,
            user?.user_metadata?.full_name || 'Pelajar',
            `/kebajikan/tiket/${reopenTicket.id}`,
            reopenReason
          );

          await sendEmail({
            to: emails,
            subject: `Permohonan Buka Semula: ${reopenTicket.ticket_no}`,
            html: emailHtml,
          });
        }
      }
    } catch (emailErr) {
      console.error('Error sending reopen email:', emailErr);
    }

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
    if (s === 'RESOLVED' || s === 'CLOSED') return <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
    if (s === 'ESCALATED') return <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />;
    if (s === 'CANCELLED') return <XCircle className="w-4 h-4 text-slate-400" />;
    return <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative overflow-hidden transition-colors">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 h-16 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/60 transition-colors">
        <div className="flex items-center gap-3">
          <HeartHandshake className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          <div>
            <p className="font-black text-slate-900 dark:text-white text-[15px] tracking-tight">{t('kebajikan:my_tickets_title', 'Aduan Saya')}</p>
            <p className="text-[9px] text-teal-700 dark:text-teal-400/90 font-black uppercase tracking-[0.2em] mt-0.5">{t('kebajikan:my_tickets_badge', 'E-Kebajikan')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <NotificationBell variant={isDark ? 'dark' : 'light'} />

          <Link to="/kebajikan/buat-aduan">
            <Button className="h-10 px-4 sm:px-5 text-xs font-black uppercase tracking-widest rounded-xl text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="w-4 h-4 mr-1.5" /> {t('kebajikan:my_tickets_btn_new', 'Aduan Baru')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-200/60 dark:bg-white/[0.03] animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm p-8">
            <HeartHandshake className="w-14 h-14 mx-auto mb-4 text-slate-300 dark:text-white/20" />
            <p className="font-black text-slate-800 dark:text-white/40 text-base mb-2">{t('kebajikan:my_tickets_empty_title', 'Tiada Aduan Dikemukakan')}</p>
            <p className="text-xs text-slate-500 dark:text-white/30 mb-6">{t('kebajikan:my_tickets_empty_desc', 'Aduan yang anda kemukakan akan dipaparkan di sini')}</p>
            <Link to="/kebajikan/buat-aduan">
              <Button className="h-10 px-6 text-xs font-black uppercase tracking-widest rounded-xl text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-md">
                {t('kebajikan:my_tickets_btn_first_complaint', 'Buat Aduan Pertama')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticketItem => (
              <motion.div
                key={ticketItem.id}
                layout
                className="relative rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-2xl bg-white dark:bg-slate-900/80 group hover:border-slate-300 dark:hover:border-white/10 transition-colors"
              >
                {/* Status Indicator Bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: KEBAJIKAN_STATUS_COLORS[ticketItem.status].replace(/text-/g, 'bg-').split(' ')[0] || TEAL }} />
                
                {/* Ticket header */}
                <button
                  className="w-full flex items-start gap-4 p-5 sm:p-6 pl-7 sm:pl-8 text-left hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpanded(expanded === ticketItem.id ? null : ticketItem.id)}
                >
                  <div className="flex-shrink-0 mt-1">{statusIcon(ticketItem.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white/90 truncate flex-1">{ticketItem.title}</span>
                      <span className={cn('text-[9px] font-black px-2.5 py-1 rounded-full flex-shrink-0 uppercase tracking-widest shadow-sm', KEBAJIKAN_STATUS_COLORS[ticketItem.status])}>
                        {t(`kebajikan:status_${ticketItem.status.toLowerCase()}`, KEBAJIKAN_STATUS_LABELS[ticketItem.status])}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[10px] text-slate-500 dark:text-white/40">
                      <span className="font-black text-slate-700 dark:text-white/60">{ticketItem.ticket_no}</span>
                      <span>·</span>
                      <span>{t(`kebajikan:cat_${ticketItem.category.toLowerCase()}`, KEBAJIKAN_CATEGORY_LABELS[ticketItem.category])}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(ticketItem.created_at), { addSuffix: true, locale: dateLocale })}</span>
                    </div>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0 transition-transform mt-0.5', expanded === ticketItem.id && 'rotate-180')} />
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded === ticketItem.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-slate-100 dark:border-white/[0.06] pt-4 space-y-4">
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 leading-relaxed">{ticketItem.description}</p>

                        {/* Resolution note */}
                        {ticketItem.resolution_note && (
                          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20">
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">{t('kebajikan:resolution_note_title', 'Nota Resolusi')}</p>
                            <p className="text-xs text-slate-800 dark:text-white/80">{ticketItem.resolution_note}</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {/* Cancel — only if NEW */}
                          {ticketItem.status === 'NEW' && (
                            <Button size="sm" variant="outline" onClick={() => handleCancel(ticketItem)} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl">
                              <XCircle className="w-3 h-3 mr-1" /> {t('kebajikan:my_tickets_btn_cancel', 'Batal Aduan')}
                            </Button>
                          )}
                          {/* Rate — if RESOLVED */}
                          {ticketItem.status === 'RESOLVED' && !ticketItem.rating && (
                            <Button size="sm" onClick={() => setRatingTicket(ticketItem)} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-sm">
                              <Star className="w-3 h-3 mr-1" /> {t('kebajikan:my_tickets_btn_rate', 'Beri Rating')}
                            </Button>
                          )}
                          {/* Reopen — if RESOLVED */}
                          {ticketItem.status === 'RESOLVED' && (
                            <Button size="sm" variant="outline" onClick={() => setReopenTicket(ticketItem)} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-slate-300 dark:border-white/15 text-slate-700 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl">
                              <RefreshCw className="w-3 h-3 mr-1" /> {t('kebajikan:my_tickets_btn_reopen', 'Buka Semula')}
                            </Button>
                          )}
                          {/* View comments / chat */}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/kebajikan/aduan/${ticketItem.id}`)} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-slate-200 dark:border-white/[0.07] text-slate-700 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl">
                            <MessageSquare className="w-3 h-3 mr-1" /> {t('kebajikan:my_tickets_btn_chat', 'Chat')}
                          </Button>
                        </div>

                        {/* Existing rating */}
                        {ticketItem.rating && (
                          <div className="flex items-center gap-1.5 pt-1">
                            {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5" fill={s <= ticketItem.rating! ? '#F59E0B' : 'transparent'} style={{ color: s <= ticketItem.rating! ? '#F59E0B' : 'rgba(156,163,175,0.4)' }} />)}
                            {ticketItem.rating_comment && <span className="text-[10px] text-slate-500 dark:text-white/40 ml-1">"{ticketItem.rating_comment}"</span>}
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
            <p className="font-black text-slate-900 dark:text-white text-base mb-1">{t('kebajikan:my_tickets_rate_modal_title', 'Beri Penilaian')}</p>
            <p className="text-[10px] text-slate-500 dark:text-white/40 mb-5">{ratingTicket.ticket_no} · {ratingTicket.title}</p>
            <div className="flex gap-2 justify-center mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)} className="p-1 hover:scale-110 transition-transform">
                  <Star className="w-8 h-8 transition-all" fill={s <= rating ? '#F59E0B' : 'transparent'} style={{ color: s <= rating ? '#F59E0B' : '#cbd5e1' }} />
                </button>
              ))}
            </div>
            <Textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder={t('kebajikan:my_tickets_rate_comment_placeholder', 'Ulasan anda (opsional)...')} rows={3} className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl resize-none mb-4" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRatingTicket(null)} className="flex-1 h-10 rounded-xl text-xs font-black border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/60">{t('common:cancel', 'Batal')}</Button>
              <Button disabled={rating === 0 || ratingLoading} onClick={handleRating} className="flex-1 h-10 rounded-xl text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-sm">
                {ratingLoading ? t('common:saving', 'Menyimpan...') : t('kebajikan:my_tickets_btn_submit_rating', 'Hantar Rating')}
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Reopen Dialog */}
      <AnimatePresence>
        {reopenTicket && (
          <Modal onClose={() => setReopenTicket(null)}>
            <p className="font-black text-slate-900 dark:text-white text-base mb-1">{t('kebajikan:reopen_request_title', 'Permintaan Buka Semula')}</p>
            <p className="text-[10px] text-slate-500 dark:text-white/40 mb-5">{reopenTicket.ticket_no}</p>
            <Textarea value={reopenReason} onChange={e => setReopenReason(e.target.value)} placeholder={t('kebajikan:my_tickets_reopen_reason_placeholder', 'Nyatakan sebab anda ingin membuka semula aduan ini...')} rows={4} className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl resize-none mb-4" />
            <p className="text-[10px] text-slate-500 dark:text-white/30 mb-4">{t('kebajikan:my_tickets_reopen_notice', 'Permintaan ini akan dihantar kepada Exco Kebajikan untuk kelulusan.')}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReopenTicket(null)} className="flex-1 h-10 rounded-xl text-xs font-black border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/60">{t('common:cancel', 'Batal')}</Button>
              <Button disabled={!reopenReason.trim() || reopenLoading} onClick={handleReopenRequest} className="flex-1 h-10 rounded-xl text-xs font-black text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-sm">
                {reopenLoading ? t('common:submitting', 'Menghantar...') : t('kebajikan:my_tickets_btn_submit_reopen', 'Hantar Permintaan')}
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden bg-white dark:bg-slate-900" onClick={e => e.stopPropagation()}>
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
