import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  TICKET_BUCKET,
  TICKET_ERRORS,
  type Ticket,
  type TicketAttachment,
  type TicketMessage,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets";

/** Traduz qualquer falha do banco para linguagem do usuário. */
function friendly(message: string | undefined, fallback: string) {
  const raw = (message ?? "").toLowerCase();
  if (raw.includes("row-level security") || raw.includes("permission") || raw.includes("policy")) {
    return TICKET_ERRORS.denied;
  }
  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "Sem conexão no momento. Tente novamente.";
  }
  return fallback;
}

/** Lista de chamados. Sem filtro = escopo definido pelas regras de acesso do banco. */
export function useTicketList(scope: "own" | "all") {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    let query = supabase.from("tickets").select("*").order("last_message_at", { ascending: false });
    if (scope === "own") query = query.eq("requester_id", user.id);
    const [ticketsRes, readsRes] = await Promise.all([
      query,
      supabase.from("ticket_reads").select("ticket_id, last_read_at").eq("user_id", user.id),
    ]);
    if (ticketsRes.error) {
      setError(friendly(ticketsRes.error.message, TICKET_ERRORS.load));
      setTickets([]);
    } else {
      setTickets(ticketsRes.data ?? []);
      const map: Record<string, string> = {};
      (readsRes.data ?? []).forEach((r) => {
        map[r.ticket_id] = r.last_read_at;
      });
      setReads(map);
    }
    setLoading(false);
  }, [scope, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isUnread = useCallback(
    (ticket: Ticket) => {
      const read = reads[ticket.id];
      return !read || new Date(ticket.last_message_at) > new Date(read);
    },
    [reads],
  );

  return { tickets, loading, error, reload: load, isUnread };
}

export interface TicketDetail {
  ticket: Ticket;
  messages: (TicketMessage & { attachments: TicketAttachment[] })[];
}

export function useTicketDetail(ticketId: string | undefined) {
  const { user } = useAuth();
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    const [ticketRes, messagesRes, attachmentsRes] = await Promise.all([
      supabase.from("tickets").select("*").eq("id", ticketId).maybeSingle(),
      supabase.from("ticket_messages").select("*").eq("ticket_id", ticketId).order("created_at"),
      supabase.from("ticket_attachments").select("*").eq("ticket_id", ticketId),
    ]);
    if (ticketRes.error || messagesRes.error) {
      setError(friendly(ticketRes.error?.message || messagesRes.error?.message, TICKET_ERRORS.loadOne));
      setDetail(null);
    } else if (!ticketRes.data) {
      setError(TICKET_ERRORS.notFound);
      setDetail(null);
    } else {
      const attachments = attachmentsRes.data ?? [];
      setDetail({
        ticket: ticketRes.data,
        messages: (messagesRes.data ?? []).map((m) => ({
          ...m,
          attachments: attachments.filter((a) => a.message_id === m.id),
        })),
      });
      if (user?.id) {
        await supabase
          .from("ticket_reads")
          .upsert({ user_id: user.id, ticket_id: ticketId, last_read_at: new Date().toISOString() });
      }
    }
    setLoading(false);
  }, [ticketId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { detail, loading, error, reload: load };
}

interface CreateTicketInput {
  subject: string;
  category: string;
  priority: TicketPriority;
  body: string;
  files: File[];
}

export function useTicketActions() {
  const { user, profile, role } = useAuth();
  const isSupport = role === "support" || role === "admin";
  /** Suporte não é solicitante: não abre chamado (bloqueado também no banco). */
  const canCreateTicket = role !== "support";
  const [saving, setSaving] = useState(false);

  const uploadAttachments = async (ticketId: string, messageId: string, files: File[]) => {
    if (!user?.id || files.length === 0) return;
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${ticketId}/${messageId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from(TICKET_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw new Error(`Falha ao enviar "${file.name}".`);
      const { error: rowErr } = await supabase.from("ticket_attachments").insert({
        ticket_id: ticketId,
        message_id: messageId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: user.id,
      });
      if (rowErr) throw new Error(`Falha ao registrar "${file.name}".`);
    }
  };

  const createTicket = async (input: CreateTicketInput) => {
    if (!user?.id) throw new Error("Sessão expirada. Entre novamente.");
    if (!canCreateTicket) throw new Error(TICKET_ERRORS.denied);
    setSaving(true);
    try {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          requester_id: user.id,
          requester_name: profile?.full_name ?? null,
          requester_email: user.email ?? null,
          requester_company: profile?.company_name ?? null,
          requester_role: role ?? "client",
          subject: input.subject.trim(),
          category: input.category,
          priority: input.priority,
        })
        .select("*")
        .single();
      if (error || !ticket) throw new Error(friendly(error?.message, TICKET_ERRORS.create));

      const { data: message, error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          author_id: user.id,
          author_name: profile?.full_name ?? user.email ?? null,
          author_is_support: false,
          body: input.body.trim(),
        })
        .select("id")
        .single();
      if (msgError || !message) throw new Error(friendly(msgError?.message, TICKET_ERRORS.create));

      await uploadAttachments(ticket.id, message.id, input.files);
      return ticket;
    } finally {
      setSaving(false);
    }
  };

  const addMessage = async (
    ticketId: string,
    body: string,
    files: File[],
    isInternal = false,
  ) => {
    if (!user?.id) throw new Error("Sessão expirada. Entre novamente.");
    setSaving(true);
    try {
      const { data: message, error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          author_id: user.id,
          author_name: profile?.full_name ?? user.email ?? null,
          author_is_support: isSupport,
          body: body.trim(),
          is_internal: isInternal,
        })
        .select("id")
        .single();
      if (error || !message) throw new Error(friendly(error?.message, TICKET_ERRORS.send));
      await uploadAttachments(ticketId, message.id, files);
    } finally {
      setSaving(false);
    }
  };

  const updateTicket = async (
    ticketId: string,
    patch: Partial<{
      status: TicketStatus;
      priority: TicketPriority;
      assigned_to: string | null;
      assigned_name: string | null;
      closed_at: string | null;
    }>,
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("tickets").update(patch).eq("id", ticketId);
      if (error) throw new Error(friendly(error.message, TICKET_ERRORS.status));
    } finally {
      setSaving(false);
    }
  };

  const getAttachmentUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from(TICKET_BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) throw new Error(TICKET_ERRORS.attachment);
    return data.signedUrl;
  };

  return { createTicket, addMessage, updateTicket, getAttachmentUrl, saving, isSupport, canCreateTicket };
}

/** Contador de chamados com mensagem nova para o usuário atual. */
export function useUnreadTicketCount(scope: "own" | "all") {
  const { user, role } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || role === null) return;

    const load = async () => {
      let query = supabase.from("tickets").select("id, last_message_at").neq("status", "fechado");
      if (scope === "own") query = query.eq("requester_id", user.id);
      const [ticketsRes, readsRes] = await Promise.all([
        query,
        supabase.from("ticket_reads").select("ticket_id, last_read_at").eq("user_id", user.id),
      ]);
      if (cancelled || ticketsRes.error) return;
      const reads: Record<string, string> = {};
      (readsRes.data ?? []).forEach((r) => {
        reads[r.ticket_id] = r.last_read_at;
      });
      const total = (ticketsRes.data ?? []).filter(
        (t) => !reads[t.id] || new Date(t.last_message_at) > new Date(reads[t.id]),
      ).length;
      setCount(total);
    };

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [scope, user?.id, role]);

  return count;
}
