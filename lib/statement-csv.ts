import type { StatementRow } from "@/lib/statement";

function cell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g,'""')}"`;
}

const major = (value: number | null) => value == null ? "" : (value/100).toFixed(2);

export function buildStatementCsv(rows: StatementRow[]) {
  const records = rows.map(row=>[
    row.date.toISOString().slice(0,10),row.type,row.reference,row.status,row.description,
    row.debit??"",major(row.debit),row.credit??"",major(row.credit),row.runningBalance,(row.runningBalance/100).toFixed(2),
  ]);
  const headers = ["date","type","reference","status","description","debit_minor","debit_aed","credit_minor","credit_aed","running_balance_minor","running_balance_aed"];
  return "\uFEFF"+[headers,...records].map(row=>row.map(cell).join(",")).join("\r\n");
}
