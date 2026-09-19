export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.SHEET_WEBAPP_URL) return res.status(500).json({error:"SHEET_WEBAPP_URL missing"});
  try{
    const r=await fetch(process.env.SHEET_WEBAPP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"saveResult",...(req.body||{})})});
    const text=await r.text();
    return res.status(200).json({ok:true,upstream:text});
  }catch(e){console.error(e);return res.status(500).json({error:"Could not save result"})}
}