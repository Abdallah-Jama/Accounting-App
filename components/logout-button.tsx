import { logoutAction } from "@/app/auth-actions";
import { LogOut } from "lucide-react";
export function LogoutButton(){return <form action={logoutAction}><button className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-soft transition hover:bg-slate-50 hover:text-slate-900"><LogOut size={15}/>Lock & logout</button></form>}
