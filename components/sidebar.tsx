"use client";

import { BarChart3, Building2, FilePlus2, Files, LayoutDashboard, Menu, ReceiptText, ScrollText, Settings, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/received-money", label: "Received Money", icon: WalletCards },
  { href: "/invoices", label: "Invoices", icon: Files },
  { href: "/invoices/new", label: "Create Invoice", icon: FilePlus2 },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-40 rounded-xl border bg-white p-2.5 shadow-soft lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
    {open && <button className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu" />}
    <aside className={`no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-[#fbfcfa] p-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="mb-7 flex items-center justify-between px-2 pt-2">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-600 text-white"><ReceiptText size={21} /></span>
          <span><strong className="block text-base">Local Ledger</strong><small className="text-xs text-slate-500">Private accounting</small></span>
        </Link>
        <button className="p-2 lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      <nav className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || (href !== "/invoices" && pathname.startsWith(`${href}/`));
          return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><Icon size={18} />{label}</Link>;
        })}
      </nav>
      <div className="mt-auto rounded-2xl bg-slate-100 p-3 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Local-first</strong><br />Your accounting data stays in SQLite on this PC.</div>
    </aside>
  </>;
}
