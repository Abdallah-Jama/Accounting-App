import { db } from "@/lib/db";

export type AuditEntry={action:string;entityType:string;entityReference?:string|number|null;details?:string|Record<string,unknown>|null};
export async function writeAuditLog(entry:AuditEntry){return db.auditLog.create({data:{action:entry.action,entityType:entry.entityType,entityReference:entry.entityReference==null?null:String(entry.entityReference),details:entry.details==null?null:typeof entry.details==="string"?entry.details:JSON.stringify(entry.details)}})}
