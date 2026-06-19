export function parseMoneyToMinor(value: FormDataEntryValue | null): number {
  const normalized = String(value ?? "").trim().replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) throw new Error("Enter a valid non-negative amount with up to 2 decimals.");
  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new Error("Amount is too large.");
  return amount;
}

export function formatMoney(minor: number, currency = "AED") {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency, minimumFractionDigits: 2 }).format(minor / 100);
}

export function minorToInput(minor: number) {
  return (minor / 100).toFixed(2);
}
