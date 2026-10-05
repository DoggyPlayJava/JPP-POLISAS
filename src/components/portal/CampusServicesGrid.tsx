import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bike,
  Store,
  Layers,
  Building2,
  CalendarDays,
  HeartHandshake,
  QrCode,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getCampusServicesConfig, CampusServiceItem } from '@/lib/superAppHelpers';

export interface CampusServicesGridProps {
  isModuleEnabled: (id: string) => boolean;
  isSuperAdmin: boolean;
  onOpenPolymartModal: () => void;
  onOpenKamsisModal: () => void;
  kamsisStatus: string | null;
  kbStats: { open: number; resolved: number } | null;
  className?: string;
}

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  polyrider: Bike,
  polymart: Store,
  polyservices: Layers,
  kamsis: Building2,
  ems: CalendarDays,
  kebajikan: HeartHandshake,
  akademik_qr: QrCode,
  ekpp: Users,
};

const SERVICE_STYLES: Record<string, { squircleClass: string }> = {
  polyrider: {
    squircleClass:
      'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/25 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/15',
  },
  polymart: {
    squircleClass:
      'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/25 group-hover:border-amber-500/50 group-hover:bg-amber-500/15',
  },
  polyservices: {
    squircleClass:
      'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/25 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/15',
  },
  kamsis: {
    squircleClass:
      'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border-sky-500/25 group-hover:border-sky-500/50 group-hover:bg-sky-500/15',
  },
  ems: {
    squircleClass:
      'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/25 group-hover:border-rose-500/50 group-hover:bg-rose-500/15',
  },
  kebajikan: {
    squircleClass:
      'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border-teal-500/25 group-hover:border-teal-500/50 group-hover:bg-teal-500/15',
  },
  akademik_qr: {
    squircleClass:
      'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/25 group-hover:border-purple-500/50 group-hover:bg-purple-500/15',
  },
  ekpp: {
    squircleClass:
      'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/25 group-hover:border-orange-500/50 group-hover:bg-orange-500/15',
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
      case 'polyservices':
        return isModuleEnabled('keusahawanan') || isModuleEnabled(serviceId);
      case 'akademik_qr':
        return isModuleEnabled('akademik') || isModuleEnabled(serviceId);
      case 'kebajikan':
        return isModuleEnabled('kebajikan');
      case 'ems':
        return isModuleEnabled('ems');
      case 'ekpp':
        return isModuleEnabled('ekpp');
      case 'polyrider':
        return isModuleEnabled('polyrider') !== false;
      case 'kamsis':
        return isModuleEnabled('kamsis') !== false;
      default:
        return isModuleEnabled(serviceId);
    }
  };

  const handleAction = (service: CampusServiceItem) => {
    const isEnabled = checkEnabled(service.id);
    if (!isEnabled && !isSuperAdmin) {
      toast(`${service.label} sedang dikemas kini!`, { icon: '🚧' });
      return;
    }

    if (service.id === 'polyservices' || service.routeOrAction === 'modal:polymart') {
      onOpenPolymartModal();
    } else if (service.id === 'kamsis' || service.routeOrAction === 'modal:kamsis') {
      onOpenKamsisModal();
    } else if (service.routeOrAction.startsWith('/')) {
      navigate(service.routeOrAction);
    }
  };

  return (
    <section
      aria-label="Perkhidmatan Kampus"
      className={cn('w-full max-w-4xl mx-auto px-4', className)}
    >
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
        {services.map((service) => {
          const Icon = SERVICE_ICONS[service.id] || Layers;
          const style = SERVICE_STYLES[service.id] || {
            squircleClass:
              'bg-slate-500/10 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-300 dark:border-white/10',
          };
          const isEnabled = checkEnabled(service.id);

          return (
            <motion.button
              key={service.id}
              type="button"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              onClick={() => handleAction(service)}
              className={cn(
                'flex flex-col items-center justify-start text-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-2xl p-1.5 sm:p-2 transition-all',
                service.tourClass,
                !isEnabled && !isSuperAdmin && 'opacity-50 grayscale cursor-not-allowed hover:scale-100'
              )}
              aria-label={service.label}
            >
              <div
                className={cn(
                  'w-13 h-13 sm:w-16 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center relative shadow-sm border transition-all duration-200 group-hover:shadow-md',
                  style.squircleClass
                )}
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" />

                {service.badge && (
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full shadow-md leading-none border border-white dark:border-slate-900',
                      service.badge === 'LULUS'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    )}
                  >
                    {service.badge}
                  </span>
                )}
              </div>

              <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white transition-colors line-clamp-1">
                {service.label}
              </span>

              {service.description && (
                <span className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {service.description}
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
