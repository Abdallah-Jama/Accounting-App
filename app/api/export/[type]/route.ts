import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const allowed = ["companies", "received-payments", "invoices", "invoice-items"] as const;
type ExportType = typeof allowed[number];

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csv(headers: string[], rows: unknown[][]) {
  return "\uFEFF" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
}

function minorToMajor(value: number) { return (value / 100).toFixed(2); }
function date(value: Date) { return value.toISOString().slice(0, 10); }

export async function GET(_request: Request, { params }: { params: Promise<{type:string}> }) {
  if(!await getCurrentSession())return new Response("Authentication required",{status:401});
  const { type: rawType } = await params;
  if (!allowed.includes(rawType as ExportType)) return new Response("Unknown export type", { status: 404 });
  const type = rawType as ExportType;
  let content: string;

  if (type === "companies") {
    const rows = await db.company.findMany({ orderBy: { id: "asc" } });
    content = csv(["id","name","email","phone","address","notes","created_at","updated_at"], rows.map(r=>[r.id,r.name,r.email,r.phone,r.address,r.notes,r.createdAt.toISOString(),r.updatedAt.toISOString()]));
  } else if (type === "received-payments") {
    const rows = await db.moneyReceipt.findMany({ include:{company:true}, orderBy:{id:"asc"} });
    content = csv(["id","company_id","company_name","amount_minor","amount_aed","received_date","reference","notes","created_at"], rows.map(r=>[r.id,r.companyId,r.company.name,r.amount,minorToMajor(r.amount),date(r.receivedAt),r.reference,r.notes,r.createdAt.toISOString()]));
  } else if (type === "invoices") {
    const rows = await db.invoice.findMany({ include:{company:true}, orderBy:{id:"asc"} });
    content = csv(["id","invoice_number","company_id","company_name","invoice_date","status","subtotal_minor","subtotal_aed","commission_minor","commission_aed","packing_minor","packing_aed","transportation_minor","transportation_aed","grand_total_minor","grand_total_aed","notes","created_at","updated_at"], rows.map(r=>[r.id,r.invoiceNumber,r.companyId,r.company.name,date(r.invoiceDate),r.status,r.subtotal,minorToMajor(r.subtotal),r.commission,minorToMajor(r.commission),r.packing,minorToMajor(r.packing),r.transportation,minorToMajor(r.transportation),r.grandTotal,minorToMajor(r.grandTotal),r.notes,r.createdAt.toISOString(),r.updatedAt.toISOString()]));
  } else {
    const rows = await db.invoiceItem.findMany({ include:{invoice:{include:{company:true}}}, orderBy:[{invoiceId:"asc"},{sortOrder:"asc"}] });
    content = csv(["id","invoice_id","invoice_number","invoice_status","company_id","company_name","sort_order","item_name","quantity","unit_price_minor","unit_price_aed","line_total_minor","line_total_aed"], rows.map(r=>[r.id,r.invoiceId,r.invoice.invoiceNumber,r.invoice.status,r.invoice.companyId,r.invoice.company.name,r.sortOrder,r.itemName,r.quantity,r.unitPrice,minorToMajor(r.unitPrice),r.lineTotal,minorToMajor(r.lineTotal)]));
  }

  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  await writeAuditLog({action:"CSV_EXPORT_GENERATED",entityType:"Export",entityReference:type,details:{format:"csv"}});
  return new Response(content, { headers:{ "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":`attachment; filename="${type}-${stamp}.csv"`, "Cache-Control":"no-store" } });
}
