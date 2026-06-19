import { deleteCompany } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, EmptyState, InvoiceStatusBadge, PageHeader, dangerButton, primaryButton, secondaryButton } from "@/components/ui";
import { getCompanyBalance } from "@/lib/accounting";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Edit3, FilePlus2, WalletCards } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function CompanyDetail({ params }: { params:Promise<{id:string}> }) {
  const { id: rawId } = await params; const id=Number(rawId);
  const [company, balance] = await Promise.all([db.company.findUnique({ where:{id}, include:{ receipts:{orderBy:{receivedAt:"desc"}}, invoices:{orderBy:{invoiceDate:"desc"}} } }), getCompanyBalance(id)]);
  if (!company) notFound();
  return <><PageHeader title={company.name} description={[company.email,company.phone].filter(Boolean).join(" · ") || "Company account"} action={<div className="flex flex-wrap gap-2"><Link href={`/received-money?company=${id}`} className={secondaryButton}><WalletCards size={16}/>Add receipt</Link><Link href={`/invoices/new?company=${id}`} className={primaryButton}><FilePlus2 size={16}/>New invoice</Link><Link href={`/companies/${id}/edit`} className={secondaryButton}><Edit3 size={16}/>Edit</Link></div>} />
    <div className="grid gap-4 sm:grid-cols-3"><Summary label="Total received" value={formatMoney(balance.totalReceived)} /><Summary label="Total invoiced" value={formatMoney(balance.totalInvoiced)} /><Summary label="Money in hand" value={formatMoney(balance.balance)} accent={balance.balance<0?"red":"green"} /></div>
    <div className="mt-7 grid gap-6 xl:grid-cols-2"><Card><div className="border-b px-5 py-4 font-semibold">Received money</div>{company.receipts.length?<div className="divide-y">{company.receipts.map(r=><div key={r.id} className="flex justify-between px-5 py-4"><div><div className="text-sm font-medium">{formatDate(r.receivedAt)}</div><div className="text-xs text-slate-500">{r.reference || r.notes || "Receipt"}</div></div><span className="font-semibold text-brand-700">+{formatMoney(r.amount)}</span></div>)}</div>:<EmptyState>No money received yet.</EmptyState>}</Card>
    <Card><div className="border-b px-5 py-4 font-semibold">Invoices</div>{company.invoices.length?<div className="divide-y">{company.invoices.map(i=><Link href={`/invoices/${i.id}`} key={i.id} className={`flex justify-between px-5 py-4 hover:bg-slate-50 ${i.status==="CANCELLED"?"bg-red-50/40 text-slate-500":""}`}><div><div className="flex items-center gap-2 text-sm font-medium">{i.invoiceNumber}<InvoiceStatusBadge status={i.status}/></div><div className="text-xs text-slate-500">{formatDate(i.invoiceDate)}</div></div><span className={`font-semibold ${i.status==="CANCELLED"?"line-through":""}`}>{formatMoney(i.grandTotal)}</span></Link>)}</div>:<EmptyState>No invoices yet.</EmptyState>}</Card></div>
    {(company.address||company.notes)&&<Card className="mt-6 p-5 text-sm text-slate-600">{company.address&&<p className="whitespace-pre-line"><strong className="text-slate-800">Address:</strong><br/>{company.address}</p>}{company.notes&&<p className="mt-4 whitespace-pre-line"><strong className="text-slate-800">Notes:</strong><br/>{company.notes}</p>}</Card>}
    <form action={deleteCompany} className="mt-6"><input type="hidden" name="id" value={id}/><ConfirmButton className={dangerButton} message="Delete this company? This also deletes its received-money entries. Companies with invoices cannot be deleted.">Delete company</ConfirmButton></form>
  </>;
}
function Summary({label,value,accent}:{label:string;value:string;accent?:"green"|"red"}) { return <Card className="p-5"><div className="text-sm text-slate-500">{label}</div><div className={`mt-2 text-2xl font-semibold ${accent==="green"?"text-brand-700":accent==="red"?"text-red-600":""}`}>{value}</div></Card>; }
