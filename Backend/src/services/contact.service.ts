import { Types } from 'mongoose';
import { ContactMessage, type IContactMessage, type ContactMessageStatus } from '../models/ContactMessage.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './audit.service.js';

export interface SubmitContactInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface ContactMessageQuery {
  status?: ContactMessageStatus;
  page?: number;
  limit?: number;
}

export class ContactService {
  /**
   * Submit a public contact message.
   * Creates record in database and returns sanitized acknowledgment only.
   */
  async submitMessage(input: SubmitContactInput): Promise<{ success: boolean; message: string }> {
    await ContactMessage.create({
      name: input.name,
      email: input.email.toLowerCase(),
      subject: input.subject || undefined,
      message: input.message,
      status: 'New',
    });

    return {
      success: true,
      message: 'Your message has been received. Our team will contact you shortly.',
    };
  }

  /**
   * Admin only: List paginated contact messages, newest first.
   */
  async listMessages(query: ContactMessageQuery = {}): Promise<{
    data: IContactMessage[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) {
      filter.status = query.status;
    }

    const [messages, total] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ContactMessage.countDocuments(filter),
    ]);

    return {
      data: messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Admin only: Update message status (New -> Read | Archived) with AuditLog.
   */
  async updateStatus(
    id: string,
    status: ContactMessageStatus,
    actorId: string | Types.ObjectId
  ): Promise<IContactMessage> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid contact message identifier');
    }

    const message = await ContactMessage.findById(id);
    if (!message) {
      throw new ApiError(404, 'Contact message not found');
    }

    message.status = status;
    await message.save();

    await auditService.logAudit({
      actor: actorId,
      action: 'CONTACT_MESSAGE_STATUS_CHANGED',
      targetType: 'ContactMessage',
      targetId: message._id as Types.ObjectId,
      meta: { status },
    });

    return message;
  }
}

export const contactService = new ContactService();
