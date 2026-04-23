import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  showUpgrade?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  showUpgradeModal: boolean;
  messageCount: number;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) => void;
  updateMessageContent: (id: string, content: string) => void;
  setLoading: (val: boolean) => void;
  setShowUpgrade: (val: boolean) => void;
  setMessageCount: (count: number) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  showUpgradeModal: false,
  messageCount: 0,

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: msg.id ?? `msg_${Date.now()}_${Math.random()}`,
          timestamp: msg.timestamp ?? Date.now(),
          role: msg.role,
          content: msg.content,
          showUpgrade: msg.showUpgrade,
        },
      ],
      messageCount: msg.role === 'user' ? state.messageCount + 1 : state.messageCount,
    })),

  updateMessageContent: (id, content) =>
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === id ? { ...msg, content } : msg)),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setShowUpgrade: (showUpgradeModal) => set({ showUpgradeModal }),

  setMessageCount: (count) => set({ messageCount: count }),

  clearChat: () =>
    set({
      messages: [],
      isLoading: false,
      showUpgradeModal: false,
      messageCount: 0,
    }),
}));
