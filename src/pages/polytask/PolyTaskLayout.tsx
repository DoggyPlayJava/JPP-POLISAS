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
      "min-h-screen flex flex-col md:flex-row pb-20 md:pb-0 font-sans transition-colors duration-300",
      isDark ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-900"
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
        "md:hidden sticky top-0 z-50 border-b flex items-center justify-between p-4 backdrop-blur-md transition-colors",
        isDark ? "bg-slate-900/80 border-white/5" : "bg-white/80 border-slate-200"
      )}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/portal')} className={cn("w-8 h-8 flex items-center justify-center rounded-full transition-colors", isDark ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900")}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className={cn("text-lg font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>PolyTask</h1>
            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold tracking-wider uppercase">{t('gig:polytask_gig_economy', 'Ekonomi Gig')}</p>
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
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[140] w-72 transform transition-transform duration-300 ease-in-out h-screen flex flex-col border-r",
        "md:relative md:translate-x-0 md:flex-shrink-0 md:w-64 md:sticky md:top-0",
        isDark ? "bg-slate-900 border-white/5 md:bg-slate-900/50" : "bg-white border-slate-200 md:bg-white/80",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        {/* Mobile Close Button */}
        <div className="md:hidden absolute right-4 top-5">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full text-slate-400">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="p-6">
          <button onClick={() => navigate('/portal')} className={cn("flex items-center text-sm mb-6 transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('portal:main_portal', 'Portal Utama')}
          </button>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className={cn("font-bold text-lg leading-tight", isDark ? "text-white" : "text-slate-900")}>PolyTask</h1>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">{t('gig:student_gig_platform', 'Platform Gig Pelajar')}</p>
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
                      ? (isDark ? "bg-purple-500/10 text-purple-400 font-bold" : "bg-purple-50 text-purple-700 font-bold shadow-xs")
                      : (isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-600 hover:bg-purple-50/50 hover:text-purple-700")
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? (isDark ? "text-purple-400" : "text-purple-600") : (isDark ? "text-slate-500" : "text-slate-400"))} />
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 w-1 h-8 bg-purple-600 dark:bg-purple-500 rounded-r-full"
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
            className="tour-step-create-desktop w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-[0_4px_20px_rgba(147,51,234,0.3)] border-none h-11 rounded-xl font-bold transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> {t('gig:create_task_btn', 'Cipta Tugasan')}
          </Button>
          <div className={cn("p-4 rounded-xl border hidden md:block", isDark ? "bg-purple-950/30 border-purple-500/20 text-purple-300/80" : "bg-purple-50/80 border-purple-200 text-purple-800")}>
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
      <div className="md:hidden fixed bottom-24 right-4 z-40">
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          size="icon" 
          className="tour-step-create-mobile w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-[0_10px_25px_rgba(147,51,234,0.4)] border-none"
        >
          <PlusCircle className="w-6 h-6" />
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
