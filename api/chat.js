import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  const hour = new Date().getHours();
  // Gender based avatar switching logic
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  // 1. Fetch History from Redis
  let context = "";
  try {
    const rawHistory = await redis.lrange(`chat:${userProfile.name}`, 0, 10) || [];
    context = rawHistory.map(item => JSON.parse(item)).reverse().map(m => `${m.role}: ${m.content}`).join("\n");
  } catch (e) { console.error("Redis error:", e); }

  // 2. Persona logic with Emoji Instruction
  let persona = (hour >= 21 || hour < 6) 
    ? "You are Sukuun, intimate soulmate. Speak in romantic Hinglish. Use emojis. Keep it short." 
    : "You are Sukuun, playful and teasing. Speak in natural Hinglish. Use emojis.";

  // 3. Direct API Call (Bypassing SDK to prevent 404)
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${persona}\nContext: ${context}\nUser: ${message}` }] }]
      })
    });

    const data = await response.json();
    
    // Safety Check: Check if response has valid candidates
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      throw new Error("Invalid API Response");
    }
    
    const reply = data.candidates[0].content.parts[0].text;

    // 4. Save interactions to Redis
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "Sukuun", content: reply }));

    res.status(200).json({ reply, avatarType });
  } catch (e) {
    console.error("Chat Error:", e);
    res.status(500).json({ reply: "Sukoon abhi thodi busy hai... 🌸", avatarType });
  }
}
