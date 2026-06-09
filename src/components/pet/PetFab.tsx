import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePet } from "@/hooks/usePet";
import { PetChat } from "./PetChat";
import petAvatar from "@/assets/pet-avatar.png";
import { useLocation } from "react-router-dom";

export function PetFab() {
  const { isOpen, setIsOpen, messages } = usePet();
  const location = useLocation();

  // Hide on /pet page (would be redundant)
  if (location.pathname === "/pet") return null;

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fechar PET" : "Abrir PET"}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 transition-all duration-200",
          "flex items-center justify-center group",
          "hover:scale-105 active:scale-95",
          isOpen && "rotate-12"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <>
            <img
              src={petAvatar}
              alt=""
              className="w-11 h-11 object-contain"
            />
            {messages.length === 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" />
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
            // Mobile: full width near bottom
            "inset-x-4 bottom-24 top-20",
            // Desktop: floating panel above the FAB
            "md:inset-auto md:bottom-24 md:right-6 md:top-auto md:w-[400px] md:h-[600px]"
          )}
        >
          <PetChat />
        </div>
      )}
    </>
  );
}
