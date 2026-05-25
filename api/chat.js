import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userId } = req.body;
  const chatKey = `chat:${userId}`;

  try {
    // 1. Redis se purani baatein uthao
    const history = await redis.lrange(chatKey, -10, -1) || []; 
    const formattedHistory = history.map(msg => JSON.parse(msg));

    // 2. Groq ko bhejo (Memory ke saath)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: "Tum Sukoon ho, meri soulmate. Hinglish mein baat karo. Short, sweet aur emotional support do." },
          ...formattedHistory,
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    if (!data.choices) {
      throw new Error(data.error?.message || "Groq API error");
    }

    const reply = data.choices[0].message.content;

    // 3. Nayi baatein Redis mein save karo
    await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
    await redis.ltrim(chatKey, -20, -1); // Sirf last 20 messages yaad rakho

    res.status(200).json({ reply });

  } catch (e) {
    console.error("DEBUG:", e);
    res.status(500).json({ reply: "Sukoon thodi uljhan mein hai... 🌸" });
  }
}
