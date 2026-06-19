import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const SESSION_COOKIE="local_ledger_session";
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");

export async function createSessionRecord(authId:number,timeoutMinutes:number,now=new Date()){const token=randomBytes(32).toString("base64url");const expiresAt=new Date(now.getTime()+timeoutMinutes*60_000);await db.authSession.create({data:{authId,tokenHash:tokenHash(token),expiresAt}});return{token,expiresAt}}
export async function validateSessionToken(token:string,now=new Date()){if(!token||token.length>200)return null;const session=await db.authSession.findUnique({where:{tokenHash:tokenHash(token)},include:{auth:true}});if(!session||session.expiresAt<=now)return null;return session}
export async function getCurrentSession(){const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)return null;const session=await validateSessionToken(token);return session?.authId===1?session:null}
export async function establishSession(authId:number,timeoutMinutes:number){await db.authSession.deleteMany({where:{expiresAt:{lte:new Date()}}});const session=await createSessionRecord(authId,timeoutMinutes);(await cookies()).set(SESSION_COOKIE,session.token,{httpOnly:true,sameSite:"strict",secure:process.env.AUTH_COOKIE_SECURE==="true",path:"/",expires:session.expiresAt});return session}
export async function clearCurrentSession(){const store=await cookies();const token=store.get(SESSION_COOKIE)?.value;if(token)await db.authSession.deleteMany({where:{tokenHash:tokenHash(token)}});store.delete(SESSION_COOKIE)}
export async function requireSession(){const configured=await db.localAuth.findUnique({where:{id:1},select:{id:true}});if(!configured)redirect("/setup");const session=await getCurrentSession();if(!session)redirect("/login");return session}
export async function isAuthenticationConfigured(){return Boolean(await db.localAuth.findUnique({where:{id:1},select:{id:true}}))}
