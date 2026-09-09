import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRegina } from "@/hooks/useRegina";
import { ReginaChat } from "./ReginaChat";
import reginaAvatarAsset from "@/assets/regina-avatar.png.asset.json";
import { useLocation } from "react-router-dom";

const reginaAvatar = reginaAvatarAsset.url;

export function ReginaFab() {
  const { isOpen, setIsOpen, messages } = useRegina();
  const location = useLocation();

  // Hide on /regina page (would be redundant)
  if (location.pathname === "/regina") return null;

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fechar Regina" : "Falar com a Regina"}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg overflow-hidden",
          "bg-primary hover:bg-primary/90 transition-all duration-200",
          "flex items-center justify-center group ring-2 ring-primary/30",
          "hover:scale-105 active:scale-95"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <>
            <img
              src={reginaAvatar}
              alt="Regina — Assistente Virtual"
              className="w-full h-full object-cover"
            />
            {messages.length === 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" />
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-40 shadow-2xl border rounded-xl overflow-hidden",
            "bg-background animate-in fade-in slide-in-from-bottom-4 duration-200",
            "inset-x-4 bottom-24 top-20",
            "md:inset-auto md:bottom-24 md:right-6 md:top-auto md:w-[400px] md:h-[600px]"
          )}
        >
          <ReginaChat />
        </div>
      )}
    </>
  );
}
