import React, { useState, useEffect, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import {
  Trophy,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  ArrowRight,
  Shield,
  Users,
  Calendar,
  Layers,
} from 'lucide-react';
import { StateContainer } from '../../components/StateContainer';
import {
  academyApi,
  type TournamentItem,
  type TournamentTeamItem,
  type SportItem,
  type TeamItem,
  mapFieldErrors,
} from '../../services/academyApi';
import { useAuth } from '../../context/AuthContext';
import { ApiClientError } from '../../lib/apiClient';
import { toDatetimeLocalString, fromDatetimeLocalString } from '../../lib/datetime';

const VALID_TRANSITIONS: Record<string, Array<'Registration Open' | 'In Progress' | 'Completed' | 'Cancelled'>> = {
  Draft: ['Registration Open', 'Cancelled'],
  'Registration Open': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

export const TournamentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'Athlete';

  // Data states
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [sports, setSports] = useState<SportItem[]>([]);
  const [myTeams, setMyTeams] = useState<TeamItem[]>([]);
  const [registrations, setRegistrations] = useState<TournamentTeamItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Global banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Create/Edit Tournament Modal (Admin, Organizer)
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<TournamentItem | null>(null);
  const [tournamentSubmitting, setTournamentSubmitting] = useState(false);
  const [tournamentFieldErrors, setTournamentFieldErrors] = useState<Record<string, string>>({});

  // Tournament Form fields
  const [formName, setFormName] = useState('');
  const [formSport, setFormSport] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAgeGroup, setFormAgeGroup] = useState('U18');
  const [formFormat, setFormFormat] = useState<'League' | 'Knockout'>('Knockout');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formRules, setFormRules] = useState('');
  const [formMaxTeams, setFormMaxTeams] = useState('');

  // Coach Register Team Modal
  const [registeringTournament, setRegisteringTournament] = useState<TournamentItem | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSquad, setSelectedSquad] = useState<string[]>([]);
  const [teamAthletes, setTeamAthletes] = useState<Array<{ id: string; name: string; jerseyNumber?: number }>>([]);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerFieldErrors, setRegisterFieldErrors] = useState<Record<string, string>>({});


  // Unique accessible form IDs
  const tNameId = useId();
  const tSportId = useId();
  const tCategoryId = useId();
  const tAgeGroupId = useId();
  const tFormatId = useId();
  const tStartId = useId();
  const tEndId = useId();
  const tRulesId = useId();
  const tMaxTeamsId = useId();

  // Load Initial Data (strictly <= 4 requests)
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      if (role === 'Admin' || role === 'Organizer') {
        // Request 1: Tournaments, Request 2: Sports
        const [tournRes, sportsRes] = await Promise.all([
          academyApi.listTournaments({ limit: 100 }),
          academyApi.listSports({ limit: 100 }),
        ]);
        setTournaments(tournRes.items);
        setSports(sportsRes.items);
        if (sportsRes.items.length > 0 && !formSport) {
          setFormSport(sportsRes.items[0].id);
        }
      } else if (role === 'Coach') {
        // Request 1: Tournaments, Request 2: My Coached Teams
        const [tournRes, teamsRes] = await Promise.all([
          academyApi.listTournaments({ limit: 100 }),
          academyApi.listTeams({ limit: 100 }),
        ]);
        setTournaments(tournRes.items);
        setMyTeams(teamsRes.items);

        // Request 3: Load registrations for the tournaments
        const openTourneys = tournRes.items.filter((t) => t.status === 'Registration Open');
        if (openTourneys.length > 0) {
          const regRes = await Promise.all(
            openTourneys.slice(0, 2).map((t) => academyApi.listRegistrations(t.id, { limit: 100 }))
          );
          setRegistrations(regRes.flatMap((r) => r.items));
        }
      } else {
        // Athlete: Request 1: Tournaments
        const tournRes = await academyApi.listTournaments({ limit: 100 });
        setTournaments(tournRes.items.filter((t) => t.status !== 'Draft'));
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load tournament data.';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  }, [role, formSport]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // When coach selects a team to register, load athletes from team roster (1 request)
  useEffect(() => {
    if (!selectedTeamId) {
      const timer = setTimeout(() => {
        setTeamAthletes([]);
        setSelectedSquad([]);
      }, 0);
      return () => clearTimeout(timer);
    }
    let active = true;
    const loadRoster = async () => {
      try {
        const athletesRes = await academyApi.listAthletes({ team: selectedTeamId, limit: 100 });
        if (!active) return;
        const list = athletesRes.items.map((a) => ({
          id: a.id,
          name: a.user?.name || `Athlete #${a.jerseyNumber || ''}`,
          jerseyNumber: a.jerseyNumber,
        }));
        setTeamAthletes(list);
        setSelectedSquad(list.slice(0, 30).map((a) => a.id));
      } catch {
        if (active) setTeamAthletes([]);
      }
    };
    loadRoster();
    return () => {
      active = false;
    };
  }, [selectedTeamId]);

  // Open Create Tournament Modal
  const openCreateTournament = () => {
    setEditingTournament(null);
    setFormName('');
    if (sports.length > 0) setFormSport(sports[0].id);
    setFormCategory('Academy Cup');
    setFormAgeGroup('U18');
    setFormFormat('Knockout');
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 86400000);
    setFormStartDate(toDatetimeLocalString(now.toISOString()));
    setFormEndDate(toDatetimeLocalString(future.toISOString()));
    setFormRules('');
    setFormMaxTeams('16');
    setTournamentFieldErrors({});
    setShowTournamentModal(true);
  };

  // Open Edit Tournament Modal
  const openEditTournament = (t: TournamentItem) => {
    setEditingTournament(t);
    setFormName(t.name);
    setFormSport(t.sport.id);
    setFormCategory(t.category);
    setFormAgeGroup(t.ageGroup);
    setFormFormat(t.format);
    setFormStartDate(toDatetimeLocalString(t.startDate));
    setFormEndDate(toDatetimeLocalString(t.endDate));
    setFormRules(t.rules || '');
    setFormMaxTeams(t.maxTeams !== undefined ? String(t.maxTeams) : '');
    setTournamentFieldErrors({});
    setShowTournamentModal(true);
  };

  // Handle Create / Update Tournament
  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setTournamentSubmitting(true);
    setTournamentFieldErrors({});
    setErrorBanner(null);

    const startIso = fromDatetimeLocalString(formStartDate);
    const endIso = fromDatetimeLocalString(formEndDate);

    try {
      if (editingTournament) {
        await academyApi.updateTournament(editingTournament.id, {
          name: formName,
          sport: formSport,
          category: formCategory,
          ageGroup: formAgeGroup,
          format: formFormat,
          startDate: startIso,
          endDate: endIso,
          rules: formRules,
          maxTeams: formMaxTeams ? Number(formMaxTeams) : null,
        });
        setSuccessBanner('Tournament updated successfully.');
      } else {
        await academyApi.createTournament({
          name: formName,
          sport: formSport,
          category: formCategory,
          ageGroup: formAgeGroup,
          format: formFormat,
          startDate: startIso,
          endDate: endIso,
          rules: formRules,
          maxTeams: formMaxTeams ? Number(formMaxTeams) : undefined,
        });
        setSuccessBanner('Tournament created successfully.');
      }
      setShowTournamentModal(false);
      loadData();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      setTournamentFieldErrors(mapped);
      if (err instanceof ApiClientError && !Object.keys(mapped).length) {
        setErrorBanner(err.message);
      }
    } finally {
      setTournamentSubmitting(false);
    }
  };

  // Status transition buttons
  const handleTransitionStatus = async (
    t: TournamentItem,
    nextStatus: 'Registration Open' | 'In Progress' | 'Completed' | 'Cancelled'
  ) => {
    if (!window.confirm(`Advance status of "${t.name}" to "${nextStatus}"?`)) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await academyApi.updateTournament(t.id, { status: nextStatus });
      setSuccessBanner(`Tournament status updated to ${nextStatus}.`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Status transition failed.';
      setErrorBanner(msg);
    }
  };

  // Delete draft tournament
  const handleDeleteDraft = async (t: TournamentItem) => {
    if (!window.confirm(`Permanently delete Draft tournament "${t.name}"?`)) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await academyApi.deleteTournament(t.id);
      setSuccessBanner(`Draft tournament "${t.name}" deleted.`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete tournament.';
      setErrorBanner(msg);
    }
  };

  // Coach registers team
  const openRegisterModal = (t: TournamentItem) => {
    setRegisteringTournament(t);
    setSelectedTeamId(myTeams.length > 0 ? myTeams[0].id : '');
    setSelectedSquad([]);
    setRegisterFieldErrors({});
  };

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringTournament || !selectedTeamId) return;
    setRegisterSubmitting(true);
    setRegisterFieldErrors({});
    setErrorBanner(null);
    try {
      await academyApi.registerTournamentTeam(registeringTournament.id, {
        team: selectedTeamId,
        squad: selectedSquad,
      });
      setSuccessBanner('Team registration submitted for review.');
      setRegisteringTournament(null);
      loadData();
    } catch (err: unknown) {
      const mapped = mapFieldErrors(err);
      setRegisterFieldErrors(mapped);
      if (err instanceof ApiClientError && !Object.keys(mapped).length) {
        setErrorBanner(err.message);
      }
    } finally {
      setRegisterSubmitting(false);
    }
  };

  // Coach withdraws registration
  const handleWithdrawRegistration = async (r: TournamentTeamItem) => {
    if (!window.confirm('Withdraw your pending registration for this tournament?')) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await academyApi.withdrawRegistration(r.id);
      setSuccessBanner('Registration withdrawn successfully.');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to withdraw registration.';
      setErrorBanner(msg);
    }
  };

  // Toggle athlete in squad selector
  const toggleSquadAthlete = (id: string) => {
    setSelectedSquad((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 30) {
        alert('Maximum squad size is 30 athletes.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const getStatusBadgeVariant = (status: string): 'lime' | 'orange' | 'dark' => {
    switch (status) {
      case 'Registration Open':
        return 'lime';
      case 'In Progress':
        return 'orange';
      case 'Completed':
      case 'Cancelled':
      default:
        return 'dark';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#171044]">Tournaments & Championships</h1>
            <CrossAccent color="orange" size="sm" />
          </div>
          <p className="text-sm text-[#111111]/60">
            {role === 'Admin' || role === 'Organizer'
              ? 'Organize tournaments, review registrations, fixtures, and scores'
              : role === 'Coach'
              ? 'Register coached teams, manage rosters, and track tournament fixtures'
              : 'View upcoming championships, fixture schedules, and match results'}
          </p>
        </div>

        {(role === 'Admin' || role === 'Organizer') && (
          <Button onClick={openCreateTournament} variant="primary" className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Create Tournament</span>
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

      {/* Tournaments List Container */}
      <StateContainer
        loading={loading}
        empty={tournaments.length === 0}
        emptyMessage="No tournaments found. Create a new tournament to start registration."
        onRetry={loadData}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <Card
              key={t.id}
              className="p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 border-[#171044]/10"
            >
              <div className="space-y-4">
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E65100]/10 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-[#E65100]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#171044] leading-tight">{t.name}</h3>
                      <span className="text-xs text-[#111111]/60 font-medium">
                        {t.sport?.name} • {t.category}
                      </span>
                    </div>
                  </div>
                  <AthleticBadge variant={getStatusBadgeVariant(t.status)} size="sm">
                    {t.status}
                  </AthleticBadge>
                </div>

                {/* Details Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#171044]/5 p-2 rounded-lg flex items-center gap-1.5 text-[#171044]">
                    <Layers className="w-3.5 h-3.5 opacity-70" />
                    <span>{t.format}</span>
                  </div>
                  <div className="bg-[#171044]/5 p-2 rounded-lg flex items-center gap-1.5 text-[#171044]">
                    <Users className="w-3.5 h-3.5 opacity-70" />
                    <span>
                      {t.approvedTeamsCount} {t.maxTeams ? `/ ${t.maxTeams}` : ''} Teams
                    </span>
                  </div>
                  <div className="bg-[#171044]/5 p-2 rounded-lg flex items-center gap-1.5 text-[#171044] col-span-2">
                    <Calendar className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    <span className="truncate">
                      {new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {t.rules && (
                  <p className="text-xs text-[#111111]/70 line-clamp-2 italic">
                    Rules: {t.rules}
                  </p>
                )}

                {/* Organizer detail */}
                {t.organizer?.name && (
                  <div className="text-[11px] text-[#111111]/50">
                    Organizer: {t.organizer.name}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-[#111111]/10 flex flex-col gap-2">
                {/* Admin/Organizer Controls */}
                {(role === 'Admin' || role === 'Organizer') && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        onClick={() => navigate(`/dashboard/tournaments/${t.id}`)}
                        variant="primary"
                        size="sm"
                        className="w-full inline-flex items-center justify-center gap-1.5"
                      >
                        <span>Manage & Fixtures</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={() => openEditTournament(t)}
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      {t.status === 'Draft' && (
                        <Button
                          onClick={() => handleDeleteDraft(t)}
                          variant="outline"
                          size="sm"
                          className="inline-flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          title="Delete Draft"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Status Advance Controls */}
                    {VALID_TRANSITIONS[t.status] && VALID_TRANSITIONS[t.status].length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                        <span className="text-[10px] uppercase font-bold text-[#111111]/40 shrink-0">
                          Advance:
                        </span>
                        {VALID_TRANSITIONS[t.status].map((nextSt) => (
                          <button
                            key={nextSt}
                            onClick={() => handleTransitionStatus(t, nextSt)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#171044]/5 hover:bg-[#171044]/10 text-[#171044] border border-[#171044]/10 transition-colors shrink-0"
                          >
                            → {nextSt}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Coach Register Button */}
                {role === 'Coach' && (
                  <div className="flex items-center justify-between gap-2">
                    {t.status === 'Registration Open' ? (
                      <Button
                        onClick={() => openRegisterModal(t)}
                        variant="primary"
                        size="sm"
                        className="w-full inline-flex items-center justify-center gap-1.5"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Register Team</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-[#111111]/50 italic">Registration Closed</span>
                    )}
                  </div>
                )}

                {/* Athlete View Link */}
                {role === 'Athlete' && (
                  <Button
                    onClick={() => navigate(`/tournaments/${t.id}`)}
                    variant="outline"
                    size="sm"
                    className="w-full inline-flex items-center justify-center gap-1.5"
                  >
                    <span>View Matches & Results</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </StateContainer>

      {/* Coach Registered Teams Section */}
      {role === 'Coach' && registrations.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-[#111111]/10">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#171044]">My Team Registrations</h2>
            <CrossAccent color="orange" size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registrations.map((r) => (
              <Card key={r.id} className="p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base text-[#171044]">{r.team?.name}</h3>
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

                  <div className="text-xs text-[#111111]/60">
                    Squad: {r.squad?.length || 0} athletes registered
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#111111]/10">
                  {r.status === 'Pending' && (
                    <Button
                      onClick={() => handleWithdrawRegistration(r)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Tournament Modal */}
      {showTournamentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#171044]/10 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#111111]/10">
              <h2 className="text-xl font-bold text-[#171044]">
                {editingTournament ? 'Edit Tournament Details' : 'Create New Tournament'}
              </h2>
              <button
                onClick={() => setShowTournamentModal(false)}
                className="text-[#111111]/40 hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {Object.keys(tournamentFieldErrors).length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-800">
                {Object.entries(tournamentFieldErrors).map(([field, msg]) => (
                  <div key={field}>
                    <span className="font-bold capitalize">{field}:</span> {msg}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveTournament} className="space-y-4">
              <div>
                <label htmlFor={tNameId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Tournament Name *
                </label>
                <input
                  id={tNameId}
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Summer Academy Championship"
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={tSportId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Sport *
                  </label>
                  <select
                    id={tSportId}
                    required
                    value={formSport}
                    onChange={(e) => setFormSport(e.target.value)}
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  >
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={tCategoryId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Category *
                  </label>
                  <input
                    id={tCategoryId}
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Academy Cup"
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor={tAgeGroupId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Age Group *
                  </label>
                  <input
                    id={tAgeGroupId}
                    type="text"
                    required
                    value={formAgeGroup}
                    onChange={(e) => setFormAgeGroup(e.target.value)}
                    placeholder="e.g. U18"
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  />
                </div>

                <div>
                  <label htmlFor={tFormatId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Format *
                  </label>
                  <select
                    id={tFormatId}
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value as 'League' | 'Knockout')}
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  >
                    <option value="Knockout">Knockout</option>
                    <option value="League">League</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={tMaxTeamsId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Max Teams (2-64)
                  </label>
                  <input
                    id={tMaxTeamsId}
                    type="number"
                    min="2"
                    max="64"
                    value={formMaxTeams}
                    onChange={(e) => setFormMaxTeams(e.target.value)}
                    placeholder="e.g. 16"
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={tStartId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    id={tStartId}
                    type="datetime-local"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  />
                </div>

                <div>
                  <label htmlFor={tEndId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                    End Date & Time *
                  </label>
                  <input
                    id={tEndId}
                    type="datetime-local"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={tRulesId} className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Tournament Rules & Regulations
                </label>
                <textarea
                  id={tRulesId}
                  rows={3}
                  value={formRules}
                  onChange={(e) => setFormRules(e.target.value)}
                  placeholder="Official tournament rules, eligibility, code of conduct..."
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#111111]/10">
                <Button type="button" variant="outline" onClick={() => setShowTournamentModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={tournamentSubmitting}>
                  {tournamentSubmitting
                    ? 'Saving...'
                    : editingTournament
                    ? 'Update Tournament'
                    : 'Create Tournament'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coach Register Team Modal */}
      {registeringTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#171044]/10 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#111111]/10">
              <h2 className="text-xl font-bold text-[#171044]">
                Register for {registeringTournament.name}
              </h2>
              <button
                onClick={() => setRegisteringTournament(null)}
                className="text-[#111111]/40 hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {Object.keys(registerFieldErrors).length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-800">
                {Object.entries(registerFieldErrors).map(([field, msg]) => (
                  <div key={field}>
                    <span className="font-bold capitalize">{field}:</span> {msg}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleRegisterTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#111111]/60 mb-1">
                  Select Coached Team *
                </label>
                <select
                  required
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#111111]/20 rounded-lg text-sm focus:outline-none focus:border-[#E65100]"
                >
                  {myTeams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name} ({tm.sport?.name} • {tm.ageGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase text-[#111111]/60">
                    Squad Selection ({selectedSquad.length} / 30 selected)
                  </label>
                  <span className="text-xs text-[#111111]/50">Max 30 athletes</span>
                </div>

                {teamAthletes.length === 0 ? (
                  <div className="p-4 bg-[#F7F1E8] rounded-xl text-xs text-[#111111]/60 text-center">
                    No athletes assigned to this team roster yet.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-[#111111]/10 rounded-xl p-2 space-y-1">
                    {teamAthletes.map((ath) => {
                      const isSelected = selectedSquad.includes(ath.id);
                      return (
                        <div
                          key={ath.id}
                          onClick={() => toggleSquadAthlete(ath.id)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#E65100]/10 text-[#E65100] font-semibold'
                              : 'hover:bg-[#111111]/5 text-[#111111]/80'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              readOnly
                              checked={isSelected}
                              className="w-3.5 h-3.5 text-[#E65100] rounded"
                            />
                            <span>{ath.name}</span>
                          </div>
                          {ath.jerseyNumber !== undefined && (
                            <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#111111]/10">
                              #{ath.jerseyNumber}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#111111]/10">
                <Button type="button" variant="outline" onClick={() => setRegisteringTournament(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={registerSubmitting || !selectedTeamId}
                >
                  {registerSubmitting ? 'Submitting...' : 'Submit Registration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
