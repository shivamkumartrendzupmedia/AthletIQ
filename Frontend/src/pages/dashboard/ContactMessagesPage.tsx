import React, { useState, useEffect, useCallback } from 'react';
import {
  academyApi,
  type ContactMessageItem,
  type PaginationMeta,
} from '../../services/academyApi';
import { CrossAccent, AthleticBadge } from '../../design-system';
import {
  Mail,
  MailOpen,
  Archive,
  RefreshCw,
  Search,
  AlertCircle,
  User,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export const ContactMessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessageItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<'All' | 'New' | 'Read' | 'Archived'>('All');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleDeleteMessage = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this message permanently? This cannot be undone.')) return;
    setActionLoadingId(id);
    setError(null);
    try {
      await academyApi.deleteContactMessage(id);
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      await fetchMessages(pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact message.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const fetchMessages = useCallback(async (pageToLoad = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const query: {
        page: number;
        limit: number;
        status?: 'New' | 'Read' | 'Archived';
        search?: string;
      } = {
        page: pageToLoad,
        limit: 20,
      };

      if (statusFilter !== 'All') {
        query.status = statusFilter;
      }
      if (search.trim()) {
        query.search = search.trim();
      }

      const res = await academyApi.listContactMessages(query);
      setMessages(res.items);
      setPagination(res.pagination);

      // If selected message is in list, update it
      if (selectedMessage) {
        const updated = res.items.find((m) => m.id === selectedMessage.id);
        if (updated) setSelectedMessage(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact messages.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, selectedMessage]);

  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(1);
  };

  const handleUpdateStatus = async (
    id: string,
    newStatus: 'New' | 'Read' | 'Archived'
  ) => {
    setActionLoadingId(id);
    try {
      const updated = await academyApi.updateContactMessageStatus(id, {
        status: newStatus,
      });
      if (updated) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? updated : m))
        );
        if (selectedMessage?.id === id) {
          setSelectedMessage(updated);
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update message status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: 'New' | 'Read' | 'Archived') => {
    switch (status) {
      case 'New':
        return <AthleticBadge variant="orange">NEW</AthleticBadge>;
      case 'Read':
        return <AthleticBadge variant="lime">READ</AthleticBadge>;
      case 'Archived':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gray-200 text-gray-700">
            ARCHIVED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 bg-[#F7F1E8] p-4 md:p-8 rounded-[2.5rem]">
      {/* Header Banner */}
      <div className="bg-[#171044] text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AthleticBadge variant="lime">INQUIRIES</AthleticBadge>
            <span className="text-xs text-white/70">Academy Public Communications</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display text-white uppercase tracking-tight">
            Contact Messages <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Inquiries received from the public website contact form.
          </p>
        </div>

        <button
          onClick={() => fetchMessages(pagination.page)}
          disabled={isLoading}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-display font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-colors border border-white/15"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#171044]/10 overflow-x-auto scrollbar-none">
          {(['All', 'New', 'Read', 'Archived'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-[#171044] text-[#D8F500] shadow-sm'
                  : 'text-[#171044]/70 hover:text-[#171044] hover:bg-[#F7F1E8]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#171044]/40"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, subject..."
              className="pl-10 pr-4 py-2 bg-white border border-[#171044]/10 rounded-2xl text-xs font-medium text-[#171044] focus:outline-none focus:border-[#FF5A00] w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#171044] text-white font-display font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-[#251a66] transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchMessages(pagination.page)}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Messages List Column */}
        <div className={selectedMessage ? 'lg:col-span-5 space-y-3' : 'lg:col-span-12 space-y-3'}>
          {isLoading && messages.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-[#171044]/10 text-center space-y-3">
              <RefreshCw size={24} className="mx-auto text-[#FF5A00] animate-spin" />
              <p className="text-xs text-[#171044]/60">Loading inquiries...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-[#171044]/10 text-center space-y-3">
              <MailOpen size={36} className="mx-auto text-[#171044]/30" />
              <h3 className="font-display font-black text-[#171044] uppercase text-base">
                No Messages Found
              </h3>
              <p className="text-xs text-[#171044]/60 max-w-sm mx-auto">
                {statusFilter === 'All'
                  ? 'There are currently no contact messages received.'
                  : `No messages with status "${statusFilter}".`}
              </p>
            </div>
          ) : (
            messages.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMessage(item)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedMessage?.id === item.id
                    ? 'bg-white border-[#FF5A00] shadow-md ring-2 ring-[#FF5A00]/20'
                    : item.status === 'New'
                    ? 'bg-white border-[#171044]/20 shadow-sm hover:border-[#171044]/40 font-semibold'
                    : 'bg-white/80 border-[#171044]/10 hover:border-[#171044]/20 opacity-80'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-[#171044] truncate">
                        {item.name}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="text-xs text-[#171044]/60 truncate">
                      {item.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#171044]/50 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={(e) => handleDeleteMessage(item.id, e)}
                      disabled={actionLoadingId === item.id}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      title="Delete message permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-xs font-bold text-[#171044] truncate">
                  {item.subject || '(No subject)'}
                </div>
                <p className="text-xs text-[#171044]/70 line-clamp-2 mt-1">
                  {item.message}
                </p>
              </div>
            ))
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-[#171044]/60 font-bold">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() => fetchMessages(pagination.page - 1)}
                  className="px-3 py-1.5 bg-white border border-[#171044]/10 rounded-xl text-xs font-bold text-[#171044] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() => fetchMessages(pagination.page + 1)}
                  className="px-3 py-1.5 bg-white border border-[#171044]/10 rounded-xl text-xs font-bold text-[#171044] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Details Pane (when a message is selected) */}
        {selectedMessage && (
          <div className="lg:col-span-7">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#171044]/10 shadow-xl space-y-6 sticky top-6">
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-[#171044]/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(selectedMessage.status)}
                    <span className="text-xs text-[#171044]/50">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black font-display text-[#171044]">
                    {selectedMessage.subject || '(No subject)'}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-xs font-bold text-[#171044]/50 hover:text-[#171044]"
                >
                  Close
                </button>
              </div>

              {/* Sender Details */}
              <div className="p-4 bg-[#F7F1E8] rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-[#171044] flex items-center gap-2">
                    <User size={14} className="text-[#FF5A00]" />
                    {selectedMessage.name}
                  </div>
                  <div className="text-xs text-[#171044]/70 mt-0.5">
                    {selectedMessage.email}
                  </div>
                </div>
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject || 'AthletiQ Inquiry')}`}
                  className="px-3 py-1.5 bg-[#171044] text-[#D8F500] rounded-xl text-xs font-display font-black uppercase tracking-wider hover:bg-[#251a66] transition-colors"
                >
                  Reply via Email
                </a>
              </div>

              {/* Message Body */}
              <div className="space-y-2">
                <span className="text-xs font-black text-[#171044]/60 uppercase tracking-wider">
                  Message Content
                </span>
                <div className="p-5 bg-white border border-[#171044]/10 rounded-2xl text-xs text-[#171044] leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedMessage.message}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-[#171044]/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#171044]/60">Change Status:</span>
                <div className="flex items-center gap-2">
                  {selectedMessage.status !== 'Read' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedMessage.id, 'Read')}
                      disabled={actionLoadingId === selectedMessage.id}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Mark as Read
                    </button>
                  )}
                  {selectedMessage.status !== 'New' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedMessage.id, 'New')}
                      disabled={actionLoadingId === selectedMessage.id}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Mail size={14} />
                      Mark as New
                    </button>
                  )}
                  {selectedMessage.status !== 'Archived' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedMessage.id, 'Archived')}
                      disabled={actionLoadingId === selectedMessage.id}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Archive size={14} />
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                    disabled={actionLoadingId === selectedMessage.id}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
