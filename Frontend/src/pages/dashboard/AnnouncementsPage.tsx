import React, { useState, useEffect, useCallback } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Bell, Plus, Pin, Trash2, Edit2, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  academyApi,
  type AnnouncementItem,
} from '../../services/academyApi';
import { AnnouncementModal } from '../../components/comms/AnnouncementModal';

export const AnnouncementsPage: React.FC = () => {
  const { role } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await academyApi.getAnnouncements({
        search: search.trim() ? search.trim() : undefined,
        limit: 50,
      });
      setAnnouncements(res.items);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAnnouncements();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAnnouncements]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await academyApi.deleteAnnouncement(id);
      loadAnnouncements();
    } catch (err) {
      alert((err as Error).message || 'Failed to delete announcement');
    }
  };

  const handleEdit = (ann: AnnouncementItem) => {
    setSelectedAnnouncement(ann);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedAnnouncement(null);
    setIsModalOpen(true);
  };

  const canCreate = role === 'Admin' || role === 'Coach';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="orange">ACADEMY COMMUNICATIONS</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            BROADCAST ANNOUNCEMENTS <CrossAccent color="orange" size="md" />
          </h1>
          <p className="text-sm text-[#171044]/70 mt-1 font-medium">
            Official announcements, schedules, and academy broadcasts with audience-scoped delivery.
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            iconLeft={<Plus size={18} />}
            onClick={handleNew}
          >
            New Broadcast
          </Button>
        )}
      </div>

      {/* Proof Table */}
      <Card variant="standard" className="p-4 bg-white/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#171044]/70">
            System Status & Data Proof
          </span>
          <AthleticBadge variant="lime" size="sm">LIVE ATLAS BACKEND</AthleticBadge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#171044]/10 text-[#171044]/60 uppercase">
                <th className="py-1.5 pr-4">Active Role</th>
                <th className="py-1.5 pr-4">Announcements Loaded</th>
                <th className="py-1.5 pr-4">Creation Rights</th>
                <th className="py-1.5">Storage Mode</th>
              </tr>
            </thead>
            <tbody className="font-bold text-[#171044]">
              <tr>
                <td className="py-1.5 pr-4">{role || 'Guest'}</td>
                <td className="py-1.5 pr-4">{announcements.length}</td>
                <td className="py-1.5 pr-4">{canCreate ? 'Enabled (POST)' : 'Read Only (GET)'}</td>
                <td className="py-1.5">Plain Text / Scoped Atlas DB</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#171044]/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements by title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] text-sm font-medium focus:outline-none focus:border-[#FF5A00]"
          />
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="p-12 text-center text-[#171044]/60 font-medium">
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <Card variant="standard" className="p-12 text-center space-y-3">
          <Bell size={40} className="mx-auto text-[#171044]/30" />
          <h3 className="text-lg font-bold font-display text-[#171044]">No announcements found</h3>
          <p className="text-sm text-[#171044]/60 max-w-sm mx-auto">
            {search
              ? 'No announcements match your search query.'
              : 'There are no announcements posted for your role at this time.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card
              key={a.id}
              variant="standard"
              className={`space-y-3 transition-shadow hover:shadow-md ${
                a.pinned ? 'border-2 border-[#FF5A00]/40 bg-[#FFF9F5]' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-[#FF5A00] bg-[#FF5A00]/10 px-2.5 py-0.5 rounded-full">
                      <Pin size={12} /> Pinned
                    </span>
                  )}
                  <AthleticBadge variant="purple" size="sm">
                    {a.audience === 'Team' ? `Team: ${a.team?.name || 'Assigned'}` : a.audience}
                  </AthleticBadge>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#171044]/60">
                    {new Date(a.publishedAt).toLocaleDateString()} • By {a.createdBy?.name || 'Academy'}
                  </span>

                  {(role === 'Admin' || role === 'Coach') && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(a)}
                        className="p-1.5 text-[#171044]/50 hover:text-[#171044] rounded-lg hover:bg-black/5 transition-colors"
                        title="Edit announcement"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete announcement"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold font-display text-[#171044]">{a.title}</h3>
              {/* Plain text rendering (no dangerouslySetInnerHTML) */}
              <p className="text-sm text-[#171044]/80 leading-relaxed font-medium whitespace-pre-wrap">
                {a.body}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadAnnouncements}
        announcement={selectedAnnouncement}
        role={role || 'Admin'}
      />
    </div>
  );
};
