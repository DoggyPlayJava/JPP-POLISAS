import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Clock, PlusCircle, User, ArrowLeft, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { CreateJobModal } from '@/components/polytask/CreateJobModal';

export function PolyTaskLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const NAV_LINKS = [
    { name: 'Cari Kerja', path: '/polytask', icon: Briefcase },
    { name: 'Kerja Saya', path: '/polytask/my-jobs', icon: User },
    { name: 'Bidaan Saya', path: '/polytask/my-bids', icon: Clock },
  ];

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row pb-20 md:pb-0 font-sans text-slate-200">
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/portal')} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">PolyTask</h1>
            <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Ekonomi Gig</p>
          </div>
        </div>
      </div>

      {/* Sidebar (Responsive) */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[140] w-72 transform transition-transform duration-300 ease-in-out bg-slate-900 border-r border-white/5 h-screen flex flex-col",
        "md:relative md:translate-x-0 md:flex-shrink-0 md:w-64 md:bg-slate-900/50 md:sticky md:top-0",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        {/* Mobile Close Button */}
        <div className="md:hidden absolute right-4 top-5">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full text-slate-400">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="p-6">
          <button onClick={() => navigate('/portal')} className="flex items-center text-sm text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Portal Utama
          </button>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Briefcase className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-tight">PolyTask</h1>
              <p className="text-xs text-indigo-400 font-medium">Platform Gig Pelajar</p>
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
                    tourClass,
                    isActive 
                      ? "bg-indigo-500/10 text-indigo-400" 
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-indigo-400" : "text-slate-500")} />
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <Button 
            onClick={() => {
              setIsSidebarOpen(false);
              setIsCreateModalOpen(true);
            }}
            className="tour-step-create-desktop w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] border-none"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Cipta Tugasan
          </Button>
          <div className="mt-4 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 hidden md:block">
            <p className="text-xs text-indigo-300/70 text-center leading-relaxed">
              Jana pendapatan dengan membantu rakan pelajar menyelesaikan tugasan harian.
            </p>
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
          className="tour-step-create-mobile w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_10px_25px_rgba(79,70,229,0.5)] border-none"
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

    </div>
  );
}
