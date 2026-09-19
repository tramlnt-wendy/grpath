function scoreRatio(value){
  const m=String(value||"").match(/(\d+)\s*\/\s*(\d+)/);
  if(!m) return null;
  const total=Number(m[2]);
  return total ? Number(m[1])/total : null;
}

function chooseDifficulty(mainScore, personalScore, finalLevel){
  const main=scoreRatio(mainScore);
  const personal=scoreRatio(personalScore);
  const level=Number(finalLevel)||2;

  if((main!==null && main<=0.5) || level<=2) return "Easy";
  if((main!==null && main>=0.9) && (personal===null || personal>=0.8) && level>=3) return "Hard";
  return "Medium";
}

function normalizeFocus(weakAreas){
  const s=String(weakAreas||"").toLowerCase();
  if(s.includes("negative")) return "Negative form";
  if(s.includes("question")) return "Questions";
  if(s.includes("irregular")) return "Irregular verbs";
  if(s.includes("regular")) return "Regular verbs";
  if(s.includes("past simple of be") || s.includes(" was") || s.includes("were")) return "Past Simple of BE";
  if(s.includes("time")) return "Past time markers";
  if(s.includes("error")) return "Error correction";
  return "Past Simple mixed practice";
}

function fallbackHomework(student, focus, difficulty){
  const banks = {
    "Negative form": {
      Easy: [
        ["Choose the correct form: She ___ go to school yesterday. (didn't / doesn't)", "Choose the correct form: We ___ watch TV last night. (didn't / don't)", "Complete: Tom didn't ___ (play) football yesterday.", "Complete: They didn't ___ (visit) the museum."],
        ["Correct the mistake: He didn't went home early.", "Correct the mistake: I didn't saw her yesterday.", "Rewrite in the negative: She cooked dinner.", "Rewrite in the negative: They played tennis."],
        ["Write one true sentence about something you didn't do yesterday.", "Write one sentence using didn't + go.", "Write one sentence using didn't + watch.", "Write one sentence using didn't + study."]
      ],
      Medium: [
        ["Choose: Mia didn't ___ the answer. (knew / know)", "Choose: They didn't ___ the bus. (missed / miss)", "Complete: Jack didn't ___ (buy) anything.", "Complete: We didn't ___ (see) the film."],
        ["Correct: She didn't wrote an email.", "Correct: They didn't came late.", "Rewrite negatively: Ben made breakfast.", "Rewrite negatively: My friends went shopping."],
        ["Complete a sentence with didn't + take.", "Complete a sentence with didn't + have.", "Write two things you didn't do last weekend.", "Write a negative Past Simple sentence with an irregular verb."]
      ],
      Hard: [
        ["Correct: Although she was tired, she didn't went home.", "Correct: We didn't knew that the shop closed early.", "Rewrite without changing meaning: He chose not to attend the meeting.", "Rewrite as a Past Simple negative: They remembered the password."],
        ["Complete naturally: I wanted to call you, but I ___ because ...", "Complete naturally with didn't + V1: The team ___ the match because ...", "Transform: She bought the tickets. → negative.", "Transform: They understood the instructions. → negative."],
        ["Write 3 sentences about a plan that did not happen.", "Use didn't + V1 with two irregular verbs.", "Write a short 3-sentence paragraph including two Past Simple negatives.", "Check your paragraph and underline every base verb after didn't."]
      ]
    },
    "Questions": {
      Easy: [
        ["Choose: ___ you play football yesterday? (Did / Do)", "Choose: Did she ___ home? (go / went)", "Complete: ___ they watch the film?", "Complete: Did Tom ___ (visit) his aunt?"],
        ["Correct: Did he went to school?", "Correct: Did they saw the match?", "Make a question: she / cook / dinner / ?", "Make a question: you / study / English / ?"],
        ["Write a Past Simple question with 'where'.", "Write a Past Simple question with 'when'.", "Write a question using Did + play.", "Write a question using Did + go."]
      ],
      Medium: [
        ["Choose: Where ___ you go last weekend? (did / do)", "Choose: What did she ___? (bought / buy)", "Complete: Why ___ they leave early?", "Complete: When did he ___ (arrive)?"],
        ["Correct: What did you ate?", "Correct: Where did she went?", "Make a question for the answer: 'I visited Da Nang.'", "Make a question for the answer: 'She arrived at 8 p.m.'"],
        ["Write two WH-questions about last weekend.", "Write one yes/no Past Simple question.", "Interview a classmate with two Past Simple questions.", "Write the classmate's answers in full sentences."]
      ],
      Hard: [
        ["Correct: Why did the teacher gave us extra homework?", "Correct: Where did they stayed during the trip?", "Write a question whose answer is 'Because I was tired.'", "Write a question whose answer is 'At the library.'"],
        ["Turn into a natural WH-question: They met John at the station.", "Turn into a natural question: She chose the blue bag.", "Create a question using 'How long ...?'", "Create a question using 'Who ...?' without did when 'who' is the subject."],
        ["Write four interview questions about a memorable day.", "Use at least two irregular verbs in the questions.", "Answer two of your own questions.", "Check that every question with did uses V1."]
      ]
    },
    "Irregular verbs": {
      Easy: [
        ["Write the past form: go → ___", "Write the past form: see → ___", "Write the past form: buy → ___", "Write the past form: have → ___"],
        ["Choose: Yesterday I ___ my friend. (see / saw)", "Choose: She ___ a new book. (buy / bought)", "Complete: We ___ (go) home early.", "Complete: He ___ (have) lunch at noon."],
        ["Write one sentence with went.", "Write one sentence with saw.", "Write one sentence with bought.", "Write one sentence with had."]
      ],
      Medium: [
        ["Write V2: take, come, make, get.", "Write V2: give, find, think, leave.", "Complete: She ___ (take) a taxi.", "Complete: They ___ (make) a cake."],
        ["Choose the correct irregular verb in context: I ___ my keys yesterday. (find/found)", "Complete: We ___ (come) home late.", "Correct: He taked the bus.", "Correct: She buyed a new pen."],
        ["Write four Past Simple sentences using different irregular verbs.", "Use one negative sentence.", "Use one Past Simple question.", "Underline every irregular V2 form."]
      ],
      Hard: [
        ["Correct: She teached me how to do it.", "Correct: He catched the ball.", "Use the correct V2: freeze, throw, choose, break.", "Use the correct V2: hide, wear, grow, speak."],
        ["Complete a short context using: take, find, lose, bring.", "Write a sentence with 'chose'.", "Write a sentence with 'thought'.", "Write a sentence with 'brought'."],
        ["Write a 5-sentence story using at least five irregular verbs.", "Include one negative sentence.", "Include one question.", "Circle all irregular past forms."]
      ]
    }
  };

  const focusBank = banks[focus];
  const selected = focusBank ? focusBank[difficulty] : [
    ["Complete: Yesterday I ___ (visit) my friend.", "Complete: She ___ (go) home early.", "Choose: Did you ___ / went there?", "Correct: He didn't saw the film."],
    ["Rewrite in the negative: They played tennis.", "Make a question: she / cook / dinner / ?", "Write the past form of buy.", "Write the past form of take."],
    ["Write 3 sentences about yesterday.", "Include one negative sentence.", "Include one question.", "Check all verb forms."]
  ];

  const titles = difficulty==="Easy"
    ? ["A. Build the rule","B. Fix and rewrite","C. Apply it"]
    : difficulty==="Medium"
      ? ["A. Choose and complete","B. Correct and transform","C. Apply in context"]
      : ["A. Accuracy challenge","B. Transform and apply","C. Extension writing"];

  const sections = selected.map((items,i)=>({
    title:titles[i],
    instructions:i===2 ? "Use the Past Simple carefully." : "Complete all four items.",
    items
  }));

  const answerKey = [
    "Teacher checks according to the target rule.",
    "Teacher checks according to the target rule.",
    "Teacher checks according to the target rule.",
    "Teacher checks according to the target rule.",
    "Teacher checks corrections / transformations.",
    "Teacher checks corrections / transformations.",
    "Teacher checks corrections / transformations.",
    "Teacher checks corrections / transformations.",
    "Open response — check target grammar.",
    "Open response — check target grammar.",
    "Open response — check target grammar.",
    "Open response — check target grammar."
  ];

  return {
    title:"Past Simple — Personalised Homework",
    student,
    focus,
    difficulty,
    sections,
    answerKey
  };
}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

  const {pin,student,topic="Past Simple",latestMainScore,finalLevel,weakAreas,latestPersonalPractice}=req.body||{};

  if(String(pin)!==String(process.env.TEACHER_PIN)){
    return res.status(401).json({error:"Invalid teacher PIN"});
  }

  const difficulty=chooseDifficulty(latestMainScore,latestPersonalPractice,finalLevel);
  const focus=normalizeFocus(weakAreas);
  const fallback=fallbackHomework(student||"Student",focus,difficulty);

  // If Gemini is unavailable, return a valid homework instead of failing.
  if(!process.env.GEMINI_API_KEY){
    return res.status(200).json({homework:fallback,source:"fallback",warning:"GEMINI_API_KEY missing"});
  }

  const prompt=`Create classroom-ready personalised English homework for a Grade 7 learner.

Student: ${student}
Topic: ${topic}
Main score: ${latestMainScore||"unknown"}
Final adaptive level: ${finalLevel||"unknown"}
Weak area: ${weakAreas||focus}
Latest personal practice: ${latestPersonalPractice||"not completed"}
Assigned difficulty: ${difficulty}
Primary focus: ${focus}

Requirements:
- Past Simple only.
- Focus mainly on the weak area.
- Exactly 3 sections.
- Exactly 4 student items per section (12 total).
- Do not put answers inside questions.
- Provide exactly 12 concise answer-key entries.
- Easy = scaffolded recognition/completion/correction.
- Medium = consolidation, error correction, transformation, context.
- Hard = extension, contextual grammar, transformation, short writing.
`;

  const schema={
    type:"object",
    properties:{
      homework:{
        type:"object",
        properties:{
          title:{type:"string"},
          student:{type:"string"},
          focus:{type:"string"},
          difficulty:{type:"string",enum:["Easy","Medium","Hard"]},
          sections:{
            type:"array",minItems:3,maxItems:3,
            items:{
              type:"object",
              properties:{
                title:{type:"string"},
                instructions:{type:"string"},
                items:{type:"array",minItems:4,maxItems:4,items:{type:"string"}}
              },
              required:["title","instructions","items"]
            }
          },
          answerKey:{type:"array",minItems:12,maxItems:12,items:{type:"string"}}
        },
        required:["title","student","focus","difficulty","sections","answerKey"]
      }
    },
    required:["homework"]
  };

  try{
    const r=await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-goog-api-key":process.env.GEMINI_API_KEY
        },
        body:JSON.stringify({
          contents:[{parts:[{text:prompt}]}],
          generationConfig:{
            responseMimeType:"application/json",
            responseSchema:schema
          }
        })
      }
    );

    const data=await r.json();

    if(!r.ok){
      console.error("Gemini homework error:",JSON.stringify(data));
      return res.status(200).json({
        homework:fallback,
        source:"fallback",
        warning:data?.error?.message||"Gemini request failed"
      });
    }

    const text=data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!text){
      return res.status(200).json({
        homework:fallback,
        source:"fallback",
        warning:"Gemini returned no text"
      });
    }

    try{
      const parsed=JSON.parse(text);
      if(parsed?.homework?.sections?.length===3){
        return res.status(200).json({homework:parsed.homework,source:"gemini"});
      }
    }catch(parseErr){
      console.error("Homework JSON parse error:",parseErr);
    }

    return res.status(200).json({
      homework:fallback,
      source:"fallback",
      warning:"Gemini output was invalid"
    });

  }catch(err){
    console.error("Homework generation exception:",err);
    return res.status(200).json({
      homework:fallback,
      source:"fallback",
      warning:String(err)
    });
  }
}
