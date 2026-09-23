import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ExternalLink,
  Share2,
  Copy,
  Check,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Building,
  Calendar,
  Loader2,
  FolderOpen,
  LogIn,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import { fetchSubmissionByTrackingCode, getMakmpWhatsAppUrl, claimMakmpSubmission, MakmpClaimResult } from '@/lib/makmp';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { MakmpSubmission } from '@/types';
import { MakmpJppChrome, MakmpJppHeader } from '@/components/makmp/MakmpJppChrome';

export default function MakmpStatusTrackingPage() {
  const { user, profile, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [inputCode, setInputCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<MakmpSubmission | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Claim state (pautkan submission tetamu ke akaun)
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ type: 'success' | 'error' | 'confirm'; text: string } | null>(null);
  const [pendingClaim, setPendingClaim] = useState<MakmpClaimResult | null>(null);
  const [isGoogleLinking, setIsGoogleLinking] = useState(false);
  const claimAttemptedRef = useRef(false);

  // Auto-load jika ada parameter code dalam URL
  useEffect(() => {
    if (initialCode) {
      handleSearchCode(initialCode);
    }
  }, [initialCode]);

  const handleSearchCode = async (codeToSearch: string) => {
    const clean = codeToSearch.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setErrorMsg(null);
    setHasSearched(true);

    try {
      const data = await fetchSubmissionByTrackingCode(clean);
      if (!data) {
        setSubmission(null);
        setErrorMsg(`Tiada rekod permohonan ditemui bagi kod "${clean}". Sila pastikan kod rujukan anda betul.`);
      } else {
        setSubmission(data);
        setSearchParams({ code: clean });
      }
    } catch (err: any) {
      setErrorMsg('Ralat semasa mencari rekod: ' + err.message);
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!submission?.tracking_code) return;
    navigator.clipboard.writeText(submission.tracking_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Claim / pautkan submission tetamu ke akaun ────────────────────────────
  const persistClaimCode = () => {
    try {
      sessionStorage.setItem('makmp_claim_code', submission?.tracking_code || '');
    } catch { /* abaikan */ }
  };

  const handleGoogleClaim = async () => {
    try {
      setIsGoogleLinking(true);
      persistClaimCode();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('[MAKMP claim Google error]', err);
      setClaimMsg({ type: 'error', text: err.message || 'Gagal menyambung ke Google.' });
      setIsGoogleLinking(false);
    }
  };

  // Lengkapkan profil portal daripada data submission (selepas claim)
  const completeProfileFromSubmission = async () => {
    if (!user || !submission) return;
    try {
      // ── GUARD INTEGRITY ─────────────────────────────────────────────
      // JANGAN overwrite matric_no profil dengan matric submission yang berbeza.
      const { data: existingProf, error: profErr } = await supabase
        .from('profiles')
        .select('matric_no')
        .eq('id', user.id)
        .maybeSingle();

      if (profErr) {
        console.warn('Gagal baca profil sedia ada:', profErr.message);
        return;
      }

      const existingMatric = (existingProf?.matric_no || '').trim().toUpperCase();
      const subMatric = (submission.matric_no || '').trim().toUpperCase();
      const matricChanged = existingMatric && existingMatric !== subMatric;

      const payload: Record<string, any> = {
        full_name: (profile?.full_name?.trim() ? profile.full_name : submission.full_name).toUpperCase(),
        phone: (profile?.phone?.trim() ? profile.phone : submission.phone || '').trim(),
        department: profile?.department?.trim() ? profile.department : (submission.department || ''),
        programme_code: profile?.programme_code?.trim() ? profile.programme_code : (submission.programme_code || null),
        intake_year: profile?.intake_year ? profile.intake_year : (submission.intake_year || null),
        intake_period: profile?.intake_period ? profile.intake_period : (submission.intake_period || null),
      };
      // matric hanya diisi jika profil belum ada matric, atau sama dengan submission.
      if (!matricChanged && !existingMatric) {
        payload.matric_no = subMatric;
      }

      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);

      if (error) {
        console.warn('Gagal lengkapkan profil dari submission:', error.message);
      } else {
        console.log('✅ Profil dilengkapkan dari submission MAKMP (matric dikekalkan)');
        await refetchProfile?.();
      }
    } catch (e) {
      console.warn('Ralat lengkapkan profil:', e);
    }
  };

  const doClaim = async (force: boolean) => {
    if (!submission) return;
    setClaiming(true);
    setClaimMsg(null);
    try {
      const res = await claimMakmpSubmission(submission.tracking_code, force);
      if (res.success && res.claimed) {
        setClaimMsg({
          type: 'success',
          text: res.message || 'Permohonan berjaya dipautkan ke akaun anda.',
        });
        setPendingClaim(null);
        await completeProfileFromSubmission();
        // Refresh submission supaya user_id ter-update
        const fresh = await fetchSubmissionByTrackingCode(submission.tracking_code);
        if (fresh) setSubmission(fresh);
      } else if (res.needs_confirmation) {
        setPendingClaim(res);
        setClaimMsg({
          type: 'confirm',
          text: 'Maklumat akaun tidak sepadan. Sahkan ini permohonan anda?',
        });
      } else {
        setClaimMsg({ type: 'error', text: res.message || 'Gagal memautkan permohonan.' });
      }
    } catch (err: any) {
      setClaimMsg({ type: 'error', text: err.message || 'Gagal memautkan permohonan.' });
    } finally {
      setClaiming(false);
    }
  };

  // Auto-claim selepas login Google (bila ada kod claim disimpan & submission tetamu)
  useEffect(() => {
    if (!user || !submission || submission.user_id) return;
    if (claimAttemptedRef.current) return;
    const savedCode = sessionStorage.getItem('makmp_claim_code');
    if (!savedCode) return;
    if (savedCode.toUpperCase() !== submission.tracking_code.toUpperCase()) return;

    claimAttemptedRef.current = true;
    sessionStorage.removeItem('makmp_claim_code');
    doClaim(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, submission]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISAHKAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>DISAHKAN & LULUS</span>
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            <span>PERMOHONAN DITOLAK</span>
          </span>
        );
      case 'DALAM_SEMAKAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>DALAM SEMAKAN JURI</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>MENUNGGU SEMAKAN</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">

      <MakmpJppHeader subtitle="Semakan Status Permohonan" />
      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to="/makmp" className="flex items-center gap-2 group text-xs text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Borang Pencalonan</span>
          </Link>

          <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            Semakan Status <span className="text-amber-400">MAKMP</span>
          </div>

          <Link
            to="/"
            className="text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Portal JPP
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 pb-28 md:pb-12">
        {/* Search Box */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl mb-8 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-amber-400" />
              Semak Status Penyerahan Sijil
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Masukkan kod rujukan rasmi (contoh: <span className="font-mono text-amber-400">MAKMP-2026-XXXXX</span>) yang diberikan semasa anda menghantar borang.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchCode(inputCode);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="MAKMP-2026-..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white uppercase placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Cari</span>
            </button>
          </form>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200 text-xs flex items-center gap-3 mb-6 shadow-lg">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submission Details */}
        {submission && (
          <div className="space-y-6">
            {/* Main Status Card */}
            <div className="p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Kod Rujukan Rasmi
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-mono font-extrabold text-amber-400">
                      {submission.tracking_code}
                    </span>
                    <button
                      onClick={handleCopy}
                      title="Salin Kod"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Dihantar pada: {new Date(submission.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Status Keseluruhan
                  </div>
                  {getStatusBadge(submission.status)}
                </div>
              </div>

              {/* Biodata Pelajar Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Nama Pelajar</span>
                  <div className="font-semibold text-white truncate" title={submission.full_name}>{submission.full_name}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500">No. Matrik</span>
                  <div className="font-mono font-bold text-amber-400">{submission.matric_no}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Jabatan & Semester</span>
                  <div className="font-semibold text-white">
                    {submission.department} (Sem {submission.semester || 1})
                  </div>
                </div>

              </div>

              {/* Claim / Pautkan ke Akaun (hanya bila submission belum ada user_id) */}
              {!submission.user_id && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">
                        Permohonan ini belum dipautkan ke akaun JPP Portal
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pautkan akaun anda supaya sijil & merit yang diluluskan nanti auto-simpan ke dokumen peribadi e-akademik anda.
                      </p>
                    </div>
                  </div>

                  {/* Belum login → tawarkan login Google */}
                  {!user && (
                    <button
                      type="button"
                      onClick={handleGoogleClaim}
                      disabled={isGoogleLinking}
                      className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isGoogleLinking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyambung ke Google...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span>Log Masuk dengan Google untuk Pautkan</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Sudah login → tawarkan claim */}
                  {user && (
                    <>
                      {claimMsg?.type === 'confirm' && pendingClaim ? (
                        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 space-y-2">
                          <p className="text-xs text-amber-200">
                            Akaun anda (<span className="font-mono">{pendingClaim.profile_matric || pendingClaim.profile_email || 'tiada matric'}</span>) tidak sepadan dengan permohonan (<span className="font-mono">{pendingClaim.submission_matric}</span>). Adakah ini permohonan anda?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => doClaim(true)}
                              disabled={claiming}
                              className="flex-1 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              Ya, Pautkan
                            </button>
                            <button
                              type="button"
                              onClick={() => { setClaimMsg(null); setPendingClaim(null); }}
                              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => doClaim(false)}
                          disabled={claiming}
                          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                          <span>Pautkan ke Akaun Saya</span>
                        </button>
                      )}
                    </>
                  )}

                  {claimMsg && claimMsg.type !== 'confirm' && (
                    <p className={`text-xs ${claimMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {claimMsg.type === 'success' ? '✅ ' : '⚠️ '}{claimMsg.text}
                    </p>
                  )}
                </div>
              )}

              {/* Lulus Merit Highlight */}
              {submission.status === 'DISAHKAN' && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Tahniah! Permohonan Diluluskan Juri</div>
                      <div className="text-xs text-emerald-300/90 mt-0.5">
                        Markah merit dan rekod pencapaian telah dikemas kini ke dalam profil e-akademik anda.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dokumen Peribadi sync banner (hanya bila disahkan & pelajar ada akaun) */}
              {submission.status === 'DISAHKAN' && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-300 shrink-0">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Sijil Telah Disimpan ke Dokumen Peribadi</div>
                      <div className="text-xs text-indigo-200/80 mt-0.5">
                        Sijil anda telah disusun secara automatik ke dalam folder "Sijil Penghargaan" di e-akademik.
                      </div>
                    </div>
                  </div>
                  {submission.user_id && profile?.id === submission.user_id ? (
                    <Link
                      to="/akademik/folder"
                      className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 hover:bg-indigo-500/30"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Lihat dalam Dokumen Peribadi
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 hover:bg-indigo-500/30"
                    >
                      Log Masuk untuk Lihat Dokumen
                    </Link>
                  )}
                </div>
              )}

              {/* Rejection notice if master status DITOLAK */}
              {submission.status === 'DITOLAK' && (
                <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Catatan Keputusan:</span>
                  </div>
                  <p className="pl-5 text-slate-300">
                    {submission.rejection_reason || 'Permohonan tidak memenuhi syarat kelayakan bagi edisi ini.'}
                  </p>
                </div>
              )}

              {/* MULTI-AWARD LIST */}
              {submission.awards && submission.awards.length > 0 ? (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      Anugerah Yang Dipohon ({submission.awards.length})
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      Setiap anugerah dinilai secara berasingan oleh panel juri berkenaan
                    </span>
                  </div>

                  <div className="space-y-4">
                    {submission.awards.map((awApp, idx) => {
                      // Items for this award: either from awApp.items or filtered from master submission.items
                      const awardItems = (awApp.items && awApp.items.length > 0)
                        ? awApp.items
                        : (submission.items || []).filter((it) => it.submission_award_id === awApp.id);

                      return (
                        <div
                          key={awApp.id || idx}
                          className="rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden shadow-md"
                        >
                          {/* Award Header */}
                          <div className="p-4 bg-slate-900/80 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  {awApp.award?.category_group || 'ANUGERAH KHAS'}
                                </span>
                                {awApp.award?.target_type === 'ENTITY' && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    Entiti / Kelab
                                  </span>
                                )}
                              </div>
                              <div className="text-base font-bold text-white">
                                {awApp.award?.name || `Anugerah #${idx + 1}`}
                              </div>

                              {/* Entity Info if applicable */}
                              {awApp.entity_name && (
                                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3 pt-0.5">
                                  <span>
                                    <strong className="text-slate-400">Entiti / Projek:</strong> {awApp.entity_name}
                                  </span>
                                  {awApp.applicant_role && (
                                    <span>
                                      <strong className="text-slate-400">Jawatan / Peranan:</strong> {awApp.applicant_role}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col sm:items-end gap-1 shrink-0">
                              {getStatusBadge(awApp.status)}
                            </div>
                          </div>

                          {/* Award Status Notes */}
                          {awApp.status === 'DITOLAK' && awApp.rejection_reason && (
                            <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
                              <span className="font-bold text-rose-400">Sebab Penolakan Anugerah: </span>
                              {awApp.rejection_reason}
                            </div>
                          )}

                          {awApp.review_notes && (
                            <div className="mx-4 mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs">
                              <span className="font-bold text-amber-400">Catatan Juri: </span>
                              {awApp.review_notes}
                            </div>
                          )}

                          {/* Award Documents List */}
                          <div className="p-4 space-y-2.5">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Dokumen / Sijil Disertakan ({awardItems.length})
                            </div>

                            {awardItems.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">
                                Tiada dokumen khusus dilampirkan bagi anugerah ini.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {awardItems.map((doc, dIdx) => (
                                  <div
                                    key={doc.id || dIdx}
                                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-slate-700 transition"
                                  >
                                    <div className="space-y-1 flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                          doc.document_type === 'LAPORAN'
                                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                            : doc.document_type === 'BUKTI_SOKONGAN'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}>
                                          {doc.document_type || 'SIJIL'}
                                        </span>
                                        <span className="font-semibold text-white truncate">
                                          {doc.nama_pencapaian}
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                        <span>Peringkat: {doc.peringkat}</span>
                                        <span>•</span>
                                        <span>Pencapaian: {doc.pencapaian_type}</span>
                                        {doc.tarikh && (
                                          <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1 text-slate-400">
                                              <Calendar className="w-3 h-3" />
                                              {doc.tarikh}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">

                                      <a
                                        href={doc.drive_view_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
                                        title="Buka Dokumen di Google Drive"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Buka Dokumen</span>
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Fallback jika submission lama tanpa rekod makmp_submission_awards */
                <div>
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Senarai Sijil & Pencapaian ({submission.items?.length || 0})
                  </h3>

                  <div className="space-y-3">
                    {submission.items?.map((item, i) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="font-bold text-sm text-white">
                            {i + 1}. {item.nama_pencapaian}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-slate-400">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              Peringkat: {item.peringkat}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              Pencapaian: {item.pencapaian_type}
                            </span>
                            {item.tarikh && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Calendar className="w-3 h-3" />
                                {item.tarikh}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">

                          <a
                            href={item.drive_view_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1"
                            title="Lihat Sijil"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Lihat</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp Share Button */}
              <div className="pt-2">
                <a
                  href={getMakmpWhatsAppUrl(
                    submission,
                    submission.awards && submission.awards.length > 0
                      ? submission.awards.map((a) => a.award?.name || 'Anugerah').join(', ')
                      : submission.category?.name
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Simpan / Kongsi Resit Ini ke WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      <MakmpJppChrome />
    </div>
  );
}
