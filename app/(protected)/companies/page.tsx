import { Plus } from "lucide-react";
import Link from "next/link";
import { getCompanyBalances } from "@/lib/accounting";
import { formatMoney } from "@/lib/money";
import { Card, EmptyState, PageHeader, primaryButton } from "@/components/ui";

export const dynamic = "force-dynamic";
export default async function CompaniesPage() {
  const companies = await getCompanyBalances();
  return <><PageHeader title="Companies" description="Manage companies and review their current money in hand." action={<Link href="/companies/new" className={primaryButton}><Plus size={17} />Add company</Link>} /><Card>{companies.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Company</th><th className="px-5 py-3">Received</th><th className="px-5 py-3">Invoiced</th><th className="px-5 py-3 text-right">Money in hand</th></tr></thead><tbody className="divide-y">{companies.map(c => <tr key={c.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/companies/${c.id}`} className="font-semibold hover:text-brand-700">{c.name}</Link><div className="mt-1 text-xs text-slate-500">{c.email || c.phone || "No contact details"}</div></td><td className="px-5 py-4">{formatMoney(c.totalReceived)}</td><td className="px-5 py-4">{formatMoney(c.totalInvoiced)}</td><td className={`px-5 py-4 text-right font-semibold ${c.balance < 0 ? "text-red-600" : "text-brand-700"}`}>{formatMoney(c.balance)}</td></tr>)}</tbody></table></div> : <EmptyState>No companies yet. Add the first company to get started.</EmptyState>}</Card></>;
}
