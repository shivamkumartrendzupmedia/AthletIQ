import React from 'react';
import { Link } from 'react-router-dom';
import { Button, CrossAccent } from '../design-system';
import { Home, Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F1E8] text-[#171044] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="relative inline-block">
          <div className="text-8xl md:text-9xl font-black font-display text-[#171044]/10 tracking-widest select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl md:text-4xl font-black font-display text-[#FF5A00] uppercase tracking-tight">
              Off Target <CrossAccent color="lime" size="md" />
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-[#171044]">
            Page Not Found
          </h1>
          <p className="text-sm md:text-base text-[#171044]/70 max-w-md mx-auto leading-relaxed">
            The play you called doesn't exist. The page may have been moved, renamed, or is temporarily out of bounds.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="primary" size="lg" iconLeft={<Home size={18} />}>
              Back to Home
            </Button>
          </Link>
          <Link to="/programs">
            <Button variant="outline" size="lg" iconLeft={<Compass size={18} />}>
              Explore Programs
            </Button>
          </Link>
        </div>

        <div className="pt-8 border-t border-[#171044]/10 text-xs text-[#171044]/50">
          Looking for a specific match or tournament?{' '}
          <Link to="/tournaments" className="text-[#FF5A00] font-bold hover:underline">
            View Tournaments
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
