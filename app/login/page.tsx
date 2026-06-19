import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui";
import { getCurrentSession, isAuthenticationConfigured } from "@/lib/auth";
import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function LoginPage(){if(!await isAuthenticationConfigured())redirect("/setup");if(await getCurrentSession())redirect("/");return <main className="grid min-h-screen place-items-center px-4 py-10"><Card className="w-full max-w-md p-7 sm:p-9"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white"><LockKeyhole/></div><h1 className="mt-6 text-2xl font-semibold">Local Ledger is locked</h1><p className="mt-2 text-sm leading-6 text-slate-500">Enter your local password. Your credentials and accounting data never leave this PC.</p><AuthForm mode="login"/></Card></main>}
