import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  athleteDevelopmentService,
  type FullAthleteProfileData,
  type SkillAssessment,
} from '../../services/athleteDevelopmentService';
import { AthletiqRadarChart } from '../../design-system/AthletiqCharts';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import {
  Users,
  Calendar,
  CheckCircle2,
  Plus,
  Shield,
  Award,
  MessageSquare,
  Send,
  FileText,
  Activity,
  Zap,
  Target,
  Search,
  UserCheck,
  LayoutGrid,
  ClipboardList,
} from 'lucide-react';

export const CoachDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'teams' | 'athletes' | 'training' | 'attendance' | 'assessments' | 'performance' | 'development' | 'squad-selection'
  >('teams');

  const [athletes, setAthletes] = useState<FullAthleteProfileData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [attendanceMap, setAttendanceMap] = useState<{ [id: string]: boolean }>({
    'ath-1': true,
    'ath-2': true,
  });

  // Assessment submission state
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('ath-1');
  const [techScore, setTechScore] = useState<number>(88);
  const [tacScore, setTacScore] = useState<number>(86);
  const [physScore, setPhysScore] = useState<number>(90);
  const [mentScore, setMentScore] = useState<number>(85);
  const [coachNotesInput, setCoachNotesInput] = useState<string>('');
  const [assessmentSuccessMsg, setAssessmentSuccessMsg] = useState<string>('');

  // Squad selection tactical pitch state
  const [pitchFormation, setPitchFormation] = useState<'4-3-3' | '4-4-2' | '3-5-2'>('4-3-3');
  const [startingXI, setStartingXI] = useState<{ [pos: string]: string }>({
    GK: 'Noah Miller (#1)',
    LB: 'Ethan Wright (#3)',
    CB1: 'Marcus Johnson (#4)',
    CB2: 'Lucas Scott (#5)',
    RB: 'Jordan Croft (#2)',
    LCM: 'Liam Anderson (#10)',
    CM: 'Mateo Rossi (#8)',
    RCM: 'Mason Thorne (#6)',
    LW: 'Chloe Vance (#11)',
    ST: 'Alex Morgan (#9)',
    RW: 'Kevin Vance (#7)',
  });

  useEffect(() => {
    const loadData = async () => {
      const data = await athleteDevelopmentService.getAllAthletes();
      setAthletes(data);
    };
    loadData();
    const unsub = athleteDevelopmentService.subscribe(loadData);
    return () => unsub();
  }, []);

  const toggleAttendance = (id: string) => {
    setAttendanceMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await athleteDevelopmentService.addSkillAssessment({
      athleteId: selectedAthleteId,
      evaluatorName: 'Coach David Vance',
      evaluatorRole: 'Head Coach • UEFA Pro',
      categories: {
        technical: Number(techScore),
        tactical: Number(tacScore),
        physical: Number(physScore),
        mental: Number(mentScore),
      },
      subSkills: {
        pace: physScore,
        shooting: techScore,
        passing: techScore,
        dribbling: techScore,
        defending: tacScore,
        stamina: physScore,
        agility: physScore,
        decisionMaking: tacScore,
        leadership: mentScore,
        workRate: mentScore,
      },
      notes: coachNotesInput || 'Skill evaluation recorded during weekly tactical review.',
      keyStrengths: ['Technical execution', 'High work rate'],
      growthAreas: ['Continuous decision speed'],
    });

    setAssessmentSuccessMsg('Skill assessment recorded successfully!');
    setTimeout(() => setAssessmentSuccessMsg(''), 3000);
  };

  const filteredAthletes = athletes.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.teamName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 bg-[#F7F1E8] p-4 md:p-8 rounded-[2.5rem]">
      {/* Top Coach Command Header */}
      <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <AthleticBadge variant="lime">HEAD COACH COMMAND CENTER</AthleticBadge>
            <span className="text-xs text-[#D8F500] font-bold">UEFA Pro Licensed</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white uppercase tracking-tight">
            Coach Dashboard <CrossAccent color="lime" size="lg" />
          </h1>
          <p className="text-sm text-white/80 mt-1 max-w-xl">
            Assigned Team: <span className="text-[#D8F500] font-bold">U16 Strikers</span> • Active Squad Count: 18 Athletes
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setActiveTab('squad-selection')}
            className="px-6 py-3 bg-[#D8F500] text-[#171044] font-display font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#c4e000] transition-all shadow-lg flex items-center gap-2"
          >
            <LayoutGrid size={16} /> Tactical Pitch Builder
          </button>
        </div>
      </div>

      {/* 8 DASHBOARD TABS */}
      <div className="flex items-center justify-start overflow-x-auto pb-2 gap-2 border-b border-[#171044]/10 scrollbar-none">
        {[
          { id: 'teams', label: 'Teams', icon: <Shield size={16} /> },
          { id: 'athletes', label: 'Athletes', icon: <Users size={16} /> },
          { id: 'training', label: 'Training', icon: <Calendar size={16} /> },
          { id: 'attendance', label: 'Attendance Check-in', icon: <CheckCircle2 size={16} /> },
          { id: 'assessments', label: 'Assessments', icon: <ClipboardList size={16} /> },
          { id: 'performance', label: 'Performance', icon: <Activity size={16} /> },
          { id: 'development', label: 'Development', icon: <Target size={16} /> },
          { id: 'squad-selection', label: 'Squad Selection', icon: <LayoutGrid size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#171044] text-[#D8F500] shadow-md'
                : 'bg-white text-[#171044] hover:bg-[#171044]/10'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* 1. TEAMS TAB */}
        {activeTab === 'teams' && (
          <motion.div key="teams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <AthleticBadge variant="orange">PRIMARY SQUAD</AthleticBadge>
                  <span className="text-xs font-bold text-emerald-600">88% Win Rate</span>
                </div>
                <h3 className="text-3xl font-black font-display text-[#171044]">U16 Strikers</h3>
                <p className="text-xs text-[#171044]/70">Division 1 Youth Academy League • 18 Registered Athletes</p>
                <div className="pt-2 flex gap-3">
                  <button onClick={() => setActiveTab('athletes')} className="px-4 py-2 bg-[#171044] text-white rounded-xl text-xs font-bold">
                    Manage Squad Roster
                  </button>
                </div>
              </div>

              <div className="bg-white p-7 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <AthleticBadge variant="dark">DEVELOPMENT SQUAD</AthleticBadge>
                  <span className="text-xs font-bold text-[#4B2A9B]">Youth Prospect Tier</span>
                </div>
                <h3 className="text-3xl font-black font-display text-[#171044]">U14 Academy Juniors</h3>
                <p className="text-xs text-[#171044]/70">Regional Junior Circuit • 22 Registered Athletes</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. ATHLETES TAB */}
        {activeTab === 'athletes' && (
          <motion.div key="athletes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-[#171044]/10 shadow-md">
              <div className="relative w-full sm:w-80">
                <Search size={18} className="absolute left-3.5 top-3.5 text-[#171044]/40" />
                <input
                  type="text"
                  placeholder="Search athlete by name, position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044] focus:outline-none"
                />
              </div>
              <span className="text-xs font-bold text-[#171044]/60">Showing {filteredAthletes.length} Athletes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAthletes.map((ath) => (
                <div key={ath.id} className="bg-white p-6 rounded-3xl border border-[#171044]/10 shadow-xl space-y-4">
                  <div className="flex items-center gap-4">
                    <img src={ath.avatar} alt={ath.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-[#171044]" />
                    <div>
                      <h4 className="font-black font-display text-lg text-[#171044]">{ath.name}</h4>
                      <div className="text-xs font-bold text-[#FF5A00]">#{ath.jerseyNumber} • {ath.position}</div>
                      <div className="text-[10px] text-[#171044]/60">{ath.teamName}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-[#F7F1E8] rounded-xl text-xs font-bold">
                    <span>OVR Index Score</span>
                    <span className="text-base font-black text-[#171044]">{ath.ovr} OVR</span>
                  </div>

                  <Link to={`/athlete/${ath.id}`} className="block">
                    <button className="w-full py-2 bg-[#171044] text-[#D8F500] rounded-xl text-xs font-black font-display uppercase tracking-wider hover:bg-[#4B2A9B] transition-colors">
                      View Full Profile
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 3. TRAINING TAB */}
        {activeTab === 'training' && (
          <motion.div key="training" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
              <h3 className="text-2xl font-black font-display text-[#171044]">Training Schedule & Objectives</h3>
              <div className="space-y-3">
                <div className="p-4 bg-[#F7F1E8] rounded-2xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-[#171044]">High-Tempo Counter-Attack Drills</div>
                    <div className="text-xs text-[#171044]/60">Pitch A (Turf) • Today 04:30 PM</div>
                  </div>
                  <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">Upcoming</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. ATTENDANCE CHECK-IN TAB */}
        {activeTab === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black font-display text-[#171044]">Squad Attendance Matrix</h3>
                <span className="text-xs font-bold text-[#FF5A00]">
                  {Object.values(attendanceMap).filter(Boolean).length} / {athletes.length} Present Today
                </span>
              </div>

              <div className="space-y-3">
                {athletes.map((ath) => {
                  const isPresent = attendanceMap[ath.id] ?? false;
                  return (
                    <div key={ath.id} className="flex items-center justify-between p-4 bg-[#F7F1E8] rounded-2xl">
                      <div className="flex items-center gap-3">
                        <img src={ath.avatar} alt={ath.name} className="w-10 h-10 rounded-full object-cover border" />
                        <div>
                          <div className="font-bold text-sm text-[#171044]">{ath.name} (#{ath.jerseyNumber})</div>
                          <div className="text-[11px] text-[#171044]/60">{ath.position}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAttendance(ath.id)}
                        className={`px-5 py-2 rounded-full font-display font-black text-xs uppercase transition-all ${
                          isPresent ? 'bg-emerald-500 text-white' : 'bg-[#171044]/10 text-[#171044] hover:bg-[#FF5A00] hover:text-white'
                        }`}
                      >
                        {isPresent ? '✓ PRESENT' : 'MARK PRESENT'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* 5. ASSESSMENTS TAB */}
        {activeTab === 'assessments' && (
          <motion.div key="assessments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6 max-w-2xl mx-auto">
              <h3 className="text-2xl font-black font-display text-[#171044]">Record Skill Assessment</h3>

              {assessmentSuccessMsg && (
                <div className="p-4 bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold">
                  {assessmentSuccessMsg}
                </div>
              )}

              <form onSubmit={handleAssessmentSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Select Athlete</label>
                  <select
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    className="w-full p-3.5 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]"
                  >
                    {athletes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (#{a.jerseyNumber} • {a.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Technical ({techScore})</label>
                    <input type="range" min="50" max="99" value={techScore} onChange={(e) => setTechScore(Number(e.target.value))} className="w-full accent-[#FF5A00]" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Tactical ({tacScore})</label>
                    <input type="range" min="50" max="99" value={tacScore} onChange={(e) => setTacScore(Number(e.target.value))} className="w-full accent-[#FF5A00]" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Physical ({physScore})</label>
                    <input type="range" min="50" max="99" value={physScore} onChange={(e) => setPhysScore(Number(e.target.value))} className="w-full accent-[#FF5A00]" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Mental ({mentScore})</label>
                    <input type="range" min="50" max="99" value={mentScore} onChange={(e) => setMentScore(Number(e.target.value))} className="w-full accent-[#FF5A00]" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-[#171044]/60 block mb-1">Coach Notes</label>
                  <textarea
                    rows={3}
                    value={coachNotesInput}
                    onChange={(e) => setCoachNotesInput(e.target.value)}
                    placeholder="Enter technical summary notes..."
                    className="w-full p-3 bg-[#F7F1E8] rounded-2xl text-xs font-bold text-[#171044]"
                  />
                </div>

                <Button variant="primary" size="sm" type="submit" className="w-full">
                  Submit Assessment Log
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* 6. PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <motion.div key="performance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center space-y-6">
              <h3 className="text-2xl font-black font-display text-white uppercase">Squad Average Radar</h3>
              <AthletiqRadarChart
                metrics={[
                  { label: 'Technical', value: 87 },
                  { label: 'Tactical', value: 84 },
                  { label: 'Physical', value: 89 },
                  { label: 'Mental', value: 86 },
                  { label: 'Pace', value: 90 },
                  { label: 'Shooting', value: 85 },
                ]}
                size={290}
                colorScheme="lime"
              />
            </div>
          </motion.div>
        )}

        {/* 7. DEVELOPMENT TAB */}
        {activeTab === 'development' && (
          <motion.div key="development" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-4">
              <h3 className="text-2xl font-black font-display text-[#171044]">Player Development Plans</h3>
              <p className="text-xs text-[#171044]/70">Tracking active goals for all U16 Strikers players.</p>
            </div>
          </motion.div>
        )}

        {/* 8. SQUAD SELECTION TAB (TACTICAL PITCH VISUALIZER) */}
        {activeTab === 'squad-selection' && (
          <motion.div key="squad-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black font-display text-[#171044] uppercase tracking-tight">
                    Tactical Lineup Builder <CrossAccent color="orange" size="sm" />
                  </h3>
                  <p className="text-xs text-[#171044]/60">Matchday squad selection & formation setup.</p>
                </div>
                <div className="flex items-center gap-2">
                  {(['4-3-3', '4-4-2', '3-5-2'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setPitchFormation(fmt)}
                      className={`px-4 py-2 rounded-xl text-xs font-black font-display transition-all ${
                        pitchFormation === fmt ? 'bg-[#171044] text-[#D8F500]' : 'bg-[#F7F1E8] text-[#171044]'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Diagram */}
              <div className="relative w-full h-[450px] bg-emerald-800 rounded-3xl border-4 border-white shadow-2xl overflow-hidden p-6 flex flex-col justify-between items-center text-white">
                {/* Pitch Lines */}
                <div className="absolute inset-0 border-2 border-white/30 m-4 rounded-2xl pointer-events-none" />
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/30 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white/30 pointer-events-none" />

                {/* Forwards Row */}
                <div className="w-full flex justify-around items-center relative z-10 pt-4">
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-[#D8F500]">
                    LW: {startingXI.LW}
                  </div>
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-[#FF5A00]">
                    ST: {startingXI.ST}
                  </div>
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-[#D8F500]">
                    RW: {startingXI.RW}
                  </div>
                </div>

                {/* Midfielders Row */}
                <div className="w-full flex justify-around items-center relative z-10">
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-white">
                    LCM: {startingXI.LCM}
                  </div>
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-white">
                    CM: {startingXI.CM}
                  </div>
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-white">
                    RCM: {startingXI.RCM}
                  </div>
                </div>

                {/* Defenders Row */}
                <div className="w-full flex justify-around items-center relative z-10">
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-white">
                    LB: {startingXI.LB}
                  </div>
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-white">
                    CB: {startingXI.CB1}
                  </div>
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-white">
                    CB: {startingXI.CB2}
                  </div>
                  <div className="bg-[#171044] px-3.5 py-1.5 rounded-full text-xs font-black border-2 border-white">
                    RB: {startingXI.RB}
                  </div>
                </div>

                {/* Goalkeeper */}
                <div className="relative z-10 pb-2">
                  <div className="bg-[#FF5A00] text-white px-4 py-1.5 rounded-full text-xs font-black border-2 border-white">
                    GK: {startingXI.GK}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
