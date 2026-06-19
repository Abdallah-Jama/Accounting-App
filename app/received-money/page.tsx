import { createReceipt, deleteReceipt } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, EmptyState, PageHeader, dangerButton, primaryButton } from "@/components/ui";
import { db } from "@/lib/db";
import { dateInputValue, formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export default async function ReceivedMoneyPage({ searchParams }: { searchParams:Promise<{company?:string}> }) {
  const query=await searchParams;
  const [companies, receipts]=await Promise.all([db.company.findMany({orderBy:{name:"asc"}}),db.moneyReceipt.findMany({include:{company:true},orderBy:[{receivedAt:"desc"},{id:"desc"}]})]);
  return <><PageHeader title="Received Money" description="Register funds received from each company. Every receipt increases money in hand." />
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]"><Card className="h-fit p-5"><h2 className="mb-5 font-semibold">Add receipt</h2>{companies.length?<form action={createReceipt} className="space-y-4"><div><label>Company</label><select name="companyId" required defaultValue={query.company||""}><option value="" disabled>Select company</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label>Amount (AED)</label><input name="amount" inputMode="decimal" placeholder="0.00" pattern="\d+(\.\d{1,2})?" required /></div><div><label>Date received</label><input name="receivedAt" type="date" defaultValue={dateInputValue()} required /></div><div><label>Reference</label><input name="reference" placeholder="Bank transfer, cheque…" /></div><div><label>Notes</label><textarea name="notes" rows={2}/></div><button className={`${primaryButton} w-full`}>Save receipt</button></form>:<p className="text-sm text-slate-500">Add a company before recording money.</p>}</Card>
    <Card><div className="border-b px-5 py-4"><h2 className="font-semibold">Receipt register</h2></div>{receipts.length?<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Company</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3 text-right">Amount</th><th></th></tr></thead><tbody className="divide-y">{receipts.map(r=><tr key={r.id}><td className="px-5 py-4 whitespace-nowrap">{formatDate(r.receivedAt)}</td><td className="px-5 py-4 font-medium">{r.company.name}</td><td className="px-5 py-4 text-slate-500">{r.reference||r.notes||"—"}</td><td className="px-5 py-4 text-right font-semibold text-brand-700">{formatMoney(r.amount)}</td><td className="px-3"><form action={deleteReceipt}><input type="hidden" name="id" value={r.id}/><ConfirmButton className={dangerButton} message="Delete this receipt?">Delete</ConfirmButton></form></td></tr>)}</tbody></table></div>:<EmptyState>No receipts recorded yet.</EmptyState>}</Card></div>
  </>;
}
