"use client";
import { Printer } from "lucide-react";
import { secondaryButton } from "@/components/ui";
export function PrintButton(){return <button className={secondaryButton} onClick={()=>window.print()}><Printer size={16}/>Print / Save PDF</button>}
