// api/chat.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { message, userId } = req.body;
  const chatKey = `chat:${userId}`;

  try {
    const rawHistory = await redis.lrange(chatKey, -10, -1) || [];
    // Sirf wahi messages lo jo valid JSON hain
    const history = rawHistory.map(m => {
        try { return JSON.parse(m); } catch { return null; }
    }).filter(m => m !== null);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Tum Sukoon ho. Hinglish mein baat karo. Markdown symbols (stars/hashes) ka use mat karo." },
          ...history,
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
    
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ reply: "Sukoon tumse judne mein thoda waqt le rahi hai..." });
  }
}
