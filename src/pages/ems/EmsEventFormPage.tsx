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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEmsEventById, createEmsEvent, updateEmsEvent } from '@/lib/ems';
import type { EmsEventMode, EmsEventType, EmsFormField, EmsRubricCriteria } from '@/types';

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
  criteria_name: string;
  max_score: number;
  weight: number;
  sort_order: number;
}

export function EmsEventFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();

  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

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
      max_score: 30,
      weight: 1.0,
      sort_order: 1,
    },
    {
      criteria_name: 'Persembahan & Pitching',
      max_score: 30,
      weight: 1.0,
      sort_order: 2,
    },
    {
      criteria_name: 'Impak & Kebolehlaksanaan',
      max_score: 40,
      weight: 1.0,
      sort_order: 3,
    },
  ]);

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
              criteria_name: r.criteria_name,
              max_score: r.max_score,
              weight: r.weight,
              sort_order: r.sort_order || idx + 1,
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
  const addRubric = () => {
    setRubrics((prev) => [
      ...prev,
      {
        criteria_name: '',
        max_score: 10,
        weight: 1.0,
        sort_order: prev.length + 1,
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
        criteria_name: r.criteria_name.trim(),
        max_score: Number(r.max_score) || 10,
        weight: Number(r.weight) || 1.0,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-5xl mx-auto space-y-8">
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
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Seksyen 3: Rubrik Pemarkahan Juri
                </h2>
                <p className="text-xs text-slate-400">
                  Tetapkan kriteria pemarkahan, markah maksimum & pemberat (weightage) untuk juri.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addRubric}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kriteria</span>
            </button>
          </div>

          <div className="space-y-4">
            {rubrics.map((rubric, index) => (
              <div
                key={index}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 relative group"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Nama Kriteria (e.g. Kreativiti / Impak)"
                      value={rubric.criteria_name}
                      onChange={(e) => {
                        const updated = [...rubrics];
                        updated[index].criteria_name = e.target.value;
                        setRubrics(updated);
                      }}
                      className="w-full sm:w-72 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveRubric(index, 'UP')}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === rubrics.length - 1}
                      onClick={() => moveRubric(index, 'DOWN')}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeRubric(index)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Pemberat (Weightage Multiplier)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={rubric.weight}
                      onChange={(e) => {
                        const updated = [...rubrics];
                        updated[index].weight = Number(e.target.value);
                        setRubrics(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
