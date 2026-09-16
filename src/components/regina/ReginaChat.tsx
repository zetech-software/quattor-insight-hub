import { useEffect, useRef, useState, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Send, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useRegina } from "@/hooks/useRegina";
import reginaAvatarAsset from "@/assets/regina-avatar.png.asset.json";

const reginaAvatar = reginaAvatarAsset.url;

interface ReginaChatProps {
  className?: string;
  showHeader?: boolean;
  showResetButton?: boolean;
}

const QUICK_PROMPTS = [
  "Por que sobrou ou faltou diesel na entrega?",
  "Como faço um novo cálculo?",
  "O que significa o resultado do laudo?",
  "Onde vejo meus cálculos anteriores?",
];

export function ReginaChat({ className, showHeader = true, showResetButton = true }: ReginaChatProps) {
  const { messages, sendMessage, status, reset } = useRegina();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    textareaRef.current?.focus();
  }, [messages.length, status]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    try {
      await sendMessage(text);
    } catch (e) {
      console.error("Regina send error:", e);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderText = (m: typeof messages[number]) =>
    m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {showHeader && (
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <img
            src={reginaAvatar}
            alt="Regina — Assistente Virtual"
            className="w-10 h-10 rounded-full object-cover bg-primary/10"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Regina</h3>
            <p className="text-xs text-muted-foreground truncate">
              <span className="sm:hidden">Assistente Virtual</span>
              <span className="hidden sm:inline">Assistente Virtual de Engenharia</span>
            </p>
          </div>
          {showResetButton && messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={reset}
              title="Nova conversa"
              className="h-8 w-8"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="px-4 py-4 space-y-4 overflow-y-auto h-full">
          {messages.length === 0 && (
            <div className="text-center py-6 space-y-4">
              <img
                src={reginaAvatar}
                alt="Regina — Assistente Virtual"
                className="w-24 h-24 mx-auto rounded-full object-cover shadow-sm"
              />
              <div>
                <h4 className="font-semibold">Olá! Eu sou a Regina 👋</h4>
                <p className="text-sm text-muted-foreground mt-1 px-2">
                  Pergunte sobre fórmulas, como usar o sistema ou peça pra
                  interpretar um resultado.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 px-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q).catch(console.error)}
                    className="text-xs text-left px-3 py-2 rounded-md border border-border hover:bg-accent hover:border-primary/40 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = renderText(m);
            if (m.role === "user") {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] text-sm whitespace-pre-wrap break-words">
                    {text}
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className="flex gap-2">
                <img
                  src={reginaAvatar}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover bg-primary/10 shrink-0 mt-1"
                />
                <div className="flex-1 min-w-0 text-sm prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-pre:text-xs prose-code:text-xs prose-headings:mt-2 prose-headings:mb-1 prose-ul:my-1 prose-ol:my-1">
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              </div>
            );
          })}

          {status === "submitted" && (
            <div className="flex gap-2 items-center text-muted-foreground text-sm">
              <img
                src={reginaAvatar}
                alt=""
                className="w-7 h-7 rounded-full object-cover bg-primary/10"
              />
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Pensando…</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunte à Regina…"
            rows={1}
            className="min-h-[40px] max-h-32 resize-none text-sm"
            disabled={isBusy}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isBusy}
            size="icon"
            className="shrink-0"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Regina responde apenas sobre cálculos de diesel e uso do sistema.
        </p>
      </div>
    </div>
  );
}
