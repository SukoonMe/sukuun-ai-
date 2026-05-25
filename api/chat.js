import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  
  try {
    const rawHistory = await redis.lrange(`chat:${userProfile.name}`, 0, 10) || [];
    const context = rawHistory.map(item => JSON.parse(item)).reverse().map(m => `${m.role}: ${m.content}`).join("\n");

    // FIXED: Using gemini-1.5-flash-001 which is the base stable version
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are Sukuun. Context: ${context}\nUser: ${message}` }] }]
      })
    });

    const data = await response.json();
    
    if (!data.candidates) {
      console.error("API ERROR:", JSON.stringify(data));
      throw new Error("Invalid Response");
    }

    const reply = data.candidates[0].content.parts[0].text;
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "Sukuun", content: reply }));

    res.status(200).json({ reply, avatarType: userProfile.gender === 'male' ? 'female' : 'male' });
  } catch (e) {
    res.status(500).json({ reply: "Sukoon abhi busy hai... 🌸", avatarType: "best" });
  }
}
