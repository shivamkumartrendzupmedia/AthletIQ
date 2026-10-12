import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, AthleticBadge, CrossAccent } from '../../design-system';
import {
  Bell,
  CheckCheck,
  Check,
  Megaphone,
  Award,
  MessageSquare,
  Trophy,
  Target,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { academyApi, type NotificationItem } from '../../services/academyApi';
import { formatNotificationTime } from '../../lib/notificationPayloads';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await academyApi.getNotifications({
        page,
        limit: 15,
        unreadOnly,
      });
      setNotifications(res.items);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total);
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await academyApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch {
      // safe ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await academyApi.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch {
      // safe ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClickNotification = async (notif: NotificationItem) => {
    if (!notif.readAt) {
      await handleMarkAsRead(notif._id || notif.id || '');
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Announcement':
        return <Megaphone size={18} className="text-[#D8F500]" />;
      case 'Assessment':
        return <Award size={18} className="text-cyan-400" />;
      case 'Feedback':
        return <MessageSquare size={18} className="text-amber-400" />;
      case 'Match':
        return <Trophy size={18} className="text-emerald-400" />;
      case 'Goal':
        return <Target size={18} className="text-purple-400" />;
      default:
        return <Info size={18} className="text-white/70" />;
    }
  };

  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-display text-white flex items-center gap-2">
            NOTIFICATIONS <CrossAccent color="lime" size="sm" />
          </h1>
          <p className="text-xs text-white/60">
            Real-time activity alerts, match updates, and personal development events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasUnread && (
            <Button
              variant="outline"
              size="sm"
              disabled={markingAll}
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck size={14} className="mr-1.5" />
              {markingAll ? 'Marking...' : 'Mark All Read'}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            !unreadOnly
              ? 'bg-[#D8F500] text-black'
              : 'text-white/60 hover:text-white bg-white/5'
          }`}
        >
          All ({unreadOnly ? totalCount : notifications.length})
        </button>
        <button
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            unreadOnly
              ? 'bg-[#D8F500] text-black'
              : 'text-white/60 hover:text-white bg-white/5'
          }`}
        >
          Unread Only
        </button>
      </div>

      {/* List Content */}
      {loading ? (
        <div className="py-16 text-center text-white/50 text-xs">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <Card variant="dark" className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
            <Bell size={24} />
          </div>
          <h3 className="text-base font-bold text-white">No notifications found</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {unreadOnly
              ? 'You are all caught up! There are no unread notifications right now.'
              : 'You have no notifications yet. System events and tournament updates will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => {
            const isRead = Boolean(notif.readAt);
            const id = notif._id || notif.id || '';
            return (
              <div
                key={id}
                onClick={() => handleClickNotification(notif)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  isRead
                    ? 'bg-black/30 border-white/5 hover:border-white/15 opacity-80 hover:opacity-100'
                    : 'bg-[#D8F500]/5 border-[#D8F500]/30 hover:border-[#D8F500]/60'
                }`}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  {getTypeIcon(notif.type)}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-sm text-white">{notif.title}</span>
                    <AthleticBadge variant={isRead ? 'dark' : 'lime'} size="sm">
                      {notif.type}
                    </AthleticBadge>
                    {!isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#D8F500] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-2">
                    {notif.body}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-white/40">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {formatNotificationTime(notif.createdAt)}
                    </span>
                    {notif.link && (
                      <span className="flex items-center gap-0.5 text-[#D8F500]/70 hover:text-[#D8F500]">
                        View <ArrowRight size={10} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Mark Read Action */}
                {!isRead && (
                  <button
                    onClick={(e) => handleMarkAsRead(id, e)}
                    title="Mark as read"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-[#D8F500] transition-colors shrink-0"
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-white/60 px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
