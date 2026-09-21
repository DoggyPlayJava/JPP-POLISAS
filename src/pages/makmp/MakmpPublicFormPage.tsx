import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Search,
  UserCheck,
  UserPlus,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  Building,
  GraduationCap,
  Loader2,
  QrCode,
  Share2,
  FileDown,
  Users,
  Briefcase,
  Home,
  Trophy,
  Crown,
  Star,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  LogOut,
  X,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StudentSearchCombobox, StudentSelectData } from '@/components/ems/StudentSearchCombobox';
import {
  fetchActiveMakmpEdition,
  uploadMakmpCertificate,
  submitMakmpMultiAwardApplication,
  generateTrackingCode,
  getMakmpWhatsAppUrl,
  calculateSuggestedMerit,
  groupAwardsByCategory,
  fetchStudentAkademikCertificates,
  MAKMP_CATEGORY_GROUP_META,
  PERINGKAT_OPTIONS,
  PENCAPAIAN_TYPE_OPTIONS,
  JABATAN_OPTIONS,
  getJabatanLabel,
} from '@/lib/makmp';
import type {
  MakmpEdition,
  MakmpCategory,
  MakmpAwardDefinition,
  MakmpSubmission,
  MakmpSubmissionAward,
  MakmpSubmissionItem,
  MakmpPeringkat,
  MakmpPencapaianType,
  MakmpDocumentType,
  AkademikImportCertItem,
} from '@/types';
import { getSemesterInfo, INTAKE_YEARS } from '@/types';
import { MakmpJppChrome, MakmpJppHeader } from '@/components/makmp/MakmpJppChrome';

interface CertFormItem {
  id: string;
  nama_pencapaian: string;
  document_type: MakmpDocumentType;
  peringkat: MakmpPeringkat;
  pencapaian_type: MakmpPencapaianType;
  penganjur: string;
  tarikh: string;
  file: File | null;
  filePreviewName?: string;
  uploadedUrl?: string;
  uploadedFileId?: string;
  merit_suggested: number;
  akademik_pencapaian_id?: string | null;
  source?: 'MANUAL_UPLOAD' | 'E_AKADEMIK';
}

export default function MakmpPublicFormPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Scroll ke atas (header form) — dipanggil bila step bertukar / error muncul.
  // Guna behavior 'auto' (instant) + double requestAnimationFrame supaya tak
  // dibatalkan oleh React re-render (smooth scroll boleh ter-cancel bila DOM
  // berubah mid-animation, terutama pada mobile).
  const scrollToTop = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    });
  };

  // Ref ke banner error — supaya boleh scroll terus ke error bila validasi gagal.
  const errorRef = useRef<HTMLDivElement | null>(null);

  // Scroll terus ke banner error (bukan sekadar ke atas page). Bila student
  // tekan "Hantar Permohonan" tapi form tak lengkap, error banner ada di atas
  // content — auto-scroll ke sana supaya student nampak apa yang patut dibetulkan.
  const scrollToError = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (errorRef.current) {
          errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          scrollToTop();
        }
      });
    });
  };

  // Data Edisi, Kategori & Definisi Anugerah
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [edition, setEdition] = useState<MakmpEdition | null>(null);
  const [categories, setCategories] = useState<MakmpCategory[]>([]);
  const [awards, setAwards] = useState<MakmpAwardDefinition[]>([]);

  // Wizard Step: 1 = Akaun/Biodata, 2 = Pilihan Anugerah, 3 = Muat Naik Dokumen, 4 = Resit Selesai
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Pilihan Akaun & Biodata
  const [accountType, setAccountType] = useState<'PORTAL' | 'MANUAL'>('PORTAL');
  const [fullName, setFullName] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('perdagangan');
  const [programmeCode, setProgrammeCode] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [intakeYear, setIntakeYear] = useState<number | ''>('');
  const [intakePeriod, setIntakePeriod] = useState<1 | 2 | ''>('');
  const [hasPortalAccount, setHasPortalAccount] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Step 2: Multi-Award Selection
  const [selectedAwardIds, setSelectedAwardIds] = useState<string[]>([]);
  const [awardEntityData, setAwardEntityData] = useState<
    Record<string, { entity_name: string; applicant_role: string }>
  >({});

  // Step 3: Documents per Award
  const [awardDocuments, setAwardDocuments] = useState<Record<string, CertFormItem[]>>({});
  const [activeAwardTabId, setActiveAwardTabId] = useState<string>('');

  // Step 1: Inline Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLinking, setIsGoogleLinking] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // e-Akademik Certificate Picker Modal State
  const [studentAkademikCerts, setStudentAkademikCerts] = useState<AkademikImportCertItem[]>([]);
  const [loadingAkademikCerts, setLoadingAkademikCerts] = useState(false);
  const [isCertPickerOpen, setIsCertPickerOpen] = useState(false);
  const [certPickerTargetAwardId, setCertPickerTargetAwardId] = useState<string | null>(null);
  const [certPickerTargetDocId, setCertPickerTargetDocId] = useState<string | null>(null);
  const [certPickerYearFilter, setCertPickerYearFilter] = useState<'EDITION' | 'ALL'>('EDITION');
  const [certPickerSearch, setCertPickerSearch] = useState('');

  // Submit & Resit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [submissionResult, setSubmissionResult] = useState<MakmpSubmission | null>(null);
  const [createdAwardsList, setCreatedAwardsList] = useState<MakmpSubmissionAward[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const draftRestoredRef = useRef(false);

  // 1. Muat turun edisi aktif, kategori & 18 anugerah rasmi
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        const { edition: ed, categories: cats, awards: awds } = await fetchActiveMakmpEdition();
        setEdition(ed);
        setCategories(cats);
        setAwards(awds);
      } catch (err: any) {
        setErrorMessage('Gagal memuat turun maklumat anugerah: ' + err.message);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // 1b. Pulihkan draf borang (jika ada) selepas redirect Google OAuth
  //     atau sekadar refresh pertengahan isi borang sebagai tetamu.
  useEffect(() => {
    if (restoreDraft()) {
      draftRestoredRef.current = true;
    }
    // Bersihkan draf selepas 30 saat supaya tak kekal lama dalam session
    const t = setTimeout(() => {
      sessionStorage.removeItem(MAKMP_DRAFT_KEY);
    }, 30000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1c. Auto-kira semester daripada cohort (tahun + sesi) yang dipilih
  //     oleh tetamu (manual path). Login path sudah dikira dalam effect #2.
  useEffect(() => {
    if (intakeYear && intakePeriod) {
      const si = getSemesterInfo(
        Number(intakeYear),
        intakePeriod as 1 | 2,
        programmeCode === 'FTV',
        undefined,
        undefined,
        undefined
      );
      setSemester(si.semester || 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeYear, intakePeriod, programmeCode]);

  // 2. Auto-populate profil jika user log masuk di JPP Portal
  useEffect(() => {
    if (profile && user) {
      // Merge: guna nilai profil kalau ada, kalau tak kekalkan nilai sedia ada
      // (penting supaya draf yang dipulihkan selepas OAuth tidak ditimpa kosong).
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.matric_no) setMatricNo(profile.matric_no);
      if (profile.email || user.email) setEmail(profile.email || user.email || '');
      if (profile.phone) setPhone(profile.phone);
      if (profile.department) setDepartment(profile.department.toLowerCase());
      if (profile.programme_code) setProgrammeCode(profile.programme_code);
      if (profile.intake_year) setIntakeYear(profile.intake_year);
      if (profile.intake_period) setIntakePeriod(profile.intake_period as 1 | 2);
      // Auto-fetch semester dari data intake (profiles takde column 'semester' — dikira dari intake_year/period)
      if (profile.semester_override) {
        setSemester(Number(profile.semester_override) || 1);
      } else if (profile.intake_year) {
        const si = getSemesterInfo(
          profile.intake_year,
          (profile.intake_period as 1 | 2) || 1,
          profile.programme_code === 'FTV',
          undefined,
          undefined,
          profile.semester_override
        );
        setSemester(si.semester || 1);
      }
      setHasPortalAccount(true);
      setSelectedUserId(user.id);
      setAccountType('PORTAL');
    }
  }, [profile, user]);

  // 2b. Selepas login Google melalui MAKMP, lengkapkan profil portal secara
  //     automatik daripada data borang (matric, dept, cohort, phone, programme)
  //     supaya profile modal auto-fill 100% — pelajar tak perlu isi semula.
  useEffect(() => {
    if (user && draftRestoredRef.current && matricNo.trim()) {
      completeProfileFromMakmp(user.id);
      // Sekali sahaja — jangan ulang setiap kali matricNo berubah
      draftRestoredRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3. Muat turun sijil e-Akademik pelajar apabila user atau matricNo wujud
  useEffect(() => {
    async function loadAkademikCerts() {
      const currentUid = selectedUserId || user?.id || profile?.id;
      if (!currentUid && !matricNo.trim()) {
        setStudentAkademikCerts([]);
        return;
      }
      try {
        setLoadingAkademikCerts(true);
        const certs = await fetchStudentAkademikCertificates({
          userId: currentUid,
          matricNo: matricNo.trim(),
        });
        setStudentAkademikCerts(certs);
      } catch (err) {
        console.warn('Failed to fetch e-akademik certs:', err);
      } finally {
        setLoadingAkademikCerts(false);
      }
    }
    loadAkademikCerts();
  }, [selectedUserId, user?.id, profile?.id, matricNo]);

  // Log masuk pantas dari Step 1
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      let emailToUse = loginIdentifier.trim();
      if (!emailToUse.includes('@')) {
        const { data: resolved, error: rpcErr } = await supabase.rpc('resolve_login_identifier', {
          p_identifier: emailToUse,
        });
        if (rpcErr || !resolved || resolved.length === 0) {
          throw new Error('No. Matrik tidak dijumpai dalam pangkalan data POLISAS.');
        }
        if (resolved[0].error) throw new Error(resolved[0].error);
        emailToUse = resolved[0].email;
      }

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: loginPassword,
      });

      if (authErr) {
        if (authErr.message === 'Invalid login credentials') {
          throw new Error('No. Matrik / Emel atau kata laluan tidak tepat.');
        }
        throw authErr;
      }

      if (authData.user) {
        setSelectedUserId(authData.user.id);
        setHasPortalAccount(true);
        setLoginPassword('');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Log masuk gagal. Sila cuba lagi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ── Simpan & pulih draf borang merentasi redirect Google OAuth ──────────
  // Google OAuth redirect keluar page & balik semula — state React akan hilang.
  // Jadi kita simpan draf (termasuk anugerah & dokumen yang dipilih) ke
  // sessionStorage sebelum redirect, dan pulihkan selepas login selesai.
  const MAKMP_DRAFT_KEY = 'makmp_draft_v1';

  const persistDraft = () => {
    try {
      sessionStorage.setItem(
        MAKMP_DRAFT_KEY,
        JSON.stringify({
          fullName,
          matricNo,
          email,
          phone,
          department,
          programmeCode,
          semester,
          intakeYear,
          intakePeriod,
          selectedAwardIds,
          awardEntityData,
          awardDocuments,
          accountType,
          step,
        })
      );
    } catch (e) {
      console.warn('Gagal simpan draf MAKMP:', e);
    }
  };

  const restoreDraft = () => {
    try {
      const raw = sessionStorage.getItem(MAKMP_DRAFT_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d.fullName) setFullName(d.fullName);
      if (d.matricNo) setMatricNo(d.matricNo);
      if (d.email) setEmail(d.email);
      if (d.phone) setPhone(d.phone);
      if (d.department) setDepartment(d.department);
      if (d.programmeCode) setProgrammeCode(d.programmeCode);
      if (d.semester) setSemester(d.semester);
      if (d.intakeYear) setIntakeYear(d.intakeYear);
      if (d.intakePeriod) setIntakePeriod(d.intakePeriod);
      if (Array.isArray(d.selectedAwardIds)) setSelectedAwardIds(d.selectedAwardIds);
      if (d.awardEntityData) setAwardEntityData(d.awardEntityData);
      if (d.awardDocuments) setAwardDocuments(d.awardDocuments);
      if (d.accountType) setAccountType(d.accountType);
      return true;
    } catch (e) {
      console.warn('Gagal pulih draf MAKMP:', e);
      return false;
    }
  };

  // ── Lengkapkan profil portal daripada data borang MAKMP ──────────────────
  // Bila pelajar daftar/login Google melalui MAKMP, profil OAuth mereka
  // selalunya tak lengkap (tiada matric/department/cohort). Kita upsert
  // field yang diisi dalam borang MAKMP supaya profile modal auto-fill 100%.
  const completeProfileFromMakmp = async (uid: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim().toUpperCase(),
          matric_no: matricNo.trim().toUpperCase(),
          phone: phone.trim(),
          department: department,
          programme_code: programmeCode.trim() || null,
          intake_year: intakeYear ? Number(intakeYear) : null,
          intake_period: intakePeriod ? Number(intakePeriod) : null,
        })
        .eq('id', uid);
      if (error) console.warn('Gagal lengkapkan profil dari MAKMP:', error.message);
      else console.log('✅ Profil dilengkapkan dari data MAKMP untuk', matricNo);
    } catch (e) {
      console.warn('Ralat lengkapkan profil:', e);
    }
  };

  // ── Daftar/Login dengan Google (simpan draf + redirect) ──────────────────
  const handleGoogleLink = async () => {
    try {
      setIsGoogleLinking(true);
      persistDraft();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('[MAKMP Google link error]', err);
      setLoginError(err.message || 'Gagal menyambung ke Google.');
      setIsGoogleLinking(false);
    }
  };

  // Memilih sijil daripada modal e-Akademik ke dalam slot anugerah
  const handleSelectAkademikCert = (cert: AkademikImportCertItem) => {
    if (!certPickerTargetAwardId) return;

    let mappedPeringkat: MakmpPeringkat = 'KEBANGSAAN';
    const pUpper = (cert.peringkat || '').toUpperCase();
    if (pUpper.includes('ANTARABANGSA')) mappedPeringkat = 'ANTARABANGSA';
    else if (pUpper.includes('KEBANGSAAN')) mappedPeringkat = 'KEBANGSAAN';
    else if (pUpper.includes('NEGERI')) mappedPeringkat = 'NEGERI';
    else if (pUpper.includes('DAERAH')) mappedPeringkat = 'DAERAH';
    else if (pUpper.includes('POLITEKNIK') || pUpper.includes('DALAMAN')) mappedPeringkat = 'POLITEKNIK';

    let mappedType: MakmpPencapaianType = 'PESERTA';
    const nUpper = (cert.nama_pencapaian || '').toUpperCase();
    if (nUpper.includes('JOHAN') && !nUpper.includes('NAIB')) mappedType = 'JOHAN';
    else if (nUpper.includes('NAIB JOHAN') || nUpper.includes('KEDUA')) mappedType = 'NAIB_JOHAN';
    else if (nUpper.includes('KETIGA')) mappedType = 'KETIGA';
    else if (nUpper.includes('EMAS') || nUpper.includes('GOLD')) mappedType = 'PINGAT_EMAS';
    else if (nUpper.includes('PERAK') || nUpper.includes('SILVER')) mappedType = 'PINGAT_PERAK';
    else if (nUpper.includes('GANGSA') || nUpper.includes('BRONZE')) mappedType = 'PINGAT_GANGSA';

    const merit = calculateSuggestedMerit(mappedPeringkat, mappedType);

    setAwardDocuments((prev) => {
      const awardDocs = prev[certPickerTargetAwardId] || [];
      if (certPickerTargetDocId) {
        return {
          ...prev,
          [certPickerTargetAwardId]: awardDocs.map((d) =>
            d.id === certPickerTargetDocId
              ? {
                  ...d,
                  nama_pencapaian: cert.nama_pencapaian,
                  peringkat: mappedPeringkat,
                  pencapaian_type: mappedType,
                  penganjur: cert.penganjur || '',
                  tarikh: cert.tarikh ? cert.tarikh.split('T')[0] : d.tarikh,
                  file: null,
                  filePreviewName: cert.nama_pencapaian,
                  uploadedUrl: cert.drive_view_url || cert.drive_download_url || '',
                  uploadedFileId: cert.drive_file_id || undefined,
                  merit_suggested: merit,
                  akademik_pencapaian_id: cert.id,
                  source: 'E_AKADEMIK',
                }
              : d
          ),
        };
      } else {
        const aw = awards.find((a) => a.id === certPickerTargetAwardId);
        const limit = aw?.max_certificates || 5;
        if (awardDocs.length >= limit) {
          alert(`Had maksimum ${limit} dokumen untuk anugerah ini telah dicapai.`);
          return prev;
        }
        const newSlot: CertFormItem = {
          id: crypto.randomUUID(),
          nama_pencapaian: cert.nama_pencapaian,
          document_type: 'SIJIL',
          peringkat: mappedPeringkat,
          pencapaian_type: mappedType,
          penganjur: cert.penganjur || '',
          tarikh: cert.tarikh ? cert.tarikh.split('T')[0] : new Date().toISOString().split('T')[0],
          file: null,
          filePreviewName: cert.nama_pencapaian,
          uploadedUrl: cert.drive_view_url || cert.drive_download_url || '',
          uploadedFileId: cert.drive_file_id || undefined,
          merit_suggested: merit,
          akademik_pencapaian_id: cert.id,
          source: 'E_AKADEMIK',
        };

        // Jika hanya ada 1 slot yang masih kosong dan belum diisi, ganti slot tersebut
        if (
          awardDocs.length === 1 &&
          !awardDocs[0].nama_pencapaian.trim() &&
          !awardDocs[0].file &&
          !awardDocs[0].uploadedUrl
        ) {
          return {
            ...prev,
            [certPickerTargetAwardId]: [{ ...newSlot, id: awardDocs[0].id }],
          };
        }

        return {
          ...prev,
          [certPickerTargetAwardId]: [...awardDocs, newSlot],
        };
      }
    });

    setIsCertPickerOpen(false);
    setCertPickerTargetAwardId(null);
    setCertPickerTargetDocId(null);
  };

  // Helper: Inisialisasi dokumen untuk sesuatu anugerah
  const initAwardDocument = (award: MakmpAwardDefinition) => {
    setAwardDocuments((prev) => {
      if (prev[award.id] && prev[award.id].length > 0) return prev;
      const isReport = award.doc_requirement_type === 'REPORT_AND_EVIDENCE';
      return {
        ...prev,
        [award.id]: [
          {
            id: crypto.randomUUID(),
            nama_pencapaian: isReport ? `Laporan ${award.name}` : '',
            document_type: isReport ? 'LAPORAN' : 'SIJIL',
            peringkat: isReport ? 'POLITEKNIK' : 'KEBANGSAAN',
            pencapaian_type: isReport ? 'PESERTA' : 'PESERTA',
            penganjur: '',
            tarikh: new Date().toISOString().split('T')[0],
            file: null,
            merit_suggested: isReport ? 0 : 3,
          },
        ],
      };
    });
  };

  // Toggle pilihan anugerah di Step 2
  const handleToggleAward = (award: MakmpAwardDefinition) => {
    setSelectedAwardIds((prev) => {
      const exists = prev.includes(award.id);
      if (exists) {
        const updated = prev.filter((id) => id !== award.id);
        if (activeAwardTabId === award.id) {
          setActiveAwardTabId(updated.length > 0 ? updated[0] : null);
        }
        return updated;
      } else {
        initAwardDocument(award);
        if (!activeAwardTabId) {
          setActiveAwardTabId(award.id);
        }
        return [...prev, award.id];
      }
    });
  };

  // Handle student autocomplete
  const handleSelectStudent = (s: StudentSelectData) => {
    setFullName(s.full_name);
    setMatricNo(s.matrix_no);
    if (s.email) setEmail(s.email);
    if (s.department) setDepartment(s.department.toLowerCase());
    if (s.phone) setPhone(s.phone);
    setHasPortalAccount(true);
  };

  // Dokumen CRUD bagi anugerah aktif
  const currentAward = awards.find((a) => a.id === activeAwardTabId) || awards[0];
  const currentDocs = awardDocuments[activeAwardTabId] || [];
  const maxDocsAllowed = currentAward?.max_certificates || 5;

  const handleAddDocument = (awardId: string) => {
    const aw = awards.find((a) => a.id === awardId);
    const docs = awardDocuments[awardId] || [];
    const limit = aw?.max_certificates || 5;
    if (docs.length >= limit) return;

    const isReport = aw?.doc_requirement_type === 'REPORT_AND_EVIDENCE';
    const newDoc: CertFormItem = {
      id: crypto.randomUUID(),
      nama_pencapaian: '',
      document_type: isReport ? 'BUKTI_SOKONGAN' : 'SIJIL',
      peringkat: 'KEBANGSAAN',
      pencapaian_type: 'PESERTA',
      penganjur: '',
      tarikh: new Date().toISOString().split('T')[0],
      file: null,
      merit_suggested: isReport ? 0 : 3,
    };

    setAwardDocuments((prev) => ({
      ...prev,
      [awardId]: [...(prev[awardId] || []), newDoc],
    }));
  };

  const handleRemoveDocument = (awardId: string, docId: string) => {
    const docs = awardDocuments[awardId] || [];
    if (docs.length <= 1) return;
    setAwardDocuments((prev) => ({
      ...prev,
      [awardId]: prev[awardId].filter((d) => d.id !== docId),
    }));
  };

  const handleUpdateDocument = (
    awardId: string,
    docId: string,
    field: keyof CertFormItem,
    value: any
  ) => {
    setAwardDocuments((prev) => ({
      ...prev,
      [awardId]: (prev[awardId] || []).map((d) => {
        if (d.id !== docId) return d;
        const updated = { ...d, [field]: value };
        if (field === 'peringkat' || field === 'pencapaian_type') {
          updated.merit_suggested = calculateSuggestedMerit(
            field === 'peringkat' ? value : d.peringkat,
            field === 'pencapaian_type' ? value : d.pencapaian_type
          );
        }
        return updated;
      }),
    }));
  };

  // Validasi Step 1
  const validateStep1 = () => {
    if (!fullName.trim()) return 'Sila masukkan Nama Penuh anda.';
    if (!matricNo.trim()) return 'Sila masukkan No. Matrik POLISAS yang sah.';
    if (!phone.trim()) return 'Sila masukkan No. Telefon / WhatsApp untuk dihubungi.';
    if (!department) return 'Sila pilih Jabatan akademik anda.';
    if (!intakeYear) return 'Sila pilih Tahun Pengambilan anda.';
    if (!intakePeriod) return 'Sila pilih Sesi Pengambilan anda.';
    return null;
  };

  // Validasi Step 2
  const validateStep2 = () => {
    if (selectedAwardIds.length === 0) {
      return 'Sila pilih sekurang-kurangnya satu anugerah yang ingin dimohon.';
    }
    // Periksa anugerah ENTITY memerlukan nama entiti
    for (const awardId of selectedAwardIds) {
      const aw = awards.find((a) => a.id === awardId);
      if (aw && aw.target_type === 'ENTITY') {
        const entData = awardEntityData[awardId];
        if (!entData?.entity_name?.trim()) {
          return `Sila nyatakan Nama Kelab / Syarikat / Projek bagi anugerah "${aw.name}".`;
        }
      }
    }
    return null;
  };

  // Validasi Step 3
  const validateStep3 = () => {
    for (const awardId of selectedAwardIds) {
      const aw = awards.find((a) => a.id === awardId);
      const docs = awardDocuments[awardId] || [];
      if (docs.length === 0) {
        return `Sila muat naik sekurang-kurangnya satu fail dokumen untuk "${aw?.name || 'anugerah'}".`;
      }

      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        if (!d.nama_pencapaian.trim()) {
          return `${aw?.name} - Dokumen #${i + 1}: Sila nyatakan tajuk dokumen / aktiviti.`;
        }
        if (!d.file && !d.uploadedUrl) {
          return `${aw?.name} - Dokumen #${i + 1}: Sila pilih fail PDF atau gambar sijil.`;
        }
        if (d.file && d.file.size > 10 * 1024 * 1024) {
          return `${aw?.name} - Dokumen #${i + 1}: Saiz fail "${d.file.name}" (${(
            d.file.size /
            (1024 * 1024)
          ).toFixed(1)}MB) melebihi had maksimum 10MB. Sila pilih fail yang lebih kecil.`;
        }
      }
    }
    return null;
  };

  // Submit Keseluruhan Permohonan (Multi-Award Transaction)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const step3Err = validateStep3();
    if (step3Err) {
      setErrorMessage(step3Err);
      scrollToError();
      return;
    }

    if (!edition) {
      setErrorMessage('Maklumat edisi anugerah tidak lengkap.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Muat naik semua fail bagi setiap anugerah
      const preparedAwardsPayload: Array<{
        award_id: string;
        entity_name?: string | null;
        applicant_role?: string | null;
        items: Array<{
          nama_pencapaian: string;
          document_type: MakmpDocumentType;
          peringkat: MakmpPeringkat;
          pencapaian_type: MakmpPencapaianType;
          penganjur?: string | null;
          tarikh?: string | null;
          drive_view_url: string;
          drive_download_url?: string | null;
          drive_file_id?: string | null;
          merit_suggested: number;
          akademik_pencapaian_id?: string | null;
          source?: 'MANUAL_UPLOAD' | 'E_AKADEMIK';
        }>;
      }> = [];

      let totalUploadedFiles = 0;
      const totalFilesToUpload = selectedAwardIds.reduce(
        (sum, id) => sum + (awardDocuments[id] || []).length,
        0
      );

      for (const awardId of selectedAwardIds) {
        const aw = awards.find((a) => a.id === awardId);
        const docs = awardDocuments[awardId] || [];
        const entData = awardEntityData[awardId];

        const uploadedItemsForAward = [];

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          totalUploadedFiles++;
          setUploadProgressText(
            `Memuat naik fail ${totalUploadedFiles} / ${totalFilesToUpload} (${aw?.name})...`
          );

          let fileUrl = doc.uploadedUrl;
          let fileId = doc.uploadedFileId;

          if (!fileUrl && doc.file) {
            const uploadRes = await uploadMakmpCertificate(
              doc.file,
              matricNo,
              totalUploadedFiles - 1
            );
            fileUrl = uploadRes.url;
            fileId = uploadRes.fileId;
          }

          if (!fileUrl) {
            throw new Error(`Gagal memuat naik fail untuk ${aw?.name} (#${i + 1}).`);
          }

          uploadedItemsForAward.push({
            nama_pencapaian: doc.nama_pencapaian.trim(),
            document_type: doc.document_type || 'SIJIL',
            peringkat: doc.peringkat,
            pencapaian_type: doc.pencapaian_type,
            penganjur: doc.penganjur.trim() || null,
            tarikh: doc.tarikh || null,
            drive_view_url: fileUrl,
            drive_download_url: fileUrl,
            drive_file_id: fileId || null,
            merit_suggested: doc.merit_suggested || 0,
            akademik_pencapaian_id: doc.akademik_pencapaian_id || null,
            source: doc.source || 'MANUAL_UPLOAD',
          });
        }

        preparedAwardsPayload.push({
          award_id: awardId,
          entity_name: entData?.entity_name?.trim() || null,
          applicant_role: entData?.applicant_role?.trim() || null,
          items: uploadedItemsForAward,
        });
      }

      setUploadProgressText('Menyimpan rekod permohonan berbilang anugerah...');
      const trackingCode = generateTrackingCode(edition.year);

      // 2. Simpan permohonan ke pangkalan data
      const { submission, awards: createdAwards } = await submitMakmpMultiAwardApplication({
        submission: {
          tracking_code: trackingCode,
          edition_id: edition.id,
          user_id: selectedUserId || (user ? user.id : null),
          has_portal_account: hasPortalAccount || !!user,
          full_name: fullName.trim().toUpperCase(),
          matric_no: matricNo.trim().toUpperCase(),
          email: email.trim() || null,
          phone: phone.trim(),
          department: department,
          programme_code: programmeCode.trim() || null,
          semester: Number(semester) || 1,
          intake_year: intakeYear ? Number(intakeYear) : null,
          intake_period: intakePeriod ? Number(intakePeriod) : null,
        },
        awards: preparedAwardsPayload,
      });

      setSubmissionResult(submission);
      setCreatedAwardsList(createdAwards);
      setStep(4);
      scrollToTop();
    } catch (err: any) {
      console.error('[MAKMP Multi-Award Submission Error]', err);
      setErrorMessage(err.message || 'Berlaku ralat semasa menghantar permohonan. Sila cuba lagi.');
      scrollToTop();
    } finally {
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  const handleCopyCode = () => {
    if (!submissionResult?.tracking_code) return;
    navigator.clipboard.writeText(submissionResult.tracking_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Grouped awards for Step 2
  const groupedAwards = groupAwardsByCategory(awards);

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Memuat turun maklumat anugerah POLISAS...</p>
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Pencalonan Belum Dibuka</h1>
        <p className="text-slate-400 max-w-md mb-6">
          Tiada edisi Majlis Anugerah Kecemerlangan Mahasiswa POLISAS (MAKMP) yang dibuka pada masa ini.
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold transition"
        >
          Kembali ke Laman Utama
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">

      <MakmpJppHeader subtitle="Majlis Anugerah Kecemerlangan" />
      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
              <Award className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                MAKMP <span className="text-amber-400">{edition.year}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                  Multi-Award
                </span>
              </div>
              <div className="text-[11px] text-slate-400">POLISAS Excellence Awards</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/makmp/status"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition flex items-center gap-1.5 border border-slate-700/60"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Semak Status</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-6 pb-28 md:pb-12">
        {/* Banner Hero */}
        {step !== 4 && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 via-slate-900/40 to-slate-900 p-6 md:p-8 mb-8 shadow-xl">
            <div className="absolute -right-8 -top-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pencalonan Terbuka Rasmi Pelajar & Kelab POLISAS</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
                {edition.title}
              </h1>
              <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                Anda boleh memohon lebih daripada satu anugerah serentak. Hantar sijil pencapaian, portfolio, atau laporan projek keusahawanan/kelab anda untuk dinilai oleh pegawai penilai POLISAS.
              </p>

              {/* Step indicator */}
              <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-2">
                <div
                  className={`flex items-center gap-2 text-xs font-medium ${
                    step >= 1 ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      step >= 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    1
                  </div>
                  <span>Biodata Pelajar</span>
                </div>

                <div
                  className={`flex items-center gap-2 text-xs font-medium ${
                    step >= 2 ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      step >= 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    2
                  </div>
                  <span>Pilihan Anugerah ({selectedAwardIds.length})</span>
                </div>

                <div
                  className={`flex items-center gap-2 text-xs font-medium ${
                    step >= 3 ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      step >= 3 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    3
                  </div>
                  <span>Muat Naik Dokumen</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div
            ref={errorRef}
            className="mb-6 scroll-mt-28 p-4 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200 text-sm flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-300 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 1: PILIHAN AKAUN & BIODATA                                      */}
        {/* ==================================================================== */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="p-5 md:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  Status Akaun JPP Portal Anda
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih sama ada anda mempunyai akaun berdaftar dalam portal atau mengisi borang secara terus.
                </p>
              </div>

              {/* 2 Pilihan Kad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAccountType('PORTAL')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    accountType === 'PORTAL'
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <UserCheck
                      className={`w-5 h-5 ${
                        accountType === 'PORTAL' ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    {accountType === 'PORTAL' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="font-semibold text-sm text-white">
                    Saya Ada Akaun JPP Portal
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Cari profil anda secara pantas atau guna akaun sedia ada untuk auto-fill.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountType('MANUAL');
                    setHasPortalAccount(false);
                    setSelectedUserId(null);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    accountType === 'MANUAL'
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <UserPlus
                      className={`w-5 h-5 ${
                        accountType === 'MANUAL' ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    {accountType === 'MANUAL' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="font-semibold text-sm text-white">
                    Saya Belum Ada Akaun
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Isi butiran secara manual. Sijil & merit akan auto-link bila anda mendaftar nanti.
                  </div>
                </button>
              </div>

              {/* Jika pilih akaun portal dan sudah login, tampilkan kad profil disahkan */}
              {accountType === 'PORTAL' && profile && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{profile.full_name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Akaun Disahkan
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-amber-400">{profile.matric_no}</span>
                        <span>•</span>
                        <span>{getJabatanLabel(profile.department)}</span>
                        {profile.semester && (
                          <>
                            <span>•</span>
                            <span>Sem {profile.semester}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setSelectedUserId(null);
                        setFullName('');
                        setMatricNo('');
                        setEmail('');
                        setPhone('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Tukar Akaun</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Jika pilih akaun portal dan belum login, sediakan log masuk inline atau carian */}
              {accountType === 'PORTAL' && !profile && (
                <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-500/10 via-slate-900/60 to-slate-900/80 border border-amber-500/30 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      Log Masuk Akaun JPP Portal
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Log masuk untuk auto-fill biodata dan buka akses 1-klik import sijil daripada rekod e-Akademik anda.
                    </p>
                  </div>

                  <form onSubmit={handleInlineLogin} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          No. Matrik atau Emel POLISAS
                        </label>
                        <input
                          type="text"
                          required
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="cth: 02DNS22F1001 atau emel"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Kata Laluan Portal
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Kata laluan portal"
                            className="w-full px-3.5 py-2 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {loginError && (
                      <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 disabled:opacity-50 shadow-md shadow-amber-500/20"
                      >
                        {isLoggingIn ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengesahkan Akaun...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Log Masuk & Buka Rekod Sijil</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-px flex-1 bg-slate-800/80" />
                    <span className="text-[11px] font-semibold text-slate-500">atau</span>
                    <div className="h-px flex-1 bg-slate-800/80" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLink}
                    disabled={isGoogleLinking}
                    className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
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
                        <span>Daftar / Log Masuk dengan Google</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    💡 Daftar dengan Google supaya sijil & merit MAKMP anda auto-link ke akaun JPP Portal dan profil diisi automatik.
                  </p>

                  <div className="pt-3 border-t border-slate-800/80">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
                      <Search className="w-3.5 h-3.5 text-amber-400" />
                      Atau cari profil secara pantas tanpa log masuk (Mod Carian Sahaja):
                    </label>
                    <StudentSearchCombobox
                      onSelectStudent={handleSelectStudent}
                      placeholder="Taip Nama atau No. Matrik (cth: 02DNS...)"
                    />
                  </div>
                </div>
              )}

              {/* Form Input Butiran Biodata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Penuh (seperti dalam Kad Pelajar) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ahmad bin Abu"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nombor Matrik <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={matricNo}
                    onChange={(e) => setMatricNo(e.target.value.toUpperCase())}
                    placeholder="02DNS22F1001"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white uppercase placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    No. Telefon / WhatsApp <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0123456789"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Emel Pelajar
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ahmad@polisas.edu.my"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Jabatan Pengajian <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                  >
                    {JABATAN_OPTIONS.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Kod Program
                    </label>
                    <input
                      type="text"
                      value={programmeCode}
                      onChange={(e) => setProgrammeCode(e.target.value.toUpperCase())}
                      placeholder="DDT / DKA"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white uppercase placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Tahun Pengambilan <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={intakeYear}
                      onChange={(e) => setIntakeYear(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                    >
                      <option value="">Pilih tahun...</option>
                      {INTAKE_YEARS().map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Sesi Pengambilan <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIntakePeriod(1)}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
                        intakePeriod === 1
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Intake 1
                      <span className="block text-[10px] font-normal opacity-70">Pertengahan Tahun</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntakePeriod(2)}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
                        intakePeriod === 2
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Intake 2
                      <span className="block text-[10px] font-normal opacity-70">Awal Tahun</span>
                    </button>
                  </div>
                  {intakeYear && intakePeriod && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Semasa: Semester {semester}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const err = validateStep1();
                  if (err) {
                    setErrorMessage(err);
                    scrollToError();
                    return;
                  }
                  setErrorMessage(null);
                  setStep(2);
                  scrollToTop();
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
              >
                <span>Seterusnya: Pilih Anugerah</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 2: PILIHAN BERBILANG ANUGERAH (MULTI-AWARD SELECTION)           */}
        {/* ==================================================================== */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="p-5 md:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Pilih Jenis Anugerah Kecemerlangan
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Anda boleh memilih lebih daripada satu anugerah. Tanda anugerah yang ingin dimohon mengikut kategori di bawah.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs shrink-0">
                  {selectedAwardIds.length} Anugerah Dipilih
                </div>
              </div>

              {/* 9 Kumpulan Kategori Accordion/Cards */}
              <div className="space-y-6">
                {Object.entries(groupedAwards).map(([groupName, groupAwardList]) => {
                  const meta = MAKMP_CATEGORY_GROUP_META[groupName] || {
                    label: groupName,
                    icon: 'Award',
                    color: 'from-slate-800 to-slate-900 text-amber-400 border-slate-700',
                  };
                  const selectedInGroup = groupAwardList.filter((a) =>
                    selectedAwardIds.includes(a.id)
                  ).length;

                  return (
                    <div
                      key={groupName}
                      className="rounded-2xl border border-slate-800/90 bg-slate-950/60 overflow-hidden shadow-sm"
                    >
                      {/* Header Kumpulan */}
                      <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg bg-slate-800 text-amber-400`}>
                            <Trophy className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-white">{groupName}</span>
                            <span className="text-[11px] text-slate-400 ml-2">
                              ({groupAwardList.length} Anugerah)
                            </span>
                          </div>
                        </div>

                        {selectedInGroup > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                            {selectedInGroup} dipilih
                          </span>
                        )}
                      </div>

                      {/* Senarai Anugerah di Bawah Kumpulan Ini */}
                      <div className="p-4 space-y-3">
                        {groupAwardList.map((award) => {
                          const isSelected = selectedAwardIds.includes(award.id);
                          const isEntity = award.target_type === 'ENTITY';
                          const isReport = award.doc_requirement_type === 'REPORT_AND_EVIDENCE';

                          return (
                            <div
                              key={award.id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isSelected
                                  ? 'border-amber-500/80 bg-amber-500/10 shadow-sm'
                                  : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/40'
                              }`}
                            >
                              <div
                                onClick={() => handleToggleAward(award)}
                                className="flex items-start justify-between gap-3 cursor-pointer select-none"
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-5 h-5 rounded-lg border flex items-center justify-center mt-0.5 transition ${
                                      isSelected
                                        ? 'border-amber-400 bg-amber-500'
                                        : 'border-slate-700 bg-slate-900'
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-white flex items-center gap-2">
                                      <span>{award.name}</span>
                                      {isEntity && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                                          Kumpulan / Entiti
                                        </span>
                                      )}
                                      {isReport && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                          Laporan Projek
                                        </span>
                                      )}
                                    </div>
                                    {award.doc_instructions && (
                                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        {award.doc_instructions}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                    Maks. {award.max_certificates} Dokumen
                                  </span>
                                </div>
                              </div>

                              {/* Seksyen Tambahan Input Entiti jika target_type === 'ENTITY' dan dipilih */}
                              {isSelected && isEntity && (
                                <div className="mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                      Nama Kelab / Syarikat / Pasukan / Projek <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={awardEntityData[award.id]?.entity_name || ''}
                                      onChange={(e) =>
                                        setAwardEntityData((prev) => ({
                                          ...prev,
                                          [award.id]: {
                                            ...prev[award.id],
                                            entity_name: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="cth: Kelab Robotik POLISAS / RichTech Enterprise"
                                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                      Jawatan / Peranan Anda
                                    </label>
                                    <input
                                      type="text"
                                      value={awardEntityData[award.id]?.applicant_role || ''}
                                      onChange={(e) =>
                                        setAwardEntityData((prev) => ({
                                          ...prev,
                                          [award.id]: {
                                            ...prev[award.id],
                                            applicant_role: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="cth: Yang Dipertua / Pengarah Projek / Pengasas"
                                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep(1); scrollToTop(); }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const err = validateStep2();
                  if (err) {
                    setErrorMessage(err);
                    scrollToError();
                    return;
                  }
                  setErrorMessage(null);
                  if (!activeAwardTabId && selectedAwardIds.length > 0) {
                    setActiveAwardTabId(selectedAwardIds[0]);
                  }
                  setStep(3);
                  scrollToTop();
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
              >
                <span>Seterusnya: Muat Naik Dokumen ({selectedAwardIds.length} Anugerah)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 3: MUAT NAIK DOKUMEN BERASINGAN MENGIKUT ANUGERAH               */}
        {/* ==================================================================== */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-5 md:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Muat Naik Dokumen Sijil & Laporan
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih tab anugerah di bawah untuk memuat naik dokumen yang diperlukan bagi setiap anugerah yang anda mohon.
                </p>
              </div>

              {/* Tab Selector untuk Setiap Anugerah yang Dipilih */}
              <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
                {selectedAwardIds.map((awardId) => {
                  const aw = awards.find((a) => a.id === awardId);
                  const docs = awardDocuments[awardId] || [];
                  const isActive = awardId === activeAwardTabId;

                  return (
                    <button
                      key={awardId}
                      type="button"
                      onClick={() => setActiveAwardTabId(awardId)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{aw?.name || 'Anugerah'}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-amber-300'
                        }`}
                      >
                        {docs.length}/{aw?.max_certificates || 5}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Kandungan Tab Anugerah Aktif */}
              {currentAward && (
                <div className="space-y-6">
                  {/* Header Ringkasan Anugerah */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        {currentAward.category_group}
                      </span>
                      <h3 className="text-base font-extrabold text-white mt-0.5">
                        {currentAward.name}
                      </h3>
                      {awardEntityData[currentAward.id]?.entity_name && (
                        <p className="text-xs text-purple-300 mt-0.5">
                          🏢 Entiti: <strong>{awardEntityData[currentAward.id].entity_name}</strong>
                          {awardEntityData[currentAward.id].applicant_role && (
                            <span> ({awardEntityData[currentAward.id].applicant_role})</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                        Had: {maxDocsAllowed} Dokumen
                      </span>
                    </div>
                  </div>

                  {/* Banner Muat Turun Templat Laporan jika jenis REPORT_AND_EVIDENCE */}
                  {currentAward.doc_requirement_type === 'REPORT_AND_EVIDENCE' && (
                    <div className="p-4 md:p-5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                          <FileDown className="w-4 h-4" />
                          <span>Templat Laporan Rasmi Disediakan</span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Unit penganjur menyediakan templat format laporan rasmi ({currentAward.template_name || 'Format Laporan'}). Sila muat turun dan lengkapkan laporan sebelum memuat naik sebagai fail PDF di bawah.
                        </p>
                      </div>

                      <a
                        href={currentAward.template_url || 'https://docs.google.com/document/d/1_makmp_default_template/edit'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-md"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Muat Turun Templat</span>
                      </a>
                    </div>
                  )}

                  {/* Butang / Banner Import dari e-Akademik */}
                  {currentAward.doc_requirement_type !== 'REPORT_AND_EVIDENCE' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Pernah muat naik sijil ke e-Akademik?</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                              1-Klik Import
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {studentAkademikCerts.length > 0
                              ? `${studentAkademikCerts.length} sijil e-Akademik dikesan untuk profil ini.`
                              : 'Pilih terus sijil sedia ada daripada portal tanpa perlu muat naik semula fail.'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCertPickerTargetAwardId(currentAward.id);
                          setCertPickerTargetDocId(null);
                          setIsCertPickerOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pilih Dari e-Akademik ({studentAkademikCerts.length})</span>
                      </button>
                    </div>
                  )}

                  {/* Senarai Dokumen Bagi Anugerah Ini */}
                  <div className="space-y-5">
                    {currentDocs.map((doc, index) => {
                      const isReportFile = doc.document_type === 'LAPORAN';

                      return (
                        <div
                          key={doc.id}
                          className="p-4 md:p-5 rounded-xl bg-slate-950/80 border border-slate-800/90 relative space-y-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <h4 className="font-bold text-sm text-white">
                                {isReportFile ? 'Dokumen Laporan Utama (PDF) *' : `Dokumen / Sijil #${index + 1}`}
                              </h4>
                              {isReportFile && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Wajib
                                </span>
                              )}
                            </div>

                            {currentDocs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(currentAward.id, doc.id)}
                                className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded-md hover:bg-rose-500/10 transition flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Buang</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Tajuk Dokumen / Pencapaian */}
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                {isReportFile
                                  ? 'Tajuk Laporan Projek / Perusahaan / Kelab'
                                  : 'Nama Aktiviti / Pertandingan / Anugerah'}{' '}
                                <span className="text-rose-400">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={doc.nama_pencapaian}
                                onChange={(e) =>
                                  handleUpdateDocument(
                                    currentAward.id,
                                    doc.id,
                                    'nama_pencapaian',
                                    e.target.value
                                  )
                                }
                                placeholder={
                                  isReportFile
                                    ? 'cth: Laporan Tahunan Perusahaan RichTech Solutions 2025/2026'
                                    : 'cth: Kejohanan Olahraga Politeknik Malaysia (SUKIPT)'
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                              />
                            </div>

                            {/* Peringkat & Tahap Kejayaan (hanya jika jenis Sijil) */}
                            {!isReportFile && (
                              <>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Peringkat <span className="text-rose-400">*</span>
                                  </label>
                                  <select
                                    value={doc.peringkat}
                                    onChange={(e) =>
                                      handleUpdateDocument(
                                        currentAward.id,
                                        doc.id,
                                        'peringkat',
                                        e.target.value as MakmpPeringkat
                                      )
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                                  >
                                    {PERINGKAT_OPTIONS.map((p) => (
                                      <option key={p.value} value={p.value}>
                                        {p.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Tahap Kejayaan <span className="text-rose-400">*</span>
                                  </label>
                                  <select
                                    value={doc.pencapaian_type}
                                    onChange={(e) =>
                                      handleUpdateDocument(
                                        currentAward.id,
                                        doc.id,
                                        'pencapaian_type',
                                        e.target.value as MakmpPencapaianType
                                      )
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                                  >
                                    {PENCAPAIAN_TYPE_OPTIONS.map((pt) => (
                                      <option key={pt.value} value={pt.value}>
                                        {pt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}

                            {/* Lampiran Fail */}
                            <div className="sm:col-span-2">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-slate-300">
                                  {isReportFile
                                    ? 'Muat Naik Laporan Lengkap (PDF sahaja) *'
                                    : 'Muat Naik Sijil / Dokumen Bukti (PDF / Gambar) *'}
                                </label>
                                <span className="text-[10px] text-slate-500">
                                  {doc.source === 'E_AKADEMIK' ? 'Sumber: e-Akademik' : 'Maksimum 10MB'}
                                </span>
                              </div>

                              {doc.source === 'E_AKADEMIK' ? (
                                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                      <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40">
                                          ✨ e-Akademik
                                        </span>
                                        <span className="text-xs text-white font-medium truncate">
                                          {doc.filePreviewName || doc.nama_pencapaian}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                                        <span>{doc.peringkat}</span>
                                        <span>•</span>
                                        <span>{doc.pencapaian_type}</span>
                                        {doc.uploadedUrl && (
                                          <>
                                            <span>•</span>
                                            <a
                                              href={doc.uploadedUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                              <span>Papar Sijil</span>
                                            </a>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-center whitespace-nowrap shrink-0">
                                      <div className="text-[9px] text-slate-400 font-semibold uppercase">Merit</div>
                                      <div className="text-xs font-bold text-amber-300">+{doc.merit_suggested}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCertPickerTargetAwardId(currentAward.id);
                                        setCertPickerTargetDocId(doc.id);
                                        setIsCertPickerOpen(true);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                                    >
                                      Tukar Sijil
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <label className="cursor-pointer flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 hover:bg-slate-900 hover:border-amber-500/60 text-xs text-slate-300 transition">
                                    <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span className="truncate">
                                      {doc.file
                                        ? `Dipilih: ${doc.file.name} (${(doc.file.size / 1024).toFixed(
                                            0
                                          )} KB)`
                                        : isReportFile
                                        ? 'Pilih Fail Laporan Projek (PDF mengikut templat)...'
                                        : 'Pilih Fail Sijil / Bukti (PDF / Gambar)...'}
                                    </span>
                                    <input
                                      type="file"
                                      accept={
                                        isReportFile
                                          ? '.pdf'
                                          : '.pdf,image/png,image/jpeg,image/webp'
                                      }
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        if (f && f.size > 10 * 1024 * 1024) {
                                          alert(
                                            `Fail "${f.name}" berukuran ${(
                                              f.size /
                                              (1024 * 1024)
                                            ).toFixed(1)}MB melebihi had maksimum 10MB.`
                                          );
                                          e.target.value = '';
                                          return;
                                        }
                                        handleUpdateDocument(
                                          currentAward.id,
                                          doc.id,
                                          'file',
                                          f
                                        );
                                      }}
                                    />
                                  </label>

                                  {!isReportFile && (
                                    <button
                                      type="button"
                                      title="Import daripada e-Akademik"
                                      onClick={() => {
                                        setCertPickerTargetAwardId(currentAward.id);
                                        setCertPickerTargetDocId(doc.id);
                                        setIsCertPickerOpen(true);
                                      }}
                                      className="px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500/60 text-xs text-amber-400 flex items-center gap-1.5 transition shrink-0"
                                    >
                                      <Sparkles className="w-4 h-4" />
                                      <span className="hidden sm:inline">e-Akademik</span>
                                    </button>
                                  )}

                                  {!isReportFile && (
                                    <div className="shrink-0 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center whitespace-nowrap">
                                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                                        Merit
                                      </div>
                                      <div className="text-sm font-extrabold text-amber-400">
                                        +{doc.merit_suggested}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Butang Tambah Dokumen untuk Anugerah Ini */}
                  {currentDocs.length < maxDocsAllowed && (
                    <button
                      type="button"
                      onClick={() => handleAddDocument(currentAward.id)}
                      className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-amber-500 text-xs font-semibold text-slate-300 hover:text-amber-400 transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        Tambah Dokumen / Bukti Sokongan ({currentDocs.length}/{maxDocsAllowed})
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => { setStep(2); scrollToTop(); }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{uploadProgressText || 'Memproses Permohonan...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Hantar Permohonan ({selectedAwardIds.length} Anugerah)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ==================================================================== */}
        {/* STEP 4: RESIT DIGITAL SELESAI (MULTI-AWARD RECEIPT)                  */}
        {/* ==================================================================== */}
        {step === 4 && submissionResult && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Permohonan Berjaya Dihantar
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-3">
                  Resit Penyerahan Rasmi MAKMP
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Sila simpan kod rujukan anda untuk semakan keputusan dan status penilai.
                </p>
              </div>

              {/* Kod Rujukan Badge */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Kod Rujukan Rasmi
                  </div>
                  <div className="text-xl font-mono font-extrabold text-amber-400 tracking-wider">
                    {submissionResult.tracking_code}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition shrink-0"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Salin Kod</span>
                    </>
                  )}
                </button>
              </div>

              {/* QR Code */}
              <div className="p-4 rounded-xl bg-white/95 max-w-[200px] mx-auto shadow-md">
                <QRCode
                  value={`${window.location.origin}/makmp/status?code=${encodeURIComponent(
                    submissionResult.tracking_code
                  )}`}
                  size={168}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  viewBox={`0 0 256 256`}
                />
                <div className="text-[10px] text-slate-800 font-semibold mt-2">
                  Imbas untuk semak status
                </div>
              </div>

              {/* Senarai Anugerah yang Dimohon */}
              <div className="text-left p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 text-xs">
                <div className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>Senarai Anugerah Yang Dihantar:</span>
                  <span className="text-amber-400">{selectedAwardIds.length} Anugerah</span>
                </div>

                <div className="space-y-2">
                  {selectedAwardIds.map((awardId, idx) => {
                    const aw = awards.find((a) => a.id === awardId);
                    const docs = awardDocuments[awardId] || [];
                    const ent = awardEntityData[awardId];

                    return (
                      <div
                        key={awardId}
                        className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{idx + 1}.</span>
                            <span>{aw?.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {aw?.category_group}
                            {ent?.entity_name && (
                              <span className="text-purple-300"> • {ent.entity_name}</span>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {docs.length} dokumen
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-2 border-t border-slate-800 text-slate-400">
                  <span>Nama Pemohon:</span>
                  <span className="font-semibold text-white">{submissionResult.full_name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>No. Matrik:</span>
                  <span className="font-semibold text-amber-400 font-mono">
                    {submissionResult.matric_no}
                  </span>
                </div>
              </div>

              {/* Tawaran daftar Google untuk tetamu (belum ada akaun) */}
              {!user && !submissionResult.has_portal_account && (
                <div className="p-4 rounded-xl bg-gradient-to-b from-amber-500/10 to-slate-900 border border-amber-500/30 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Belum ada akaun JPP Portal?
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Daftar dengan Google sekarang supaya sijil & merit MAKMP ini auto-link ke dokumen peribadi e-akademik anda, dan profil diisi automatik daripada data borang ini.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLink}
                    disabled={isGoogleLinking}
                    className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
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
                        <span>Daftar / Log Masuk dengan Google</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={getMakmpWhatsAppUrl(
                    submissionResult,
                    `${selectedAwardIds.length} Anugerah Dipohon`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Simpan Resit ke WhatsApp</span>
                </a>

                <Link
                  to={`/makmp/status?code=${encodeURIComponent(submissionResult.tracking_code)}`}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>Semak Status Sekarang</span>
                </Link>
              </div>

              {/* Note */}
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-lg mx-auto">
                💡 <span className="text-slate-300 font-medium">Nota Penting:</span> Setiap anugerah akan dinilai secara bebas oleh juri berkaitan (cth: Unit Keusahawanan untuk anugerah keusahawanan, Unit Sukan untuk anugerah sukan). Merit yang diluluskan akan terus diselaraskan dengan e-akademik anda.
              </p>
            </div>
          </div>
        )}
      {/* Modal Pemilihan Sijil e-Akademik */}
      {isCertPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Pilih Sijil Dari e-Akademik
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Import terus sijil pencapaian yang pernah didaftarkan ke dalam sistem.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCertPickerOpen(false);
                  setCertPickerTargetAwardId(null);
                  setCertPickerTargetDocId(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCertPickerYearFilter('EDITION')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    certPickerYearFilter === 'EDITION'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Tahun Edisi ({edition?.year || 2026})
                </button>
                <button
                  type="button"
                  onClick={() => setCertPickerYearFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    certPickerYearFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Semua Sijil ({studentAkademikCerts.length})
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={certPickerSearch}
                  onChange={(e) => setCertPickerSearch(e.target.value)}
                  placeholder="Cari nama aktiviti atau penganjur..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Certificate List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {loadingAkademikCerts ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                  <div className="text-xs">Memuat turun rekod sijil e-Akademik...</div>
                </div>
              ) : (() => {
                const targetYear = edition?.year || 2026;
                const filtered = studentAkademikCerts.filter((cert) => {
                  if (certPickerYearFilter === 'EDITION') {
                    const y = cert.tarikh
                      ? new Date(cert.tarikh).getFullYear()
                      : new Date(cert.created_at).getFullYear();
                    if (y !== targetYear) return false;
                  }
                  if (certPickerSearch.trim()) {
                    const q = certPickerSearch.toLowerCase();
                    const matchName = cert.nama_pencapaian?.toLowerCase().includes(q);
                    const matchHost = cert.penganjur?.toLowerCase().includes(q);
                    if (!matchName && !matchHost) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center space-y-3 px-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          Tiada Sijil Dijumpai
                        </div>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {certPickerYearFilter === 'EDITION'
                            ? `Tiada rekod sijil bagi tahun ${targetYear}. Anda boleh menukar ke tab 'Semua Sijil' atau memuat naik fail PDF sijil secara manual.`
                            : 'Tiada rekod sijil dijumpai untuk akaun ini. Sila muat naik secara manual.'}
                        </p>
                      </div>
                      {certPickerYearFilter === 'EDITION' && studentAkademikCerts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCertPickerYearFilter('ALL')}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 transition"
                        >
                          Lihat Sijil Semua Tahun ({studentAkademikCerts.length})
                        </button>
                      )}
                    </div>
                  );
                }

                return filtered.map((cert) => {
                  const certYear = cert.tarikh
                    ? new Date(cert.tarikh).getFullYear()
                    : new Date(cert.created_at).getFullYear();

                  return (
                    <div
                      key={cert.id}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                cert.status === 'DISAHKAN'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : cert.status === 'DITOLAK'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {cert.status === 'DISAHKAN'
                                ? 'Disahkan EXCO'
                                : cert.status === 'DITOLAK'
                                ? 'Ditolak'
                                : 'Menunggu Pengesahan'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {certYear}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs sm:text-sm text-white leading-snug">
                            {cert.nama_pencapaian}
                          </h4>
                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                            <span>Peringkat: <strong className="text-slate-200">{cert.peringkat}</strong></span>
                            <span>•</span>
                            <span>Pencapaian: <strong className="text-slate-200">{cert.jenis}</strong></span>
                            {cert.penganjur && (
                              <>
                                <span>•</span>
                                <span>Penganjur: {cert.penganjur}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectAkademikCert(cert)}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shrink-0 shadow-md shadow-amber-500/20"
                        >
                          Pilih Sijil Ini
                        </button>
                      </div>

                      {cert.drive_view_url && (
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                          <a
                            href={cert.drive_view_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Papar Pratonton Sijil Asal</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Peringatan: Juri MAKMP akan menyemak sijil secara bebas.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCertPickerOpen(false);
                  setCertPickerTargetAwardId(null);
                  setCertPickerTargetDocId(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      </main>

      <MakmpJppChrome />
    </div>
  );
}
