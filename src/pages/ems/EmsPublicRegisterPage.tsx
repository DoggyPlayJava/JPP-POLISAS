import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  User,
  Users,
  CheckCircle2,
  Calendar,
  MapPin,
  Upload,
  Trash2,
  Plus,
  Printer,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  QrCode,
  Check,
  Building2,
  Tag,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEmsEventById, registerEmsParticipant, type EmsEventDetail } from '@/lib/ems';
import { uploadFileToDrive, uploadPdfToDrive } from '@/lib/driveUpload';
import { supabase } from '@/lib/supabase';
import type { EmsParticipant, EmsFormField } from '@/types';

interface TeamMember {
  name: string;
  matrix_no_or_ic: string;
}

export function EmsPublicRegisterPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();

  // Loading & Event state
  const [eventDetail, setEventDetail] = useState<EmsEventDetail | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  // Multi-step state (1: Info, 2: Dynamic Fields, 3: Media, 4: Pass)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form Step 1: Category & Basic Info
  const [participantCategory, setParticipantCategory] = useState<'STUDENT' | 'PUBLIC'>('STUDENT');
  const [entityMode, setEntityMode] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL');
  
  // Basic info fields
  const [leaderName, setLeaderName] = useState('');
  const [matrixNo, setMatrixNo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Team fields (if entityMode === 'TEAM')
  const [teamName, setTeamName] = useState('');
  const [boothNo, setBoothNo] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [membersList, setMembersList] = useState<TeamMember[]>([
    { name: '', matrix_no_or_ic: '' },
  ]);

  // Form Step 2: Custom Responses
  const [customResponses, setCustomResponses] = useState<Record<string, any>>({});
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});

  // Form Step 3: Media Uploads
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Step 4: Registered Participant Result
  const [registeredParticipant, setRegisteredParticipant] = useState<EmsParticipant | null>(null);

  // Helper for dynamic file field uploads in Step 2
  const handleDynamicFileUpload = async (
    fieldId: string,
    fieldKey: string,
    fieldType: 'image_upload' | 'document_upload',
    file: File
  ) => {
    setUploadingFields((prev) => ({ ...prev, [fieldId]: true }));
    const toastId = toast.loading('Memuat naik fail...');

    try {
      let url = '';
      if (fieldType === 'document_upload' && file.type === 'application/pdf') {
        try {
          url = await uploadPdfToDrive(file, `ems/documents_${eventId}`);
        } catch (pdfErr) {
          console.warn('[upload] Fallback to Supabase Storage for PDF:', pdfErr);
          url = await uploadFileToDrive(file, `ems/documents_${eventId}`);
        }
      } else {
        url = await uploadFileToDrive(
          file,
          fieldType === 'image_upload' ? `ems/images_${eventId}` : `ems/documents_${eventId}`
        );
      }

      if (url) {
        setCustomResponses((prev) => ({ ...prev, [fieldKey]: url }));
        toast.success('Fail berjaya dimuat naik!', { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Gagal memuat naik fail: ${err.message || 'Ralat pelayan'}`, { id: toastId });
    } finally {
      setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  // Load Event Details
  useEffect(() => {
    if (!eventId) {
      setEventError('ID Acara tidak ditemui.');
      setLoadingEvent(false);
      return;
    }

    let isMounted = true;
    async function loadData() {
      try {
        setLoadingEvent(true);
        const data = await fetchEmsEventById(eventId!);
        if (!isMounted) return;

        if (!data) {
          setEventError('Acara tidak wujud atau telah dipadamkan.');
        } else if (data.status === 'CANCELLED') {
          setEventError('Acara ini telah dibatalkan.');
        } else {
          setEventDetail(data);
          // Set default entity mode if event specifies TEAM_BOOTH or TEAM
          if (data.event_mode === 'TEAM_BOOTH' || data.event_mode === 'TEAM') {
            setEntityMode('TEAM');
          }
        }
      } catch (err: any) {
        if (isMounted) setEventError(err.message || 'Gagal memuatkan data acara.');
      } finally {
        if (isMounted) setLoadingEvent(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Auto-fill logged in user info if student category is selected
  useEffect(() => {
    if (isAuthenticated && profile && participantCategory === 'STUDENT') {
      setLeaderName(profile.full_name || '');
      setMatrixNo(profile.matrix_no || '');
      setEmail(user?.email || '');
      setPhone(profile.phone_number || profile.phone || '');
    }
  }, [isAuthenticated, profile, user, participantCategory]);

  // Handle Google Login helper
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyambung ke Google.');
    }
  };

  // Dynamic team member actions
  const handleAddMember = () => {
    setMembersList([...membersList, { name: '', matrix_no_or_ic: '' }]);
  };

  const handleRemoveMember = (index: number) => {
    setMembersList(membersList.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...membersList];
    updated[index][field] = value;
    setMembersList(updated);
  };

  // Helper for options parsing in dynamic fields
  const parseOptions = (options: any): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) return options.map((o) => String(o).trim());
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options);
        if (Array.isArray(parsed)) return parsed.map((o) => String(o).trim());
      } catch {
        return options.split(',').map((o) => o.trim()).filter(Boolean);
      }
    }
    return [];
  };

  // File Upload logic for Step 3
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    const toastId = toast.loading('Memuat naik fail...');

    try {
      const uploadedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadFileToDrive(file, `ems/event_${eventId}`);
        if (url) uploadedList.push(url);
      }
      setMediaUrls((prev) => [...prev, ...uploadedList]);
      toast.success(`${uploadedList.length} fail berjaya dimuat naik!`, { id: toastId });
    } catch (err: any) {
      toast.error(`Gagal memuat naik fail: ${err.message || 'Ralat pelayan'}`, { id: toastId });
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  // Step Navigations & Validation
  const validateStep1 = (): boolean => {
    if (isQuotaFull) {
      toast.error('Pendaftaran bagi acara ini telah penuh.');
      return false;
    }
    if (!leaderName.trim()) {
      toast.error('Sila masukkan Nama Ketua / Peserta.');
      return false;
    }
    if (participantCategory === 'STUDENT' && !matrixNo.trim()) {
      toast.error('Sila masukkan No. Matrik.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Sila masukkan alamat Emel yang sah.');
      return false;
    }
    if (!phone.trim()) {
      toast.error('Sila masukkan Nombor Telefon.');
      return false;
    }
    if (entityMode === 'TEAM') {
      if (!teamName.trim()) {
        toast.error('Sila masukkan Nama Pasukan / Gerai.');
        return false;
      }
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!eventDetail?.form_fields || eventDetail.form_fields.length === 0) return true;

    for (const field of eventDetail.form_fields) {
      if (field.is_required) {
        const val = customResponses[field.field_label || field.id];
        if (val === undefined || val === null || String(val).trim() === '') {
          toast.error(`Sila isi ruangan wajib: "${field.field_label}"`);
          return false;
        }
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      // If event has no form fields, skip step 2 if desired, or proceed
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1 && currentStep < 4) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Final Registration Submission
  const handleSubmitRegistration = async () => {
    if (!eventId || !eventDetail) return;
    if (isQuotaFull) {
      toast.error('Pendaftaran bagi acara ini telah penuh.');
      return;
    }
    setSubmitting(true);
    const toastId = toast.loading('Mendaftar pendaftaran anda...');

    try {
      // Filter clean members list
      const cleanMembers = entityMode === 'TEAM'
        ? membersList.filter((m) => m.name.trim() !== '')
        : [];

      const participantPayload: Partial<EmsParticipant> = {
        event_id: eventId,
        participant_type: participantCategory,
        entity_mode: entityMode,
        leader_name: leaderName.trim(),
        matrix_no: participantCategory === 'STUDENT' ? matrixNo.trim() : null,
        email: email.trim(),
        phone: phone.trim(),
        team_name: entityMode === 'TEAM' ? teamName.trim() : null,
        booth_no: entityMode === 'TEAM' && boothNo.trim() ? boothNo.trim() : null,
        category_name: categoryName.trim() ? categoryName.trim() : null,
        members_list: cleanMembers.length > 0 ? cleanMembers : null,
        custom_responses: Object.keys(customResponses).length > 0 ? customResponses : null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        is_checked_in: false,
      };

      const result = await registerEmsParticipant(participantPayload);
      setRegisteredParticipant(result);
      toast.success('Pendaftaran Berjaya!', { id: toastId });
      setCurrentStep(4);
    } catch (err: any) {
      toast.error(err.message || 'Gagal melakukan pendaftaran. Sila cuba lagi.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading view
  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">Memuatkan borang pendaftaran acara...</p>
      </div>
    );
  }

  // Error view
  if (eventError || !eventDetail) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Pendaftaran Tidak Tersedia</h1>
        <p className="text-slate-400 max-w-md mb-6">{eventError || 'Maklumat acara tidak dapat dijumpai.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition text-sm"
        >
          Kembali ke Halaman Utama
        </button>
      </div>
    );
  }

  const totalParticipants = eventDetail?.participants?.length || 0;
  const maxParticipants = eventDetail?.max_participants || 0;
  const isQuotaFull = maxParticipants > 0 && totalParticipants >= maxParticipants;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-28 md:pb-8">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #digital-pass-card, #digital-pass-card * {
            visibility: visible;
          }
          #digital-pass-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: 2px solid #e2e8f0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <header className="relative bg-slate-900 border-b border-slate-800 pt-8 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/30 via-slate-900 to-purple-900/20 opacity-70" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Borang Pendaftaran Awam EMS
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            {eventDetail.title}
          </h1>
          {eventDetail.description && (
            <p className="text-slate-400 text-sm max-w-2xl mx-auto line-clamp-2 mb-4">
              {eventDetail.description}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-300">
            {eventDetail.event_date && (
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{new Date(eventDetail.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
            {eventDetail.location && (
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                <span>{eventDetail.location}</span>
              </div>
            )}
            {eventDetail.category && (
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>{eventDetail.category}</span>
              </div>
            )}
            {maxParticipants > 0 && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                  isQuotaFull
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/50'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Peserta: {totalParticipants} / {maxParticipants}
                </span>
                {isQuotaFull && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wide shadow-sm">
                    Pendaftaran Penuh
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Wizard Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        {/* Step Indicator (Hide on step 4 completion) */}
        {currentStep < 4 && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl">
            <div className="flex items-center justify-between">
              {[
                { step: 1, label: 'Kategori & Info' },
                { step: 2, label: 'Borang Acara' },
                { step: 3, label: 'Muat Naik Media' },
              ].map((item, idx) => (
                <React.Fragment key={item.step}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        currentStep === item.step
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                          : currentStep > item.step
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {currentStep > item.step ? <Check className="w-4 h-4 stroke-[3]" /> : item.step}
                    </div>
                    <span
                      className={`text-xs font-semibold hidden sm:inline ${
                        currentStep === item.step
                          ? 'text-white'
                          : currentStep > item.step
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 transition-colors ${
                        currentStep > item.step ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Wizard Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Quota Full Alert Banner */}
          {isQuotaFull && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-rose-200 text-sm">Pendaftaran Penuh</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                    {totalParticipants} / {maxParticipants} Peserta
                  </span>
                </div>
                <p className="text-slate-300">
                  Maaf, kuota maksimum peserta bagi acara ini telah dipenuhi. Pendaftaran baharu dikunci.
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: CATEGORY SELECTION & BASIC INFO */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" /> Step 1: Kategori & Maklumat Asas
                </h2>
                <p className="text-slate-400 text-xs mt-1">Pilih kategori penyertaan anda dan lengkapkan butiran peribadi.</p>
              </div>

              {/* Participant Category Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Kategori Peserta</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setParticipantCategory('STUDENT')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition ${
                      participantCategory === 'STUDENT'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/30'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> Pelajar POLISAS
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticipantCategory('PUBLIC')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition ${
                      participantCategory === 'PUBLIC'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/30'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Orang Luar / Awam
                  </button>
                </div>
              </div>

              {/* Pelajar POLISAS specific options */}
              {participantCategory === 'STUDENT' && (
                <div className="space-y-4 pt-2">
                  {isAuthenticated ? (
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-indigo-300 font-semibold">Log Masuk Sebagai:</p>
                          <p className="text-sm font-bold text-white">{profile?.full_name || user?.email}</p>
                          {profile?.matrix_no && (
                            <p className="text-xs text-slate-400">No. Matrik: <span className="font-mono text-indigo-300">{profile.matrix_no}</span></p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                        Autofilled
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-300 font-semibold">Adakah anda mempunyai akaun sistem?</p>
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs transition shadow-sm"
                        >
                          <LogIn className="w-3.5 h-3.5 text-indigo-600" /> Log Masuk Google
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">Atau anda boleh memasukkan No. Matrik secara manual di bawah:</p>
                    </div>
                  )}
                </div>
              )}

              {/* Entity Mode Toggle (if event supports TEAM or TEAM_BOOTH) */}
              {(eventDetail.event_mode === 'TEAM_BOOTH' || eventDetail.event_mode === 'TEAM') && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Mod Pendaftaran</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEntityMode('INDIVIDUAL')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-semibold transition ${
                        entityMode === 'INDIVIDUAL'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300 ring-2 ring-purple-500/30'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <User className="w-4 h-4" /> Pendaftaran Individu
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntityMode('TEAM')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-semibold transition ${
                        entityMode === 'TEAM'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300 ring-2 ring-purple-500/30'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Users className="w-4 h-4" /> Pendaftaran Pasukan / Gerai
                    </button>
                  </div>
                </div>
              )}

              {/* Leader / Basic Fields */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Penuh {entityMode === 'TEAM' ? 'Ketua Pasukan' : 'Peserta'} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder="Contoh: Muhammad Ali bin Ahmad"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {participantCategory === 'STUDENT' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nombor Matrik POLISAS <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={matrixNo}
                      onChange={(e) => setMatrixNo(e.target.value)}
                      placeholder="Contoh: 03DPR22F1001"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Alamat Emel <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nombor Telefon / WhatsApp <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0123456789"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Team / Booth Fields */}
                {entityMode === 'TEAM' && (
                  <div className="space-y-4 pt-4 border-t border-slate-800 animate-fadeIn">
                    <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Maklumat Pasukan & Gerai
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Nama Pasukan / Projek / Gerai <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="Contoh: EcoTech Innovators"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Nombor Booth (Jika Ada)
                        </label>
                        <input
                          type="text"
                          value={boothNo}
                          onChange={(e) => setBoothNo(e.target.value)}
                          placeholder="Contoh: B-12"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white uppercase focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Kategori Produk / Inovasi
                      </label>
                      <input
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Contoh: Inovasi Kejuruteraan / Teknologi Maklumat"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>

                    {/* Dynamic Team Members List */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">Senarai Ahli Pasukan</label>
                        <button
                          type="button"
                          onClick={handleAddMember}
                          className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Ahli
                        </button>
                      </div>

                      {membersList.map((member, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-xs font-bold text-slate-500 w-5">#{idx + 1}</span>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                            placeholder="Nama Ahli"
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                          <input
                            type="text"
                            value={member.matrix_no_or_ic}
                            onChange={(e) => handleMemberChange(idx, 'matrix_no_or_ic', e.target.value)}
                            placeholder="No. Matrik / IC"
                            className="w-36 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                          {membersList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Next Button */}
              <div className="pt-6 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isQuotaFull}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg ${
                    isQuotaFull
                      ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                  }`}
                >
                  {isQuotaFull ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400" /> Pendaftaran Penuh
                    </>
                  ) : (
                    <>
                      Seterusnya <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DYNAMIC FORM FIELDS */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" /> Step 2: Maklumat Tambahan Acara
                </h2>
                <p className="text-slate-400 text-xs mt-1">Sila isi borang soalan khas yang ditetapkan oleh penganjur.</p>
              </div>

              {(!eventDetail.form_fields || eventDetail.form_fields.length === 0) ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                  <p className="text-sm font-semibold text-slate-200">Tiada Borang Tambahan Diperlukan</p>
                  <p className="text-xs text-slate-400">Penganjur tidak menetapkan sebarang medan dinamik bagi acara ini. Sila terus ke langkah seterusnya.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {eventDetail.form_fields.map((field) => {
                    const fieldKey = field.field_label || field.id;
                    const options = parseOptions(field.options);

                    return (
                      <div key={field.id} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                        <label className="block text-xs font-semibold text-slate-200">
                          {field.field_label} {field.is_required && <span className="text-rose-400">*</span>}
                        </label>

                        {field.field_type === 'textarea' ? (
                          <textarea
                            rows={3}
                            value={customResponses[fieldKey] || ''}
                            onChange={(e) => setCustomResponses({ ...customResponses, [fieldKey]: e.target.value })}
                            placeholder="Jawapan anda..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                          />
                        ) : field.field_type === 'select' ? (
                          <select
                            value={customResponses[fieldKey] || ''}
                            onChange={(e) => setCustomResponses({ ...customResponses, [fieldKey]: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                          >
                            <option value="">-- Pilih Opsi --</option>
                            {options.map((opt, i) => (
                              <option key={i} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.field_type === 'checkbox' ? (
                          <div className="flex items-center gap-3 pt-1">
                            <input
                              type="checkbox"
                              id={`check_${field.id}`}
                              checked={!!customResponses[fieldKey]}
                              onChange={(e) => setCustomResponses({ ...customResponses, [fieldKey]: e.target.checked })}
                              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor={`check_${field.id}`} className="text-xs text-slate-300 font-medium">
                              Ya, saya bersetuju / mengesahkan
                            </label>
                          </div>
                        ) : field.field_type === 'image_upload' ? (
                          <div className="space-y-3 pt-1">
                            {customResponses[fieldKey] ? (
                              <div className="relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 max-w-sm aspect-video flex items-center justify-center">
                                <img
                                  src={customResponses[fieldKey]}
                                  alt={field.field_label}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...customResponses };
                                    delete updated[fieldKey];
                                    setCustomResponses(updated);
                                  }}
                                  className="absolute top-2 right-2 bg-rose-600/90 text-white p-2 rounded-xl hover:bg-rose-500 transition shadow"
                                  title="Padam Gambar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 text-center transition bg-slate-900/40">
                                <input
                                  type="file"
                                  id={`file_input_${field.id}`}
                                  accept="image/*"
                                  disabled={uploadingFields[field.id]}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleDynamicFileUpload(field.id, fieldKey, 'image_upload', file);
                                    }
                                  }}
                                  className="hidden"
                                />
                                <label
                                  htmlFor={`file_input_${field.id}`}
                                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                                >
                                  <div className="w-10 h-10 rounded-full bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                    {uploadingFields[field.id] ? (
                                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                                    ) : (
                                      <ImageIcon className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white">
                                      {uploadingFields[field.id] ? 'Memuat naik gambar...' : 'Pilih / Muat Naik Gambar'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Format disokong: JPG, PNG, WEBP</p>
                                  </div>
                                </label>
                              </div>
                            )}
                          </div>
                        ) : field.field_type === 'document_upload' ? (
                          <div className="space-y-3 pt-1">
                            {customResponses[fieldKey] ? (
                              <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                                      {customResponses[fieldKey].split('/').pop() || 'Dokumen'}
                                    </p>
                                    <a
                                      href={customResponses[fieldKey]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                                    >
                                      Lihat Dokumen
                                    </a>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...customResponses };
                                    delete updated[fieldKey];
                                    setCustomResponses(updated);
                                  }}
                                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                  title="Padam Dokumen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 text-center transition bg-slate-900/40">
                                <input
                                  type="file"
                                  id={`file_input_${field.id}`}
                                  accept=".pdf,.doc,.docx"
                                  disabled={uploadingFields[field.id]}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleDynamicFileUpload(field.id, fieldKey, 'document_upload', file);
                                    }
                                  }}
                                  className="hidden"
                                />
                                <label
                                  htmlFor={`file_input_${field.id}`}
                                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                                >
                                  <div className="w-10 h-10 rounded-full bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                    {uploadingFields[field.id] ? (
                                      <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                                    ) : (
                                      <Upload className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white">
                                      {uploadingFields[field.id] ? 'Memuat naik dokumen...' : 'Pilih / Muat Naik Dokumen'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Format disokong: PDF, DOC, DOCX</p>
                                  </div>
                                </label>
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={customResponses[fieldKey] || ''}
                            onChange={(e) => setCustomResponses({ ...customResponses, [fieldKey]: e.target.value })}
                            placeholder="Masukkan jawapan anda"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/20"
                >
                  Seterusnya <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: MEDIA UPLOADS */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-400" /> Step 3: Muat Naik Media & Gambar
                </h2>
                <p className="text-slate-400 text-xs mt-1">Muat naik gambar Booth, Poster, Gambar Produk, atau Dokumen berkaitan (jika ada).</p>
              </div>

              {/* Upload Box */}
              <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 text-center transition bg-slate-950/40">
                <input
                  type="file"
                  id="media_file_input"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingMedia}
                />
                <label
                  htmlFor="media_file_input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Klik untuk memilih fail</p>
                    <p className="text-xs text-slate-500 mt-0.5">Menyokong format imej (PNG, JPG, WEBP) & PDF (Maks 10MB)</p>
                  </div>
                </label>
              </div>

              {/* Uploaded items grid */}
              {mediaUrls.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fail Diumuat Naik ({mediaUrls.length})</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaUrls.map((url, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                        {url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                          <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <FileText className="w-6 h-6 text-indigo-400" />
                            <span className="text-[10px] font-mono truncate max-w-[90%]">Dokumen #{idx + 1}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute top-2 right-2 bg-rose-600/90 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation & Submit Buttons */}
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
                  disabled={submitting}
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={submitting || uploadingMedia || isQuotaFull}
                  className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-extrabold text-sm transition shadow-lg ${
                    isQuotaFull
                      ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Memproses...
                    </>
                  ) : isQuotaFull ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400" /> Pendaftaran Penuh
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[3]" /> Hantar & Jana Pass
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: DIGITAL EVENT PASS */}
          {currentStep === 4 && registeredParticipant && (
            <div className="space-y-6 text-center animate-fadeIn">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-2">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Pendaftaran Berjaya!</h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
                Tahniah, pendaftaran anda untuk acara <span className="text-white font-semibold">{eventDetail.title}</span> telah direkodkan. Sila simpan atau cetak Pass Acara anda di bawah.
              </p>

              {/* Digital Event Pass Card */}
              <div
                id="digital-pass-card"
                className="bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 text-left shadow-2xl relative overflow-hidden my-6"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Left Pass Details */}
                  <div className="flex-1 space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <div className="inline-block px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold tracking-wider uppercase mb-1">
                        PASS MASUK RASMI EMS
                      </div>
                      <h3 className="text-xl font-black text-white">{eventDetail.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {eventDetail.event_date ? new Date(eventDetail.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Tarikh Acara'}
                        {eventDetail.location && ` • ${eventDetail.location}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block">Peserta / Ketua</span>
                        <span className="text-white font-bold text-sm block truncate">{registeredParticipant.leader_name}</span>
                        {registeredParticipant.matrix_no && (
                          <span className="text-indigo-400 font-mono text-xs block">{registeredParticipant.matrix_no}</span>
                        )}
                      </div>

                      {registeredParticipant.team_name && (
                        <div>
                          <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block">Nama Pasukan</span>
                          <span className="text-purple-300 font-bold text-sm block truncate">{registeredParticipant.team_name}</span>
                        </div>
                      )}

                      {registeredParticipant.booth_no && (
                        <div>
                          <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block">No. Booth</span>
                          <span className="text-emerald-400 font-bold text-sm block font-mono">{registeredParticipant.booth_no}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block">Kategori</span>
                        <span className="text-slate-300 font-medium block">
                          {registeredParticipant.participant_type === 'STUDENT' ? 'Pelajar POLISAS' : 'Awam / Luar'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block">ID Pendaftaran Pass</span>
                      <span className="font-mono text-xs text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-500/30 inline-block mt-0.5">
                        {registeredParticipant.id}
                      </span>
                    </div>
                  </div>

                  {/* Right QR Code Section */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-lg border border-slate-200">
                    <QRCodeSVG
                      value={registeredParticipant.id}
                      size={140}
                      level="H"
                      includeMargin={true}
                    />
                    <span className="text-[10px] font-bold text-slate-800 font-mono mt-2 tracking-widest uppercase">
                      IMBAS UNTUK SEMAKAN
                    </span>
                  </div>
                </div>
              </div>

              {/* Pass Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 no-print pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/20"
                >
                  <Printer className="w-4 h-4" /> Cetak / Muat Turun Pass
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(registeredParticipant.id);
                    toast.success('ID Pendaftaran disalin!');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition"
                >
                  Salin ID Pass
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setRegisteredParticipant(null);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 font-medium text-sm transition"
                >
                  Daftar Peserta Lain
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
