import React, { useState } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { Bell, Plus, Send } from 'lucide-react';
import { mockAnnouncements } from '../../data/academyData';

export const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAudience, setNewAudience] = useState<'All Academy' | 'Coaches Only' | 'Parents & Athletes'>('All Academy');

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle && newContent) {
      setAnnouncements([
        {
          id: `ann-${Date.now()}`,
          title: newTitle,
          content: newContent,
          audience: newAudience,
          date: 'Just now',
          author: 'Academy Admin',
          priority: 'High',
        },
        ...announcements,
      ]);
      setShowModal(false);
      setNewTitle('');
      setNewContent('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="orange">ACADEMY COMMUNICATIONS</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            BROADCAST ANNOUNCEMENTS <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button variant="primary" iconLeft={<Plus size={18} />} onClick={() => setShowModal(true)}>
          New Broadcast
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.map((a) => (
          <Card key={a.id} variant="standard" className="space-y-3">
            <div className="flex items-center justify-between">
              <AthleticBadge variant="purple">{a.audience}</AthleticBadge>
              <span className="text-xs font-bold text-[#171044]/60">{a.date} • By {a.author}</span>
            </div>
            <h3 className="text-xl font-bold font-display text-[#171044]">{a.title}</h3>
            <p className="text-sm text-[#171044]/80 leading-relaxed font-medium">{a.content}</p>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#171044] text-white p-8 rounded-3xl max-w-md w-full space-y-6 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black font-display text-white">Create Announcement <CrossAccent color="lime" size="sm" /></h3>
              <button onClick={() => setShowModal(false)} className="text-white/60 hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Change for U16 Pitch A"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">Target Audience</label>
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value as any)}
                  className="w-full bg-[#171044] border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500]"
                >
                  <option value="All Academy">All Academy</option>
                  <option value="Coaches Only">Coaches Only</option>
                  <option value="Parents & Athletes">Parents & Athletes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 uppercase mb-1">Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write message details..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#D8F500] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="lime" iconRight={<Send size={16} />}>Broadcast Now</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
