"use client";

import { createInvoice, updateInvoice } from "@/app/actions";
import { primaryButton, secondaryButton } from "@/components/ui";
import { formatMoney, minorToInput } from "@/lib/money";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Row = { itemName:string; quantity:string; unitPrice:string };
type CompanyOption = { id:number; name:string };
type InitialInvoice = { id:number; invoiceNumber:string; companyId:number; invoiceDate:string; commission:number; packing:number; transportation:number; notes:string|null; status:"DRAFT"|"FINAL"; items:{itemName:string;quantity:number;unitPrice:number}[] };
const toMinor = (value:string) => { const match=value.trim().match(/^(\d+)(?:\.(\d{0,2}))?$/); return match ? Number(match[1])*100+Number((match[2]||"").padEnd(2,"0")) : 0; };

export function InvoiceBuilder({ companies, defaultCompany, suggestedNumber, today, initial }: { companies:CompanyOption[]; defaultCompany?:string; suggestedNumber:string; today:string; initial?:InitialInvoice }) {
  const [rows,setRows]=useState<Row[]>(initial?.items.map(item=>({itemName:item.itemName,quantity:String(item.quantity),unitPrice:minorToInput(item.unitPrice)})) ?? [{itemName:"",quantity:"1",unitPrice:""}]);
  const [fees,setFees]=useState({commission:minorToInput(initial?.commission??0),packing:minorToInput(initial?.packing??0),transportation:minorToInput(initial?.transportation??0)});
  const computed=useMemo(()=>{
    const items=rows.map(r=>({itemName:r.itemName.trim(),quantity:Number(r.quantity),unitPrice:toMinor(r.unitPrice)}));
    const subtotal=items.reduce((s,r)=>s+(Number.isInteger(r.quantity)?r.quantity*r.unitPrice:0),0);
    const commission=toMinor(fees.commission),packing=toMinor(fees.packing),transportation=toMinor(fees.transportation);
    return {items,subtotal,commission,packing,transportation,grandTotal:subtotal+commission+packing+transportation};
  },[rows,fees]);
  const updateRow=(index:number,key:keyof Row,value:string)=>setRows(current=>current.map((row,i)=>i===index?{...row,[key]:value}:row));
  return <form action={initial ? updateInvoice : createInvoice} className="space-y-6">
    {initial && <input type="hidden" name="id" value={initial.id} />}
    <input type="hidden" name="items" value={JSON.stringify(computed.items)} />
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><div><label>Invoice number</label><input name="invoiceNumber" defaultValue={initial?.invoiceNumber??suggestedNumber} required /></div><div><label>Company</label><select name="companyId" defaultValue={String(initial?.companyId??defaultCompany??"")} required><option value="" disabled>Select company</option>{companies.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></div><div><label>Invoice date</label><input type="date" name="invoiceDate" defaultValue={initial?.invoiceDate??today} required /></div><div><label>Status</label><select name="status" defaultValue={initial?.status??"DRAFT"}><option value="DRAFT">Draft</option><option value="FINAL">Final</option></select></div></div>
    <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Item</th><th className="w-28 px-4 py-3">Qty</th><th className="w-40 px-4 py-3">Price</th><th className="w-40 px-4 py-3 text-right">Line total</th><th className="w-14"></th></tr></thead><tbody className="divide-y">{rows.map((row,index)=><tr key={index}><td className="p-3"><input aria-label={`Item ${index+1} name`} value={row.itemName} onChange={e=>updateRow(index,"itemName",e.target.value)} required placeholder="Item name" /></td><td className="p-3"><input aria-label={`Item ${index+1} quantity`} type="number" min="1" step="1" value={row.quantity} onChange={e=>updateRow(index,"quantity",e.target.value)} required /></td><td className="p-3"><input aria-label={`Item ${index+1} price`} inputMode="decimal" pattern="\d+(\.\d{1,2})?" value={row.unitPrice} onChange={e=>updateRow(index,"unitPrice",e.target.value)} required placeholder="0.00" /></td><td className="p-3 text-right font-medium">{formatMoney((Number.isInteger(Number(row.quantity))?Number(row.quantity):0)*toMinor(row.unitPrice))}</td><td className="p-3"><button type="button" aria-label="Remove item" disabled={rows.length===1} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" onClick={()=>setRows(current=>current.filter((_,i)=>i!==index))}><Minus size={17}/></button></td></tr>)}</tbody></table><button type="button" className="m-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50" onClick={()=>setRows(current=>[...current,{itemName:"",quantity:"1",unitPrice:""}])}><Plus size={16}/>Add item</button></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]"><div><label>Notes</label><textarea name="notes" rows={4} placeholder="Optional invoice notes" defaultValue={initial?.notes??""} /></div><div className="rounded-2xl bg-slate-50 p-5"><Total label="Subtotal" value={formatMoney(computed.subtotal)} /><Fee label="Commission" name="commission" value={fees.commission} setValue={v=>setFees({...fees,commission:v})}/><Fee label="Packing" name="packing" value={fees.packing} setValue={v=>setFees({...fees,packing:v})}/><Fee label="Transportation" name="transportation" value={fees.transportation} setValue={v=>setFees({...fees,transportation:v})}/><div className="mt-3 flex items-center justify-between border-t pt-4 text-lg font-semibold"><span>Grand Total</span><span>{formatMoney(computed.grandTotal)}</span></div></div></div>
    <div className="flex gap-3"><button className={primaryButton}>{initial?"Save invoice":"Create invoice"}</button><Link href={initial?`/invoices/${initial.id}`:"/invoices"} className={secondaryButton}>Cancel</Link></div>
  </form>;
}
function Total({label,value}:{label:string;value:string}) { return <div className="mb-3 flex items-center justify-between text-sm"><span className="text-slate-600">{label}</span><span className="font-medium">{value}</span></div>; }
function Fee({label,name,value,setValue}:{label:string;name:string;value:string;setValue:(v:string)=>void}) { return <div className="mb-3 grid grid-cols-[1fr_150px] items-center gap-4"><label className="mb-0 text-slate-600">{label}</label><input aria-label={label} name={name} value={value} onChange={e=>setValue(e.target.value)} inputMode="decimal" pattern="\d+(\.\d{1,2})?" required className="text-right" /></div>; }
