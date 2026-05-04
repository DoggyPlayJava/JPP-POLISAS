import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Save, Loader2, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { useKamsisDynamicFields, KamsisFormField } from '@/hooks/useKamsisDynamicFields';

interface Props {
  onClose: () => void;
}

export function KamsisSettingsModal({ onClose }: Props) {
  const { fields: initialFields, loading: initialLoading, refresh } = useKamsisDynamicFields();
  const [fields, setFields] = useState<KamsisFormField[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialLoading) {
      setFields(initialFields.map(f => ({ ...f })));
    }
  }, [initialFields, initialLoading]);

  const handleAddField = () => {
    const newField: KamsisFormField = {
      id: `new-${Date.now()}`,
      field_key: `q_${Date.now()}`,
      label: 'Soalan Baru',
      field_type: 'text',
      options: null,
      is_required: false,
      display_order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (index: number, updates: Partial<KamsisFormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    
    // Auto format options if type is changed to select/radio
    if (updates.field_type) {
      if (['select', 'radio'].includes(updates.field_type) && !newFields[index].options) {
        newFields[index].options = ['Pilihan 1', 'Pilihan 2'];
      } else if (!['select', 'radio'].includes(updates.field_type)) {
        newFields[index].options = null;
      }
    }
    
    setFields(newFields);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Clear existing fields and insert new ones
      const { error: deleteErr } = await supabase.from('kamsis_dynamic_fields').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteErr && deleteErr.code !== '42P01') throw deleteErr;

      if (fields.length > 0) {
        const toInsert = fields.map((f, i) => ({
          field_key: f.field_key,
          label: f.label,
          field_type: f.field_type,
          options: f.options,
          is_required: f.is_required,
          display_order: i,
        }));
        const { error: insertErr } = await supabase.from('kamsis_dynamic_fields').insert(toInsert);
        if (insertErr) throw insertErr;
      }

      toast.success('Soalan permohonan dikemas kini!');
      await refresh();
      onClose();
    } catch (err) {
      toast.error('Gagal menyimpan tetapan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl bg-slate-900 rounded-2xl shadow-xl border border-slate-800 flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white">Tetapan Borang Permohonan</h2>
            <p className="text-xs text-slate-400 mt-1">Urus soalan-soalan dinamik yang ditanya semasa pelajar memohon KAMSIS.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {initialLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
          ) : (
            <>
              {fields.map((f, i) => (
                <div key={f.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex gap-4">
                  <div className="mt-2 text-slate-500 cursor-grab"><GripVertical className="w-5 h-5" /></div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Soalan / Label</label>
                        <input
                          type="text"
                          value={f.label}
                          onChange={e => handleUpdateField(i, { label: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jenis Input</label>
                        <select
                          value={f.field_type}
                          onChange={e => handleUpdateField(i, { field_type: e.target.value as any })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                        >
                          <option value="text">Teks Pendek</option>
                          <option value="textarea">Teks Panjang</option>
                          <option value="number">Nombor</option>
                          <option value="select">Dropdown Select</option>
                          <option value="radio">Radio Buttons</option>
                          <option value="checkbox">Checkbox (Ya/Tidak)</option>
                        </select>
                      </div>
                    </div>

                    {['select', 'radio'].includes(f.field_type) && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilihan (Pisahkan dengan koma)</label>
                        <input
                          type="text"
                          value={f.options?.join(', ') ?? ''}
                          onChange={e => handleUpdateField(i, { options: e.target.value.split(',').map(s => s.trim()) })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                          placeholder="Cth: Ya, Tidak, Mungkin"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={f.is_required}
                          onChange={e => handleUpdateField(i, { is_required: e.target.checked })}
                          className="w-4 h-4 accent-violet-500 rounded bg-slate-900 border-slate-700"
                        />
                        Wajib Diisi
                      </label>
                      <div className="flex-1" />
                      <button
                        onClick={() => handleRemoveField(i)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Buang Soalan
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddField}
                className="w-full py-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-violet-500/50 hover:bg-violet-500/5 text-slate-400 hover:text-violet-400 transition-all flex flex-col items-center gap-2 font-bold text-sm"
              >
                <Plus className="w-5 h-5" />
                Tambah Soalan
              </button>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-violet-500/25"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Tetapan
          </button>
        </div>
      </motion.div>
    </div>
  );
}
