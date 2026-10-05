import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FloatingComposeFabProps {
  onClick: () => void;
  className?: string;
}

export const FloatingComposeFab: React.FC<FloatingComposeFabProps> = ({
  onClick,
  className,
}) => {
  return (
    <div
      className={cn(
        'fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-40 transform-gpu',
        className
      )}
    >
      {/* Ambient glowing aura behind the button */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-rose-500/40 blur-xl animate-pulse -z-10 pointer-events-none scale-125"
      />

      {/* Radiant circular compose button */}
      <button
        type="button"
        role="button"
        onClick={onClick}
        aria-label="Tulis Luahan Rahsia Baharu"
        title="Tulis Luahan Rahsia Baharu"
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-rose-600 via-pink-500 to-rose-400 text-white flex items-center justify-center shadow-[0_8px_25px_rgba(244,63,94,0.45)] cursor-pointer border border-white/25 active:scale-90 transition-transform hover:scale-105 group focus:outline-none focus:ring-4 focus:ring-rose-500/30"
      >
        <Plus className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" />
        <span className="sr-only">Tulis Luahan Rahsia Baharu</span>
      </button>
    </div>
  );
};
