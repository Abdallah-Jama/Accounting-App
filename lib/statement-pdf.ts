import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { StatementRow } from "@/lib/statement";

type StatementData = NonNullable<Awaited<ReturnType<typeof import("@/lib/statement").getCompanyStatement>>>;
const A4_LANDSCAPE: [number,number] = [841.89,595.28];
const green = rgb(0.15,0.47,0.29), ink=rgb(0.09,0.13,0.11), muted=rgb(0.38,0.43,0.4), pale=rgb(0.95,0.97,0.95), line=rgb(0.85,0.88,0.86), red=rgb(0.72,0.17,0.17);
const ascii = (value:string) => value.replace(/[^\x20-\x7E]/g,"-");
const money = (value:number|null) => value==null?"-":`AED ${(value/100).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const shortDate=(date:Date)=>date.toISOString().slice(0,10);

function fit(text:string,font:PDFFont,size:number,width:number){const clean=ascii(text);if(font.widthOfTextAtSize(clean,size)<=width)return clean;let out=clean;while(out.length&&font.widthOfTextAtSize(`${out}...`,size)>width)out=out.slice(0,-1);return `${out}...`;}
function right(page:PDFPage,text:string,x:number,y:number,width:number,font:PDFFont,size:number,color=ink){const clean=fit(text,font,size,width);page.drawText(clean,{x:x+width-font.widthOfTextAtSize(clean,size),y,font,size,color});}

export async function buildStatementPdf(data:StatementData,businessName:string) {
  const pdf=await PDFDocument.create();
  pdf.setTitle(`${data.company.name} Statement`); pdf.setAuthor(ascii(businessName)); pdf.setCreator("Local Ledger");
  const regular=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let page=pdf.addPage(A4_LANDSCAPE), y=0;
  const cols=[{label:"Date",x:36,w:58},{label:"Type",x:94,w:48},{label:"Reference",x:142,w:94},{label:"Status",x:236,w:62},{label:"Description",x:298,w:190},{label:"Debit",x:488,w:92},{label:"Credit",x:580,w:92},{label:"Balance",x:672,w:134}];
  const tableHeader=(p:PDFPage,top:number)=>{p.drawRectangle({x:36,y:top-18,width:770,height:20,color:green});cols.forEach((c,i)=>p.drawText(c.label,{x:i<5?c.x+4:c.x+c.w-bold.widthOfTextAtSize(c.label,7)-4,y:top-11,font:bold,size:7,color:rgb(1,1,1)}));return top-33;};
  const continuation=()=>{page=pdf.addPage(A4_LANDSCAPE);page.drawText(fit(businessName,bold,14,440),{x:36,y:554,font:bold,size:14,color:green});right(page,`${data.company.name} - Statement`,500,554,306,bold,10);page.drawLine({start:{x:36,y:542},end:{x:806,y:542},thickness:1,color:line});y=tableHeader(page,523);};

  page.drawText(fit(businessName,bold,19,470),{x:36,y:548,font:bold,size:19,color:green});
  right(page,"COMPANY STATEMENT",510,548,296,bold,15,ink);
  page.drawLine({start:{x:36,y:532},end:{x:806,y:532},thickness:1.2,color:green});
  page.drawText("STATEMENT FOR",{x:36,y:503,font:bold,size:7,color:muted});page.drawText(fit(data.company.name,bold,15,370),{x:36,y:483,font:bold,size:15,color:ink});
  const contact=[data.company.email,data.company.phone,data.company.address].filter(Boolean).join(" | ");page.drawText(fit(contact||"No contact details",regular,8.5,430),{x:36,y:466,font:regular,size:8.5,color:muted});
  page.drawText("STATEMENT PERIOD",{x:520,y:503,font:bold,size:7,color:muted});const period=`${data.filters.from||"Beginning"} to ${data.filters.to||"Present"}`;page.drawText(period,{x:520,y:483,font:bold,size:11,color:ink});page.drawText(`Generated ${new Date().toISOString().slice(0,10)}`,{x:520,y:466,font:regular,size:8.5,color:muted});
  const metrics=["Opening balance","Received in period","Final invoices","Cancelled invoices","Closing balance"];
  const values=[data.summary.openingBalance,data.summary.totalReceived,data.summary.totalFinalInvoices,data.summary.totalCancelledInvoices,data.summary.closingBalance];
  metrics.forEach((label,index)=>{const x=36+index*154;page.drawRectangle({x,y:407,width:144,height:43,color:index===4?rgb(0.9,0.96,0.92):pale,borderColor:index===4?green:line,borderWidth:0.7});page.drawText(label.toUpperCase(),{x:x+9,y:434,font:bold,size:6.5,color:muted});page.drawText(money(values[index]),{x:x+9,y:416,font:bold,size:10,color:index===4?green:ink});});
  y=tableHeader(page,384);
  const drawRow=(row:StatementRow,index:number)=>{if(y<58)continuation();if(index%2===1)page.drawRectangle({x:36,y:y-5,width:770,height:17,color:rgb(0.985,0.99,0.985)});const color=row.status==="Cancelled"?red:row.status==="Draft"?rgb(0.65,0.42,0.05):ink;page.drawText(shortDate(row.date),{x:40,y,font:regular,size:7.5,color});page.drawText(row.type,{x:98,y,font:regular,size:7.5,color});page.drawText(fit(row.reference,regular,7.5,86),{x:146,y,font:regular,size:7.5,color});page.drawText(row.status,{x:240,y,font:regular,size:7.5,color});page.drawText(fit(row.description,regular,7.5,182),{x:302,y,font:regular,size:7.5,color});right(page,money(row.debit),492,y,84,regular,7.5,color);right(page,money(row.credit),584,y,84,regular,7.5,color);right(page,money(row.runningBalance),676,y,126,bold,7.5,color);page.drawLine({start:{x:36,y:y-6},end:{x:806,y:y-6},thickness:0.35,color:line});y-=17;};
  data.rows.forEach(drawRow);
  if(!data.rows.length){page.drawText("No statement transactions match the selected filters.",{x:40,y,font:regular,size:9,color:muted});y-=28;}
  if(y<95)continuation();
  page.drawRectangle({x:590,y:y-28,width:216,height:38,color:rgb(0.9,0.96,0.92),borderColor:green,borderWidth:0.8});page.drawText("CLOSING BALANCE",{x:602,y:y-6,font:bold,size:7,color:muted});right(page,money(data.summary.closingBalance),602,y-21,192,bold,12,green);
  page.drawLine({start:{x:36,y:y-34},end:{x:210,y:y-34},thickness:0.7,color:muted});page.drawText("Authorized signature",{x:36,y:y-47,font:regular,size:7.5,color:muted});
  const pages=pdf.getPages();pages.forEach((p,index)=>{p.drawLine({start:{x:36,y:28},end:{x:806,y:28},thickness:0.5,color:line});p.drawText("Generated locally by Local Ledger",{x:36,y:15,font:regular,size:7,color:muted});right(p,`Page ${index+1} of ${pages.length}`,700,15,106,regular,7,muted);});
  return pdf.save();
}
