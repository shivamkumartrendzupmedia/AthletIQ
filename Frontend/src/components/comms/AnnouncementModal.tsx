import React, { useState, useEffect } from 'react';
import { Button } from '../../design-system';
import { X, AlertCircle } from 'lucide-react';
import {
  academyApi,
  type AnnouncementItem,
  type AnnouncementAudience,
  type TeamItem,
} from '../../services/academyApi';
import {
  buildCreateAnnouncementPayload,
  buildUpdateAnnouncementPayload,
} from './commsPayload';
import { ApiClientError } from '../../lib/apiClient';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  announcement?: AnnouncementItem | null;
  role?: string;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  announcement,
  role = 'Admin',
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('All');
  const [team, setTeam] = useState('');
  const [pinned, setPinned] = useState(false);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (announcement) {
        setTitle(announcement.title);
        setBody(announcement.body);
        setAudience(announcement.audience);
        setTeam(announcement.team ? announcement.team.id : '');
        setPinned(announcement.pinned);
      } else {
        setTitle('');
        setBody('');
        setAudience(role === 'Coach' ? 'Team' : 'All');
        setTeam('');
        setPinned(false);
      }
      setErrorBanner(null);
      setFieldErrors({});

      academyApi.listTeams().then((res) => {
        setTeams(res.items);
      }).catch(() => {});
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, announcement, role]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (announcement) {
        const payload = buildUpdateAnnouncementPayload({
          title,
          body,
          audience,
          team: audience === 'Team' ? team : undefined,
          pinned,
        });
        await academyApi.updateAnnouncement(announcement.id, payload);
      } else {
        const payload = buildCreateAnnouncementPayload({
          title,
          body,
          audience,
          team: audience === 'Team' ? team : undefined,
          pinned,
        });
        await academyApi.createAnnouncement(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.fieldErrors && err.fieldErrors.length > 0) {
          const bannerText = err.fieldErrors
            .map((f) => `${f.field}: ${f.message}`)
            .join(' | ');
          setErrorBanner(bannerText);

          const fieldMap: Record<string, string> = {};
          err.fieldErrors.forEach((f) => {
            fieldMap[f.field] = f.message;
          });
          setFieldErrors(fieldMap);
        } else {
          setErrorBanner(err.message || 'Operation failed');
        }
      } else {
        setErrorBanner((err as Error).message || 'An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const allowedAudiences: AnnouncementAudience[] =
    role === 'Coach'
      ? ['Team']
      : ['Public', 'All', 'Athletes', 'Coaches', 'Organizers', 'Team'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border-2 border-[#171044] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-[#171044] text-white flex items-center justify-between">
          <h2 className="text-xl font-bold font-display tracking-wide">
            {announcement ? 'Edit Announcement' : 'New Broadcast Announcement'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorBanner && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
              <div className="font-medium whitespace-pre-wrap">{errorBanner}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#171044] mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Academy Schedule Update"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] font-medium focus:outline-none focus:border-[#FF5A00]"
            />
            {fieldErrors.title && (
              <p className="text-xs text-red-600 mt-1 font-semibold">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#171044] mb-1">
              Audience Scope *
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] font-medium focus:outline-none focus:border-[#FF5A00]"
            >
              {allowedAudiences.map((aud) => (
                <option key={aud} value={aud}>
                  {aud === 'Team' ? 'Team Specific' : aud}
                </option>
              ))}
            </select>
          </div>

          {audience === 'Team' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171044] mb-1">
                Target Team *
              </label>
              <select
                required
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] font-medium focus:outline-none focus:border-[#FF5A00]"
              >
                <option value="">Select Target Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {fieldErrors.team && (
                <p className="text-xs text-red-600 mt-1 font-semibold">{fieldErrors.team}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#171044] mb-1">
              Message Body *
            </label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write announcement details..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] font-medium focus:outline-none focus:border-[#FF5A00]"
            />
            {fieldErrors.body && (
              <p className="text-xs text-red-600 mt-1 font-semibold">{fieldErrors.body}</p>
            )}
          </div>

          {role === 'Admin' && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="pinned-ann"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="w-4 h-4 text-[#FF5A00] rounded focus:ring-0"
              />
              <label htmlFor="pinned-ann" className="text-sm font-bold text-[#171044]">
                Pin announcement to top of dashboard
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#171044]/10">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : announcement ? 'Update' : 'Publish'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
