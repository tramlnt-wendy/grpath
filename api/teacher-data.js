export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const {pin}=req.body||{};
  if(String(pin)!==String(process.env.TEACHER_PIN)) return res.status(401).json({error:"Invalid PIN"});
  if(!process.env.SHEET_WEBAPP_URL) return res.status(500).json({error:"SHEET_WEBAPP_URL missing"});
  try{
    const url=process.env.SHEET_WEBAPP_URL+(process.env.SHEET_WEBAPP_URL.includes("?")?"&":"?")+"action=teacherData";
    const r=await fetch(url,{cache:"no-store"});
    const text=await r.text();
    let data;try{data=JSON.parse(text)}catch{throw new Error("Invalid Apps Script JSON")}
    return res.status(200).json(data);
  }catch(e){console.error(e);return res.status(500).json({error:"Could not load teacher data"})}
}