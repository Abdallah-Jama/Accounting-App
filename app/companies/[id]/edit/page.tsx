import { CompanyForm } from "@/components/company-form";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
export default async function EditCompanyPage({ params }: { params: Promise<{id:string}> }) { const {id}=await params; const company=await db.company.findUnique({where:{id:Number(id)}}); if(!company) notFound(); return <><PageHeader title="Edit company" description={company.name} /><Card className="max-w-2xl p-6"><CompanyForm company={company} /></Card></>; }
