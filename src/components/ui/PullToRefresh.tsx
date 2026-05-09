import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, className, disabled = false }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const MAX_PULL = 120;
  const THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || window.scrollY > 0) return;
    setStartY(e.touches[0].clientY);
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    // Only allow pulling if we are at the very top of the page
    if (window.scrollY > 0) {
      setIsPulling(false);
      setCurrentY(0);
      return;
    }

    const y = e.touches[0].clientY;
    const diff = y - startY;

    if (diff > 0) {
      // Prevent default scroll behavior when pulling down
      if (e.cancelable) e.preventDefault();
      // Apply resistance
      const pullDistance = Math.min(diff * 0.4, MAX_PULL);
      setCurrentY(pullDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || disabled) return;
    setIsPulling(false);

    if (currentY >= THRESHOLD) {
      setIsRefreshing(true);
      setCurrentY(50); // Hold position while refreshing
      
      try {
        await onRefresh();
        // Vibrate on success
        if (navigator.vibrate) navigator.vibrate(50);
      } finally {
        setIsRefreshing(false);
        setCurrentY(0);
      }
    } else {
      setCurrentY(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 flex justify-center items-center overflow-hidden z-50 pointer-events-none transition-opacity duration-200",
          (isPulling || isRefreshing) ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          height: `${Math.max(currentY, isRefreshing ? 50 : 0)}px`,
        }}
      >
        <div 
          className={cn(
            "bg-background/80 glass-premium rounded-full p-2.5 shadow-lg flex items-center justify-center transition-transform",
            !isRefreshing && "rotate-[180deg]",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: !isRefreshing ? `rotate(${Math.min(currentY * 3, 180)}deg)` : undefined
          }}
        >
          <Loader2 className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Main content wrapper */}
      <div 
        className={cn(
          "w-full h-full transition-transform duration-200 will-change-transform",
          !isPulling && "ease-out"
        )}
        style={{
          transform: `translateY(${isRefreshing ? 50 : currentY}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
}
