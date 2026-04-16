import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const BRAND_COLOR: [number, number, number] = [232, 145, 58]; // #E8913A
const HEADER_BG: [number, number, number] = [232, 145, 58];
const HEADER_TEXT: [number, number, number] = [255, 255, 255];

function addHeader(doc: jsPDF, title: string) {
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, doc.internal.pageSize.width, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 20);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Qu4ttuor Consultoria — ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const h = doc.internal.pageSize.height;
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, h - 8, { align: "center" });
    doc.text("Documento gerado automaticamente — Qu4ttuor Consultoria", doc.internal.pageSize.width / 2, h - 4, { align: "center" });
  }
}

// ============ Relatório de Clientes ============
export async function generateClientReport() {
  const { data: profiles } = await supabase.from("profiles").select("*");
  const { data: roles } = await supabase.from("user_roles").select("*");
  const { data: subs } = await supabase.from("subscriptions").select("*");

  const adminIds = new Set((roles ?? []).filter(r => r.role === "admin").map(r => r.user_id));
  const clients = (profiles ?? []).filter(p => !adminIds.has(p.user_id));

  const doc = new jsPDF();
  addHeader(doc, "Relatório de Clientes");

  autoTable(doc, {
    startY: 38,
    head: [["Empresa", "Nome", "Telefone", "Status", "Plano", "Criado em"]],
    body: clients.map(c => {
      const sub = (subs ?? []).find(s => s.user_id === c.user_id);
      return [
        c.company_name ?? "—",
        c.full_name ?? "—",
        c.phone ?? "—",
        c.is_active ? "Ativo" : "Inativo",
        sub?.plan_name ?? "—",
        new Date(c.created_at).toLocaleDateString("pt-BR"),
      ];
    }),
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save("relatorio-clientes.pdf");
}

// ============ Relatório de Cálculos ============
export async function generateCalculationsReport() {
  const { data: calcs } = await supabase.from("calculations").select("*").order("created_at", { ascending: false });
  const { data: profiles } = await supabase.from("profiles").select("user_id, company_name, full_name");

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.company_name || p.full_name || "—"]));

  const doc = new jsPDF({ orientation: "landscape" });
  addHeader(doc, "Relatório de Cálculos");

  autoTable(doc, {
    startY: 38,
    head: [["Data", "Cliente", "NF", "Placa CT", "Vol. NF (L)", "VCT (L)", "Diferença (L)", "Situação"]],
    body: (calcs ?? []).map(c => [
      new Date(c.data).toLocaleDateString("pt-BR"),
      profileMap.get(c.user_id) ?? "—",
      c.numero_nf ?? "—",
      c.placa_ct ?? "—",
      c.volume_nf?.toFixed(2) ?? "—",
      c.vct?.toFixed(2) ?? "—",
      c.diferenca_volume?.toFixed(2) ?? "—",
      c.situacao ?? "—",
    ]),
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save("relatorio-calculos.pdf");
}

// ============ Relatório de Assinaturas ============
export async function generateSubscriptionsReport() {
  const { data: subs } = await supabase.from("subscriptions").select("*");
  const { data: profiles } = await supabase.from("profiles").select("user_id, company_name, full_name");

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.company_name || p.full_name || "—"]));

  const doc = new jsPDF();
  addHeader(doc, "Relatório de Assinaturas");

  autoTable(doc, {
    startY: 38,
    head: [["Cliente", "Plano", "Status", "Início", "Expiração"]],
    body: (subs ?? []).map(s => [
      profileMap.get(s.user_id) ?? "—",
      s.plan_name,
      s.status === "active" ? "Ativo" : s.status === "trial" ? "Trial" : s.status === "expired" ? "Expirado" : "Cancelado",
      new Date(s.starts_at).toLocaleDateString("pt-BR"),
      s.expires_at ? new Date(s.expires_at).toLocaleDateString("pt-BR") : "—",
    ]),
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save("relatorio-assinaturas.pdf");
}
