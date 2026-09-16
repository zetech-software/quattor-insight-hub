import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

export type ReginaErrorKind = "auth" | "generic";

export class ReginaError extends Error {
  kind: ReginaErrorKind;
  constructor(kind: ReginaErrorKind) {
    super(kind);
    this.name = "ReginaError";
    this.kind = kind;
  }
}

type ReginaContextValue = {
  messages: UIMessage[];
  sendMessage: (text: string) => Promise<void>;
  status: "ready" | "submitted" | "streaming" | "error";
  errorKind: ReginaErrorKind | null;
  clearError: () => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  reset: () => void;
};

const ReginaContext = createContext<ReginaContextValue | null>(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function classifyError(error: unknown): ReginaErrorKind {
  if (error instanceof ReginaError) return error.kind;
  const raw = error instanceof Error ? `${error.message}` : String(error ?? "");
  if (/401|403|não autorizado|nao autorizado|unauthorized|jwt|token/i.test(raw)) {
    return "auth";
  }
  return "generic";
}

export function ReginaProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState(() => crypto.randomUUID());
  const [errorKind, setErrorKind] = useState<ReginaErrorKind | null>(null);

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
    onError: (error) => {
      setErrorKind(classifyError(error));
    },
  });

  const clearError = useCallback(() => setErrorKind(null), []);

  const send = useCallback(
    async (text: string) => {
      setErrorKind(null);
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) {
        const err = new ReginaError("auth");
        setErrorKind("auth");
        throw err;
      }
      try {
        await sendMessage({ text });
      } catch (e) {
        setErrorKind(classifyError(e));
        throw e;
      }
    },
    [sendMessage],
  );

  const value: ReginaContextValue = {
    messages,
    sendMessage: send,
    status: status as ReginaContextValue["status"],
    errorKind,
    clearError,
    isOpen,
    setIsOpen,
    reset: () => {
      setMessages([]);
      setChatId(crypto.randomUUID());
      setErrorKind(null);
    },
  };

  return <ReginaContext.Provider value={value}>{children}</ReginaContext.Provider>;
}

export function useRegina() {
  const ctx = useContext(ReginaContext);
  if (!ctx) throw new Error("useRegina must be used inside ReginaProvider");
  return ctx;
}
