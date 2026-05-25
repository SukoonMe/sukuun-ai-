import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  
  try {
    // 2026 Stable Path: v1beta + models/gemini-1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: message }] }]
      })
    });

    const data = await response.json();
    
    // Check if model returned valid data
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      throw new Error("Model response empty or forbidden");
    }

    const reply = data.candidates[0].content.parts[0].text;
    res.status(200).json({ reply, avatarType: "female" });
  } catch (e) {
    console.error("Critical Error:", e);
    res.status(500).json({ reply: "Sukoon abhi busy hai... 🌸", avatarType: "best" });
  }
}
