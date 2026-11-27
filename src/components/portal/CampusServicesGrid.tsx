import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();
  const services = getCampusServicesConfig({
    kamsisStatus,
    kbOpenCount: kbStats?.open,
  }, t);

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
      toast(t('portal:service_updating_toast', '{{service}} sedang dikemas kini!', { service: service.label }));
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
      aria-label={t('portal:campus_services_aria', 'Perkhidmatan Kampus')}
      className={cn('w-full', className)}
    >
      <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-3.5">
        {services.map((service) => {
          const Icon = SERVICE_ICONS[service.id] || Landmark;
          const style = SERVICE_STYLES[service.id] || {
            squircleClass:
              'bg-slate-50 text-slate-700 border-slate-200 shadow-xs dark:bg-slate-800/40 dark:text-slate-300 dark:border-white/10',
          };
          const isEnabled = checkEnabled(service.id);

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => handleAction(service)}
              className={cn(
                'relative flex flex-col items-center justify-start text-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 px-1.5 py-2.5 sm:p-3.5 min-h-[84px] sm:min-h-[96px] rounded-[18px] transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97]',
                'bg-white hover:bg-[#F6FBF9] border border-[#B8E4DC]/80 hover:border-[#0F766E]/40 shadow-xs hover:shadow-md',
                'dark:bg-[#13171D] dark:hover:bg-[#1B2028] dark:border-[#252B35] dark:hover:border-[#2DD4BF]/40',
                service.tourClass,
                !isEnabled && !isSuperAdmin && 'opacity-50 grayscale cursor-not-allowed'
              )}
              aria-label={service.label}
            >
              {service.badge && (
                <span
                  className={cn(
                    'absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 text-[9px] font-bold rounded-full shadow-xs leading-none border border-white dark:border-[#13171D]',
                    service.badge === 'MERIT' || service.badge === 'KELAB' || service.badge === 'CLUB'
                      ? 'bg-[#0F766E] text-white'
                      : 'bg-rose-600 text-white font-mono tabular-nums'
                  )}
                >
                  {service.badge}
                </span>
              )}

              <div
                className={cn(
                  'w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center mb-1.5 border transition-transform duration-150 ease-out group-hover:scale-105',
                  style.squircleClass
                )}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <span className="text-[11px] sm:text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] group-hover:text-[#0F766E] dark:group-hover:text-[#2DD4BF] transition-colors leading-tight break-words line-clamp-2 w-full text-center">
                {service.label}
              </span>

              {(service.sublabel || service.description) && (
                <span className="hidden sm:block text-[11px] text-[#3B635C] dark:text-[#94A0B2] truncate w-full mt-0.5">
                  {service.sublabel || service.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default CampusServicesGrid;
