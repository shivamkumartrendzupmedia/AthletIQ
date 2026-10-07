import React, { useState } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, CheckCircle2, Users } from 'lucide-react';
import { mockTrainingSessions, type TrainingSession } from '../../data/academyData';

export const TrainingCalendarPage: React.FC = () => {
  const [sessions, setSessions] = useState<TrainingSession[]>(mockTrainingSessions);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTeam, setNewTeam] = useState('U16 Strikers');
  const [newTime, setNewTime] = useState('04:30 PM - 06:30 PM');
  const [newLocation, setNewLocation] = useState('Pitch A (Turf)');

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle) {
      setSessions([
        {
          id: `ts-${Date.now()}`,
          title: newTitle,
          sport: 'Football',
          teamId: 'u16-strikers',
          teamName: newTeam,
          coachName: 'David Vance',
          date: 'Tomorrow',
          time: newTime,
          pitchLocation: newLocation,
          objectives: ['Tactical positioning', 'Agility drills'],
          status: 'Upcoming',
          attendanceCount: { present: 18, total: 18 },
        },
        ...sessions,
      ]);
      setShowModal(false);
      setNewTitle('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="lime">HIGH PERFORMANCE TRAINING ENGINE</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            TRAINING CALENDAR & SESSIONS <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button variant="primary" iconLeft={<Plus size={18} />} onClick={() => setShowModal(true)}>
          Schedule Session
        </Button>
      </div>

      {/* Calendar Week Visual Bar */}
      <Card variant="dark" className="p-6">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold font-display">
          {['MON 22', 'TUE 23', 'WED 24', 'THU 25', 'FRI 26', 'SAT 27', 'SUN 28'].map((day, i) => (
            <div key={i} className={`p-3 rounded-2xl ${i === 2 ? 'bg-[#D8F500] text-[#171044] font-black' : 'bg-white/10 text-white'}`}>
              <div>{day}</div>
              <div className="text-[10px] opacity-75 mt-1">{i === 2 ? '3 Sessions' : '1 Session'}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map((s) => (
          <Card key={s.id} variant="standard" className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <AthleticBadge variant={s.status === 'Completed' ? 'dark' : 'orange'}>{s.status}</AthleticBadge>
                <AthleticBadge variant="purple">{s.teamName}</AthleticBadge>
              </div>

              <h3 className="text-2xl font-black font-display text-[#171044]">{s.title}</h3>

              <div className="space-y-1.5 text-xs text-[#171044]/80 font-medium">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#FF5A00]" />
                  <span>{s.date} • {s.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#FF5A00]" />
                  <span>Location: {s.pitchLocation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#FF5A00]" />
                  <span>Coach {s.coachName}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#171044]/10 space-y-1">
                <div className="text-xs font-bold text-[#171044] uppercase">Objectives:</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.objectives.map((obj, idx) => (
                    <span key={idx} className="text-[10px] font-bold bg-[#171044]/5 text-[#171044] px-2.5 py-1 rounded-full">
                      ✓ {obj}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#171044]/10 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600">
                Attendance: {s.attendanceCount.present} / {s.attendanceCount.total} Checked In
              </span>
              <Button variant="secondary" size="sm">
                View Roster Log
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Schedule Session Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#171044] text-white p-8 rounded-3xl max-w-md w-full space-y-6 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black font-display text-white">Schedule Session <CrossAccent color="lime" size="sm" /></h3>
              <button onClick={() => setShowModal(false)} className="text-white/60 hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tactical Set Piece Drills"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">Target Squad</label>
                <select
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  className="w-full bg-[#171044] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                >
                  <option value="U16 Strikers">U16 Strikers</option>
                  <option value="U18 Hoops Elite">U18 Hoops Elite</option>
                  <option value="Aqua Elite Squad">Aqua Elite Squad</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">Pitch Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="lime">Schedule Now</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
