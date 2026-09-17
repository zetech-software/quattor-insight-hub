import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTicketActions } from "@/hooks/useTickets";
import { AttachmentPicker } from "@/components/tickets/AttachmentPicker";
import {
  CATEGORY_OPTIONS,
  PRIORITY_LABELS,
  REQUESTER_PRIORITIES,
  TICKET_ERRORS,
  validateAttachments,
  type TicketPriority,
} from "@/lib/tickets";

export function NewTicketDialog({ onCreated }: { onCreated: () => void }) {
  const { createTicket, saving, canCreateTicket } = useTicketActions();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("outro");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Suporte não abre chamado: nem o botão aparece.
  if (!canCreateTicket) return null;

  const reset = () => {
    setSubject("");
    setCategory("outro");
    setPriority("normal");
    setBody("");
    setFiles([]);
  };

  const handleSubmit = async () => {
    if (subject.trim().length < 4) {
      toast({ title: "Descreva o assunto", description: "Use ao menos 4 caracteres.", variant: "destructive" });
      return;
    }
    if (body.trim().length < 10) {
      toast({ title: "Conte o que aconteceu", description: "Use ao menos 10 caracteres.", variant: "destructive" });
      return;
    }
    const invalid = validateAttachments(files);
    if (invalid) {
      toast({ title: "Anexo não aceito", description: invalid, variant: "destructive" });
      return;
    }
    try {
      await createTicket({ subject, category, priority, body, files });
      toast({ title: "Chamado aberto", description: "Nosso suporte vai responder por aqui." });
      reset();
      setOpen(false);
      onCreated();
    } catch (e) {
      toast({
        title: TICKET_ERRORS.create,
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (setOpen(v), v || reset())}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Abrir chamado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrir chamado</DialogTitle>
          <DialogDescription>Explique o que precisa e anexe evidências, se tiver.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Assunto</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex.: Divergência no volume atestado"
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUESTER_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-body">Descrição</Label>
            <Textarea
              id="ticket-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Descreva o ocorrido, com datas, notas fiscais ou placas envolvidas."
            />
          </div>
          <AttachmentPicker files={files} onChange={setFiles} disabled={saving} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar chamado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
