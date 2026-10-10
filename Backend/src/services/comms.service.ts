import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { Announcement } from '../models/Announcement.js';
import { AcademyDocument } from '../models/Document.js';
import { Coach } from '../models/Coach.js';
import { Athlete } from '../models/Athlete.js';
import { Team } from '../models/Team.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { formatPaginatedResponse, type PaginatedResponse } from '../utils/pagination.js';
import { env } from '../config/env.js';

interface FileTypeDefinition {
  ext: string;
  mime: string;
  check: (buf: Buffer) => boolean;
}

const ALLOWED_FILE_TYPES: Record<string, FileTypeDefinition> = {
  '.pdf': {
    ext: '.pdf',
    mime: 'application/pdf',
    check: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46, // %PDF
  },
  '.png': {
    ext: '.png',
    mime: 'image/png',
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  '.jpg': {
    ext: '.jpg',
    mime: 'image/jpeg',
    check: (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  '.jpeg': {
    ext: '.jpeg',
    mime: 'image/jpeg',
    check: (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  '.docx': {
    ext: '.docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Note: docx is a ZIP container (PK\x03\x04). Magic bytes verify valid ZIP format.
    check: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04,
  },
  '.xlsx': {
    ext: '.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Note: xlsx is a ZIP container (PK\x03\x04). Magic bytes verify valid ZIP format.
    check: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04,
  },
};

export function formatContentDisposition(originalName: string): string {
  const sanitized =
    originalName
      .split('')
      .map((ch) => {
        const code = ch.charCodeAt(0);
        if (code < 32 || code === 127 || ch === '"' || ch === '/' || ch === '\\') {
          return '_';
        }
        return ch;
      })
      .join('')
      .trim() || 'document';
  const asciiFallback = sanitized.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  const rfc5987 = encodeURIComponent(sanitized).replace(/['()]/g, escape);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987}`;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  audience: string;
  team: { id: string; name: string } | null;
  pinned: boolean;
  publishedAt: string;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDto {
  id: string;
  title: string;
  category: string;
  file: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  visibility: string;
  team: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export class CommsService {
  private getUploadDir(): string {
    const targetDir = path.resolve(process.env.DOCUMENT_UPLOAD_DIR || env.DOCUMENT_UPLOAD_DIR);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  }

  private async getUserScope(userId: string, role: string) {
    if (role === 'Admin') {
      return { all: true, teamIds: [] as Types.ObjectId[] };
    }

    if (role === 'Coach') {
      const coach = await Coach.findOne({ user: new Types.ObjectId(userId) });
      if (!coach) {
        return { all: false, teamIds: [] as Types.ObjectId[], coachId: null };
      }
      const teams = await Team.find({ coach: coach._id }).select('_id');
      return {
        all: false,
        teamIds: teams.map((t) => t._id as Types.ObjectId),
        coachId: coach._id,
      };
    }

    if (role === 'Athlete') {
      const athlete = await Athlete.findOne({ user: new Types.ObjectId(userId) });
      if (!athlete || !athlete.team) {
        return { all: false, teamIds: [] as Types.ObjectId[] };
      }
      return {
        all: false,
        teamIds: [athlete.team as Types.ObjectId],
      };
    }

    // Organizer
    return { all: false, teamIds: [] as Types.ObjectId[] };
  }

  // ==================== ANNOUNCEMENTS ====================

  async createAnnouncement(
    payload: {
      title: string;
      body: string;
      audience: 'Public' | 'All' | 'Athletes' | 'Coaches' | 'Organizers' | 'Team';
      team?: string;
      pinned?: boolean;
      publishedAt?: string;
    },
    user: { id: string; role: string }
  ): Promise<AnnouncementDto> {
    const scope = await this.getUserScope(user.id, user.role);

    if (user.role === 'Coach') {
      if (payload.audience !== 'Team') {
        throw new ApiError(403, 'Coaches can only create announcements with audience Team');
      }
      if (!payload.team || !Types.ObjectId.isValid(payload.team)) {
        throw new ApiError(404, 'Team not found or not coached by you');
      }
      const teamObjId = new Types.ObjectId(payload.team);
      if (!scope.teamIds.some((tid) => tid.equals(teamObjId))) {
        throw new ApiError(404, 'Team not found or not coached by you');
      }
    }

    let teamId: Types.ObjectId | null = null;
    if (payload.audience === 'Team') {
      if (!payload.team || !Types.ObjectId.isValid(payload.team)) {
        throw new ApiError(400, 'Valid team ObjectId is required when audience is Team');
      }
      const teamDoc = await Team.findById(payload.team);
      if (!teamDoc) {
        throw new ApiError(404, 'Team not found');
      }
      teamId = teamDoc._id as Types.ObjectId;
    }

    const ann = await Announcement.create({
      title: payload.title.trim(),
      body: payload.body.trim(),
      audience: payload.audience,
      team: teamId,
      pinned: payload.pinned ?? false,
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : new Date(),
      createdBy: new Types.ObjectId(user.id),
    });

    await AuditLog.create({
      actor: new Types.ObjectId(user.id),
      action: 'ANNOUNCEMENT_CREATED',
      targetType: 'Announcement',
      targetId: ann._id,
      meta: { audience: ann.audience, team: teamId ? String(teamId) : null },
    });

    return this.getAnnouncementById(ann.id, user);
  }

  async listAnnouncements(
    query: {
      audience?: string;
      team?: string;
      page?: number;
      limit?: number;
      search?: string;
      pinned?: boolean;
    },
    user: { id: string; role: string }
  ): Promise<PaginatedResponse<AnnouncementDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const scope = await this.getUserScope(user.id, user.role);

    const conditions: Record<string, unknown>[] = [];

    // Audience filtering based on role
    if (user.role === 'Admin') {
      // Admin sees everything
    } else if (user.role === 'Coach') {
      conditions.push({
        $or: [
          { audience: { $in: ['Public', 'All', 'Coaches'] } },
          { audience: 'Team', team: { $in: scope.teamIds } },
        ],
      });
    } else if (user.role === 'Athlete') {
      conditions.push({
        $or: [
          { audience: { $in: ['Public', 'All', 'Athletes'] } },
          ...(scope.teamIds.length > 0
            ? [{ audience: 'Team', team: { $in: scope.teamIds } }]
            : []),
        ],
      });
    } else if (user.role === 'Organizer') {
      conditions.push({
        audience: { $in: ['Public', 'All', 'Organizers'] },
      });
    }

    if (query.audience) {
      conditions.push({ audience: query.audience });
    }

    if (query.team) {
      if (Types.ObjectId.isValid(query.team)) {
        conditions.push({ team: new Types.ObjectId(query.team) });
      } else {
        return formatPaginatedResponse([], 0, page, limit);
      }
    }

    if (query.pinned !== undefined) {
      conditions.push({ pinned: query.pinned });
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      conditions.push({
        $or: [
          { title: { $regex: escaped, $options: 'i' } },
          { body: { $regex: escaped, $options: 'i' } },
        ],
      });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    const [items, total] = await Promise.all([
      Announcement.find(filter)
        .populate('team', 'name')
        .populate('createdBy', 'name')
        .sort({ pinned: -1, publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments(filter),
    ]);

    const dtos: AnnouncementDto[] = items.map((a) => {
      const teamObj = a.team as unknown as { _id?: Types.ObjectId; id?: string; name?: string } | null;
      const creatorObj = a.createdBy as unknown as { _id?: Types.ObjectId; id?: string; name?: string } | null;

      return {
        id: a.id,
        title: a.title,
        body: a.body,
        audience: a.audience,
        team: teamObj ? { id: String(teamObj.id || teamObj._id), name: teamObj.name || '' } : null,
        pinned: a.pinned,
        publishedAt: a.publishedAt.toISOString(),
        createdBy: creatorObj ? { id: String(creatorObj.id || creatorObj._id), name: creatorObj.name || '' } : null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      };
    });

    return formatPaginatedResponse(dtos, total, page, limit);
  }

  async getAnnouncementById(
    id: string,
    user: { id: string; role: string }
  ): Promise<AnnouncementDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Announcement not found');
    }

    const ann = await Announcement.findById(id)
      .populate('team', 'name')
      .populate('createdBy', 'name');

    if (!ann) {
      throw new ApiError(404, 'Announcement not found');
    }

    // Scope visibility check
    const scope = await this.getUserScope(user.id, user.role);
    let allowed = false;

    const rawTeam = ann.team as unknown as { _id?: Types.ObjectId } | Types.ObjectId | null;
    const annTeamId: Types.ObjectId | null =
      rawTeam && typeof rawTeam === 'object' && '_id' in rawTeam
        ? (rawTeam._id as Types.ObjectId)
        : (rawTeam as Types.ObjectId | null);

    if (user.role === 'Admin') {
      allowed = true;
    } else if (user.role === 'Coach') {
      if (['Public', 'All', 'Coaches'].includes(ann.audience)) {
        allowed = true;
      } else if (
        ann.audience === 'Team' &&
        annTeamId &&
        scope.teamIds.some((tid) => tid.equals(annTeamId))
      ) {
        allowed = true;
      }
    } else if (user.role === 'Athlete') {
      if (['Public', 'All', 'Athletes'].includes(ann.audience)) {
        allowed = true;
      } else if (
        ann.audience === 'Team' &&
        annTeamId &&
        scope.teamIds.some((tid) => tid.equals(annTeamId))
      ) {
        allowed = true;
      }
    } else if (user.role === 'Organizer') {
      if (['Public', 'All', 'Organizers'].includes(ann.audience)) {
        allowed = true;
      }
    }

    if (!allowed) {
      throw new ApiError(404, 'Announcement not found');
    }

    const teamObj = ann.team as unknown as { _id?: Types.ObjectId; id?: string; name?: string } | null;
    const creatorObj = ann.createdBy as unknown as { _id?: Types.ObjectId; id?: string; name?: string } | null;

    return {
      id: ann.id,
      title: ann.title,
      body: ann.body,
      audience: ann.audience,
      team: teamObj ? { id: String(teamObj.id || teamObj._id), name: teamObj.name || '' } : null,
      pinned: ann.pinned,
      publishedAt: ann.publishedAt.toISOString(),
      createdBy: creatorObj ? { id: String(creatorObj.id || creatorObj._id), name: creatorObj.name || '' } : null,
      createdAt: ann.createdAt.toISOString(),
      updatedAt: ann.updatedAt.toISOString(),
    };
  }

  async updateAnnouncement(
    id: string,
    payload: {
      title?: string;
      body?: string;
      audience?: 'Public' | 'All' | 'Athletes' | 'Coaches' | 'Organizers' | 'Team';
      team?: string;
      pinned?: boolean;
      publishedAt?: string;
    },
    user: { id: string; role: string }
  ): Promise<AnnouncementDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Announcement not found');
    }

    const ann = await Announcement.findById(id);
    if (!ann) {
      throw new ApiError(404, 'Announcement not found');
    }

    if (user.role === 'Coach') {
      if (!ann.createdBy.equals(new Types.ObjectId(user.id))) {
        throw new ApiError(404, 'Announcement not found');
      }
      if (payload.audience && payload.audience !== 'Team') {
        throw new ApiError(403, 'Coaches can only update announcements with audience Team');
      }
      if (payload.team) {
        const scope = await this.getUserScope(user.id, user.role);
        const teamObjId = new Types.ObjectId(payload.team);
        if (!scope.teamIds.some((tid) => tid.equals(teamObjId))) {
          throw new ApiError(404, 'Team not found or not coached by you');
        }
      }
    }

    if (payload.title !== undefined) ann.title = payload.title.trim();
    if (payload.body !== undefined) ann.body = payload.body.trim();
    if (payload.pinned !== undefined) ann.pinned = payload.pinned;
    if (payload.publishedAt !== undefined) ann.publishedAt = new Date(payload.publishedAt);

    if (payload.audience !== undefined) {
      ann.audience = payload.audience;
      if (payload.audience === 'Team') {
        const targetTeam = payload.team || (ann.team ? String(ann.team) : null);
        if (!targetTeam || !Types.ObjectId.isValid(targetTeam)) {
          throw new ApiError(400, 'Valid team is required when audience is Team');
        }
        ann.team = new Types.ObjectId(targetTeam);
      } else {
        ann.team = null;
      }
    } else if (payload.team !== undefined) {
      if (ann.audience === 'Team') {
        if (!Types.ObjectId.isValid(payload.team)) {
          throw new ApiError(400, 'Valid team is required');
        }
        ann.team = new Types.ObjectId(payload.team);
      }
    }

    await ann.save();

    await AuditLog.create({
      actor: new Types.ObjectId(user.id),
      action: 'ANNOUNCEMENT_UPDATED',
      targetType: 'Announcement',
      targetId: ann._id,
      meta: { audience: ann.audience },
    });

    return this.getAnnouncementById(ann.id, user);
  }

  async deleteAnnouncement(
    id: string,
    user: { id: string; role: string }
  ): Promise<{ success: boolean; message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Announcement not found');
    }

    const ann = await Announcement.findById(id);
    if (!ann) {
      throw new ApiError(404, 'Announcement not found');
    }

    if (user.role === 'Coach' && !ann.createdBy.equals(new Types.ObjectId(user.id))) {
      throw new ApiError(404, 'Announcement not found');
    }

    await Announcement.findByIdAndDelete(id);

    await AuditLog.create({
      actor: new Types.ObjectId(user.id),
      action: 'ANNOUNCEMENT_DELETED',
      targetType: 'Announcement',
      targetId: ann._id,
      meta: { audience: ann.audience },
    });

    return { success: true, message: 'Announcement deleted successfully' };
  }

  async listPublicAnnouncements(
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<{ id: string; title: string; body: string; publishedAt: string; authorName: string }>> {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const skip = (p - 1) * l;

    const filter = { audience: 'Public' };

    const [items, total] = await Promise.all([
      Announcement.find(filter)
        .populate('createdBy', 'name')
        .sort({ pinned: -1, publishedAt: -1 })
        .skip(skip)
        .limit(l),
      Announcement.countDocuments(filter),
    ]);

    const dtos = items.map((a) => {
      const author = a.createdBy as unknown as { name?: string } | null;
      return {
        id: a.id,
        title: a.title,
        body: a.body,
        publishedAt: a.publishedAt.toISOString(),
        authorName: author?.name || 'Academy Administration',
      };
    });

    return formatPaginatedResponse(dtos, total, p, l);
  }

  // ==================== DOCUMENTS ====================

  async createDocument(
    metadata: {
      title: string;
      category: 'Policy' | 'Form' | 'Schedule' | 'Report' | 'Other';
      visibility: 'Public' | 'All' | 'Athletes' | 'Coaches' | 'Organizers' | 'Team';
      team?: string;
    },
    file: Express.Multer.File | undefined,
    user: { id: string; role: string }
  ): Promise<DocumentDto> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new ApiError(400, 'Document file is required');
    }

    if (file.buffer.length > 5 * 1024 * 1024) {
      throw new ApiError(400, 'File size cannot exceed 5 MB');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const typeDef = ALLOWED_FILE_TYPES[ext];

    if (!typeDef) {
      throw new ApiError(
        400,
        `File extension ${ext || 'none'} is not permitted. Allowed: .pdf, .png, .jpg, .jpeg, .docx, .xlsx`
      );
    }

    if (!typeDef.check(file.buffer)) {
      throw new ApiError(
        400,
        'File content does not match allowed format or magic bytes verification failed'
      );
    }

    const scope = await this.getUserScope(user.id, user.role);

    if (user.role === 'Coach') {
      if (metadata.visibility !== 'Team') {
        throw new ApiError(403, 'Coaches can only upload documents with visibility Team');
      }
      if (!metadata.team || !Types.ObjectId.isValid(metadata.team)) {
        throw new ApiError(404, 'Team not found or not coached by you');
      }
      const teamObjId = new Types.ObjectId(metadata.team);
      if (!scope.teamIds.some((tid) => tid.equals(teamObjId))) {
        throw new ApiError(404, 'Team not found or not coached by you');
      }
    }

    let teamId: Types.ObjectId | null = null;
    if (metadata.visibility === 'Team') {
      if (!metadata.team || !Types.ObjectId.isValid(metadata.team)) {
        throw new ApiError(400, 'Valid team ObjectId is required when visibility is Team');
      }
      const teamDoc = await Team.findById(metadata.team);
      if (!teamDoc) {
        throw new ApiError(404, 'Team not found');
      }
      teamId = teamDoc._id as Types.ObjectId;
    }

    const uploadDir = this.getUploadDir();
    const storedName = `${crypto.randomUUID()}${ext}`;
    const fullDiskPath = path.join(uploadDir, storedName);

    // Write file to disk with 'wx' flag (exclusive write)
    fs.writeFileSync(fullDiskPath, file.buffer, { flag: 'wx' });

    try {
      const doc = await AcademyDocument.create({
        title: metadata.title.trim(),
        category: metadata.category,
        file: {
          originalName: file.originalname.trim(),
          storedName,
          mimeType: typeDef.mime,
          sizeBytes: file.buffer.length,
        },
        visibility: metadata.visibility,
        team: teamId,
        uploadedBy: new Types.ObjectId(user.id),
      });

      await AuditLog.create({
        actor: new Types.ObjectId(user.id),
        action: 'DOCUMENT_UPLOADED',
        targetType: 'Document',
        targetId: doc._id,
        meta: { category: doc.category, visibility: doc.visibility },
      });

      return this.getDocumentById(doc.id, user);
    } catch (err) {
      // If DB insert fails, cleanup the stored file to avoid orphans
      if (fs.existsSync(fullDiskPath)) {
        fs.unlinkSync(fullDiskPath);
      }
      throw err;
    }
  }

  async listDocuments(
    query: {
      category?: string;
      visibility?: string;
      team?: string;
      page?: number;
      limit?: number;
      search?: string;
    },
    user: { id: string; role: string }
  ): Promise<PaginatedResponse<DocumentDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const scope = await this.getUserScope(user.id, user.role);

    const conditions: Record<string, unknown>[] = [];

    if (user.role === 'Admin') {
      // Admin sees everything
    } else if (user.role === 'Coach') {
      conditions.push({
        $or: [
          { visibility: { $in: ['Public', 'All', 'Coaches'] } },
          { visibility: 'Team', team: { $in: scope.teamIds } },
        ],
      });
    } else if (user.role === 'Athlete') {
      conditions.push({
        $or: [
          { visibility: { $in: ['Public', 'All', 'Athletes'] } },
          ...(scope.teamIds.length > 0
            ? [{ visibility: 'Team', team: { $in: scope.teamIds } }]
            : []),
        ],
      });
    } else if (user.role === 'Organizer') {
      conditions.push({
        visibility: { $in: ['Public', 'All', 'Organizers'] },
      });
    }

    if (query.category) {
      conditions.push({ category: query.category });
    }

    if (query.visibility) {
      conditions.push({ visibility: query.visibility });
    }

    if (query.team) {
      if (Types.ObjectId.isValid(query.team)) {
        conditions.push({ team: new Types.ObjectId(query.team) });
      } else {
        return formatPaginatedResponse([], 0, page, limit);
      }
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      conditions.push({
        title: { $regex: escaped, $options: 'i' },
      });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    const [items, total] = await Promise.all([
      AcademyDocument.find(filter)
        .populate('team', 'name')
        .populate('uploadedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AcademyDocument.countDocuments(filter),
    ]);

    const dtos: DocumentDto[] = items.map((d) => {
      const teamObj = d.team as unknown as { _id?: Types.ObjectId; id?: string; name?: string } | null;
      const uploaderObj = d.uploadedBy as unknown as { _id?: Types.ObjectId; id?: string; name?: string } | null;

      return {
        id: d.id,
        title: d.title,
        category: d.category,
        file: {
          originalName: d.file.originalName,
          mimeType: d.file.mimeType,
          sizeBytes: d.file.sizeBytes,
        },
        visibility: d.visibility,
        team: teamObj ? { id: String(teamObj.id || teamObj._id), name: teamObj.name || '' } : null,
        uploadedBy: uploaderObj ? { id: String(uploaderObj.id || uploaderObj._id), name: uploaderObj.name || '' } : null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    });

    return formatPaginatedResponse(dtos, total, page, limit);
  }

  async getDocumentById(
    id: string,
    user: { id: string; role: string }
  ): Promise<DocumentDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Document not found');
    }

    const doc = await AcademyDocument.findById(id)
      .populate('team', 'name')
      .populate('uploadedBy', 'name');

    if (!doc) {
      throw new ApiError(404, 'Document not found');
    }

    const scope = await this.getUserScope(user.id, user.role);
    let allowed = false;

    const rawTeam = doc.team as unknown as { _id?: Types.ObjectId } | Types.ObjectId | null;
    const docTeamId: Types.ObjectId | null =
      rawTeam && typeof rawTeam === 'object' && '_id' in rawTeam
        ? (rawTeam._id as Types.ObjectId)
        : (rawTeam as Types.ObjectId | null);

    if (user.role === 'Admin') {
      allowed = true;
    } else if (user.role === 'Coach') {
      if (['Public', 'All', 'Coaches'].includes(doc.visibility)) {
        allowed = true;
      } else if (
        doc.visibility === 'Team' &&
        docTeamId &&
        scope.teamIds.some((tid) => tid.equals(docTeamId))
      ) {
        allowed = true;
      }
    } else if (user.role === 'Athlete') {
      if (['Public', 'All', 'Athletes'].includes(doc.visibility)) {
        allowed = true;
      } else if (
        doc.visibility === 'Team' &&
        docTeamId &&
        scope.teamIds.some((tid) => tid.equals(docTeamId))
      ) {
        allowed = true;
      }
    } else if (user.role === 'Organizer') {
      if (['Public', 'All', 'Organizers'].includes(doc.visibility)) {
        allowed = true;
      }
    }

    if (!allowed) {
      throw new ApiError(404, 'Document not found');
    }

    const teamObj = doc.team as unknown as { _id?: Types.ObjectId; id?: string; name?: string } | null;
    const uploaderObj = doc.uploadedBy as unknown as { _id?: Types.ObjectId; id?: string; name?: string } | null;

    return {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      file: {
        originalName: doc.file.originalName,
        mimeType: doc.file.mimeType,
        sizeBytes: doc.file.sizeBytes,
      },
      visibility: doc.visibility,
      team: teamObj ? { id: String(teamObj.id || teamObj._id), name: teamObj.name || '' } : null,
      uploadedBy: uploaderObj ? { id: String(uploaderObj.id || uploaderObj._id), name: uploaderObj.name || '' } : null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async getDocumentFileForDownload(
    id: string,
    user: { id: string; role: string }
  ): Promise<{ filePath: string; mimeType: string; originalName: string; sizeBytes: number }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Document not found');
    }

    const doc = await AcademyDocument.findById(id);
    if (!doc) {
      throw new ApiError(404, 'Document not found');
    }

    const scope = await this.getUserScope(user.id, user.role);
    let allowed = false;

    const rawTeam = doc.team as unknown as { _id?: Types.ObjectId } | Types.ObjectId | null;
    const docTeamId: Types.ObjectId | null =
      rawTeam && typeof rawTeam === 'object' && '_id' in rawTeam
        ? (rawTeam._id as Types.ObjectId)
        : (rawTeam as Types.ObjectId | null);

    if (user.role === 'Admin') {
      allowed = true;
    } else if (user.role === 'Coach') {
      if (['Public', 'All', 'Coaches'].includes(doc.visibility)) {
        allowed = true;
      } else if (
        doc.visibility === 'Team' &&
        docTeamId &&
        scope.teamIds.some((tid) => tid.equals(docTeamId))
      ) {
        allowed = true;
      }
    } else if (user.role === 'Athlete') {
      if (['Public', 'All', 'Athletes'].includes(doc.visibility)) {
        allowed = true;
      } else if (
        doc.visibility === 'Team' &&
        docTeamId &&
        scope.teamIds.some((tid) => tid.equals(docTeamId))
      ) {
        allowed = true;
      }
    } else if (user.role === 'Organizer') {
      if (['Public', 'All', 'Organizers'].includes(doc.visibility)) {
        allowed = true;
      }
    }

    if (!allowed) {
      throw new ApiError(404, 'Document not found');
    }

    const uploadDir = this.getUploadDir();
    const filePath = path.join(uploadDir, doc.file.storedName);

    if (!fs.existsSync(filePath)) {
      throw new ApiError(404, 'Document file not found on storage');
    }

    return {
      filePath,
      mimeType: doc.file.mimeType,
      originalName: doc.file.originalName,
      sizeBytes: doc.file.sizeBytes,
    };
  }

  async deleteDocument(
    id: string,
    user: { id: string; role: string }
  ): Promise<{ success: boolean; message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'Document not found');
    }

    const doc = await AcademyDocument.findById(id);
    if (!doc) {
      throw new ApiError(404, 'Document not found');
    }

    if (user.role === 'Coach' && !doc.uploadedBy.equals(new Types.ObjectId(user.id))) {
      throw new ApiError(404, 'Document not found');
    }

    const uploadDir = this.getUploadDir();
    const filePath = path.join(uploadDir, doc.file.storedName);

    // Delete file from disk if present (if already missing, still succeed per requirement)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore disk unlink failure if file was already removed
    }

    await AcademyDocument.findByIdAndDelete(id);

    await AuditLog.create({
      actor: new Types.ObjectId(user.id),
      action: 'DOCUMENT_DELETED',
      targetType: 'Document',
      targetId: doc._id,
      meta: { category: doc.category, visibility: doc.visibility },
    });

    return { success: true, message: 'Document deleted successfully' };
  }
}

export const commsService = new CommsService();
