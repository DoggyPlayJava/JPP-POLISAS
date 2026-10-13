import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  PenLine,
  ArrowRight,
  Layers,
  Sparkles,
  ImageIcon,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { scanPdfClasses, parseTimetablePage, type RoomLocationLookup } from '@/lib/timetableParser';
import { parseTimetableImage, type ImageQualityReport } from '@/lib/imageTimetableParser';
import type { StudentTimetableEntry, ImapsRoomMapping } from '@/types';
import { TimetablePreviewModal } from './TimetablePreviewModal';

export interface ScannedClassOption {
  pageIndex: number;
  className: string;
}

export interface TimetableUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onParsed?: (result: {
    metadata: { session: string; effectiveDate: string; className: string; department: string };
    entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[];
  }) => void;
}

export function TimetableUploadModal({
  isOpen,
  onClose,
  onSuccess,
  onParsed,
}: TimetableUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<'pdf' | 'image'>('pdf');
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageQuality, setImageQuality] = useState<ImageQualityReport | null>(null);

  const [scannedClasses, setScannedClasses] = useState<ScannedClassOption[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);

  // State to launch preview modal directly
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    metadata: { session: string; effectiveDate: string; className: string; department: string };
    entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[];
  } | null>(null);

  const [locations, setLocations] = useState<RoomLocationLookup[]>([]);
  const [roomMappings, setRoomMappings] = useState<ImapsRoomMapping[]>([]);

  // Pre-load locations and room mappings in parallel
  useEffect(() => {
    if (!isOpen) return;
    async function loadLookupData() {
      try {
        const [locsRes, mapRes] = await Promise.all([
          supabase.from('imaps_locations').select('id, room_code, search_tags'),
          supabase.from('imaps_room_mappings').select('*'),
        ]);
        if (locsRes.data) {
          setLocations(locsRes.data as RoomLocationLookup[]);
        }
        if (mapRes.data) {
          setRoomMappings(mapRes.data as ImapsRoomMapping[]);
        }
      } catch (err) {
        console.error('Failed to load room lookup data:', err);
      }
    }
    loadLookupData();
  }, [isOpen]);

  // Reset state on close
  const handleReset = () => {
    setFile(null);
    setFileKind('pdf');
    setPdfBuffer(null);
    setIsScanning(false);
    setIsParsing(false);
    setErrorMessage(null);
    setImageQuality(null);
    setScannedClasses([]);
    setSelectedPageIndex(null);
    setPreviewData(null);
    setIsPreviewOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const processPdfBuffer = async (selectedFile: File, buffer: ArrayBuffer) => {
    setFile(selectedFile);
    setPdfBuffer(buffer);
    setIsScanning(true);
    setErrorMessage(null);

    try {
      const classes = await scanPdfClasses(buffer);
      setScannedClasses(classes);

      if (classes.length === 1) {
        // Single class: auto-select
        setSelectedPageIndex(classes[0].pageIndex);
      } else if (classes.length > 1) {
        // Multiple classes: default to first, allow user to change
        setSelectedPageIndex(classes[0].pageIndex);
      } else {
        // No class header detected: default to page 1
        setSelectedPageIndex(1);
      }
    } catch (err: any) {
      console.error('Failed to scan PDF classes:', err);
      setErrorMessage(
        err.message || 'Gagal membaca fail PDF. Sila pastikan fail tidak rosak atau berkunci.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const isPdfFile = (f: File) =>
    f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf';
  const isImageFile = (f: File) =>
    f.type.startsWith('image/') || /\.(png|jpe?g|webp|heic|heif)$/i.test(f.name);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await handleFileSelection(selected);
  };

  const handleFileSelection = async (selected: File) => {
    if (isPdfFile(selected)) {
      setFileKind('pdf');
      try {
        const buffer = await selected.arrayBuffer();
        await processPdfBuffer(selected, buffer);
      } catch (err: any) {
        setErrorMessage('Ralat semasa membaca fail: ' + err.message);
      }
      return;
    }

    if (isImageFile(selected)) {
      setFileKind('image');
      setFile(selected);
      setPdfBuffer(null);
      setScannedClasses([]);
      setErrorMessage(null);
      setImageQuality(null);
      // Auto-OCR image immediately on selection (single-step UX)
      await runImageParse(selected);
      return;
    }

    setErrorMessage('Format tidak disokong. Sila pilih fail PDF atau imej (PNG/JPG/WebP).');
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    await handleFileSelection(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const runImageParse = async (imageFile: File) => {
    setIsParsing(true);
    setErrorMessage(null);
    try {
      let mappingsToUse = roomMappings;
      let locationsToUse = locations;
      if (locationsToUse.length === 0 || mappingsToUse.length === 0) {
        const [locsRes, mapRes] = await Promise.all([
          locationsToUse.length === 0
            ? supabase.from('imaps_locations').select('id, room_code, search_tags')
            : Promise.resolve({ data: locationsToUse }),
          mappingsToUse.length === 0
            ? supabase.from('imaps_room_mappings').select('*')
            : Promise.resolve({ data: mappingsToUse }),
        ]);
        if (locsRes.data) locationsToUse = locsRes.data as RoomLocationLookup[];
        if (mapRes.data) mappingsToUse = mapRes.data as ImapsRoomMapping[];
      }

      const result = await parseTimetableImage(imageFile, mappingsToUse, locationsToUse);
      setImageQuality(result.quality);
      setPreviewData(result);
    } catch (err: any) {
      console.error('Failed to parse timetable image:', err);
      if (err?.message === 'RESOLUTION_RENDAH') {
        setErrorMessage(
          'Imej terlalu kecil / resolusi rendah. Sila muat naik imej asal (bukan screenshot yang di-compress WhatsApp/Telegram), atau screenshot semula dalam keadaan landskap (mendatar).',
        );
        toast.error('Imej resolusi rendah. Muat naik imej asal (landskap).');
      } else {
        setErrorMessage('Gagal memproses imej: ' + (err.message || 'Format imej tidak disokong.'));
        toast.error('Gagal mengekstrak jadual dari imej.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleParseAndPreview = async () => {
    if (fileKind === 'image') {
      // Image already parsed on selection; open preview (with reject guard)
      if (!previewData) {
        toast.error('Sila tunggu pemprosesan imej selesai.');
        return;
      }
      const quality = imageQuality;
      if (quality && quality.score < 50) {
        toast.error(`Ketepatan terlalu rendah (${quality.score}%). Sila muat naik imej yang lebih jelas.`);
        return;
      }
      if (previewData.entries.length === 0) {
        toast('Tiada slot kuliah dikesan pada imej ini. Sila semak semula atau isi secara manual.');
      }
      if (onParsed) onParsed(previewData);
      setIsPreviewOpen(true);
      return;
    }

    // PDF path (existing)
    if (!pdfBuffer || selectedPageIndex === null) {
      toast.error('Sila pilih muka surat atau kelas terlebih dahulu.');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      // Load fresh locations & mappings in parallel if not already available
      let mappingsToUse = roomMappings;
      let locationsToUse = locations;
      if (locationsToUse.length === 0 || mappingsToUse.length === 0) {
        const [locsRes, mapRes] = await Promise.all([
          locationsToUse.length === 0
            ? supabase.from('imaps_locations').select('id, room_code, search_tags')
            : Promise.resolve({ data: locationsToUse }),
          mappingsToUse.length === 0
            ? supabase.from('imaps_room_mappings').select('*')
            : Promise.resolve({ data: mappingsToUse }),
        ]);
        if (locsRes.data) locationsToUse = locsRes.data as RoomLocationLookup[];
        if (mapRes.data) mappingsToUse = mapRes.data as ImapsRoomMapping[];
      }

      const parsedResult = await parseTimetablePage(
        pdfBuffer,
        selectedPageIndex,
        mappingsToUse,
        locationsToUse
      );

      if (parsedResult.entries.length === 0) {
        toast('Tiada slot kuliah ditemui pada muka surat ini. Sila semak semula atau tambah secara manual.');
      }

      if (onParsed) {
        onParsed(parsedResult);
      }

      setPreviewData(parsedResult);
      setIsPreviewOpen(true);
    } catch (err: any) {
      console.error('Failed to parse timetable page:', err);
      setErrorMessage('Gagal memproses jadual: ' + (err.message || 'Format jadual tidak disokong.'));
      toast.error('Gagal mengekstrak jadual dari PDF.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleOpenManualEntry = () => {
    setPreviewData({
      metadata: {
        session: 'SESI I : 2024/2025',
        effectiveDate: '',
        className: '',
        department: '',
      },
      entries: [],
    });
    setIsPreviewOpen(true);
  };

  const handlePreviewSuccess = () => {
    setIsPreviewOpen(false);
    onSuccess?.();
    handleModalClose();
  };

  return (
    <>
      <Dialog open={isOpen && !isPreviewOpen} onOpenChange={open => !open && handleModalClose()}>
        <DialogContent className="max-w-lg w-full p-6 space-y-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold">
                Muat Naik Jadual Waktu Kuliah
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Muat naik jadual waktu rasmi (.pdf) atau screenshot (.png/.jpg) — sistem akan ekstrak secara pintar.
            </DialogDescription>
          </DialogHeader>

          {/* Upload Dropzone */}
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold mb-1">
                Pilih fail PDF atau screenshot, atau seret ke sini
              </p>
              <p className="text-xs text-muted-foreground">
                Menyokong PDF jadual jabatan & screenshot (PNG/JPG/WebP)
              </p>
            </div>
          )}

          {/* Scanning Indicator */}
          {isScanning && (
            <div className="p-6 rounded-2xl border bg-muted/40 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Sedang mengimbas kandungan...</p>
                <p className="text-xs text-muted-foreground">Mencari senarai kelas dan jadual waktu.</p>
              </div>
            </div>
          )}

          {/* Parsing Indicator (image OCR) */}
          {isParsing && fileKind === 'image' && (
            <div className="p-6 rounded-2xl border bg-muted/40 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Mengekstrak jadual dari imej...</p>
                <p className="text-xs text-muted-foreground">Ini mungkin mengambil masa beberapa saat.</p>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 flex items-start gap-2.5 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">{errorMessage}</div>
            </div>
          )}

          {/* Scanned File Details & Class Selector */}
          {file && !isScanning && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {fileKind === 'image' ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fileKind === 'image' ? 'Screenshot / Imej · ' : ''}{(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Tukar Fail
                </Button>
              </div>

              {/* ── Image accuracy report ── */}
              {fileKind === 'image' && !isParsing && imageQuality && (
                <div className="rounded-xl border p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Anggaran Ketepatan
                    </span>
                    <span className={`text-lg font-black ${imageQuality.score >= 75 ? 'text-emerald-600' : imageQuality.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {imageQuality.score}%
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${imageQuality.score >= 75 ? 'bg-emerald-500' : imageQuality.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${imageQuality.score}%` }}
                    />
                  </div>

                  {/* score components — 3 weighted factors, transparent formula */}
                  <div className="space-y-1.5">
                    {[
                      ['Kualiti imej', imageQuality.geoScore, 35],
                      ['Keyakinan OCR', imageQuality.ocrConfidence, 45],
                      ['Hari dikesan', Math.round((imageQuality.daysDetected / 5) * 100), 20],
                    ].map(([label, val, weight]) => (
                      <div key={label as string} className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground w-24 shrink-0">
                          {label} <span className="text-muted-foreground/60">({weight}%)</span>
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(val as number) >= 75 ? 'bg-emerald-500' : (val as number) >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, val as number)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold w-9 text-right tabular-nums">{val}%</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {imageQuality.daysDetected}/5 hari dikesan · kelas {imageQuality.daysDetected >= 3 ? 'dijumpai' : 'tidak lengkap'}
                  </p>

                  {/* mandatory review notice */}
                  <div className={`rounded-lg px-3 py-2 flex items-start gap-2 text-[11px] font-medium ${imageQuality.score < 50 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                    {imageQuality.score < 50 ? <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    <span>
                      {imageQuality.score < 50
                        ? 'Ketepatan terlalu rendah. Sila muat naik imej yang lebih jelas atau guna fail PDF.'
                        : 'Sila semak setiap slot sebelum menyimpan. OCR mungkin tersalah baca kod subjek.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Multiple classes found */}
              {scannedClasses.length > 1 && (
                <div className="space-y-2 p-3.5 rounded-xl border bg-muted/30">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Pilih Kelas Anda ({scannedClasses.length} kelas dijumpai):
                  </label>
                  <Select
                    value={String(selectedPageIndex)}
                    onValueChange={val => setSelectedPageIndex(parseInt(val, 10))}
                  >
                    <SelectTrigger className="h-9 text-sm bg-background">
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {scannedClasses.map(c => (
                        <SelectItem key={c.pageIndex} value={String(c.pageIndex)}>
                          Kelas {c.className} (Muka Surat {c.pageIndex})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Single class detected */}
              {scannedClasses.length === 1 && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    Kelas dikesan secara automatik:{' '}
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {scannedClasses[0].className}
                    </span>{' '}
                    (Muka Surat {scannedClasses[0].pageIndex})
                  </div>
                </div>
              )}

              {/* Zero standard classes detected */}
              {scannedClasses.length === 0 && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2 text-amber-800 dark:text-amber-200 text-xs">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Tiada pengecam kelas standard dikesan</span>
                  </div>
                  <p>
                    Format header kelas tidak ditemui secara automatik. Sila gunakan 'Isi Jadual Manual' atau teruskan dengan muka surat 1.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Fallback button & Action buttons */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenManualEntry}
              className="w-full sm:w-auto text-xs gap-1.5"
            >
              <PenLine className="w-3.5 h-3.5" />
              Isi Jadual Manual
            </Button>

            {file && !isScanning && (
              <Button
                type="button"
                size="sm"
                onClick={handleParseAndPreview}
                disabled={isParsing || (fileKind === 'pdf' && selectedPageIndex === null) || (fileKind === 'image' && imageQuality !== null && imageQuality.score < 50)}
                className="w-full sm:w-auto text-xs gap-1.5"
              >
                {isParsing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Memproses Jadual...
                </>
                ) : (
                <>
                  {fileKind === 'image' ? 'Semak & Sahkan Jadual' : 'Pratonton & Sahkan Jadual'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render TimetablePreviewModal once parsed or chosen manually */}
      {isPreviewOpen && (
        <TimetablePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          initialMetadata={previewData?.metadata}
          initialEntries={previewData?.entries}
          onSuccess={handlePreviewSuccess}
        />
      )}
    </>
  );
}

export default TimetableUploadModal;
