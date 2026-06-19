import { db } from "@/lib/db";

export async function getCompanyBalances() {
  const companies = await db.company.findMany({
    include: {
      receipts: { select: { amount: true } },
      invoices: { where: { status: "FINAL" }, select: { grandTotal: true } },
    },
    orderBy: { name: "asc" },
  });

  return companies.map((company) => {
    const totalReceived = company.receipts.reduce((sum, row) => sum + row.amount, 0);
    const totalInvoiced = company.invoices.reduce((sum, row) => sum + row.grandTotal, 0);
    return { ...company, totalReceived, totalInvoiced, balance: totalReceived - totalInvoiced };
  });
}

export async function getCompanyBalance(companyId: number) {
  const [received, invoiced] = await Promise.all([
    db.moneyReceipt.aggregate({ where: { companyId }, _sum: { amount: true } }),
    db.invoice.aggregate({ where: { companyId, status: "FINAL" }, _sum: { grandTotal: true } }),
  ]);
  const totalReceived = received._sum.amount ?? 0;
  const totalInvoiced = invoiced._sum.grandTotal ?? 0;
  return { totalReceived, totalInvoiced, balance: totalReceived - totalInvoiced };
}
