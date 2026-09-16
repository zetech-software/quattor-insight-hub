import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X } from "lucide-react";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENTS } from "@/lib/tickets";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function AttachmentPicker({ files, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_ATTACHMENT_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          onChange([...files, ...picked].slice(0, MAX_ATTACHMENTS));
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || files.length >= MAX_ATTACHMENTS}
        onClick={() => inputRef.current?.click()}
        className="gap-2"
      >
        <Paperclip className="h-4 w-4" />
        Anexar arquivo
      </Button>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate max-w-[220px]">{file.name}</span>
              <button
                type="button"
                aria-label={`Remover ${file.name}`}
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Imagens ou PDF, até 10 MB cada, no máximo {MAX_ATTACHMENTS}.</p>
    </div>
  );
}
