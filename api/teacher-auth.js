export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const {pin}=req.body||{};
  if(!process.env.TEACHER_PIN) return res.status(500).json({error:"TEACHER_PIN missing"});
  if(String(pin)!==String(process.env.TEACHER_PIN)) return res.status(401).json({error:"Invalid PIN"});
  return res.status(200).json({ok:true});
}