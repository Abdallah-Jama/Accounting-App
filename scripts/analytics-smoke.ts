import { PrismaClient } from "@prisma/client";
import { getBusinessAnalytics, normalizeAnalyticsFilters } from "../lib/analytics";

const db=new PrismaClient(),prefix="__analytics_smoke__";
async function clean(){await db.invoice.deleteMany({where:{company:{name:{startsWith:prefix}}}});await db.company.deleteMany({where:{name:{startsWith:prefix}}})}
async function main(){await clean();const [a,b]=await Promise.all([db.company.create({data:{name:`${prefix}A`}}),db.company.create({data:{name:`${prefix}B`}})]);try{
  await db.moneyReceipt.createMany({data:[{companyId:a.id,amount:100_000,receivedAt:new Date("2026-03-02T12:00:00Z")},{companyId:b.id,amount:50_000,receivedAt:new Date("2026-03-03T12:00:00Z")} ]});
  await db.invoice.create({data:{companyId:a.id,invoiceNumber:`AN-FINAL-A-${Date.now()}`,invoiceDate:new Date("2026-03-05T12:00:00Z"),status:"FINAL",subtotal:22_000,commission:2_000,packing:3_000,transportation:3_000,grandTotal:30_000,items:{create:[{itemName:"Widget",quantity:2,unitPrice:11_000,lineTotal:22_000}]}}});
  await db.invoice.create({data:{companyId:b.id,invoiceNumber:`AN-FINAL-B-${Date.now()}`,invoiceDate:new Date("2026-03-06T12:00:00Z"),status:"FINAL",subtotal:9_000,commission:500,transportation:500,grandTotal:10_000,items:{create:[{itemName:"Gadget",quantity:3,unitPrice:3_000,lineTotal:9_000}]}}});
  await db.invoice.create({data:{companyId:a.id,invoiceNumber:`AN-DRAFT-${Date.now()}`,invoiceDate:new Date("2026-03-07T12:00:00Z"),status:"DRAFT",subtotal:80_000,commission:10_000,grandTotal:90_000,items:{create:{itemName:"Draft item",quantity:99,unitPrice:808,lineTotal:80_000}}}});
  await db.invoice.create({data:{companyId:a.id,invoiceNumber:`AN-CANCEL-${Date.now()}`,invoiceDate:new Date("2026-03-08T12:00:00Z"),status:"CANCELLED",subtotal:70_000,commission:10_000,grandTotal:80_000,items:{create:{itemName:"Cancelled item",quantity:88,unitPrice:795,lineTotal:70_000}}}});
  const filters=normalizeAnalyticsFilters({range:"custom",from:"2026-03-01",to:"2026-03-31"},new Date("2026-03-15T00:00:00Z"));const data=await getBusinessAnalytics(filters);const m=data.metrics;
  if(m.totalReceived!==150_000||m.totalFinalInvoiced!==40_000||m.moneyInHand!==110_000)throw new Error(`Official totals incorrect: ${JSON.stringify(m)}`);
  if(m.totalCommission!==2_500||m.totalPacking!==3_000||m.totalTransportation!==3_500)throw new Error("Final invoice charge totals incorrect");
  console.log("PASS analytics official received, invoiced, balance, and charge totals");
  if(m.draftCount!==1||m.cancelledCount!==1||m.cancelledValue!==80_000)throw new Error("Operational status counts incorrect");
  if(data.topItemsByQuantity.some(i=>i.name.includes("Draft")||i.name.includes("Cancelled")))throw new Error("Non-Final items leaked into analytics");
  if(data.topCompaniesByInvoice.reduce((s,r)=>s+r.value,0)!==40_000)throw new Error("Non-Final invoices leaked into company rankings");
  console.log("PASS Draft and Cancelled invoices excluded from official analytics");
  if(data.monthly.length!==1||data.monthly[0].received!==150_000||data.monthly[0].invoiced!==40_000)throw new Error("Monthly analytics incorrect");
  if(data.topItemsByQuantity[0]?.name!=="Gadget"||data.topItemsByQuantity[0]?.quantity!==3)throw new Error("Top item quantity ranking incorrect");
  console.log("PASS monthly, item, and company analytics rankings");
}finally{await clean()}}
main().finally(()=>db.$disconnect());
