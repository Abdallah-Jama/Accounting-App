import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = { title: "Local Ledger", description: "Local-first company accounting" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Sidebar /><main className="min-h-screen px-4 pb-12 pt-20 sm:px-7 lg:ml-64 lg:px-10 lg:pt-10"><div className="mx-auto max-w-7xl">{children}</div></main></body></html>;
}
