import { db } from "@/lib/db";

export type AnalyticsPreset="THIS_MONTH"|"LAST_MONTH"|"THIS_YEAR"|"CUSTOM";
export type AnalyticsFilters={preset:AnalyticsPreset;from:string;to:string;start:Date;end:Date;label:string};
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const dateText=(year:number,month:number,day:number)=>`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
const daysInMonth=(year:number,month:number)=>new Date(Date.UTC(year,month,0)).getUTCDate();

export function normalizeAnalyticsFilters(query:Record<string,string|string[]|undefined>,now=new Date()):AnalyticsFilters{
  const first=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;
  const raw=first(query.range)?.toUpperCase().replace(/-/g,"_");const preset:AnalyticsPreset=raw==="LAST_MONTH"||raw==="THIS_YEAR"||raw==="CUSTOM"?raw:"THIS_MONTH";
  const year=now.getUTCFullYear(),month=now.getUTCMonth()+1;let from:string,to:string;
  if(preset==="LAST_MONTH"){const d=new Date(Date.UTC(year,month-2,1));const y=d.getUTCFullYear(),m=d.getUTCMonth()+1;from=dateText(y,m,1);to=dateText(y,m,daysInMonth(y,m));}
  else if(preset==="THIS_YEAR"){from=dateText(year,1,1);to=dateText(year,12,31);}
  else if(preset==="CUSTOM"){const customFrom=first(query.from),customTo=first(query.to);from=customFrom&&datePattern.test(customFrom)?customFrom:dateText(year,month,1);to=customTo&&datePattern.test(customTo)?customTo:dateText(year,month,daysInMonth(year,month));if(from>to)[from,to]=[to,from];}
  else{from=dateText(year,month,1);to=dateText(year,month,daysInMonth(year,month));}
  const labels:Record<AnalyticsPreset,string>={THIS_MONTH:"This month",LAST_MONTH:"Last month",THIS_YEAR:"This year",CUSTOM:`${from} to ${to}`};
  return{preset,from,to,start:new Date(`${from}T00:00:00.000Z`),end:new Date(`${to}T23:59:59.999Z`),label:labels[preset]};
}

export function analyticsQueryString(filters:AnalyticsFilters){const query=new URLSearchParams({range:filters.preset.toLowerCase().replace(/_/g,"-")});if(filters.preset==="CUSTOM"){query.set("from",filters.from);query.set("to",filters.to)}return query.toString()}

export async function getBusinessAnalytics(filters:AnalyticsFilters){
  const period={gte:filters.start,lte:filters.end};
  const [companies,allReceipts,allFinalInvoices,periodReceipts,periodFinalInvoices,periodOtherInvoices,allInvoiceActivity]=await Promise.all([
    db.company.findMany({select:{id:true,name:true},orderBy:{name:"asc"}}),
    db.moneyReceipt.findMany({where:{receivedAt:{lte:filters.end}},select:{id:true,companyId:true,amount:true,receivedAt:true,company:{select:{name:true}}}}),
    db.invoice.findMany({where:{status:"FINAL",invoiceDate:{lte:filters.end}},select:{id:true,companyId:true,grandTotal:true,invoiceDate:true,company:{select:{name:true}}}}),
    db.moneyReceipt.findMany({where:{receivedAt:period},select:{id:true,companyId:true,amount:true,receivedAt:true,reference:true,company:{select:{name:true}}},orderBy:{receivedAt:"desc"}}),
    db.invoice.findMany({where:{status:"FINAL",invoiceDate:period},select:{id:true,companyId:true,invoiceNumber:true,invoiceDate:true,subtotal:true,commission:true,packing:true,transportation:true,grandTotal:true,company:{select:{name:true}},items:{select:{itemName:true,quantity:true,lineTotal:true}}},orderBy:{invoiceDate:"desc"}}),
    db.invoice.findMany({where:{status:{in:["DRAFT","CANCELLED"]},invoiceDate:period},select:{status:true,grandTotal:true}}),
    db.invoice.findMany({where:{invoiceDate:{lte:filters.end}},select:{companyId:true,invoiceDate:true}}),
  ]);
  const balances=new Map(companies.map(c=>[c.id,{...c,totalReceived:0,totalInvoiced:0,balance:0,lastActivity:null as Date|null}]));
  allReceipts.forEach(row=>{const c=balances.get(row.companyId);if(c){c.totalReceived+=row.amount;if(!c.lastActivity||row.receivedAt>c.lastActivity)c.lastActivity=row.receivedAt}});
  allFinalInvoices.forEach(row=>{const c=balances.get(row.companyId);if(c)c.totalInvoiced+=row.grandTotal});
  allInvoiceActivity.forEach(row=>{const c=balances.get(row.companyId);if(c&&(!c.lastActivity||row.invoiceDate>c.lastActivity))c.lastActivity=row.invoiceDate});
  balances.forEach(c=>c.balance=c.totalReceived-c.totalInvoiced);
  const companyBalances=[...balances.values()];
  const totalReceived=periodReceipts.reduce((s,r)=>s+r.amount,0),totalFinalInvoiced=periodFinalInvoices.reduce((s,r)=>s+r.grandTotal,0);
  const totalCommission=periodFinalInvoices.reduce((s,r)=>s+r.commission,0),totalPacking=periodFinalInvoices.reduce((s,r)=>s+r.packing,0),totalTransportation=periodFinalInvoices.reduce((s,r)=>s+r.transportation,0);
  const moneyInHand=companyBalances.reduce((s,c)=>s+c.balance,0),negativeCompanies=companyBalances.filter(c=>c.balance<0),zeroCompanies=companyBalances.filter(c=>c.balance===0),positiveCompanies=companyBalances.filter(c=>c.balance>0);
  const inactivityCutoff=new Date(filters.end.getTime()-30*86_400_000);const inactiveCompanies=companyBalances.filter(c=>!c.lastActivity||c.lastActivity<inactivityCutoff).sort((a,b)=>(a.lastActivity?.getTime()??0)-(b.lastActivity?.getTime()??0));
  const topItemsMap=new Map<string,{name:string;quantity:number;value:number}>();periodFinalInvoices.flatMap(i=>i.items).forEach(item=>{const key=item.itemName.trim().toLocaleLowerCase();const current=topItemsMap.get(key)??{name:item.itemName,quantity:0,value:0};current.quantity+=item.quantity;current.value+=item.lineTotal;topItemsMap.set(key,current)});const items=[...topItemsMap.values()];
  const sumByCompany=(rows:{companyId:number;company:{name:string};amount?:number;grandTotal?:number}[],field:"amount"|"grandTotal")=>{const map=new Map<number,{id:number;name:string;value:number}>();rows.forEach(row=>{const current=map.get(row.companyId)??{id:row.companyId,name:row.company.name,value:0};current.value+=row[field]??0;map.set(row.companyId,current)});return[...map.values()].sort((a,b)=>b.value-a.value)};
  const monthMap=new Map<string,{month:string;received:number;invoiced:number;commission:number;packing:number;transportation:number}>();const month=(date:Date)=>date.toISOString().slice(0,7);const ensure=(key:string)=>{const current=monthMap.get(key)??{month:key,received:0,invoiced:0,commission:0,packing:0,transportation:0};monthMap.set(key,current);return current};periodReceipts.forEach(r=>ensure(month(r.receivedAt)).received+=r.amount);periodFinalInvoices.forEach(i=>{const row=ensure(month(i.invoiceDate));row.invoiced+=i.grandTotal;row.commission+=i.commission;row.packing+=i.packing;row.transportation+=i.transportation});
  const recentActivity=[...periodReceipts.map(r=>({key:`P-${r.id}`,date:r.receivedAt,company:r.company.name,reference:r.reference||`PAY-${r.id}`,amount:r.amount,kind:"Received" as const,href:"/received-money"})),...periodFinalInvoices.map(i=>({key:`I-${i.id}`,date:i.invoiceDate,company:i.company.name,reference:i.invoiceNumber,amount:i.grandTotal,kind:"Final invoice" as const,href:`/invoices/${i.id}`}))].sort((a,b)=>b.date.getTime()-a.date.getTime()).slice(0,8);
  return{filters,metrics:{moneyInHand,totalReceived,totalFinalInvoiced,totalCommission,totalPacking,totalTransportation,companyCount:companies.length,negativeCount:negativeCompanies.length,zeroCount:zeroCompanies.length,positiveCount:positiveCompanies.length,draftCount:periodOtherInvoices.filter(i=>i.status==="DRAFT").length,cancelledCount:periodOtherInvoices.filter(i=>i.status==="CANCELLED").length,cancelledValue:periodOtherInvoices.filter(i=>i.status==="CANCELLED").reduce((s,i)=>s+i.grandTotal,0)},companyBalances,negativeCompanies:negativeCompanies.sort((a,b)=>a.balance-b.balance),highBalanceCompanies:positiveCompanies.sort((a,b)=>b.balance-a.balance).slice(0,10),inactiveCompanies,topItemsByQuantity:[...items].sort((a,b)=>b.quantity-a.quantity).slice(0,10),topItemsByValue:[...items].sort((a,b)=>b.value-a.value).slice(0,10),topCompaniesByInvoice:sumByCompany(periodFinalInvoices,"grandTotal").slice(0,10),topCompaniesByReceived:sumByCompany(periodReceipts,"amount").slice(0,10),monthly:[...monthMap.values()].sort((a,b)=>a.month.localeCompare(b.month)),recentActivity};
}
