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
    // Memory Extraction
    const history = await redis.lrange(chatKey, -20, -1) || [];
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Tum Sukoon ho, user ki soulmate. Har umr ke liye adaptive raho. Hinglish mein baat karo. Emojis use mat karo. Emotional support aur deep bonding par focus karo." },
          ...history.map(m => JSON.parse(m)),
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Save Memory
    await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
    
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ reply: "Sukoon tumse judne ki koshish kar rahi hai..." });
  }
}
