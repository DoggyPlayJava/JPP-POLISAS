import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';

interface SwipeToSOSProps {
  onTrigger: () => void;
  disabled?: boolean;
}

export function SwipeToSOS({ onTrigger, disabled = false }: SwipeToSOSProps) {
  const [isTriggered, setIsTriggered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Motion values
  const x = useMotionValue(0);
  const controls = useAnimation();

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate dynamic threshold based on container width
  const knobWidth = 64; // w-16 = 4rem = 64px
  const padding = 8;
  const maxDrag = Math.max(0, containerWidth - knobWidth - padding * 2);
  const threshold = maxDrag * 0.85; // Require 85% swipe to trigger

  // Styling transformations based on drag progress
  const opacity = useTransform(x, [0, threshold], [1, 0]);
  const background = useTransform(
    x,
    [0, maxDrag],
    ['rgb(239, 68, 68)', 'rgb(153, 27, 27)'] // From red-500 to red-800
  );

  const handleDragEnd = async (event: any, info: any) => {
    if (disabled || isTriggered) return;

    if (info.offset.x >= threshold) {
      setIsTriggered(true);
      
      // Snap to end
      await controls.start({ x: maxDrag, transition: { duration: 0.2 } });
      
      // Give users a 5-second countdown to cancel if they want to
      if (window.confirm("AMARAN: Ini adalah panggilan kecemasan. Menyalahgunakan butang SOS dengan niat khianat akan menyebabkan akaun anda DIGANTUNG. Teruskan?")) {
        onTrigger();
      } else {
        // Reset if cancelled
        setIsTriggered(false);
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      }
    } else {
      // Snap back to start if not dragged far enough
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  return (
    <div className="w-full py-4">
      <p className="text-xs text-center text-red-500/80 mb-2 font-medium">
        Hanya untuk kecemasan. Akaun akan digantung jika didapati khianat.
      </p>
      
      <div 
        ref={containerRef}
        className="relative h-16 rounded-full overflow-hidden bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900 shadow-inner flex items-center justify-center"
      >
        {/* Background text that fades out as you drag */}
        <motion.span 
          style={{ opacity }}
          className="absolute z-0 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider text-sm select-none pointer-events-none"
        >
          Sapu Untuk SOS
        </motion.span>
        
        {/* The draggable knob */}
        <div className="absolute left-2 top-2 bottom-2 z-10 w-full pointer-events-none">
          <motion.div
            drag={disabled || isTriggered ? false : "x"}
            dragConstraints={{ left: 0, right: maxDrag }}
            dragElastic={0.05}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            animate={controls}
            style={{ x, background }}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center 
              shadow-md cursor-grab active:cursor-grabbing pointer-events-auto
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${isTriggered ? 'cursor-default' : ''}
            `}
          >
            <AlertTriangle className="w-6 h-6 text-white" />
          </motion.div>
        </div>
        
        {/* The active trail behind the knob */}
        <motion.div 
          className="absolute left-0 top-0 bottom-0 bg-red-500/20 z-0"
          style={{ width: useTransform(x, (val) => val + knobWidth / 2 + padding) }}
        />
      </div>
    </div>
  );
}
