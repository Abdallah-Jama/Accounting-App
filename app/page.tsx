import { ArrowDownLeft, ArrowUpRight, Building2, Plus } from "lucide-react";
import Link from "next/link";
import { getCompanyBalances } from "@/lib/accounting";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Card, EmptyState, PageHeader, primaryButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [companies, recentReceipts, recentInvoices] = await Promise.all([
    getCompanyBalances(),
    db.moneyReceipt.findMany({ include: { company: true }, orderBy: { receivedAt: "desc" }, take: 5 }),
    db.invoice.findMany({ where: { status: { not: "CANCELLED" } }, include: { company: true }, orderBy: { invoiceDate: "desc" }, take: 5 }),
  ]);
  const received = companies.reduce((s, c) => s + c.totalReceived, 0);
  const invoiced = companies.reduce((s, c) => s + c.totalInvoiced, 0);
  const balance = received - invoiced;
  return <>
    <PageHeader title="Dashboard" description="A clear view of money received, invoiced, and still in hand." action={<Link className={primaryButton} href="/invoices/new"><Plus size={17} />New invoice</Link>} />
    <div className="grid gap-4 md:grid-cols-3">
      <Metric label="Total received" value={formatMoney(received)} icon={<ArrowDownLeft />} tone="green" />
      <Metric label="Total invoiced" value={formatMoney(invoiced)} icon={<ArrowUpRight />} tone="slate" />
      <Metric label="Money in hand" value={formatMoney(balance)} icon={<Building2 />} tone={balance < 0 ? "red" : "green"} />
    </div>
    <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <Card><div className="border-b px-5 py-4"><h2 className="font-semibold">Company balances</h2></div>{companies.length ? <div className="divide-y">{companies.map(c => <Link href={`/companies/${c.id}`} key={c.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"><div><div className="font-medium">{c.name}</div><div className="mt-1 text-xs text-slate-500">Received {formatMoney(c.totalReceived)} · Invoiced {formatMoney(c.totalInvoiced)}</div></div><span className={`font-semibold ${c.balance < 0 ? "text-red-600" : "text-brand-700"}`}>{formatMoney(c.balance)}</span></Link>)}</div> : <EmptyState>Add a company to begin tracking its balance.</EmptyState>}</Card>
      <Card><div className="border-b px-5 py-4"><h2 className="font-semibold">Recent activity</h2></div><div className="divide-y">{[...recentReceipts.map(r => ({ id:`r${r.id}`, date:r.receivedAt, name:r.company.name, type:"Received", amount:r.amount, href:"/received-money", positive:true })), ...recentInvoices.map(i => ({ id:`i${i.id}`, date:i.invoiceDate, name:i.company.name, type:i.invoiceNumber, amount:i.grandTotal, href:`/invoices/${i.id}`, positive:false }))].sort((a,b)=>b.date.getTime()-a.date.getTime()).slice(0,7).map(row => <Link href={row.href} key={row.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50"><div><div className="text-sm font-medium">{row.name}</div><div className="text-xs text-slate-500">{row.type} · {formatDate(row.date)}</div></div><span className={`text-sm font-semibold ${row.positive ? "text-brand-700" : "text-slate-700"}`}>{row.positive ? "+" : "−"}{formatMoney(row.amount)}</span></Link>)}</div>{!recentReceipts.length && !recentInvoices.length && <EmptyState>No activity yet.</EmptyState>}</Card>
    </div>
  </>;
}

function Metric({ label, value, icon, tone }: { label:string; value:string; icon:React.ReactNode; tone:"green"|"slate"|"red" }) {
  const colors = tone === "green" ? "bg-brand-50 text-brand-700" : tone === "red" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600";
  return <Card className="p-5"><div className={`mb-5 grid h-10 w-10 place-items-center rounded-xl ${colors}`}>{icon}</div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p></Card>;
}
