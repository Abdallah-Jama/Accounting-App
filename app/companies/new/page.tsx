import { Card, PageHeader } from "@/components/ui";
import { CompanyForm } from "@/components/company-form";
export default function NewCompanyPage() { return <><PageHeader title="Add company" description="Create a company account for receipts and invoices." /><Card className="max-w-2xl p-6"><CompanyForm /></Card></>; }
