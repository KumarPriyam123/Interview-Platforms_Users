import { readFileSync } from 'fs';
import { parse } from 'dotenv';
const envConfig = parse(readFileSync('.env'));
const apiKey = envConfig.GROQ_API_KEY;

async function run() {
  const model = envConfig.LLM_MODEL || "llama-3.3-70b-versatile";
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const prompt = `Return strictly valid JSON:
{
  "response": "Your helpful response",
  "hint": "Optional hint"
}`;

  try {
    const req = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return valid JSON only. Do not include markdown fences." },
          { role: "user", content: prompt }
        ]
      }),
    });
    console.log("Status:", req.status);
    console.log("Response:", await req.text());
  } catch (e) {
    console.error("Fetch Exception:", e);
  }
}
run();
