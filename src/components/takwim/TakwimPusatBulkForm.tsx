import React, { useState } from 'react';
import { KALENDAR_AKADEMIK_2026_2027, type KalendarAkademikEntry } from '@/config/takwim-akademik-template';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Loader2, Check, AlertTriangle, Plus } from 'lucide-react';

interface BulkRow extends KalendarAkademikEntry {
  _id: number;
  _selected: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  sesi: string;
}

export function TakwimPusatBulkForm({ open, onClose, onSuccess, userId, sesi }: Props) {
  const [rows, setRows] = useState<BulkRow[]>(() =>
    KALENDAR_AKADEMIK_2026_2027.map((e, i) => ({ ...e, _id: i, _selected: true }))
  );
  const [saving, setSaving] = useState(false);

  const toggleRow = (id: number) => setRows(r => r.map(x => x._id === id ? { ...x, _selected: !x._selected } : x));
  const removeRow = (id: number) => setRows(r => r.filter(x => x._id !== id));

  // Auto-detect sesi based on date (Sesi I: Jun-Nov | Sesi II: Dec-May)
  const detectSesi = (tarikhMula: string): 'I' | 'II' => {
    if (!tarikhMula) return 'I';
    const month = new Date(tarikhMula).getMonth(); // 0-indexed
    return (month >= 5 && month <= 10) ? 'I' : 'II'; // Jun(5)–Nov(10) = Sesi I
  };

  const updateRow = (id: number, field: keyof KalendarAkademikEntry, value: any) =>
    setRows(r => r.map(x => {
      if (x._id !== id) return x;
      const updated = { ...x, [field]: value };
      // Auto-update sesi when tarikhMula changes
      if (field === 'tarikhMula' && value) updated.sesi = detectSesi(value);
      return updated;
    }));

  const toggleSesi = (id: number) =>
    setRows(r => r.map(x => x._id === id ? { ...x, sesi: x.sesi === 'I' ? 'II' : 'I' } : x));

  const addRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => r._id)) + 1 : 0;
    setRows(r => [...r, {
      _id: newId, _selected: true,
      sesi: 'I', tarikhMula: '', tarikhTamat: '', bilMinggu: null,
      aktiviti: '', catatan: '', isCuti: false,
    }]);
  };

  // Auto-sort by tarikh — baris baru auto-rearrange ikut tarikh
  const sortedRows = React.useMemo(() =>
    [...rows].sort((a, b) => {
      if (!a.tarikhMula && !b.tarikhMula) return 0;
      if (!a.tarikhMula) return 1;  // baris kosong ke bawah
      if (!b.tarikhMula) return -1;
      return a.tarikhMula.localeCompare(b.tarikhMula);
    }),
  [rows]);

  const selected = sortedRows.filter(r => r._selected);

  const handleSave = async () => {
    if (selected.length === 0) { toast.error('Tiada entri dipilih.'); return; }
    setSaving(true);

    // Guard: Check for existing entries to prevent duplicate import
    try {
      const { count } = await supabase.from('takwim_pusat')
        .select('id', { count: 'exact', head: true })
        .eq('sesi', sesi).eq('jenis', 'AKADEMIK');
      if (count && count > 0) {
        const proceed = window.confirm(
          `⚠️ Sudah ada ${count} entri Akademik untuk sesi ${sesi}.\n\nTeruskan akan menambah entri baharu (bukan replace).\nAnda pasti?`
        );
        if (!proceed) { setSaving(false); return; }
      }
    } catch { /* skip guard if check fails */ }
    const payload = selected.map(e => ({
      jenis: e.isCuti ? 'CUTI_UMUM' : 'AKADEMIK' as const,
      tajuk: e.aktiviti,
      catatan: e.catatan || null,
      tarikh_mula: e.tarikhMula,
      tarikh_tamat: e.tarikhTamat,
      bil_minggu: e.bilMinggu,
      aktiviti: e.aktiviti,
      sesi,
      exco_module: 'AKADEMIK',
      created_by: userId,
    }));
    try {
      const { error } = await supabase.from('takwim_pusat').insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} entri Kalendar Akademik berjaya disimpan!`);
      onSuccess();
      onClose();
    } catch (e: any) { toast.error(e.message || 'Gagal simpan.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl rounded-[2rem] p-0 border-none bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-white">
              Auto-Fill Kalendar Akademik {sesi}
            </DialogTitle>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1">
              Institusi B · Semak & edit sebelum simpan · {selected.length}/{sortedRows.length} dipilih
            </p>
          </DialogHeader>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30 w-10">✓</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30">Sesi</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30">Aktiviti</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30">Tarikh Mula</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30">Tarikh Tamat</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30">Minggu</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sortedRows.map(row => (
                  <tr key={row._id} className={`transition-colors ${row._selected ? 'bg-transparent' : 'bg-white/[0.01] opacity-40'}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={row._selected} onChange={() => toggleRow(row._id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/30" />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleSesi(row._id)}
                        title="Klik untuk tukar Sesi"
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all hover:scale-105 cursor-pointer ${
                          row.sesi === 'I' ? 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25' : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                        }`}>
                        {row.sesi}
                      </button>
                    </td>
                    <td className="px-3 py-1.5">
                      <Input value={row.aktiviti} onChange={e => updateRow(row._id, 'aktiviti', e.target.value)}
                        className="h-8 text-[11px] font-bold bg-white/5 border-white/10 text-white rounded-lg" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="date" value={row.tarikhMula} onChange={e => updateRow(row._id, 'tarikhMula', e.target.value)}
                        className="h-8 text-[11px] font-bold bg-white/5 border-white/10 text-white rounded-lg w-[130px]" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="date" value={row.tarikhTamat} onChange={e => updateRow(row._id, 'tarikhTamat', e.target.value)}
                        className="h-8 text-[11px] font-bold bg-white/5 border-white/10 text-white rounded-lg w-[130px]" />
                    </td>
                    <td className="px-3 py-2 text-xs font-black text-white/40 text-center">{row.bilMinggu || '—'}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeRow(row._id)} className="w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Button */}
          <button onClick={addRow}
            className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-white/10 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2">
            <Plus className="w-3 h-3" /> Tambah Baris Baharu
          </button>

          {rows.some(r => r.isCuti && r._selected) && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[10px] font-bold text-amber-400/80">
                Entri bertanda cuti akan disimpan sebagai jenis <strong>CUTI_UMUM</strong>. Yang lain sebagai <strong>AKADEMIK</strong>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="p-5 bg-white/[0.02] border-t border-white/5 gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-xl text-white/50">Batal</Button>
          <Button onClick={handleSave} disabled={saving || selected.length === 0}
            className="flex-[2] h-11 rounded-xl bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest">
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Check className="w-3 h-3 mr-2" />}
            Simpan {selected.length} Entri
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
