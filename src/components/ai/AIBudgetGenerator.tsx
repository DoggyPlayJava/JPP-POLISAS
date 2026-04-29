import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, Check, Wand2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { useAiSettings } from '@/contexts/AiSettingsContext';
import { toast } from 'react-hot-toast';

interface AIBudgetGeneratorProps {
  initialTitle: string;
  initialDescription: string;
  onApplyBudget: (amount: string) => void;
  disabled?: boolean;
}

export function AIBudgetGenerator({ initialTitle, initialDescription, onApplyBudget, disabled = false }: AIBudgetGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contextInput, setContextInput] = useState('');
  const [feedback, setFeedback] = useState<{ anggaran_kasar: number; uraian: string } | null>(null);
  const [isError, setIsError] = useState(false);
  const { callAi, isLoading } = useAiAssistant();
  const { allowAiBudget } = useAiSettings();

  useEffect(() => {
    if (isOpen) {
      setContextInput(`Program: ${initialTitle}\n${initialDescription ? `Deskripsi: ${initialDescription}` : ''}`);
    }
  }, [isOpen, initialTitle, initialDescription]);

  const handleGenerate = async () => {
    if (!contextInput || contextInput.trim().length < 5) {
      toast.error('Sila berikan maklumat nama program dan sasaran peserta terlebih dahulu.');
      return;
    }
    
    setFeedback(null);
    setIsError(false);

    const rawResponse = await callAi({
      task: 'jana_belanjawan_ai',
      query: contextInput,
    });

    if (rawResponse) {
      try {
        const cleanJsonString = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonString);
        if (parsed.anggaran_kasar !== undefined && parsed.uraian) {
          setFeedback(parsed);
        } else {
          throw new Error('Format balasan tiada anggaran_kasar/uraian');
        }
      } catch (err) {
        console.error('Failed to parse AI JSON:', err, rawResponse);
        toast.error('AI mengembalikan bentuk bajet tidak logik. Cuba perincikan lagi maklumat anda.');
        setIsError(true);
      }
    } else {
      setIsError(true);
    }
  };

  const applyChanges = () => {
    if (feedback?.anggaran_kasar !== undefined) {
      onApplyBudget(feedback.anggaran_kasar.toString());
      toast.success('Jumlah bajet berjaya disalin ke sistem utama.');
      setIsOpen(false);
    }
  };

  if (!allowAiBudget) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen(true)}
        className="text-[10px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:hover:bg-emerald-500/20 h-7 px-3 rounded-xl transition-colors"
        title="Jana Kira-Kira Bajet bersama AI"
      >
        <Wand2 size={12} className="mr-1.5" /> AI Bajet
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-card">
          <DialogHeader className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col items-start relative shrink-0">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
              <Calculator size={24} className="text-teal-100" />
            </div>
            <DialogTitle className="text-xl font-black text-left relative z-10">Penjana Belanjawan Pintar</DialogTitle>
            <p className="text-xs text-emerald-100/90 font-medium pt-1 text-left relative z-10">AI akan membina rangka kasar perbelanjaan logikal untuk program kelab anda.</p>
          </DialogHeader>

          <div className="p-6 bg-muted/10 h-auto min-h-[350px] overflow-y-auto w-full space-y-5">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Konteks Program & Jumlah Peserta</label>
                <Textarea 
                   value={contextInput}
                   onChange={e => setContextInput(e.target.value)}
                   placeholder="Contoh: Bengkel Fotografi untuk 50 pax, perlu makan tengahari dan sijil penyertaan."
                   className="min-h-[80px] bg-card rounded-2xl font-medium text-sm"
                />
                {!feedback && !isLoading && (
                    <Button onClick={handleGenerate} className="w-full h-12 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl uppercase font-black tracking-widest text-[10px]">
                        <Sparkles size={14} className="mr-2"/> Jana Anggaran Baru
                    </Button>
                )}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 animate-pulse text-center">Menghitung Kewangan Logikal...</p>
              </div>
            ) : feedback ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between p-4 bg-emerald-100/50 rounded-2xl border border-emerald-200">
                    <span className="text-xs uppercase font-black tracking-widest text-emerald-800">Anggaran Kasar AI</span>
                    <span className="text-2xl font-black tracking-tighter text-emerald-700">RM {feedback.anggaran_kasar}</span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1 border-b pb-2">Huraian Cadangan Perbelanjaan</h4>
                  <div className="p-4 rounded-3xl bg-card border border-border text-foreground text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {feedback.uraian}
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center pt-2">Sila salin huraian ini ke kertas kerja rasmi anda secara manual.</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
                  <ShieldAlert size={32} />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-black text-rose-600 uppercase tracking-tight">Sistem sedang sibuk</p>
                  <p className="text-[11px] font-bold text-muted-foreground mt-1 leading-relaxed">Gandaan permintaan mungkin tinggi. Sila cuba lagi atau guna mod manual.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerate} className="rounded-full h-10 px-6 border-rose-200 text-rose-600 hover:bg-rose-50">
                  Cuba Semula
                </Button>
              </div>
            ) : null}
          </div>

          <div className="p-6 bg-card border-t border-border/50 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" disabled={isLoading} onClick={() => setIsOpen(false)} className="rounded-xl font-black text-[10px] uppercase h-12">Tutup</Button>
            <Button onClick={applyChanges} disabled={isLoading || !feedback} className="rounded-xl font-black text-[10px] uppercase h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20">
               Pindah Anggaran Total <Check size={14} className="ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
