import {useAuth} from "@/hooks/useAuth";
import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
type ReginaOrigin = "chat" | "pagina";

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

export function ReginaProvider({children}:{children:ReactNode}) {
  const {user}=useAuth();
  return <ReginaSession key={user?.id??"anonymous"}>{children}</ReginaSession>;
}
function ReginaSession({ children }: { children: ReactNode }) {
  const alive=useRef(true);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
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

  const failedRef = useRef(false);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatId,
    transport,
    onError: (error) => {
      failedRef.current = true;
      setErrorKind(classifyError(error));
    },
  });

  const clearError = useCallback(() => setErrorKind(null), []);

  const send = useCallback(
    async (text: string, origin: ReginaOrigin = "chat") => {
      setErrorKind(null);
      failedRef.current = false;
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if(!alive.current) throw new ReginaError("auth");
      if (!data.session?.access_token || !userId) {
        const err = new ReginaError("auth");
        setErrorKind("auth");
        throw err;
      }

      // Trusted analytics is recorded by the server, including direct API calls.
      void origin;

      try {
        await sendMessage({ text });
        if (failedRef.current) {
          return;
        }
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
