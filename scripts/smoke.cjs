const { existsSync, statSync } = require("node:fs");
const { PrismaClient } = require("@prisma/client");
const { createDatabaseBackup } = require("../lib/backup.cjs");

const db = new PrismaClient();
const smokeName = "__smoke_test__";

async function activeBalance(companyId) {
  const [received, invoiced] = await Promise.all([
    db.moneyReceipt.aggregate({ where: { companyId }, _sum: { amount: true } }),
    db.invoice.aggregate({ where: { companyId, status: { not: "CANCELLED" } }, _sum: { grandTotal: true } }),
  ]);
  return (received._sum.amount ?? 0) - (invoiced._sum.grandTotal ?? 0);
}

async function clean() {
  await db.invoice.deleteMany({ where: { company: { name: smokeName } } });
  await db.company.deleteMany({ where: { name: smokeName } });
}

async function main() {
  await clean();
  const company = await db.company.create({ data: { name: smokeName } });
  try {
    await db.moneyReceipt.create({ data: { companyId: company.id, amount: 100_000, receivedAt: new Date("2026-01-01T12:00:00Z") } });
    if (await activeBalance(company.id) !== 100_000) throw new Error("Received money did not increase balance.");
    console.log("PASS received money increases balance");

    await db.invoice.create({ data: { invoiceNumber:`__FINAL__${Date.now()}`, companyId:company.id, invoiceDate:new Date("2026-01-02T12:00:00Z"), status:"FINAL", subtotal:25_000, commission:5_000, grandTotal:30_000, items:{create:{itemName:"Final item",quantity:1,unitPrice:25_000,lineTotal:25_000}} } });
    if (await activeBalance(company.id) !== 70_000) throw new Error("Final invoice did not decrease balance.");
    console.log("PASS final invoice decreases balance");

    await db.invoice.create({ data: { invoiceNumber:`__CANCELLED__${Date.now()}`, companyId:company.id, invoiceDate:new Date("2026-01-03T12:00:00Z"), status:"CANCELLED", subtotal:50_000, grandTotal:50_000, items:{create:{itemName:"Cancelled item",quantity:1,unitPrice:50_000,lineTotal:50_000}} } });
    if (await activeBalance(company.id) !== 70_000) throw new Error("Cancelled invoice changed balance.");
    console.log("PASS cancelled invoice does not decrease balance");
  } finally {
    await clean();
  }

  const backup = await createDatabaseBackup();
  if (!existsSync(backup.path) || statSync(backup.path).size === 0) throw new Error("Backup file was not created.");
  console.log(`PASS backup file created: ${backup.filename}`);
}

main().finally(() => db.$disconnect());
