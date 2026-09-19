// Adaptive Past Simple question generator using Gemini API.
// Keep GEMINI_API_KEY in Vercel Environment Variables only.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });

  const { level = 2, previousConcept = "general", previousWrong = false } = req.body || {};
  const safeLevel = Math.max(1, Math.min(4, Number(level) || 2));

  const levelGuide = {
    1: "very easy recognition. Use obvious time signals such as yesterday, last night, or last week. Test one basic rule only.",
    2: "standard Grade 7 controlled practice. Mix affirmative, negative, and simple Did questions.",
    3: "more challenging controlled use. Include irregular verbs, error recognition, or close distractors.",
    4: "advanced Grade 7 application. Use short contexts, error correction, or transformation-style multiple choice."
  };

  const remediation = previousWrong
    ? `The learner got the previous item wrong. Keep the SAME concept (${previousConcept}) but make this question clearer and more scaffolded.`
    : `The learner answered correctly. You may introduce a slightly more demanding Past Simple concept appropriate to this level.`;

  const prompt = `
Create ONE multiple-choice Past Simple grammar question for a Grade 7 learner.

Adaptive level: ${safeLevel}
Level description: ${levelGuide[safeLevel]}
Previous concept: ${previousConcept}
Adaptive instruction: ${remediation}

Requirements:
- Test ONLY Past Simple.
- Exactly 4 answer choices.
- Exactly one correct answer.
- Age-appropriate, natural English.
- Avoid ambiguity.
- Provide a concise explanation.
- Provide a short concept label.
- "answer" is a zero-based index: 0, 1, 2, or 3.
`.trim();

  const responseSchema = {
    type: "object",
    properties: {
      question: {
        type: "object",
        properties: {
          q: { type: "string" },
          options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
          answer: { type: "integer", minimum: 0, maximum: 3 },
          explain: { type: "string" },
          concept: { type: "string" }
        },
        required: ["q", "options", "answer", "explain", "concept"]
      }
    },
    required: ["question"]
  };

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Gemini API request failed." });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(502).json({ error: "Gemini returned no text." });

    const parsed = JSON.parse(text);
    return res.status(200).json({ question: parsed.question });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error while generating question." });
  }
}
