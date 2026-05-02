// ============================================================
// KlkDynamicFieldRenderer — Render soalan dinamik dari klk_form_fields
// Guna dalam Modal, FormPage, dan SettingsPage
// ============================================================
import React from 'react';
import type { KlkFormField } from '@/hooks/useKlkDynamicFields';

interface Props {
  fields: KlkFormField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  inputClass?: string;
}

const BASE_INPUT = 'w-full px-4 rounded-xl bg-slate-800/60 border border-white/[0.08] text-white text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600';

export function KlkDynamicFieldRenderer({ fields, values, onChange, inputClass }: Props) {
  if (fields.length === 0) return null;

  return (
    <>
      {fields.map(f => (
        <div key={f.field_key} className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {f.label}
            {f.is_required && <span className="text-red-400 ml-1">*</span>}
          </label>

          {/* text / number */}
          {(f.field_type === 'text' || f.field_type === 'number') && (
            <input
              type={f.field_type}
              value={values[f.field_key] ?? ''}
              onChange={e => onChange(f.field_key, e.target.value)}
              required={f.is_required}
              className={`${BASE_INPUT} h-11 ${inputClass ?? ''}`}
            />
          )}

          {/* textarea */}
          {f.field_type === 'textarea' && (
            <textarea
              value={values[f.field_key] ?? ''}
              onChange={e => onChange(f.field_key, e.target.value)}
              required={f.is_required}
              rows={2}
              className={`${BASE_INPUT} py-3 resize-none ${inputClass ?? ''}`}
            />
          )}

          {/* select */}
          {f.field_type === 'select' && f.options && (
            <select
              value={values[f.field_key] ?? ''}
              onChange={e => onChange(f.field_key, e.target.value)}
              required={f.is_required}
              className={`${BASE_INPUT} h-11 appearance-none ${inputClass ?? ''}`}
            >
              <option value="">-- Pilih --</option>
              {f.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {/* radio */}
          {f.field_type === 'radio' && f.options && (
            <div className="flex flex-wrap gap-3 pt-1">
              {f.options.map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                  <input
                    type="radio"
                    name={f.field_key}
                    value={opt}
                    checked={values[f.field_key] === opt}
                    onChange={() => onChange(f.field_key, opt)}
                    required={f.is_required}
                    className="accent-blue-500 w-4 h-4"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {/* checkbox — simpan sebagai 'true' / 'false' string */}
          {f.field_type === 'checkbox' && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={values[f.field_key] === 'true'}
                onChange={e => onChange(f.field_key, e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-slate-300">{f.label}</span>
            </label>
          )}
        </div>
      ))}
    </>
  );
}
