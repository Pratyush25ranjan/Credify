import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function analyzeWithAI(text, articles) {
  try {
    const topHeadlines = articles
      .slice(0, 5)
      .map((a, i) => `${i + 1}. ${a.title}`)
      .join("\n");

    const prompt = `
You are a fact-checking AI.

User claim:
"${text}"

Related news headlines:
${topHeadlines}

Tasks:
1. Determine if the claim is likely TRUE, FALSE, or UNCERTAIN
2. Give a confidence score (0 to 1)
3. Give a short explanation (2-3 lines)

Respond ONLY in JSON:
{
  "verdict": "TRUE | FALSE | UNCERTAIN",
  "confidence": number,
  "explanation": "..."
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    // Try parsing JSON safely
    try {
      return JSON.parse(response);
    } catch {
      return {
        verdict: "UNCERTAIN",
        confidence: 0.5,
        explanation: response,
      };
    }

  } catch (error) {
    console.error("Gemini Error:", error.message);

    return {
      verdict: "UNCERTAIN",
      confidence: 0.5,
      explanation: "AI analysis failed",
    };
  }
}