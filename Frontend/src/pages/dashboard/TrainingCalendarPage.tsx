import React, { useState, useEffect, useCallback } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import {
  Clock,
  MapPin,
  Plus,
  CheckCircle2,
  Users,
  Edit2,
  XCircle,
  Trash2,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { StateContainer } from '../../components/StateContainer';
import { useAuth } from '../../context/AuthContext';
import {
  academyApi,
  type TrainingSessionItem,
  type TeamItem,
  type CoachItem,
  type AthleteAttendanceSummary,
  type SessionType,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';
import {
  formatSessionTimeRange,
  getBrowserTimeZone,
  formatSessionStartHint,
} from '../../lib/datetime';
import { SessionModal } from '../../components/training/SessionModal';
import { AttendanceModal } from '../../components/training/AttendanceModal';

export const TrainingCalendarPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'Admin';
  const isCoach = role === 'Coach';
  const isAthlete = role === 'Athlete';
  const isOrganizer = role === 'Organizer';
  const canManageSessions = isAdmin || isCoach;
  const browserTz = getBrowserTimeZone();

  const [sessions, setSessions] = useState<TrainingSessionItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [athleteSummary, setAthleteSummary] = useState<AthleteAttendanceSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [teamFilter, setTeamFilter] = useState<string>('All');

  // Modals state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSessionItem | null>(null);

  const [attendanceSession, setAttendanceSession] = useState<{
    id: string;
    title: string;
    startsAt: string;
  } | null>(null);

  // Cancellation prompt modal state
  const [cancellingSession, setCancellingSession] = useState<TrainingSessionItem | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationSubmitting, setCancellationSubmitting] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const promises: Promise<unknown>[] = [
        academyApi.listTrainingSessions({
          status: statusFilter !== 'All' ? statusFilter : undefined,
          type: typeFilter !== 'All' ? (typeFilter as SessionType) : undefined,
          team: teamFilter !== 'All' ? teamFilter : undefined,
          limit: 100,
        }),
      ];

      if (canManageSessions) {
        promises.push(academyApi.listTeams({ limit: 100 }));
        if (isAdmin) {
          promises.push(academyApi.listCoaches({ limit: 100 }));
        }
      }

      if (isAthlete) {
        promises.push(academyApi.getAthleteSelfAttendance({ limit: 1 }));
      }

      const results = await Promise.all(promises);
      const sessionsRes = results[0] as { items: TrainingSessionItem[] };
      setSessions(sessionsRes.items || []);

      let idx = 1;
      if (canManageSessions) {
        const teamsRes = results[idx++] as { items: TeamItem[] };
        setTeams(teamsRes?.items || []);
        if (isAdmin) {
          const coachesRes = results[idx++] as { items: CoachItem[] };
          setCoaches(coachesRes?.items || []);
        }
      }

      if (isAthlete) {
        const athleteRes = results[idx] as { summary: AthleteAttendanceSummary } | null;
        if (athleteRes?.summary) {
          setAthleteSummary(athleteRes.summary);
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorBanner(err.message || 'Failed to load training sessions.');
      } else {
        setErrorBanner('An unexpected error occurred while loading training data.');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, teamFilter, canManageSessions, isAdmin, isAthlete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleOpenCreateModal = () => {
    setEditingSession(null);
    setShowSessionModal(true);
  };

  const handleOpenEditModal = (session: TrainingSessionItem) => {
    setEditingSession(session);
    setShowSessionModal(true);
  };

  const handleOpenAttendanceModal = (session: TrainingSessionItem) => {
    setAttendanceSession({
      id: session.id,
      title: session.title,
      startsAt: session.startsAt,
    });
  };

  const handleCancelSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSession) return;
    if (cancellationReason.trim().length < 3) {
      setCancellationError('Cancellation reason must be at least 3 characters.');
      return;
    }

    setCancellationSubmitting(true);
    setCancellationError(null);
    try {
      await academyApi.cancelTrainingSession(cancellingSession.id, cancellationReason.trim());
      setSuccessBanner(`Session "${cancellingSession.title}" was cancelled.`);
      setCancellingSession(null);
      setCancellationReason('');
      fetchData();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setCancellationError(err.message || 'Failed to cancel session.');
      } else {
        setCancellationError('An unexpected error occurred.');
      }
    } finally {
      setCancellationSubmitting(false);
    }
  };

  const handleDeleteSession = async (session: TrainingSessionItem) => {
    if (!window.confirm(`Are you sure you want to permanently delete session "${session.title}"?`)) {
      return;
    }

    try {
      await academyApi.deleteTrainingSession(session.id);
      setSuccessBanner(`Session "${session.title}" deleted.`);
      fetchData();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorBanner(err.message || 'Failed to delete session.');
      } else {
        setErrorBanner('An unexpected error occurred.');
      }
    }
  };

  const now = new Date();

  return (
    <div className="space-y-8">
      {/* Header - Always visible per requirement */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="lime">HIGH PERFORMANCE TRAINING ENGINE</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            TRAINING CALENDAR & SESSIONS <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        {canManageSessions && (
          <Button
            variant="primary"
            iconLeft={<Plus size={18} />}
            onClick={handleOpenCreateModal}
          >
            Schedule Session
          </Button>
        )}
      </div>

      {/* Notifications */}
      {errorBanner && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-700 text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">{errorBanner}</div>
          <button onClick={() => setErrorBanner(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {successBanner && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1">{successBanner}</div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Athlete Personal Attendance Summary Card */}
      {isAthlete && athleteSummary && (
        <Card variant="dark" className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#D8F500] uppercase tracking-wider">
                <Award size={16} /> My Attendance Record
              </div>
              <h2 className="text-2xl font-black font-display text-white mt-1">
                Personal Training Performance
              </h2>
              <p className="text-xs text-white/70 mt-1">
                Tracked across all scheduled sessions for your squad.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-black text-[#D8F500]">
                  {athleteSummary.attendanceRate !== null ? `${athleteSummary.attendanceRate}%` : 'N/A'}
                </div>
                <div className="text-[11px] font-bold text-white/60 uppercase">Attendance Rate</div>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                <div>
                  <div className="font-black text-emerald-400">{athleteSummary.present}</div>
                  <div className="text-[10px] text-white/60">Present</div>
                </div>
                <div>
                  <div className="font-black text-amber-400">{athleteSummary.late}</div>
                  <div className="text-[10px] text-white/60">Late</div>
                </div>
                <div>
                  <div className="font-black text-sky-400">{athleteSummary.excused}</div>
                  <div className="text-[10px] text-white/60">Excused</div>
                </div>
                <div>
                  <div className="font-black text-rose-400">{athleteSummary.absent}</div>
                  <div className="text-[10px] text-white/60">Absent</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#171044]/10 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[#171044]/60 uppercase mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-[#171044]/20 rounded-xl px-3 py-1.5 text-xs text-[#171044] font-medium outline-none focus:border-[#171044]"
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#171044]/60 uppercase mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-[#171044]/20 rounded-xl px-3 py-1.5 text-xs text-[#171044] font-medium outline-none focus:border-[#171044]"
            >
              <option value="All">All Types</option>
              <option value="Training">Training</option>
              <option value="Match">Match</option>
              <option value="Gym">Gym</option>
              <option value="Recovery">Recovery</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {canManageSessions && teams.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-[#171044]/60 uppercase mb-1">
                Team
              </label>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="bg-white border border-[#171044]/20 rounded-xl px-3 py-1.5 text-xs text-[#171044] font-medium outline-none focus:border-[#171044]"
              >
                <option value="All">All Teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-xs text-[#171044]/60 font-medium">
          Showing {sessions.length} session{sessions.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Main Content Area */}
      <StateContainer
        loading={loading}
        empty={!loading && sessions.length === 0}
        emptyMessage="There are currently no training sessions matching your filters."
        onRetry={fetchData}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((s) => {
            const endsAtDate = new Date(s.endsAt);
            const startsAtDate = new Date(s.startsAt);
            const isPastEnd = now > endsAtDate;
            const hasStarted = now >= startsAtDate;
            const isScheduled = s.status === 'Scheduled';
            const isAwaitingAttendance = isScheduled && isPastEnd;

            const timeInfo = formatSessionTimeRange(s.startsAt, s.endsAt, browserTz);

            return (
              <Card
                key={s.id}
                variant="standard"
                className="space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Badges bar */}
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isAwaitingAttendance ? (
                        <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30">
                          Awaiting attendance
                        </span>
                      ) : s.status === 'Cancelled' ? (
                        <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-rose-500/20 text-rose-700 border border-rose-500/30">
                          Cancelled
                        </span>
                      ) : (
                        <AthleticBadge
                          variant={
                            s.status === 'Completed'
                              ? 'dark'
                              : 'orange'
                          }
                        >
                          {s.status}
                        </AthleticBadge>
                      )}

                      {s.type && (
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#171044]/5 text-[#171044]">
                          {s.type}
                        </span>
                      )}
                    </div>

                    <AthleticBadge variant="purple">
                      {s.team?.name || 'Assigned Squad'}
                    </AthleticBadge>
                  </div>

                  <h3 className="text-2xl font-black font-display text-[#171044]">
                    {s.title}
                  </h3>

                  {s.status === 'Cancelled' && s.cancellationReason && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                      <strong>Cancellation Reason:</strong> {s.cancellationReason}
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-[#171044]/80 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#FF5A00]" />
                      <span>
                        {timeInfo.dateStr} • {timeInfo.timeRangeStr} ({timeInfo.durationStr})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-[#FF5A00]" />
                      <span>Location: {s.venue?.trim() ? s.venue : 'Location not set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#FF5A00]" />
                      <span>Coach: {s.coach?.user?.name || 'Not assigned'}</span>
                    </div>
                  </div>

                  {s.notes && (
                    <div className="pt-2 border-t border-[#171044]/10 space-y-1">
                      <div className="text-[11px] font-bold text-[#171044] uppercase">
                        Notes / Objectives:
                      </div>
                      <p className="text-xs text-[#171044]/70">{s.notes}</p>
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Attendance & Actions */}
                <div className="pt-3 border-t border-[#171044]/10 space-y-3">
                  {/* Attendance status display */}
                  <div className="flex items-center justify-between text-xs">
                    {/* Athlete view: shows personal attendance */}
                    {isAthlete && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#171044]/70">My Attendance:</span>
                        {s.myAttendance ? (
                          <span
                            className={`font-black px-2 py-0.5 rounded-md ${
                              s.myAttendance.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.myAttendance.status === 'Late'
                                ? 'bg-amber-100 text-amber-800'
                                : s.myAttendance.status === 'Excused'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {s.myAttendance.status}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Not recorded</span>
                        )}
                      </div>
                    )}

                    {/* Admin/Coach view: shows team counts */}
                    {(isAdmin || isCoach) && (
                      <div>
                        {s.attendanceSummary && s.attendanceSummary.total > 0 ? (
                          <span className="font-bold text-emerald-600">
                            Marked: {s.attendanceSummary.total}
                          </span>
                        ) : (
                          <span className="text-[#171044]/50 italic">
                            Attendance not marked yet
                          </span>
                        )}
                      </div>
                    )}

                    {/* Organizer view: privacy rule hides attendance */}
                    {isOrganizer && (
                      <span className="text-[#171044]/40 text-[11px]">
                        Organizer view (Read-only)
                      </span>
                    )}
                  </div>

                  {/* Actions Bar */}
                  {canManageSessions && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#171044]/5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {s.status !== 'Cancelled' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!hasStarted}
                              title={
                                !hasStarted
                                  ? 'Attendance can only be marked once session starts'
                                  : undefined
                              }
                              onClick={() => handleOpenAttendanceModal(s)}
                            >
                              Mark Attendance
                            </Button>
                          )}
                        </div>
                        {s.status === 'Scheduled' && !hasStarted && (
                          <p className="text-[11px] text-[#171044]/60 italic">
                            Available once the session starts ({formatSessionStartHint(s.startsAt, browserTz)})
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(s)}
                          className="p-1.5 text-[#171044]/60 hover:text-[#171044] hover:bg-[#171044]/5 rounded-lg transition"
                          title="Edit Session"
                        >
                          <Edit2 size={16} />
                        </button>

                        {s.status !== 'Cancelled' && s.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingSession(s);
                              setCancellationReason('');
                              setCancellationError(null);
                            }}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                            title="Cancel Session"
                          >
                            <XCircle size={16} />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(s)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Session"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </StateContainer>

      {/* Schedule / Edit Modal */}
      {showSessionModal && (
        <SessionModal
          isOpen={showSessionModal}
          onClose={() => setShowSessionModal(false)}
          onSuccess={() => {
            setSuccessBanner(
              editingSession
                ? 'Session updated successfully.'
                : 'Session scheduled successfully.'
            );
            fetchData();
          }}
          sessionToEdit={editingSession}
          teams={teams}
          coaches={coaches}
          isAdmin={isAdmin}
        />
      )}

      {/* Attendance Modal */}
      {attendanceSession && (
        <AttendanceModal
          isOpen={Boolean(attendanceSession)}
          onClose={() => setAttendanceSession(null)}
          sessionId={attendanceSession.id}
          sessionTitle={attendanceSession.title}
          startsAt={attendanceSession.startsAt}
          onSuccess={() => {
            setSuccessBanner('Attendance saved successfully.');
            fetchData();
          }}
        />
      )}

      {/* Cancel Session Confirmation Modal */}
      {cancellingSession && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#171044] text-white p-6 rounded-3xl max-w-md w-full space-y-4 border border-white/20 shadow-2xl">
            <h3 className="text-xl font-black font-display text-white">
              Cancel Session
            </h3>
            <p className="text-xs text-white/70">
              Are you sure you want to cancel &quot;{cancellingSession.title}&quot;? Please provide a reason for the team.
            </p>

            {cancellationError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs">
                {cancellationError}
              </div>
            )}

            <form onSubmit={handleCancelSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">
                  Cancellation Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inclement weather / pitch flooded"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCancellingSession(null)}
                  disabled={cancellationSubmitting}
                  className="text-white hover:text-white/80"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  className="bg-rose-600 hover:bg-rose-700 text-white border-rose-500 font-bold"
                  disabled={cancellationSubmitting}
                >
                  {cancellationSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
