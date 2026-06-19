"use server";

import { db } from "@/lib/db";
import { createDatabaseBackup } from "@/lib/backup.cjs";
import { parseLocalDate } from "@/lib/dates";
import { parseMoneyToMinor } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const requiredText = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
};
const optionalText = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim() || null;
const positiveId = (value: FormDataEntryValue | null) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new Error("Invalid record.");
  return id;
};

export async function createCompany(formData: FormData) {
  await db.company.create({ data: { name: requiredText(formData, "name"), email: optionalText(formData, "email"), phone: optionalText(formData, "phone"), address: optionalText(formData, "address"), notes: optionalText(formData, "notes") } });
  revalidatePath("/companies");
  redirect("/companies");
}

export async function updateCompany(formData: FormData) {
  const id = positiveId(formData.get("id"));
  await db.company.update({ where: { id }, data: { name: requiredText(formData, "name"), email: optionalText(formData, "email"), phone: optionalText(formData, "phone"), address: optionalText(formData, "address"), notes: optionalText(formData, "notes") } });
  revalidatePath("/"); revalidatePath("/companies"); revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function deleteCompany(formData: FormData) {
  const id = positiveId(formData.get("id"));
  const invoices = await db.invoice.count({ where: { companyId: id } });
  if (invoices) throw new Error("A company with invoices cannot be deleted.");
  await db.company.delete({ where: { id } });
  revalidatePath("/"); revalidatePath("/companies");
  redirect("/companies");
}

export async function createReceipt(formData: FormData) {
  const companyId = positiveId(formData.get("companyId"));
  const amount = parseMoneyToMinor(formData.get("amount"));
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  await db.moneyReceipt.create({ data: { companyId, amount, receivedAt: parseLocalDate(formData.get("receivedAt")), reference: optionalText(formData, "reference"), notes: optionalText(formData, "notes") } });
  revalidatePath("/"); revalidatePath("/received-money"); revalidatePath(`/companies/${companyId}`);
  redirect("/received-money");
}

export async function deleteReceipt(formData: FormData) {
  const id = positiveId(formData.get("id"));
  const receipt = await db.moneyReceipt.delete({ where: { id } });
  revalidatePath("/"); revalidatePath("/received-money"); revalidatePath(`/companies/${receipt.companyId}`);
}

const itemSchema = z.object({ itemName: z.string().trim().min(1), quantity: z.number().int().positive(), unitPrice: z.number().int().nonnegative() });
const invoiceStatusSchema = z.enum(["DRAFT", "FINAL"]);

function invoicePayload(formData: FormData) {
  const companyId = positiveId(formData.get("companyId"));
  const invoiceNumber = requiredText(formData, "invoiceNumber");
  const rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  const items = z.array(itemSchema).min(1).parse(rawItems);
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  if (!Number.isSafeInteger(subtotal)) throw new Error("Invoice total is too large.");
  const commission = parseMoneyToMinor(formData.get("commission"));
  const packing = parseMoneyToMinor(formData.get("packing"));
  const transportation = parseMoneyToMinor(formData.get("transportation"));
  const grandTotal = subtotal + commission + packing + transportation;
  const status = invoiceStatusSchema.parse(String(formData.get("status") ?? "DRAFT"));
  return { companyId, invoiceNumber, invoiceDate: parseLocalDate(formData.get("invoiceDate")), subtotal, commission, packing, transportation, grandTotal, status, notes: optionalText(formData, "notes"), items };
}

function revalidateInvoiceData(companyId: number, invoiceId?: number) {
  revalidatePath("/"); revalidatePath("/analytics"); revalidatePath("/invoices"); revalidatePath(`/companies/${companyId}`);
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
}

export async function createInvoice(formData: FormData) {
  const { items, ...data } = invoicePayload(formData);
  const invoice = await db.invoice.create({ data: {
    ...data,
    items: { create: items.map((item, sortOrder) => ({ ...item, lineTotal: item.quantity * item.unitPrice, sortOrder })) },
  } });
  revalidateInvoiceData(invoice.companyId, invoice.id);
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(formData: FormData) {
  const id = positiveId(formData.get("id"));
  const { items, ...data } = invoicePayload(formData);
  const previous = await db.invoice.findUnique({ where: { id }, select: { status: true, companyId: true } });
  if (!previous) throw new Error("Invoice not found.");
  if (previous.status !== "DRAFT") throw new Error("Only draft invoices can be edited.");
  const invoice = await db.invoice.update({ where: { id, status: "DRAFT" }, data: {
    ...data,
    items: { deleteMany: {}, create: items.map((item, sortOrder) => ({ ...item, lineTotal: item.quantity * item.unitPrice, sortOrder })) },
  } });
  revalidateInvoiceData(previous.companyId, id);
  if (previous.companyId !== invoice.companyId) revalidatePath(`/companies/${invoice.companyId}`);
  redirect(`/invoices/${id}`);
}

export async function finalizeInvoice(formData: FormData) {
  const id = positiveId(formData.get("id"));
  const result = await db.invoice.updateMany({ where: { id, status: "DRAFT" }, data: { status: "FINAL" } });
  if (!result.count) throw new Error("Only a draft invoice can be finalized.");
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id }, select: { companyId: true } });
  revalidateInvoiceData(invoice.companyId, id);
}

export async function cancelInvoice(formData: FormData) {
  const id = positiveId(formData.get("id"));
  const invoice = await db.invoice.findUnique({ where: { id }, select: { companyId: true, status: true } });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "CANCELLED") throw new Error("Invoice is already cancelled.");
  await db.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidateInvoiceData(invoice.companyId, id);
}

export async function deleteInvoice(formData: FormData) {
  const id = positiveId(formData.get("id"));
  const existing = await db.invoice.findUnique({ where: { id }, select: { status: true } });
  if (!existing) throw new Error("Invoice not found.");
  if (existing.status !== "DRAFT") throw new Error("Only draft invoices can be deleted. Final and cancelled invoices remain in history.");
  const invoice = await db.invoice.delete({ where: { id } });
  revalidateInvoiceData(invoice.companyId);
  redirect("/invoices");
}

export async function createBackup() {
  try {
    const backup = await createDatabaseBackup();
    revalidatePath("/settings");
    redirect(`/settings?backup=success&file=${encodeURIComponent(backup.filename)}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : "Unknown backup error";
    redirect(`/settings?backup=error&message=${encodeURIComponent(message)}`);
  }
}

export async function updateBusinessSettings(formData: FormData) {
  const businessName = requiredText(formData, "businessName").slice(0, 120);
  await db.appSetting.upsert({ where:{key:"businessName"},create:{key:"businessName",value:businessName},update:{value:businessName} });
  revalidatePath("/settings");
  redirect("/settings?saved=business");
}
