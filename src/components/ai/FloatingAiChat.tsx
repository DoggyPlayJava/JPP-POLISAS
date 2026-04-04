import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, X, ChevronRight, MessageSquare, Briefcase, FileLineChart, Send, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { useAiSettings } from '@/contexts/AiSettingsContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function FloatingAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [isError, setIsError] = useState(false);
  const { profile } = useAuth();
  const { callAi, isLoading, result, setResult } = useAiAssistant();
  const { allowAiChat } = useAiSettings();;

  const handleQuickAction = async (task: any) => {
    setIsError(false);
    if (task === 'analyze_performance') {
      const clubId = profile?.club_id;
      if (!clubId) {
        setResult("Sila pilih kelab atau pastikan profil anda mempunyai kelab untuk dianalisa.");
        return;
      }
      const res = await callAi({ task: 'analyze_performance', clubId });
      if (!res) setIsError(true);
    } else {
      const res = await callAi({ task: 'suggest_program', data: { fokus: "Meningkatkan perpaduan dan penyertaan pelajar POLISAS" } });
      if (!res) setIsError(true);
    }
  };

  const submitCustomQuery = async () => {
    if (!customQuery.trim()) return;
    const queryToSubmit = customQuery;
    setCustomQuery(''); // Kosongkan box serta merta
    setIsError(false);
    const res = await callAi({ task: 'custom_query', query: queryToSubmit });
    if (!res) setIsError(true);
  };

  const isCommittee = ['PRESIDEN', 'MAJLIS_TERTINGGI', 'PENASIHAT', 'SUPER_ADMIN'].includes(profile?.role || '');

  if (!allowAiChat) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[120]">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 text-white relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Sparkles size={28} className={isOpen ? "rotate-90 scale-0 transition-transform duration-300" : "rotate-0 scale-100 transition-transform duration-300"} />
            <X size={28} className={isOpen ? "rotate-0 scale-100 transition-transform duration-300 absolute" : "rotate-90 scale-0 transition-transform duration-300 absolute"} />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={16} className="w-80 md:w-96 p-0 rounded-[2rem] border-none shadow-2xl bg-card overflow-hidden flex flex-col h-[500px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white relative shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            <h3 className="font-black text-xl italic flex items-center gap-2 relative z-10">
              <Sparkles size={20} className="text-violet-200" /> JPP Nexus
            </h3>
            <p className="text-xs text-violet-100 font-medium mt-1 relative z-10 opacity-80">Pembantu pintar rasmi POLISAS</p>
          </div>

          {/* Body */}
          <div className="p-4 bg-muted/10 overflow-y-auto flex-1 flex flex-col gap-4">
            
            {/* AI Welcome Message */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="bg-card border border-border/50 p-4 rounded-2xl rounded-tl-sm text-sm text-foreground shadow-sm w-full">
                <p className="font-bold mb-1">Hai {profile?.full_name?.split(' ')[0] || 'Pelajar'}!</p>
                <p className="text-muted-foreground text-xs leading-relaxed mb-3">Saya adalah pembantu AI anda. Pilih tindakan pantas atau tanya sebarang soalan tentang JPP/Kelab.</p>
                
                {/* Quick Actions */}
                <div className="space-y-2 mt-4">
                  {isCommittee && (
                    <Button 
                      onClick={() => handleQuickAction('analyze_performance')}
                      disabled={isLoading}
                      variant="outline" 
                      className="w-full justify-between h-auto py-3 px-4 rounded-xl border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-700 disabled:opacity-50"
                    >
                      <span className="flex items-center text-xs font-bold"><FileLineChart className="w-4 h-4 mr-2" /> Analisis Kelab</span>
                      <ChevronRight size={14} className="opacity-50" />
                    </Button>
                  )}
                  <Button 
                    onClick={() => handleQuickAction('cadang')}
                    disabled={isLoading}
                    variant="outline" 
                    className="w-full justify-between h-auto py-3 px-4 rounded-xl bg-card hover:bg-muted mt-2 disabled:opacity-50"
                  >
                    <span className="flex items-center text-xs font-bold text-slate-600"><Sparkles className="w-4 h-4 mr-2" /> Cadangan Aktiviti Pelajar</span>
                    <ChevronRight size={14} className="opacity-50" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* AI Result Bubble */}
            <AnimatePresence>
              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                  <div className="bg-card border border-border/50 p-4 rounded-2xl rounded-tl-sm shadow-sm w-full flex items-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 animate-pulse">Sedang Memproses...</p>
                  </div>
                </motion.div>
              )}
              {isError && !isLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-1">
                    <ShieldAlert size={16} />
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl rounded-tl-sm text-sm text-rose-900 shadow-sm w-full">
                    <p className="font-bold flex items-center gap-2 mb-1 text-rose-700">
                        Sistem Sedang Sibuk
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-80">
                        Maaf, saya gagal memproses permintaan anda sekarang. Sila cuba lagi sebentar sahaja lagi!
                    </p>
                    <div className="mt-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setIsError(false)} className="h-6 text-[10px] uppercase font-bold text-rose-600 hover:bg-rose-100 transition-colors">Faham</Button>
                    </div>
                  </div>
                </motion.div>
              )}
              {result && !isLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles size={16} />
                  </div>
                  <div className="bg-card border border-border/50 p-4 rounded-2xl rounded-tl-sm text-sm text-foreground shadow-sm w-full prose prose-sm dark:prose-invert prose-headings:font-black prose-p:leading-snug overflow-hidden">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                    <div className="mt-4 pt-3 border-t border-border/50 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setResult(null)} className="h-6 text-[10px] uppercase font-bold text-muted-foreground">Tutup Laporan</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat Input Section */}
          <div className="p-4 bg-background border-t border-border/50 shrink-0">
            <div className="relative">
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Tanya hal JPP / Kelab..."
                className="w-full text-sm bg-muted/30 border border-border focus:border-indigo-500 rounded-2xl py-3 pl-4 pr-12 resize-none h-[52px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-muted-foreground/60"
                maxLength={700}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitCustomQuery();
                  }
                }}
              />
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={submitCustomQuery}
                disabled={isLoading || !customQuery.trim()}
                className="absolute right-2 top-2 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center transition-colors"
                title="Hantar (Enter)"
              >
                <Send size={16} className={customQuery.trim() && !isLoading ? 'ml-0.5' : ''} />
              </motion.button>
            </div>
            <div className={`text-[10px] text-right mt-1.5 font-medium transition-colors ${customQuery.length >= 650 ? 'text-red-500' : 'text-muted-foreground/60'}`}>
              {customQuery.length} / 700
            </div>
          </div>

        </PopoverContent>
      </Popover>
    </div>
  );
}
