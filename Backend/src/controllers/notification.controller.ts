import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as notificationService from '../services/notification.service.js';

export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const unreadOnly = req.query.unreadOnly === 'true';
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await notificationService.listNotifications(req.user!.id, {
      page,
      limit,
      unreadOnly,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }
);

export const getUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    const unreadCount = await notificationService.getUnreadCount(req.user!.id);
    res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  }
);

export const markAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const notification = await notificationService.markAsRead(
      req.user!.id,
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  }
);

export const markAllAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await notificationService.markAllAsRead(req.user!.id);
    res.status(200).json({
      success: true,
      data: result,
      message: 'All notifications marked as read',
    });
  }
);
