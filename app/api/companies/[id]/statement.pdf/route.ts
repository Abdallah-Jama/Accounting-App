import { db } from "@/lib/db";
import { getCompanyStatement, normalizeStatementFilters } from "@/lib/statement";
import { buildStatementPdf } from "@/lib/statement-pdf";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){if(!await getCurrentSession())return new Response("Authentication required",{status:401});const {id}=await params;const query=Object.fromEntries(new URL(request.url).searchParams);const [statement,setting]=await Promise.all([getCompanyStatement(Number(id),normalizeStatementFilters(query)),db.appSetting.findUnique({where:{key:"businessName"}})]);if(!statement)return new Response("Company not found",{status:404});const bytes=await buildStatementPdf(statement,setting?.value||"Local Ledger");const safe=statement.company.name.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"company";await writeAuditLog({action:"STATEMENT_PDF_GENERATED",entityType:"CompanyStatement",entityReference:statement.company.name,details:{companyId:statement.company.id,rowCount:statement.rows.length,filters:statement.filters}});return new Response(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${safe}-statement.pdf"`,"Cache-Control":"no-store"}})}
