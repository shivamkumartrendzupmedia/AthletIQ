import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Trash2, Bot, User, Loader2 } from 'lucide-react';
import { academyApi, mapFieldErrors } from '../../services/academyApi';
import { getSuggestionChipsForRole, type PromptChip } from '../../lib/chatbotPayloads';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
}

interface ChatbotPanelProps {
  userRole: string;
}

export const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ userRole }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const chips = getSuggestionChipsForRole(userRole);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Load history strictly on first open only (<= 1 request)
  useEffect(() => {
    if (isOpen && !hasLoadedHistory) {
      const loadHistory = async () => {
        try {
          const history = await academyApi.getChatbotHistory();
          if (Array.isArray(history)) {
            setMessages(
              history.map((m, idx) => ({
                id: `hist-${idx}-${m.at}`,
                role: m.role,
                text: m.text,
                at: m.at,
              }))
            );
          }
          setHasLoadedHistory(true);
        } catch {
          // graceful fallback
          setHasLoadedHistory(true);
        }
      };
      loadHistory();
    }
  }, [isOpen, hasLoadedHistory]);

  // Focus management on open/close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      launcherRef.current?.focus();
    }
  }, [isOpen]);

  // Esc key closes panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const raw = textToSend !== undefined ? textToSend : inputMessage;
      const trimmed = raw.trim();
      if (!trimmed || isLoading) return;

      if (trimmed.length > 500) {
        setErrorMessage('Message cannot exceed 500 characters.');
        return;
      }

      setErrorMessage(null);
      setInputMessage('');

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
        at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const res = await academyApi.sendChatbotMessage({ message: trimmed });
        const assistantMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          text: res.reply || "I don't have that information.",
          at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        const fieldErrors = mapFieldErrors(err);
        if (fieldErrors.message) {
          setErrorMessage(`message: ${fieldErrors.message}`);
        } else if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 429) {
          setErrorMessage('Too many messages sent. Please slow down and wait a moment.');
        } else if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: string }).message === 'string') {
          const msg = (err as { message: string }).message;
          setErrorMessage(msg);
        } else {
          setErrorMessage('Failed to deliver message. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [inputMessage, isLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    try {
      await academyApi.clearChatbotHistory();
      setMessages([]);
      setShowClearConfirm(false);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Could not clear conversation history.');
    }
  };

  return (
    <>
      {/* Floating Chat Launcher Button (Bottom Right) */}
      <button
        ref={launcherRef}
        type="button"
        id="chatbot-launcher-button"
        aria-label={isOpen ? 'Close Athletiq Assistant' : 'Open Athletiq Assistant'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#171044] text-white shadow-xl hover:bg-[#251A68] hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#FF5A00]/40 border-2 border-white/20"
      >
        {isOpen ? <X size={26} /> : <MessageSquare size={26} />}
      </button>

      {/* Chatbot Dialog Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Athletiq Assistant"
          aria-modal="true"
          className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-96 h-[85vh] sm:h-[560px] bg-white sm:rounded-2xl shadow-2xl border border-[#171044]/15 flex flex-col z-50 overflow-hidden transition-all duration-200"
        >
          {/* Header */}
          <div className="bg-[#171044] text-white p-4 flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#FF5A00] flex items-center justify-center text-white shadow-sm">
                <Bot size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-wide leading-tight">Athletiq Assistant</h2>
                <p className="text-[11px] text-white/70 font-medium">Rule-based • {userRole} Scope</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Clear conversation history"
                title="Clear conversation"
                onClick={() => setShowClearConfirm(true)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Confirm Clear History Modal Overlay */}
          {showClearConfirm && (
            <div className="absolute inset-0 bg-[#171044]/70 backdrop-blur-xs z-20 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-5 max-w-xs w-full shadow-xl border border-[#171044]/10 text-center space-y-3">
                <h3 className="text-sm font-bold text-[#171044]">Clear Conversation?</h3>
                <p className="text-xs text-slate-600">
                  This will permanently clear your chatbot messages.
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="px-3 py-1.5 rounded-lg bg-[#FF3B30] text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                  >
                    Yes, Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-50 border-b border-red-200 px-3 py-2 text-xs font-medium text-red-700 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-800 ml-2 font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Messages List */}
          <div
            className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <div className="text-center py-6 text-slate-500 space-y-2">
                <p className="text-xs font-bold text-slate-700">How can I assist you today?</p>
                <p className="text-[11px] text-slate-500">
                  Select a prompt chip below or type a question about your {userRole.toLowerCase()} data.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#171044] text-white flex items-center justify-center flex-shrink-0 text-xs mt-1">
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-xs ${
                    m.role === 'user'
                      ? 'bg-[#171044] text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  {m.text}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-[#FF5A00] text-white flex items-center justify-center flex-shrink-0 text-xs mt-1">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {/* Typing State */}
            {isLoading && (
              <div className="flex gap-2 items-center text-slate-500 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#171044] text-white flex items-center justify-center">
                  <Bot size={14} />
                </div>
                <div className="bg-white px-3 py-2 rounded-2xl border border-slate-200 flex items-center gap-1.5 shadow-xs">
                  <Loader2 size={12} className="animate-spin text-[#FF5A00]" />
                  <span className="italic text-[11px]">Athletiq is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 6 Role-Specific Suggested Prompt Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {chips.map((chip: PromptChip) => (
              <button
                key={chip.id}
                type="button"
                disabled={isLoading}
                onClick={() => handleSend(chip.prompt)}
                className="flex-shrink-0 text-[11px] font-semibold bg-slate-100 hover:bg-[#FF5A00]/10 hover:text-[#FF5A00] text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 flex flex-col gap-1 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                id="chatbot-message-input"
                disabled={isLoading}
                value={inputMessage}
                maxLength={500}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about attendance, matches, goals..."
                className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#171044]/30 focus:border-[#171044] disabled:bg-slate-50 transition-all"
              />
              <button
                type="button"
                id="chatbot-send-button"
                aria-label="Send message"
                disabled={isLoading || !inputMessage.trim()}
                onClick={() => handleSend()}
                className="w-9 h-9 rounded-xl bg-[#FF5A00] hover:bg-[#E04F00] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>

            {/* Character Counter */}
            <div className="flex justify-between items-center px-1 text-[10px] text-slate-400">
              <span>Press Enter to send</span>
              <span className={inputMessage.length > 450 ? 'text-amber-600 font-bold' : ''}>
                {inputMessage.length}/500
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
