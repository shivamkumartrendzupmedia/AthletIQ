import React from 'react';
import { clsx } from 'clsx';

interface CrossAccentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'lime' | 'white' | 'purple';
  className?: string;
}

export const CrossAccent: React.FC<CrossAccentProps> = ({
  size = 'md',
  color = 'orange',
  className,
}) => {
  const sizeClasses = {
    sm: 'text-base font-bold ml-1',
    md: 'text-2xl font-black ml-1.5',
    lg: 'text-4xl font-black ml-2',
  };

  const colorClasses = {
    orange: 'text-[#FF5A00]',
    lime: 'text-[#D8F500]',
    white: 'text-white',
    purple: 'text-[#4B2A9B]',
  };

  return (
    <span
      className={clsx(
        'inline-block select-none transition-transform duration-300 hover:rotate-90',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      aria-hidden="true"
    >
      +
    </span>
  );
};

interface AthleticBadgeProps {
  children: React.ReactNode;
  variant?: 'lime' | 'orange' | 'dark' | 'purple' | 'white' | 'live';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const AthleticBadge: React.FC<AthleticBadgeProps> = ({
  children,
  variant = 'lime',
  size = 'md',
  icon,
  className,
}) => {
  const variantClasses = {
    lime: 'bg-[#D8F500] text-[#171044] font-extrabold',
    orange: 'bg-[#FF5A00] text-white font-extrabold',
    dark: 'bg-[#171044] text-white font-bold',
    purple: 'bg-[#4B2A9B] text-white font-bold',
    white: 'bg-white text-[#171044] font-bold border border-black/10 shadow-sm',
    live: 'bg-[#FF5A00] text-white font-black tracking-wider animate-pulse',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs rounded-full',
    md: 'px-3.5 py-1 text-xs md:text-sm rounded-full',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-display uppercase tracking-wide uppercase',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {variant === 'live' && (
        <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" />
      )}
      {icon}
      {children}
    </span>
  );
};

interface RadialScoreMeterProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'lime' | 'orange';
}

export const RadialScoreMeter: React.FC<RadialScoreMeterProps> = ({
  score,
  label = 'OVR',
  size = 'md',
  color = 'purple',
}) => {
  const sizeMap = {
    sm: { container: 'w-12 h-12', text: 'text-sm font-black', subText: 'text-[9px]' },
    md: { container: 'w-16 h-16', text: 'text-xl font-black', subText: 'text-[10px]' },
    lg: { container: 'w-24 h-24', text: 'text-3xl font-black', subText: 'text-xs' },
  };

  const bgMap = {
    purple: 'bg-[#4B2A9B] text-white ring-4 ring-[#4B2A9B]/20',
    lime: 'bg-[#D8F500] text-[#171044] ring-4 ring-[#D8F500]/30',
    orange: 'bg-[#FF5A00] text-white ring-4 ring-[#FF5A00]/30',
  };

  const selectedSize = sizeMap[size];

  return (
    <div
      className={clsx(
        'rounded-full flex flex-col items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105',
        selectedSize.container,
        bgMap[color]
      )}
    >
      <span className={clsx('font-display leading-none', selectedSize.text)}>{score}</span>
      {label && (
        <span className={clsx('font-display uppercase tracking-wider font-semibold opacity-90 mt-0.5', selectedSize.subText)}>
          {label}
        </span>
      )}
    </div>
  );
};
