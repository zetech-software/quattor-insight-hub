import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

type ReginaContextValue = {
  messages: UIMessage[];
  sendMessage: (text: string) => Promise<void>;
  status: "ready" | "submitted" | "streaming" | "error";
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  reset: () => void;
};

const ReginaContext = createContext<ReginaContextValue | null>(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function ReginaProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState(() => crypto.randomUUID());

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${SUPABASE_URL}/functions/v1/pet-chat`,
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatId,
    transport,
  });


  const value: ReginaContextValue = {
    messages,
    sendMessage: async (text: string) => {
      await sendMessage({ text });
    },
    status: status as ReginaContextValue["status"],
    isOpen,
    setIsOpen,
    reset: () => {
      setMessages([]);
      setChatId(crypto.randomUUID());
    },
  };

  return <ReginaContext.Provider value={value}>{children}</ReginaContext.Provider>;
}

export function useRegina() {
  const ctx = useContext(ReginaContext);
  if (!ctx) throw new Error("useRegina must be used inside ReginaProvider");
  return ctx;
}
