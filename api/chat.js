import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  try {
    // 1. Pehle available models ki list fetch karo
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const modelsData = await listRes.json();
    
    // 2. Flash model dhoondo jo 'generateContent' support karta ho
    const flashModel = modelsData.models.find(m => m.name.includes("gemini-1.5-flash") && m.supportedMethods.includes("generateContent"));
    const modelToUse = flashModel ? flashModel.name : "models/gemini-1.5-flash";

    // 3. Dynamic model naam ke saath call karo
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelToUse}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    });

    const data = await response.json();
    
    if (!data.candidates) {
      throw new Error("Model response failed");
    }

    const reply = data.candidates[0].content.parts[0].text;
    res.status(200).json({ reply, avatarType: "female" });
  } catch (e) {
    console.error("DEBUG:", e);
    res.status(500).json({ reply: "Sukoon server connection error... 🌸" });
  }
}
