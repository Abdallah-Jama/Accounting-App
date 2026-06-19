import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui";
import { getCurrentSession, isAuthenticationConfigured } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function SetupPage(){if(await isAuthenticationConfigured())redirect((await getCurrentSession())?"/":"/login");return <main className="grid min-h-screen place-items-center px-4 py-10"><Card className="w-full max-w-md p-7 sm:p-9"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white"><ShieldCheck/></div><h1 className="mt-6 text-2xl font-semibold">Secure your local ledger</h1><p className="mt-2 text-sm leading-6 text-slate-500">Create the password required to open this app. It is stored only as a one-way scrypt hash in your local SQLite database.</p><div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">There is no cloud password recovery. Keep this password somewhere secure.</div><AuthForm mode="setup"/></Card></main>}
