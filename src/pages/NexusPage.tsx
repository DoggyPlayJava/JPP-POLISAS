import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Bot, FileText, MessageSquarePlus, Users, Wand2, Calculator, Save, FileClock, Sparkles, AlertTriangle, X, ImagePlus, Download, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAiSettings } from '@/contexts/AiSettingsContext';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { KertasKerjaRenderer, type KertasKerjaData } from '@/components/ai/KertasKerjaRenderer';
import { MinitMesyuaratRenderer, type MinitMesyuaratData } from '@/components/ai/MinitMesyuaratRenderer';
import { supabase } from '@/lib/supabase';
import { Buffer } from 'buffer';
import { motion, AnimatePresence } from 'framer-motion';

// @ts-ignore - polyfill untuk node js buffer yang diperlukan oleh html-docx-js
if (typeof window !== 'undefined') window.Buffer = Buffer;

function useLocalState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (e) { }
  }, [key, state]);

  return [state, setState] as const;
}

export function NexusPage() {
  const [searchParams] = useSearchParams();
  const { allowAiBudget } = useAiSettings();
  const { callAi, isLoading, retryCount } = useAiAssistant();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'kertas-kerja');
  const [loadingType, setLoadingType] = useState<'kertas-kerja' | 'minit-mesyuarat' | null>(null);

  useEffect(() => {
    if (searchParams.get('req_pro') === 'true' || searchParams.get('tab') === 'langganan') {
      setActiveTab('langganan');
    }
  }, [searchParams]);

  // State Kertas Kerja dengan LocalStorage Caching
  const [kertasKerjaStep, setKertasKerjaStep] = useLocalState('nx_kertasKerjaStep', 1);
  const [jenisProgram, setJenisProgram] = useLocalState<string[]>('nx_jenisProgram', []);
  const [bentukProgram, setBentukProgram] = useLocalState<string[]>('nx_bentukProgram', []);
  const [bentukProgramLain, setBentukProgramLain] = useLocalState('nx_bentukProgramLain', '');
  const [bilanganPegawai, setBilanganPegawai] = useLocalState('nx_bilanganPegawai', '');
  const [tajukProgram, setTajukProgram] = useLocalState('nx_tajukProgram', '');
  const [objektifProgram, setObjektifProgram] = useLocalState('nx_objektifProgram', '');
  const [tarikhProgram, setTarikhProgram] = useLocalState('nx_tarikhProgram', '');
  const [tempatProgram, setTempatProgram] = useLocalState('nx_tempatProgram', '');
  const [sasaranPeserta, setSasaranPeserta] = useLocalState('nx_sasaranPeserta', '');
  const [kelabPenganjur, setKelabPenganjur] = useLocalState('nx_kelabPenganjur', '');
  const [anggaranKos, setAnggaranKos] = useLocalState('nx_anggaranKos', '');
  const [namaPengarah, setNamaPengarah] = useLocalState('nx_namaPengarah', '');
  const [ahliJK, setAhliJK] = useLocalState('nx_ahliJK', '');
  const [konteksTambahan, setKonteksTambahan] = useLocalState('nx_konteksTambahan', '');
  const [hasilKertasKerja, setHasilKertasKerja] = useLocalState<KertasKerjaData | null>('nx_hasilKertasKerja', null);

  const handleResetKertasKerja = () => {
    if (confirm("Adakah anda pasti mahu memadam semua maklumat draf ini dan mula dari awal?")) {
      setKertasKerjaStep(1);
      setJenisProgram([]);
      setBentukProgram([]);
      setBentukProgramLain('');
      setBilanganPegawai('');
      setTajukProgram('');
      setObjektifProgram('');
      setTarikhProgram('');
      setTempatProgram('');
      setSasaranPeserta('');
      setKelabPenganjur('');
      setAnggaranKos('');
      setNamaPengarah('');
      setAhliJK('');
      setKonteksTambahan('');
      setHasilKertasKerja(null);
      toast.success('Borang telah dikosongkan.');
    }
  };

  // Token Economy State
  const [selectedAiModel, setSelectedAiModel] = useLocalState<'flash' | 'pro'>('nx_selectedAiModel', 'flash');
  const [tokenData, setTokenData] = useState<{
    current_balance: number;
    tier: string;
    monthly_allowance: number;
    all_costs: Record<string, number>;
  } | null>(null);

  // Tier Request State
  const { profile } = useAuth();
  const [showTierModal, setShowTierModal] = useState(false);
  const [tierReason, setTierReason] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmittingTier, setIsSubmittingTier] = useState(false);

  useEffect(() => {
    const fetchTokenBalance = async () => {
      const { data, error } = await supabase.rpc('check_ai_tokens');
      if (!error && data) {
        setTokenData(data);
        // Switch to flash automatically if cannot afford pro
        if (data.current_balance < (data.all_costs?.pro_kertas_kerja || 50) && selectedAiModel === 'pro') {
          setSelectedAiModel('flash');
        }
      }
    };
    fetchTokenBalance();
  }, [activeTab, hasilKertasKerja]);

  // State Minit Mesyuarat — cached in localStorage
  const [minitStep, setMinitStep] = useLocalState('nx_minitStep', 1);
  const [tajukMesyuarat, setTajukMesyuarat] = useLocalState('nx_tajukMesyuarat', '');
  const [tarikhMesyuarat, setTarikhMesyuarat] = useLocalState('nx_tarikhMesyuarat', '');
  const [masaMesyuarat, setMasaMesyuarat] = useLocalState('nx_masaMesyuarat', '');
  const [platformMesyuarat, setPlatformMesyuarat] = useLocalState('nx_platformMesyuarat', '');
  const [namaPengerusiMinit, setNamaPengerusiMinit] = useLocalState('nx_namaPengerusiMinit', '');
  const [namaSetiausahaMinit, setNamaSetiausahaMinit] = useLocalState('nx_namaSetiausahaMinit', '');
  const [senaraIHadir, setSenaraIHadir] = useLocalState('nx_senaraIHadir', '');
  const [notaMesyuarat, setNotaMesyuarat] = useLocalState('nx_notaMesyuarat', '');
  const [images, setImages] = useState<any[]>([]); // { file, base64, mimeType }
  const [selectedMinitModel, setSelectedMinitModel] = useLocalState<'flash' | 'pro'>('nx_selectedMinitModel', 'flash');
  const [hasilMinit, setHasilMinit] = useLocalState<MinitMesyuaratData | null>('nx_hasilMinit', null);

  const handleResetMinit = () => {
    if (confirm('Adakah anda pasti mahu memadam semua maklumat draf minit ini dan mula dari awal?')) {
      setMinitStep(1);
      setTajukMesyuarat('');
      setTarikhMesyuarat('');
      setMasaMesyuarat('');
      setPlatformMesyuarat('');
      setNamaPengerusiMinit('');
      setNamaSetiausahaMinit('');
      setSenaraIHadir('');
      setNotaMesyuarat('');
      setImages([]);
      setHasilMinit(null);
      toast.success('Borang minit telah dikosongkan.');
    }
  };

  // Preload logo for DOCX embedding
  const logoBase64Ref = useRef<string>('');
  const isoLogoBase64Ref = useRef<string>('');

  useEffect(() => {
    const loadLogo = async () => {
      for (const path of ['/polisas-logo.png', '/jpp-logo.png']) {
        try {
          const res = await fetch(path);
          if (!res.ok) continue;
          const blob = await res.blob();
          const b64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          logoBase64Ref.current = b64;
          return;
        } catch { /* try next */ }
      }
    };

    const loadIsoLogo = async () => {
      try {
        const res = await fetch('/iso-logos.png');
        if (!res.ok) return;
        const blob = await res.blob();
        const b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        isoLogoBase64Ref.current = b64;
      } catch { /* ignore */ }
    };

    loadLogo();
    loadIsoLogo();
  }, []);

  const handleRequestTier = async () => {
    if (!tierReason.trim()) {
      toast.error('Sila nyatakan sebab untuk memohon Token / PRO Tier.');
      return;
    }
    if (!receiptFile) {
      toast.error('Sila muat naik resit pembayaran anda.');
      return;
    }

    // Check file size (5MB max)
    if (receiptFile.size > 5 * 1024 * 1024) {
      toast.error('Saiz fail terlalu besar. Maksimum 5MB dibenarkan.');
      return;
    }

    setIsSubmittingTier(true);
    const toastId = toast.loading('Memuat naik resit...');
    try {
      // Upload to Supabase Storage
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${profile?.id}/${Date.now()}_receipt.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw new Error('Gagal memuat naik resit: ' + uploadError.message);

      toast.loading('Menghantar permohonan...', { id: toastId });

      const { error } = await supabase.from('ai_tier_requests').insert({
        user_id: profile?.id,
        current_tier: tokenData?.tier || 'free',
        requested_tier: 'pro',
        reason: tierReason || 'Naik Taraf DuitNow',
        receipt_url: uploadData.path
      });
      if (error) throw error;

      // Notify System Admins
      toast.loading('Menghantar notifikasi kepada Admin...', { id: toastId });
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_super_admin', true);
      if (admins && admins.length > 0) {
        const notifications = admins.map(a => ({
          user_id: a.id,
          title: 'INVOIS BAHARU (NEXUS AI)',
          content: `Terdapat resit pembayaran langganan PRO Tier baharu daripada ${profile?.full_name || 'Pelajar'} untuk disemak.`,
          is_read: false
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast.success('Permohonan berjaya dihantar! Admin akan menyemak resit anda.', { id: toastId });
      setShowTierModal(false);
      setTierReason('');
      setReceiptFile(null);
    } catch (e: any) {
      toast.error('Gagal menghantar permohonan: ' + (e.message || 'Ralat sistem'), { id: toastId });
    } finally {
      setIsSubmittingTier(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 3) {
      toast.error("Maksimum 3 keping gambar sahaja dibenarkan serentak.");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, { file, base64: ev.target?.result, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDownloadDocx = async (markdownContent: string, defaultFilename: string) => {
    try {
      const { marked } = await import('marked');
      let htmlContent = await marked.parse(markdownContent);

      // Tukarkan kod tag khas kepada Page Break MS Word secara mutlak
      htmlContent = htmlContent.replace(/<!-- PAGE_BREAK -->/g, "<br clear=all style='mso-special-character:line-break; page-break-before:always'>");

      // Inject Logo before KERTAS KERJA on cover page
      if (logoBase64Ref.current) {
        htmlContent = htmlContent.replace(
          /(<center><b>KERTAS KERJA<\/b><\/center>)/i,
          `<div style="text-align:center;"><img src="${logoBase64Ref.current}" style="width:160px;height:auto;"></div><br><br>\n$1`
        );
      }

      // Inject Approval Box after POLITEKNIK SULTAN HAJI AHMAD SHAH on cover page (first occurrence only)
      const approvalBox = `<br><br>
<table style="border-collapse:collapse;width:100%;font-size:9pt;">
<tr>
<td style="background-color:#4472C4;color:white;font-weight:bold;text-align:center;border:1px solid #333;padding:6px;">OBJEK</td>
<td style="background-color:#4472C4;color:white;font-weight:bold;text-align:center;border:1px solid #333;padding:6px;">OS21</td>
<td style="background-color:#4472C4;color:white;font-weight:bold;text-align:center;border:1px solid #333;padding:6px;">O24</td>
<td style="background-color:#4472C4;color:white;font-weight:bold;text-align:center;border:1px solid #333;padding:6px;">OS26</td>
<td style="background-color:#4472C4;color:white;font-weight:bold;text-align:center;border:1px solid #333;padding:6px;">OS27</td>
<td style="background-color:#4472C4;color:white;font-weight:bold;text-align:center;border:1px solid #333;padding:6px;">OS29</td>
<td style="background-color:#4472C4;color:white;font-weight:bold;text-align:center;border:1px solid #333;padding:6px;">OS29<br>JEEP</td>
<td style="background-color:#4472C4;color:white;font-weight:bold;text-align:center;border:1px solid #333;padding:6px;">OS42</td>
<td style="background-color:#4472C4;color:white;font-weight:bold;text-align:center;border:1px solid #333;padding:6px;">Lain-Lain</td>
</tr>
<tr><td style="background-color:#FFFF00;font-weight:bold;border:1px solid #333;padding:6px;">Tick (&radic;)</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td></tr>
<tr><td style="background-color:#FFFF00;font-weight:bold;border:1px solid #333;padding:8px 6px;">No.<br>Waran</td><td style="border:1px solid #333;padding:8px 6px;">&nbsp;</td><td style="border:1px solid #333;padding:8px 6px;">&nbsp;</td><td style="border:1px solid #333;padding:8px 6px;">&nbsp;</td><td style="border:1px solid #333;padding:8px 6px;">&nbsp;</td><td style="border:1px solid #333;padding:8px 6px;">&nbsp;</td><td style="border:1px solid #333;padding:8px 6px;">&nbsp;</td><td style="border:1px solid #333;padding:8px 6px;">&nbsp;</td><td style="border:1px solid #333;padding:8px 6px;">&nbsp;</td></tr>
<tr><td style="background-color:#FFFF00;font-weight:bold;border:1px solid #333;padding:6px;">WP10.9</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td></tr>
<tr><td style="background-color:#FFFF00;font-weight:bold;border:1px solid #333;padding:6px;">Kelulusan</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td></tr>
<tr><td style="background-color:#FFFF00;font-weight:bold;border:1px solid #333;padding:6px;">T.Tangan<br>Pelulus</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td><td style="border:1px solid #333;padding:6px;">&nbsp;</td></tr>
</table>`;
      htmlContent = htmlContent.replace(
        /POLITEKNIK SULTAN HAJI AHMAD SHAH<\/b><\/center>/i,
        `POLITEKNIK SULTAN HAJI AHMAD SHAH</b></center>${approvalBox}`
      );

      const htmlString = htmlContent;
      const styles = `
      <style>
        @page WordSection1 {
          size: 595.3pt 841.9pt; 
          margin: 72.0pt 72.0pt 72.0pt 72.0pt; 
          mso-header-margin: 35.4pt; 
          mso-footer-margin: 35.4pt; 
          mso-paper-source: 0;
        }
        div.WordSection1 { page: WordSection1; font-family: "Arial", sans-serif; font-size: 11pt; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; vertical-align: top; }
        th { background-color: #f2f2f2; font-weight: bold; }
        p { margin-bottom: 12px; line-height: 1.5; }
        h1, h2, h3, h4 { font-family: "Arial", sans-serif; font-weight: bold; }
        center { text-align: center; }
      </style>
      `;
      const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${defaultFilename}</title>${styles}</head><body><div class="WordSection1">${htmlString}</div></body></html>`;
      const blob = new Blob([docHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${defaultFilename}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dokumen MS Word sedia untuk disunting!");
    } catch (e) {
      toast.error("Gagal menjana DOCX.");
    }
  };

  /** Tukar KertasKerjaData (JSON) → native DOCX → muat turun */
  const handleDownloadKertasKerjaDocx = async (data: KertasKerjaData, filename: string) => {
    console.log('▶️ Memulakan proses muat turun DOCX asli...');
    try {
      const { generateKertasKerjaDocx } = await import('../utils/docxGenerator');

      console.log('🔄 Menjana blob DOCX...');
      const blob = await generateKertasKerjaDocx(data, logoBase64Ref.current, isoLogoBase64Ref.current);

      if (!blob || blob.size === 0) {
        throw new Error("Blob dijana kosong.");
      }

      // Sanitize filename — buang aksara yang tidak selamat
      const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'Kertas_Kerja';
      console.log('🔄 Menyedia muat turun untuk:', safeFilename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Delay revoking URL so that Chrome's async download manager has time to read 
      // the 'download' attribute metadata.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      console.log('✅ Selesai.');
      toast.success('Fail .docx berjaya dimuat turun! Sedia dibuka dalam Microsoft Word.');
    } catch (error) {
      console.error('❌ DOCX Generation Error:', error);
      toast.error(`Gagal: ${error instanceof Error ? error.message : 'Ralat Tidak Diketahui'}`);
    }
  };

  // Jika kill-switch "Enjin AI" (allowAiBudget) dimatikan, sekat akses.
  if (!allowAiBudget) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-24 h-24 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 shadow-xl ring-1 ring-rose-500/20 mb-4 overflow-hidden relative">
          <AlertTriangle className="w-12 h-12 relative z-10" />
          <div className="absolute inset-0 bg-rose-500/20 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black text-rose-500 tracking-tight">AKSES DISEKAT</h1>
        <p className="text-muted-foreground max-w-md">
          Enjin Nexus AI telah dinyahaktifkan oleh Admin JPP. Modul ini tidak tersedia buat masa ini. Hubungi pentadbir sistem untuk maklumat lanjut.
        </p>
        <Button variant="outline" className="mt-4 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => window.history.back()}>
          Kembali ke Halaman Sebelumnya
        </Button>
      </div>
    );
  }

  const handleJanaKertasKerja = async () => {
    if (!tajukProgram || !objektifProgram) {
      toast.error('Sila lengkapkan tajuk dan objektif program sekurang-kurangnya.');
      return;
    }

    setLoadingType('kertas-kerja');
    try {
      const rawResult = await callAi({
        task: 'jana_kertas_kerja' as any,
        data: {
          tajuk: tajukProgram,
          objektif: objektifProgram,
          tarikh: tarikhProgram,
          sasaran: sasaranPeserta,
          tempat: tempatProgram,
          penganjur: kelabPenganjur,
          kos: anggaranKos,
          pengarah: namaPengarah,
          ahliJK: ahliJK.trim() || undefined,
          konteksTambahan: konteksTambahan.trim() || undefined,
          jenisProgram: jenisProgram.join(', '),
          bentukProgram: [
            ...bentukProgram,
            ...(bentukProgramLain.trim() ? [bentukProgramLain.trim()] : [])
          ].join(', '),
          bilanganPegawai: bilanganPegawai,
          selectedModel: selectedAiModel
        }
      });

      if (rawResult) {
        try {
          // Bersihkan output AI — buang markdown code fences jika ada
          const cleaned = rawResult.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
          const parsed: KertasKerjaData = JSON.parse(cleaned);
          setHasilKertasKerja(parsed);
          toast.success('Draf kertas kerja berjaya dijana!');
        } catch {
          toast.error('AI mengembalikan format yang tidak sah. Cuba semula atau gunakan model Pro.');
        }
      }
    } catch (e: any) {
      // Dibendung oleh useAiAssistant, toast akan dikeluarkan di sana
    } finally {
      setLoadingType(null);
    }
  };

  const handleJanaMinit = async () => {
    if (!tajukMesyuarat) {
      toast.error('Sila masukkan tajuk mesyuarat sekurang-kurangnya.');
      return;
    }
    if (!notaMesyuarat && images.length === 0 && !senaraIHadir) {
      toast.error('Sila masukkan nota mesyuarat atau senarai ahli hadir.');
      return;
    }

    setLoadingType('minit-mesyuarat');
    try {
      const rawResult = await callAi({
        task: 'jana_minit_mesyuarat' as any,
        data: {
          tajuk: tajukMesyuarat,
          tarikh: tarikhMesyuarat,
          masa: masaMesyuarat,
          platform: platformMesyuarat,
          namaPengerusi: namaPengerusiMinit,
          namaSetiausaha: namaSetiausahaMinit,
          senaraIHadir: senaraIHadir,
          nota: notaMesyuarat,
          images: images,
          selectedModel: selectedMinitModel
        }
      });

      if (rawResult) {
        try {
          // With responseMimeType: 'application/json', output is already clean JSON.
          // Fallback: strip markdown fences and extract first JSON object just in case.
          let jsonStr = rawResult.trim();
          // Remove markdown code fences if present
          jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
          // If still not starting with {, try to extract the first {...} block
          if (!jsonStr.startsWith('{')) {
            const match = jsonStr.match(/\{[\s\S]*\}/);
            if (match) jsonStr = match[0];
          }
          const parsed: MinitMesyuaratData = JSON.parse(jsonStr);
          setHasilMinit(parsed);
          toast.success('Minit mesyuarat rasmi berjaya dijana!');
        } catch {
          toast.error('AI mengembalikan format yang tidak sah. Cuba semula atau tukar ke model Pro.');
          console.error('Minit JSON parse failed. Raw output:', rawResult.slice(0, 500));
        }
      }

    } catch (e: any) {
      //
    } finally {
      setLoadingType(null);
    }
  };

  const handleDownloadMinitDocx = async (data: MinitMesyuaratData) => {
    try {
      const { generateMinitMesyuaratDocx } = await import('../utils/docxGenerator');
      const blob = await generateMinitMesyuaratDocx(data);
      if (!blob || blob.size === 0) throw new Error('Blob dijana kosong.');
      const safeFilename = (data.tajuk_mesyuarat || 'Minit_Mesyuarat').replace(/[/\\?%*:|"<>]/g, '-').trim();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Fail .docx Minit Mesyuarat berjaya dimuat turun!');
    } catch (error) {
      console.error('Minit DOCX Error:', error);
      toast.error(`Gagal jana DOCX: ${error instanceof Error ? error.message : 'Ralat tidak diketahui'}`);
    }
  };

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative">
        <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-shrink-0 items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] ring-1 ring-white/10">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground">Nexus AI Hub</h1>
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-black tracking-widest text-[10px] uppercase">BETA</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium max-w-lg leading-relaxed">
              Pusat penjanaan dokumen pintar. Hasilkan kertas kerja dan minit mesyuarat rasmi dengan pantas menggunakan enjin Nexus AI.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs UI */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1.5 mb-6 bg-slate-100/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm rounded-2xl border border-slate-200/60 dark:border-border/50 flex-col sm:flex-row overflow-x-auto">
          <TabsTrigger value="kertas-kerja" className="flex-1 sm:flex-none justify-start sm:justify-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-indigo-400">
            <FileText className="w-4 h-4" />
            <span className="font-bold">Penjana Kertas Kerja</span>
          </TabsTrigger>
          <TabsTrigger value="minit-mesyuarat" className="flex-1 sm:flex-none justify-start sm:justify-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-emerald-400">
            <Users className="w-4 h-4" />
            <span className="font-bold">Minit Mesyuarat</span>
          </TabsTrigger>
          <TabsTrigger value="langganan" className="flex-1 sm:flex-none justify-start sm:justify-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-amber-500">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold">Langganan & Token</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Penjana Kertas Kerja */}
        <TabsContent value="kertas-kerja" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            <div className="lg:col-span-5 space-y-6">
              <Card className="border-slate-200/60 dark:border-border/50 shadow-xl overflow-hidden bg-white dark:bg-[#121214] transition-all relative">
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />

                {/* Header & Reset Button */}
                <div className="px-6 pt-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Isi Borang</span>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2" onClick={handleResetKertasKerja}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Mula Semula
                  </Button>
                </div>

                {/* Progress Indicator */}
                <div className="px-6 pt-3 pb-2">
                  <div className="flex items-center justify-between">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex flex-col items-center flex-1 relative">
                        <button
                          type="button"
                          onClick={() => setKertasKerjaStep(step)}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all duration-300 hover:scale-110",
                            kertasKerjaStep >= step
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                              : "bg-slate-100 dark:bg-muted text-muted-foreground hover:bg-slate-200 dark:hover:bg-muted/80 cursor-pointer"
                          )}
                        >
                          {step}
                        </button>
                        {step < 3 && (
                          <div className={cn(
                            "absolute top-4 left-[50%] right-[-50%] h-[2px] -z-0 transition-colors duration-300",
                            kertasKerjaStep > step ? "bg-indigo-600" : "bg-slate-200 dark:bg-muted"
                          )} />
                        )}
                        <span className={cn(
                          "uppercase tracking-widest text-[8px] font-bold mt-2 text-center",
                          kertasKerjaStep >= step ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"
                        )}>
                          {step === 1 ? 'Tajuk & Konsep' : step === 2 ? 'Logistik' : 'Pengurusan'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-2">
                  <div className="h-[1px] w-full bg-border/40" />
                </div>

                <CardContent className="space-y-4 pt-2">
                  {kertasKerjaStep === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-indigo-500/90 dark:text-indigo-400">Tajuk Program</Label>
                        <Input
                          placeholder="Cth: Karnival Kerjaya & Keusahawanan 2026"
                          value={tajukProgram}
                          onChange={(e) => setTajukProgram(e.target.value)}
                          className="bg-slate-50 dark:bg-[#0A0A0B]/50 border-slate-200 dark:border-border/60 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Jenis Program (Boleh pilih lebih dari satu)</Label>
                          <div className="flex flex-wrap gap-2">
                            {["Sukan", "Kerohanian", "Kemahiran Teknikal", "Kebudayaan & Kesenian", "Badan Beruniform", "Perpaduan", "Psikologi", "Kepimpinan", "Komunikasi & Bahasa", "Keusahawanan", "Kesukarelawanan", "Kesihatan"].map(opt => {
                              const isSelected = jenisProgram.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setJenisProgram(prev => isSelected ? prev.filter(x => x !== opt) : [...prev, opt])}
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-full border transition-all",
                                    isSelected ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_2px_10px_rgba(79,70,229,0.3)]" : "bg-white dark:bg-[#121214] text-muted-foreground border-slate-200 dark:border-border hover:border-indigo-400 hover:text-indigo-500"
                                  )}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bentuk Program (Boleh pilih lebih dari satu)</Label>
                          <div className="flex flex-wrap gap-2">
                            {["Bengkel", "Ceramah", "Seminar", "Pertandingan", "Pertandingan E-Sports", "Lawatan Sambil Belajar", "Karnival", "Kem / Perkhemahan"].map(opt => {
                              const isSelected = bentukProgram.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setBentukProgram(prev => isSelected ? prev.filter(x => x !== opt) : [...prev, opt])}
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-full border transition-all",
                                    isSelected ? "bg-emerald-600 text-white border-emerald-600 shadow-[0_2px_10px_rgba(16,185,129,0.3)]" : "bg-white dark:bg-[#121214] text-muted-foreground border-slate-200 dark:border-border hover:border-emerald-400 hover:text-emerald-500"
                                  )}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          <div className="pt-2">
                            <Input
                              placeholder="Lain-lain (Sila nyatakan...)"
                              value={bentukProgramLain}
                              onChange={(e) => setBentukProgramLain(e.target.value)}
                              className="bg-muted/40 dark:bg-background/40 h-10 text-xs focus:ring-2 focus:ring-emerald-500/20 border-border/50"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-indigo-500/90 dark:text-indigo-400">Objektif Utama</Label>
                        <Textarea
                          placeholder="Nyatakan dengan jelas 2-3 objektif program ini dianjurkan..."
                          className="min-h-[100px] resize-none bg-background/80 border-border/60 focus:ring-2 focus:ring-indigo-500/20"
                          value={objektifProgram}
                          onChange={(e) => setObjektifProgram(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {kertasKerjaStep === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/90 dark:text-indigo-400">Penganjur Utama / Rakan Kerjasama</Label>
                        <Input
                          placeholder="Cth: Kelab IT bersama JHEP POLISAS"
                          value={kelabPenganjur}
                          onChange={(e) => setKelabPenganjur(e.target.value)}
                          className="bg-muted/40 dark:bg-background/40 border-border/50 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tarikh / Tempoh</Label>
                          <Input
                            placeholder="Cth: 15-18 Mei 2026"
                            value={tarikhProgram}
                            onChange={(e) => setTarikhProgram(e.target.value)}
                            className="bg-muted/40 dark:bg-background/40 h-10 text-sm border-border/50 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tempat / Platform</Label>
                          <Input
                            placeholder="Cth: Dewan Jubli Perak"
                            value={tempatProgram}
                            onChange={(e) => setTempatProgram(e.target.value)}
                            className="bg-muted/40 dark:bg-background/40 h-10 text-sm border-border/50 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bilangan Peserta</Label>
                          <Input
                            placeholder="Cth: 200"
                            type="number"
                            value={sasaranPeserta}
                            onChange={(e) => setSasaranPeserta(e.target.value)}
                            className="bg-muted/40 dark:bg-background/40 h-10 text-sm border-border/50 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bil. Pegawai / AJK</Label>
                          <Input
                            placeholder="Cth: 5"
                            type="number"
                            value={bilanganPegawai}
                            onChange={(e) => setBilanganPegawai(e.target.value)}
                            className="bg-muted/40 dark:bg-background/40 h-10 text-sm border-border/50 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {kertasKerjaStep === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-indigo-500/90 dark:text-indigo-400">Jumlah Anggaran Kos (RM)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">RM</span>
                          <Input
                            placeholder="Cth: 1500"
                            type="number"
                            value={anggaranKos}
                            onChange={(e) => setAnggaranKos(e.target.value)}
                            className="bg-muted/40 dark:bg-background/40 border-border/50 pl-10 text-lg font-bold focus:ring-2 focus:ring-indigo-500/20 py-6"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-indigo-500/90 dark:text-indigo-400">Nama Penuh Pengarah Program</Label>
                        <Input
                          placeholder="Cth: Muhamad Amirul Hakimi Bin Mohd Zawawi"
                          value={namaPengarah}
                          onChange={(e) => setNamaPengarah(e.target.value)}
                          className="bg-muted/40 dark:bg-background/40 border-border/50 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nama Ahli Jawatankuasa <span className="normal-case text-[10px] font-normal bg-slate-100 dark:bg-secondary px-2 py-0.5 rounded-full ml-1">Optional</span></Label>
                        <Textarea
                          placeholder="Cth: Ahmad (Setiausaha), Siti (Bendahari), Rizal (JK Logistik)..."
                          value={ahliJK}
                          onChange={(e) => setAhliJK(e.target.value)}
                          className="min-h-[70px] resize-none bg-slate-50 dark:bg-[#0A0A0B]/50 border-slate-200 dark:border-border/60 focus:ring-2 focus:ring-indigo-500/20 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">Jika dikosongkan, AI akan menggunakan placeholder "(NAMA)" dalam carta organisasi.</p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <Label className="text-xs font-bold uppercase tracking-widest text-indigo-500/90 dark:text-indigo-400 flex items-center gap-2">
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                          Maklumat Tambahan / Konteks Khas
                          <span className="normal-case text-[10px] font-normal bg-slate-100 dark:bg-secondary px-2 py-0.5 rounded-full">Optional</span>
                        </Label>
                        <Textarea
                          placeholder={"Beritahu AI apa yang perlu diambil kira:\n• Cth: Program ini ada perarakan, jadi perlu ada JK Kawalan Lalulintas\n• Cth: Tiada sesi makan minum disediakan oleh penganjur\n• Cth: Peserta perlu bawa alat sendiri, sesi outdoor\n• Cth: Ada sesi bersenam, jadi slot rehat lebih panjang"}
                          value={konteksTambahan}
                          onChange={(e) => setKonteksTambahan(e.target.value)}
                          className="min-h-[110px] resize-none bg-violet-50/50 dark:bg-violet-500/5 border-violet-200 dark:border-violet-500/20 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors"
                        />
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                          💡 Semakin terperinci konteks anda, semakin tepat draf yang akan dijana oleh AI. Gunakan ruangan ini untuk menyatakan keperluan khas program yang tidak ada dalam borang di atas.
                        </p>
                      </div>


                      <div className="pt-4 border-t border-slate-200 dark:border-border/60">
                        <Label className="text-xs font-bold uppercase tracking-widest text-indigo-500/90 dark:text-indigo-400 mb-3 block">Pilihan Kecerdasan AI</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              const flashCost = tokenData?.all_costs?.flash_kertas_kerja || 0;
                              if (tokenData && tokenData.current_balance < flashCost) {
                                toast.error(`Maaf, baki Token Nexus tidak mencukupi. Kos: ${flashCost} Token.`);
                                return;
                              }
                              setSelectedAiModel('flash');
                            }}
                            className={cn(
                              "text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden",
                              selectedAiModel === 'flash'
                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-sm"
                                : (!tokenData || tokenData.current_balance < (tokenData.all_costs?.flash_kertas_kerja || 0)) ? "border-slate-200 dark:border-border/60 opacity-60 cursor-not-allowed" : "border-slate-200 dark:border-border/60 hover:border-indigo-300 dark:hover:border-indigo-500/50"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className={cn("p-2 rounded-lg shrink-0 h-min", selectedAiModel === 'flash' ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-sm text-foreground">Nexus Flash</h4>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Kepantasan janaan draf. Keseimbangan prestasi kualiti.</p>
                                {tokenData && (
                                  <div className="mt-2 text-[11px] font-medium flex items-center justify-between">
                                    <span className={tokenData.current_balance < (tokenData.all_costs?.flash_kertas_kerja || 0) ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}>
                                      Baki: {tokenData.current_balance} Token
                                    </span>
                                    <span className="text-muted-foreground flex gap-1 items-center bg-slate-100 dark:bg-[#0A0A0B] px-2 py-0.5 rounded-full shadow-sm"><Calculator className="w-3" /> Kos: {tokenData.all_costs?.flash_kertas_kerja || 0}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {selectedAiModel === 'flash' && <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full -z-10" />}
                          </button>

                          <button
                            onClick={() => {
                              const proCost = tokenData?.all_costs?.pro_kertas_kerja || 0;
                              if (tokenData && tokenData.current_balance < proCost) {
                                toast.error(`Maaf, baki Token Nexus tidak mencukupi untuk Pelan Pro. Kos: ${proCost} Token.`);
                                return;
                              }
                              setSelectedAiModel('pro');
                            }}
                            className={cn(
                              "text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden group",
                              selectedAiModel === 'pro'
                                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-500/10 shadow-sm"
                                : (!tokenData || tokenData.current_balance < (tokenData.all_costs?.pro_kertas_kerja || 0)) ? "border-slate-200 dark:border-border/60 opacity-60 cursor-not-allowed" : "border-slate-200 dark:border-border/60 hover:border-amber-300 dark:hover:border-amber-500/50"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className={cn("p-2 rounded-lg shrink-0 h-min", selectedAiModel === 'pro' ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                                <Wand2 className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1">Nexus Pro <Badge variant="outline" className="text-[9px] border-amber-200 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 px-1 py-0 h-4">TERBAIK</Badge></h4>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Penaakulan tinggi. Jadual & Format 100% sempurna.</p>
                                {tokenData && (
                                  <div className="mt-2 text-[11px] font-medium flex items-center justify-between">
                                    <span className={tokenData.current_balance < (tokenData.all_costs?.pro_kertas_kerja || 0) ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}>
                                      Baki: {tokenData.current_balance} Token
                                    </span>
                                    <span className="text-amber-600 dark:text-amber-400 flex gap-1 items-center bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 border border-amber-200/50 dark:border-amber-500/20 rounded-full shadow-sm"><Calculator className="w-3" /> Kos: {tokenData.all_costs?.pro_kertas_kerja || 0}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {selectedAiModel === 'pro' && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full -z-10" />}
                          </button>
                        </div>
                        <div className="mt-4 flex items-center justify-center p-3 rounded-xl bg-slate-100/50 dark:bg-[#121214] border border-slate-200/50 dark:border-border/50 transition-all hover:bg-slate-100 dark:hover:bg-[#1A1A1D]">
                          <span className="text-xs font-semibold text-muted-foreground mr-2">Token semakin kurang atau perlukan hasil bertaraf Pro?</span>
                          <Button variant="link" size="sm" className="font-bold text-indigo-600 dark:text-indigo-400 p-0 h-auto" onClick={() => setShowTierModal(true)}>
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Mohon Token Tambahan
                          </Button>
                        </div>
                      </div>

                    </div>
                  )}
                </CardContent>

                <CardFooter className="bg-secondary/30 pt-4 flex gap-3 border-t border-slate-200/50 dark:border-border/50">
                  {kertasKerjaStep > 1 && (
                    <Button
                      variant="outline"
                      className="border-slate-200 dark:border-border/60 hover:bg-slate-100 dark:hover:bg-muted font-bold"
                      onClick={() => setKertasKerjaStep(prev => prev - 1)}
                    >
                      Kembali
                    </Button>
                  )}

                  {kertasKerjaStep < 3 ? (
                    <Button
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                      onClick={() => setKertasKerjaStep(prev => prev + 1)}
                      disabled={
                        (kertasKerjaStep === 1 && (!tajukProgram || jenisProgram.length === 0 || (bentukProgram.length === 0 && !bentukProgramLain.trim()) || !objektifProgram)) ||
                        (kertasKerjaStep === 2 && (!kelabPenganjur || !tarikhProgram || !tempatProgram || !sasaranPeserta || !bilanganPegawai))
                      }
                    >
                      Seterusnya
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] group"
                      onClick={handleJanaKertasKerja}
                      disabled={isLoading || !anggaranKos || !namaPengarah}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4 animate-spin" /> Menjana Draf...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Jana Kertas Kerja
                        </span>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>

            <div className="lg:col-span-7">
              <Card className="h-full min-h-[500px] flex flex-col border-border/40 shadow-2xl overflow-hidden bg-card/50 dark:bg-muted/5 backdrop-blur-md">
                <div className="bg-white/80 dark:bg-muted/30 p-4 border-b border-slate-200/60 dark:border-border/50 flex items-center justify-between backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold tracking-tight text-foreground/80">Dokumen Draf</span>
                  </div>
                  {hasilKertasKerja && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20" onClick={() => handleDownloadKertasKerjaDocx(hasilKertasKerja, hasilKertasKerja?.halaman_muka?.tajuk_program || tajukProgram || 'Kertas_Kerja')}>
                        <Download className="w-3.5 h-3.5" /> Muat Turun DOCX
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2" onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(hasilKertasKerja, null, 2));
                        toast.success('Data JSON disalin!');
                      }}>
                        <Save className="w-3.5 h-3.5" /> Salin JSON
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto max-h-[750px] relative bg-slate-100/30 dark:bg-transparent/20 custom-scrollbar">
                  <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 dark:opacity-10 bg-[length:24px_24px] pointer-events-none" />
                  <div className="relative p-4 sm:p-8 flex justify-center w-full">
                    <div className="w-full max-w-3xl bg-white dark:bg-[#121214] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200/60 dark:border-border/40 rounded-[2rem] p-8 sm:p-12 pb-10 sm:pb-12 prose dark:prose-invert prose-indigo prose-sm sm:prose-base transition-all duration-500 scale-[0.99] hover:scale-100">
                      {loadingType === 'kertas-kerja' ? (
                        <AiLoadingView type="kertas-kerja" retryCount={retryCount} />
                      ) : hasilKertasKerja ? (
                        <>
                          <div className="mb-8 p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="text-sm leading-relaxed">
                              <p className="font-bold text-base mb-1">Perhatian: Modul Kecerdasan Buatan (Draf)</p>
                              Dokumen ini merupakan draf janaan AI. Anda <strong>DIWAJIBKAN</strong> menyemak dan mengubah suai sebelum pengesahan rasmi.
                            </div>
                          </div>
                          <KertasKerjaRenderer data={hasilKertasKerja} />
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 space-y-4 pt-10 pb-10">
                          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-secondary/30 flex items-center justify-center border border-slate-200/60 dark:border-border/20 shadow-inner">
                            <Wand2 className="w-10 h-10 opacity-20 text-indigo-500" />
                          </div>
                          <p className="text-sm font-medium">Borang belum diisi. Draf akan dipaparkan di sini.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        </TabsContent>

        {/* Tab Penjana Minit Mesyuarat */}
        <TabsContent value="minit-mesyuarat" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ── LEFT: FORM ── */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-slate-200/60 dark:border-border/50 shadow-xl overflow-hidden bg-white dark:bg-[#121214]">
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />

                {/* Header + Reset */}
                <div className="px-6 pt-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Isi Borang</span>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2" onClick={handleResetMinit}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Mula Semula
                  </Button>
                </div>

                {/* 2-step progress */}
                <div className="px-6 pt-3 pb-2">
                  <div className="flex items-center justify-between">
                    {[1, 2].map((step) => (
                      <div key={step} className="flex flex-col items-center flex-1 relative">
                        <button
                          type="button"
                          onClick={() => setMinitStep(step)}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all duration-300 hover:scale-110",
                            minitStep >= step
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                              : "bg-slate-100 dark:bg-muted text-muted-foreground hover:bg-slate-200 dark:hover:bg-muted/80"
                          )}
                        >
                          {step}
                        </button>
                        {step < 2 && (
                          <div className={cn(
                            "absolute top-4 left-[50%] right-[-50%] h-[2px] -z-0 transition-colors duration-300",
                            minitStep > step ? "bg-emerald-600" : "bg-slate-200 dark:bg-muted"
                          )} />
                        )}
                        <span className={cn(
                          "uppercase tracking-widest text-[8px] font-bold mt-2 text-center",
                          minitStep >= step ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}>
                          {step === 1 ? 'Maklumat Asas' : 'Nota & Hadir'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-2"><div className="h-[1px] w-full bg-border/40" /></div>

                <CardContent className="space-y-4 pt-2">

                  {/* STEP 1: Basic Info */}
                  {minitStep === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600/90 dark:text-emerald-400">Tajuk Rasmi Mesyuarat</Label>
                        <Input
                          placeholder="Cth: MESYUARAT KHAS KALI KE-1 KELAB DAN PERSATUAN"
                          value={tajukMesyuarat}
                          onChange={(e) => setTajukMesyuarat(e.target.value)}
                          className="bg-slate-50 dark:bg-[#0A0A0B]/50 border-slate-200 dark:border-border/60 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tarikh</Label>
                          <Input
                            placeholder="Cth: 08/04/2026"
                            value={tarikhMesyuarat}
                            onChange={(e) => setTarikhMesyuarat(e.target.value)}
                            className="bg-muted/40 dark:bg-background/40 h-10 text-sm border-border/50 focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Masa</Label>
                          <Input
                            placeholder="Cth: 05.15 Petang"
                            value={masaMesyuarat}
                            onChange={(e) => setMasaMesyuarat(e.target.value)}
                            className="bg-muted/40 dark:bg-background/40 h-10 text-sm border-border/50 focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Platform / Tempat</Label>
                        <Input
                          placeholder="Cth: Student Centre / Google Meet"
                          value={platformMesyuarat}
                          onChange={(e) => setPlatformMesyuarat(e.target.value)}
                          className="bg-muted/40 dark:bg-background/40 h-10 text-sm border-border/50 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/90 dark:text-emerald-400">Nama Pengerusi / YDP</Label>
                        <Input
                          placeholder="Cth: MUHAMAD AMIRUL HAKIMI BIN MOHD ZAWAWI"
                          value={namaPengerusiMinit}
                          onChange={(e) => setNamaPengerusiMinit(e.target.value)}
                          className="bg-muted/40 dark:bg-background/40 h-10 text-sm border-border/50 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/90 dark:text-emerald-400">Nama Setiausaha</Label>
                        <Input
                          placeholder="Cth: NUR SYUHADA BINTI SAIFULIZAM"
                          value={namaSetiausahaMinit}
                          onChange={(e) => setNamaSetiausahaMinit(e.target.value)}
                          className="bg-muted/40 dark:bg-background/40 h-10 text-sm border-border/50 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Notes + Attendance */}
                  {minitStep === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600/90 dark:text-emerald-400">Senarai Ahli Hadir</Label>
                        <Textarea
                          placeholder={"Tampal atau taip nama ahli hadir, satu nama setiap baris:\n1. MUHAMMAD SAIFUL BAHARI BIN OSMAN\n2. ARISSA DAMIA BINTI HASBULLAH\n...\n\nAtau masukkan bilangan sahaja (cth: 30 orang) jika nama tidak tersedia."}
                          className="min-h-[130px] resize-none bg-slate-50 dark:bg-[#0A0A0B]/50 border-slate-200 dark:border-border/60 focus:ring-2 focus:ring-emerald-500/20 text-sm"
                          value={senaraIHadir}
                          onChange={(e) => setSenaraIHadir(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600/90 dark:text-emerald-400">Nota / Perkara Dibincangkan</Label>
                        <Textarea
                          placeholder="Tampal nota kasar mesyuarat dari WhatsApp/catatan:\n- bincang sistem digital Portal JPP\n- YDP terang faedah sistem kepada kelab\n- persetujuan semua untuk lancar semester hadapan"
                          className="min-h-[120px] resize-none bg-slate-50 dark:bg-[#0A0A0B]/50 border-slate-200 dark:border-border/60 focus:ring-2 focus:ring-emerald-500/20 text-sm"
                          value={notaMesyuarat}
                          onChange={(e) => setNotaMesyuarat(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 border-t border-border/40 pt-3">
                        <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600/90 dark:text-emerald-400 flex items-center justify-between">
                          Gambar Papan Putih / Catatan
                          <span className="text-[10px] bg-secondary px-2 rounded-full font-medium">{images.length}/3</span>
                        </Label>
                        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-border/60 hover:border-emerald-500/50 hover:bg-emerald-500/5 bg-background/50 rounded-xl cursor-pointer transition-all">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <ImagePlus className="w-4 h-4" />
                            <span className="text-sm font-medium">Muat naik gambar (.jpg/.png)</span>
                          </div>
                          <input type="file" disabled={images.length >= 3} className="hidden" accept="image/jpeg, image/png, image/webp" multiple onChange={handleImageUpload} />
                        </label>
                        {images.length > 0 && (
                          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                            {images.map((img, idx) => (
                              <div key={idx} className="relative w-14 h-14 rounded-md border overflow-hidden flex-shrink-0 group">
                                <img src={img.base64} alt="preview" className="w-full h-full object-cover" />
                                <button onClick={() => removeImage(idx)} className="absolute bg-background/80 backdrop-blur-sm inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="w-4 h-4 text-rose-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Model Selector */}
                      <div className="pt-2 border-t border-slate-200 dark:border-border/60">
                        <Label className="text-xs font-bold uppercase tracking-widest text-emerald-600/90 dark:text-emerald-400 mb-3 block">Pilihan Kecerdasan AI</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {(['flash', 'pro'] as const).map((model) => {
                            const costKey = model === 'flash' ? 'flash_minit_mesyuarat' : 'pro_minit_mesyuarat';
                            const cost = tokenData?.all_costs?.[costKey] || (model === 'flash' ? 80 : 100);
                            const canAfford = !tokenData || tokenData.current_balance >= cost;
                            const isSelected = selectedMinitModel === model;
                            return (
                              <button
                                key={model}
                                onClick={() => {
                                  if (!canAfford) { toast.error(`Baki token tidak mencukupi. Kos: ${cost} Token.`); return; }
                                  setSelectedMinitModel(model);
                                }}
                                className={cn(
                                  "text-left p-3 rounded-xl border-2 transition-all relative overflow-hidden",
                                  isSelected
                                    ? model === 'flash' ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-sm" : "border-amber-500 bg-amber-50/50 dark:bg-amber-500/10 shadow-sm"
                                    : !canAfford ? "border-slate-200 dark:border-border/60 opacity-60 cursor-not-allowed" : "border-slate-200 dark:border-border/60 hover:border-emerald-300"
                                )}
                              >
                                <div className={cn("text-[10px] font-black uppercase tracking-wider mb-0.5", isSelected ? (model === 'flash' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400') : 'text-muted-foreground')}>
                                  {model === 'flash' ? '⚡ Nexus Flash' : '✨ Nexus Pro'}
                                </div>
                                <div className="text-[9px] text-muted-foreground">{model === 'flash' ? 'Pantas & Jimat' : 'Kualiti Tinggi'}</div>
                                {tokenData && (
                                  <div className={cn("text-[9px] font-bold mt-1", canAfford ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')}>
                                    Kos: {cost} Token
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="bg-secondary/30 pt-4 flex gap-2">
                  {minitStep === 1 ? (
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 transition-all"
                      onClick={() => {
                        if (!tajukMesyuarat) { toast.error('Sila masukkan tajuk mesyuarat.'); return; }
                        setMinitStep(2);
                      }}
                    >
                      Seterusnya →
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" className="h-11" onClick={() => setMinitStep(1)}>← Kembali</Button>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)] group"
                        onClick={handleJanaMinit}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2"><Wand2 className="w-4 h-4 animate-spin" /> Menjana...</span>
                        ) : (
                          <span className="flex items-center gap-2"><FileClock className="w-4 h-4 group-hover:-rotate-12 transition-transform" /> Jana Minit Rasmi</span>
                        )}
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            </div>

            {/* ── RIGHT: LIVE PREVIEW ── */}
            <div className="lg:col-span-7">
              <Card className="h-full min-h-[500px] flex flex-col border-border/40 shadow-2xl overflow-hidden bg-card/50 dark:bg-muted/5 backdrop-blur-md">
                <div className="bg-white/80 dark:bg-muted/30 p-4 border-b border-slate-200/60 dark:border-border/50 flex items-center justify-between backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold tracking-tight text-foreground/80">Preview Minit Rasmi</span>
                  </div>
                  {hasilMinit && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-xs font-bold gap-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        onClick={() => handleDownloadMinitDocx(hasilMinit)}
                      >
                        <Download className="w-3.5 h-3.5" /> Muat Turun DOCX
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-xs font-bold gap-2 text-rose-500 border-rose-500/20 hover:bg-rose-500/10"
                        onClick={() => { if (confirm('Padam hasil minit ini?')) setHasilMinit(null); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto max-h-[780px] relative bg-slate-100/30 dark:bg-transparent/20 custom-scrollbar">
                  <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 dark:opacity-10 bg-[length:24px_24px] pointer-events-none" />
                  <div className="relative p-4 sm:p-8 flex justify-center w-full">
                    <div className="w-full max-w-3xl bg-card shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-border/50 rounded-2xl p-8 sm:p-10 transition-all duration-500">
                      {loadingType === 'minit-mesyuarat' ? (
                        <AiLoadingView type="minit-mesyuarat" retryCount={retryCount} />
                      ) : hasilMinit ? (
                        <>
                          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed">
                              <span className="font-bold">Draf AI — semak sebelum guna rasmi.</span> Pastikan semua fakta mesyuarat adalah tepat.
                            </div>
                          </div>
                          <MinitMesyuaratRenderer data={hasilMinit} />
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 space-y-4 py-16">
                          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-secondary/30 flex items-center justify-center border border-slate-200/60 shadow-inner">
                            <FileClock className="w-10 h-10 opacity-20 text-emerald-500" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">Preview minit rasmi akan muncul di sini</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Isi borang dan klik 'Jana Minit Rasmi'</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab Langganan & Token AI */}
        <TabsContent value="langganan" className="space-y-10 focus-visible:outline-none outline-none border-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Section: Dashboard & Status */}
            <div className="lg:col-span-5 space-y-8">
              <Card className="border-indigo-500/10 shadow-2xl overflow-hidden bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl relative">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <CardHeader className="p-8 pb-4 relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-black tracking-widest text-[10px] py-1 px-3">
                      STATUS AKAUN
                    </Badge>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tight">Profil Langganan</CardTitle>
                  <CardDescription className="text-base">Pantau penggunaan Nexus AI anda secara masa nyata.</CardDescription>
                </CardHeader>

                <CardContent className="p-8 pt-0 space-y-8 relative z-10">
                  {/* Token Status Display */}
                  <div className="group relative">
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-purple-700 shadow-xl shadow-indigo-500/20 transition-all duration-500 group-hover:scale-[1.02] overflow-hidden">
                      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 mix-blend-overlay" />
                      <div className="relative z-10 flex flex-col items-center text-center text-white">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/70 mb-2">Baki Token Semasa</span>
                        <div className="flex items-baseline gap-3 mb-6">
                          <motion.span
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            className="text-7xl font-black drop-shadow-lg"
                          >
                            {tokenData?.current_balance || 0}
                          </motion.span>
                          <span className="text-lg font-bold text-white/50 tracking-tighter">tkns</span>
                        </div>

                        <div className="w-full bg-white/10 rounded-full h-3 mb-3 p-0.5 border border-white/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(((tokenData?.current_balance || 0) / (tokenData?.monthly_allowance || 100)) * 100, 100)}%` }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="bg-white h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                          />
                        </div>

                        <div className="flex items-center gap-2 text-sm font-bold text-white/80">
                          <Calculator className="w-4 h-4" />
                          <span>{tokenData?.monthly_allowance || 0} Peruntukan Bulanan</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tier Badge Row */}
                  <div className="flex flex-wrap gap-4 items-center justify-between p-5 rounded-2xl bg-secondary/30 border border-border/40 backdrop-blur-sm">
                    <span className="text-sm font-bold text-muted-foreground mr-auto text-dark">Tahap Akses</span>
                    <Badge className={cn(
                      "font-black tracking-widest text-[11px] px-4 py-1.5 rounded-full border-none shadow-lg",
                      tokenData?.tier === 'pro'
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/30"
                        : tokenData?.tier === 'admin'
                          ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-indigo-500/30"
                          : "bg-muted dark:bg-muted/30 text-muted-foreground border border-border/20"
                    )}>
                      {tokenData?.tier === 'pro' ? 'PRO TIER' : tokenData?.tier === 'admin' ? 'ADMIN TIER' : 'FREE TIER'}
                    </Badge>
                  </div>

                  {/* Benefit Cards Grid */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Manfaat PRO Eksklusif
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { icon: Bot, title: "Model AI Pro (Nexus-4o Pro)", desc: "Penaakulan lebih mendalam & tepat." },
                        { icon: FileText, title: "1,000+ Permata Token", desc: "Kapasiti janaan 5x ganda lebih luas." },
                        { icon: Wand2, title: "Format Menepati Standard", desc: "Struktur dokumen rasmi tanpa ralat." }
                      ].map((item, i) => (
                        <div key={i} className="group p-4 rounded-xl border border-border/50 hover:border-indigo-500/30 bg-background/40 hover:bg-indigo-500/5 transition-all duration-300 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted/50 dark:bg-background group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors border border-border/30 shadow-inner group-hover:border-indigo-400">
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Section: Upgrade / Action Area */}
            <div className="lg:col-span-7">
              <Card className="border-border/50 shadow-2xl bg-white dark:bg-[#121214] relative overflow-hidden h-full min-h-[600px]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/[0.03] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-2xl font-black">Naik Taraf ke PRO</CardTitle>
                  </div>
                  <CardDescription className="text-base">Maksimumkan produktiviti pengurusan dokumen anda sekarang.</CardDescription>
                </CardHeader>

                <CardContent className="p-8 pt-0 space-y-10">
                  {tokenData?.tier === 'pro' || tokenData?.tier === 'admin' ? (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center justify-center py-20 text-center space-y-6"
                    >
                      <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 ring-4 ring-emerald-500/5">
                        <Sparkles className="w-12 h-12" />
                      </div>
                      <div className="space-y-2 max-w-sm">
                        <h3 className="text-2xl font-black text-foreground">Kuasa Penuh Diaktifkan</h3>
                        <p className="text-muted-foreground font-medium">Akaun anda sudah berada pada tahap premium tertinggi. Terima kasih kerana menyokong Nexus AI!</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-12">
                      {/* Step-by-Step Stepper UI */}
                      <div className="flex items-start gap-8">
                        {/* Step 1: Payment */}
                        <div className="flex-1 space-y-6">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-600/20">1</div>
                            <h4 className="text-lg font-black tracking-tight text-foreground">Langganan Token</h4>
                          </div>

                          <div className="p-6 rounded-[2rem] bg-muted/20 dark:bg-background/40 border border-border/40 shadow-inner group backdrop-blur-sm">
                            <div className="flex flex-col gap-6 items-center">
                              <div className="relative p-4 bg-white rounded-3xl shadow-xl border-4 border-indigo-500/5 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                                <div className="absolute inset-0 bg-indigo-500/5 animate-[pulse_3s_infinite] pointer-events-none" />
                                <img
                                  src="/payment-qr.png"
                                  alt="DuitNow QR Code"
                                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain relative z-10"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div class="w-48 h-48 flex items-center justify-center text-xs text-center p-4 text-muted-foreground uppercase font-black tracking-widest leading-loose">QR Code<br/>Tidak Dijumpai</div>'; }}
                                />
                              </div>
                              <div className="text-center space-y-4">
                                <div className="inline-block px-5 py-2 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-black text-2xl tracking-tight shadow-sm">
                                  RM 10.00
                                </div>
                                <p className="text-sm font-bold text-muted-foreground leading-relaxed px-2">
                                  Imbas DuitNow QR untuk mendapatkan <span className="text-foreground">1,000 Token AI</span> & akses <span className="text-foreground">PRO selama 30 hari</span>.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 2: Verification */}
                        <div className="flex-1 space-y-6">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center font-black shadow-lg">2</div>
                            <h4 className="text-lg font-black tracking-tight text-foreground">Pengesahan</h4>
                          </div>

                          <div className="space-y-6">
                            {/* File Uploader Node */}
                            <div className="relative group">
                              <input
                                type="file"
                                id="receipt-upload"
                                accept="image/*,application/pdf"
                                disabled={isSubmittingTier}
                                className="peer sr-only"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setReceiptFile(e.target.files[0]);
                                  }
                                }}
                              />
                              <label
                                htmlFor="receipt-upload"
                                className={cn(
                                  "flex flex-col items-center justify-center min-h-[160px] p-8 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all duration-500",
                                  receiptFile
                                    ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/5 bg-[url('/grid-pattern.svg')] bg-[length:20px_20px]"
                                    : "border-border bg-muted/30 dark:bg-muted/10 hover:border-indigo-500 hover:bg-muted/50 dark:hover:bg-indigo-500/5 group-hover:scale-[0.98] drop-shadow-sm"
                                )}
                              >
                                <AnimatePresence mode="wait">
                                  {receiptFile ? (
                                    <motion.div
                                      key="selected"
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0.8, opacity: 0 }}
                                      className="text-center space-y-3"
                                    >
                                      <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-xl shadow-emerald-500/30 rotate-3">
                                        <Sparkles className="w-7 h-7" />
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 truncate max-w-[180px]">{receiptFile.name}</p>
                                        <p className="text-xs font-bold text-emerald-600/50">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB • Klik untuk tukar</p>
                                      </div>
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      key="empty"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="text-center space-y-4"
                                    >
                                      <div className="w-16 h-16 rounded-3xl bg-muted dark:bg-background/60 flex flex-col items-center justify-center mx-auto transition-transform group-hover:rotate-12 border border-border/40">
                                        <FileClock className="w-8 h-8 text-slate-400" />
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">Muat Naik Resit</p>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">JPG, PNG, WEBP, PDF</p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </label>
                            </div>

                            {/* Optional Note Field */}
                            <div className="space-y-3">
                              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Catatan Tambahan (Pilihan)</Label>
                              <Textarea
                                placeholder="Contoh: Lampiran bukti pemindahan DuitNow..."
                                className="min-h-[100px] resize-none focus:ring-4 focus:ring-indigo-500/10 bg-muted/20 dark:bg-background/40 rounded-[1.5rem] border-border/60 transition-all font-medium text-sm"
                                value={tierReason}
                                onChange={(e) => setTierReason(e.target.value)}
                                disabled={isSubmittingTier}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Warning & Submit Footer */}
                      <div className="pt-10 border-t border-border/40 space-y-6">
                        <div className="flex items-start gap-4 p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                            <AlertTriangle className="w-16 h-16" />
                          </div>
                          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                          <div className="space-y-1 relative z-10">
                            <p className="text-sm font-black uppercase tracking-tight">Perhatian Penting</p>
                            <p className="text-xs font-bold leading-relaxed opacity-80">
                              Sila muat naik resit yang sah dan jelas. Admin akan mengesahkan pembayaran manual anda dalam tempoh 1-3 hari bekerja. Pengesahan palsu boleh mengakibatkan akaun anda disekat secara kekal daripada ekosistem Nexus.
                            </p>
                          </div>
                        </div>

                        <Button
                          className="w-full h-16 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-lg rounded-[2rem] shadow-[0_15px_30px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.7)] transition-all duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:grayscale"
                          onClick={handleRequestTier}
                          disabled={isSubmittingTier || !receiptFile}
                        >
                          {isSubmittingTier ? (
                            <span className="flex items-center gap-3">
                              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                              Memproses Permohonan...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Sparkles className="w-6 h-6" /> Aktifkan Kuasa PRO Sekarang
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

const AI_LOADING_STEPS = [
  "Menganalisis profil kelab dan konteks program...",
  "Merangka struktur utama dokumen rasmi...",
  "Mengarang jadual belanjawan & perincian pengisian...",
  "Melaraskan tahap bahasa profesional & terma akademik...",
  "Mengemaskan format penulisan akhir supaya selari dengan JPA...",
  "Hampir siap, menyemak ralat teks akhir..."
];

function AiLoadingView({ type, retryCount }: { type: 'kertas-kerja' | 'minit-mesyuarat', retryCount?: number }) {
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex(prev => Math.min(prev + 1, AI_LOADING_STEPS.length - 1));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-8 pt-16 pb-20 fade-in-0 animate-in duration-500">
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Wand2 className="w-10 h-10 text-indigo-500 animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-3 px-4">
        {retryCount && retryCount > 0 ? (
          <p className="font-black text-amber-500 text-xl animate-pulse tracking-tight">Sambungan terganggu. Mencuba semula ({retryCount}/3)...</p>
        ) : (
          <p className="font-black text-indigo-600 dark:text-indigo-400 text-xl animate-pulse tracking-tight">{AI_LOADING_STEPS[stepIndex]}</p>
        )}
        <p className="text-sm font-medium text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">
          {retryCount && retryCount > 0 ? (
            <>Sistem mendapati capaian pelayan sibuk pada waktu ini.</>
          ) : (
            <>
              Enjin Nexus AI sedang {type === 'kertas-kerja' ? 'menjana keseluruhan kertas kerja.' : 'mensintesis nota mesyuarat anda.'}<br />
              Proses pemikiran kognitif mendalam ini mungkin mengambil sedikit masa.
            </>
          )}
        </p>
      </div>

      <div className="w-full max-w-sm mt-8 space-y-4 opacity-30">
        <div className="h-3 bg-muted-foreground rounded-full w-3/4 mx-auto animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="h-3 bg-muted-foreground rounded-full w-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="h-3 bg-muted-foreground rounded-full w-5/6 mx-auto animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
}
