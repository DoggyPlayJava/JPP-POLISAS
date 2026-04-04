import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSearch, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AiReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string | null;
  programName?: string;
}

export function AiReviewModal({ isOpen, onClose, programId, programName }: AiReviewModalProps) {
  const { callAi, isLoading, result, setResult } = useAiAssistant();

  const handleRunAnalysis = async () => {
    if (!programId) return;
    await callAi({
      task: 'review_kertas_kerja',
      programId: programId,
    });
  };

  useEffect(() => {
    if (isOpen && !result && !isLoading && programId) {
      handleRunAnalysis();
    }
    if (!isOpen) {
      // Optional: Clear result when closed if we want it fresh every time
      // setResult(null);
    }
  }, [isOpen, programId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl bg-card">
        <DialogHeader className="p-8 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <DialogTitle className="text-3xl font-black italic flex items-center gap-3 relative z-10">
            <FileSearch size={32} /> Semakan JPP <span className="text-emerald-200">AI</span>
          </DialogTitle>
          <p className="text-emerald-100 font-medium italic relative z-10">
            Menganalisis draf kelulusan bagi: <span className="font-bold">"{programName || 'Kertas Kerja'}"</span>
          </p>
        </DialogHeader>
        
        <div className="p-8 max-h-[60vh] overflow-y-auto bg-muted/20 prose prose-sm dark:prose-invert max-w-none prose-headings:font-black prose-a:text-emerald-500">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 space-y-6"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6 animate-pulse" />
                </div>
                <p className="font-bold text-muted-foreground uppercase tracking-widest text-sm animate-pulse">Menilai Perancangan & Kewangan...</p>
              </motion.div>
            ) : result ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                className="bg-card p-6 rounded-3xl shadow-sm border border-border/50 text-foreground"
              >
                 <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </motion.div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <p>Pemprosesan dihentikan atau tiada data disahkan.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="p-6 bg-card border-t flex justify-end gap-3">
          <Button variant="outline" onClick={handleRunAnalysis} disabled={isLoading} className="rounded-xl font-black text-xs uppercase h-12 bg-muted/50 border-none">
            <RefreshCw className="mr-2 w-4 h-4" /> Semak Semula
          </Button>
          <Button onClick={onClose} className="rounded-xl font-black text-xs uppercase h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20">
            Kembali ke Senarai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
