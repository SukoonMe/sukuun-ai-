import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  // Default fallback avatar agar kuch gadbad ho
  const defaultAvatar = 'best'; 
  
  try {
    // 1. History fetch karo
    const rawHistory = await redis.lrange(`chat:${userProfile.name}`, 0, 10) || [];
    const context = rawHistory.map(item => JSON.parse(item)).reverse().map(m => `${m.role}: ${m.content}`).join("\n");

    // 2. API Call (v1 endpoint)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are Sukuun. Context: ${context}\nUser: ${message}` }] }]
      })
    });

    const data = await response.json();
    
    // Check if candidates exist
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      throw new Error("No response from AI");
    }

    const reply = data.candidates[0].content.parts[0].text;
    const avatarType = userProfile.gender === 'male' ? 'female' : 'male';

    // 3. Save History
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "Sukuun", content: reply }));

    res.status(200).json({ reply, avatarType });
  } catch (e) {
    console.error("Chat Error:", e);
    // Error ki situation mein bhi avatarType bhej rahe hain taaki UI na toote
    res.status(500).json({ 
      reply: "Sukoon abhi thodi busy hai... 🌸", 
      avatarType: defaultAvatar 
    });
  }
}
