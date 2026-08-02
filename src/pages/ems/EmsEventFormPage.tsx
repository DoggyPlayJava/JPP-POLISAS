import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Layers,
  FileText,
  Award,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Package,
  Mic,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEmsEventById, createEmsEvent, updateEmsEvent } from '@/lib/ems';
import type { EmsEventMode, EmsEventType, EmsFormField, EmsRubricCriteria } from '@/types';
import { IFAMB_SHOWCASE_PRESET, IFAMB_PITCHING_PRESET } from '@/config/emsRubricTemplates';

interface LocalFormField {
  id?: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'select' | 'checkbox' | 'image_upload' | 'document_upload' | string;
  is_required: boolean;
  options: string; // Comma separated for select options input UI
  sort_order: number;
}

interface LocalRubricCriteria {
  id?: string;
  category_name?: string;
  section_name?: string;
  criteria_name: string;
  max_score: number;
  weight: number;
  sort_order: number;
  descriptors?: Record<string, string>;
}

export function EmsEventFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const {
    user,
    isSuperAdmin,
    isJppMember,
    isPresident,
    isMT: isClubMt,
    isAdvisor: isClubAdvisor,
    profile,
    isLoading: authLoading,
  } = useAuth();

  const isStaff = profile?.role === 'STAFF' || profile?.role === 'PENSYARAH';
  const canCreateEvent = isSuperAdmin || isJppMember || isPresident || isClubMt || isClubAdvisor || isStaff;

  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!canCreateEvent) {
      toast.error('Akses Terhad: Hanya Pengarah Program, AJK, atau Pensyarah dibenarkan mencipta acara.');
      navigate('/ems/dashboard');
    }
  }, [authLoading, canCreateEvent, navigate]);

  // Section 1: Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Keusahawanan');
  const [eventType, setEventType] = useState<EmsEventType>('COMPETITION');
  const [eventMode, setEventMode] = useState<EmsEventMode>('INDIVIDUAL');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [milestoneConfig, setMilestoneConfig] = useState('');
  const [isLeaderboardPublic, setIsLeaderboardPublic] = useState(true);

  // Section 2: Form Builder Fields
  const [formFields, setFormFields] = useState<LocalFormField[]>([
    {
      field_label: 'Nama Ahli Pasukan / Kad Pengenalan',
      field_type: 'text',
      is_required: true,
      options: '',
      sort_order: 1,
    },
  ]);

  // Section 3: Scoring Rubrics
  const [rubrics, setRubrics] = useState<LocalRubricCriteria[]>([
    {
      criteria_name: 'Kreativiti & Inovasi',
      max_score: 5,
      weight: 30,
      sort_order: 1,
    },
    {
      criteria_name: 'Persembahan & Pitching',
      max_score: 5,
      weight: 30,
      sort_order: 2,
    },
    {
      criteria_name: 'Impak & Kebolehlaksanaan',
      max_score: 5,
      weight: 40,
      sort_order: 3,
    },
  ]);

  const [openDescriptors, setOpenDescriptors] = useState<Record<number, boolean>>({});

  const toggleDescriptor = (index: number) => {
    setOpenDescriptors((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Load existing event data if editing
  useEffect(() => {
    if (!id) return;
    async function loadEventData() {
      try {
        setLoading(true);
        const data = await fetchEmsEventById(id!);
        if (!data) {
          toast.error('Acara tidak dijumpai');
          navigate('/ems/dashboard');
          return;
        }

        // RBAC Security Check: Only Event Creator, Super Admin, or JPP Admin can edit this event
        const isOwner = Boolean(user?.id && data.created_by === user.id);
        const canEditThisEvent = isSuperAdmin || isJppMember || isOwner;
        if (!canEditThisEvent) {
          toast.error('Akses Terhad: Anda tidak mempunyai kebenaran untuk menyunting acara ini.');
          navigate('/ems/dashboard');
          return;
        }

        setTitle(data.title || '');

        setDescription(data.description || '');
        setCategory(data.category || 'Keusahawanan');
        setEventType((data.event_type as EmsEventType) || 'COMPETITION');
        setEventMode((data.event_mode as EmsEventMode) || 'INDIVIDUAL');
        if (data.event_date) {
          // Format ISO string to datetime-local format YYYY-MM-THH:mm
          const d = new Date(data.event_date);
          const formatted = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setEventDate(formatted);
        }
        setLocation(data.location || '');
        if (data.milestone_config && Array.isArray(data.milestone_config)) {
          setMilestoneConfig(data.milestone_config.join(', '));
        } else {
          setMilestoneConfig('');
        }
        setIsLeaderboardPublic(data.is_leaderboard_public ?? true);

        // Load fields
        if (data.form_fields && data.form_fields.length > 0) {
          setFormFields(
            data.form_fields.map((f, idx) => ({
              id: f.id,
              field_label: f.field_label,
              field_type: f.field_type,
              is_required: f.is_required,
              options: Array.isArray(f.options)
                ? f.options.join(', ')
                : typeof f.options === 'string'
                ? f.options
                : '',
              sort_order: f.sort_order || idx + 1,
            }))
          );
        }

        // Load rubrics
        if (data.rubrics && data.rubrics.length > 0) {
          setRubrics(
            data.rubrics.map((r, idx) => ({
              id: r.id,
              category_name: r.category_name || '',
              section_name: r.section_name || '',
              criteria_name: r.criteria_name,
              max_score: r.max_score,
              weight: r.weight,
              sort_order: r.sort_order || idx + 1,
              descriptors: r.descriptors || {
                '5': '',
                '4': '',
                '3': '',
                '2': '',
                '1': '',
              },
            }))
          );
        }
      } catch (err: any) {
        toast.error(`Gagal memuatkan acara: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadEventData();
  }, [id, navigate]);

  // Form Fields Helpers
  const addFormField = () => {
    setFormFields((prev) => [
      ...prev,
      {
        field_label: '',
        field_type: 'text',
        is_required: false,
        options: '',
        sort_order: prev.length + 1,
      },
    ]);
  };

  const removeFormField = (index: number) => {
    setFormFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveFormField = (index: number, direction: 'UP' | 'DOWN') => {
    const newFields = [...formFields];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newFields.length) return;

    const temp = newFields[index];
    newFields[index] = newFields[targetIdx];
    newFields[targetIdx] = temp;
    setFormFields(newFields);
  };

  // Rubrics Helpers
  const addRubric = (defaultCategory = '') => {
    setRubrics((prev) => [
      ...prev,
      {
        id: `rubric-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        category_name: defaultCategory,
        section_name: '',
        criteria_name: '',
        max_score: 5,
        weight: 10,
        sort_order: prev.length + 1,
        descriptors: {
          '5': '',
          '4': '',
          '3': '',
          '2': '',
          '1': '',
        },
      },
    ]);
  };

  const removeRubric = (index: number) => {
    setRubrics((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveRubric = (index: number, direction: 'UP' | 'DOWN') => {
    const newRubrics = [...rubrics];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newRubrics.length) return;

    const temp = newRubrics[index];
    newRubrics[index] = newRubrics[targetIdx];
    newRubrics[targetIdx] = temp;
    setRubrics(newRubrics);
  };

  const handleLoadShowcasePreset = () => {
    const targetCategory = 'Best Showcase';
    const newItems: LocalRubricCriteria[] = IFAMB_SHOWCASE_PRESET.map((preset, idx) => ({
      id: `showcase-${idx + 1}-${Date.now()}`,
      category_name: preset.category_name || targetCategory,
      section_name: preset.section_name || '',
      criteria_name: preset.criteria_name,
      max_score: preset.max_score,
      weight: preset.weight,
      sort_order: preset.sort_order || idx + 1,
      descriptors: preset.descriptors ? { ...preset.descriptors } : { '5': '', '4': '', '3': '', '2': '', '1': '' },
    }));

    const hasRubrics = rubrics.length > 0 && rubrics.some((r) => r.criteria_name.trim() || r.category_name?.trim());
    const hasDifferentCategory = rubrics.some(
      (r) => r.category_name && r.category_name.trim() && r.category_name.trim().toLowerCase() !== targetCategory.toLowerCase()
    );

    if (hasDifferentCategory) {
      const isAppend = window.confirm(
        'Kategori rubrik lain dikesan. Adakah anda mahu TAMBAH (+Tambah Kategori) templat iFAMB Best Showcase ke dalam senarai?\n\n- Klik [OK] untuk TAMBAH (+Tambah Kategori)\n- Klik [Cancel] untuk GANTI SEMUA (Replace)'
      );
      if (isAppend) {
        setRubrics((prev) => [...prev, ...newItems]);
        toast.success('Templat iFAMB Best Showcase berjaya ditambah! (+16 Rubrik)');
      } else {
        setRubrics(newItems);
        toast.success('Templat iFAMB Best Showcase berjaya menggantikan rubrik sedia ada! (16 Rubrik)');
      }
    } else if (hasRubrics) {
      const isAppend = window.confirm(
        'Rubrik sedia ada dikesan. Adakah anda mahu TAMBAH templat ini atau GANTI SEMUA?\n\n- Klik [OK] untuk TAMBAH (+Tambah Kategori)\n- Klik [Cancel] untuk GANTI SEMUA (Replace)'
      );
      if (isAppend) {
        setRubrics((prev) => [...prev, ...newItems]);
        toast.success('Templat iFAMB Best Showcase berjaya ditambah!');
      } else {
        setRubrics(newItems);
        toast.success('Templat iFAMB Best Showcase berjaya menggantikan rubrik sedia ada!');
      }
    } else {
      setRubrics(newItems);
      toast.success('Templat iFAMB Best Showcase berjaya dimuatkan! (16 Rubrik / 4 Seksyen)');
    }
  };

  const handleLoadPitchingPreset = () => {
    const targetCategory = 'Best Pitching';
    const newItems: LocalRubricCriteria[] = IFAMB_PITCHING_PRESET.map((preset, idx) => ({
      id: `pitching-${idx + 1}-${Date.now()}`,
      category_name: preset.category_name || targetCategory,
      section_name: preset.section_name || '',
      criteria_name: preset.criteria_name,
      max_score: preset.max_score,
      weight: preset.weight,
      sort_order: preset.sort_order || idx + 1,
      descriptors: preset.descriptors ? { ...preset.descriptors } : { '5': '', '4': '', '3': '', '2': '', '1': '' },
    }));

    const hasRubrics = rubrics.length > 0 && rubrics.some((r) => r.criteria_name.trim() || r.category_name?.trim());
    const hasDifferentCategory = rubrics.some(
      (r) => r.category_name && r.category_name.trim() && r.category_name.trim().toLowerCase() !== targetCategory.toLowerCase()
    );

    if (hasDifferentCategory) {
      const isAppend = window.confirm(
        'Kategori rubrik lain dikesan. Adakah anda mahu TAMBAH (+Tambah Kategori) templat iFAMB Best Pitching ke dalam senarai?\n\n- Klik [OK] untuk TAMBAH (+Tambah Kategori)\n- Klik [Cancel] untuk GANTI SEMUA (Replace)'
      );
      if (isAppend) {
        setRubrics((prev) => [...prev, ...newItems]);
        toast.success('Templat iFAMB Best Pitching berjaya ditambah! (+10 Rubrik)');
      } else {
        setRubrics(newItems);
        toast.success('Templat iFAMB Best Pitching berjaya menggantikan rubrik sedia ada! (10 Rubrik)');
      }
    } else if (hasRubrics) {
      const isAppend = window.confirm(
        'Rubrik sedia ada dikesan. Adakah anda mahu TAMBAH templat ini atau GANTI SEMUA?\n\n- Klik [OK] untuk TAMBAH (+Tambah Kategori)\n- Klik [Cancel] meanda GANTI SEMUA (Replace)'
      );
      if (isAppend) {
        setRubrics((prev) => [...prev, ...newItems]);
        toast.success('Templat iFAMB Best Pitching berjaya ditambah!');
      } else {
        setRubrics(newItems);
        toast.success('Templat iFAMB Best Pitching berjaya menggantikan rubrik sedia ada!');
      }
    } else {
      setRubrics(newItems);
      toast.success('Templat iFAMB Best Pitching berjaya dimuatkan! (10 Rubrik)');
    }
  };

  const updateDescriptor = (index: number, scoreKey: string, val: string) => {
    setRubrics((prev) => {
      const updated = [...prev];
      const currentDescriptors = updated[index].descriptors || {
        '5': '',
        '4': '',
        '3': '',
        '2': '',
        '1': '',
      };
      updated[index] = {
        ...updated[index],
        descriptors: {
          ...currentDescriptors,
          [scoreKey]: val,
        },
      };
      return updated;
    });
  };

  // Save / Submit Handler
  const handleSubmit = async (targetStatus: 'DRAFT' | 'PENDING_APPROVAL') => {
    if (!title.trim()) {
      toast.error('Sila masukkan tajuk acara.');
      return;
    }

    try {
      setSubmitting(true);

      const parsedMilestones = milestoneConfig
        ? milestoneConfig
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n))
        : null;

      const eventPayload = {
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || 'Keusahawanan',
        event_type: eventType,
        event_mode: eventMode,
        event_date: eventDate ? new Date(eventDate).toISOString() : null,
        location: location.trim() || null,
        status: targetStatus,
        milestone_config: parsedMilestones,
        is_leaderboard_public: isLeaderboardPublic,
        created_by: user?.id || null,
      };

      const preparedFields = formFields.map((f, idx) => ({
        field_label: f.field_label.trim(),
        field_type: f.field_type,
        is_required: f.is_required,
        options:
          f.field_type === 'select' && f.options
            ? f.options.split(',').map((s) => s.trim()).filter(Boolean)
            : null,
        sort_order: idx + 1,
      }));

      const preparedRubrics = rubrics.map((r, idx) => ({
        category_name: r.category_name ? r.category_name.trim() : null,
        section_name: r.section_name ? r.section_name.trim() : null,
        criteria_name: r.criteria_name.trim(),
        max_score: Number(r.max_score) || 5,
        weight: Number(r.weight) || 0,
        descriptors: r.descriptors || null,
        sort_order: idx + 1,
      }));

      if (isEditMode && id) {
        await updateEmsEvent(id, eventPayload, preparedFields, preparedRubrics);
        toast.success(
          targetStatus === 'DRAFT'
            ? 'Draf acara berjaya dikemaskini!'
            : 'Acara dihantar untuk kelulusan JPP HQ!'
        );
      } else {
        await createEmsEvent(eventPayload, preparedFields, preparedRubrics);
        toast.success(
          targetStatus === 'DRAFT'
            ? 'Draf acara berjaya disimpan!'
            : 'Acara baharu berjaya dihantar untuk kelulusan JPP HQ!'
        );
      }

      navigate('/ems/dashboard');
    } catch (err: any) {
      console.error('[EMS] Error saving event:', err);
      toast.error(`Gagal menyimpan acara: ${err.message || 'Ralat sistem'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-400">Memuatkan data acara...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 pb-28 md:pb-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ems/dashboard')}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {isEditMode ? 'Sunting Acara Pertandingan' : 'Cipta Acara Pertandingan Baharu'}
            </h1>
            <p className="text-sm text-slate-400">
              Isi maklumat asas acara, bina borang pendaftaran & tetapkan rubrik pemarkahan juri.
            </p>
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="space-y-8">
        {/* ============================================================ */}
        {/* Section 1: Maklumat Asas Acara */}
        {/* ============================================================ */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Seksyen 1: Maklumat Asas Acara</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Tajuk / Nama Acara <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pertandingan Inovasi & Pitches Keusahawanan 2026"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-medium text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-2">Penerangan Acara</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Penerangan ringkas objektif, syarat pertandigan dan maklumat lanjut..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Jenis Acara <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setEventType('COMPETITION')}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    eventType === 'COMPETITION'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-white mb-1">Pertandingan / Pameran</div>
                    <div className="text-xs text-slate-400">Juri & Leaderboard pemarkahan</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEventType('OPEN_AUDIENCE')}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    eventType === 'OPEN_AUDIENCE'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-white mb-1">Program Terbuka / Ceramah</div>
                    <div className="text-xs text-slate-400">Kehadiran & Cabutan Bertuah</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEventType('HYBRID')}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    eventType === 'HYBRID'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-white mb-1">Kombinasi (Hybrid)</div>
                    <div className="text-xs text-slate-400">Pertandingan & Kehadiran Awam</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Kategori Acara</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Keusahawanan">Keusahawanan</option>
                <option value="Inovasi">Inovasi & Teknologi</option>
                <option value="Akademik">Akademik & STEM</option>
                <option value="Sukan">Sukan & Rekreasi</option>
                <option value="Kebudayaan">Kebudayaan & Seni</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Mod Penyertaan</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEventMode('INDIVIDUAL')}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs border transition-all ${
                    eventMode === 'INDIVIDUAL'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Individu
                </button>
                <button
                  type="button"
                  onClick={() => setEventMode('TEAM')}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs border transition-all ${
                    eventMode === 'TEAM'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Pasukan / Booth
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Tarikh & Masa Acara</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Lokasi Acara</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Dewan Gemilang POLISAS / Booth Lobi Utama"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tetapan Pemenang Milestone (Milestone Winner Config)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Masukkan nombor kedatangan pengunjung bertuah yang akan memenangi hadiah cabutan (dipisahkan dengan koma).
              </p>
              <input
                type="text"
                value={milestoneConfig}
                onChange={(e) => setMilestoneConfig(e.target.value)}
                placeholder="e.g. 50, 100, 250, 500"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isLeaderboardPublic}
                  onChange={(e) => setIsLeaderboardPublic(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-950 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-300">
                  Benarkan Papan Kedudukan (Leaderboard) dilihat secara awam.
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* Section 2: Pembina Borang Pendaftaran (Registration Form Builder) */}
        {/* ============================================================ */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Seksyen 2: Pembina Borang Pendaftaran
                </h2>
                <p className="text-xs text-slate-400">
                  Tambah medan maklumat tambahan yang perlu diisi oleh peserta semasa mendaftar.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addFormField}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Medan</span>
            </button>
          </div>

          <div className="space-y-4">
            {formFields.map((field, index) => (
              <div
                key={index}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 relative group"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Label Medan (e.g. Nama Produk / Tajuk Projek)"
                      value={field.field_label}
                      onChange={(e) => {
                        const updated = [...formFields];
                        updated[index].field_label = e.target.value;
                        setFormFields(updated);
                      }}
                      className="w-full sm:w-72 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Move Up/Down */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveFormField(index, 'UP')}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === formFields.length - 1}
                      onClick={() => moveFormField(index, 'DOWN')}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeFormField(index)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Jenis Medan
                    </label>
                    <select
                      value={field.field_type}
                      onChange={(e) => {
                        const updated = [...formFields];
                        updated[index].field_type = e.target.value;
                        setFormFields(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                    >
                      <option value="text">Teks Ringkas (Text)</option>
                      <option value="textarea">Teks Panjang (Textarea)</option>
                      <option value="select">Pilihan Dropdown (Select)</option>
                      <option value="checkbox">Pengesahan Checkbox</option>
                      <option value="image_upload">Muat Naik Gambar / Foto</option>
                      <option value="document_upload">Muat Naik Dokumen / PDF</option>
                    </select>
                  </div>

                  {field.field_type === 'select' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Pilihan (Asingkan dengan koma)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Opsi 1, Opsi 2, Opsi 3"
                        value={field.options}
                        onChange={(e) => {
                          const updated = [...formFields];
                          updated[index].options = e.target.value;
                          setFormFields(updated);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                      />
                    </div>
                  )}

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={field.is_required}
                        onChange={(e) => {
                          const updated = [...formFields];
                          updated[index].is_required = e.target.checked;
                          setFormFields(updated);
                        }}
                        className="w-4 h-4 rounded border-slate-800 text-teal-600 focus:ring-0 bg-slate-900 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300">Wajib Diisi</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* Section 3: Rubrik Pemarkahan Juri (Scoring Rubric Builder) */}
        {/* ============================================================ */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Seksyen 3: Rubrik Pemarkahan Juri & Hierarki
                </h2>
                <p className="text-xs text-slate-400">
                  Tetapkan kriteria pemarkahan, markah maksimum & pemberat (weightage) untuk juri.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addRubric}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kriteria</span>
            </button>
          </div>

          {/* 1-Click Preset Loaders */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Templat Rubrik Pantas (1-Click Preset Loader)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleLoadShowcasePreset}
                className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-950/70 to-slate-900 border border-indigo-500/30 hover:border-indigo-400 text-white font-bold text-xs transition-all shadow-md group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Package className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
                  <div>
                    <div className="text-white font-extrabold">📦 ➕ Tambah Templat iFAMB Best Showcase</div>
                    <div className="text-[11px] font-normal text-slate-400">(4 Seksyen / 16 Rubrik)</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLoadPitchingPreset}
                className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/30 hover:border-emerald-400 text-white font-bold text-xs transition-all shadow-md group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Mic className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                  <div>
                    <div className="text-white font-extrabold">🎤 ➕ Tambah Templat iFAMB Best Pitching</div>
                    <div className="text-[11px] font-normal text-slate-400">(10 Rubrik)</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Live Total Weight Summary & Warning */}
          {(() => {
            const categorySummaryMap: Record<string, number> = {};
            rubrics.forEach((r) => {
              const catName = r.category_name?.trim() || 'Tanpa Kategori';
              categorySummaryMap[catName] = (categorySummaryMap[catName] || 0) + (Number(r.weight) || 0);
            });

            const categoriesSummary = Object.entries(categorySummaryMap).map(([categoryName, catTotalWeight]) => {
              const isCatBalanced = Math.abs(catTotalWeight - 100) < 0.01;
              return { categoryName, catTotalWeight, isCatBalanced };
            });

            const allCategoriesBalanced =
              categoriesSummary.length > 0 && categoriesSummary.every((c) => c.isCatBalanced);
            const unbalancedCategories = categoriesSummary.filter((c) => !c.isCatBalanced);

            return (
              <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400">Ringkasan Pemberat Kriteria:</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-base font-bold text-white">Status Nisbah Kategori:</span>
                      {allCategoriesBalanced ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Semua Kategori 100% Seimbang ✅
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-4 h-4 text-amber-400" /> Kategori Tidak Seimbang ⚠️
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Per-Category Badges */}
                <div className="flex flex-wrap items-center gap-3">
                  {categoriesSummary.map((cat) => (
                    <div
                      key={cat.categoryName}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                        cat.isCatBalanced
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <span className="text-slate-200">{cat.categoryName}:</span>
                      <span className="font-mono font-black">{cat.catTotalWeight}%</span>
                      {cat.isCatBalanced ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> 100% Seimbang
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-md">
                          <AlertCircle className="w-3 h-3" /> Tidak Seimbang
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Warnings for unbalanced categories */}
                {unbalancedCategories.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {unbalancedCategories.map((cat) => (
                      <div
                        key={cat.categoryName}
                        className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>
                          Amaran: Pemberat Kategori &quot;{cat.categoryName}&quot; ialah {cat.catTotalWeight}%. Disyorkan 100%.
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Rubrics Editor List Grouped by Category */}
          {(() => {
            const categoryGroups: {
              categoryName: string;
              items: { rubric: LocalRubricCriteria; originalIndex: number }[];
              totalWeight: number;
            }[] = [];

            rubrics.forEach((rubric, index) => {
              const catName = rubric.category_name?.trim() || 'Tanpa Kategori';
              let group = categoryGroups.find((g) => g.categoryName.toLowerCase() === catName.toLowerCase());
              if (!group) {
                group = { categoryName: catName, items: [], totalWeight: 0 };
                categoryGroups.push(group);
              }
              group.items.push({ rubric, originalIndex: index });
              group.totalWeight += Number(rubric.weight) || 0;
            });

            return (
              <div className="space-y-6">
                {categoryGroups.map((group) => (
                  <div key={group.categoryName} className="space-y-4">
                    {/* Category Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                            Kategori Rubrik
                          </span>
                          <h3 className="text-base font-black text-white tracking-tight">
                            {group.categoryName}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-400">
                          {group.items.length} Kriteria
                        </span>
                        <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
                          Jumlah Pemberat: <span className="text-white font-black">{group.totalWeight}%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addRubric(group.categoryName === 'Tanpa Kategori' ? '' : group.categoryName)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all border border-amber-500/30"
                          title={`Tambah Kriteria ke ${group.categoryName}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah</span>
                        </button>
                      </div>
                    </div>

                    {/* Items under this category */}
                    <div className="space-y-4">
                      {group.items.map(({ rubric, originalIndex }) => {
                        const index = originalIndex;
                        const isExpanded = Boolean(openDescriptors[index]);
                        const descriptors = rubric.descriptors || { '5': '', '4': '', '3': '', '2': '', '1': '' };

                        return (
                          <div
                            key={rubric.id || index}
                            className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4 relative group"
                          >
                            {/* Card Header & Main Fields */}
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                              <div className="flex items-center gap-2 w-full md:w-auto">
                                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                  {index + 1}
                                </span>
                                <div className="flex-1 md:w-80">
                                  <input
                                    type="text"
                                    required
                                    placeholder="Nama Kriteria (e.g. Creativity & Originality)"
                                    value={rubric.criteria_name}
                                    onChange={(e) => {
                                      const updated = [...rubrics];
                                      updated[index].criteria_name = e.target.value;
                                      setRubrics(updated);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => moveRubric(index, 'UP')}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 transition-colors"
                                  title="Alih ke atas"
                                >
                                  <MoveUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === rubrics.length - 1}
                                  onClick={() => moveRubric(index, 'DOWN')}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 transition-colors"
                                  title="Alih ke bawah"
                                >
                                  <MoveDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeRubric(index)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                                  title="Padam Kriteria"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Hierarchical Fields & Numeric Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                  Kategori (Category)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Best Showcase / Best Pitching"
                                  value={rubric.category_name || ''}
                                  onChange={(e) => {
                                    const updated = [...rubrics];
                                    updated[index].category_name = e.target.value;
                                    setRubrics(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                  Seksyen / Sub-kategori (Section)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. TIKTOK PROMOTION (25%)"
                                  value={rubric.section_name || ''}
                                  onChange={(e) => {
                                    const updated = [...rubrics];
                                    updated[index].section_name = e.target.value;
                                    setRubrics(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                  Pemberat % (Weight)
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="100"
                                  value={rubric.weight}
                                  onChange={(e) => {
                                    const updated = [...rubrics];
                                    updated[index].weight = Number(e.target.value);
                                    setRubrics(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                  Markah Maksimum (Max Score)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={rubric.max_score}
                                  onChange={(e) => {
                                    const updated = [...rubrics];
                                    updated[index].max_score = Number(e.target.value);
                                    setRubrics(updated);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono font-bold"
                                />
                              </div>
                            </div>

                            {/* Collapsible 5-Point Descriptors */}
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleDescriptor(index)}
                                className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors bg-slate-900/60 hover:bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 w-full"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <span>Deskriptor Pemarkahan 5-Skala (Skor 1 - 5)</span>
                                <span className="ml-auto text-[10px] text-slate-400">
                                  {isExpanded ? 'Tutup' : 'Buka & Sunting'}
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="mt-3 p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                                  <div className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                                    Deskriptor Pemarkahan (5-Point Descriptors):
                                  </div>
                                  <div className="grid grid-cols-1 gap-2.5">
                                    {[
                                      { key: '5', label: '5 - Cemerlang (Excellent)', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                                      { key: '4', label: '4 - Baik (Good)', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                                      { key: '3', label: '3 - Memuaskan (Satisfactory)', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                                      { key: '2', label: '2 - Sederhana (Fair)', badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                                      { key: '1', label: '1 - Lemah (Poor)', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
                                    ].map((level) => (
                                      <div key={level.key} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 sm:w-44 ${level.badgeColor}`}>
                                          {level.label}
                                        </span>
                                        <input
                                          type="text"
                                          placeholder={`Keterangan untuk skor ${level.key}...`}
                                          value={descriptors[level.key] || ''}
                                          onChange={(e) => updateDescriptor(index, level.key, e.target.value)}
                                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('DRAFT')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Draf</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('PENDING_APPROVAL')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Menyimpan...' : 'Hantar Untuk Kelulusan JPP HQ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
