import React from 'react';
import { clsx } from 'clsx';
import { motion, type HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'lime' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-display font-bold rounded-full transition-all duration-300 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:ring-offset-2';

  const sizeClasses = {
    sm: 'px-4 py-1.5 text-xs gap-1.5',
    md: 'px-6 py-3 text-sm md:text-base gap-2',
    lg: 'px-8 py-4 text-base md:text-lg gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-[#FF5A00] text-white shadow-lg hover:bg-[#E04F00] hover:shadow-[#FF5A00]/30 active:scale-95',
    secondary:
      'bg-[#171044] text-white shadow-md hover:bg-[#4B2A9B] hover:shadow-[#171044]/30 active:scale-95',
    lime:
      'bg-[#D8F500] text-[#171044] font-extrabold shadow-md hover:bg-[#C6E000] hover:shadow-[#D8F500]/40 active:scale-95',
    outline:
      'bg-transparent text-[#171044] border-2 border-[#171044]/20 hover:border-[#171044] hover:bg-[#171044]/5 active:scale-95',
    ghost:
      'bg-transparent text-[#171044] hover:bg-[#171044]/10 active:scale-95',
    icon:
      'p-3 rounded-full bg-[#171044]/5 text-[#171044] hover:bg-[#FF5A00] hover:text-white active:scale-90',
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      disabled={disabled || isLoading}
      className={clsx(
        baseClasses,
        variant !== 'icon' && sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {iconLeft && <span className="inline-flex shrink-0">{iconLeft}</span>}
          {children}
          {iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
        </>
      )}
    </motion.button>
  );
};
