import { cancelInvoice, deleteInvoice, finalizeInvoice } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { PrintButton } from "@/components/print-button";
import { Card, InvoiceStatusBadge, PageHeader, dangerButton, primaryButton, secondaryButton } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Edit3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({ where:{id:Number(id)}, include:{company:true,items:{orderBy:{sortOrder:"asc"}}} });
  if (!invoice) notFound();
  return <>
    <PageHeader title="Invoice" description={invoice.invoiceNumber} action={<div className="no-print flex flex-wrap gap-2">{invoice.status === "DRAFT" && <Link href={`/invoices/${invoice.id}/edit`} className={secondaryButton}><Edit3 size={16}/>Edit draft</Link>}<PrintButton/></div>} />
    {invoice.status === "CANCELLED" && <div className="mx-auto mb-5 max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"><strong>Cancelled invoice.</strong> It remains in history and is excluded from company balance calculations.</div>}
    <Card className={`relative mx-auto max-w-4xl overflow-hidden ${invoice.status === "CANCELLED" ? "border-red-200" : ""}`}>
      {invoice.status === "CANCELLED" && <div className="pointer-events-none absolute right-8 top-28 rotate-[-12deg] border-4 border-red-200 px-5 py-2 text-3xl font-bold tracking-widest text-red-200">CANCELLED</div>}
      <div className="border-b p-7 sm:p-10"><div className="flex flex-col justify-between gap-6 sm:flex-row"><div><div className="flex items-center gap-3"><div className="text-2xl font-semibold">INVOICE</div><InvoiceStatusBadge status={invoice.status}/></div><div className="mt-2 text-sm text-slate-500">{invoice.invoiceNumber}</div></div><div className="text-sm sm:text-right"><div className="text-slate-500">Invoice date</div><div className="mt-1 font-medium">{formatDate(invoice.invoiceDate)}</div></div></div><div className="mt-10"><div className="text-xs uppercase tracking-wider text-slate-400">Bill to</div><div className="mt-2 text-lg font-semibold">{invoice.company.name}</div>{invoice.company.address&&<div className="mt-1 whitespace-pre-line text-sm text-slate-500">{invoice.company.address}</div>}</div></div>
      <div className="overflow-x-auto p-7 sm:p-10"><table className="w-full min-w-[560px] text-sm"><thead className="border-b text-left text-xs uppercase text-slate-500"><tr><th className="pb-3">Item</th><th className="pb-3 text-right">Qty</th><th className="pb-3 text-right">Price</th><th className="pb-3 text-right">Line total</th></tr></thead><tbody className="divide-y">{invoice.items.map(item=><tr key={item.id}><td className="py-4 font-medium">{item.itemName}</td><td className="py-4 text-right">{item.quantity}</td><td className="py-4 text-right">{formatMoney(item.unitPrice)}</td><td className="py-4 text-right font-medium">{formatMoney(item.lineTotal)}</td></tr>)}</tbody></table><div className="ml-auto mt-8 w-full max-w-sm space-y-3 text-sm"><Line label="Subtotal" value={invoice.subtotal}/><Line label="Commission" value={invoice.commission}/><Line label="Packing" value={invoice.packing}/><Line label="Transportation" value={invoice.transportation}/><div className="flex justify-between border-t pt-4 text-lg font-semibold"><span>Grand Total</span><span>{formatMoney(invoice.grandTotal)}</span></div></div>{invoice.notes&&<div className="mt-10 border-t pt-5 text-sm text-slate-500"><strong className="text-slate-700">Notes</strong><p className="mt-2 whitespace-pre-line">{invoice.notes}</p></div>}</div>
    </Card>
    <div className="no-print mx-auto mt-5 flex max-w-4xl flex-wrap gap-3">
      {invoice.status === "DRAFT" && <><form action={finalizeInvoice}><input type="hidden" name="id" value={invoice.id}/><ConfirmButton className={primaryButton} message="Finalize this invoice? Final invoices cannot be edited.">Finalize invoice</ConfirmButton></form><form action={deleteInvoice}><input type="hidden" name="id" value={invoice.id}/><ConfirmButton className={dangerButton} message="Delete this draft invoice?">Delete draft</ConfirmButton></form></>}
      {invoice.status !== "CANCELLED" && <form action={cancelInvoice}><input type="hidden" name="id" value={invoice.id}/><ConfirmButton className={dangerButton} message={invoice.status==="FINAL"?"Cancel this Final invoice? It will remain in history, be clearly marked Cancelled, and stop affecting official balances.":"Cancel this Draft invoice? It will remain in history and cannot be edited afterward."}>Cancel invoice</ConfirmButton></form>}
    </div>
  </>;
}
function Line({label,value}:{label:string;value:number}){return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span>{formatMoney(value)}</span></div>}
