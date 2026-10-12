import { Types } from 'mongoose';
import { Notification, type INotification } from '../models/Notification.js';
import { type NotificationType } from '../models/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { formatPaginatedResponse, type PaginatedResponse } from '../utils/pagination.js';

export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  link: string;
}

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

const MAX_FIFO_NOTIFICATIONS = 200;
const MAX_DISPATCH_RECIPIENTS = 500;

export async function notify(
  userIds: (string | Types.ObjectId)[],
  payload: CreateNotificationPayload
): Promise<void> {
  // Fire-and-forget safety wrapper: never reject or throw into the caller
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    // Normalize and de-duplicate recipient IDs
    const uniqueIds = Array.from(
      new Set(
        userIds
          .filter(Boolean)
          .map((id) => (typeof id === 'string' ? id : id.toString()))
          .filter((idStr) => Types.ObjectId.isValid(idStr))
      )
    ).slice(0, MAX_DISPATCH_RECIPIENTS);

    if (uniqueIds.length === 0) return;

    // Validate link format
    const link =
      payload.link && payload.link.startsWith('/') && !payload.link.startsWith('//')
        ? payload.link
        : '/dashboard';

    const title = payload.title.slice(0, 120);
    const body = payload.body.slice(0, 300);

    const docs = uniqueIds.map((userId) => ({
      user: new Types.ObjectId(userId),
      type: payload.type,
      title,
      body,
      link,
      readAt: null,
    }));

    await Notification.insertMany(docs);

    // Enforce FIFO cap (max 200 notifications per user)
    for (const userId of uniqueIds) {
      const uObjectId = new Types.ObjectId(userId);
      const totalCount = await Notification.countDocuments({ user: uObjectId });
      if (totalCount > MAX_FIFO_NOTIFICATIONS) {
        const excess = totalCount - MAX_FIFO_NOTIFICATIONS;
        // Find the oldest excess IDs to delete
        const oldestDocs = await Notification.find({ user: uObjectId })
          .sort({ createdAt: 1 })
          .limit(excess)
          .select('_id')
          .lean();

        if (oldestDocs.length > 0) {
          const idsToDelete = oldestDocs.map((d) => d._id);
          await Notification.deleteMany({ _id: { $in: idsToDelete } });
        }
      }
    }
  } catch (err) {
    console.error('Safe notification dispatch error:', err);
  }
}

export async function listNotifications(
  userId: string | Types.ObjectId,
  query: ListNotificationsQuery
): Promise<PaginatedResponse<INotification>> {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    user: new Types.ObjectId(userId),
  };

  if (query.unreadOnly) {
    filter.readAt = null;
  }

  const [data, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return formatPaginatedResponse(data as unknown as INotification[], total, page, limit);
}

export async function getUnreadCount(
  userId: string | Types.ObjectId
): Promise<number> {
  return Notification.countDocuments({
    user: new Types.ObjectId(userId),
    readAt: null,
  });
}

export async function markAsRead(
  userId: string | Types.ObjectId,
  notificationId: string
): Promise<INotification> {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw ApiError.badRequest('Invalid notification ID format');
  }

  const notification = await Notification.findOne({
    _id: new Types.ObjectId(notificationId),
    user: new Types.ObjectId(userId),
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
}

export async function markAllAsRead(
  userId: string | Types.ObjectId
): Promise<{ modifiedCount: number }> {
  const result = await Notification.updateMany(
    {
      user: new Types.ObjectId(userId),
      readAt: null,
    },
    {
      $set: { readAt: new Date() },
    }
  );

  return { modifiedCount: result.modifiedCount };
}
