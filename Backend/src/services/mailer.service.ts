import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

export interface SentEmailRecord {
  to: string;
  subject: string;
  text: string;
  html: string;
  sentAt: Date;
}

class MailerService {
  private transporter: Transporter | null = null;
  private sentEmailsHistory: SentEmailRecord[] = [];

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    // In test or non-production environments with no SMTP configured, use a mock transporter
    if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
        buffer: true,
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });
    }
  }

  public setTransporter(customTransporter: Transporter): void {
    this.transporter = customTransporter;
  }

  public getSentEmailsHistory(): SentEmailRecord[] {
    return [...this.sentEmailsHistory];
  }

  public clearSentEmailsHistory(): void {
    this.sentEmailsHistory = [];
  }

  public async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userName?: string
  ): Promise<void> {
    const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = resetToken.startsWith('http://') || resetToken.startsWith('https://')
      ? resetToken
      : `${clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const greeting = userName ? `Hello ${userName},` : 'Hello,';

    const subject = 'ATHLETIQ — Password Reset Instructions';
    const text = `${greeting}\n\nYou requested to reset your password. Use the link below to set a new password:\n${resetUrl}\n\nThis link is valid for 30 minutes. If you did not request this, you can safely ignore this email.\n\n— The ATHLETIQ Team`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0d9488;">ATHLETIQ Password Reset</h2>
        <p>${greeting}</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </p>
        <p style="color: #64748b; font-size: 14px;">This link is valid for <strong>30 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">ATHLETIQ High Performance Sports Academy</p>
      </div>
    `;

    this.sentEmailsHistory.push({
      to,
      subject,
      text,
      html,
      sentAt: new Date(),
    });

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'no-reply@athletiq.test',
          to,
          subject,
          text,
          html,
        });
      } catch (err) {
        console.error('Failed to send password reset email via transporter:', err);
      }
    }
  }
}

export const mailerService = new MailerService();
