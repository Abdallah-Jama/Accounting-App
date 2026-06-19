import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";

const N=16384,r=8,p=1,keyLength=64;
const derive=(password:string,salt:Buffer,length:number,options:{N:number;r:number;p:number;maxmem:number})=>new Promise<Buffer>((resolve,reject)=>nodeScrypt(password,salt,length,options,(error,key)=>error?reject(error):resolve(key)));
export function validatePassword(password:string){if(password.length<10)return "Password must be at least 10 characters.";if(password.length>256)return "Password is too long.";return null}
export async function hashPassword(password:string){const validation=validatePassword(password);if(validation)throw new Error(validation);const salt=randomBytes(16);const derived=await derive(password,salt,keyLength,{N,r,p,maxmem:64*1024*1024});return `scrypt$v1$${N}$${r}$${p}$${salt.toString("base64")}$${derived.toString("base64")}`}
export async function verifyPassword(password:string,encoded:string){try{const [algorithm,version,nText,rText,pText,saltText,hashText]=encoded.split("$");if(algorithm!=="scrypt"||version!=="v1")return false;const expected=Buffer.from(hashText,"base64"),salt=Buffer.from(saltText,"base64");const actual=await derive(password,salt,expected.length,{N:Number(nText),r:Number(rText),p:Number(pText),maxmem:64*1024*1024});return actual.length===expected.length&&timingSafeEqual(actual,expected)}catch{return false}}
