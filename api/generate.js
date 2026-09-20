// Gemini expansion layer for GrammarPath.
// Primary source = local question-bank.js in the browser.
// Gemini is called only for scheduled variety or when the local bank is exhausted.

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.GEMINI_API_KEY) return res.status(500).json({error:"GEMINI_API_KEY missing"});

  const {
    topicId="english7",
    topicTitle="English 7 practice",
    topicGuide="",
    level=2,
    targetConcept=null,
    previousConcept="general",
    previousWrong=false,
    seenQuestions=[]
  }=req.body||{};

  const safeLevel=Math.max(1,Math.min(4,Number(level)||2));
  const levelGuide={
    1:"foundation / rule recognition. Very clear wording; may directly test a rule or form before application.",
    2:"basic Grade 7 application in a short sentence or simple exchange.",
    3:"contextual discrimination with plausible distractors and less obvious clues.",
    4:"upper Grade 7 / early entrance-exam preparation: error correction, transformation, close distractors, or richer context without exceeding the taught content."
  };

  const special = topicId==="pronunciation_odd" || topicId==="ed_pronunciation"
    ? "For marked/underlined letters, put ONLY the letters to underline inside double square brackets, e.g. s[[ch]]ool or watch[[ed]]."
    : topicId==="stress"
      ? "Create a word-stress odd-one-out item. Ensure the stress pattern is linguistically accurate."
      : topicId==="compliments"
        ? "Use natural school-age dialogue and pragmatic choices for giving/responding to compliments."
        : topicId==="word_form"
          ? "Use common Global Success 7 Units 1–6 word-family style items. Do not invent rare derivatives. Test part-of-speech choice in context."
          : "";

  const remediation = targetConcept
    ? `Focus on this concept: ${targetConcept}. ${previousWrong?"The learner struggled with it, so scaffold the wording and avoid jumping to another concept.":"Keep the item on this target."}`
    : previousWrong
      ? `The learner got the previous concept (${previousConcept}) wrong. Create a NEW, easier/scaffolded item on the SAME concept.`
      : "Create a new item appropriate to the topic and level.";

  const seen = Array.isArray(seenQuestions) && seenQuestions.length
    ? `DO NOT repeat or closely paraphrase any of these used questions:\n- ${seenQuestions.slice(-12).join("\n- ")}`
    : "";

  const prompt=`You are generating ONE question for a Vietnamese Grade 7 English learner following Global Success / CTGDPT 2018 style practice, with gradual preparation for later Grade 10 entrance-exam formats.

Topic: ${topicTitle}
Topic scope: ${topicGuide}
Adaptive level: ${safeLevel}
Level standard: ${levelGuide[safeLevel]}
${remediation}
${special}
${seen}

Requirements:
- Exactly ONE multiple-choice question.
- Exactly 4 options and exactly one correct answer.
- Keep content within the named topic.
- Use natural, age-appropriate English.
- Avoid ambiguity and trick questions based on obscure exceptions.
- Give a short teaching explanation.
- concept must be a short snake_case label describing the tested subskill.
- answer is a zero-based index: 0, 1, 2, or 3.
- The new question must be genuinely different from previously used items.
`;

  const schema={
    type:"object",
    properties:{question:{type:"object",properties:{
      q:{type:"string"},
      options:{type:"array",minItems:4,maxItems:4,items:{type:"string"}},
      answer:{type:"integer",minimum:0,maximum:3},
      explain:{type:"string"},
      concept:{type:"string"}
    },required:["q","options","answer","explain","concept"]}},
    required:["question"]
  };

  try{
    const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},
      body:JSON.stringify({
        contents:[{parts:[{text:prompt}]}],
        generationConfig:{responseMimeType:"application/json",responseSchema:schema}
      })
    });
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data?.error?.message||"Gemini request failed"});
    const text=data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!text) return res.status(502).json({error:"Gemini returned no text"});
    const parsed=JSON.parse(text);
    return res.status(200).json(parsed);
  }catch(err){
    console.error(err);
    return res.status(500).json({error:"Generation failed"});
  }
}
