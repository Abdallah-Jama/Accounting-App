import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";
import { requireSession } from "@/lib/auth";

export default async function ProtectedLayout({children}:{children:React.ReactNode}){await requireSession();return <><Sidebar/><div className="no-print fixed right-4 top-4 z-30 lg:right-8 lg:top-6"><LogoutButton/></div><main className="min-h-screen px-4 pb-12 pt-20 sm:px-7 lg:ml-64 lg:px-10 lg:pt-10"><div className="mx-auto max-w-7xl">{children}</div></main></>}
