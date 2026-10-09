import React, { useState, useEffect, useCallback } from 'react';
import { CrossAccent, Button, AthleticBadge } from '../../design-system';
import { X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import {
  academyApi,
  type RosterAttendanceItem,
  type AttendanceSummary,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  startsAt: string;
  onSuccess: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  startsAt,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [records, setRecords] = useState<RosterAttendanceItem[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  const isFuture = new Date(startsAt) > new Date();

  const fetchAttendance = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await academyApi.getSessionAttendance(sessionId);
      if (res) {
        setRecords(res.records || []);
        setSummary(res.summary || null);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorBanner(err.message || 'Failed to load roster attendance.');
      } else {
        setErrorBanner('An unexpected error occurred while loading attendance.');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (isOpen) {
      fetchAttendance();
    }
  }, [isOpen, fetchAttendance]);

  if (!isOpen) return null;

  const handleStatusChange = (
    index: number,
    newStatus: 'Present' | 'Late' | 'Excused' | 'Absent'
  ) => {
    setRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
  };

  const handleNoteChange = (index: number, newNote: string) => {
    setRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], note: newNote };
      return updated;
    });
  };

  const handleMarkAllPresent = () => {
    setRecords((prev) =>
      prev.map((rec) => ({
        ...rec,
        status: 'Present',
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFuture) {
      setErrorBanner('Attendance can only be marked once the session has started.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);
    try {
      const payload = records.map((r) => ({
        athlete: r.athleteId,
        status: r.status,
        note: r.note?.trim() ? r.note.trim() : undefined,
      }));

      await academyApi.markSessionAttendance(sessionId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorBanner(err.message || 'Failed to save attendance records.');
      } else {
        setErrorBanner('An unexpected error occurred while saving.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Compute live counts
  const livePresent = records.filter((r) => r.status === 'Present').length;
  const liveLate = records.filter((r) => r.status === 'Late').length;
  const liveExcused = records.filter((r) => r.status === 'Excused').length;
  const liveAbsent = records.filter((r) => r.status === 'Absent').length;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-modal-title"
    >
      <div className="bg-[#171044] text-white p-6 md:p-8 rounded-3xl max-w-2xl w-full space-y-6 border border-white/20 shadow-2xl my-8">
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-[#D8F500]">
                Roster Attendance
              </span>
              <CrossAccent color="lime" size="sm" />
            </div>
            <h2 id="attendance-modal-title" className="text-xl md:text-2xl font-black font-display text-white mt-1">
              {sessionTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg transition"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {errorBanner && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <span>{errorBanner}</span>
          </div>
        )}

        {isFuture && (
          <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-200 text-xs flex items-start gap-2">
            <Clock size={16} className="shrink-0 mt-0.5 text-amber-400" />
            <span>
              This session is scheduled in the future. Attendance can only be marked once the session has started.
            </span>
          </div>
        )}

        {/* Live Counters */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5">
            <div className="text-xs font-bold text-emerald-400">Present</div>
            <div className="text-lg font-black text-emerald-300">{livePresent}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
            <div className="text-xs font-bold text-amber-400">Late</div>
            <div className="text-lg font-black text-amber-300">{liveLate}</div>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-2.5">
            <div className="text-xs font-bold text-sky-400">Excused</div>
            <div className="text-lg font-black text-sky-300">{liveExcused}</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5">
            <div className="text-xs font-bold text-rose-400">Absent</div>
            <div className="text-lg font-black text-rose-300">{liveAbsent}</div>
          </div>
        </div>

        {/* Roster Table */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white/80 uppercase">
              Athletes ({records.length})
            </span>
            {!isFuture && records.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="text-xs text-[#D8F500] hover:underline font-bold flex items-center gap-1"
              >
                <CheckCircle2 size={14} /> Mark All Present
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-white/60 text-sm">
              Loading roster attendance...
            </div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-white/60 text-sm bg-white/5 rounded-2xl border border-white/10">
              No athletes found for this session's team.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {records.map((rec, idx) => (
                <div
                  key={rec.athleteId}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-white truncate">
                      {rec.athleteName}
                    </span>
                    {!rec.onRoster && (
                      <AthleticBadge variant="dark">Former</AthleticBadge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <div className="inline-flex rounded-lg bg-black/40 p-0.5 border border-white/10">
                      {(['Present', 'Late', 'Excused', 'Absent'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={isFuture}
                          onClick={() => handleStatusChange(idx, st)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition disabled:opacity-50 ${
                            rec.status === st
                              ? st === 'Present'
                                ? 'bg-emerald-500 text-white shadow'
                                : st === 'Late'
                                ? 'bg-amber-500 text-white shadow'
                                : st === 'Excused'
                                ? 'bg-sky-500 text-white shadow'
                                : 'bg-rose-500 text-white shadow'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Note (optional)"
                      disabled={isFuture}
                      value={rec.note || ''}
                      onChange={(e) => handleNoteChange(idx, e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/40 w-32 outline-none focus:border-[#D8F500] disabled:opacity-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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
            type="button"
            variant="lime"
            onClick={handleSubmit}
            disabled={submitting || isFuture || records.length === 0}
          >
            {submitting ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>
    </div>
  );
};
