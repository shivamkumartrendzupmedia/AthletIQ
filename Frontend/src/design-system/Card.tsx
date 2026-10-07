import React from 'react';
import { clsx } from 'clsx';
import { motion, type HTMLMotionProps } from 'framer-motion';

export interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?:
    | 'standard'
    | 'dark'
    | 'image'
    | 'statistic'
    | 'athlete'
    | 'coach'
    | 'team'
    | 'tournament'
    | 'performance'
    | 'match';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'standard',
  padding = 'md',
  hoverable = true,
  className,
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantClasses = {
    standard:
      'bg-white text-[#111111] border border-[#171044]/10 shadow-[0_10px_30px_-10px_rgba(23,16,68,0.08)]',
    dark:
      'bg-[#171044] text-white border border-white/10 shadow-[0_15px_35px_-10px_rgba(17,10,44,0.3)]',
    image:
      'bg-slate-900 text-white overflow-hidden relative border border-white/10 shadow-xl',
    statistic:
      'bg-white text-[#111111] border border-[#171044]/10 shadow-md hover:border-[#FF5A00]/40',
    athlete:
      'bg-white text-[#111111] border border-[#171044]/10 shadow-lg relative overflow-hidden',
    coach:
      'bg-white text-[#111111] border border-[#171044]/10 shadow-md text-center',
    team:
      'bg-gradient-to-br from-[#171044] to-[#4B2A9B] text-white border border-white/10 shadow-xl',
    tournament:
      'bg-white text-[#111111] border-2 border-[#171044]/10 shadow-md hover:border-[#4B2A9B]',
    performance:
      'bg-white text-[#111111] border border-[#171044]/10 shadow-lg',
    match:
      'bg-[#171044] text-white border border-white/10 shadow-2xl relative overflow-hidden',
  };

  return (
    <motion.div
      whileHover={hoverable ? { y: -4, transition: { duration: 0.25 } } : undefined}
      className={clsx(
        'rounded-3xl transition-all duration-300',
        paddingClasses[padding],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
