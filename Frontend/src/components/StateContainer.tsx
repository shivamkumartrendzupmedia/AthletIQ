import React from 'react';
import { RefreshCw, AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '../design-system';

interface StateContainerProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const StateContainer: React.FC<StateContainerProps> = ({
  loading,
  error,
  empty,
  emptyMessage = 'No items found',
  emptyActionLabel,
  onEmptyAction,
  onRetry,
  children,
}) => {
  // Loading state
  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4 bg-white/60 backdrop-blur-md rounded-3xl border border-[#171044]/10 shadow-lg min-h-[220px]">
        <div className="w-12 h-12 rounded-2xl bg-[#171044] text-[#D8F500] flex items-center justify-center animate-spin">
          <RefreshCw size={24} />
        </div>
        <div className="text-center space-y-1">
          <div className="font-black font-display uppercase tracking-wider text-[#171044] text-sm">Loading AthletiQ Data</div>
          <div className="text-xs text-[#171044]/60">Fetching latest biometric & performance telemetry...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-3xl text-center space-y-4 max-w-lg mx-auto my-6 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h4 className="font-black font-display text-red-900 uppercase text-base">Service Connection Issue</h4>
          <p className="text-xs text-red-700 mt-1">{error}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="border-red-300 text-red-700 hover:bg-red-100">
            <RefreshCw size={14} className="mr-2" /> Try Again
          </Button>
        )}
      </div>
    );
  }

  // Empty state
  if (empty) {
    return (
      <div className="p-12 bg-white/80 rounded-3xl border border-[#171044]/10 text-center space-y-4 min-h-[220px] flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F7F1E8] text-[#171044]/40 flex items-center justify-center">
          <Inbox size={28} />
        </div>
        <div className="max-w-sm space-y-1">
          <h4 className="font-black font-display uppercase text-[#171044] text-base">{emptyMessage}</h4>
          <p className="text-xs text-[#171044]/60">There are currently no records available in this section.</p>
        </div>
        {emptyActionLabel && onEmptyAction && (
          <Button variant="primary" size="sm" onClick={onEmptyAction}>
            {emptyActionLabel}
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
