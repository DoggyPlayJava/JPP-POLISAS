import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSearch, Sparkles, RefreshCw, TrendingUp, AlertTriangle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface AiReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string | null;
  programName?: string;
}

type Stage = 'ready' | 'loading' | 'result';

const REVIEW_POINTS = [
  { icon: TrendingUp,    label: 'Kekuatan Perancangan' },
  { icon: AlertTriangle, label: 'Potensi Risiko & Kekurangan' },
  { icon: Star,          label: 'Rating Kelulusan JPP' },
];

export function AiReviewModal({ isOpen, onClose, programId, programName }: AiReviewModalProps) {
  const { callAi, isLoading, result, setResult } = useAiAssistant();

  const stage: Stage = isLoading ? 'loading' : result ? 'result' : 'ready';

  const handleRunAnalysis = async () => {
    if (!programId) return;
    await callAi({ task: 'review_kertas_kerja', programId });
  };

  // Reset when modal opens with a new program; do NOT auto-fire
  useEffect(() => {
    if (isOpen) setResult(null);
  }, [isOpen, programId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl bg-card">
        <DialogHeader className="p-8 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <DialogTitle className="text-3xl font-black italic flex items-center gap-3 relative z-10">
            <FileSearch size={32} /> Semakan JPP <span className="text-emerald-200">AI</span>
          </DialogTitle>
          <p className="text-emerald-100 font-medium italic relative z-10">
            Penilaian Kertas Kerja: <span className="font-bold">"{programName ?? 'Kertas Kerja'}"</span>
          </p>
        </DialogHeader>

        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto bg-muted/20">
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
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                  <FileSearch size={36} className="text-emerald-600" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-foreground mb-1">Sedia Untuk Semakan</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    AI akan menilai kertas kerja ini berdasarkan 3 aspek utama:
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                  {REVIEW_POINTS.map(({ icon: Icon, label }, i) => (
                    <div key={label} className="flex items-center gap-3 bg-card border border-border/60 rounded-2xl px-4 py-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Icon size={15} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{i + 1}. {label}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleRunAnalysis}
                  disabled={!programId}
                  className="h-13 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-xl shadow-emerald-500/25"
                >
                  <Sparkles className="mr-2 w-4 h-4" /> Mula Semakan AI
                </Button>
              </motion.div>
            )}

            {/* ── Loading ── */}
            {stage === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 space-y-6"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6 animate-pulse" />
                </div>
                <p className="font-bold text-muted-foreground uppercase tracking-widest text-sm animate-pulse">
                  Menilai Perancangan & Kewangan...
                </p>
              </motion.div>
            )}

            {/* ── Result ── */}
            {stage === 'result' && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card p-6 rounded-3xl shadow-sm border border-border/50 text-foreground prose prose-sm dark:prose-invert max-w-none prose-headings:font-black prose-a:text-emerald-500"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result}</ReactMarkdown>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer — only when result ready */}
        {stage === 'result' && (
          <div className="p-6 bg-card border-t flex justify-end gap-3">
            <Button variant="outline" onClick={() => setResult(null)} disabled={isLoading} className="rounded-xl font-black text-xs uppercase h-12 bg-muted/50 border-none">
              <RefreshCw className="mr-2 w-4 h-4" /> Semak Semula
            </Button>
            <Button onClick={onClose} className="rounded-xl font-black text-xs uppercase h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20">
              Kembali ke Senarai
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
