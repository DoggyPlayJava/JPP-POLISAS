import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Clock, PlusCircle, User, ArrowLeft, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BottomNav } from '@/components/layout/BottomNav';
import { CreateJobModal } from '@/components/polytask/CreateJobModal';

import { FloatingAiChat } from '@/components/ai/FloatingAiChat';

export function PolyTaskLayout() {
  const { t } = useTranslation(['gig', 'portal', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const NAV_LINKS = [
    { name: t('gig:find_tasks', 'Cari Kerja'), path: '/polytask', icon: Briefcase },
    { name: t('gig:my_tasks', 'Kerja Saya'), path: '/polytask/my-jobs', icon: User },
    { name: t('gig:my_bids', 'Bidaan Saya'), path: '/polytask/my-bids', icon: Clock },
  ];

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={cn(
      "min-h-[100dvh] flex flex-col md:flex-row pb-20 md:pb-0 font-sans transition-colors duration-300",
      isDark ? "bg-[#061714] text-[#F6FBF9]" : "bg-[#F6FBF9] text-[#0B2420]"
    )}>
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-[130] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <div className={cn(
        "md:hidden sticky top-0 z-50 border-b flex items-center justify-between px-4 pb-4 pt-[calc(1rem+var(--sat,env(safe-area-inset-top,0px)))] transition-colors",
        isDark ? "bg-[#0B2420] border-[#1E4D45]" : "bg-white border-[#B8E4DC]/80"
      )}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/portal')} className={cn("w-8 h-8 flex items-center justify-center rounded-full transition-colors", isDark ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900")}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className={cn("text-lg font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>PolyTask</h1>
            <p className="text-[10px] text-[#0F766E] dark:text-[#2DD4BF] font-semibold tracking-wider uppercase">{t('gig:polytask_gig_economy', 'Ekonomi Gig')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setIsSidebarOpen(true)} className={cn("p-2 rounded-xl transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}>
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar (Responsive) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[140] md:z-30 w-72 transform transition-transform duration-300 ease-in-out h-[100dvh] flex flex-col border-r border-teal-400/15 text-[#F6FBF9]",
          "md:relative md:translate-x-0 md:flex-shrink-0 md:w-64 md:sticky md:top-0",
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
        style={{ background: 'linear-gradient(180deg, #0B2420 0%, #061714 100%)' }}
      >
        {/* Mobile Close Button */}
        <div className="md:hidden absolute right-4 top-5">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full text-[#99CBC2] hover:text-white">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="p-6">
          <button onClick={() => navigate('/portal')} className="flex items-center text-sm mb-6 transition-colors text-[#99CBC2] hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('portal:main_portal', 'Portal Utama')}
          </button>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.25)]">
              <Briefcase className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-white">PolyTask</h1>
              <p className="text-xs text-teal-300 font-semibold">{t('gig:student_gig_platform', 'Platform Gig Pelajar')}</p>
            </div>
          </div>

          <nav className="space-y-2">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              
              // Determine tour class based on path
              let tourClass = '';
              if (link.path === '/polytask') tourClass = 'tour-step-board';
              if (link.path === '/polytask/my-jobs') tourClass = 'tour-step-myjobs';
              if (link.path === '/polytask/my-bids') tourClass = 'tour-step-mybids';

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium relative",
                    tourClass,
                    isActive
                      ? "bg-teal-500/20 text-teal-300 font-bold border border-teal-400/25"
                      : "text-[#99CBC2] hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-teal-300" : "text-[#99CBC2]/70")} />
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 w-1 h-8 bg-teal-400 rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <Button 
            onClick={() => {
              setIsSidebarOpen(false);
              setIsCreateModalOpen(true);
            }}
            className="tour-step-create-desktop w-full bg-[#0F766E] hover:bg-[#0D9488] text-white shadow-[0_4px_20px_rgba(13,148,136,0.3)] border-none h-11 rounded-xl font-bold transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> {t('gig:create_task_btn', 'Cipta Tugasan')}
          </Button>
          <div className="p-4 rounded-xl border hidden md:block bg-teal-950/40 border-teal-400/20 text-teal-100/80">
            <p className="text-xs text-center leading-relaxed">
              {t('gig:polytask_earn_tagline', 'Jana pendapatan dengan membantu rakan pelajar menyelesaikan tugasan harian.')}
            </p>
          </div>
          <div className="hidden md:flex justify-end pt-1">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden relative">
        <Outlet />
      </main>

      {/* Mobile Floating Action Button (New Task) */}
      <div className="md:hidden fixed bottom-[calc(9.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40">
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          size="icon" 
          className="tour-step-create-mobile w-11 h-11 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-[0_10px_25px_rgba(147,51,234,0.4)] border-none"
        >
          <PlusCircle className="w-5 h-5" />
        </Button>
      </div>

      <BottomNav onOpenSidebar={() => setIsSidebarOpen(true)} />
      
      <CreateJobModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />

      <FloatingAiChat />
    </div>
  );
}
