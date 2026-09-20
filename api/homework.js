function scoreRatio(value){
  const m=String(value||"").match(/(\d+)\s*\/\s*(\d+)/);if(!m)return null;
  const total=Number(m[2]);return total?Number(m[1])/total:null;
}
function chooseDifficulty(mainScore,personalScore,finalLevel){
  const main=scoreRatio(mainScore),personal=scoreRatio(personalScore),level=Number(finalLevel)||2;
  if((main!==null&&main<=0.5)||level<=2)return"Easy";
  if((main!==null&&main>=0.9)&&(personal===null||personal>=0.8)&&level>=3)return"Hard";
  return"Medium";
}
function fallback(student,topic,focus,difficulty){
  const scaffold=difficulty==="Easy"?"Use short, clear recognition and completion items.":difficulty==="Medium"?"Use mixed completion, correction and context items.":"Use close distractors, correction, transformation and a short application item.";
  return {
    title:`${topic} — Personalised Homework`,student,focus:focus||topic,difficulty,
    sections:[
      {title:"A. Review",instructions:scaffold,items:["Review the key rule/example from today’s lesson.","Write one correct example of the target point.","Correct one example from your class notes.","Explain the target rule in one short sentence."]},
      {title:"B. Practice",instructions:"Complete four teacher-selected items on the same target.",items:["Practice item 1 — teacher may replace with a bank item.","Practice item 2 — teacher may replace with a bank item.","Practice item 3 — teacher may replace with a bank item.","Practice item 4 — teacher may replace with a bank item."]},
      {title:"C. Apply",instructions:"Use the target in context.",items:["Write one original example.","Write a second original example.","Check your two examples for accuracy.","Underline the part that shows the target language point."]}
    ],
    answerKey:Array(12).fill("Teacher checks based on the target rule / open response.")
  };
}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const {pin,student="Student",topic="English 7 practice",latestMainScore,finalLevel,weakAreas,latestPersonalPractice}=req.body||{};
  if(String(pin)!==String(process.env.TEACHER_PIN))return res.status(401).json({error:"Invalid teacher PIN"});
  const difficulty=chooseDifficulty(latestMainScore,latestPersonalPractice,finalLevel);
  const focus=String(weakAreas||topic);
  const fb=fallback(student,topic,focus,difficulty);
  if(!process.env.GEMINI_API_KEY)return res.status(200).json({homework:fb,source:"fallback"});

  const prompt=`Create personalised homework for a Vietnamese Grade 7 English learner following Global Success / CTGDPT 2018 style practice.
Student: ${student}
Topic: ${topic}
Latest main score: ${latestMainScore||"unknown"}
Final adaptive level: ${finalLevel||"unknown"}
Weak area(s): ${weakAreas||"not identified"}
Latest personal practice: ${latestPersonalPractice||"not completed"}
Assigned difficulty: ${difficulty}

Create exactly 3 sections with exactly 4 student items in each section (12 total).
Keep every item inside the stated topic and focus strongly on the weak area.
Easy: scaffolded rule recognition and controlled practice.
Medium: consolidation, context, correction and transformation where suitable.
Hard: close distractors, richer context, correction/transformation/application, but remain appropriate for Grade 7 and useful preparation for later Grade 10 entrance-exam style tasks.
For pronunciation/stress topics, use pronunciation/stress items rather than grammar writing tasks.
For Conversation: Giving compliments, use dialogues and situational responses.
For Word Form, test word families in context.
Do not include answers inside student items. Provide exactly 12 concise answer-key entries.`;
  const schema={type:"object",properties:{homework:{type:"object",properties:{
    title:{type:"string"},student:{type:"string"},focus:{type:"string"},difficulty:{type:"string",enum:["Easy","Medium","Hard"]},
    sections:{type:"array",minItems:3,maxItems:3,items:{type:"object",properties:{title:{type:"string"},instructions:{type:"string"},items:{type:"array",minItems:4,maxItems:4,items:{type:"string"}}},required:["title","instructions","items"]}},
    answerKey:{type:"array",minItems:12,maxItems:12,items:{type:"string"}}
  },required:["title","student","focus","difficulty","sections","answerKey"]}},required:["homework"]};
  try{
    const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseSchema:schema}})});
    const data=await r.json();if(!r.ok)return res.status(200).json({homework:fb,source:"fallback",warning:data?.error?.message||"Gemini error"});
    const text=data?.candidates?.[0]?.content?.parts?.[0]?.text;if(!text)return res.status(200).json({homework:fb,source:"fallback"});
    return res.status(200).json(JSON.parse(text));
  }catch(e){console.error(e);return res.status(200).json({homework:fb,source:"fallback",warning:String(e)})}
}
