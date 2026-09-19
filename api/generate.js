// Vercel Serverless Function
// Keep OPENAI_API_KEY in Vercel Environment Variables only.

function extractText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return parts.join("\n").trim();
}

function cleanJsonText(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured on Vercel." });
  }

  const { student, topic, mastery } = req.body || {};
  const topicName =
    topic === "past" ? "Past Simple" :
    topic === "present" ? "Present Simple" :
    null;

  if (!topicName) {
    return res.status(400).json({ error: "Invalid topic." });
  }

  const safeMastery = Number.isFinite(Number(mastery))
    ? Math.max(0, Math.min(100, Number(mastery)))
    : 60;

  const difficulty =
    safeMastery >= 85 ? "advanced but appropriate for lower-secondary learners" :
    safeMastery >= 65 ? "intermediate" :
    "foundation-to-intermediate with clear distractors";

  const prompt = `
You are generating English grammar practice for a lower-secondary learner.

Student label: ${String(student || "Student")}
Target grammar: ${topicName}
Current mastery estimate: ${safeMastery}%
Difficulty: ${difficulty}

Create exactly 10 multiple-choice questions.

Requirements:
- Focus ONLY on ${topicName}.
- Use age-appropriate everyday contexts.
- Include a balanced mix of affirmative, negative, and question forms.
- Use 4 answer choices per question.
- Exactly one answer must be correct.
- Avoid ambiguous items.
- Do not repeat the same sentence pattern too often.
- Each explanation should be concise and teach the grammar rule.
- "answer" must be the zero-based index of the correct option: 0, 1, 2, or 3.

Return ONLY valid JSON in exactly this structure:
{
  "questions": [
    {
      "q": "Question text",
      "options": ["A", "B", "C", "D"],
      "answer": 0,
      "explain": "Short explanation"
    }
  ]
}
`.trim();

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: prompt,
        reasoning: { effort: "none" }
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI API error:", data);
      return res.status(openaiResponse.status).json({
        error: data?.error?.message || "OpenAI API request failed."
      });
    }

    const text = cleanJsonText(extractText(data));
    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Could not parse model JSON:", text);
      return res.status(502).json({ error: "The model returned invalid JSON." });
    }

    if (!Array.isArray(parsed.questions) || parsed.questions.length !== 10) {
      return res.status(502).json({ error: "The model did not return exactly 10 questions." });
    }

    const valid = parsed.questions.every(item =>
      typeof item.q === "string" &&
      Array.isArray(item.options) &&
      item.options.length === 4 &&
      Number.isInteger(item.answer) &&
      item.answer >= 0 &&
      item.answer <= 3 &&
      typeof item.explain === "string"
    );

    if (!valid) {
      return res.status(502).json({ error: "The generated question format was invalid." });
    }

    return res.status(200).json({ questions: parsed.questions });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error while generating questions." });
  }
}
