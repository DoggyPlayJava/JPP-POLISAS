import React, { useState } from 'react';
import { Sparkles, Check, Wand2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { useAiSettings } from '@/contexts/AiSettingsContext';
import { toast } from 'react-hot-toast';

interface AIGrammarCheckProps {
  textValue: string;
  onApply: (newText: string) => void;
  disabled?: boolean;
}

export function AIGrammarCheck({ textValue, onApply, disabled = false }: AIGrammarCheckProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ teguran: string; teksSemakan: string } | null>(null);
  const [isError, setIsError] = useState(false);
  const { callAi, isLoading } = useAiAssistant();
  const { allowAiBudget } = useAiSettings();

  const handleCheck = async () => {
    if (!textValue || textValue.trim().length < 5) {
      toast.error('Sila taip sekurang-kurangnya 1 perenggan atau 5 patah perkataan.');
      return;
    }
    setIsOpen(true);
    setFeedback(null);
    setIsError(false);

    const rawResponse = await callAi({
      task: 'semak_tatabahasa_laporan',
      query: textValue,
    });

    if (rawResponse) {
      try {
        // AI might return markdown formatting like ```json ... ```
        const cleanJsonString = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonString);
        if (parsed.teguran && parsed.teksSemakan) {
          setFeedback(parsed);
        } else {
          throw new Error('Format balasan tiada teguran/teksSemakan');
        }
      } catch (err) {
        console.error('Failed to parse AI JSON:', err, rawResponse);
        toast.error('AI mengembalikan respons dalam format tidak sah. Sila cuba lagi.');
        setIsOpen(false);
      }
    } else {
      setIsError(true);
    }
  };

  const applyChanges = () => {
    if (feedback?.teksSemakan) {
      onApply(feedback.teksSemakan);
      toast.success('Ayat anda telah dikemas kini!');
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
        onClick={handleCheck}
        className="text-[10px] uppercase font-black tracking-widest text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 h-7 px-2 border border-indigo-200 bg-indigo-50/50 rounded-xl mt-1 shrink-0"
        title="Semak Tatabahasa Bersama AI"
      >
        <Wand2 size={12} className="mr-1.5" /> Semak Ejaan
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-card">
          <DialogHeader className="p-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex flex-col items-start relative shrink-0">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
              <Sparkles size={24} className="text-violet-100" />
            </div>
            <DialogTitle className="text-xl font-black text-left relative z-10">Semakan Tatabahasa AI</DialogTitle>
            <p className="text-xs text-indigo-100/90 font-medium pt-1 text-left relative z-10">Laporan rasmi harus bebas daripada slanga & kesalahan ejaan.</p>
          </DialogHeader>

          <div className="p-6 bg-muted/10 h-[350px] overflow-y-auto w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 animate-pulse text-center">Sedang Menyemak Ayat Anda...</p>
              </div>
            ) : feedback ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-black text-rose-500 tracking-widest pl-1">Teguran & Kesalahan Asal</h4>
                  <div className="p-4 rounded-3xl bg-rose-50/50 border border-rose-100 text-rose-900 text-sm font-medium leading-relaxed">
                    {feedback.teguran}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-black text-emerald-500 tracking-widest pl-1">Cadangan Pembaikan AI</h4>
                  <div className="p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100 text-emerald-900 text-sm font-bold leading-relaxed selection:bg-emerald-200">
                    {feedback.teksSemakan}
                  </div>
                </div>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
                  <ShieldAlert size={32} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-rose-600 uppercase tracking-tight">Sistem sedang sibuk</p>
                  <p className="text-[11px] font-bold text-muted-foreground mt-1">Sila cuba sebentar lagi atau lapor kepada JPP jika berlarutan.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleCheck} className="rounded-full h-10 px-6 border-rose-200 text-rose-600 hover:bg-rose-50">
                  Cuba Semula
                </Button>
              </div>
            ) : null}
          </div>

          <div className="p-6 bg-card border-t border-border/50 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" disabled={isLoading} onClick={() => setIsOpen(false)} className="rounded-xl font-black text-[10px] uppercase h-12">Batal</Button>
            <Button onClick={applyChanges} disabled={isLoading || !feedback} className="rounded-xl font-black text-[10px] uppercase h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20">
               Tukar Guna Ayat AI <Check size={14} className="ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
