import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Lock, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTicketActions, type TicketDetail } from "@/hooks/useTickets";
import { AttachmentPicker } from "@/components/tickets/AttachmentPicker";
import { formatDateTime, validateAttachments } from "@/lib/tickets";

interface Props {
  detail: TicketDetail;
  supportMode?: boolean;
  onChanged: () => void;
}

export function TicketThread({ detail, supportMode = false, onChanged }: Props) {
  const { addMessage, getAttachmentUrl, saving } = useTicketActions();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [internal, setInternal] = useState(false);
  const closed = detail.ticket.status === "fechado";

  const handleSend = async () => {
    if (body.trim().length < 2) {
      toast({ title: "Escreva uma mensagem", variant: "destructive" });
      return;
    }
    const invalid = validateAttachments(files);
    if (invalid) {
      toast({ title: "Anexo não aceito", description: invalid, variant: "destructive" });
      return;
    }
    try {
      await addMessage(detail.ticket.id, body, files, supportMode && internal);
      setBody("");
      setFiles([]);
      setInternal(false);
      onChanged();
    } catch (e) {
      toast({
        title: "Não foi possível enviar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const openAttachment = async (path: string) => {
    try {
      const url = await getAttachmentUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast({
        title: "Anexo indisponível",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conversa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {detail.messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg border p-3 ${
                m.is_internal
                  ? "border-dashed bg-muted/60"
                  : m.author_is_support
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {m.author_name || (m.author_is_support ? "Suporte" : "Usuário")}
                </span>
                {m.author_is_support && <Badge variant="secondary">Suporte</Badge>}
                {m.is_internal && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" /> Nota interna
                  </Badge>
                )}
                <span>{formatDateTime(m.created_at)}</span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap break-words">{m.body}</p>
              {m.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.attachments.map((a) => (
                    <Button
                      key={a.id}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => openAttachment(a.storage_path)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="max-w-[160px] truncate">{a.file_name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {closed ? (
          <p className="text-sm text-muted-foreground">
            Este chamado está fechado. {supportMode ? "Reabra para responder." : "Abra um novo chamado se precisar de ajuda."}
          </p>
        ) : (
          <div className="space-y-3 border-t pt-4">
            <Textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={supportMode ? "Responder ao cliente..." : "Escreva sua mensagem..."}
            />
            <AttachmentPicker files={files} onChange={setFiles} disabled={saving} />
            {supportMode && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="internal-note"
                  checked={internal}
                  onCheckedChange={(v) => setInternal(v === true)}
                />
                <Label htmlFor="internal-note" className="text-sm font-normal">
                  Nota interna (o cliente não vê)
                </Label>
              </div>
            )}
            <Button onClick={handleSend} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
