import type { Database, Tables } from "@/integrations/supabase/types";

export type Ticket = Tables<"tickets">;
export type TicketMessage = Tables<"ticket_messages">;
export type TicketAttachment = Tables<"ticket_attachments">;
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

export const TICKET_BUCKET = "ticket-attachments";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
export const ALLOWED_ATTACHMENT_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

/** Mensagens amigáveis: nunca mostramos erro técnico do banco. */
export const TICKET_ERRORS = {
  load: "Não foi possível carregar os chamados.",
  loadOne: "Não foi possível carregar o chamado.",
  send: "Não foi possível enviar sua resposta.",
  create: "Não foi possível abrir o chamado.",
  status: "Não foi possível atualizar o status.",
  denied: "Você não tem permissão para realizar esta ação.",
  attachment: "Não foi possível abrir o anexo.",
  notFound: "Chamado não encontrado.",
} as const;

export const STATUS_LABELS: Record<TicketStatus, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

export const STATUS_ORDER: TicketStatus[] = [
  "aberto",
  "em_atendimento",
  "aguardando_cliente",
  "resolvido",
  "fechado",
];

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  baixa: "Baixa",
  normal: "Média",
  alta: "Alta",
  urgente: "Crítica",
};

export const PRIORITY_ORDER: TicketPriority[] = ["baixa", "normal", "alta", "urgente"];

/** Prioridades que o solicitante pode escolher: Crítica é exclusiva do suporte. */
export const REQUESTER_PRIORITIES: TicketPriority[] = ["baixa", "normal", "alta"];

export const CATEGORY_OPTIONS = [
  { value: "acesso", label: "Acesso / Login" },
  { value: "calculadora", label: "Calculadora" },
  { value: "historico", label: "Histórico" },
  { value: "regina", label: "Regina" },
  { value: "relatorios", label: "Relatórios" },
  { value: "conta", label: "Conta / Perfil" },
  { value: "erro", label: "Erro no sistema" },
  { value: "cobranca", label: "Cobrança / Plano" },
  { value: "outro", label: "Outro" },
];

/** Chaves antigas de chamados já existentes. */
const LEGACY_CATEGORIES: Record<string, string> = {
  geral: "Outro",
  calculo: "Calculadora",
  relatorio: "Relatórios",
};

export function categoryLabel(value: string | null) {
  if (!value) return "Outro";
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? LEGACY_CATEGORIES[value] ?? "Outro";
}

/** Rótulo do tipo de solicitante mostrado na caixa do suporte. */
export function requesterTypeLabel(requesterRole: string | null) {
  return requesterRole === "admin" || requesterRole === "manager" ? "Dono" : "Cliente";
}

export function statusVariant(status: TicketStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "aberto":
      return "default";
    case "em_atendimento":
      return "secondary";
    case "aguardando_cliente":
      return "outline";
    case "resolvido":
      return "secondary";
    default:
      return "outline";
  }
}

export function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function validateAttachments(files: File[]): string | null {
  if (files.length > MAX_ATTACHMENTS) return `Envie no máximo ${MAX_ATTACHMENTS} arquivos por mensagem.`;
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_BYTES) return `"${file.name}" passa de 10 MB.`;
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) return `"${file.name}" não é imagem nem PDF.`;
  }
  return null;
}

/** Código curto do chamado, usado na busca e na identificação visual. */
export function ticketCode(id: string) {
  return id.slice(0, 8).toUpperCase();
}

/** Tamanho de arquivo em formato legível. */
export function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
