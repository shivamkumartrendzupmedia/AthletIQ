import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export interface StatCounterProps {
  value: string | number;
  label: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  variant?: 'light' | 'dark' | 'lime' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatCounter: React.FC<StatCounterProps> = ({
  value,
  label,
  trend,
  trendDirection = 'up',
  icon,
  variant = 'light',
  size = 'md',
  className,
}) => {
  const variantMap = {
    light: 'bg-white text-[#171044] border border-[#171044]/10',
    dark: 'bg-[#171044] text-white border border-white/10',
    lime: 'bg-[#D8F500] text-[#171044]',
    orange: 'bg-[#FF5A00] text-white',
  };

  const sizeMap = {
    sm: { value: 'text-2xl', label: 'text-xs', padding: 'p-4' },
    md: { value: 'text-4xl', label: 'text-sm', padding: 'p-6' },
    lg: { value: 'text-5xl md:text-6xl', label: 'text-base', padding: 'p-8' },
  };

  const selectedSize = sizeMap[size];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={clsx(
        'rounded-2xl font-display transition-all duration-300 flex flex-col justify-between',
        variantMap[variant],
        selectedSize.padding,
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={clsx('font-bold tracking-wide uppercase opacity-75', selectedSize.label)}>
          {label}
        </span>
        {icon && <span className="text-xl opacity-80">{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-1">
        <span className={clsx('font-black tracking-tight leading-none', selectedSize.value)}>
          {value}
        </span>
        {trend && (
          <span
            className={clsx(
              'px-2 py-0.5 text-xs font-extrabold rounded-full',
              trendDirection === 'up' && 'bg-emerald-500/15 text-emerald-600',
              trendDirection === 'down' && 'bg-rose-500/15 text-rose-600',
              trendDirection === 'neutral' && 'bg-slate-500/15 text-slate-600'
            )}
          >
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
};
