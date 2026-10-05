import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Megaphone,
  UtensilsCrossed,
  CalendarDays,
  Map,
  Home,
  HeartHandshake,
  QrCode,
  Landmark,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getCampusServicesConfig, CampusServiceItem } from '@/lib/superAppHelpers';

export interface CampusServicesGridProps {
  isModuleEnabled: (id: string) => boolean;
  isSuperAdmin: boolean;
  onOpenPolymartModal?: () => void;
  onOpenKamsisModal?: () => void;
  kamsisStatus?: string | null;
  kbStats?: { open: number; resolved: number } | null;
  className?: string;
}

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  polysuara: Megaphone,
  polymart: UtensilsCrossed,
  takwim: CalendarDays,
  polymaps: Map,
  polyrent: Home,
  kebajikan: HeartHandshake,
  akademik_qr: QrCode,
  ekpp: Landmark,
};

const SERVICE_STYLES: Record<string, { squircleClass: string }> = {
  polysuara: {
    squircleClass:
      'bg-rose-50 text-rose-600 border-rose-200 shadow-xs dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40 dark:shadow-[0_0_12px_rgba(244,63,94,0.3)]',
  },
  polymart: {
    squircleClass:
      'bg-amber-50 text-amber-600 border-amber-200 shadow-xs dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40 dark:shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  },
  takwim: {
    squircleClass:
      'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-xs dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/40 dark:shadow-[0_0_12px_rgba(99,102,241,0.3)]',
  },
  polymaps: {
    squircleClass:
      'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 dark:shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  },
  polyrent: {
    squircleClass:
      'bg-cyan-50 text-cyan-600 border-cyan-200 shadow-xs dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/40 dark:shadow-[0_0_12px_rgba(6,182,212,0.3)]',
  },
  kebajikan: {
    squircleClass:
      'bg-teal-50 text-teal-600 border-teal-200 shadow-xs dark:bg-teal-500/20 dark:text-teal-400 dark:border-teal-500/40 dark:shadow-[0_0_12px_rgba(20,184,166,0.3)]',
  },
  akademik_qr: {
    squircleClass:
      'bg-purple-50 text-purple-600 border-purple-200 shadow-xs dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/40 dark:shadow-[0_0_12px_rgba(168,85,247,0.3)]',
  },
  ekpp: {
    squircleClass:
      'bg-blue-50 text-blue-600 border-blue-200 shadow-xs dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40 dark:shadow-[0_0_12px_rgba(59,130,246,0.3)]',
  },
};

export function CampusServicesGrid({
  isModuleEnabled,
  isSuperAdmin,
  onOpenPolymartModal,
  onOpenKamsisModal,
  kamsisStatus,
  kbStats,
  className,
}: CampusServicesGridProps) {
  const navigate = useNavigate();
  const services = getCampusServicesConfig({
    kamsisStatus,
    kbOpenCount: kbStats?.open,
  });

  const checkEnabled = (serviceId: string): boolean => {
    if (isSuperAdmin) return true;
    switch (serviceId) {
      case 'polymart':
        return isModuleEnabled('keusahawanan') || isModuleEnabled('polymart');
      case 'takwim':
      case 'akademik_qr':
        return isModuleEnabled('akademik') || isModuleEnabled(serviceId);
      case 'kebajikan':
        return isModuleEnabled('kebajikan');
      case 'ekpp':
        return isModuleEnabled('ekpp') || isModuleEnabled('kelab');
      case 'polysuara':
      case 'polymaps':
      case 'polyrent':
      default:
        return true;
    }
  };

  const handleAction = (service: CampusServiceItem) => {
    const isEnabled = checkEnabled(service.id);
    if (!isEnabled && !isSuperAdmin) {
      toast(`${service.label} sedang dikemas kini!`, { icon: '🚧' });
      return;
    }

    if (service.id === 'polyservices' || service.routeOrAction === 'modal:polymart') {
      onOpenPolymartModal?.();
    } else if (service.id === 'kamsis' || service.routeOrAction === 'modal:kamsis') {
      onOpenKamsisModal?.();
    } else if (service.routeOrAction?.startsWith('/')) {
      navigate(service.routeOrAction);
    }
  };

  return (
    <section
      aria-label="Perkhidmatan Kampus"
      className={cn('w-full max-w-4xl mx-auto px-2 sm:px-4', className)}
    >
      <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {services.map((service) => {
          const Icon = SERVICE_ICONS[service.id] || Landmark;
          const style = SERVICE_STYLES[service.id] || {
            squircleClass:
              'bg-slate-50 text-slate-700 border-slate-200 shadow-xs dark:bg-slate-800/40 dark:text-slate-300 dark:border-white/10',
          };
          const isEnabled = checkEnabled(service.id);

          return (
            <motion.button
              key={service.id}
              type="button"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              onClick={() => handleAction(service)}
              className={cn(
                'flex flex-col items-center justify-start text-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 p-2 sm:p-3 transition-all',
                'bg-white hover:bg-slate-50 border border-slate-200/70 hover:border-emerald-400/40 shadow-xs hover:shadow-md rounded-2xl sm:rounded-3xl',
                'dark:bg-slate-900/80 dark:hover:bg-slate-800/90 dark:backdrop-blur-md dark:border-white/[0.08] dark:hover:border-emerald-500/30 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
                service.tourClass,
                !isEnabled && !isSuperAdmin && 'opacity-50 grayscale cursor-not-allowed hover:scale-100'
              )}
              aria-label={service.label}
            >
              <div
                className={cn(
                  'w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center mb-1.5 relative border transition-all duration-200 group-hover:scale-105',
                  style.squircleClass
                )}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />

                {service.badge && (
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-1.5 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-full shadow-md leading-none border border-white dark:border-slate-900',
                      service.badge === 'MERIT'
                        ? 'bg-purple-600 text-white dark:bg-purple-500 dark:shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                        : service.badge === 'KELAB'
                        ? 'bg-blue-600 text-white dark:bg-blue-500 dark:shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                        : 'bg-rose-600 text-white dark:bg-rose-500 dark:shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                    )}
                  >
                    {service.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-white transition-colors truncate w-full text-center">
                {service.label}
              </span>

              {(service.sublabel || service.description) && (
                <span className="hidden sm:block text-[9px] text-slate-400 dark:text-slate-400/80 truncate w-full">
                  {service.sublabel || service.description}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export default CampusServicesGrid;
