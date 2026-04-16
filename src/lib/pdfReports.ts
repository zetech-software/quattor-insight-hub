import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Calculation = Tables<"calculations">;

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
  if ((calc as any).municipio_base) {
    y += 6;
    doc.text(`Município da Base: ${(calc as any).municipio_base}`, 14, y);
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

  y = (doc as any).lastAutoTable.finalY + 8;

  // Section 2 - Qualidade
  autoTable(doc, {
    startY: y,
    head: [["Análise de Qualidade", "kg/m³", "kg/l"]],
    body: [
      ["Temp. Amostra (TA)", `${fmt(calc.temperatura_amostra, 1)} °C`, ""],
      ["Massa Esp. Amostra (DA)", `${fmt(calc.densidade_amostra ? Number(calc.densidade_amostra) * 1000 : null, 1)} kg/m³`, `${fmt(calc.densidade_amostra, 4)} kg/l`],
      ["DNF 20°C (NF)", `${fmt(calc.massa_especifica_20_nf, 1)}`, `${fmt(calc.dnf20, 4)}`],
      ["DAC 20°C (Corrigida)", `${fmt(calc.dac20 ? Number(calc.dac20) * 1000 : null, 1)}`, `${fmt(calc.dac20, 4)}`],
      ["Diferença (DAC - DNF)", `${fmt(calc.qualidade_diff ? Number(calc.qualidade_diff) * 1000 : null, 1)}`, `${fmt(calc.qualidade_diff, 4)}`],
    ],
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

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

  y = (doc as any).lastAutoTable.finalY + 8;

  // Section 4 - VCT
  autoTable(doc, {
    startY: y,
    head: [["Cálculo VCT — Volume na Temp. de Recebimento", "", ""]],
    body: [
      ["VCT Mínimo (-0,06%)", `${fmtVol(calc.vct_min)} L`, ""],
      ["VCT", `${fmtVol(calc.vct)} L`, ""],
      ["VCT Máximo (+0,05%)", `${fmtVol(calc.vct_max)} L`, ""],
    ],
    headStyles: { fillColor: HEADER_BG, textColor: HEADER_TEXT, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [252, 243, 232] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

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
