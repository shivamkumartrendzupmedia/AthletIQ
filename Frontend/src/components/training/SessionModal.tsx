import React, { useState, useEffect } from 'react';
import { CrossAccent, Button } from '../../design-system';
import { X, AlertCircle } from 'lucide-react';
import {
  academyApi,
  type TrainingSessionItem,
  type TeamItem,
  type CoachItem,
  mapFieldErrors,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';
import {
  toDatetimeLocalString,
  fromDatetimeLocalString,
  getBrowserTimeZone,
} from '../../lib/datetime';
import {
  buildCreateSessionPayload,
  buildUpdateSessionPayload,
} from './sessionPayload';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sessionToEdit: TrainingSessionItem | null;
  teams: TeamItem[];
  coaches: CoachItem[];
  isAdmin: boolean;
}

const SESSION_TYPES = [
  'Training',
  'Match',
  'Gym',
  'Recovery',
  'Other',
] as const;

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sessionToEdit,
  teams,
  coaches,
  isAdmin,
}) => {
  const browserTz = getBrowserTimeZone();

  const [title, setTitle] = useState('');
  const [teamId, setTeamId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [type, setType] = useState<(typeof SESSION_TYPES)[number]>('Training');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    setGeneralError(null);
    setFieldErrors({});

    if (sessionToEdit) {
      setTitle(sessionToEdit.title ?? '');
      setTeamId(sessionToEdit.team?.id ?? '');
      setCoachId(sessionToEdit.coach?.id ?? '');
      setType(sessionToEdit.type || 'Training');
      setStartsAtLocal(toDatetimeLocalString(sessionToEdit.startsAt, browserTz));
      setEndsAtLocal(toDatetimeLocalString(sessionToEdit.endsAt, browserTz));
      setVenue(sessionToEdit.venue ?? '');
      setNotes(sessionToEdit.notes ?? '');
    } else {
      setTitle('');
      setTeamId(teams.length > 0 ? teams[0].id : '');
      setCoachId('');
      setType('Training');

      // Default start: today at next top-of-hour, duration 90 minutes
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      const later = new Date(now.getTime() + 90 * 60 * 1000);

      setStartsAtLocal(toDatetimeLocalString(now.toISOString(), browserTz));
      setEndsAtLocal(toDatetimeLocalString(later.toISOString(), browserTz));
      setVenue('');
      setNotes('');
    }
  }, [isOpen, sessionToEdit, teams, browserTz]);

  if (!isOpen) return null;

  const isCompletedOrCancelled =
    sessionToEdit?.status === 'Completed' || sessionToEdit?.status === 'Cancelled';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFieldErrors((prev) => ({ ...prev, title: 'Session title is required' }));
      return;
    }

    const trimmedVenue = venue.trim();
    if (!trimmedVenue) {
      setFieldErrors((prev) => ({ ...prev, venue: 'Venue is required' }));
      return;
    }

    const startsAtUtc = fromDatetimeLocalString(startsAtLocal, browserTz);
    const endsAtUtc = fromDatetimeLocalString(endsAtLocal, browserTz);

    if (!startsAtUtc || !endsAtUtc) {
      setGeneralError('Please enter valid start and end dates and times.');
      return;
    }

    const startDate = new Date(startsAtUtc);
    const endDate = new Date(endsAtUtc);
    if (startDate >= endDate) {
      setGeneralError('Start time must be before end time.');
      return;
    }

    if (endDate.getTime() - startDate.getTime() > 12 * 60 * 60 * 1000) {
      setGeneralError('Session duration cannot exceed 12 hours.');
      return;
    }

    setSubmitting(true);
    try {
      if (sessionToEdit) {
        const payload = buildUpdateSessionPayload(
          {
            title,
            type,
            venue,
            startsAtUtc,
            endsAtUtc,
            coachId,
            notes,
          },
          { isCompletedOrCancelled, isAdmin }
        );
        await academyApi.updateTrainingSession(sessionToEdit.id, payload);
      } else {
        const payload = buildCreateSessionPayload({
          teamId,
          title,
          type,
          startsAtUtc,
          endsAtUtc,
          venue,
          coachId,
          notes,
        });
        await academyApi.createTrainingSession(payload);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setGeneralError(
            err.message ||
              'A scheduling conflict occurred: This team already has an active session during this time.'
          );
        } else {
          const fieldDetails =
            err.fieldErrors && err.fieldErrors.length > 0
              ? `: ${err.fieldErrors.map((f) => `${f.field}: ${f.message}`).join(', ')}`
              : '';
          setGeneralError(`${err.message || 'Validation failed'}${fieldDetails}`);
        }
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
      setFieldErrors(mapFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
    >
      <div className="bg-[#171044] text-white p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-6 border border-white/20 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <h2 id="session-modal-title" className="text-2xl font-black font-display text-white flex items-center gap-2">
            {sessionToEdit ? 'Edit Session' : 'Schedule Session'}
            <CrossAccent color="lime" size="sm" />
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg transition"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {generalError && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <span>{generalError}</span>
          </div>
        )}

        {isCompletedOrCancelled && (
          <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-200 text-xs">
            This session is <strong>{sessionToEdit?.status}</strong>. Start and end times cannot be modified.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tactical Positioning Drills"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
            />
            {fieldErrors.title && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase mb-1">
                Team *
              </label>
              {sessionToEdit ? (
                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/60 text-sm">
                  {sessionToEdit.team?.name || 'Assigned Team'}
                </div>
              ) : (
                <select
                  required
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full bg-[#171044] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                >
                  {teams.length === 0 && <option value="">No teams available</option>}
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.sport?.name || t.ageGroup})
                    </option>
                  ))}
                </select>
              )}
              {fieldErrors.teamId && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.teamId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase mb-1">
                Session Type *
              </label>
              <select
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value as (typeof SESSION_TYPES)[number]
                  )
                }
                className="w-full bg-[#171044] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
              >
                {SESSION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {fieldErrors.type && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.type}</p>
              )}
            </div>
          </div>

          {isAdmin && coaches.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase mb-1">
                Assigned Coach (Optional)
              </label>
              <select
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                className="w-full bg-[#171044] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
              >
                <option value="">Team's Primary Coach</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user?.name || c.title}
                  </option>
                ))}
              </select>
              {fieldErrors.coachId && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.coachId}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                required
                disabled={isCompletedOrCancelled}
                value={startsAtLocal}
                onChange={(e) => setStartsAtLocal(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500] disabled:opacity-50"
              />
              {fieldErrors.startsAt && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.startsAt}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                required
                disabled={isCompletedOrCancelled}
                value={endsAtLocal}
                onChange={(e) => setEndsAtLocal(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500] disabled:opacity-50"
              />
              {fieldErrors.endsAt && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.endsAt}</p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-white/60">
            Time zone: <span className="text-[#D8F500] font-mono">{browserTz}</span> (saved as UTC).
          </p>

          <div>
            <label className="block text-xs font-bold text-white/80 uppercase mb-1">
              Location / Pitch *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pitch A (Turf) or Main Court"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
            />
            {fieldErrors.venue && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.venue}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 uppercase mb-1">
              Notes / Objectives (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Warmup, set-pieces, recovery cooldown"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
            />
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="text-white hover:text-white/80"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="lime"
              disabled={submitting || (teams.length === 0 && !sessionToEdit)}
            >
              {submitting ? 'Saving...' : sessionToEdit ? 'Save Changes' : 'Schedule Session'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
