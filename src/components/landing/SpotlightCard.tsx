import React from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SpotlightCardProps } from './landingTypes';

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  onClick,
  spotlightColor = 'rgba(201, 111, 79, 0.09)',
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
        "group relative overflow-hidden rounded-[2.5rem] bg-white border border-[#D9C9B2] hover:border-[#6B7F5B] cursor-pointer shadow-[0_4px_25px_rgba(46,58,47,0.04)] hover:shadow-[0_12px_35px_rgba(46,58,47,0.08)] transition-all duration-300 transform-gpu",
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
