import { HOMEWORK_BANK, CHALLENGE_BANK, TOPIC_ALIASES } from "./homework-bank.js";

function scoreRatio(value){
  const m=String(value||"").match(/(\d+)\s*\/\s*(\d+)/);
  if(!m)return null;
  const total=Number(m[2]);
  return total?Number(m[1])/total:null;
}

function normalize(s){
  return String(s||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[–—]/g,"-")
    .replace(/[^a-z0-9/\-]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function resolveTopicId(topic){
  const raw=String(topic||"").toLowerCase().trim();
  if(TOPIC_ALIASES[raw])return TOPIC_ALIASES[raw];
  const n=normalize(topic);
  const entries=Object.entries(TOPIC_ALIASES);
  for(const [label,id] of entries){
    const nl=normalize(label);
    if(n===nl || n.includes(nl) || nl.includes(n))return id;
  }
  if(n.includes("word form"))return "word_form";
  if(n.includes("past simple")&&!n.includes("present"))return "past_simple";
  if(n.includes("present continuous")&&!n.includes("past")&&!n.includes("present simple"))return "present_continuous";
  if(n.includes("present simple")&&!n.includes("past")&&!n.includes("continuous"))return "present_simple";
  return "present_simple";
}

const CONCEPT_ALIASES={
  "third person s es":"s_es","do does":"do_does","negative form":"negative","question form":"questions","questions":"questions",
  "verb be":"be","adverbs of frequency":"frequency","time markers":"time_markers","facts routines":"facts","error correction":"error_correction",
  "am is are v ing":"be_ing","ing spelling":"spelling_ing","now markers":"now_markers","temporary actions":"temporary","context choice":"context",
  "grammar rule":"rule","regular verbs":"regular_verbs","irregular verbs":"irregular_verbs","habit vs action now":"habit_vs_now",
  "routine vs finished past":"routine_vs_past","action now vs past":"now_vs_past","verb form":"form","spelling":"spelling",
  "recognising compliments":"recognition","responding to compliments":"response","dialogue completion":"dialogue","situational language":"situation",
  "polite response":"pragmatics","compliment structure":"compliment_form","and":"and","but":"but","because":"because","so":"so","or":"or",
  "although":"although","reason vs result":"because_so","logical connector":"logic","ed rule":"ed_rule","ed pronunciation":"ed_odd",
  "ed classification":"ed_classification","word stress":"word_stress","time prepositions":"time","place prepositions":"place",
  "like":"like","different from":"different_from","as as":"as_as","not as as":"not_as_as","sentence transformation":"transformation",
  "tense contrast":"contrast","auxiliary verbs":"auxiliary","past verb form":"past_form","subject verb agreement":"subject_verb"
};

function parseWeakConcepts(weakAreas,topicId){
  const raw=String(weakAreas||"");
  if(!raw.trim())return [];
  const chunks=raw.split(/[,;|]+/).map(x=>x.trim()).filter(Boolean);
  const concepts=[];
  for(const chunk of chunks){
    const n=normalize(chunk);
    const unit=n.match(/unit\s*([1-6])/);
    if(topicId==="word_form"&&unit){concepts.push(`unit${unit[1]}`);continue;}
    let found=null;
    for(const [label,concept] of Object.entries(CONCEPT_ALIASES)){
      if(n===label || n.includes(label)){found=concept;break;}
    }
    if(found)concepts.push(found);
  }
  return [...new Set(concepts)];
}

function chooseDifficulty(mainScore,personalScore,finalLevel){
  const main=scoreRatio(mainScore);
  const personal=scoreRatio(personalScore);
  const level=Number(finalLevel)||2;

  // Near-perfect / perfect students move to application work.
  if((main!==null&&main>=0.9) || (main!==null&&main>=0.8&&personal!==null&&personal>=0.8&&level>=3)){
    return "Advanced";
  }
  if((main!==null&&main<=0.5)||level<=2)return "Easy";
  return "Medium";
}

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function levelFits(q,difficulty){
  if(difficulty==="Easy")return q.level<=2;
  if(difficulty==="Medium")return q.level>=2&&q.level<=3;
  return q.level>=3;
}

function pickUnique(pool,count,used){
  const out=[];
  for(const q of shuffle(pool)){
    if(out.length>=count)break;
    if(used.has(q.id))continue;
    used.add(q.id);out.push(q);
  }
  return out;
}

function bankItem(q){
  return {type:"mcq",prompt:q.prompt,options:q.options};
}
function answerFor(q){
  const letters=["A","B","C","D"];
  return `${letters[q.answerIndex]}. ${String(q.options[q.answerIndex]).replace(/\[\[|\]\]/g,"")}`;
}

function makeHomework({student,topic,topicId,difficulty,weakConcepts,weakAreas}){
  const used=new Set();
  const all=HOMEWORK_BANK.filter(q=>q.topic===topicId);
  const levelPool=all.filter(q=>levelFits(q,difficulty));
  const weakPool=weakConcepts.length
    ? levelPool.filter(q=>weakConcepts.includes(q.concept))
    : [];

  const targeted=[];
  // Prefer weak-area questions, but expand levels if the exact pool is small.
  targeted.push(...pickUnique(weakPool,6,used));
  if(targeted.length<6&&weakConcepts.length){
    const expandedWeak=all.filter(q=>weakConcepts.includes(q.concept));
    targeted.push(...pickUnique(expandedWeak,6-targeted.length,used));
  }
  if(targeted.length<6){
    targeted.push(...pickUnique(levelPool,6-targeted.length,used));
  }
  if(targeted.length<6){
    targeted.push(...pickUnique(all,6-targeted.length,used));
  }

  let consolidationCount=difficulty==="Advanced"?4:4;
  let applicationCount=2;
  const consolidation=[];
  consolidation.push(...pickUnique(levelPool,consolidationCount,used));
  if(consolidation.length<consolidationCount){
    consolidation.push(...pickUnique(all,consolidationCount-consolidation.length,used));
  }

  const challenges=shuffle(CHALLENGE_BANK[topicId]||[]).slice(0,applicationCount);
  const application=challenges.map((x,i)=>({id:`challenge_${topicId}_${i}_${Date.now()}`, ...x}));

  // For an advanced student, make more of the worksheet application-oriented.
  if(difficulty==="Advanced"){
    const extraChallenges=shuffle(CHALLENGE_BANK[topicId]||[]).filter(x=>!challenges.includes(x)).slice(0,2);
    if(extraChallenges.length){
      // Replace last two targeted bank items with application tasks.
      targeted.splice(Math.max(0,targeted.length-extraChallenges.length),extraChallenges.length,
        ...extraChallenges.map((x,i)=>({id:`challenge_adv_${topicId}_${i}_${Date.now()}`,...x})));
    }
  }

  const sections=[
    {
      title:difficulty==="Advanced"?"A. Challenge Practice":"A. Targeted Practice",
      instructions:weakConcepts.length?"Complete the exercises focused on your weaker area(s).":"Complete the exercises carefully.",
      items:targeted.map(x=>x.type==="mcq"?bankItem(x):{type:"short",prompt:x.prompt})
    },
    {
      title:difficulty==="Advanced"?"B. Mixed Challenge":"B. Consolidation",
      instructions:"Complete the exercises from the same topic.",
      items:consolidation.map(bankItem)
    },
    {
      title:difficulty==="Advanced"?"C. Application":"C. Apply",
      instructions:"Use what you know in a more applied task.",
      items:application.map(x=>({type:"short",prompt:x.prompt}))
    }
  ];

  const answerKey=[];
  // Build answer key in the same global order as sections.
  for(const x of targeted)answerKey.push(x.type==="mcq"?answerFor(x):x.answer);
  for(const x of consolidation)answerKey.push(answerFor(x));
  for(const x of application)answerKey.push(x.answer);

  return {
    title:`${topic} — Personalised Homework`,
    student,
    focus:weakAreas||"Application / mixed practice",
    difficulty,
    sections,
    answerKey
  };
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const {pin,student="Student",topic="Present Simple tense",latestMainScore,finalLevel,weakAreas,latestPersonalPractice}=req.body||{};
  if(String(pin)!==String(process.env.TEACHER_PIN))return res.status(401).json({error:"Invalid teacher PIN"});

  const topicId=resolveTopicId(topic);
  const difficulty=chooseDifficulty(latestMainScore,latestPersonalPractice,finalLevel);
  const weakConcepts=parseWeakConcepts(weakAreas,topicId);
  const homework=makeHomework({student,topic,topicId,difficulty,weakConcepts,weakAreas});

  return res.status(200).json({
    homework,
    source:"homework-bank",
    topicId,
    weakConcepts
  });
}
