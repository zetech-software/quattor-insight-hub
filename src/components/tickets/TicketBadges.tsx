import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  requesterTypeLabel,
  statusVariant,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/tickets";

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={statusVariant(status)}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cls =
    priority === "urgente"
      ? "border-destructive text-destructive"
      : priority === "alta"
        ? "border-primary text-primary"
        : "text-muted-foreground";
  return (
    <Badge variant="outline" className={cls}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

/** Selo Dono / Cliente para diferenciar o solicitante. */
export function RequesterTypeBadge({ requesterRole }: { requesterRole: string | null }) {
  const label = requesterTypeLabel(requesterRole);
  return (
    <Badge variant="outline" className={label === "Dono" ? "border-primary text-primary" : "text-muted-foreground"}>
      {label}
    </Badge>
  );
}
