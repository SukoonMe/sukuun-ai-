import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  
  try {
    // API URL: v1 version + model name directly (bina 'models/' prefix ke)
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are Sukuun. User: ${message}` }] }]
      })
    });

    const data = await response.json();
    
    if (!data.candidates) {
      // Agar yahan error aaye, toh samajh lo API Key ka scope galat hai
      console.error("API Response Data:", JSON.stringify(data));
      throw new Error("API Path or Model access error");
    }

    const reply = data.candidates[0].content.parts[0].text;
    res.status(200).json({ reply, avatarType: "female" });
  } catch (e) {
    res.status(500).json({ reply: "Sukoon abhi busy hai... 🌸", avatarType: "best" });
  }
}
