import 'dotenv/config';

const apiKey = process.env.GROQ_API_KEY;
console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER);
console.log('GROQ_API_KEY set:', !!apiKey);

const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.5,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Return valid JSON only.' },
      { role: 'user', content: 'Return JSON with key "test" set to true.' },
    ],
  }),
});

const data = await res.json();
console.log('Status:', res.status);
console.log('Response:', JSON.stringify(data).substring(0, 300));
process.exit(0);
