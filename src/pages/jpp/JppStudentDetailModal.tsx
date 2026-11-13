import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
    Mail, Phone, Copy, Home, Trophy, GraduationCap,
    Users, Briefcase, ShieldCheck, IdCard, Eye, EyeOff, Bell, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SlideOverSheet } from '@/components/ui/SlideOverSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { logAuditAction } from '@/lib/auditLogger';
import { cn } from '@/lib/utils';

interface Props {
    userId: string | null;
    onClose: () => void;
    themeColor: string;
}

interface Detail {
    p: any;
    resid: any;
    meritTx: any[];
    cgpa: any[];
    clubs: any[];
    biz: any[];
}

const initialsUrl = (name?: string) =>
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'P')}&backgroundColor=2E3A2F&textColor=F8F6EE`;

const fmtDate = (v: string | null | undefined, pattern: string, noData: string) => {
    if (!v) return noData;
    const d = new Date(v);
    return isNaN(d.getTime()) ? noData : format(d, pattern);
};

const maskPhone = (phone: string) => `•••••••${phone.slice(-4)}`;

function Section({ icon: Icon, title, children, className }: {
    icon: React.ElementType; title: string; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={cn('rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-4', className)}>
            <div className="flex items-center gap-2 mb-3">
                <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-white/40" />
                <h4 className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">{title}</h4>
            </div>
            <div className="space-y-2.5">{children}</div>
        </div>
    );
}

function Field({ label, value, mono, onCopy, copyLabel, noData }: {
    label: string; value?: React.ReactNode; mono?: boolean; onCopy?: string; copyLabel?: string; noData: string;
}) {
    const empty = value === undefined || value === null || value === '';
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 shrink-0 pt-0.5">{label}</span>
            <span className={cn(
                'text-[11px] text-right break-words min-w-0',
                empty ? 'text-slate-400 dark:text-white/20 italic' : 'text-slate-800 dark:text-white/80 font-semibold',
                mono && !empty && 'font-mono',
            )}>
                {empty ? noData : value}
                {onCopy && !empty && (
                    <button
                        onClick={() => { navigator.clipboard.writeText(onCopy); toast.success(copyLabel || ''); }}
                        className="ml-1.5 inline-flex align-middle text-slate-300 dark:text-white/20 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
                        title={copyLabel}
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                )}
            </span>
        </div>
    );
}

function Chip({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'blue' }) {
    const tones: Record<string, string> = {
        slate: 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border-slate-200 dark:border-white/10',
        emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
        rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
        indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
        blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
    };
    return (
        <span className={cn('px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border', tones[tone])}>
            {children}
        </span>
    );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
    return (
        <div className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] px-3 py-2.5">
            <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/30 mb-0.5">{label}</div>
            <div className="text-sm font-black tabular-nums truncate" style={accent ? { color: accent } : undefined}>{value}</div>
        </div>
    );
}

type ActionTarget =
    | { kind: 'tier'; newTier: 'pro' | 'free' }
    | { kind: 'role'; demote: boolean }
    | { kind: 'phone' }
    | null;

export function JppStudentDetailModal({ userId, onClose, themeColor }: Props) {
    const { t } = useTranslation(['jpp', 'common']);
    const { profile } = useAuth();

    const [loading, setLoading] = useState(false);
    const [d, setD] = useState<Detail | null>(null);
    const [reload, setReload] = useState(0);
    const [phoneRevealed, setPhoneRevealed] = useState(false);
    const [action, setAction] = useState<ActionTarget>(null);
    const [busy, setBusy] = useState(false);
    const [reminding, setReminding] = useState(false);

    const NO_DATA = t('jpp:users_detail_no_data', 'Tiada Data');

    useEffect(() => {
        if (!userId) { setD(null); setPhoneRevealed(false); return; }
        let alive = true;
        setLoading(true);
        setD(null);

        (async () => {
            const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
            if (!alive) return;
            if (error || !p) {
                toast.error(t('jpp:users_detail_load_failed', 'Gagal memuatkan profil.'));
                setLoading(false);
                return;
            }

            const [resid, meritTx, cgpa, biz, mem] = await Promise.all([
                p.matric_no
                    ? supabase.from('klk_student_residency').select('*').eq('no_matrik', p.matric_no)
                        .order('is_expired', { ascending: true }).order('submitted_at', { ascending: false }).limit(1)
                    : Promise.resolve({ data: [] } as any),
                supabase.from('merit_transactions').select('points, reason, source, created_at')
                    .eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
                supabase.from('akademik_cgpa_records').select('tahun, semester, pnm, hpnm, is_user_verified')
                    .eq('user_id', userId).order('tahun', { ascending: false }).order('semester', { ascending: false }).limit(8),
                supabase.from('student_business_memberships')
                    .select('role, status, joined_at, keusahawanan_businesses(name, logo_url)')
                    .eq('user_id', userId),
                supabase.from('student_club_memberships')
                    .select('club_id, role, account_status, joined_at, is_primary')
                    .eq('user_id', userId),
            ]);

            let clubs: any[] = [];
            const memRows = (mem.data || []) as any[];
            if (memRows.length) {
                const { data: clubRows } = await supabase.from('clubs')
                    .select('id, name, short_name, theme_color')
                    .in('id', memRows.map(m => m.club_id));
                clubs = memRows.map(m => ({ ...m, club: (clubRows || []).find((c: any) => c.id === m.club_id) }));
            }

            if (!alive) return;
            setD({
                p,
                resid: (resid.data || [])[0] || null,
                meritTx: meritTx.data || [],
                cgpa: cgpa.data || [],
                clubs,
                biz: biz.data || [],
            });
            setLoading(false);
        })();

        return () => { alive = false; };
    }, [userId, reload]);

    const p = d?.p;
    const meritTotal = Number(p?.merit || 0);
    const meritParts = [
        { key: t('jpp:users_detail_merit_academic', 'Akademik'), val: Number(p?.merit_akademik || 0) },
        { key: t('jpp:users_detail_merit_hostel', 'Asrama'), val: Number(p?.merit_asrama || 0) },
        { key: t('jpp:users_detail_merit_club', 'Kelab'), val: Number(p?.merit_kelab || 0) },
    ];
    const meritMax = Math.max(1, ...meritParts.map(m => m.val));
    const meritBreakdownEmpty = meritParts.every(m => m.val === 0);

    const revealPhone = () => {
        if (!phoneRevealed && p?.phone) {
            setPhoneRevealed(true);
            logAuditAction({
                actionType: 'STUDENT_PHONE_VIEWED',
                module: 'JPP Admin',
                entityId: userId!,
                description: t('jpp:users_detail_audit_reveal', 'Papar nombor telefon {{name}}', { name: p.full_name }),
                actorId: profile?.id,
            });
        } else {
            setPhoneRevealed(false);
        }
    };

    const sendReminder = async (kind: 'residency' | 'academic') => {
        if (!p) return;
        setReminding(true);
        const { error } = await supabase.from('notifications').insert([{
            user_id: p.id,
            title: t('jpp:users_detail_remind_title', 'Peringatan: Kemaskini Maklumat'),
            message: kind === 'residency'
                ? t('jpp:users_detail_remind_residency_body', 'Sila kemaskini maklumat kediaman (KLK) anda untuk semester semasa.')
                : t('jpp:users_detail_remind_academic_body', 'Sila kemaskini rekod PNGK anda dalam sistem akademik.'),
            type: 'REMINDER',
            module: 'JPP',
            link: kind === 'residency' ? '/profil' : '/akademik',
            is_read: false,
        }]);
        setReminding(false);
        if (error) { toast.error(error.message); return; }
        toast.success(t('jpp:users_detail_remind_sent', 'Peringatan dihantar.'));
        logAuditAction({
            actionType: 'STUDENT_REMINDER_SENT',
            module: 'JPP Admin',
            entityId: p.id,
            description: t('jpp:users_detail_audit_remind', 'Peringatan {{kind}} dihantar kepada {{name}}', { kind, name: p.full_name }),
            actorId: profile?.id,
        });
    };

    const runAction = async () => {
        if (!action || !p) return;
        setBusy(true);
        try {
            if (action.kind === 'tier') {
                const { error } = await supabase.rpc('update_user_ai_tier', { target_user_id: p.id, new_tier: action.newTier });
                if (error) throw error;
                toast.success(t('jpp:users_detail_action_tier_done', 'Tier dikemaskini.'));
            } else if (action.kind === 'role') {
                const { error } = await supabase.rpc('toggle_jpp_role', { p_target_id: p.id });
                if (error) throw error;
                toast.success(t('jpp:users_detail_action_role_done', 'Peranan dikemaskini.'));
            } else {
                const { error } = await supabase.from('profiles').update({ phone: null }).eq('id', p.id);
                if (error) throw error;
                toast.success(t('jpp:users_detail_action_phone_done', 'Telefon direset.'));
                setPhoneRevealed(false);
            }
            logAuditAction({
                actionType: 'STUDENT_PROFILE_ACTION',
                module: 'JPP Admin',
                entityId: p.id,
                description: `${action.kind}${action.kind === 'tier' ? ':' + action.newTier : action.kind === 'role' ? (action.demote ? ':demote' : ':promote') : ''} → ${p.full_name}`,
                actorId: profile?.id,
            });
            setAction(null);
            setReload(x => x + 1);
        } catch (err: any) {
            toast.error(err?.message || t('jpp:users_detail_action_failed', 'Tindakan gagal.'));
        } finally {
            setBusy(false);
        }
    };

    const actionCopy = (() => {
        if (!action || !p) return { title: '', desc: '', label: '', variant: 'default' as const, destructive: false };
        if (action.kind === 'tier') {
            return {
                title: t('jpp:users_detail_action_tier_title', 'Tukar Tier AI'),
                desc: t('jpp:users_detail_action_tier_desc', 'Tukar tier {{name}} kepada {{tier}}?', { name: p.full_name, tier: action.newTier.toUpperCase() }),
                label: t('jpp:users_detail_action_confirm', 'Sahkan'),
                variant: 'default' as const,
                destructive: false,
            };
        }
        if (action.kind === 'role') {
            return {
                title: action.demote
                    ? t('jpp:users_detail_action_demote_title', 'Lucut Peranan JPP')
                    : t('jpp:users_detail_action_promote_title', 'Lantik Sebagai JPP'),
                desc: action.demote
                    ? t('jpp:users_detail_action_demote_desc', 'Lucutkan peranan JPP bagi {{name}}?', { name: p.full_name })
                    : t('jpp:users_detail_action_promote_desc', 'Lantik {{name}} sebagai barisan kepimpinan JPP?', { name: p.full_name }),
                label: t('jpp:users_detail_action_confirm', 'Sahkan'),
                variant: action.demote ? ('destructive' as const) : ('default' as const),
                destructive: action.demote,
            };
        }
        return {
            title: t('jpp:users_detail_action_phone_title', 'Reset Nombor Telefon'),
            desc: t('jpp:users_detail_action_phone_desc', 'Padam nombor telefon {{name}}? Pelajar perlu kemaskini semula.', { name: p.full_name }),
            label: t('jpp:users_detail_action_confirm', 'Sahkan'),
            variant: 'destructive' as const,
            destructive: true,
        };
    })();

    return (
        <SlideOverSheet
            open={Boolean(userId)}
            onOpenChange={open => !open && onClose()}
            title={t('jpp:users_detail_title', 'Maklumat Pelajar')}
            description={t('jpp:users_detail_subtitle', 'Profil lengkap — YDP & Super Admin JPP sahaja')}
            className="sm:max-w-2xl"
        >
            {loading && (
                <div className="space-y-3 animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-white/10" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-40 bg-slate-200 dark:bg-white/10 rounded" />
                            <div className="h-3 w-24 bg-slate-200/60 dark:bg-white/5 rounded" />
                        </div>
                    </div>
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-white/[0.03]" />)}
                </div>
            )}

            {!loading && !p && (
                <div className="py-20 text-center text-xs text-slate-400 dark:text-white/30 italic">{NO_DATA}</div>
            )}

            {!loading && p && (
                <div className="space-y-4 pb-6">
                    {/* Identity */}
                    <div className="flex items-start gap-4">
                        <img
                            src={p.avatar_url || initialsUrl(p.full_name)}
                            alt={p.full_name || 'Pelajar'}
                            className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
                            onError={e => { (e.target as HTMLImageElement).src = initialsUrl(p.full_name); }}
                        />
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">{p.full_name || 'Pelajar'}</h2>
                            <p className="text-[11px] font-mono text-slate-500 dark:text-white/40 mt-0.5">{p.matric_no || NO_DATA}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <Chip tone={p.role === 'SUPER_ADMIN_JPP' ? 'indigo' : p.role === 'JPP' ? 'blue' : 'slate'}>{p.role || '-'}</Chip>
                                {p.jpp_position && <Chip tone="amber">{String(p.jpp_position).replace(/_/g, ' ')}</Chip>}
                                <Chip tone={p.account_status === 'APPROVED' ? 'emerald' : 'amber'}>{p.account_status || '-'}</Chip>
                                <Chip tone={String(p.subscription_tier).toLowerCase() === 'pro' ? 'indigo' : 'slate'}>{p.subscription_tier || 'FREE'}</Chip>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Stat label={t('jpp:users_detail_stat_merit', 'Merit')} value={meritTotal.toLocaleString()} accent={themeColor} />
                        <Stat label={t('jpp:users_detail_stat_tokens', 'Token AI')} value={Number(p.ai_token_balance || 0).toLocaleString()} />
                        <Stat label={t('jpp:users_detail_stat_clubs', 'Kelab')} value={d!.clubs.length} />
                        <Stat label={t('jpp:users_detail_stat_year', 'Tahun')} value={p.intake_year || '-'} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Section icon={IdCard} title={t('jpp:users_detail_sec_personal', 'Maklumat Peribadi')}>
                            <Field label={t('jpp:users_detail_email', 'Email')} value={p.email} onCopy={p.email} copyLabel={t('jpp:users_detail_copied', 'Disalin!')} noData={NO_DATA} />
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 shrink-0 pt-0.5">{t('jpp:users_detail_phone', 'Telefon')}</span>
                                {p.phone ? (
                                    <span className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[11px] font-mono font-semibold text-slate-800 dark:text-white/80">
                                            {phoneRevealed ? p.phone : maskPhone(p.phone)}
                                        </span>
                                        <button
                                            onClick={revealPhone}
                                            title={phoneRevealed ? t('jpp:users_detail_hide', 'Sembunyi') : t('jpp:users_detail_reveal', 'Papar')}
                                            className="text-slate-300 dark:text-white/20 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
                                        >
                                            {phoneRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </span>
                                ) : (
                                    <span className="text-[11px] italic text-slate-400 dark:text-white/20">{NO_DATA}</span>
                                )}
                            </div>
                            <Field label={t('jpp:users_detail_department', 'Jabatan')} value={p.department} noData={NO_DATA} />
                            <Field label={t('jpp:users_detail_programme', 'Program')} value={p.programme_code} mono noData={NO_DATA} />
                            <Field
                                label={t('jpp:users_detail_intake', 'Intake')}
                                value={p.intake_year ? t('jpp:users_detail_intake_value', '{{year}} / Sesi {{period}}', { year: p.intake_year, period: p.intake_period || '-' }) : undefined}
                                noData={NO_DATA}
                            />
                        </Section>

                        <Section icon={Home} title={t('jpp:users_detail_sec_residency', 'Kediaman (KLK)')}>
                            <Field label={t('jpp:users_detail_area', 'Kawasan')} value={d!.resid?.kawasan_kediaman || d!.resid?.kawasan_custom} noData={NO_DATA} />
                            <Field
                                label={t('jpp:users_detail_offcampus', 'Tinggal Luar')}
                                value={d!.resid ? (d!.resid.tinggal_luar ? t('jpp:users_detail_yes', 'Ya') : t('jpp:users_detail_no', 'Tidak')) : undefined}
                                noData={NO_DATA}
                            />
                            <Field label={t('jpp:users_detail_semester', 'Semester')} value={d!.resid?.semester} mono noData={NO_DATA} />
                            <Field label={t('jpp:users_detail_academic_year', 'Tahun Akademik')} value={d!.resid?.academic_year} noData={NO_DATA} />
                            <Field label={t('jpp:users_detail_address', 'Alamat')} value={d!.resid?.alamat_kediaman} noData={NO_DATA} />
                            {!d!.resid && (
                                <button
                                    onClick={() => sendReminder('residency')}
                                    disabled={reminding}
                                    className="mt-1 w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                >
                                    <Bell className="w-3 h-3" /> {t('jpp:users_detail_send_reminder', 'Hantar Peringatan')}
                                </button>
                            )}
                        </Section>

                        <Section icon={Trophy} title={t('jpp:users_detail_sec_merit', 'Merit')}>
                            <div className="flex items-baseline gap-2 pb-1">
                                <span className="text-2xl font-black tabular-nums" style={{ color: themeColor }}>{meritTotal.toLocaleString()}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">{t('jpp:users_detail_merit_total', 'Jumlah Merit')}</span>
                            </div>
                            {meritBreakdownEmpty ? (
                                <p className="text-[10px] italic text-slate-400 dark:text-white/25">{t('jpp:users_detail_merit_breakdown_empty', 'Pecahan merit belum diisi dalam sistem.')}</p>
                            ) : (
                                meritParts.map(m => (
                                    <div key={m.key} className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-white/40">
                                            <span>{m.key}</span>
                                            <span className="tabular-nums">{m.val.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${(m.val / meritMax) * 100}%`, background: themeColor }} />
                                        </div>
                                    </div>
                                ))
                            )}
                            {d!.meritTx.length > 0 ? (
                                <div className="pt-2 mt-1 border-t border-slate-200 dark:border-white/[0.06] space-y-1.5">
                                    {d!.meritTx.map((tx: any, i: number) => (
                                        <div key={i} className="flex justify-between gap-2 text-[10px]">
                                            <span className="text-slate-600 dark:text-white/50 truncate">{tx.reason || tx.source || '-'}</span>
                                            <span className={cn('font-black tabular-nums shrink-0', Number(tx.points) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                                {Number(tx.points) >= 0 ? '+' : ''}{Number(tx.points)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] italic text-slate-400 dark:text-white/20 pt-1">{t('jpp:users_detail_merit_none', 'Tiada transaksi merit')}</p>
                            )}
                        </Section>

                        <Section icon={GraduationCap} title={t('jpp:users_detail_sec_academic', 'Akademik (PNGK)')}>
                            {d!.cgpa.length ? (
                                <div className="space-y-1.5">
                                    {d!.cgpa.map((c: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
                                            <span className="text-slate-500 dark:text-white/40 font-bold">{c.tahun || '-'} · {t('jpp:users_detail_sem_short', 'Sem')} {c.semester ?? '-'}</span>
                                            <span className="flex items-center gap-2">
                                                <span className="font-mono tabular-nums text-slate-700 dark:text-white/70">{t('jpp:users_detail_gpa', 'PNGK')} {c.pnm ?? '-'}</span>
                                                <span className="font-mono font-black tabular-nums" style={{ color: themeColor }}>{t('jpp:users_detail_cgpa', 'HPNM')} {c.hpnm ?? '-'}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <p className="text-[10px] italic text-slate-400 dark:text-white/25">{NO_DATA}</p>
                                    <button
                                        onClick={() => sendReminder('academic')}
                                        disabled={reminding}
                                        className="mt-1 w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                    >
                                        <Bell className="w-3 h-3" /> {t('jpp:users_detail_send_reminder', 'Hantar Peringatan')}
                                    </button>
                                </>
                            )}
                        </Section>

                        <Section icon={Users} title={t('jpp:users_detail_sec_clubs', 'Kelab & Jawatan')}>
                            {d!.clubs.length ? (
                                <div className="space-y-2">
                                    {d!.clubs.map((m: any, i: number) => (
                                        <div key={i} className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-slate-800 dark:text-white/80 truncate">{m.club?.name || '-'}</p>
                                                <p className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-white/30">
                                                    {m.role || '-'}{m.is_primary ? ` · ${t('jpp:users_detail_primary', 'Utama')}` : ''}
                                                </p>
                                            </div>
                                            <Chip tone={m.account_status === 'APPROVED' ? 'emerald' : m.account_status === 'PENDING' ? 'amber' : 'rose'}>
                                                {m.account_status || '-'}
                                            </Chip>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] italic text-slate-400 dark:text-white/25">{NO_DATA}</p>
                            )}
                        </Section>

                        <Section icon={Briefcase} title={t('jpp:users_detail_sec_business', 'Keusahawanan')}>
                            {d!.biz.length ? (
                                <div className="space-y-2">
                                    {d!.biz.map((b: any, i: number) => (
                                        <div key={i} className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-slate-800 dark:text-white/80 truncate">{b.keusahawanan_businesses?.name || '-'}</p>
                                                <p className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-white/30">{b.role || '-'}</p>
                                            </div>
                                            <Chip tone={b.status === 'ACTIVE' || b.status === 'APPROVED' ? 'emerald' : 'slate'}>{b.status || '-'}</Chip>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] italic text-slate-400 dark:text-white/25">{NO_DATA}</p>
                            )}
                        </Section>

                        <Section icon={ShieldCheck} title={t('jpp:users_detail_sec_account', 'Akaun')} className="sm:col-span-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                                <Field label={t('jpp:users_detail_registered', 'Didaftar')} value={fmtDate(p.created_at, 'dd MMM yyyy, h:mm a', NO_DATA)} noData={NO_DATA} />
                                <Field label={t('jpp:users_detail_stat_tokens', 'Token AI')} value={Number(p.ai_token_balance || 0).toLocaleString()} mono noData={NO_DATA} />
                                <Field label={t('jpp:users_detail_ai_status', 'Status AI')} value={p.ai_status} noData={NO_DATA} />
                                <Field label={t('jpp:users_detail_ai_today', 'Guna AI Hari Ini')} value={p.ai_daily_usage != null ? Number(p.ai_daily_usage).toLocaleString() : undefined} mono noData={NO_DATA} />
                                <Field label={t('jpp:users_detail_tier_expiry', 'Tier Luput')} value={p.ai_tier_expiration ? fmtDate(p.ai_tier_expiration, 'dd MMM yyyy', NO_DATA) : undefined} noData={NO_DATA} />
                                <Field label={t('jpp:users_detail_language', 'Bahasa')} value={p.preferred_language?.toUpperCase()} noData={NO_DATA} />
                                <Field label={t('jpp:users_detail_jpp_unit', 'Unit JPP')} value={p.jpp_unit} noData={NO_DATA} />
                                <Field label="ID" value={<span className="text-[9px]">{p.id}</span>} onCopy={p.id} copyLabel={t('jpp:users_detail_copied', 'Disalin!')} noData={NO_DATA} />
                            </div>
                        </Section>

                        {/* Quick actions */}
                        <Section icon={Zap} title={t('jpp:users_detail_sec_actions', 'Tindakan Pantas')} className="sm:col-span-2">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setAction({ kind: 'tier', newTier: String(p.subscription_tier).toLowerCase() === 'pro' ? 'free' : 'pro' })}
                                    className="px-3 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/20 transition-colors"
                                >
                                    {String(p.subscription_tier).toLowerCase() === 'pro'
                                        ? t('jpp:users_detail_act_downgrade', 'Turun ke FREE')
                                        : t('jpp:users_detail_act_upgrade', 'Naik ke PRO')}
                                </button>
                                {(profile?.role === 'SUPER_ADMIN_JPP' || profile?.jpp_position === 'YDP' || profile?.jpp_position === 'YANG_DIPERTUA') && p.role !== 'SUPER_ADMIN_JPP' && (
                                    <button
                                        onClick={() => setAction({ kind: 'role', demote: p.role === 'JPP' })}
                                        className={cn(
                                            'px-3 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-colors',
                                            p.role === 'JPP'
                                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 hover:bg-rose-500/20'
                                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/25',
                                        )}
                                    >
                                        {p.role === 'JPP'
                                            ? t('jpp:users_detail_act_demote', 'Lucut JPP')
                                            : t('jpp:users_detail_act_promote', 'Lantik JPP')}
                                    </button>
                                )}
                                {p.phone && (
                                    <button
                                        onClick={() => setAction({ kind: 'phone' })}
                                        className="px-3 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                    >
                                        {t('jpp:users_detail_act_reset_phone', 'Reset Telefon')}
                                    </button>
                                )}
                            </div>
                        </Section>
                    </div>

                    <p className="text-center text-[9px] uppercase tracking-[0.18em] text-slate-300 dark:text-white/15 pt-1">
                        {t('jpp:users_detail_footer', 'Data diambil secara langsung dari pangkalan data JPP')}
                    </p>
                </div>
            )}

            <ConfirmDialog
                open={Boolean(action)}
                onOpenChange={open => !open && setAction(null)}
                title={actionCopy.title}
                description={actionCopy.desc}
                confirmLabel={actionCopy.label}
                cancelLabel={t('common:cancel', 'Batal')}
                variant={actionCopy.variant}
                isLoading={busy}
                onConfirm={runAction}
            />
        </SlideOverSheet>
    );
}
