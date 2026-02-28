import { createContext, useContext, useState, ReactNode } from "react";
import { useAIChat, ChatMessage, QuotaError } from "@/hooks/useAIChat";

interface ChatContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  quotaError: QuotaError | null;
  sendMessage: (content: string) => Promise<void>;
  cancel: () => void;
  clear: () => void;
  clearQuotaError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const chat = useAIChat();

  return (
    <ChatContext.Provider value={{ isOpen, setIsOpen, ...chat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}
