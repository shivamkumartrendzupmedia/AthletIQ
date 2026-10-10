import React, { useState, useEffect } from 'react';
import { Button } from '../../design-system';
import { X, AlertCircle } from 'lucide-react';
import {
  academyApi,
} from '../../services/academyApi';
import { buildCreateFeedbackPayload } from './developmentPayload';
import { ApiClientError } from '../../lib/apiClient';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  athleteId: string;
  athleteName?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  athleteId,
  athleteName = 'Athlete',
}) => {
  const [text, setText] = useState('');
  const [type, setType] = useState<'Praise' | 'Improvement' | 'General'>('General');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    setType('General');
    setErrorBanner(null);
    setFieldErrors({});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorBanner(null);
    setFieldErrors({});

    try {
      const payload = buildCreateFeedbackPayload({
        athlete: athleteId,
        text,
        type,
      });

      await academyApi.createCoachFeedback(payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.fieldErrors && err.fieldErrors.length > 0) {
          const bannerText = err.fieldErrors
            .map((f) => `${f.field}: ${f.message}`)
            .join(' | ');
          setErrorBanner(bannerText);

          const fieldMap: Record<string, string> = {};
          err.fieldErrors.forEach((f) => {
            fieldMap[f.field] = f.message;
          });
          setFieldErrors(fieldMap);
        } else {
          setErrorBanner(err.message || 'Operation failed');
        }
      } else {
        setErrorBanner((err as Error).message || 'An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border-2 border-[#171044] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-[#171044] text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-display tracking-wide">
              Coach Feedback
            </h2>
            <p className="text-xs text-white/70">Guidance for {athleteName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorBanner && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="text-xs text-red-700 mt-0.5 whitespace-pre-wrap">
                  {errorBanner}
                </p>
              </div>
            </div>
          )}

          {/* Feedback Type */}
          <div>
            <label className="block text-xs font-bold text-[#171044] uppercase tracking-wider mb-2">
              Feedback Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'Praise' | 'Improvement' | 'General')}
              className="w-full px-4 py-2.5 bg-white border border-[#171044]/20 rounded-xl text-sm focus:outline-none focus:border-[#FF5A00]"
            >
              <option value="General">General Performance Note</option>
              <option value="Praise">Praise & Recognition</option>
              <option value="Improvement">Area for Improvement</option>
            </select>
            {fieldErrors.type && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.type}</p>
            )}
          </div>

          {/* Feedback Text */}
          <div>
            <label className="block text-xs font-bold text-[#171044] uppercase tracking-wider mb-2">
              Feedback Message (max 2000 chars)
            </label>
            <textarea
              required
              rows={4}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Provide constructive feedback, tactical advice, or words of encouragement..."
              className="w-full px-4 py-2.5 bg-white border border-[#171044]/20 rounded-xl text-sm focus:outline-none focus:border-[#FF5A00]"
            />
            {fieldErrors.text && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.text}</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#171044]/10 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Post Feedback'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
