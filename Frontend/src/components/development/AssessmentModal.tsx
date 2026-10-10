import React, { useState, useEffect } from 'react';
import { Button } from '../../design-system';
import { X, AlertCircle } from 'lucide-react';
import {
  academyApi,
} from '../../services/academyApi';
import { buildCreateAssessmentPayload } from './developmentPayload';
import { ApiClientError } from '../../lib/apiClient';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  athleteId: string;
  athleteName?: string;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  athleteId,
  athleteName = 'Athlete',
}) => {
  const [scores, setScores] = useState<Record<string, number>>({
    pace: 7,
    shooting: 7,
    passing: 7,
    dribbling: 7,
    defending: 7,
    stamina: 7,
    agility: 7,
    decisionMaking: 7,
    leadership: 7,
    workRate: 7,
  });
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setScores({
      pace: 7,
      shooting: 7,
      passing: 7,
      dribbling: 7,
      defending: 7,
      stamina: 7,
      agility: 7,
      decisionMaking: 7,
      leadership: 7,
      workRate: 7,
    });
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setErrorBanner(null);
    setFieldErrors({});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScoreChange = (skill: string, value: string) => {
    const val = parseInt(value, 10);
    if (!isNaN(val)) {
      setScores((prev) => ({ ...prev, [skill]: Math.min(10, Math.max(1, val)) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorBanner(null);
    setFieldErrors({});

    try {
      const payload = buildCreateAssessmentPayload({
        pace: scores.pace,
        shooting: scores.shooting,
        passing: scores.passing,
        dribbling: scores.dribbling,
        defending: scores.defending,
        stamina: scores.stamina,
        agility: scores.agility,
        decisionMaking: scores.decisionMaking,
        leadership: scores.leadership,
        workRate: scores.workRate,
        note,
        date: date ? new Date(date).toISOString() : undefined,
      });

      await academyApi.createSkillAssessment(athleteId, payload);
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

  const skillsList = [
    { key: 'pace', label: 'Pace (Speed)' },
    { key: 'shooting', label: 'Shooting' },
    { key: 'passing', label: 'Passing' },
    { key: 'dribbling', label: 'Dribbling' },
    { key: 'defending', label: 'Defending' },
    { key: 'stamina', label: 'Stamina (Endurance)' },
    { key: 'agility', label: 'Agility & Coordination' },
    { key: 'decisionMaking', label: 'Decision Making' },
    { key: 'leadership', label: 'Leadership' },
    { key: 'workRate', label: 'Work Rate' },
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border-2 border-[#171044] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-[#171044] text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-display tracking-wide">
              Skill Assessment
            </h2>
            <p className="text-xs text-white/70">Evaluating {athleteName}</p>
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

          {/* Assessment Date */}
          <div>
            <label className="block text-xs font-bold text-[#171044] uppercase tracking-wider mb-2">
              Assessment Date
            </label>
            <input
              type="date"
              max={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#171044]/20 rounded-xl text-sm focus:outline-none focus:border-[#FF5A00]"
            />
            {fieldErrors.date && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.date}</p>
            )}
          </div>

          {/* 10 Skills Grid */}
          <div>
            <label className="block text-xs font-bold text-[#171044] uppercase tracking-wider mb-3">
              Skill Ratings (1 - 10)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {skillsList.map(({ key, label }) => (
                <div key={key} className="p-3 bg-white border border-[#171044]/10 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#171044]">{label}</span>
                    <span className="font-bold text-[#FF5A00] text-sm">{scores[key]}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={scores[key]}
                    onChange={(e) => handleScoreChange(key, e.target.value)}
                    className="w-full accent-[#FF5A00]"
                  />
                  {fieldErrors[key] && (
                    <p className="text-xs text-red-600">{fieldErrors[key]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-[#171044] uppercase tracking-wider mb-2">
              Coach Assessment Notes (Optional, max 1000 chars)
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Detailed feedback regarding tactical positioning, match discipline..."
              className="w-full px-4 py-2.5 bg-white border border-[#171044]/20 rounded-xl text-sm focus:outline-none focus:border-[#FF5A00]"
            />
            {fieldErrors.note && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.note}</p>
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
              {isSubmitting ? 'Saving Assessment...' : 'Record Assessment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
