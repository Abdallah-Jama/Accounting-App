import { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>{description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}</div>{action}</div>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`rounded-2xl border bg-white shadow-soft ${className}`}>{children}</section>; }
export function EmptyState({ children }: { children: ReactNode }) { return <div className="px-6 py-14 text-center text-sm text-slate-500">{children}</div>; }
export const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50";
export const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
export const dangerButton = "inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50";
export function InvoiceStatusBadge({ status }: { status: "DRAFT" | "FINAL" | "CANCELLED" }) {
  const style = status === "FINAL" ? "bg-brand-50 text-brand-700" : status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{status.charAt(0)+status.slice(1).toLowerCase()}</span>;
}
