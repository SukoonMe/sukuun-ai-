import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { message, userId } = req.body;
  
  try {
    // 1. User ka naam fetch karo Redis se
    let userName = await redis.get(`name:${userId}`);
    
    // 2. Memory Load karo
    const chatKey = `chat:${userId}`;
    const rawHistory = await redis.lrange(chatKey, -10, -1) || [];
    const history = rawHistory.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(m => m !== null);

    // 3. AI Prompt mein naam inject karo
    const systemPrompt = `Tum Sukoon ho, user ki soulmate. ${userName ? 'User ka naam ' + userName + ' hai.' : 'Agar user apna naam bataye, to use yaad rakhna.'} Hinglish mein baat karo. Emojis use mat karo. Raat ke waqt emotional support do.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // 4. Agar user ne naam bataya ho, to detect karke save karo (Smart Logic)
    if (!userName && (message.toLowerCase().includes("mera naam") || message.toLowerCase().includes("naam hai"))) {
       // Yahan tum simple regex se naam extract kar sakte ho
       const nameMatch = message.match(/(?:naam|name) (?:hai|is) ([a-zA-Z]+)/i);
       if (nameMatch) {
           await redis.set(`name:${userId}`, nameMatch[1]);
       }
    }

    await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
    
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ reply: "Sukoon abhi thodi busy hai..." });
  }
}
