import { buildStatementCsv } from "@/lib/statement-csv";
import { getCompanyStatement, normalizeStatementFilters } from "@/lib/statement";
import { getCurrentSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){if(!await getCurrentSession())return new Response("Authentication required",{status:401});const {id}=await params;const query=Object.fromEntries(new URL(request.url).searchParams);const statement=await getCompanyStatement(Number(id),normalizeStatementFilters(query));if(!statement)return new Response("Company not found",{status:404});const safe=statement.company.name.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"company";await writeAuditLog({action:"CSV_EXPORT_GENERATED",entityType:"CompanyStatement",entityReference:statement.company.name,details:{companyId:statement.company.id,rowCount:statement.rows.length,filters:statement.filters}});return new Response(buildStatementCsv(statement.rows),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${safe}-statement.csv"`,"Cache-Control":"no-store"}})}
