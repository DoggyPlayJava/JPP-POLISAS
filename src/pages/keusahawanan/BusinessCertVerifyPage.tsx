import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Users,
  Calendar,
  MapPin,
  FileCheck,
  Lock,
  Loader2,
  Award,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import jppLogoLandscape from '@/assets/Logo-JPP-Laporan.jpeg';
import {
  computeDocumentRef,
  computeIntegrityDigest,
  deriveEntityStructure,
  formatMalayDate,
  formatMalayDateTime,
  getRegistrationAuthorityMeta,
  resolveRegistrationNumber,
  resolveRegistrationType,
} from '@/lib/businessCertificate';

interface PublicVerifiedBusiness {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_active: boolean;
  registration_type: string | null;
  ssm_registration_number: string | null;
  registration_history: Array<{ type: string; number: string; changed_at?: string | null }>;
  mentors: Array<{ name: string; department: string }>;
  category_name: string;
  owner_name: string;
  member_count: number;
  created_at: string;
  approved_at: string | null;
  polymart_is_active: boolean;
  is_ems_siswapreneur: boolean;
  puskep_upgrade_status: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BusinessCertVerifyPage: React.FC = () => {
  const { t } = useTranslation(['keusahawanan', 'common']);
  const { ref } = useParams<{ ref?: string }>();
  const navigate = useNavigate();

  const [queryInput, setQueryInput] = useState(ref ? decodeURIComponent(ref) : '');
  const [loading, setLoading] = useState(Boolean(ref));
  const [record, setRecord] = useState<PublicVerifiedBusiness | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requiresAuthHint, setRequiresAuthHint] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string>('');

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      setRecord(null);
      setErrorMsg(null);
      setRequiresAuthHint(false);
      return;
    }
    const decoded = decodeURIComponent(ref).trim();
    setQueryInput(decoded);
    runLookup(decoded);
  }, [ref]);

  const runLookup = async (lookupRaw: string) => {
    const cleanRef = lookupRaw.trim();
    if (!cleanRef) return;

    setLoading(true);
    setErrorMsg(null);
    setRequiresAuthHint(false);
    setRecord(null);

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        'verify_keusahawanan_certificate',
        { p_lookup: cleanRef }
      );

      if (!rpcErr) {
        if (!rpcData) {
          setErrorMsg(
            t(
              'keusahawanan:cert_verify_not_found',
              'Tiada rekod perniagaan ditemui bagi kod pendaftaran atau rujukan "{{code}}".',
              { code: cleanRef }
            )
          );
        } else {
          setRecord(rpcData as PublicVerifiedBusiness);
          setVerifiedAt(new Date().toISOString());
        }
        return;
      }

      // Graceful fallback if public RPC migration has not yet been applied remotely
      const rpcMissing =
        rpcErr.code === '42883' ||
        rpcErr.code === 'PGRST202' ||
        /Could not find the function|does not exist/i.test(rpcErr.message || '');

      if (!rpcMissing) throw rpcErr;

      const { data: sessionRes } = await supabase.auth.getSession();
      if (!sessionRes.session) {
        setRequiresAuthHint(true);
        setErrorMsg(
          t(
            'keusahawanan:cert_verify_rpc_pending_login',
            'Pengesahan awam tanpa log masuk sedang diselaraskan. Sila log masuk ke Portal JPP POLISAS untuk mengesahkan rekod sijil ini.'
          )
        );
        return;
      }

      const isUuid = UUID_REGEX.test(cleanRef);
      let bizQuery = supabase
        .from('keusahawanan_businesses')
        .select(
          'id, name, description, status, is_active, registration_type, ssm_registration_number, registration_history, mentors, created_at, polymart_is_active, is_ems_siswapreneur, puskep_upgrade_status, category:category_id(name), owner:profiles!keusahawanan_businesses_owner_id_fkey(full_name)'
        );

      if (isUuid) {
        bizQuery = bizQuery.eq('id', cleanRef);
      } else {
        bizQuery = bizQuery.ilike('ssm_registration_number', cleanRef);
      }

      const { data: bizRow, error: bizErr } = await bizQuery
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bizErr) throw bizErr;
      if (!bizRow) {
        setErrorMsg(
          t(
            'keusahawanan:cert_verify_not_found',
            'Tiada rekod perniagaan ditemui bagi kod pendaftaran atau rujukan "{{code}}".',
            { code: cleanRef }
          )
        );
        return;
      }

      const [memCountRes, approvedLogRes] = await Promise.all([
        supabase
          .from('student_business_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', bizRow.id)
          .eq('status', 'ACTIVE'),
        supabase
          .from('keusahawanan_logs')
          .select('created_at')
          .eq('business_id', bizRow.id)
          .eq('action_type', 'BUSINESS_APPROVED')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const bizAny = bizRow as any;
      setRecord({
        id: bizRow.id,
        name: bizRow.name,
        description: bizRow.description,
        status: bizRow.status,
        is_active: bizRow.is_active !== false,
        registration_type: bizRow.registration_type,
        ssm_registration_number: bizRow.ssm_registration_number,
        registration_history: Array.isArray(bizAny.registration_history)
          ? bizAny.registration_history
          : [],
        mentors: Array.isArray(bizAny.mentors) ? bizAny.mentors : [],
        category_name: bizAny.category?.name || 'Keusahawanan Umum',
        owner_name: bizAny.owner?.full_name || 'Pemilik Berdaftar',
        member_count: Math.max(1, memCountRes.count || 1),
        created_at: bizRow.created_at,
        approved_at: approvedLogRes.data?.created_at || null,
        polymart_is_active: Boolean(bizRow.polymart_is_active),
        is_ems_siswapreneur: Boolean(bizAny.is_ems_siswapreneur),
        puskep_upgrade_status: bizAny.puskep_upgrade_status || null,
      });
      setVerifiedAt(new Date().toISOString());
    } catch (err: any) {
      console.error('Certificate verification failed:', err);
      setErrorMsg(
        err?.message ||
          t('keusahawanan:cert_verify_error', 'Gagal menyemak pengesahan pendaftaran perniagaan.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = queryInput.trim();
    if (!clean) {
      toast.error(
        t(
          'keusahawanan:cert_verify_input_required',
          'Sila masukkan No. Pendaftaran SSM / PUSKEP / EMS.'
        )
      );
      return;
    }
    navigate(`/keusahawanan/sijil/${encodeURIComponent(clean)}`);
  };

  const renderResult = () => {
    if (!record) return null;

    const regType = resolveRegistrationType(record);
    const regNo = resolveRegistrationNumber(record);
    const meta = getRegistrationAuthorityMeta(regType);
    const entity = deriveEntityStructure(record.member_count);
    const docRef = computeDocumentRef(record.id, regType, record.created_at);
    const digest = computeIntegrityDigest({
      businessId: record.id,
      registrationType: regType,
      registrationNumber: regNo,
      businessName: record.name,
      ownerName: record.owner_name,
      status: record.status,
    });

    const isOfficialActive = record.status === 'ACTIVE' && record.is_active;
    const isPending = record.status === 'PENDING_INTERVIEW';

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden text-left">
        {/* Status Banner */}
        <div
          className={`px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b ${
            isOfficialActive
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : isPending
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isOfficialActive ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : isPending ? (
              <Clock className="w-5 h-5 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 shrink-0" />
            )}
            <div>
              <p className="text-xs sm:text-sm font-black tracking-wide uppercase">
                {isOfficialActive
                  ? t('keusahawanan:cert_status_verified_active', 'SAH & BERDAFTAR AKTIF')
                  : isPending
                  ? t(
                      'keusahawanan:cert_status_pending',
                      'DALAM PROSES KELULUSAN / TEMUDUGA'
                    )
                  : t('keusahawanan:cert_status_inactive', 'TIDAK AKTIF / REKOD DITOLAK')}
              </p>
              <p className="text-[11px] opacity-85">
                {t('keusahawanan:cert_verified_timestamp', 'Disemak secara langsung: {{time}}', {
                  time: formatMalayDateTime(verifiedAt),
                })}
              </p>
            </div>
          </div>

          <span
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
            style={{ background: meta.accentColor }}
          >
            {meta.badgeLabel}
          </span>
        </div>

        {/* Masthead & Hero Code */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src="/polisas-logo.jpg"
                alt="POLISAS"
                className="h-10 w-auto rounded object-contain bg-white p-0.5"
              />
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  POLITEKNIK SULTAN HAJI AHMAD SHAH
                </p>
                <p className="text-[11px] font-bold text-[#831010] dark:text-amber-400">
                  PUSAT KEUSAHAWANAN POLITEKNIK (PUSKEP) • JPP-POLISAS
                </p>
              </div>
            </div>
            <img
              src={jppLogoLandscape}
              alt="JPP POLISAS"
              className="h-8 w-auto rounded object-contain bg-white p-0.5 hidden sm:block"
            />
          </div>

          {/* Business Name & Reg Code */}
          <div className="rounded-2xl p-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t('keusahawanan:business_name', 'Nama Perniagaan')}
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase mt-0.5">
                  {record.name}
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono tabular-nums text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {docRef}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t('keusahawanan:cert_reg_code_label', 'No. Kod Pendaftaran ({{type}})', {
                    type: regType,
                  })}
                </p>
                <p className="text-lg font-mono tabular-nums font-black text-[#831010] dark:text-amber-400 mt-0.5">
                  {regNo || t('keusahawanan:cert_reg_not_assigned', 'BELUM DINYATAKAN')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t('keusahawanan:cert_integrity_digest_label', 'Kod Integriti Digital')}
                </p>
                <p className="text-sm font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {digest}
                </p>
              </div>
            </div>
          </div>

          {/* Statutory Metadata Grid */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {t('keusahawanan:cert_sector_entity_label', 'Sektor & Bentuk Entiti')}
              </p>
              <p className="font-black text-slate-900 dark:text-white uppercase">
                {record.category_name}
              </p>
              <p className="text-slate-600 dark:text-slate-400">{entity.labelMs}</p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {t('keusahawanan:cert_owner_team_label', 'Pemilik & Pasukan Aktif')}
              </p>
              <p className="font-black text-slate-900 dark:text-white uppercase">
                {record.owner_name}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                {record.member_count} orang ahli aktif berdaftar
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {t('keusahawanan:cert_dates_label', 'Tarikh Pendaftaran & Kelulusan')}
              </p>
              <p className="font-bold text-slate-900 dark:text-white">
                Didaftar: {formatMalayDate(record.created_at)}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Diluluskan: {record.approved_at ? formatMalayDate(record.approved_at) : '—'}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {t('keusahawanan:cert_principal_place', 'Tempat Utama Operasi')}
              </p>
              <p className="font-bold text-slate-900 dark:text-white">
                Politeknik Sultan Haji Ahmad Shah (POLISAS)
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Semambu, 25350 Kuantan, Pahang Darul Makmur
              </p>
            </div>
          </div>

          {/* Description */}
          {record.description && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t('keusahawanan:biz_description', 'Bidang / Keterangan Perniagaan')}
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {record.description}
              </p>
            </div>
          )}

          {/* Mentors */}
          {record.mentors && record.mentors.length > 0 && (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                {t('keusahawanan:admin_advisory_mentors', 'Mentor Penasihat Berdaftar')}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {record.mentors
                  .filter((m) => m?.name)
                  .map((m, idx) => (
                    <div
                      key={`${m.name}-${idx}`}
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <p className="font-bold text-slate-900 dark:text-white uppercase">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-slate-500 uppercase">
                        {m.department || 'POLISAS'}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Registration History */}
          {record.registration_history && record.registration_history.length > 0 && (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t('keusahawanan:admin_past_records', 'Rekod Pendaftaran Terdahulu')}
              </p>
              <div className="flex flex-wrap gap-2">
                {record.registration_history.map((h, i) => (
                  <span
                    key={`${h.number}-${i}`}
                    className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300"
                  >
                    {h.type}: {h.number}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* PDPA Privacy Compliance Notice */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
            <p>
              {t(
                'keusahawanan:cert_pdpa_notice',
                'Selaras dengan amalan perlindungan data peribadi (PDPA), butiran peribadi pelajar (no. matrik, telefon peribadi, e-mel, dan maklumat akaun) tidak dipaparkan pada semakan awam.'
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 sm:p-6 md:p-8 pb-24 flex flex-col justify-between max-w-5xl mx-auto font-sans transition-colors">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common:back', 'Kembali')}
        </button>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#831010]/10 text-[#831010] dark:bg-amber-500/10 dark:text-amber-400 border border-[#831010]/20 dark:border-amber-500/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('keusahawanan:cert_official_badge', 'PUSKEP • JPP POLISAS')}
          </span>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="my-8 w-full max-w-3xl mx-auto space-y-6">
        {/* Search Card */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#831010]/10 dark:bg-amber-500/10 border border-[#831010]/20 dark:border-amber-500/20 flex items-center justify-center text-[#831010] dark:text-amber-400 mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('keusahawanan:cert_verify_title', 'Pengesahan Sijil Perniagaan Siswa')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              {t(
                'keusahawanan:cert_verify_subtitle',
                'Masukkan No. Pendaftaran SSM, No. Siri PUSKEP (cth: P-2026-001), atau Kod EMS untuk menyemak status pendaftaran rasmi di POLISAS.'
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FileCheck className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={t(
                  'keusahawanan:cert_verify_input_placeholder',
                  'Contoh: P-2026-001 atau 202403198765'
                )}
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono tabular-nums text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#831010]/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-12 px-6 rounded-2xl bg-[#831010] hover:bg-[#6d0d0d] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shrink-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{t('keusahawanan:cert_verify_btn', 'Semak Rekod')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3 text-slate-600 dark:text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-[#831010] dark:text-amber-400" />
            <p className="text-xs font-bold">
              {t('keusahawanan:cert_verifying_loading', 'Mengesahkan rekod pendaftaran perniagaan...')}
            </p>
          </div>
        )}

        {/* Error / Not Found Card */}
        {!loading && errorMsg && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-rose-500/30 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {requiresAuthHint
                  ? t('keusahawanan:cert_verify_auth_needed_title', 'Pengesahan Portal Diperlukan')
                  : t('keusahawanan:cert_verify_not_found_title', 'Rekod Tidak Dijumpai')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                {errorMsg}
              </p>
            </div>
            {requiresAuthHint && (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#831010] text-white text-xs font-black uppercase tracking-wider hover:brightness-110 transition"
              >
                {t('common:login', 'Log Masuk')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}

        {/* Verified Result */}
        {!loading && record && renderResult()}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-6 border-t border-slate-200 dark:border-slate-800/80">
        {t(
          'common:footer_copyright',
          '© {{year}} Jawatankuasa Perwakilan Pelajar (JPP) POLISAS. Hak Cipta Terpelihara.',
          { year: new Date().getFullYear() }
        )}
      </div>
    </div>
  );
};

export default BusinessCertVerifyPage;
