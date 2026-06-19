import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildStatementCsv } from "../lib/statement-csv";
import { buildStatementPdf } from "../lib/statement-pdf";
import { getCompanyStatement, normalizeStatementFilters } from "../lib/statement";

const db=new PrismaClient();const name="__statement_smoke__";
async function clean(){await db.invoice.deleteMany({where:{company:{name}}});await db.company.deleteMany({where:{name}})}
const keepData=process.argv.includes("--keep-data"),keepPdf=process.argv.includes("--keep-pdf");
async function main(){await clean();const company=await db.company.create({data:{name,email:"statement@example.test",phone:"000-000",address:"Test address, Dubai"}});console.log(`FIXTURE_COMPANY_ID=${company.id}`);try{
  await db.moneyReceipt.create({data:{companyId:company.id,amount:100_000,receivedAt:new Date("2026-02-01T12:00:00Z"),reference:"PAY-TEST"}});
  await db.invoice.create({data:{companyId:company.id,invoiceNumber:`ST-FINAL-${Date.now()}`,invoiceDate:new Date("2026-02-02T12:00:00Z"),status:"FINAL",subtotal:30_000,grandTotal:30_000,items:{create:{itemName:"Final",quantity:1,unitPrice:30_000,lineTotal:30_000}}}});
  await db.invoice.create({data:{companyId:company.id,invoiceNumber:`ST-CANCEL-${Date.now()}`,invoiceDate:new Date("2026-02-03T12:00:00Z"),status:"CANCELLED",subtotal:50_000,grandTotal:50_000,items:{create:{itemName:"Cancelled",quantity:1,unitPrice:50_000,lineTotal:50_000}}}});
  await db.invoice.create({data:{companyId:company.id,invoiceNumber:`ST-DRAFT-${Date.now()}`,invoiceDate:new Date("2026-02-04T12:00:00Z"),status:"DRAFT",subtotal:20_000,grandTotal:20_000,items:{create:{itemName:"Draft",quantity:1,unitPrice:20_000,lineTotal:20_000}}}});
  const official=await getCompanyStatement(company.id,normalizeStatementFilters({}));if(!official)throw new Error("Statement missing");
  const balances=official.rows.map(row=>row.runningBalance);if(balances.join(",")!=="100000,70000,70000")throw new Error(`Running balances incorrect: ${balances}`);console.log("PASS statement running balance uses payment and Final invoice");
  const cancelled=official.rows.find(row=>row.status==="Cancelled");if(!cancelled||cancelled.runningBalance!==70_000)throw new Error("Cancelled invoice missing or changed balance");console.log("PASS cancelled invoice appears without affecting running balance");
  if(official.rows.some(row=>row.status==="Draft"))throw new Error("Draft appeared in official statement");console.log("PASS draft invoice excluded from official statement");
  const withDrafts=await getCompanyStatement(company.id,normalizeStatementFilters({showDrafts:"1"}));if(!withDrafts?.rows.some(row=>row.status==="Draft"))throw new Error("Draft toggle failed");
  const csv=buildStatementCsv(official.rows);if(!csv.includes("running_balance_minor")||!csv.includes("PAY-TEST"))throw new Error("Statement CSV invalid");console.log("PASS statement CSV returns valid content");
  const pdf=await buildStatementPdf(official,"Statement Smoke Business");const header=Buffer.from(pdf.slice(0,5)).toString();if(header!=="%PDF-"||pdf.length<1500)throw new Error("Statement PDF invalid");console.log("PASS statement PDF generation works");if(keepPdf){const directory=path.resolve("tmp/pdfs");await mkdir(directory,{recursive:true});await writeFile(path.join(directory,"company-statement-sample.pdf"),pdf);console.log(`PDF_FIXTURE=${path.join(directory,"company-statement-sample.pdf")}`)}
}finally{if(!keepData)await clean()}}
main().finally(()=>db.$disconnect());
