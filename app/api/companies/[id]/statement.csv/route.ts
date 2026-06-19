import { buildStatementCsv } from "@/lib/statement-csv";
import { getCompanyStatement, normalizeStatementFilters } from "@/lib/statement";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const query=Object.fromEntries(new URL(request.url).searchParams);const statement=await getCompanyStatement(Number(id),normalizeStatementFilters(query));if(!statement)return new Response("Company not found",{status:404});const safe=statement.company.name.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"company";return new Response(buildStatementCsv(statement.rows),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${safe}-statement.csv"`,"Cache-Control":"no-store"}})}
