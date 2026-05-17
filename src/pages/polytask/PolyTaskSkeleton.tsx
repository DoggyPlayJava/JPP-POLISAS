import React from 'react';

export function PolyTaskSkeletonCard() {
  return (
    <div className="relative bg-slate-900 border border-white/5 rounded-3xl p-6 flex flex-col h-full animate-pulse overflow-hidden">
      {/* Background shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      {/* Header: Requester Info & Price */}
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className="flex items-center gap-3 w-full">
          {/* Avatar Skeleton */}
          <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            {/* Name Skeleton */}
            <div className="h-4 bg-slate-800 rounded w-24" />
            {/* Time Skeleton */}
            <div className="h-2 bg-slate-800 rounded w-16" />
          </div>
        </div>
        {/* Price Skeleton */}
        <div className="shrink-0 bg-slate-800 w-16 h-8 rounded-xl" />
      </div>

      {/* Job Title Skeleton */}
      <div className="space-y-2 mb-8 relative z-10">
        <div className="h-6 bg-slate-800 rounded-md w-full" />
        <div className="h-6 bg-slate-800 rounded-md w-2/3" />
      </div>

      {/* Meta Data Skeleton */}
      <div className="mt-auto pt-4 flex gap-2 relative z-10">
        <div className="h-6 bg-slate-800 rounded-lg w-20" />
        <div className="h-6 bg-slate-800 rounded-lg w-24" />
        <div className="h-6 bg-slate-800 rounded-lg w-20" />
      </div>
    </div>
  );
}

// Add this into your global index.css or tailwind config:
// @keyframes shimmer {
//   100% {
//     transform: translateX(100%);
//   }
// }

export function PolyTaskJobDetailSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen pb-24">
      {/* Back Button Skeleton */}
      <div className="w-24 h-5 bg-slate-800 rounded animate-pulse mb-6" />

      {/* Main Job Card Skeleton */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden animate-pulse">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        
        {/* Status Pill Skeleton */}
        <div className="absolute top-0 right-0 p-6">
          <div className="w-24 h-6 bg-slate-800 rounded-full" />
        </div>

        {/* Category Pill Skeleton */}
        <div className="w-20 h-6 bg-slate-800 rounded-full mb-4 mt-8 md:mt-0" />
        
        {/* Title Skeleton */}
        <div className="w-3/4 h-8 bg-slate-800 rounded mb-4" />
        
        {/* Description Skeleton */}
        <div className="space-y-2 mb-8">
          <div className="w-full h-4 bg-slate-800 rounded" />
          <div className="w-full h-4 bg-slate-800 rounded" />
          <div className="w-2/3 h-4 bg-slate-800 rounded" />
        </div>

        {/* 3 Columns Skeleton (Location, Date, Budget) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/5">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
              <div className="space-y-2">
                <div className="w-16 h-3 bg-slate-800 rounded" />
                <div className="w-24 h-4 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Requester Info Skeleton */}
        <div className="mt-8 p-4 bg-slate-950/50 rounded-2xl flex items-center justify-between border border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0" />
            <div className="space-y-2">
              <div className="w-24 h-3 bg-slate-800 rounded" />
              <div className="w-32 h-4 bg-slate-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
