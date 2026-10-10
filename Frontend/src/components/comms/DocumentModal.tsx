import React, { useState, useEffect } from 'react';
import { Button } from '../../design-system';
import { X, AlertCircle, Upload } from 'lucide-react';
import {
  academyApi,
  type DocumentCategory,
  type DocumentVisibility,
  type TeamItem,
  type PaginatedResult,
} from '../../services/academyApi';
import { ApiClientError } from '../../lib/apiClient';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role?: string;
}

const CATEGORIES: DocumentCategory[] = ['Policy', 'Form', 'Schedule', 'Report', 'Other'];

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  role = 'Admin',
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Policy');
  const [visibility, setVisibility] = useState<DocumentVisibility>('All');
  const [team, setTeam] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setTitle('');
      setCategory('Policy');
      setVisibility(role === 'Coach' ? 'Team' : 'All');
      setTeam('');
      setFile(null);
      setErrorBanner(null);
      setFieldErrors({});

      academyApi.listTeams().then((res) => {
        setTeams(res.items);
      }).catch(() => {});
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, role]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (selected && selected.size > 5 * 1024 * 1024) {
      setErrorBanner('Selected file exceeds the 5 MB size limit');
      setFile(null);
      return;
    }
    setErrorBanner(null);
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setFieldErrors({});

    if (!file) {
      setErrorBanner('Please select a file to upload');
      return;
    }

    setIsSubmitting(true);

    try {
      await academyApi.uploadDocument({
        title: title.trim(),
        category,
        visibility,
        team: visibility === 'Team' ? team.trim() : undefined,
        file,
      });
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
          setErrorBanner(err.message || 'Upload failed');
        }
      } else {
        setErrorBanner((err as Error).message || 'An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const allowedVisibilities: DocumentVisibility[] =
    role === 'Coach'
      ? ['Team']
      : ['Public', 'All', 'Athletes', 'Coaches', 'Organizers', 'Team'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] border-2 border-[#171044] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-[#171044] text-white flex items-center justify-between">
          <h2 className="text-xl font-bold font-display tracking-wide">Upload Academy Document</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorBanner && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
              <div className="font-medium whitespace-pre-wrap">{errorBanner}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#171044] mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Code of Conduct 2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] font-medium focus:outline-none focus:border-[#FF5A00]"
            />
            {fieldErrors.title && (
              <p className="text-xs text-red-600 mt-1 font-semibold">{fieldErrors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171044] mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] font-medium focus:outline-none focus:border-[#FF5A00]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171044] mb-1">
                Visibility Scope *
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] font-medium focus:outline-none focus:border-[#FF5A00]"
              >
                {allowedVisibilities.map((vis) => (
                  <option key={vis} value={vis}>
                    {vis === 'Team' ? 'Team Specific' : vis}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {visibility === 'Team' && (
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
              File Attachment * (.pdf, .png, .jpg, .docx, .xlsx, max 5 MB)
            </label>
            <div className="border-2 border-dashed border-[#171044]/20 rounded-xl p-4 bg-white text-center hover:border-[#FF5A00]/60 transition-colors">
              <input
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-[#171044] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#171044] file:text-white hover:file:bg-[#FF5A00] file:cursor-pointer cursor-pointer"
              />
              {file && (
                <p className="text-xs text-emerald-600 font-bold mt-2">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            {fieldErrors.file && (
              <p className="text-xs text-red-600 mt-1 font-semibold">{fieldErrors.file}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#171044]/10">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting || !file}
              iconLeft={<Upload size={16} />}
            >
              {isSubmitting ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
