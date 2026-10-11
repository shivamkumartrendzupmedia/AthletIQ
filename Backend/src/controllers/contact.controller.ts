import type { Request, Response, NextFunction } from 'express';
import { contactService } from '../services/contact.service.js';

export class ContactController {
  /**
   * Public contact message submission.
   */
  async submitContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contactService.submitMessage(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin only: List paginated contact messages.
   */
  async listMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contactService.listMessages(req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin only: Update status of a contact message.
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await contactService.updateStatus(
        req.params.id,
        req.body.status,
        req.user!.id
      );
      res.status(200).json({
        data: updated,
        message: 'Contact message status updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const contactController = new ContactController();
