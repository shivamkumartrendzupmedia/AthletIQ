import { z } from 'zod';

export const chatbotMessageSchema = z
  .object({
    message: z
      .string({ required_error: 'message is required' })
      .trim()
      .min(1, 'message cannot be empty')
      .max(500, 'message cannot exceed 500 characters'),
  })
  .strict();

export type ChatbotMessageInput = z.infer<typeof chatbotMessageSchema>;
