import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../lib/password";
import { createSessionRecord, validateSessionToken } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";

const db=new PrismaClient(),authId=999,password="Local-Test-Password-2026";
async function clean(){await db.localAuth.deleteMany({where:{id:authId}});await db.auditLog.deleteMany({where:{entityReference:"security-smoke"}})}
async function main(){await clean();try{const hash=await hashPassword(password);if(hash.includes(password)||!hash.startsWith("scrypt$v1$"))throw new Error("Password was not securely encoded");if(!await verifyPassword(password,hash)||await verifyPassword("wrong-password",hash))throw new Error("Password verification failed");await db.localAuth.create({data:{id:authId,passwordHash:hash,sessionTimeoutMinutes:15}});const stored=await db.localAuth.findUniqueOrThrow({where:{id:authId}});if(stored.passwordHash===password)throw new Error("Plaintext password stored");console.log("PASS password setup stores a one-way scrypt hash and login verification works");
  const now=new Date("2026-06-19T09:00:00Z"),session=await createSessionRecord(authId,15,now);const row=await db.authSession.findFirstOrThrow({where:{authId}});if(row.tokenHash===session.token)throw new Error("Raw session token stored in SQLite");if(!await validateSessionToken(session.token,new Date(now.getTime()+60_000)))throw new Error("Valid session rejected");if(await validateSessionToken(session.token,new Date(now.getTime()+16*60_000)))throw new Error("Expired session accepted");if(await validateSessionToken("invalid-token",now))throw new Error("Invalid session accepted");console.log("PASS session tokens are hashed, validated, and expire locally");
  const audit=await writeAuditLog({action:"SECURITY_SMOKE",entityType:"Test",entityReference:"security-smoke",details:{result:"pass"}});const storedAudit=await db.auditLog.findUnique({where:{id:audit.id}});if(!storedAudit||storedAudit.action!=="SECURITY_SMOKE"||!storedAudit.details?.includes("pass"))throw new Error("Audit record missing");console.log("PASS audit log records action, entity, reference, details, and timestamp");
}finally{await clean()}}
main().finally(()=>db.$disconnect());
