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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { scanPdfClasses, parseTimetablePage } from '@/lib/timetableParser';
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
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [scannedClasses, setScannedClasses] = useState<ScannedClassOption[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);

  // State to launch preview modal directly
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    metadata: { session: string; effectiveDate: string; className: string; department: string };
    entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[];
  } | null>(null);

  const [roomMappings, setRoomMappings] = useState<ImapsRoomMapping[]>([]);

  // Pre-load room mappings
  useEffect(() => {
    if (!isOpen) return;
    async function loadMappings() {
      try {
        const { data, error } = await supabase.from('imaps_room_mappings').select('*');
        if (!error && data) {
          setRoomMappings(data as ImapsRoomMapping[]);
        }
      } catch (err) {
        console.error('Failed to load room mappings:', err);
      }
    }
    loadMappings();
  }, [isOpen]);

  // Reset state on close
  const handleReset = () => {
    setFile(null);
    setPdfBuffer(null);
    setIsScanning(false);
    setIsParsing(false);
    setErrorMessage(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      setErrorMessage('Hanya fail berformat PDF (.pdf) diterima.');
      return;
    }

    try {
      const buffer = await selected.arrayBuffer();
      await processPdfBuffer(selected, buffer);
    } catch (err: any) {
      setErrorMessage('Ralat semasa membaca fail: ' + err.message);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!droppedFile.name.toLowerCase().endsWith('.pdf') && droppedFile.type !== 'application/pdf') {
      setErrorMessage('Hanya fail berformat PDF (.pdf) diterima.');
      return;
    }

    try {
      const buffer = await droppedFile.arrayBuffer();
      await processPdfBuffer(droppedFile, buffer);
    } catch (err: any) {
      setErrorMessage('Ralat membaca fail yang diseret: ' + err.message);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleParseAndPreview = async () => {
    if (!pdfBuffer || selectedPageIndex === null) {
      toast.error('Sila pilih muka surat atau kelas terlebih dahulu.');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      // Load fresh mappings if not already available
      let mappingsToUse = roomMappings;
      if (mappingsToUse.length === 0) {
        const { data } = await supabase.from('imaps_room_mappings').select('*');
        if (data) mappingsToUse = data as ImapsRoomMapping[];
      }

      const parsedResult = await parseTimetablePage(
        pdfBuffer,
        selectedPageIndex,
        mappingsToUse
      );

      if (parsedResult.entries.length === 0) {
        toast('Tiada slot kuliah ditemui pada muka surat ini. Sila semak semula atau tambah secara manual.', {
          icon: 'ℹ️',
        });
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
              Muat naik fail jadual waktu rasmi (.pdf) dari jabatan anda untuk diekstrak secara pintar.
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
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold mb-1">
                Pilih fail PDF atau seret ke sini
              </p>
              <p className="text-xs text-muted-foreground">
                Menyokong fail PDF jadual jabatan (cth: JKE, JTMK, JKM, JP)
              </p>
            </div>
          )}

          {/* Scanning Indicator */}
          {isScanning && (
            <div className="p-6 rounded-2xl border bg-muted/40 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Sedang mengimbas kandungan PDF...</p>
                <p className="text-xs text-muted-foreground">Mencari senarai kelas dan jadual waktu.</p>
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
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
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
                disabled={isParsing || selectedPageIndex === null}
                className="w-full sm:w-auto text-xs gap-1.5"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Memproses Jadual...
                  </>
                ) : (
                  <>
                    Pratonton & Sahkan Jadual
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
