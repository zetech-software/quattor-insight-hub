import { createContext, useContext, useState, ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";

type PetContextValue = {
  messages: UIMessage[];
  sendMessage: (text: string) => Promise<void>;
  status: "ready" | "submitted" | "streaming" | "error";
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  reset: () => void;
};

const PetContext = createContext<PetContextValue | null>(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function PetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState(() => crypto.randomUUID());

  const transport = new DefaultChatTransport({
    api: `${SUPABASE_URL}/functions/v1/pet-chat`,
    headers: {
      Authorization: `Bearer ${PUBLISHABLE_KEY}`,
    },
  });

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatId,
    transport,
  });

  const value: PetContextValue = {
    messages,
    sendMessage: async (text: string) => {
      await sendMessage({ text });
    },
    status: status as PetContextValue["status"],
    isOpen,
    setIsOpen,
    reset: () => {
      setMessages([]);
      setChatId(crypto.randomUUID());
    },
  };

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet() {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error("usePet must be used inside PetProvider");
  return ctx;
}
