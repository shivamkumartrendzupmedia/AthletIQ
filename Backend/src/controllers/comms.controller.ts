import type { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { commsService, formatContentDisposition } from '../services/comms.service.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementQuerySchema,
  createDocumentSchema,
  documentQuerySchema,
} from '../validators/comms.validator.js';
import { ApiError } from '../utils/ApiError.js';

// Multer memory storage with 5 MB maximum file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single('file');

export const documentUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  upload(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File size cannot exceed 5 MB'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            new ApiError(400, 'Unexpected field. Document must be uploaded under "file" field')
          );
        }
        return next(new ApiError(400, `Upload error: ${err.message}`));
      }
      return next(new ApiError(400, 'Invalid file upload request'));
    }
    next();
  });
};

export class CommsController {
  // ==================== ANNOUNCEMENTS ====================

  async createAnnouncement(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = createAnnouncementSchema.parse(req.body);
      const user = req.user!;
      const result = await commsService.createAnnouncement(validated, {
        id: String(user._id || user.id),
        role: user.role,
      });
      res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listAnnouncements(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = announcementQuerySchema.parse(req.query);
      const user = req.user!;
      const result = await commsService.listAnnouncements(query, {
        id: String(user._id || user.id),
        role: user.role,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getAnnouncement(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const result = await commsService.getAnnouncementById(id, {
        id: String(user._id || user.id),
        role: user.role,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAnnouncement(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateAnnouncementSchema.parse(req.body);
      const user = req.user!;
      const result = await commsService.updateAnnouncement(id, validated, {
        id: String(user._id || user.id),
        role: user.role,
      });
      res.status(200).json({
        success: true,
        message: 'Announcement updated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAnnouncement(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const result = await commsService.deleteAnnouncement(id, {
        id: String(user._id || user.id),
        role: user.role,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listPublicAnnouncements(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const result = await commsService.listPublicAnnouncements(page, limit);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // ==================== DOCUMENTS ====================

  async uploadDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = createDocumentSchema.parse(req.body);
      const user = req.user!;
      const result = await commsService.createDocument(validated, req.file, {
        id: String(user._id || user.id),
        role: user.role,
      });
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listDocuments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = documentQuerySchema.parse(req.query);
      const user = req.user!;
      const result = await commsService.listDocuments(query, {
        id: String(user._id || user.id),
        role: user.role,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const result = await commsService.getDocumentById(id, {
        id: String(user._id || user.id),
        role: user.role,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async downloadDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const fileInfo = await commsService.getDocumentFileForDownload(id, {
        id: String(user._id || user.id),
        role: user.role,
      });

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader(
        'Content-Disposition',
        formatContentDisposition(fileInfo.originalName)
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Length', fileInfo.sizeBytes);

      res.sendFile(fileInfo.filePath);
    } catch (err) {
      next(err);
    }
  }

  async deleteDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const result = await commsService.deleteDocument(id, {
        id: String(user._id || user.id),
        role: user.role,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const commsController = new CommsController();
