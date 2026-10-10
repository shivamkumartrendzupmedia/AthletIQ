import React, { useState, useEffect } from 'react';
import { Button } from '../../design-system';
import { X, AlertCircle } from 'lucide-react';
import {
  academyApi,
  type AthleteGoalItem,
} from '../../services/academyApi';
import {
  buildCreateGoalPayload,
  buildUpdateGoalPayload,
} from './developmentPayload';
import { ApiClientError } from '../../lib/apiClient';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  athleteId: string;
  goal?: AthleteGoalItem | null;
  role?: string;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  athleteId,
  goal,
  role = 'Admin',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<'Active' | 'Achieved' | 'Dropped'>('Active');
  const [progress, setProgress] = useState<number>(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAthlete = role === 'Athlete';
  const isEditing = Boolean(goal);

  useEffect(() => {
    if (!isOpen) return;
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setTargetDate(goal.targetDate ? goal.targetDate.split('T')[0] : '');
      setStatus(goal.status as 'Active' | 'Achieved' | 'Dropped');
      setProgress(goal.progress);
    } else {
      setTitle('');
      setDescription('');
      const defaultDate = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];
      setTargetDate(defaultDate);
      setStatus('Active');
      setProgress(0);
    }
    setErrorBanner(null);
    setFieldErrors({});
  }, [isOpen, goal]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorBanner(null);
    setFieldErrors({});

    try {
      if (isEditing && goal) {
        if (isAthlete) {
          // Athlete only updates progress
          await academyApi.updateAthleteGoal(goal.id, { progress });
        } else {
          const payload = buildUpdateGoalPayload({
            title,
            description,
            targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
            status,
            progress,
          });
          await academyApi.updateAthleteGoal(goal.id, payload);
        }
      } else {
        const payload = buildCreateGoalPayload({
          title,
          description,
          targetDate: new Date(targetDate).toISOString(),
          status,
          progress,
        });
        await academyApi.createAthleteGoal(athleteId, payload);
      }
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
              {isEditing ? (isAthlete ? 'Update Goal Progress' : 'Edit Goal') : 'Set Development Goal'}
            </h2>
            <p className="text-xs text-white/70">
              {isAthlete ? 'Track your personal milestone' : 'Assign target milestones'}
            </p>
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

          {/* If athlete on edit, only show progress */}
          {isEditing && isAthlete ? (
            <div className="space-y-4">
              <div className="p-4 bg-white border border-[#171044]/10 rounded-xl">
                <h4 className="font-bold text-[#171044] text-base">{goal?.title}</h4>
                {goal?.description && (
                  <p className="text-xs text-[#171044]/70 mt-1">{goal.description}</p>
                )}
                <p className="text-xs text-[#FF5A00] font-semibold mt-2">
                  Target: {goal?.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[#171044] uppercase tracking-wider">
                    Progress Percentage
                  </label>
                  <span className="font-bold text-[#FF5A00] text-sm">{progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-[#FF5A00]"
                />
                {fieldErrors.progress && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.progress}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-[#171044] uppercase tracking-wider mb-2">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Weak-Foot Finishing"
                  className="w-full px-4 py-2.5 bg-white border border-[#171044]/20 rounded-xl text-sm focus:outline-none focus:border-[#FF5A00]"
                />
                {fieldErrors.title && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#171044] uppercase tracking-wider mb-2">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specific drills, drills completed per week..."
                  className="w-full px-4 py-2.5 bg-white border border-[#171044]/20 rounded-xl text-sm focus:outline-none focus:border-[#FF5A00]"
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Target Date */}
                <div>
                  <label className="block text-xs font-bold text-[#171044] uppercase tracking-wider mb-2">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#171044]/20 rounded-xl text-sm focus:outline-none focus:border-[#FF5A00]"
                  />
                  {fieldErrors.targetDate && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.targetDate}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-[#171044] uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Active' | 'Achieved' | 'Dropped')}
                    className="w-full px-4 py-2.5 bg-white border border-[#171044]/20 rounded-xl text-sm focus:outline-none focus:border-[#FF5A00]"
                  >
                    <option value="Active">Active</option>
                    <option value="Achieved">Achieved</option>
                    <option value="Dropped">Dropped</option>
                  </select>
                  {fieldErrors.status && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.status}</p>
                  )}
                </div>
              </div>

              {/* Progress Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[#171044] uppercase tracking-wider">
                    Progress Percentage
                  </label>
                  <span className="font-bold text-[#FF5A00] text-sm">{progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-[#FF5A00]"
                />
                {fieldErrors.progress && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.progress}</p>
                )}
              </div>
            </div>
          )}

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
              {isSubmitting ? 'Saving Goal...' : isEditing ? 'Update Goal' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
