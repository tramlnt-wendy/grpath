export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const {pin,student,topic,latestMainScore,finalLevel,weakAreas,latestPersonalPractice}=req.body||{};
  if(String(pin)!==String(process.env.TEACHER_PIN)) return res.status(401).json({error:"Invalid PIN"});
  if(!process.env.GEMINI_API_KEY) return res.status(500).json({error:"GEMINI_API_KEY missing"});

  function scoreNumber(s){
    const m=String(s||"").match(/(\d+)\s*\/\s*(\d+)/);
    return m?Number(m[1])/Number(m[2]):null;
  }
  const main=scoreNumber(latestMainScore);
  const personal=scoreNumber(latestPersonalPractice);
  let difficulty="Medium";
  if((main!==null&&main<=0.5)||(Number(finalLevel)||2)<=2) difficulty="Easy";
  if((main!==null&&main>=0.9)&&(personal===null||personal>=0.8)&&(Number(finalLevel)||2)>=3) difficulty="Hard";

  const prompt=`Create personalised English homework for a Grade 7 learner.
Student: ${student}
Topic: ${topic}
Latest main score: ${latestMainScore||"unknown"}
Final adaptive level: ${finalLevel||"unknown"}
Weak area(s): ${weakAreas||"unknown"}
Latest personal practice: ${latestPersonalPractice||"not completed"}
Assigned homework difficulty: ${difficulty}

Design homework that specifically addresses the student's weak area.
Difficulty guidance:
Easy = strong scaffolding, recognition, simple completion and correction.
Medium = consolidation with MCQ, completion, error correction and transformation.
Hard = extension with mixed forms, contextual grammar, transformation and a short writing task.

Create 3 sections with 4 items each (12 items total).
Use clear classroom-ready wording.
Do NOT include answers inside the student questions.
Provide a separate answer key with 12 concise answers.
`;

  const schema={type:"object",properties:{homework:{type:"object",properties:{
    title:{type:"string"},student:{type:"string"},focus:{type:"string"},difficulty:{type:"string",enum:["Easy","Medium","Hard"]},
    sections:{type:"array",minItems:3,maxItems:3,items:{type:"object",properties:{title:{type:"string"},instructions:{type:"string"},items:{type:"array",minItems:4,maxItems:4,items:{type:"string"}}},required:["title","instructions","items"]}},
    answerKey:{type:"array",minItems:12,maxItems:12,items:{type:"string"}}
  },required:["title","student","focus","difficulty","sections","answerKey"]}},required:["homework"]};

  try{
    const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseSchema:schema}})});
    const d=await r.json();if(!r.ok)return res.status(r.status).json({error:d?.error?.message||"Gemini error"});
    const text=d?.candidates?.[0]?.content?.parts?.[0]?.text;
    return res.status(200).json(JSON.parse(text));
  }catch(e){console.error(e);return res.status(500).json({error:"Homework generation failed"})}
}