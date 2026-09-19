// Vercel Serverless Function using Gemini API
// Keep GEMINI_API_KEY in Vercel Environment Variables only.
// Do NOT put your Gemini API key in GitHub or index.html.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured on Vercel."
    });
  }

  const { student, topic, mastery } = req.body || {};

  const topicName =
    topic === "past"
      ? "Past Simple"
      : topic === "present"
      ? "Present Simple"
      : null;

  if (!topicName) {
    return res.status(400).json({ error: "Invalid topic." });
  }

  const safeMastery = Number.isFinite(Number(mastery))
    ? Math.max(0, Math.min(100, Number(mastery)))
    : 60;

  const difficulty =
    safeMastery >= 85
      ? "advanced but appropriate for lower-secondary learners"
      : safeMastery >= 65
      ? "intermediate"
      : "foundation-to-intermediate with clear distractors";

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
- Use exactly 4 answer choices per question.
- Exactly one answer must be correct.
- Avoid ambiguous items.
- Do not repeat the same sentence pattern too often.
- Each explanation should be concise and teach the grammar rule.
- "answer" must be the zero-based index of the correct option: 0, 1, 2, or 3.
`.trim();

  const responseSchema = {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 10,
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            q: { type: "string" },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { type: "string" }
            },
            answer: {
              type: "integer",
              minimum: 0,
              maximum: 3
            },
            explain: { type: "string" }
          },
          required: ["q", "options", "answer", "explain"]
        }
      }
    },
    required: ["questions"]
  };

  try {
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", data);

      return res.status(geminiResponse.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({
        error: "Gemini returned no text."
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error("Invalid Gemini JSON:", text);

      return res.status(502).json({
        error: "Gemini returned invalid JSON."
      });
    }

    if (
      !Array.isArray(parsed.questions) ||
      parsed.questions.length !== 10
    ) {
      return res.status(502).json({
        error: "Gemini did not return exactly 10 questions."
      });
    }

    const valid = parsed.questions.every(
      (item) =>
        typeof item.q === "string" &&
        Array.isArray(item.options) &&
        item.options.length === 4 &&
        Number.isInteger(item.answer) &&
        item.answer >= 0 &&
        item.answer <= 3 &&
        typeof item.explain === "string"
    );

    if (!valid) {
      return res.status(502).json({
        error: "Generated question format was invalid."
      });
    }

    return res.status(200).json({
      questions: parsed.questions
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error while generating questions."
    });
  }
}
