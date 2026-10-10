import React, { useState, useEffect, useCallback } from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { FileText, Upload, Download, Trash2, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  academyApi,
  type DocumentItem,
  type DocumentCategory,
} from '../../services/academyApi';
import { DocumentModal } from '../../components/comms/DocumentModal';

export const DocumentsPage: React.FC = () => {
  const { role } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await academyApi.getDocuments({
        search: search.trim() ? search.trim() : undefined,
        category: categoryFilter ? categoryFilter : undefined,
        limit: 50,
      });
      setDocuments(res.items);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDocuments();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDocuments]);

  const handleDownload = async (doc: DocumentItem) => {
    setDownloadingId(doc.id);
    try {
      // Authenticated download: fetch -> blob -> object URL (never plain <a href>)
      await academyApi.downloadDocument(doc.id, doc.file.originalName);
    } catch (err) {
      alert((err as Error).message || 'Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await academyApi.deleteDocument(id);
      loadDocuments();
    } catch (err) {
      alert((err as Error).message || 'Failed to delete document');
    }
  };

  const canUpload = role === 'Admin' || role === 'Coach';
  const canDelete = role === 'Admin' || role === 'Coach';

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="purple">ACADEMY COMPLIANCE & REPOSITORY</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            DOCUMENTS & REPOSITORY <CrossAccent color="orange" size="md" />
          </h1>
          <p className="text-sm text-[#171044]/70 mt-1 font-medium">
            Centralized document storage for policies, waivers, forms, and team-specific materials.
          </p>
        </div>

        {canUpload && (
          <Button
            variant="primary"
            iconLeft={<Upload size={18} />}
            onClick={() => setIsModalOpen(true)}
          >
            Upload Document
          </Button>
        )}
      </div>

      {/* Proof Table */}
      <Card variant="standard" className="p-4 bg-white/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#171044]/70">
            System Status & Storage Proof
          </span>
          <AthleticBadge variant="lime" size="sm">AUTHENTICATED STREAM</AthleticBadge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#171044]/10 text-[#171044]/60 uppercase">
                <th className="py-1.5 pr-4">Active Role</th>
                <th className="py-1.5 pr-4">Documents Loaded</th>
                <th className="py-1.5 pr-4">Upload Rights</th>
                <th className="py-1.5">Download Mechanism</th>
              </tr>
            </thead>
            <tbody className="font-bold text-[#171044]">
              <tr>
                <td className="py-1.5 pr-4">{role || 'Guest'}</td>
                <td className="py-1.5 pr-4">{documents.length}</td>
                <td className="py-1.5 pr-4">{canUpload ? 'Enabled (Multi-part POST)' : 'Read Only (GET)'}</td>
                <td className="py-1.5">In-Memory Bearer Auth → Blob → Object URL</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#171044]/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] text-sm font-medium focus:outline-none focus:border-[#FF5A00]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-[#171044]/20 bg-white text-[#171044] text-sm font-medium focus:outline-none focus:border-[#FF5A00]"
        >
          <option value="">All Categories</option>
          {(['Policy', 'Form', 'Schedule', 'Report', 'Other'] as DocumentCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Documents Table */}
      {loading ? (
        <div className="p-12 text-center text-[#171044]/60 font-medium">
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <Card variant="standard" className="p-12 text-center space-y-3">
          <FileText size={40} className="mx-auto text-[#171044]/30" />
          <h3 className="text-lg font-bold font-display text-[#171044]">No documents found</h3>
          <p className="text-sm text-[#171044]/60 max-w-sm mx-auto">
            {search || categoryFilter
              ? 'No documents match your filter criteria.'
              : 'There are no documents uploaded for your access scope.'}
          </p>
        </Card>
      ) : (
        <Card variant="standard" className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#171044] text-white text-xs font-extrabold uppercase font-display border-b border-white/10">
                  <th className="p-4 pl-6">Document Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Visibility</th>
                  <th className="p-4">File Size</th>
                  <th className="p-4">Uploaded By</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171044]/10 text-sm font-semibold">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#F7F1E8]/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-[#FF5A00] shrink-0" />
                        <div>
                          <div className="font-bold text-[#171044]">{doc.title}</div>
                          <div className="text-xs text-[#171044]/50">{doc.file.originalName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <AthleticBadge variant="purple" size="sm">
                        {doc.category}
                      </AthleticBadge>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-[#171044]/70">
                        {doc.visibility === 'Team' ? `Team: ${doc.team?.name || 'Assigned'}` : doc.visibility}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-[#171044]/70">
                      {formatFileSize(doc.file.sizeBytes)}
                    </td>
                    <td className="p-4 text-xs text-[#171044]/80">
                      {doc.uploadedBy?.name || 'Academy'}
                    </td>
                    <td className="p-4 text-xs text-[#171044]/60">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Authenticated Download Button */}
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#171044] text-white hover:bg-[#FF5A00] transition-colors disabled:opacity-50"
                          title="Download document via authenticated stream"
                        >
                          <Download size={14} />
                          {downloadingId === doc.id ? 'Downloading...' : 'Download'}
                        </button>

                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete document"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      <DocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadDocuments}
        role={role || 'Admin'}
      />
    </div>
  );
};
