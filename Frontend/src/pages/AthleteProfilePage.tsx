import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AthletiqRadarChart,
  AthletiqProgressGauge,
} from '../design-system/AthletiqCharts';
import { StateContainer } from '../components/StateContainer';
import { Card, Button, AthleticBadge } from '../design-system';
import {
  ArrowLeft,
  Target,
  MessageSquare,
  TrendingUp,
  Zap,
  CheckCircle2,
  Plus,
  Calendar,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import {
  academyApi,
  type AthleteDevelopmentView,
  type AthleteGoalItem,
} from '../services/academyApi';
import { useAuth } from '../context/AuthContext';
import { AssessmentModal } from '../components/development/AssessmentModal';
import { FeedbackModal } from '../components/development/FeedbackModal';
import { GoalModal } from '../components/development/GoalModal';
import { ApiClientError } from '../lib/apiClient';

export const AthleteProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role, user } = useAuth();
  const athleteId = id || 'me';

  const [devData, setDevData] = useState<AthleteDevelopmentView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'development' | 'assessments' | 'feedback' | 'goals'>('development');

  // Modals
  const [showAssessmentModal, setShowAssessmentModal] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<AthleteGoalItem | null>(null);

  const isStaff = role === 'Admin' || role === 'Coach';
  const isSelf = athleteId === 'me' || (devData && devData.athlete.id === user?.id);

  const fetchDevelopmentData = useCallback(async () => {
    // If id is not 'me' and not a 24-character hex ObjectId (e.g. legacy 'ath-1')
    if (athleteId !== 'me' && !/^[0-9a-fA-F]{24}$/.test(athleteId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      let data: AthleteDevelopmentView | null = null;
      if (athleteId === 'me') {
        data = await academyApi.getAthleteSelfDevelopment();
      } else {
        data = await academyApi.getAthleteDevelopment(athleteId);
      }

      if (!data) {
        setNotFound(true);
      } else {
        setDevData(data);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.statusCode === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load athlete development profile');
      }
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchDevelopmentData();
  }, [fetchDevelopmentData]);

  const handleAcknowledgeFeedback = async (feedbackId: string) => {
    try {
      await academyApi.acknowledgeFeedback(feedbackId);
      fetchDevelopmentData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to acknowledge feedback');
    }
  };

  const handleOpenEditGoal = (g: AthleteGoalItem) => {
    setEditingGoal(g);
    setShowGoalModal(true);
  };

  const handleOpenCreateGoal = () => {
    setEditingGoal(null);
    setShowGoalModal(true);
  };

  // 1. Clean "Athlete not found" state if ID is invalid or 404
  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-6 lg:p-12 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <StateContainer
            empty
            emptyMessage={
              athleteId === 'ath-1'
                ? 'The requested demo athlete identifier (ath-1) is no longer valid. Please select a registered athlete from your squad roster.'
                : 'The requested athlete profile could not be found or you do not have permission to view it.'
            }
            emptyActionLabel="Back to Athletes Roster"
            onEmptyAction={() => {
              window.location.href = isStaff ? '/dashboard/athletes' : '/dashboard/athlete';
            }}
          >
            <div />
          </StateContainer>
        </div>
      </div>
    );
  }

  // 2. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-6 lg:p-12 flex items-center justify-center">
        <StateContainer loading>
          <div />
        </StateContainer>
      </div>
    );
  }

  // 3. Error state
  if (error || !devData) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-6 lg:p-12 flex items-center justify-center">
        <StateContainer
          error={error || 'An unexpected error occurred while fetching athlete data.'}
          onRetry={fetchDevelopmentData}
        >
          <div />
        </StateContainer>
      </div>
    );
  }

  const { athlete, latestAssessment, skillCategoryAverages, attendanceRate, assessmentHistory, feedback, goals } = devData;

  const radarMetrics = [
    { label: 'Technical', value: (skillCategoryAverages?.technical || 0) * 10 },
    { label: 'Physical', value: (skillCategoryAverages?.physical || 0) * 10 },
    { label: 'Tactical', value: (skillCategoryAverages?.tactical || 0) * 10 },
    { label: 'Mental', value: (skillCategoryAverages?.mental || 0) * 10 },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#171044] pb-24">
      {/* Top Banner & Header */}
      <div className="bg-[#171044] text-white pt-8 pb-12 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link
              to={isStaff ? '/dashboard/athletes' : '/dashboard/athlete'}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider"
            >
              <ArrowLeft size={16} />
              <span>{isStaff ? 'Back to Squad' : 'Back to Athlete Hub'}</span>
            </Link>

            {isStaff && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                  onClick={() => setShowFeedbackModal(true)}
                >
                  <MessageSquare size={14} className="mr-1.5" />
                  Add Feedback
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowAssessmentModal(true)}
                >
                  <Plus size={14} className="mr-1.5" />
                  New Assessment
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF5A00] to-[#FFA000] flex items-center justify-center text-white font-bold text-2xl font-display shadow-lg shadow-[#FF5A00]/20">
                {athlete.jerseyNumber ? `#${athlete.jerseyNumber}` : <UserIcon size={32} />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl lg:text-3xl font-bold font-display tracking-tight text-white">
                    {athlete.name}
                  </h1>
                  {athlete.position && (
                    <AthleticBadge variant="white" className="bg-white/10 text-white text-xs">
                      {athlete.position}
                    </AthleticBadge>
                  )}
                </div>
                <p className="text-xs text-white/70 mt-1">
                  {athlete.teamName || 'Unassigned Squad'} • {athlete.sportName || 'Academy Discipline'}
                </p>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-white/60 block">Overall</span>
                <span className="text-xl font-bold font-display text-[#D8F500]">
                  {skillCategoryAverages ? skillCategoryAverages.overall : '—'}
                </span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-white/60 block">Attendance</span>
                <span className="text-xl font-bold font-display text-white">
                  {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                </span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-white/60 block">Active Goals</span>
                <span className="text-xl font-bold font-display text-[#FF5A00]">
                  {goals.filter((g) => g.status === 'Active').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 -mt-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#171044]/10 p-1 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('development')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'development'
                ? 'bg-[#171044] text-white shadow-sm'
                : 'text-[#171044]/70 hover:text-[#171044]'
            }`}
          >
            <TrendingUp size={14} />
            <span>Development Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'assessments'
                ? 'bg-[#171044] text-white shadow-sm'
                : 'text-[#171044]/70 hover:text-[#171044]'
            }`}
          >
            <Zap size={14} />
            <span>Skill History ({assessmentHistory.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'feedback'
                ? 'bg-[#171044] text-white shadow-sm'
                : 'text-[#171044]/70 hover:text-[#171044]'
            }`}
          >
            <MessageSquare size={14} />
            <span>Coach Feedback ({feedback.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'goals'
                ? 'bg-[#171044] text-white shadow-sm'
                : 'text-[#171044]/70 hover:text-[#171044]'
            }`}
          >
            <Target size={14} />
            <span>Milestones & Goals ({goals.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mt-8 space-y-8">
        {activeTab === 'development' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Radar Spider Chart & Category Breakdown */}
            <div className="lg:col-span-2 space-y-6">
              <Card variant="standard" className="p-6">
                <div className="flex items-center justify-between mb-4 border-b border-[#171044]/10 pb-4">
                  <div>
                    <h3 className="text-lg font-bold font-display text-[#171044]">
                      Skill Radar Matrix
                    </h3>
                    <p className="text-xs text-[#171044]/60">
                      Multi-dimensional performance evaluation across 4 pillars
                    </p>
                  </div>
                  {latestAssessment && (
                    <span className="text-xs text-[#171044]/60 font-semibold flex items-center gap-1">
                      <Clock size={12} />
                      Latest: {new Date(latestAssessment.date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {skillCategoryAverages ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="flex justify-center p-2 bg-[#171044] rounded-2xl">
                      <AthletiqRadarChart metrics={radarMetrics} size={280} colorScheme="orange" />
                    </div>

                    <div className="space-y-4">
                      <div className="p-3 bg-[#FAF8F5] rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-[#171044]">Technical Pillar</span>
                        <span className="font-bold text-sm text-[#FF5A00] font-display">
                          {skillCategoryAverages.technical} / 10
                        </span>
                      </div>
                      <div className="p-3 bg-[#FAF8F5] rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-[#171044]">Physical Pillar</span>
                        <span className="font-bold text-sm text-[#FF5A00] font-display">
                          {skillCategoryAverages.physical} / 10
                        </span>
                      </div>
                      <div className="p-3 bg-[#FAF8F5] rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-[#171044]">Tactical Pillar</span>
                        <span className="font-bold text-sm text-[#FF5A00] font-display">
                          {skillCategoryAverages.tactical} / 10
                        </span>
                      </div>
                      <div className="p-3 bg-[#FAF8F5] rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-[#171044]">Mental Pillar</span>
                        <span className="font-bold text-sm text-[#FF5A00] font-display">
                          {skillCategoryAverages.mental} / 10
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-[#171044]/60 space-y-3">
                    <Zap size={32} className="mx-auto text-[#171044]/30" />
                    <p className="text-sm font-semibold">No skill assessments recorded yet.</p>
                    {isStaff && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowAssessmentModal(true)}
                      >
                        Record First Assessment
                      </Button>
                    )}
                  </div>
                )}
              </Card>

              {/* Latest Assessment Details */}
              {latestAssessment && (
                <Card variant="standard" className="p-6">
                  <h4 className="font-bold font-display text-base text-[#171044] mb-4">
                    Latest Metric Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">PACE</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.pace}/10</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">SHOOTING</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.shooting}/10</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">PASSING</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.passing}/10</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">DRIBBLING</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.dribbling}/10</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">DEFENDING</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.defending}/10</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">STAMINA</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.stamina}/10</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">AGILITY</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.agility}/10</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">DECISION</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.decisionMaking}/10</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">LEADERSHIP</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.leadership}/10</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#171044]/10 rounded-xl">
                      <span className="text-[#171044]/60 block text-[10px] font-bold">WORK RATE</span>
                      <span className="font-bold text-sm text-[#171044]">{latestAssessment.workRate}/10</span>
                    </div>
                  </div>
                  {latestAssessment.note && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      <span className="font-bold block mb-1">Coach Assessment Notes:</span>
                      <p>{latestAssessment.note}</p>
                    </div>
                  )}
                </Card>
              )}
            </div>

            {/* Right Column: Attendance & Active Goals */}
            <div className="space-y-6">
              {/* Attendance Card */}
              <Card variant="standard" className="p-6 text-center space-y-4">
                <h4 className="font-bold font-display text-base text-[#171044]">
                  Training Attendance Rate
                </h4>
                <div className="p-4 bg-[#171044] rounded-2xl flex justify-center text-white">
                  <AthletiqProgressGauge
                    score={attendanceRate ?? 0}
                    label="Punctuality"
                    colorScheme="orange"
                    size={140}
                  />
                </div>
                <p className="text-xs text-[#171044]/70">
                  Calculated across all logged squads. Excused absences are excluded from rate calculation.
                </p>
              </Card>

              {/* Active Goals Preview */}
              <Card variant="standard" className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold font-display text-base text-[#171044]">
                    Active Targets
                  </h4>
                  {isStaff && (
                    <button
                      onClick={handleOpenCreateGoal}
                      className="text-xs font-bold text-[#FF5A00] hover:underline"
                    >
                      + Add Goal
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {goals.slice(0, 3).map((g) => (
                    <div
                      key={g.id}
                      className="p-3 bg-white border border-[#171044]/10 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#171044]">{g.title}</span>
                        <span className="font-semibold text-[#FF5A00]">{g.progress}%</span>
                      </div>
                      <div className="w-full bg-[#171044]/10 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#FF5A00] h-full transition-all duration-300"
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {goals.length === 0 && (
                    <p className="text-xs text-[#171044]/60 text-center py-4">
                      No active milestones assigned.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Skill Assessments History */}
        {activeTab === 'assessments' && (
          <Card variant="standard" className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-[#171044]">
                  Historical Skill Assessments
                </h3>
                <p className="text-xs text-[#171044]/60">
                  Audit log of past evaluations (up to 50 assessments)
                </p>
              </div>
              {isStaff && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAssessmentModal(true)}
                >
                  <Plus size={14} className="mr-1.5" />
                  New Assessment
                </Button>
              )}
            </div>

            <div className="divide-y divide-[#171044]/10">
              {assessmentHistory.map((ass) => (
                <div key={ass.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#171044]">
                        {new Date(ass.date).toLocaleDateString()}
                      </span>
                      <AthleticBadge variant="dark" className="text-xs">
                        By: {ass.assessedBy.name}
                      </AthleticBadge>
                    </div>
                    <span className="font-bold font-display text-[#FF5A00] text-base">
                      {ass.overall} / 10
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-[#171044]/80">
                    <div className="p-2 bg-[#FAF8F5] rounded-lg">Tech: {ass.categories.technical}</div>
                    <div className="p-2 bg-[#FAF8F5] rounded-lg">Phys: {ass.categories.physical}</div>
                    <div className="p-2 bg-[#FAF8F5] rounded-lg">Tact: {ass.categories.tactical}</div>
                    <div className="p-2 bg-[#FAF8F5] rounded-lg">Ment: {ass.categories.mental}</div>
                  </div>
                  {ass.note && (
                    <p className="text-xs text-[#171044]/70 italic mt-1 bg-white p-2 border border-[#171044]/10 rounded-lg">
                      "{ass.note}"
                    </p>
                  )}
                </div>
              ))}
              {assessmentHistory.length === 0 && (
                <p className="text-xs text-center py-8 text-[#171044]/60">
                  No historical assessments available.
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Tab 3: Coach Feedback */}
        {activeTab === 'feedback' && (
          <Card variant="standard" className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-[#171044]">
                  Coach Guidance & Praise
                </h3>
                <p className="text-xs text-[#171044]/60">
                  Actionable notes shared with athlete
                </p>
              </div>
              {isStaff && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowFeedbackModal(true)}
                >
                  <Plus size={14} className="mr-1.5" />
                  Post Feedback
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {feedback.map((fb) => (
                <div
                  key={fb.id}
                  className="p-4 bg-white border border-[#171044]/10 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#171044]">{fb.coach.name}</span>
                      <AthleticBadge
                        variant={
                          fb.type === 'Praise'
                            ? 'lime'
                            : fb.type === 'Improvement'
                            ? 'orange'
                            : 'white'
                        }
                        className="text-[10px]"
                      >
                        {fb.type}
                      </AthleticBadge>
                    </div>
                    <span className="text-[#171044]/50">
                      {new Date(fb.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#171044] leading-relaxed whitespace-pre-wrap">
                    {fb.text}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#171044]/5 text-xs">
                    {fb.acknowledgedAt ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 size={13} />
                        Acknowledged on {new Date(fb.acknowledgedAt).toLocaleDateString()}
                      </span>
                    ) : isSelf ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAcknowledgeFeedback(fb.id)}
                        className="text-xs py-1 px-3"
                      >
                        Acknowledge Note
                      </Button>
                    ) : (
                      <span className="text-amber-700 font-semibold text-[11px]">
                        Pending Athlete Acknowledgment
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {feedback.length === 0 && (
                <p className="text-xs text-center py-8 text-[#171044]/60">
                  No feedback notes recorded yet.
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Tab 4: Athlete Goals */}
        {activeTab === 'goals' && (
          <Card variant="standard" className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#171044]/10 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-[#171044]">
                  Goals & Milestones
                </h3>
                <p className="text-xs text-[#171044]/60">
                  Individual targets with progress tracking
                </p>
              </div>
              {isStaff && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateGoal}
                >
                  <Plus size={14} className="mr-1.5" />
                  Assign New Goal
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className="p-4 bg-white border border-[#171044]/10 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#171044]">{g.title}</h4>
                      {g.description && (
                        <p className="text-xs text-[#171044]/70 mt-0.5">{g.description}</p>
                      )}
                    </div>
                    <AthleticBadge
                      variant={
                        g.status === 'Achieved'
                          ? 'lime'
                          : g.status === 'Active'
                          ? 'orange'
                          : 'white'
                      }
                      className="text-[10px]"
                    >
                      {g.status}
                    </AthleticBadge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#171044]/60 font-semibold">Progress</span>
                      <span className="font-bold text-[#FF5A00]">{g.progress}%</span>
                    </div>
                    <div className="w-full bg-[#171044]/10 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#FF5A00] h-full transition-all duration-300"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#171044]/10 text-xs">
                    <span className="text-[#171044]/60 font-semibold flex items-center gap-1">
                      <Calendar size={12} />
                      Due: {new Date(g.targetDate).toLocaleDateString()}
                    </span>
                    {(isStaff || isSelf) && (
                      <button
                        onClick={() => handleOpenEditGoal(g)}
                        className="text-xs font-bold text-[#FF5A00] hover:underline"
                      >
                        {isSelf ? 'Update Progress' : 'Edit Goal'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {goals.length === 0 && (
                <div className="col-span-2 text-center py-8 text-[#171044]/60 text-xs">
                  No development goals currently assigned.
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showAssessmentModal && (
        <AssessmentModal
          isOpen={showAssessmentModal}
          onClose={() => setShowAssessmentModal(false)}
          onSuccess={fetchDevelopmentData}
          athleteId={devData.athlete.id}
          athleteName={devData.athlete.name}
        />
      )}

      {showFeedbackModal && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSuccess={fetchDevelopmentData}
          athleteId={devData.athlete.id}
          athleteName={devData.athlete.name}
        />
      )}

      {showGoalModal && (
        <GoalModal
          isOpen={showGoalModal}
          onClose={() => {
            setShowGoalModal(false);
            setEditingGoal(null);
          }}
          onSuccess={fetchDevelopmentData}
          athleteId={devData.athlete.id}
          goal={editingGoal}
          role={role || undefined}
        />
      )}
    </div>
  );
};
