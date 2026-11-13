import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  FileSpreadsheet,
  Sparkles,
  Upload,
  CheckCircle2,
  Trash2,
  Loader2,
  Building2,
  Plus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  parseBulkRoomsInput,
  inferRoomMetadata,
  type MinimalBuildingWithCoords,
  type BulkRoomImportRow,
} from '@/lib/polyMapsSmartEntry';

export interface PolyMapsBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildings: MinimalBuildingWithCoords[];
  onImported: () => void;
}

const SAMPLE_PASTE_TEXT_MS = `EA301, Makmal Komputer 1
EA302, Makmal Rangkaian & Keselamatan
EA204, Bilik Kuliah 4
JKE-G02, Bengkel Pemasangan Elektrik
JKA105, Makmal Hidraulik`;

const SAMPLE_PASTE_TEXT_EN = `EA301, Computer Lab 1
EA302, Network & Security Lab
EA204, Lecture Room 4
JKE-G02, Electrical Installation Workshop
JKA105, Hydraulics Lab`;

export function PolyMapsBulkImportModal({
  isOpen,
  onClose,
  buildings,
  onImported,
}: PolyMapsBulkImportModalProps) {
  const { t, i18n } = useTranslation(['services', 'common']);
  const lang: 'en' | 'ms' = i18n.language?.startsWith('en') ? 'en' : 'ms';

  const [fallbackBuildingId, setFallbackBuildingId] = useState<string>(buildings[0]?.id || '');
  const [rawText, setRawText] = useState<string>('');
  const [rows, setRows] = useState<BulkRoomImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleAnalyzeText = (textToParse = rawText, defaultBldId = fallbackBuildingId) => {
    const parsed = parseBulkRoomsInput(textToParse, buildings, defaultBldId, lang);
    setRows(parsed);
    if (parsed.length > 0) {
      toast.success(t('services:polymaps_bulk_analyzed_toast', '{{count}} bilik berjaya dianalisis secara pintar!', { count: parsed.length }));
    } else {
      toast.warning(t('services:polymaps_bulk_no_rows_toast', 'Tiada baris bilik ditemui. Sila tampal senarai bilik terlebih dahulu.'));
    }
  };

  const handleCsvOrTextFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setRawText(content);
      handleAnalyzeText(content, fallbackBuildingId);
    } catch (err: any) {
      toast.error(
        t('services:polymaps_bulk_read_error', 'Gagal membaca fail: {{msg}}', {
          msg: err.message || t('services:polymaps_bulk_unknown_error', 'Ralat tidak diketahui'),
        })
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleRowChange = (
    idx: number,
    field: keyof BulkRoomImportRow,
    value: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], [field]: value };

      if (field === 'building_id') {
        const bld = buildings.find((b) => b.id === value);
        updated.building_code = bld?.code || updated.building_code;
      }

      if (field === 'room_code') {
        const bld = buildings.find((b) => b.id === updated.building_id);
        const inferred = inferRoomMetadata(value, bld?.code, undefined, lang);
        updated.floor_level = inferred.floor_level;
        updated.search_tags = inferred.search_tags;
        updated.direction_text = inferred.direction_text;
      }

      next[idx] = updated;
      return next;
    });
  };

  const handleRemoveRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBulkSave = async () => {
    const validRows = rows.filter((r) => r.room_code.trim() && r.building_id);
    if (validRows.length === 0) {
      toast.error(t('services:polymaps_bulk_no_valid_rows', 'Tiada baris bilik yang lengkap dengan Bangunan untuk diimport.'));
      return;
    }

    setIsImporting(true);
    try {
      const payload = validRows.map((r) => ({
        building_id: r.building_id,
        room_code: r.room_code.trim(),
        floor_level: r.floor_level.trim() || '1',
        search_tags: r.search_tags.trim(),
        direction_text: r.direction_text.trim(),
        is_360_enabled: false,
      }));

      const { error } = await supabase.from('imaps_locations').insert(payload);
      if (error) throw error;

      toast.success(
        t('services:polymaps_bulk_success_toast', 'Berjaya mengimport {{count}} bilik/lokasi secara pukal!', {
          count: payload.length,
        })
      );
      setRawText('');
      setRows([]);
      onImported();
      onClose();
    } catch (err: any) {
      console.error('Ralat import pukal:', err);
      toast.error(err.message || t('services:polymaps_bulk_failed_toast', 'Gagal mengimport senarai bilik.'));
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = useMemo(
    () => rows.filter((r) => r.room_code.trim() && r.building_id).length,
    [rows]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {t('services:polymaps_bulk_title', 'Import Pukal Pintar (Smart Paste & CSV)')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('services:polymaps_bulk_subtitle', 'Tampal senarai kod bilik daripada jadual waktu atau CSV — sistem auto-teka Bangunan, Aras, Tag Carian & Panduan Arah.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t('services:polymaps_bulk_step1_label', '1. Tampal Senarai Bilik (Satu Bilik Setiap Baris):')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = lang === 'en' ? SAMPLE_PASTE_TEXT_EN : SAMPLE_PASTE_TEXT_MS;
                    setRawText(sample);
                    handleAnalyzeText(sample, fallbackBuildingId);
                  }}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t('services:polymaps_bulk_fill_sample', 'Isi Contoh Data')}
                </button>
              </div>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={t('services:polymaps_bulk_placeholder', 'Contoh:\nEA301, Makmal Komputer 1\nEA302, Makmal Rangkaian\nJKE204, Bilik Kuliah 4')}
                className="w-full p-3.5 text-xs font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('services:polymaps_bulk_default_building_label', 'Bangunan Lalai (Jika Kod Bilik Tiada Awalan Blok):')}
                  </label>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                      value={fallbackBuildingId}
                      onChange={(e) => setFallbackBuildingId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('services:polymaps_bulk_upload_label', 'Atau Muat Naik Fail CSV / TXT:')}
                  </label>
                  <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-indigo-400 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer hover:bg-indigo-100/60 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{t('services:polymaps_bulk_choose_file', 'Pilih Fail .CSV / .TXT')}</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvOrTextFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAnalyzeText(rawText, fallbackBuildingId)}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                {t('services:polymaps_bulk_generate_btn', 'Jana Pratonton & Auto-Teka Aras/Arah')}
              </button>
            </div>
          </div>

          {/* Jadual Pratonton Boleh Sunting */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t('services:polymaps_bulk_step2_label', '2. Semak & Sunting Pratonton ({{count}} Baris Dijana)', { count: rows.length })}
              </h3>
              {rows.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setRows((prev) => [
                      ...prev,
                      {
                        room_code: '',
                        building_id: fallbackBuildingId || buildings[0]?.id || '',
                        building_code:
                          buildings.find((b) => b.id === fallbackBuildingId)?.code || '',
                        floor_level: '1',
                        search_tags: '',
                        direction_text: '',
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                >
                  <Plus className="w-3.5 h-3.5" /> {t('services:polymaps_bulk_add_row_btn', 'Tambah Baris Manual')}
                </button>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                {t('services:polymaps_bulk_empty_hint', 'Tampal senarai bilik di atas dan klik "Jana Pratonton" untuk melihat jadual inferens automatik.')}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-black uppercase text-slate-600 dark:text-slate-300">
                      <th className="p-2.5">{t('services:polymaps_bulk_th_building', 'Bangunan')}</th>
                      <th className="p-2.5">{t('services:polymaps_bulk_th_room', 'Kod & Nama Bilik')}</th>
                      <th className="p-2.5 w-20">{t('services:polymaps_bulk_th_floor', 'Aras')}</th>
                      <th className="p-2.5">{t('services:polymaps_bulk_th_tags', 'Kata Kunci (Tags)')}</th>
                      <th className="p-2.5">{t('services:polymaps_bulk_th_directions', 'Panduan Arah Dalaman')}</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="bg-white dark:bg-slate-900">
                        <td className="p-2">
                          <select
                            value={row.building_id}
                            onChange={(e) =>
                              handleRowChange(idx, 'building_id', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                          >
                            {buildings.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.room_code}
                            onChange={(e) =>
                              handleRowChange(idx, 'room_code', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.floor_level}
                            onChange={(e) =>
                              handleRowChange(idx, 'floor_level', e.target.value)
                            }
                            className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold text-center text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.search_tags}
                            onChange={(e) =>
                              handleRowChange(idx, 'search_tags', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.direction_text}
                            onChange={(e) =>
                              handleRowChange(idx, 'direction_text', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            {t('services:polymaps_bulk_footer_count', '{{count}} bilik sedia dimasukkan ke dalam direktori PolyMaps.', { count: validCount })}
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              {t('services:polymaps_bulk_cancel', 'Batal')}
            </button>
            <button
              type="button"
              disabled={validCount === 0 || isImporting}
              onClick={handleBulkSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {t('services:polymaps_bulk_submit_btn', 'Import {{count}} Bilik Sekarang', { count: validCount })}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
