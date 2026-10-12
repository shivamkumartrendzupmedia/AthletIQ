import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requirePermission } from '../config/permissions.js';
import { validate } from '../middlewares/validate.js';
import { chatbotLimiter } from '../middlewares/rateLimiter.js';
import { chatbotMessageSchema } from '../validators/chatbot.validator.js';
import {
  sendMessage,
  getHistory,
  clearHistory,
} from '../controllers/chatbot.controller.js';

const router = Router();

// All chatbot routes require authentication
router.use(requireAuth);

// Static paths before parameterized ones
router.post(
  '/message',
  requirePermission('chatbot', 'create'),
  chatbotLimiter,
  validate(chatbotMessageSchema),
  sendMessage
);

router.get(
  '/history',
  requirePermission('chatbot', 'read'),
  getHistory
);

router.delete(
  '/history',
  requirePermission('chatbot', 'delete'),
  clearHistory
);

export default router;
