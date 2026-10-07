import React from 'react';
import { clsx } from 'clsx';
import { CrossAccent } from './GraphicAccents';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showCross?: boolean;
  crossColor?: 'orange' | 'lime' | 'white' | 'purple';
  theme?: 'light' | 'dark';
  align?: 'left' | 'center' | 'between';
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  showCross = true,
  crossColor = 'orange',
  theme = 'light',
  align = 'between',
  className,
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={clsx(
        'w-full mb-8 md:mb-12 flex flex-col md:flex-row gap-4',
        align === 'center' && 'items-center text-center',
        align === 'between' && 'items-start md:items-end justify-between',
        align === 'left' && 'items-start text-left',
        className
      )}
    >
      <div className="max-w-2xl">
        <h2
          className={clsx(
            'text-3xl md:text-5xl font-black font-display tracking-tight leading-none',
            isDark ? 'text-white' : 'text-[#171044]'
          )}
        >
          {title}
          {showCross && <CrossAccent color={crossColor} size="lg" />}
        </h2>
        {subtitle && (
          <p
            className={clsx(
              'mt-3 text-base md:text-lg font-medium leading-relaxed',
              isDark ? 'text-white/70' : 'text-[#171044]/70'
            )}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
