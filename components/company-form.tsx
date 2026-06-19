import { createCompany, updateCompany } from "@/app/actions";
import { primaryButton, secondaryButton } from "@/components/ui";
import { Company } from "@prisma/client";
import Link from "next/link";

export function CompanyForm({ company }: { company?: Company }) {
  return <form action={company ? updateCompany : createCompany} className="space-y-5">
    {company && <input type="hidden" name="id" value={company.id} />}
    <div><label htmlFor="name">Company name</label><input id="name" name="name" required defaultValue={company?.name} autoFocus /></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="email">Email</label><input id="email" name="email" type="email" defaultValue={company?.email ?? ""} /></div><div><label htmlFor="phone">Phone</label><input id="phone" name="phone" defaultValue={company?.phone ?? ""} /></div></div>
    <div><label htmlFor="address">Address</label><textarea id="address" name="address" rows={3} defaultValue={company?.address ?? ""} /></div>
    <div><label htmlFor="notes">Notes</label><textarea id="notes" name="notes" rows={3} defaultValue={company?.notes ?? ""} /></div>
    <div className="flex gap-3 pt-2"><button className={primaryButton}>{company ? "Save changes" : "Create company"}</button><Link href={company ? `/companies/${company.id}` : "/companies"} className={secondaryButton}>Cancel</Link></div>
  </form>;
}
