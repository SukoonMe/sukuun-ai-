import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  try {
    // 1. Fetch History
    const rawHistory = await redis.lrange(`chat:${userProfile.name}`, 0, 10) || [];
    const context = rawHistory.map(item => JSON.parse(item)).reverse().map(m => `${m.role}: ${m.content}`).join("\n");

    // 2. API Call
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are Sukuun. Context: ${context}. User: ${message}` }] }]
      })
    });

    const data = await response.json();

    // DEBUG: Agar data mein error hai, toh yahan dikhega
    if (!data.candidates) {
      console.error("GOOGLE API ERROR:", JSON.stringify(data));
      return res.status(500).json({ reply: "API se response nahi aaya... 🌸", avatarType });
    }

    const reply = data.candidates[0].content.parts[0].text;

    // 3. Save
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "Sukuun", content: reply }));

    res.status(200).json({ reply, avatarType });
  } catch (e) {
    console.error("FATAL ERROR:", e);
    res.status(500).json({ reply: "Sukoon khayalon mein hai... 🌸", avatarType });
  }
}
