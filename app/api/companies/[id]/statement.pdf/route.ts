import { db } from "@/lib/db";
import { getCompanyStatement, normalizeStatementFilters } from "@/lib/statement";
import { buildStatementPdf } from "@/lib/statement-pdf";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const query=Object.fromEntries(new URL(request.url).searchParams);const [statement,setting]=await Promise.all([getCompanyStatement(Number(id),normalizeStatementFilters(query)),db.appSetting.findUnique({where:{key:"businessName"}})]);if(!statement)return new Response("Company not found",{status:404});const bytes=await buildStatementPdf(statement,setting?.value||"Local Ledger");const safe=statement.company.name.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"company";return new Response(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${safe}-statement.pdf"`,"Cache-Control":"no-store"}})}
