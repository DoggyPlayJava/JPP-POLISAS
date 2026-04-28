import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_CLUBS } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DownloadCloud, Plus, Trash2, CalendarDays, Palette, Loader2 } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import TakwimJPPPDFTemplate from '../reports/TakwimJPPPDFTemplate';
import { getContrastColor, formatDateDMY, formatDateRange, DEFAULT_JPP_COLOR } from '@/lib/color-utils';
import { toast } from 'react-hot-toast';

// ── Logo URLs ──
const LOGO_POLISAS_URL = 'https://api.cipher-node.org/storage/v1/object/public/reports/LOGO%20POLISAS.jpeg';
const LOGO_KPT_URL     = 'https://api.cipher-node.org/storage/v1/object/public/reports/Logo%20Kementerian.jpeg';
const LOGO_JPP_URL     = 'https://api.cipher-node.org/storage/v1/object/public/reports/LOGO%20JPP.jpg';

// ── Session options ──
const SESSION_OPTIONS = [
  '2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030',
];

// ── Fetch image as base64 data URL ──
async function toBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Logo fetch failed:', url, e);
    return '';
  }
}

// ══════════════════════════════════════════════════════════════
export default function PemantauanTakwimTab() {
  const { user } = useAuth();

  const [programs, setPrograms]     = useState<any[]>([]);
  const [holidays, setHolidays]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  // Theme
  const [themeColor, setThemeColor] = useState(DEFAULT_JPP_COLOR);
  const [colorInput, setColorInput] = useState(DEFAULT_JPP_COLOR);
  const [savingColor, setSavingColor] = useState(false);

  // Session/year
  const [session, setSession] = useState('2025/2026');

  // Logos (base64)
  const [logoPolisas, setLogoPolisas] = useState('');
  const [logoKpt, setLogoKpt]         = useState('');
  const [logoJpp, setLogoJpp]         = useState('');
  const [logosLoaded, setLogosLoaded] = useState(false);

  // Holiday dialog
  const [holidayDialog, setHolidayDialog] = useState(false);
  const [newName, setNewName]   = useState('');
  const [newDate, setNewDate]   = useState('');
  const [savingH, setSavingH]   = useState(false);

  // ── Load logos ──
  useEffect(() => {
    setLogosLoaded(false);
    Promise.all([toBase64(LOGO_POLISAS_URL), toBase64(LOGO_KPT_URL), toBase64(LOGO_JPP_URL)])
      .then(([p, k, j]) => {
        setLogoPolisas(p);
        setLogoKpt(k);
        setLogoJpp(j);
        setLogosLoaded(true);
      });
  }, []);

  // ── Load DB data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [progRes, holRes, colorRes] = await Promise.all([
        supabase
          .from('programs')
          .select('*')
          .not('status', 'eq', 'DRAFT')
          .order('tarikh_mula', { ascending: true }),
        supabase
          .from('takwim_holidays')
          .select('*')
          .order('tarikh_mula', { ascending: true }),
        supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'jpp_theme_color')
          .single(),
      ]);

      setPrograms(progRes.data || []);
      setHolidays(holRes.data || []);

      if (colorRes.data?.value) {
        let c = colorRes.data.value;
        if (typeof c !== 'string') c = JSON.stringify(c);
        c = c.replace(/^"|"$/g, '');
        if (/^#[0-9A-Fa-f]{6}$/.test(c)) {
          setThemeColor(c);
          setColorInput(c);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Merged & sorted data ──
  const mergedData = React.useMemo(() => {
    const hItems = holidays.map(h => ({ ...h, type: 'holiday' as const, nama_program: h.nama_cuti }));
    const pItems = programs.map(p => ({ ...p, type: 'program' as const }));
    return [...pItems, ...hItems].sort(
      (a, b) => new Date(a.tarikh_mula).getTime() - new Date(b.tarikh_mula).getTime()
    );
  }, [programs, holidays]);

  // ── Save theme color ──
  const handleSaveColor = async () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(colorInput)) {
      toast.error('Format warna tidak sah. Gunakan hex, cth: #6B1D2A');
      return;
    }
    setSavingColor(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: JSON.stringify(colorInput) })
        .eq('key', 'jpp_theme_color');
      if (error) {
        await supabase.from('system_settings').insert({
          key: 'jpp_theme_color',
          value: JSON.stringify(colorInput),
        });
      }
      setThemeColor(colorInput);
      toast.success('Warna rasmi berjaya dikemaskini!');
    } catch {
      toast.error('Gagal menyimpan warna.');
    } finally {
      setSavingColor(false);
    }
  };

  // ── Add holiday ──
  const handleAddHoliday = async () => {
    if (!newName.trim() || !newDate) {
      toast.error('Sila lengkapkan nama cuti dan tarikh.');
      return;
    }
    setSavingH(true);
    try {
      const { error } = await supabase.from('takwim_holidays').insert({
        nama_cuti: newName.trim().toUpperCase(),
        tarikh_mula: newDate,
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success('Cuti ditambah!');
      setHolidayDialog(false);
      setNewName('');
      setNewDate('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menambah cuti.');
    } finally {
      setSavingH(false);
    }
  };

  // ── Delete holiday ──
  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Padam cuti "${name}"?`)) return;
    const { error } = await supabase.from('takwim_holidays').delete().eq('id', id);
    if (error) toast.error('Gagal memadam.');
    else { toast.success('Cuti dipadam.'); loadData(); }
  };

  const textOnTheme = getContrastColor(themeColor);
  const pdfReady = logosLoaded && !loading;

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-bold">Memuat turun data takwim...</p>
      </div>
    );
  }

  let bilCounter = 0;

  return (
    <div className="space-y-8">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-card p-6 rounded-[2rem] border border-border shadow-sm">
        <div>
          <h2 className="text-xl font-black tracking-tighter">Pemantauan Takwim Berpusat</h2>
          <p className="text-sm text-muted-foreground font-medium">
            Jadual perancangan aktiviti keseluruhan. JPP boleh urus cuti umum, warna rasmi dan sesi di sini.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setHolidayDialog(true)}
            variant="outline"
            className="rounded-2xl h-12 px-5 font-black text-xs uppercase tracking-widest border-border"
          >
            <Plus className="w-4 h-4 mr-2" /> Tambah Cuti
          </Button>
          {pdfReady ? (
            <PDFDownloadLink
              document={
                <TakwimJPPPDFTemplate
                  data={mergedData}
                  themeColor={themeColor}
                  session={session}
                  logoPolisas={logoPolisas}
                  logoKpt={logoKpt}
                  logoJpp={logoJpp}
                />
              }
              fileName={`Takwim_Rasmi_JPP_POLISAS_${session.replace('/', '-')}.pdf`}
            >
              {/* @ts-ignore */}
              {({ loading: pdfLoading }) => (
                <Button
                  disabled={pdfLoading}
                  className="rounded-2xl h-12 px-6 font-black tracking-widest uppercase text-xs shadow-lg"
                  style={{ backgroundColor: themeColor, color: textOnTheme }}
                >
                  {pdfLoading
                    ? <span className="animate-pulse">Menjana PDF...</span>
                    : <><DownloadCloud className="w-4 h-4 mr-2" />Muat Turun PDF</>
                  }
                </Button>
              )}
            </PDFDownloadLink>
          ) : (
            <Button disabled className="rounded-2xl h-12 px-6 font-black text-xs opacity-60">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />Memuatkan Logo...
            </Button>
          )}
        </div>
      </div>

      {/* ═══ CONTROL PANEL (Theme + Session) ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Color Picker */}
        <div className="flex items-center gap-4 bg-card p-5 rounded-[2rem] border border-border shadow-sm">
          <Palette className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Warna Rasmi JPP</p>
            <p className="text-[10px] text-muted-foreground">Digunakan pada header jadual, baris cuti & PDF.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="color"
              value={colorInput}
              onChange={e => setColorInput(e.target.value)}
              className="w-11 h-11 rounded-xl border-2 border-border cursor-pointer"
            />
            <div
              className="hidden sm:flex h-11 px-3 rounded-xl items-center font-black text-[10px] uppercase tracking-widest shadow-sm"
              style={{ backgroundColor: colorInput, color: getContrastColor(colorInput) }}
            >
              {colorInput}
            </div>
            <Button
              onClick={handleSaveColor}
              disabled={savingColor || colorInput === themeColor}
              variant="outline"
              size="sm"
              className="rounded-xl h-11 px-4 font-black text-xs"
            >
              {savingColor ? '...' : 'Simpan'}
            </Button>
          </div>
        </div>

        {/* Session Selector */}
        <div className="flex items-center gap-4 bg-card p-5 rounded-[2rem] border border-border shadow-sm">
          <CalendarDays className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sesi Akademik</p>
            <p className="text-[10px] text-muted-foreground">Sesi yang dipaparkan dalam jadual PDF.</p>
          </div>
          <Select value={session} onValueChange={setSession}>
            <SelectTrigger className="w-40 rounded-xl h-11 font-bold text-sm border-border">
              <SelectValue placeholder="Pilih sesi" />
            </SelectTrigger>
            <SelectContent>
              {SESSION_OPTIONS.map(s => (
                <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══ HOLIDAYS ═══ */}
      {holidays.length > 0 && (
        <div className="bg-card p-5 rounded-[2rem] border border-border shadow-sm space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
            <CalendarDays className="w-3.5 h-3.5 inline mr-1.5" />
            Senarai Cuti Umum ({holidays.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {holidays.map(h => (
              <div
                key={h.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shadow-sm"
                style={{ backgroundColor: themeColor + '18', color: themeColor, border: `1px solid ${themeColor}35` }}
              >
                <span className="opacity-70">{formatDateDMY(h.tarikh_mula)}</span>
                <span className="font-black">{h.nama_cuti}</span>
                <button
                  onClick={() => handleDeleteHoliday(h.id, h.nama_cuti)}
                  className="ml-1 hover:opacity-60 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TABLE ═══ */}
      <Card className="rounded-[2rem] border-border shadow-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr style={{ backgroundColor: themeColor }}>
                {[
                  ['text-center', 'Bil'],
                  ['', 'Program'],
                  ['text-center', 'Tarikh Cadangan'],
                  ['text-center', 'Tarikh Pelaksanaan'],
                  ['', 'Pengarah Program'],
                  ['text-center', 'Kelab'],
                  ['text-center', 'Kos (RM)'],
                ].map(([align, label], i, arr) => (
                  <th
                    key={label}
                    className={`px-4 py-4 font-black text-xs uppercase tracking-widest ${align} ${i === 0 ? 'rounded-tl-[2rem]' : ''} ${i === arr.length - 1 ? 'rounded-tr-[2rem]' : ''}`}
                    style={{ color: textOnTheme }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-medium">
              {mergedData.map((item) => {
                const isHoliday = item.type === 'holiday';
                if (isHoliday) {
                  return (
                    <tr key={item.id} style={{ backgroundColor: themeColor }}>
                      <td
                        colSpan={7}
                        className="px-6 py-3 text-center font-black text-xs uppercase tracking-wider"
                        style={{ color: textOnTheme }}
                      >
                        {formatDateDMY(item.tarikh_mula)} &nbsp; {item.nama_cuti || item.nama_program}
                      </td>
                    </tr>
                  );
                }
                bilCounter++;
                const clubName = ALL_CLUBS.find(c => c.id === item.club_id)?.shortName || 'N/A';
                return (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-center font-black text-slate-400">{bilCounter}.</td>
                    <td className="px-4 py-3 font-bold text-foreground uppercase">{item.nama_program}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{formatDateRange(item.tarikh_mula, item.tarikh_tamat)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{formatDateDMY(item.tarikh_mula)}</td>
                    <td className="px-4 py-3 font-bold text-slate-700 uppercase">{item.pengarah_program || 'TBA'}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 border-none px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors">
                        {clubName}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-600">
                      {item.budget ? Math.round(Number(item.budget)) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ═══ ADD HOLIDAY DIALOG ═══ */}
      <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
        <DialogContent className="sm:max-w-[480px] rounded-[2.5rem] p-0 border-none bg-card overflow-hidden">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tighter">Tambah Cuti Umum</DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Cuti akan dipaparkan sebagai baris berwarna dalam jadual dan PDF.
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">
                  Nama Cuti *
                </Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="cth: SAMBUTAN HARI KEMERDEKAAN MALAYSIA"
                  className="rounded-2xl border-none bg-muted/30 h-14 font-bold px-5"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">
                  Tarikh *
                </Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="rounded-2xl border-none bg-muted/30 h-14 font-bold px-5"
                />
              </div>
              {newName && newDate && (
                <div
                  className="rounded-xl p-3 text-center font-black text-xs uppercase tracking-wider"
                  style={{ backgroundColor: themeColor, color: textOnTheme }}
                >
                  {formatDateDMY(newDate)} {newName.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/20 border-t border-border">
            <Button
              onClick={handleAddHoliday}
              disabled={savingH}
              className="w-full rounded-2xl h-14 font-black text-sm uppercase tracking-widest"
              style={{ backgroundColor: themeColor, color: textOnTheme }}
            >
              {savingH ? 'Menambah...' : 'Tambah Cuti'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
