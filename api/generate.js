export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.GEMINI_API_KEY) return res.status(500).json({error:"GEMINI_API_KEY missing"});
  const {level=2,previousConcept="general",previousWrong=false,targetConcept=null}=req.body||{};
  const safeLevel=Math.max(1,Math.min(4,Number(level)||2));
  const guides={1:"very easy recognition with obvious time markers",2:"standard Grade 7 controlled practice",3:"challenging controlled use with irregular verbs or error recognition",4:"advanced Grade 7 application using short contexts or transformation-style thinking"};
  const concepts=["affirmative","negative","questions","be","irregular_verbs","regular_verbs","time_markers","error_correction"];
  const focus=targetConcept?`PERSONAL REMEDIATION: focus only on ${targetConcept}.`:previousWrong?`Keep the same concept (${previousConcept}) but scaffold it more clearly.`:`You may choose another Past Simple concept suitable for this level.`;
  const prompt=`Create ONE multiple-choice Past Simple grammar question for a Grade 7 learner.
Level: ${safeLevel}. ${guides[safeLevel]}
Instruction: ${focus}
Exactly 4 options, one correct answer, concise explanation.
concept must be exactly one of: ${concepts.join(", ")}.
answer is zero-based 0-3.`;
  const schema={type:"object",properties:{question:{type:"object",properties:{q:{type:"string"},options:{type:"array",minItems:4,maxItems:4,items:{type:"string"}},answer:{type:"integer",minimum:0,maximum:3},explain:{type:"string"},concept:{type:"string",enum:concepts}},required:["q","options","answer","explain","concept"]}},required:["question"]};
  try{
    const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseSchema:schema}})});
    const d=await r.json();if(!r.ok)return res.status(r.status).json({error:d?.error?.message||"Gemini error"});
    const text=d?.candidates?.[0]?.content?.parts?.[0]?.text;if(!text)return res.status(502).json({error:"No text"});
    return res.status(200).json(JSON.parse(text));
  }catch(e){console.error(e);return res.status(500).json({error:"Generation failed"})}
}
