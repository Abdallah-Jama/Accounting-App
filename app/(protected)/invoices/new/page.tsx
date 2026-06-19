import { InvoiceBuilder } from "@/components/invoice-builder";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { dateInputValue } from "@/lib/dates";
export const dynamic="force-dynamic";
export default async function NewInvoicePage({searchParams}:{searchParams:Promise<{company?:string}>}) { const [companies,lastInvoice,query]=await Promise.all([db.company.findMany({select:{id:true,name:true},orderBy:{name:"asc"}}),db.invoice.findFirst({select:{id:true},orderBy:{id:"desc"}}),searchParams]); const suggested=`INV-${new Date().getFullYear()}-${String((lastInvoice?.id??0)+1).padStart(4,"0")}`; return <><PageHeader title="Create Invoice" description="Add items and charges. Saving the grand total reduces the company money in hand." />{companies.length?<Card className="p-5 sm:p-7"><InvoiceBuilder companies={companies} defaultCompany={query.company} suggestedNumber={suggested} today={dateInputValue()} /></Card>:<Card className="p-8 text-center text-sm text-slate-500">Add a company before creating an invoice.</Card>}</>; }
