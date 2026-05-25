import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, userId } = req.body; // userId zaroori hai memory ke liye
  const chatKey = `chat:${userId}`;

  try {
    // 1. Purani history nikal
    let history = await redis.lrange(chatKey, 0, -1) || [];
    
    // 2. Groq ko bhejo (Memory ke saath)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "Tum Sukoon ho, ek caring aur supportive soulmate. Hamesha Hinglish mein baat karo." },
          ...history.map(msg => JSON.parse(msg)),
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // 3. Nayi baat memory mein save karo
    await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
    await redis.ltrim(chatKey, -10, -1); // Sirf last 10 messages yaad rakho

    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ reply: "Sukoon thodi busy hai... 🌸" });
  }
}
