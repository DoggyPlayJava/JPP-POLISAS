import React from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SpotlightCardProps } from './landingTypes';

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  onClick,
  spotlightColor = 'rgba(13, 148, 136, 0.09)',
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[2.5rem] bg-white border border-[#B8E4DC] hover:border-[#0D9488] cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_30px_rgba(11,36,32,0.05)] hover:shadow-[0_18px_40px_-10px_rgba(11,36,32,0.1)] transition-[transform,border-color,box-shadow] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] md:hover:-translate-y-1 transform-gpu",
        className
      )}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-500 md:group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
};

export default SpotlightCard;
