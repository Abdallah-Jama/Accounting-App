import { InvoiceBuilder } from "@/components/invoice-builder";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, companies] = await Promise.all([
    db.invoice.findUnique({ where: { id: Number(id) }, include: { items: { orderBy: { sortOrder: "asc" } } } }),
    db.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/invoices/${invoice.id}`);
  return <><PageHeader title="Edit Draft Invoice" description={invoice.invoiceNumber} /><Card className="p-5 sm:p-7"><InvoiceBuilder companies={companies} suggestedNumber={invoice.invoiceNumber} today={invoice.invoiceDate.toISOString().slice(0,10)} initial={{...invoice, invoiceDate:invoice.invoiceDate.toISOString().slice(0,10), status:"DRAFT"}} /></Card></>;
}
