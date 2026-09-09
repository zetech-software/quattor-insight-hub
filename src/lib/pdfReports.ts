import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Calculation = Tables<"calculations">;

const BRAND_COLOR: [number, number, number] = [232, 145, 58]; // #E8913A
const HEADER_BG: [number, number, number] = [232, 145, 58];
const HEADER_TEXT: [number, number, number] = [255, 255, 255];

/** Última posição Y ocupada por uma tabela gerada pelo jspdf-autotable. */
function lastAutoTableY(doc: jsPDF): number {
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

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

// ============ Relatório Individual de Cálculo ============
export function generateSingleCalculationPDF(calc: Calculation) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.width;

  addHeader(doc, "Relatório de Recebimento de Diesel");

  let y = 42;

  // Sub-header with NF info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text(`NF: ${calc.numero_nf || "—"}  |  Placa CT: ${calc.placa_ct || "—"}  |  Data: ${new Date(calc.data).toLocaleDateString("pt-BR")}`, 14, y);
  if (calc.municipio_base) {
    y += 6;
    doc.text(`Município da Base: ${calc.municipio_base}`, 14, y);
  }
  doc.setTextColor(0, 0, 0);
  y += 10;

  const fmt = (n: number | null, d = 4) => (n !== null && n !== undefined ? Number(n).toFixed(d) : "—");
  const fmtVol = (n: number | null) => (n !== null && n !== undefined ? Math.round(Number(n)).toLocaleString("pt-BR") : "—");

  // Section 1 - Dados da NF
  autoTable(doc, {
    startY: y,
    head: [["Informações da Nota Fiscal", "", ""]],
    body: [
      ["Volume NF", `${fmtVol(calc.volume_nf)} L`, ""],
      ["Peso Líquido", `${fmt(calc.peso_liquido, 2)} kg`, ""],
      ["Massa Específica 20°C (NF)", `${fmt(calc.massa_especifica_20_nf, 1)} kg/m³`, `${fmt(calc.dnf20, 4)} kg/l`],
      ["Valor NF", calc.valor_nf ? `R$ ${Number(calc.valor_nf).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—", ""],
      ["FCNF", fmt(calc.fcnf, 6), ""],
      ["Temp. Estimada de Carregamento", `${fmt(calc.temperatura_estimada, 1)} °C`, ""],
    ],
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  y = lastAutoTableY(doc) + 8;

  // Section 2 - Qualidade
  autoTable(doc, {
    startY: y,
    head: [["Análise de Qualidade", "kg/m³", "kg/l"]],
    body: [
      ["Temp. Amostra (TA)", `${fmt(calc.temperatura_amostra, 1)} °C`, ""],
      ["Massa Esp. Amostra (DA)", `${fmt(calc.densidade_amostra ? Number(calc.densidade_amostra) * 1000 : null, 1)} kg/m³`, `${fmt(calc.densidade_amostra, 4)} kg/l`],
      ["DNF 20°C (NF)", `${fmt(calc.massa_especifica_20_nf, 1)}`, `${fmt(calc.dnf20, 4)}`],
      ["DAC 20°C (Corrigida)", `${fmt(calc.dac20 != null ? Number(calc.dac20) * 1000 : null, 1)}`, `${fmt(calc.dac20, 4)}`],
      ["Diferença (DAC - DNF)", `${fmt(calc.qualidade_diff != null ? Number(calc.qualidade_diff) * 1000 : null, 1)}`, `${fmt(calc.qualidade_diff, 4)}`],
    ],
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  y = lastAutoTableY(doc) + 8;

  // Section 3 - Fator de Correção CT
  autoTable(doc, {
    startY: y,
    head: [["Fator de Correção do CT", "", ""]],
    body: [
      ["Temperatura CT (TCT)", `${fmt(calc.temperatura_ct, 1)} °C`, ""],
      ["DAC 20°C", `${fmt(calc.dac20, 4)} kg/l`, ""],
      ["FCCT (Fator Correção)", fmt(calc.fcct, 6), ""],
      ["Volume 20°C (V20)", `${fmtVol(calc.v20)} L`, ""],
    ],
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  y = lastAutoTableY(doc) + 8;

  // Section 4 - VCT
  autoTable(doc, {
    startY: y,
    head: [["Cálculo VCT — Volume na Temp. de Recebimento", "", ""]],
    body: [
      ["VCT Mínimo (-0,06%)", `${fmtVol(calc.vct_min)} L`, ""],
      ["VCT", `${fmtVol(calc.vct)} L`, ""],
      ["VCT Máximo (+0,06%)", `${fmtVol(calc.vct_max)} L`, ""],
    ],
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  y = lastAutoTableY(doc) + 4;

  // Legenda + validação da faixa VCT (±0,06%)
  const vRec = calc.volume_recebido ?? 0;
  const vMin = calc.vct_min ?? 0;
  const vMax = calc.vct_max ?? 0;
  let statusText = "";
  let statusColor: [number, number, number] = [22, 163, 74];
  if (vRec < vMin) {
    statusText = `FORA DA FAIXA — Falta de ${fmtVol(vMin - vRec)} L abaixo do VCT Mínimo`;
    statusColor = [220, 38, 38];
  } else if (vRec > vMax) {
    statusText = `FORA DA FAIXA — Sobra de ${fmtVol(vRec - vMax)} L acima do VCT Máximo`;
    statusColor = [220, 38, 38];
  } else {
    statusText = "DENTRO DA FAIXA — Volume recebido está dentro da tolerância de ±0,06%";
    statusColor = [22, 163, 74];
  }

  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  const legend = "Tolerância operacional de ±0,06% aplicada sobre o VCT. Volumes entre VCT Mínimo e VCT Máximo são aceitáveis; abaixo indica falta e acima indica sobra além da margem.";
  const legendLines = doc.splitTextToSize(legend, 182);
  doc.text(legendLines, 14, y);
  y += legendLines.length * 3.5 + 2;

  doc.setFontSize(8.5);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont("helvetica", "bold");
  const statusLines = doc.splitTextToSize(statusText, 182);
  doc.text(statusLines, 14, y);
  y += statusLines.length * 4 + 4;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  // Section 5 - Resumo
  const diff = calc.diferenca_volume ?? 0;
  const isNeg = diff < 0;
  
  autoTable(doc, {
    startY: y,
    head: [["Resumo Final", ""]],
    body: [
      ["Volume NF", `${fmtVol(calc.volume_nf)} L`],
      ["Volume Recebido", `${fmtVol(calc.volume_recebido)} L`],
      ["VCT", `${fmtVol(calc.vct)} L`],
      ["Volume Atestado", `${fmtVol(calc.volume_atestado)} L`],
      ["Volume 20°C (V20)", `${fmtVol(calc.v20)} L`],
      ["Diferença", `${fmtVol(calc.diferenca_volume)} L`],
      ["Situação", calc.situacao || "—"],
    ],
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 5) {
        data.cell.styles.textColor = isNeg ? [220, 38, 38] : [22, 163, 74];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.section === "body" && data.row.index === 6) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = isNeg ? [220, 38, 38] : [22, 163, 74];
      }
    },
  });

  addFooter(doc);
  const nf = calc.numero_nf || "sem-nf";
  doc.save(`relatorio-calculo-${nf}-${calc.data}.pdf`);
}

// ============ Relatório de Conferências (Admin) ============
export type ConferenceFilters = {
  startDate?: string;        // YYYY-MM-DD
  endDate?: string;          // YYYY-MM-DD
  userId?: string;           // cliente
  placaCT?: string;          // contém
  situacao?: "todas" | "sobra" | "falta" | "igual";
};

export async function fetchConferenceCalculations(filters: ConferenceFilters) {
  let q = supabase.from("calculations").select("*").order("data", { ascending: false });
  if (filters.startDate) q = q.gte("data", filters.startDate);
  if (filters.endDate) q = q.lte("data", filters.endDate);
  if (filters.userId) q = q.eq("user_id", filters.userId);
  if (filters.placaCT && filters.placaCT.trim()) q = q.ilike("placa_ct", `%${filters.placaCT.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  let rows = data ?? [];
  if (filters.situacao && filters.situacao !== "todas") {
    rows = rows.filter((r) => {
      const d = r.diferenca_volume ?? 0;
      if (filters.situacao === "sobra") return d > 0;
      if (filters.situacao === "falta") return d < 0;
      return d === 0;
    });
  }
  return rows as Calculation[];
}

function periodLabel(f: ConferenceFilters) {
  const fmt = (d?: string) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");
  if (!f.startDate && !f.endDate) return "Todos os períodos";
  return `${fmt(f.startDate)} a ${fmt(f.endDate)}`;
}

export async function generateConferenceReport(
  filters: ConferenceFilters,
  clientName?: string,
) {
  const rows = await fetchConferenceCalculations(filters);
  const { data: profiles } = await supabase.from("profiles").select("user_id, company_name, full_name");
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.company_name || p.full_name || "—"]));

  const doc = new jsPDF({ orientation: "landscape" });
  addHeader(doc, "Relatório de Conferências");

  let y = 38;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Período: ${periodLabel(filters)}`, 14, y);
  if (clientName) doc.text(`Cliente: ${clientName}`, 120, y);
  if (filters.placaCT) doc.text(`Placa CT: ${filters.placaCT}`, 200, y);
  if (filters.situacao && filters.situacao !== "todas") doc.text(`Situação: ${filters.situacao}`, 250, y);
  y += 6;

  // Totais
  const totVolNF = rows.reduce((s, r) => s + Number(r.volume_nf ?? 0), 0);
  const totVCT = rows.reduce((s, r) => s + Number(r.vct ?? 0), 0);
  const totV20 = rows.reduce((s, r) => s + Number(r.v20 ?? 0), 0);
  const totDif = rows.reduce((s, r) => s + Number(r.diferenca_volume ?? 0), 0);
  const sobras = rows.filter((r) => (r.diferenca_volume ?? 0) > 0).length;
  const faltas = rows.filter((r) => (r.diferenca_volume ?? 0) < 0).length;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text(
    `Conferências: ${rows.length}  |  Sobras: ${sobras}  |  Faltas: ${faltas}  |  Σ Volume NF: ${Math.round(totVolNF).toLocaleString("pt-BR")} L  |  Σ VCT: ${Math.round(totVCT).toLocaleString("pt-BR")} L  |  Σ V20: ${Math.round(totV20).toLocaleString("pt-BR")} L  |  Σ Diferença: ${Math.round(totDif).toLocaleString("pt-BR")} L`,
    14,
    y,
  );
  y += 4;

  autoTable(doc, {
    startY: y + 2,
    head: [["Data", "Cliente", "NF", "Placa CT", "Vol. NF (L)", "VCT (L)", "V20 (L)", "Vol. Atestado (L)", "Diferença (L)", "%", "Situação"]],
    body: rows.map((r) => {
      const vnf = Number(r.volume_nf ?? 0);
      const diff = Number(r.diferenca_volume ?? 0);
      const pct = vnf ? ((diff / vnf) * 100).toFixed(2) + "%" : "—";
      return [
        new Date(r.data).toLocaleDateString("pt-BR"),
        profileMap.get(r.user_id) ?? "—",
        r.numero_nf ?? "—",
        r.placa_ct ?? "—",
        Math.round(vnf).toLocaleString("pt-BR"),
        r.vct !== null ? Math.round(Number(r.vct)).toLocaleString("pt-BR") : "—",
        r.v20 !== null ? Math.round(Number(r.v20)).toLocaleString("pt-BR") : "—",
        r.volume_atestado !== null ? Math.round(Number(r.volume_atestado)).toLocaleString("pt-BR") : "—",
        r.diferenca_volume !== null ? Math.round(diff).toLocaleString("pt-BR") : "—",
        pct,
        r.situacao ?? "—",
      ];
    }),
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === "body" && (data.column.index === 8 || data.column.index === 9)) {
        const raw = rows[data.row.index]?.diferenca_volume ?? 0;
        if (Number(raw) < 0) data.cell.styles.textColor = [220, 38, 38];
        else if (Number(raw) > 0) data.cell.styles.textColor = [22, 163, 74];
      }
    },
  });

  addFooter(doc);
  doc.save(`relatorio-conferencias-${new Date().toISOString().slice(0, 10)}.pdf`);
}

