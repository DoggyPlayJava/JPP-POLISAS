import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Clock, MessageSquare, Send, User, Shield, Lock,
  AlertTriangle, CheckCircle2, RefreshCw, XCircle, ArrowUpRight, Tag,
  Loader2, Users, Flag,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ms } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { sendNotificationToUser } from '@/lib/notifications';

import { useAuth } from '@/contexts/AuthContext';
import {
  KebajikanTicket, KebajikanTicketComment, KebajikanStaffAssignment,
  KebajikanPic, KebajikanEscalationAction,
  KEBAJIKAN_STATUS_LABELS, KEBAJIKAN_STATUS_COLORS,
  KEBAJIKAN_CATEGORY_LABELS, KEBAJIKAN_PRIORITY_LABELS,
  KEBAJIKAN_PRIORITY_COLORS, KEBAJIKAN_THEME_COLOR, KebajikanTicketStatus,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { hexToRgba } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const TEAL = KEBAJIKAN_THEME_COLOR;

const STATUSES: { key: KebajikanTicketStatus; label: string }[] = [
  { key: 'NEW',          label: 'Diterima'          },
  { key: 'IN_PROGRESS',  label: 'Dalam Tindakan'    },
  { key: 'WAITING_INFO', label: 'Menunggu Maklumat' },
  { key: 'RESOLVED',     label: 'Selesai'           },
  { key: 'CLOSED',       label: 'Ditutup'           },
];

export function KebajikanTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isKebajikanExco, isSuperAdmin, isUnitKebajikanStaff, isKediamanExco } = useAuth();

  // isStaff dikira selepas ticket dimuatkan untuk KK Exco — lihat computed value di bawah
  const [ticket, setTicket] = useState<KebajikanTicket | null>(null);
  const [comments, setComments]         = useState<KebajikanTicketComment[]>([]);
  const [staffList, setStaffList]       = useState<KebajikanStaffAssignment[]>([]);
  const [loading, setLoading]           = useState(true);
  const bottomRef                       = useRef<HTMLDivElement>(null);

  // isStaff: Exco Kebajikan + Super Admin boleh urus semua tiket.
  // Exco KK boleh urus tiket kafeteria (handled_by_unit === 'KK') sahaja.
  const isKKTicket = ticket?.handled_by_unit === 'KK';
  const isStaff = isKebajikanExco || isSuperAdmin || (isKediamanExco && isKKTicket);

  const [newComment, setNewComment]     = useState('');
  const [isInternal, setIsInternal]     = useState(false);
  const [commentLoading, setCLoading]   = useState(false);

  const [statusChange, setStatusChange] = useState('');
  const [statusNote, setStatusNote]     = useState('');
  const [delegateId, setDelegateId]     = useState('');
  const [delegateNote, setDelegateNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [saving, setSaving]             = useState(false);

  // ─── Escalation Actions state ──────────────────────────────────────────────
  const [escalationActions, setEscalationActions] = useState<KebajikanEscalationAction[]>([]);
  const [picPresets, setPicPresets]               = useState<KebajikanPic[]>([]);
  const [escActionText, setEscActionText]         = useState('');
  const [escPicId, setEscPicId]                   = useState('');
  const [escPicManual, setEscPicManual]           = useState('');
  const [escSaving, setEscSaving]                 = useState(false);

  const actorRole = isKebajikanExco || isSuperAdmin ? 'EXCO' : (isKediamanExco && isKKTicket) ? 'EXCO' : isUnitKebajikanStaff ? 'PEGAWAI' : 'PELAJAR';

  const fetchAll = useCallback(async () => {
    if (!id) return;
    const [tRes, cRes, sRes, eaRes, picRes] = await Promise.all([
      supabase.from('kebajikan_tickets').select('*, assignee:assigned_to(id,full_name), delegate:delegated_to(id,full_name)').eq('id', id).single(),
      supabase.from('kebajikan_ticket_comments').select('*').eq('ticket_id', id).order('created_at'),
      isStaff ? supabase.from('kebajikan_staff_assignments').select('*, staff:staff_user_id(id,full_name,email)').eq('is_active', true) : Promise.resolve({ data: [] }),
      // Escalation actions untuk tiket ini
      supabase.from('kebajikan_escalation_actions').select('*, pic:pic_id(id,pic_name,jabatan_label,pic_title), recorder:recorded_by(id,full_name)').eq('ticket_id', id).order('recorded_at'),
      // PIC presets aktif
      supabase.from('kebajikan_pics').select('*').eq('is_active', true).order('jabatan_label'),
    ]);
    if (tRes.data)  setTicket(tRes.data as KebajikanTicket);
    if (cRes.data)  setComments(cRes.data as KebajikanTicketComment[]);
    if (sRes.data)  setStaffList(sRes.data as KebajikanStaffAssignment[]);
    if (eaRes.data)  setEscalationActions(eaRes.data as KebajikanEscalationAction[]);
    if (picRes.data) setPicPresets(picRes.data as KebajikanPic[]);
    setLoading(false);
  }, [id, isStaff]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Scroll to bottom when comments change
  useEffect(() => {
    if (bottomRef.current?.parentElement) {
      const parent = bottomRef.current.parentElement;
      parent.scrollTo({ top: parent.scrollHeight, behavior: 'smooth' });
    }
  }, [comments]);

  // Realtime comments
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`ticket_comments_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kebajikan_ticket_comments', filter: `ticket_id=eq.${id}` }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kebajikan_tickets', filter: `id=eq.${id}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, fetchAll]);

  const addComment = async () => {
    if (!newComment.trim() || !ticket || !user) return;
    setCLoading(true);
    await supabase.from('kebajikan_ticket_comments').insert({
      ticket_id: ticket.id,
      author_id: user.id,
      author_name: profile?.full_name || 'Unknown',
      author_role: actorRole,
      is_internal: isInternal,
      content: newComment,
    });
    // Notify student if public comment from Exco/Pegawai
    if (!isInternal && ticket.submitter_id) {
      await sendNotificationToUser(ticket.submitter_id, {
        title:       `Mesej Baru — ${ticket.ticket_no}`,
        message:     `${profile?.full_name || 'Exco Kebajikan'}: "${newComment.slice(0, 80)}${newComment.length > 80 ? '...' : ''}"`,
        type:        'NEW_MESSAGE',
        module:      'KEBAJIKAN',
        link:        `/kebajikan/aduan/${ticket.id}`,
        reference_id: ticket.id,
        actor_name:  profile?.full_name || 'Exco Kebajikan',
      });
    }
    setNewComment('');
    setCLoading(false);
    fetchAll(); // Improvise: Terus panggil fetchAll selepas berjaya insert supaya tak perlu tunggu isyarat Realtime.
  };


  const changeStatus = async () => {
    if (!ticket || !statusChange) return;
    setSaving(true);
    const upd: any = { status: statusChange };
    if (statusChange === 'RESOLVED') {
      upd.resolved_at = new Date().toISOString();
      upd.resolved_by = user?.id;
      upd.resolution_note = resolutionNote;
    }
    if (statusChange === 'IN_PROGRESS' && !ticket.assigned_to) {
      upd.assigned_to = user?.id;
    }
    await supabase.from('kebajikan_tickets').update(upd).eq('id', ticket.id);
    await supabase.from('kebajikan_ticket_status_log').insert({
      ticket_id: ticket.id, actor_id: user?.id,
      actor_name: profile?.full_name, actor_role: actorRole,
      old_status: ticket.status, new_status: statusChange, note: statusNote,
    });
    // Notify pelajar
    if (ticket.submitter_id) {
      await sendNotificationToUser(ticket.submitter_id, {
        title:       `Status Aduan Dikemaskini — ${ticket.ticket_no}`,
        message:     `Status aduan anda telah dikemaskini kepada "${KEBAJIKAN_STATUS_LABELS[statusChange as KebajikanTicketStatus]}"`,
        type:        'STATUS_UPDATE',
        module:      'KEBAJIKAN',
        link:        `/kebajikan/aduan/${ticket.id}`,
        reference_id: ticket.id,
        actor_name:  profile?.full_name,
      });
    }
    await fetchAll();
    setStatusChange('');
    setStatusNote('');
    setResolutionNote('');
    setSaving(false);
  };

  const delegateTicket = async () => {
    if (!ticket || !delegateId) return;
    setSaving(true);
    await supabase.from('kebajikan_tickets').update({ status: 'DELEGATED', delegated_to: delegateId, delegation_note: delegateNote }).eq('id', ticket.id);
    await supabase.from('kebajikan_ticket_status_log').insert({
      ticket_id: ticket.id, actor_id: user?.id,
      actor_name: profile?.full_name, actor_role: actorRole,
      old_status: ticket.status, new_status: 'DELEGATED', note: `Delegasikan ke pegawai. ${delegateNote}`,
    });
    await supabase.from('kebajikan_ticket_comments').insert({
      ticket_id: ticket.id, author_id: user?.id,
      author_name: profile?.full_name || 'Unknown', author_role: actorRole,
      is_internal: true, is_delegation_note: true,
      content: `[Delegasi] Tiket ini telah didelegasikan kepada pegawai. Nota: ${delegateNote || '(Tiada nota)'}`,
    });
    await sendNotificationToUser(delegateId, {
      title:       `Tiket Didelegasikan: ${ticket.ticket_no}`,
      message:     `Anda telah diassign untuk menguruskan tiket ini. ${delegateNote ? 'Nota: ' + delegateNote : ''}`,
      type:        'DELEGATION',
      module:      'KEBAJIKAN',
      link:        `/kebajikan/tiket/${ticket.id}`,
      reference_id: ticket.id,
      actor_name:  profile?.full_name,
    });
    await fetchAll();
    setDelegateId('');
    setDelegateNote('');
    setSaving(false);
  };

  const approveReopen = async () => {
    if (!ticket) return;
    setSaving(true);
    await supabase.from('kebajikan_tickets').update({ status: 'NEW', reopen_approved_by: user?.id, reopen_count: ticket.reopen_count + 1 }).eq('id', ticket.id);
    await supabase.from('kebajikan_ticket_status_log').insert({ ticket_id: ticket.id, actor_id: user?.id, actor_name: profile?.full_name, actor_role: actorRole, old_status: 'REOPENED', new_status: 'NEW', note: 'Exco luluskan reopen' });
    // Notify student — reopen approved
    if (ticket.submitter_id) {
      await sendNotificationToUser(ticket.submitter_id, {
        title:       `Permohonan Buka Semula Diluluskan — ${ticket.ticket_no}`,
        message:     `Exco Kebajikan telah meluluskan permohonan anda untuk membuka semula aduan. Ia kini dalam status Diterima.`,
        type:        'REOPEN_APPROVED',
        module:      'KEBAJIKAN',
        link:        `/kebajikan/aduan/${ticket.id}`,
        reference_id: ticket.id,
        actor_name:  profile?.full_name,
      });
    }
    await fetchAll();
    setSaving(false);
  };

  const rejectReopen = async () => {
    if (!ticket) return;
    setSaving(true);
    await supabase.from('kebajikan_tickets').update({ status: 'RESOLVED' }).eq('id', ticket.id);
    await supabase.from('kebajikan_ticket_status_log').insert({ ticket_id: ticket.id, actor_id: user?.id, actor_name: profile?.full_name, actor_role: actorRole, old_status: 'REOPENED', new_status: 'RESOLVED', note: 'Exco tolak reopen' });
    // Notify student — reopen rejected
    if (ticket.submitter_id) {
      await sendNotificationToUser(ticket.submitter_id, {
        title:       `Permohonan Buka Semula Ditolak — ${ticket.ticket_no}`,
        message:     `Exco Kebajikan telah menolak permohonan untuk membuka semula aduan. Aduan anda kekal dalam status Selesai.`,
        type:        'REOPEN_REJECTED',
        module:      'KEBAJIKAN',
        link:        `/kebajikan/aduan/${ticket.id}`,
        reference_id: ticket.id,
        actor_name:  profile?.full_name,
      });
    }
    await fetchAll();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  if (!ticket) {
    return <div className="p-6 text-white/40 text-center mt-20">Tiket tidak ditemui.</div>;
  }

  const slaHours = ticket.sla_deadline
    ? Math.max(0, (new Date(ticket.sla_deadline).getTime() - Date.now()) / 3600000)
    : null;

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen relative">
      {/* Back */}
      <button onClick={() => navigate('/kebajikan/tiket')} className="relative z-10 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-teal-400 mb-8 transition-colors group">
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Kembali ke Senarai
      </button>

      {/* Title row */}
      <div className="relative z-10 flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-black text-[11px] uppercase tracking-[0.3em] text-slate-400">{ticket.ticket_no}</span>
            <span className={cn('text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest', KEBAJIKAN_STATUS_COLORS[ticket.status])}>
              {KEBAJIKAN_STATUS_LABELS[ticket.status]}
            </span>
            <span className={cn('text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest', KEBAJIKAN_PRIORITY_COLORS[ticket.priority])}>
              {KEBAJIKAN_PRIORITY_LABELS[ticket.priority]}
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-50 tracking-tight leading-tight mb-2">{ticket.title}</h1>
          <p className="text-sm text-slate-400 font-medium">
            {KEBAJIKAN_CATEGORY_LABELS[ticket.category]} <span className="opacity-50 mx-2">·</span> Dikemukakan {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ms })}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT — Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Submitter info */}
          <Section title="Maklumat Pengadu">
            <Grid2>
              <Info label="Nama" value={ticket.full_name} />
              <Info label="No. Matrik" value={ticket.matric_no || '—'} />
              <Info label="No. Telefon" value={ticket.phone || '—'} />
              <Info label="Kelas" value={ticket.class || '—'} />
              <Info label="Jantina" value={ticket.gender || '—'} />
            </Grid2>
          </Section>

          {/* Description */}
          <Section title="Penerangan Aduan">
            <p className="text-sm text-slate-300 leading-relaxed">{ticket.description}</p>
            {/* Form data */}
            {Object.keys(ticket.form_data).length > 0 && (
              <div className="mt-3 space-y-2">
                {Object.entries(ticket.form_data).map(([k, v]) => v && (
                  <Info key={k} label={k.replace(/_/g, ' ')} value={Array.isArray(v) ? (v as string[]).join(', ') : String(v)} />
                ))}
              </div>
            )}
            {/* Images */}
            {ticket.image_urls.length > 0 && (
              <div className="mt-6 flex gap-3 flex-wrap">
                {ticket.image_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative group rounded-2xl overflow-hidden shadow-lg border border-white/10">
                    <img src={url} className="w-24 h-24 object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ArrowUpRight className="w-6 h-6 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Section>

          {/* Resolution note */}
          {ticket.resolution_note && (
            <div className="rounded-3xl p-6 border shadow-2xl backdrop-blur-xl" style={{ background: hexToRgba('#10B981', 0.08), borderColor: hexToRgba('#10B981', 0.2) }}>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Nota Resolusi
              </p>
              <p className="text-sm text-slate-200 leading-relaxed">{ticket.resolution_note}</p>
            </div>
          )}

          {/* Reopen request panel */}
          {ticket.status === 'REOPENED' && isStaff && (
            <div className="rounded-2xl p-4 border" style={{ background: hexToRgba('#6366F1', 0.06), borderColor: hexToRgba('#6366F1', 0.3) }}>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Permintaan Buka Semula</p>
              <p className="text-xs text-white/70 mb-4">Sebab: {ticket.reopen_reason}</p>
              <div className="flex gap-2">
                <Button onClick={approveReopen} disabled={saving} size="sm" className="h-8 px-4 text-xs font-black rounded-xl text-slate-900" style={{ background: TEAL }}>
                  ✓ Lulus Reopen
                </Button>
                <Button onClick={rejectReopen} disabled={saving} size="sm" variant="outline" className="h-8 px-4 text-xs font-black rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10">
                  ✗ Tolak
                </Button>
              </div>
            </div>
          )}

          {/* Comments thread */}
          <Section title="Thread Komunikasi">
            {/* Toggle internal/public */}
            <div className="flex gap-2 mb-6 p-1 bg-black/20 rounded-2xl w-fit border border-white/5">
              <button onClick={() => setIsInternal(false)} className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all', !isInternal ? 'text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5')} style={!isInternal ? { background: TEAL } : {}}>
                <MessageSquare className="w-3.5 h-3.5" /> Public
              </button>
              {isStaff && (
                <button onClick={() => setIsInternal(true)} className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all', isInternal ? 'text-white bg-indigo-500 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5')}>
                  <Lock className="w-3.5 h-3.5" /> Internal (Exco sahaja)
                </button>
              )}
            </div>

            {/* Comments list */}
            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto scrollbar-hide">
              {comments
                .filter(c => isStaff ? true : !c.is_internal)
                .map(c => (
                <div key={c.id} className={cn('flex gap-3', c.author_role === 'PELAJAR' && 'flex-row-reverse')}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black"
                    style={{ background: c.author_role === 'EXCO' ? hexToRgba(TEAL, 0.2) : c.author_role === 'SISTEM' ? 'rgba(100,100,100,0.3)' : 'rgba(99,102,241,0.2)', color: c.author_role === 'SISTEM' ? '#888' : undefined }}
                  >
                    {c.author_name[0]}
                  </div>
                  <div className={cn('flex-1 max-w-[80%]', c.author_role === 'PELAJAR' && 'items-end flex flex-col')}>
                    <div className={cn('px-4 py-3 rounded-2xl text-sm shadow-md', c.is_delegation_note ? 'border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md' : c.is_internal ? 'bg-indigo-600/20 border border-indigo-500/30 backdrop-blur-md' : c.author_role === 'PELAJAR' ? 'bg-indigo-600/20 backdrop-blur-md border border-indigo-500/10' : 'bg-white/[0.03] border border-white/5 backdrop-blur-md')}>
                      {c.is_delegation_note && <p className="text-[10px] font-black text-indigo-400 mb-1.5 uppercase tracking-widest flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3" /> Nota Delegasi</p>}
                      {c.is_internal && <p className="text-[10px] font-black text-indigo-400 mb-1.5 uppercase tracking-widest flex items-center gap-1.5"><Lock className="w-3 h-3" /> Internal</p>}
                      <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                    <p className="text-[10px] font-black tracking-wider uppercase text-slate-500 mt-1.5 px-2">{c.author_name} <span className="mx-1 opacity-50">·</span> {format(new Date(c.created_at), 'dd/MM HH:mm')}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-center text-xs text-white/20 py-6">Belum ada komen</p>}
              <div ref={bottomRef} />
            </div>

            {/* New comment */}
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); }}}
                placeholder={isInternal ? "Komen internal (Exco sahaja)..." : "Tulis komen..."}
                rows={3}
                className={cn('flex-1 rounded-2xl resize-none text-sm border focus:ring-2 transition-all p-3', isInternal ? 'bg-indigo-500/10 border-indigo-500/30 text-white focus:ring-indigo-500/30' : 'bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] border-white/10 text-white focus:ring-teal-500/30')}
              />
              <Button onClick={addComment} disabled={!newComment.trim() || commentLoading} className="h-full px-5 rounded-2xl text-slate-950 self-stretch hover:scale-[1.02] active:scale-[0.98] shadow-lg transition-all" style={{ background: TEAL }}>
                <Send className="w-5 h-5 mx-1" />
              </Button>
            </div>
          </Section>
        </div>

        {/* RIGHT — Action panel */}
        {isStaff && (
          <div className="space-y-4">
            {/* SLA Timer */}
            {slaHours !== null && !['RESOLVED','CLOSED','CANCELLED'].includes(ticket.status) && (
              <div className="rounded-2xl p-4 border" style={{ background: slaHours < 12 ? hexToRgba('#EF4444', 0.06) : hexToRgba('#F59E0B', 0.04), borderColor: slaHours < 12 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5" style={{ color: slaHours < 12 ? '#EF4444' : '#F59E0B' }} />
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: slaHours < 12 ? '#EF4444' : '#F59E0B' }}>
                    {slaHours < 0 ? 'SLA TERLAMPAUI' : 'SLA Deadline'}
                  </p>
                </div>
                <p className="text-xl font-black text-white">{slaHours < 0 ? `${Math.abs(slaHours).toFixed(0)}j terlampaui` : `${slaHours.toFixed(0)}j lagi`}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{format(new Date(ticket.sla_deadline!), 'dd MMM HH:mm')}</p>
              </div>
            )}

            {/* Change status */}
            <Section title="Ubah Status">
              <Select value={statusChange} onValueChange={setStatusChange}>
                <SelectTrigger className="bg-white/[0.04] border-white/10 text-white rounded-xl text-xs h-10">
                  <SelectValue placeholder="Pilih status baru..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  {STATUSES.map(s => (
                    <SelectItem key={s.key} value={s.key} className="text-white/80 text-xs focus:bg-white/10">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusChange === 'RESOLVED' && (
                <Textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder="Nota resolusi (wajib)..." rows={3} className="mt-2 bg-white/[0.04] border-white/10 text-white text-xs rounded-xl resize-none" />
              )}
              <Textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Nota perubahan status (opsional)..." rows={2} className="mt-2 bg-white/[0.04] border-white/10 text-white text-xs rounded-xl resize-none" />
              <Button onClick={changeStatus} disabled={!statusChange || saving || (statusChange === 'RESOLVED' && !resolutionNote)} className="w-full h-9 mt-2 text-xs font-black uppercase tracking-widest rounded-xl text-slate-900" style={{ background: TEAL }}>
                {saving ? 'Menyimpan...' : 'Kemaskini Status'}
              </Button>
            </Section>

            {/* Delegate */}
            {staffList.length > 0 && (
              <Section title="Delegasikan ke Pegawai">
                <Select value={delegateId} onValueChange={setDelegateId}>
                  <SelectTrigger className="bg-white/[0.04] border-white/10 text-white rounded-xl text-xs h-10">
                    <SelectValue placeholder="Pilih pegawai..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10">
                    {staffList.map(s => (
                      <SelectItem key={s.id} value={s.staff_user_id} className="text-white/80 text-xs focus:bg-white/10">
                        {(s as any).staff?.full_name ?? 'Pegawai'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea value={delegateNote} onChange={e => setDelegateNote(e.target.value)} placeholder="Nota saranan untuk pegawai..." rows={2} className="mt-2 bg-white/[0.04] border-white/10 text-white text-xs rounded-xl resize-none" />
                <Button onClick={delegateTicket} disabled={!delegateId || saving} className="w-full h-9 mt-2 text-xs font-black uppercase tracking-widest rounded-xl border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10" variant="outline">
                  {saving ? '...' : '🔁 Delegasikan'}
                </Button>
              </Section>
            )}

            {/* Panel Tindakan Escalated — hanya untuk Exco Kebajikan & Super Admin, tiket ESCALATED */}
            {(isKebajikanExco || isSuperAdmin) && ticket.status === 'ESCALATED' && (
              <EscalationActionPanel
                ticket={ticket}
                picPresets={picPresets}
                actions={escalationActions}
                actionText={escActionText}
                picId={escPicId}
                picManual={escPicManual}
                saving={escSaving}
                onActionTextChange={setEscActionText}
                onPicIdChange={setEscPicId}
                onPicManualChange={setEscPicManual}
                onSave={async () => {
                  if (!escActionText.trim()) return;
                  setEscSaving(true);
                  const { error } = await supabase.from('kebajikan_escalation_actions').insert({
                    ticket_id: ticket.id,
                    pic_id: escPicId || null,
                    pic_name_manual: !escPicId ? (escPicManual || null) : null,
                    action_summary: escActionText.trim(),
                    recorded_by: user?.id,
                  });
                  if (!error) {
                    setEscActionText('');
                    setEscPicId('');
                    setEscPicManual('');
                    await fetchAll();
                  }
                  setEscSaving(false);
                }}
              />
            )}

            {/* Pengadu info quick */}
            <Section title="Pengadu">
              <div className="space-y-2">
                <Info label="Nama" value={ticket.full_name} />
                <Info label="Matrik" value={ticket.matric_no || '—'} />
                <Info label="Telefon" value={ticket.phone || '—'} />
                {ticket.reopen_count > 0 && <Info label="Kali Reopen" value={String(ticket.reopen_count)} />}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative rounded-3xl border border-white/[0.05] p-6 bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden group hover:border-white/10 transition-colors">
      <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <p className="relative z-10 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-5">{title}</p>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{children}</div>;
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-teal-500/80 mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}

// ─── Panel Tindakan Escalated ─────────────────────────────────────────────────
interface EscalationActionPanelProps {
  ticket: KebajikanTicket;
  picPresets: KebajikanPic[];
  actions: KebajikanEscalationAction[];
  actionText: string;
  picId: string;
  picManual: string;
  saving: boolean;
  onActionTextChange: (v: string) => void;
  onPicIdChange: (v: string) => void;
  onPicManualChange: (v: string) => void;
  onSave: () => void;
}

function EscalationActionPanel({
  ticket, picPresets, actions,
  actionText, picId, picManual, saving,
  onActionTextChange, onPicIdChange, onPicManualChange, onSave,
}: EscalationActionPanelProps) {
  const RED = '#EF4444';
  const selectedPic = picPresets.find(p => p.id === picId);

  return (
    <div
      className="relative rounded-3xl border p-6 backdrop-blur-xl shadow-2xl overflow-hidden"
      style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.03)' }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] pointer-events-none" style={{ background: 'rgba(239,68,68,0.06)' }} />
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: RED }} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: RED }}>Tindakan Escalated</p>
            <p className="text-[9px] text-white/30 mt-0.5">Rekod cadangan / tindakan Exco kepada PIC</p>
          </div>
        </div>

        {/* PIC Selection */}
        <div className="mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">PIC yang Dihubungi</p>
          <Select value={picId} onValueChange={onPicIdChange}>
            <SelectTrigger className="bg-white/[0.04] border-white/10 text-white rounded-xl text-xs h-9 mb-2">
              <SelectValue placeholder="Pilih dari senarai preset..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/10 max-h-48">
              <SelectItem value="" className="text-white/50 text-xs focus:bg-white/10">— Taip nama manual —</SelectItem>
              {picPresets.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-white/80 text-xs focus:bg-white/10">
                  {p.jabatan_label} — {p.pic_name} {p.pic_title ? `(${p.pic_title})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Manual name input if no preset selected */}
          {!picId && (
            <input
              value={picManual}
              onChange={e => onPicManualChange(e.target.value)}
              placeholder="Nama PIC (taip manual)..."
              className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:border-red-500/40 focus:outline-none transition-all"
            />
          )}
          {selectedPic && (
            <p className="text-[10px] text-white/40 mt-1.5 px-1">
              {selectedPic.jabatan_label} · {selectedPic.pic_title || 'PIC'}
              {selectedPic.pic_email && <> · <span className="text-teal-400/60">{selectedPic.pic_email}</span></>}
            </p>
          )}
        </div>

        {/* Action text */}
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Cadangan / Tindakan Exco</p>
          <Textarea
            value={actionText}
            onChange={e => onActionTextChange(e.target.value)}
            placeholder="Tuliskan cadangan atau tindakan yang telah/akan diambil berhubung isu ini..."
            rows={3}
            className="bg-white/[0.03] border-red-500/20 text-white text-xs rounded-xl resize-none focus:border-red-500/40 focus:ring-red-500/20 focus:ring-1 transition-all"
          />
        </div>

        <Button
          onClick={onSave}
          disabled={!actionText.trim() || saving}
          className="w-full h-9 text-xs font-black uppercase tracking-widest rounded-xl text-white shadow-lg transition-all hover:brightness-110"
          style={{ background: saving ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.7)' }}
        >
          {saving ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Menyimpan...</> : '✓ Rekod Tindakan'}
        </Button>

        {/* Previous actions */}
        {actions.length > 0 && (
          <div className="mt-5 pt-4 border-t border-red-500/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Rekod Tindakan Sebelum</p>
            <div className="space-y-2.5">
              {actions.map(a => (
                <div key={a.id} className="rounded-2xl p-3.5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                  {(a.pic?.pic_name || a.pic_name_manual) && (
                    <p className="text-[10px] font-black text-red-400/70 mb-1">
                      PIC: {a.pic ? `${a.pic.pic_name} (${a.pic.jabatan_label})` : a.pic_name_manual}
                    </p>
                  )}
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{a.action_summary}</p>
                  <p className="text-[9px] text-white/25 mt-2">
                    {a.recorder?.full_name || '—'} · {format(new Date(a.recorded_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

