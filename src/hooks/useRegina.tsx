import { createContext, useContext, useState, ReactNode, useMemo, useCallback, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  startReginaInteraction,
  finishReginaInteraction,
  type ReginaOrigin,
} from "@/lib/reginaAnalytics";

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
  sendMessage: (text: string, origin?: ReginaOrigin) => Promise<void>;
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
  const { user } = useAuth();
  return <AccountReginaProvider key={user?.id ?? "signed-out"} ownerId={user?.id ?? null}>{children}</AccountReginaProvider>;
}

function AccountReginaProvider({ children, ownerId }: { children: ReactNode; ownerId: string | null }) {
  const active = useRef(true);
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
          if (!active.current || !ownerId || data.session?.user.id !== ownerId || !token) throw new ReginaError("auth");
          return { Authorization: `Bearer ${token}` };
        },
      }),
    [ownerId],
  );

  const failedRef = useRef(false);

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: chatId,
    transport,
    onError: (error) => {
      if (!active.current) return;
      failedRef.current = true;
      setErrorKind(classifyError(error));
    },
  });

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      void stop();
    };
  }, [stop]);

  const clearError = useCallback(() => setErrorKind(null), []);

  const send = useCallback(
    async (text: string, origin: ReginaOrigin = "chat") => {
      setErrorKind(null);
      failedRef.current = false;
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!active.current || !ownerId || userId !== ownerId || !data.session?.access_token) {
        const err = new ReginaError("auth");
        if (active.current) setErrorKind("auth");
        throw err;
      }

      // Registro analítico: uma única linha por mensagem, isolado do fluxo do chat.
      const interactionId = await startReginaInteraction(userId, text, origin);

      try {
        if (!active.current) {
          await finishReginaInteraction(interactionId, "falha");
          return;
        }
        await sendMessage({ text });
        if (failedRef.current) {
          await finishReginaInteraction(interactionId, "falha");
          return;
        }
        await finishReginaInteraction(interactionId, "respondida");
      } catch (e) {
        await finishReginaInteraction(interactionId, "falha");
        if (active.current) setErrorKind(classifyError(e));
        throw e;
      }
    },
    [sendMessage, ownerId],
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
      void stop();
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
