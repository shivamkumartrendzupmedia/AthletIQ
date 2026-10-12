import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { chatbotService } from '../services/chatbot.service.js';

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { message } = req.body;

  const result = await chatbotService.processMessage(message, {
    id: user.id,
    role: user.role,
    name: user.name,
  });

  res.status(200).json({
    success: true,
    reply: result.reply,
    toolsUsed: result.toolsUsed,
    data: result,
  });
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const messages = await chatbotService.getHistory(user.id);

  res.status(200).json({
    success: true,
    messages,
    data: { messages },
  });
});

export const clearHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  await chatbotService.clearHistory(user.id);

  res.status(200).json({
    success: true,
    message: 'Conversation history cleared successfully',
  });
});
