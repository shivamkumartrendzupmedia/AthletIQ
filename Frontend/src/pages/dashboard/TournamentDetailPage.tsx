import React, { useState, useEffect, useCallback, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, AthleticBadge, Button } from '../../design-system';
import {
  Trophy,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  UserCheck,
  X,
  Award,
} from 'lucide-react';
import { StateContainer } from '../../components/StateContainer';
import {
  academyApi,
  type TournamentItem,
  type TournamentTeamItem,
  type MatchItem,
  type VenueItem,
  type OfficialItem,
  mapFieldErrors,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';
import { toDatetimeLocalString, fromDatetimeLocalString, formatSessionTimeRange } from '../../lib/datetime';

type DetailTab = 'overview' | 'registrations' | 'matches';

export const TournamentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [tournament, setTournament] = useState<TournamentItem | null>(null);
  const [registrations, setRegistrations] = useState<TournamentTeamItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [officials, setOfficials] = useState<OfficialItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Reject Registration Modal
  const [rejectingReg, setRejectingReg] = useState<TournamentTeamItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Match Fixture Modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchItem | null>(null);
  const [matchSubmitting, setMatchSubmitting] = useState(false);
  const [matchFieldErrors, setMatchFieldErrors] = useState<Record<string, string>>({});
  const [matchOverlapError, setMatchOverlapError] = useState<string | null>(null);

  // Match Form fields
  const [matchHomeTeam, setMatchHomeTeam] = useState('');
  const [matchAwayTeam, setMatchAwayTeam] = useState('');
  const [matchRound, setMatchRound] = useState('Round 1');
  const [matchGroup, setMatchGroup] = useState('');
  const [matchScheduledAt, setMatchScheduledAt] = useState('');
  const [matchDuration, setMatchDuration] = useState('90');
  const [matchVenue, setMatchVenue] = useState('');
  const [matchReferee, setMatchReferee] = useState('');

  // Result Modal
  const [resultMatch, setResultMatch] = useState<MatchItem | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [resultSubmitting, setResultSubmitting] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  // Form IDs
  const mHomeId = useId();
  const mAwayId = useId();
  const mRoundId = useId();
  const mGroupId = useId();
  const mSchedId = useId();
  const mDurId = useId();
  const mVenId = useId();
  const mRefId = useId();

  // Load tournament and tab data (strictly <= 4 requests on first load)
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const [tRes, regRes, mRes, vRes] = await Promise.all([
        academyApi.getTournament(id),
        academyApi.listRegistrations(id, { limit: 100 }),
        academyApi.listMatches(id, { limit: 100 }),
        academyApi.listVenues({ limit: 100 }),
      ]);
      setTournament(tRes);
      setRegistrations(regRes.items);
      setMatches(mRes.items);
      setVenues(vRes.items);
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load tournament details.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Load officials on demand when match modal is opened
  const ensureOfficials = async () => {
    if (officials.length === 0) {
      try {
        const offRes = await academyApi.listOfficials({ limit: 100 });
        setOfficials(offRes.items);
      } catch {
        // non-blocking
      }
    }
  };

  // Filter approved registrations for match fixtures
  const approvedTeams = registrations.filter((r) => r.status === 'Approved');

  // Handle Review Registration (Approve / Reject)
  const handleApproveRegistration = async (r: TournamentTeamItem) => {
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await academyApi.reviewRegistration(r.id, { status: 'Approved' });
      setSuccessBanner(`Team "${r.team?.name}" approved for tournament.`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to approve registration.';
      setErrorBanner(msg);
    }
  };

  const handleRejectRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReg) return;
    setRejectSubmitting(true);
    setRejectError(null);
    try {
      await academyApi.reviewRegistration(rejectingReg.id, {
        status: 'Rejected',
        reason: rejectReason,
      });
      setSuccessBanner(`Registration for "${rejectingReg.team?.name}" rejected.`);
      setRejectingReg(null);
      setRejectReason('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to reject registration.';
      setRejectError(msg);
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Open Create / Edit Match Modal
  const openCreateMatchModal = async () => {
    await ensureOfficials();
    setEditingMatch(null);
    setMatchHomeTeam(approvedTeams.length > 0 ? approvedTeams[0].id : '');
    setMatchAwayTeam(approvedTeams.length > 1 ? approvedTeams[1].id : '');
    setMatchRound('Quarter Final');
    setMatchGroup('');
    const defaultTime = tournament?.startDate
      ? new Date(tournament.startDate)
      : new Date(Date.now() + 86400000);
    setMatchScheduledAt(toDatetimeLocalString(defaultTime.toISOString()));
    setMatchDuration('90');
    setMatchVenue(venues.length > 0 ? venues[0].id : '');
    setMatchReferee('');
    setMatchFieldErrors({});
    setMatchOverlapError(null);
    setShowMatchModal(true);
  };

  const openEditMatchModal = async (m: MatchItem) => {
    await ensureOfficials();
    setEditingMatch(m);
    setMatchRound(m.round);
    setMatchGroup(m.group || '');
    setMatchScheduledAt(toDatetimeLocalString(m.scheduledAt));
    setMatchDuration(String(m.durationMinutes));
    setMatchVenue(m.venue.id);
    setMatchReferee(m.referee?.id || '');
    setMatchFieldErrors({});
    setMatchOverlapError(null);
    setShowMatchModal(true);
  };

  // Submit Match Fixture (Create or Update)
  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setMatchSubmitting(true);
    setMatchFieldErrors({});
    setMatchOverlapError(null);

    const schedIso = fromDatetimeLocalString(matchScheduledAt);

    try {
      if (editingMatch) {
        await academyApi.updateMatch(editingMatch.id, {
          round: matchRound,
          group: matchGroup || undefined,
          scheduledAt: schedIso,
          durationMinutes: Number(matchDuration),
          venue: matchVenue,
          referee: matchReferee ? matchReferee : null,
        });
        setSuccessBanner('Fixture updated successfully.');
      } else {
        await academyApi.createMatch(id, {
          homeTeam: matchHomeTeam,
          awayTeam: matchAwayTeam,
          round: matchRound,
          group: matchGroup || undefined,
          scheduledAt: schedIso,
          durationMinutes: Number(matchDuration),
          venue: matchVenue,
          referee: matchReferee || undefined,
        });
        setSuccessBanner('Match fixture scheduled.');
      }
      setShowMatchModal(false);
      loadData();
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.statusCode === 409) {
        setMatchOverlapError(
          `Schedule Overlap (409 Conflict): ${err.message}. Please select a different time, venue, or referee.`
        );
      } else {
        const mapped = mapFieldErrors(err);
        setMatchFieldErrors(mapped);
        if (err instanceof ApiClientError && !Object.keys(mapped).length) {
          setMatchOverlapError(err.message);
        }
      }
    } finally {
      setMatchSubmitting(false);
    }
  };

  // Cancel match
  const handleCancelMatch = async (m: MatchItem) => {
    if (!window.confirm('Cancel this scheduled match?')) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await academyApi.updateMatch(m.id, { status: 'Cancelled' });
      setSuccessBanner('Match marked as Cancelled.');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to cancel match.';
      setErrorBanner(msg);
    }
  };

  // Delete match
  const handleDeleteMatch = async (m: MatchItem) => {
    if (!window.confirm('Permanently delete this match fixture?')) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await academyApi.deleteMatch(m.id);
      setSuccessBanner('Match fixture removed.');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete match.';
      setErrorBanner(msg);
    }
  };

  // Enter match result
  const openResultModal = (m: MatchItem) => {
    setResultMatch(m);
    setHomeScore(m.result?.homeScore !== undefined ? String(m.result.homeScore) : '0');
    setAwayScore(m.result?.awayScore !== undefined ? String(m.result.awayScore) : '0');
    setResultError(null);
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultMatch) return;
    setResultSubmitting(true);
    setResultError(null);
    try {
      await academyApi.enterMatchResult(resultMatch.id, {
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
      });
      setSuccessBanner('Match score and result recorded.');
      setResultMatch(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to enter match result.';
      setResultError(msg);
    } finally {
      setResultSubmitting(false);
    }
  };

  if (!tournament && !loading) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#171044]">Tournament Not Found</h2>
        <Button onClick={() => navigate('/dashboard/tournaments')} variant="primary">
          Back to Tournaments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Tournament Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/dashboard/tournaments')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111]/60 hover:text-[#E65100] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Tournaments</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#171044]">{tournament?.name}</h1>
            {tournament && (
              <AthleticBadge variant="orange" size="sm">
                {tournament.status}
              </AthleticBadge>
            )}
          </div>
          <p className="text-xs text-[#111111]/60">
            {tournament?.sport?.name} • {tournament?.category} • {tournament?.ageGroup} • {tournament?.format}
          </p>
        </div>

        {/* Quick action buttons depending on active tab */}
        {activeTab === 'matches' && (
          <Button
            onClick={openCreateMatchModal}
            variant="primary"
            className="inline-flex items-center gap-2"
            disabled={approvedTeams.length < 2}
            title={approvedTeams.length < 2 ? 'Need at least 2 approved teams to schedule matches' : ''}
          >
            <Plus className="w-4 h-4" />
            <span>Add Match Fixture</span>
          </Button>
        )}
      </div>

      {/* Global Alerts */}
      {errorBanner && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorBanner}</div>
          <button onClick={() => setErrorBanner(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successBanner}</div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#111111]/10 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#171044] text-white shadow-sm'
              : 'text-[#111111]/70 hover:bg-[#111111]/5'
          }`}
        >
          Overview & Rules
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'registrations'
              ? 'bg-[#171044] text-white shadow-sm'
              : 'text-[#111111]/70 hover:bg-[#111111]/5'
          }`}
        >
          <span>Team Registrations</span>
          <span className="px-1.5 py-0.2 rounded-full text-xs bg-white/20">
            {tournament?.approvedTeamsCount || 0}
            {tournament?.maxTeams ? `/${tournament.maxTeams}` : ''}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'matches'
              ? 'bg-[#171044] text-white shadow-sm'
              : 'text-[#111111]/70 hover:bg-[#111111]/5'
          }`}
        >
          <span>Match Fixtures & Results</span>
          <span className="px-1.5 py-0.2 rounded-full text-xs bg-white/20">
            {matches.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && tournament && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-[#171044] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#E65100]" />
              Tournament Details
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-[#171044]/5 rounded-xl">
                <span className="text-xs text-[#111111]/50 uppercase font-bold block">Sport</span>
                <span className="font-semibold text-[#171044]">{tournament.sport?.name}</span>
              </div>
              <div className="p-3 bg-[#171044]/5 rounded-xl">
                <span className="text-xs text-[#111111]/50 uppercase font-bold block">Category</span>
                <span className="font-semibold text-[#171044]">{tournament.category}</span>
              </div>
              <div className="p-3 bg-[#171044]/5 rounded-xl">
                <span className="text-xs text-[#111111]/50 uppercase font-bold block">Age Group</span>
                <span className="font-semibold text-[#171044]">{tournament.ageGroup}</span>
              </div>
              <div className="p-3 bg-[#171044]/5 rounded-xl">
                <span className="text-xs text-[#111111]/50 uppercase font-bold block">Format</span>
                <span className="font-semibold text-[#171044]">{tournament.format}</span>
              </div>
              <div className="p-3 bg-[#171044]/5 rounded-xl">
                <span className="text-xs text-[#111111]/50 uppercase font-bold block">Start Date</span>
                <span className="font-semibold text-[#171044]">
                  {new Date(tournament.startDate).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-[#171044]/5 rounded-xl">
                <span className="text-xs text-[#111111]/50 uppercase font-bold block">End Date</span>
                <span className="font-semibold text-[#171044]">
                  {new Date(tournament.endDate).toLocaleString()}
                </span>
              </div>
            </div>

            {tournament.rules ? (
              <div className="space-y-2 pt-2 border-t border-[#111111]/10">
                <h3 className="text-xs uppercase font-bold text-[#111111]/50">Rules & Regulations</h3>
                <p className="text-sm text-[#111111]/80 whitespace-pre-wrap">{tournament.rules}</p>
              </div>
            ) : (
              <div className="text-xs text-[#111111]/50 italic pt-2">No special rules text specified.</div>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#171044]">Capacity & Status</h2>
            <div className="p-4 bg-[#F7F1E8] rounded-2xl text-center space-y-1">
              <span className="text-3xl font-extrabold text-[#171044]">
                {tournament.approvedTeamsCount}
              </span>
              <span className="text-xs text-[#111111]/60 block font-medium">
                {tournament.maxTeams ? `Approved Teams (Max: ${tournament.maxTeams})` : 'Approved Teams (Unlimited)'}
              </span>
            </div>
            {tournament.organizer && (
              <div className="text-xs text-[#111111]/60 space-y-1 pt-2 border-t border-[#111111]/10">
                <div>Organizer: <span className="font-semibold text-[#171044]">{tournament.organizer.name}</span></div>
                <div>Contact: {tournament.organizer.email}</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: REGISTRATIONS */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <StateContainer
            loading={loading}
            empty={registrations.length === 0}
            emptyMessage="No team registrations submitted yet."
            onRetry={loadData}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registrations.map((r) => (
                <Card key={r.id} className="p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg text-[#171044]">{r.team?.name}</h3>
                        <span className="text-xs text-[#111111]/60">
                          Registered by: {r.registeredBy?.name}
                        </span>
                      </div>
                      <AthleticBadge
                        variant={
                          r.status === 'Approved'
                            ? 'lime'
                            : r.status === 'Pending'
                            ? 'orange'
                            : 'dark'
                        }
                        size="sm"
                      >
                        {r.status}
                      </AthleticBadge>
                    </div>

                    {r.reason && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                        <span className="font-bold">Rejection reason:</span> {r.reason}
                      </div>
                    )}

                    <div className="text-xs text-[#111111]/70">
                      <span className="font-semibold">Squad ({r.squad?.length || 0} athletes): </span>
                      {r.squad && r.squad.length > 0 ? (
                        <span>
                          {r.squad
                            .map((a) => a.user?.name || `Athlete #${a.jerseyNumber || ''}`)
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="italic text-[#111111]/40">No squad submitted</span>
                      )}
                    </div>
                  </div>

                  {r.status === 'Pending' && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#111111]/10">
                      <Button
                        onClick={() => handleApproveRegistration(r)}
                        variant="primary"
                        size="sm"
                        className="inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Team</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setRejectingReg(r);
                          setRejectReason('');
                          setRejectError(null);
                        }}
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </StateContainer>
        </div>
      )}

      {/* TAB 3: MATCH FIXTURES */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <StateContainer
            loading={loading}
            empty={matches.length === 0}
            emptyMessage="No match fixtures scheduled yet. Add fixtures to create tournament schedule."
            onRetry={loadData}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m) => {
                const timeInfo = formatSessionTimeRange(m.scheduledAt, m.endsAt);
                return (
                  <Card key={m.id} className="p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#E65100]">
                          {m.round} {m.group ? `• ${m.group}` : ''}
                        </span>
                        <AthleticBadge
                          variant={
                            m.status === 'Completed'
                              ? 'lime'
                              : m.status === 'Scheduled'
                              ? 'orange'
                              : 'dark'
                          }
                          size="sm"
                        >
                          {m.status}
                        </AthleticBadge>
                      </div>

                      {/* Head-to-Head */}
                      <div className="flex items-center justify-between p-3 bg-[#171044]/5 rounded-xl">
                        <div className="font-bold text-sm text-[#171044] truncate w-5/12">
                          {m.homeTeam?.team?.name || 'Home Team'}
                        </div>
                        <div className="text-center font-extrabold text-base text-[#171044] w-2/12 shrink-0">
                          {m.status === 'Completed' && m.result ? (
                            <span>
                              {m.result.homeScore} – {m.result.awayScore}
                            </span>
                          ) : (
                            <span className="text-xs text-[#111111]/40 font-semibold">VS</span>
                          )}
                        </div>
                        <div className="font-bold text-sm text-[#171044] truncate text-right w-5/12">
                          {m.awayTeam?.team?.name || 'Away Team'}
                        </div>
                      </div>

                      {/* Meta Pills */}
                      <div className="space-y-1 text-xs text-[#111111]/70">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          <span>{timeInfo.dateStr} • {timeInfo.timeRangeStr}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 opacity-60" />
                          <span>Venue: {m.venue?.name || 'Assigned Pitch'}</span>
                        </div>
                        {m.referee?.name && (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 opacity-60" />
                            <span>Referee: {m.referee.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#111111]/10">
                      {m.status === 'Scheduled' && (
                        <>
                          <Button
                            onClick={() => openResultModal(m)}
                            variant="primary"
                            size="sm"
                            className="inline-flex items-center gap-1"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Enter Score</span>
                          </Button>
                          <Button
                            onClick={() => openEditMatchModal(m)}
                            variant="outline"
                            size="sm"
                            className="inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Reschedule</span>
                          </Button>
                          <Button
                            onClick={() => handleCancelMatch(m)}
                            variant="outline"
                            size="sm"
                            className="inline-flex items-center gap-1 text-red-600 border-red-200"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </Button>
                        </>
                      )}
                      {m.status === 'Completed' && (
                        <Button
                          onClick={() => openResultModal(m)}
                          variant="outline"
                          size="sm"
                          className="inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Correct Score</span>
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteMatch(m)}
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1 text-red-600 border-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </StateContainer>
        </div>
      )}

      {/* Reject Registration Modal */}
      {rejectingReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#171044]/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#111111]/10">
              <h2 className="text-xl font-bold text-[#171044]">Reject Team Registration</h2>
              <button onClick={() => setRejectingReg(null)} className="text-[#111111]/40 hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {rejectError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {rejectError}
              </div>
            )}

            <form onSubmit={handleRejectRegistration} className="space-y-4">
              <p className="text-sm text-[#111111]/70">
                Please provide an official reason for rejecting the registration of{' '}
                <span className="font-bold text-[#171044]">{rejectingReg.team?.name}</span>:
              </p>

              <div>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Ineligible roster age group, missing health waivers..."
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#111111]/10">
                <Button type="button" variant="outline" onClick={() => setRejectingReg(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={rejectSubmitting || !rejectReason.trim()}>
                  {rejectSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Reschedule Match Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#171044]/10 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#111111]/10">
              <h2 className="text-xl font-bold text-[#171044]">
                {editingMatch ? 'Reschedule Match Fixture' : 'Add Tournament Fixture'}
              </h2>
              <button onClick={() => setShowMatchModal(false)} className="text-[#111111]/40 hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overlap 409 Banner */}
            {matchOverlapError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2 text-xs text-red-900 font-medium">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>{matchOverlapError}</div>
              </div>
            )}

            {Object.keys(matchFieldErrors).length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-800">
                {Object.entries(matchFieldErrors).map(([field, msg]) => (
                  <div key={field}>
                    <span className="font-bold capitalize">{field}:</span> {msg}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveMatch} className="space-y-4">
              {!editingMatch && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={mHomeId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                      Home Team (Approved) *
                    </label>
                    <select
                      id={mHomeId}
                      required
                      value={matchHomeTeam}
                      onChange={(e) => setMatchHomeTeam(e.target.value)}
                      className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                    >
                      {approvedTeams.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.team?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={mAwayId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                      Away Team (Approved) *
                    </label>
                    <select
                      id={mAwayId}
                      required
                      value={matchAwayTeam}
                      onChange={(e) => setMatchAwayTeam(e.target.value)}
                      className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                    >
                      {approvedTeams.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.team?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={mRoundId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Round Name *
                  </label>
                  <input
                    id={mRoundId}
                    type="text"
                    required
                    value={matchRound}
                    onChange={(e) => setMatchRound(e.target.value)}
                    placeholder="e.g. Quarter Final"
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  />
                </div>

                <div>
                  <label htmlFor={mGroupId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Group / Bracket (Optional)
                  </label>
                  <input
                    id={mGroupId}
                    type="text"
                    value={matchGroup}
                    onChange={(e) => setMatchGroup(e.target.value)}
                    placeholder="e.g. Group A"
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={mSchedId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Scheduled Date & Time *
                  </label>
                  <input
                    id={mSchedId}
                    type="datetime-local"
                    required
                    value={matchScheduledAt}
                    onChange={(e) => setMatchScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  />
                </div>

                <div>
                  <label htmlFor={mDurId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Duration (Minutes, 30-240) *
                  </label>
                  <input
                    id={mDurId}
                    type="number"
                    min="30"
                    max="240"
                    required
                    value={matchDuration}
                    onChange={(e) => setMatchDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={mVenId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Venue Facility *
                  </label>
                  <select
                    id={mVenId}
                    required
                    value={matchVenue}
                    onChange={(e) => setMatchVenue(e.target.value)}
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  >
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={mRefId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Referee (Optional)
                  </label>
                  <select
                    id={mRefId}
                    value={matchReferee}
                    onChange={(e) => setMatchReferee(e.target.value)}
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  >
                    <option value="">No Referee Assigned</option>
                    {officials.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#111111]/10">
                <Button type="button" variant="outline" onClick={() => setShowMatchModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={matchSubmitting || (!editingMatch && matchHomeTeam === matchAwayTeam)}
                >
                  {matchSubmitting ? 'Saving...' : editingMatch ? 'Update Fixture' : 'Schedule Fixture'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Result Modal */}
      {resultMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#171044]/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#111111]/10">
              <h2 className="text-xl font-bold text-[#171044]">Record Match Result</h2>
              <button onClick={() => setResultMatch(null)} className="text-[#111111]/40 hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resultError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {resultError}
              </div>
            )}

            <form onSubmit={handleSaveResult} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#111111]/60 mb-1 truncate">
                    {resultMatch.homeTeam?.team?.name || 'Home'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    required
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    className="w-full text-center text-xl font-bold px-3 py-2 border border-[#111111]/20 rounded-lg focus:outline-none focus:border-[#E65100]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#111111]/60 mb-1 truncate">
                    {resultMatch.awayTeam?.team?.name || 'Away'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    required
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    className="w-full text-center text-xl font-bold px-3 py-2 border border-[#111111]/20 rounded-lg focus:outline-none focus:border-[#E65100]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#111111]/10">
                <Button type="button" variant="outline" onClick={() => setResultMatch(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={resultSubmitting}>
                  {resultSubmitting ? 'Saving...' : 'Save Result'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
