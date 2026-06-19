import { db } from "@/lib/db";

export type StatementTransactionType = "ALL" | "PAYMENTS" | "INVOICES";
export type StatementInvoiceStatus = "ALL" | "FINAL" | "CANCELLED" | "DRAFT";
export type StatementFilters = { from?: string; to?: string; type: StatementTransactionType; status: StatementInvoiceStatus; search: string; showDrafts: boolean };
export type StatementRow = {
  key: string;
  date: Date;
  type: "Payment" | "Invoice";
  reference: string;
  status: "Received" | "Final" | "Cancelled" | "Draft";
  description: string;
  debit: number | null;
  credit: number | null;
  runningBalance: number;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function normalizeStatementFilters(query: Record<string, string | string[] | undefined>): StatementFilters {
  const from = first(query.from); const to = first(query.to);
  const rawType = first(query.type)?.toUpperCase();
  const rawStatus = first(query.status)?.toUpperCase();
  const type: StatementTransactionType = rawType === "PAYMENTS" || rawType === "INVOICES" ? rawType : "ALL";
  const status: StatementInvoiceStatus = rawStatus === "FINAL" || rawStatus === "CANCELLED" || rawStatus === "DRAFT" ? rawStatus : "ALL";
  return {
    from: from && datePattern.test(from) ? from : undefined,
    to: to && datePattern.test(to) ? to : undefined,
    type,
    status,
    search: String(first(query.search) ?? "").trim().slice(0, 100),
    showDrafts: first(query.showDrafts) === "1" || status === "DRAFT",
  };
}

export function statementQueryString(filters: StatementFilters) {
  const query = new URLSearchParams();
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.type !== "ALL") query.set("type", filters.type);
  if (filters.status !== "ALL") query.set("status", filters.status);
  if (filters.search) query.set("search", filters.search);
  if (filters.showDrafts) query.set("showDrafts", "1");
  return query.toString();
}

export async function getCompanyStatement(companyId: number, filters: StatementFilters) {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { id:true,name:true,email:true,phone:true,address:true } });
  if (!company) return null;
  const start = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined;
  const end = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined;
  const dateWhere = (field: "receivedAt" | "invoiceDate") => ({ [field]: { ...(start ? { gte:start } : {}), ...(end ? { lte:end } : {}) } });

  const [openingReceived, openingInvoiced, receipts, invoices] = await Promise.all([
    start ? db.moneyReceipt.aggregate({ where:{companyId,receivedAt:{lt:start}},_sum:{amount:true} }) : Promise.resolve({_sum:{amount:0}}),
    start ? db.invoice.aggregate({ where:{companyId,status:"FINAL",invoiceDate:{lt:start}},_sum:{grandTotal:true} }) : Promise.resolve({_sum:{grandTotal:0}}),
    db.moneyReceipt.findMany({ where:{companyId,...dateWhere("receivedAt")},orderBy:[{receivedAt:"asc"},{id:"asc"}] }),
    db.invoice.findMany({ where:{companyId,status:{in:filters.showDrafts?["FINAL","CANCELLED","DRAFT"]:["FINAL","CANCELLED"]},...dateWhere("invoiceDate")},orderBy:[{invoiceDate:"asc"},{id:"asc"}] }),
  ]);
  const openingBalance = (openingReceived._sum.amount ?? 0) - (openingInvoiced._sum.grandTotal ?? 0);
  const events = [
    ...receipts.map(row=>({kind:"PAYMENT" as const,id:row.id,date:row.receivedAt,reference:row.reference||`PAY-${row.id}`,description:row.notes||"Payment received",amount:row.amount,status:"Received" as const})),
    ...invoices.map(row=>({kind:"INVOICE" as const,id:row.id,date:row.invoiceDate,reference:row.invoiceNumber,description:row.notes||`Invoice ${row.invoiceNumber}`,amount:row.grandTotal,status:(row.status.charAt(0)+row.status.slice(1).toLowerCase()) as "Final"|"Cancelled"|"Draft"})),
  ].sort((a,b)=>a.date.getTime()-b.date.getTime()||(a.kind===b.kind?a.id-b.id:a.kind==="PAYMENT"?-1:1));

  let runningBalance = openingBalance;
  const allRows: StatementRow[] = events.map(event=>{
    if (event.kind === "PAYMENT") runningBalance += event.amount;
    else if (event.status === "Final") runningBalance -= event.amount;
    return { key:`${event.kind}-${event.id}`,date:event.date,type:event.kind==="PAYMENT"?"Payment":"Invoice",reference:event.reference,status:event.status,description:event.description,debit:event.kind==="INVOICE"?event.amount:null,credit:event.kind==="PAYMENT"?event.amount:null,runningBalance };
  });
  const search = filters.search.toLocaleLowerCase();
  const rows = allRows.filter(row => {
    if (filters.type === "PAYMENTS" && row.type !== "Payment") return false;
    if (filters.type === "INVOICES" && row.type !== "Invoice") return false;
    if (filters.status !== "ALL" && row.type === "Invoice" && row.status.toUpperCase() !== filters.status) return false;
    if (search && !row.reference.toLocaleLowerCase().includes(search)) return false;
    return true;
  });
  const totalReceived = receipts.reduce((sum,row)=>sum+row.amount,0);
  const totalFinalInvoices = invoices.filter(row=>row.status==="FINAL").reduce((sum,row)=>sum+row.grandTotal,0);
  const totalCancelledInvoices = invoices.filter(row=>row.status==="CANCELLED").reduce((sum,row)=>sum+row.grandTotal,0);
  return { company, filters, rows, summary:{openingBalance,totalReceived,totalFinalInvoices,totalCancelledInvoices,closingBalance:openingBalance+totalReceived-totalFinalInvoices} };
}
