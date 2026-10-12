import { Types } from 'mongoose';
import { Conversation, type IConversationMessage } from '../models/Conversation.js';
import { routeMessage, type RouteMatchResult } from './chatbot/chatbot.router.js';
import { executeTool, type ChatbotUserSession } from './chatbot/tools.registry.js';
import { formatToolResponse } from './chatbot/template.generator.js';
import { redactText } from './chatbot/redaction.js';
import { auditService } from './audit.service.js';

export interface ChatbotResponseDto {
  reply: string;
  toolsUsed: string[];
}

export class ChatbotService {
  /**
   * Processes a single turn of the rule-based chatbot.
   */
  async processMessage(
    userMessage: string,
    user: ChatbotUserSession
  ): Promise<ChatbotResponseDto> {
    const trimmedMessage = userMessage.trim();

    // 1. Route message
    const match: RouteMatchResult = await routeMessage(trimmedMessage, user);

    let reply = '';
    const toolsUsed: string[] = [];
    let turnStatus = 'success';

    if (match.isRefusal) {
      reply = match.reply || 'Request refused.';
      turnStatus = 'refusal';
    } else if (match.isHelp || !match.toolName) {
      reply = match.reply || 'I don\'t have that information.';
    } else {
      // Execute whitelisted tool
      try {
        toolsUsed.push(match.toolName);
        const toolResult = await executeTool(match.toolName, match.args, user);
        reply = formatToolResponse(match.toolName, toolResult);
      } catch {
        // Safe graceful answer
        turnStatus = 'error';
        reply = 'I don\'t have that information.';
      }
    }

    // Final safety redaction pass over reply text
    reply = redactText(reply);

    // 2. Persist turn to Conversation with atomic 40-message FIFO cap and 30-day TTL
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const userObjectId = new Types.ObjectId(user.id);

    const userEntry: IConversationMessage = {
      role: 'user',
      text: trimmedMessage.slice(0, 2000),
      at: now,
    };

    const assistantEntry: IConversationMessage = {
      role: 'assistant',
      text: reply.slice(0, 2000),
      at: new Date(now.getTime() + 10),
    };

    await Conversation.findOneAndUpdate(
      { user: userObjectId },
      {
        $set: { expiresAt },
        $push: {
          messages: {
            $each: [userEntry, assistantEntry],
            $slice: -40,
          },
        },
      },
      { upsert: true, new: true }
    );

    // 3. Fail-safe audit logging: actor, role, tool names and status only (never message or reply)
    await auditService.logAudit({
      actor: userObjectId,
      action: 'CHATBOT_TURN',
      targetType: 'Conversation',
      targetId: userObjectId,
      meta: {
        userId: user.id,
        role: user.role,
        toolsUsed,
        status: turnStatus,
      },
    });

    return {
      reply,
      toolsUsed,
    };
  }

  /**
   * Retrieves last 20 messages of the conversation for the caller.
   */
  async getHistory(userId: string): Promise<IConversationMessage[]> {
    const userObjectId = new Types.ObjectId(userId);
    const conv = await Conversation.findOne({ user: userObjectId }).select('messages').lean();
    if (!conv || !conv.messages) {
      return [];
    }
    // Return last 20 messages
    return conv.messages.slice(-20);
  }

  /**
   * Deletes the entire conversation history for the caller.
   */
  async clearHistory(userId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    await Conversation.findOneAndDelete({ user: userObjectId });
  }
}

export const chatbotService = new ChatbotService();
