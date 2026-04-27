import React from 'react';
import { cn } from '@/lib/utils';

export function PortalSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 md:px-8 py-32 md:py-40 max-w-7xl mx-auto space-y-16">
      <div className="flex flex-col items-center space-y-8 animate-pulse">
        <div className="w-48 h-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
        <div className="w-full max-w-2xl h-16 md:h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="w-full max-w-md h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto animate-pulse">
        <div className="col-span-2 row-span-2 h-48 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
        <div className="col-span-2 h-20 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
        <div className="col-span-1 h-24 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
        <div className="col-span-1 h-24 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10 max-w-6xl mx-auto animate-pulse mt-12">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[280px] bg-slate-200 dark:bg-slate-800 rounded-[2.5rem] flex flex-col justify-between p-8">
            <div className="w-16 h-16 bg-slate-300 dark:bg-slate-700 rounded-2xl" />
            <div className="space-y-3">
              <div className="w-1/2 h-8 bg-slate-300 dark:bg-slate-700 rounded-xl" />
              <div className="w-3/4 h-4 bg-slate-300 dark:bg-slate-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
