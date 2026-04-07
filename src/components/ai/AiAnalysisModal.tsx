import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, RefreshCw, ShieldAlert, Users, Activity, Wallet, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId?: string;
  clubData?: any;
}

type Stage = 'ready' | 'loading' | 'result' | 'error';

const ANALYSIS_POINTS = [
  { icon: Users, label: 'Jumlah ahli berdaftar' },
  { icon: Activity, label: 'Aktiviti dirancang & diselesaikan' },
  { icon: Wallet, label: 'Penggunaan bajet kelab' },
  { icon: CheckSquare, label: 'Tugasan dan produktiviti' },
];

export function AiAnalysisModal({ isOpen, onClose, clubId, clubData }: AiAnalysisModalProps) {
  const [isError, setIsError] = React.useState(false);
  const { callAi, isLoading, result, setResult } = useAiAssistant();

  const stage: Stage = isLoading ? 'loading' : isError ? 'error' : result ? 'result' : 'ready';

  const handleRunAnalysis = async () => {
    if (!clubId) return;
    setIsError(false);
    const res = await callAi({ task: 'analyze_performance', clubId });
    if (!res) setIsError(true);
  };

  // Reset error state when modal re-opens; do NOT auto-fire
  useEffect(() => {
    if (isOpen) setIsError(false);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-card">
        <DialogHeader className="p-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <DialogTitle className="text-3xl font-black italic flex items-center gap-3 relative z-10">
            <Bot size={32} /> JPP <span className="text-violet-200">Nexus</span>
          </DialogTitle>
          <p className="text-violet-100 font-medium italic relative z-10">
            Sistem Kecerdasan Buatan JPP POLISAS — Analisis Prestasi Kelab
          </p>
        </DialogHeader>

        <div className="p-6 md:p-8 max-h-[65vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
          <AnimatePresence mode="wait">

            {/* ── Ready State ── */}
            {stage === 'ready' && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center text-center py-6 gap-6"
              >
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                  <Bot size={38} className="text-indigo-500" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-foreground mb-1">Sedia Jana Analisis</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    AI akan menganalisa data kelab anda secara automatik berdasarkan metrik berikut:
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  {ANALYSIS_POINTS.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 bg-card border border-border/60 rounded-2xl px-3 py-2.5 text-left">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Icon size={15} className="text-indigo-600" />
                      </div>
                      <span className="text-xs font-semibold text-foreground leading-tight">{label}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleRunAnalysis}
                  disabled={!clubId}
                  className="h-13 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm shadow-xl shadow-indigo-500/25 disabled:opacity-50"
                >
                  <Sparkles className="mr-2 w-4 h-4" /> Jana Analisis Sekarang
                </Button>
                {!clubId && (
                  <p className="text-xs text-rose-500 font-medium -mt-3">Profil anda tidak mempunyai kelab yang dipautkan.</p>
                )}
              </motion.div>
            )}

            {/* ── Loading ── */}
            {stage === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 space-y-6"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-200/50 border-t-indigo-600 animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 w-6 h-6 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="font-black text-indigo-600 uppercase tracking-[0.2em] text-sm animate-pulse mb-1">Menjana Analisis Pintar</p>
                  <p className="text-xs text-muted-foreground font-medium">Sila tunggu sebentar...</p>
                </div>
              </motion.div>
            )}

            {/* ── Result ── */}
            {stage === 'result' && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-card p-6 md:p-8 rounded-[2rem] shadow-xl shadow-indigo-100/50 dark:shadow-none border border-indigo-50/80 dark:border-border/50 text-foreground relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <Bot size={120} />
                </div>
                <div className="prose prose-indigo prose-sm md:prose-base dark:prose-invert max-w-none
                                prose-headings:font-black prose-headings:tracking-tight
                                prose-h2:text-indigo-700 dark:prose-h2:text-indigo-400 prose-h2:border-b prose-h2:pb-2
                                prose-h3:text-violet-600 dark:prose-h3:text-violet-400
                                prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300
                                prose-strong:text-indigo-900 dark:prose-strong:text-indigo-300 prose-strong:font-extrabold
                                prose-ul:my-4 prose-li:my-1 relative z-10">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result}</ReactMarkdown>
                </div>
              </motion.div>
            )}

            {/* ── Error ── */}
            {stage === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 space-y-4"
              >
                <div className="w-20 h-20 rounded-[2rem] bg-rose-50 text-rose-500 flex items-center justify-center border-2 border-rose-100 shadow-inner">
                  <ShieldAlert size={40} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-black text-rose-600 uppercase tracking-tight">Sistem sedang sibuk</h3>
                  <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                    Maaf, bot kami mengalami sedikit gangguan teknikal. Sila cuba lagi sebentar!
                  </p>
                </div>
                <Button onClick={handleRunAnalysis} className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-8 h-12 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-rose-600/20">
                  Cuba Jana Semula
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer actions — only show when result is ready */}
        {stage === 'result' && (
          <div className="p-6 bg-card border-t flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setResult(null); setIsError(false); }} disabled={isLoading} className="rounded-xl font-black text-xs uppercase h-12 bg-muted/50 border-none">
              <RefreshCw className="mr-2 w-4 h-4" /> Jana Semula
            </Button>
            <Button onClick={onClose} className="rounded-xl font-black text-xs uppercase h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20">
              Tutup
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
