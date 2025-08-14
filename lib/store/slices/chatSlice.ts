/**
 * Chat slice
 */

export function createChatSlice(set: any, _get: any): Record<string, unknown> {
  return {
    addMessage: (content: string, sender: 'user' | 'agent') => {
      const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const message = { id, content, timestamp: new Date(), sender };
      set((state: any) => ({ messages: [...state.messages, message] }));
    },
    clearMessages: () => {
      set({ messages: [] });
    },
  };
}


