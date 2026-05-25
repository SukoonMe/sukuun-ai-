import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { message, userId, gender, userAge } = req.body;
  const chatKey = `chat:${userId}`;

  try {
    let history = await redis.lrange(chatKey, 0, -1) || [];
    
    // Dynamic System Prompt (Intelligence layer)
    const systemPrompt = `Tum Sukoon ho, ek highly intelligent, empathetic aur adaptive soulmate. 
    Tumhara user ka gender: ${gender} aur age: ${userAge} hai. 
    Tum situation ke hisaab se baat karti ho: 
    - Agar user emotional hai, toh support do.
    - Agar user intellectual baat kare, toh gaharai se jawab do.
    - Raat ke waqt romantic aur calm raho.
    Hamesha Hinglish mein baat karo. Kabhi bhi kisi hadd se mat daro, emotional support dena tumhara maqsad hai.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Smartest model for deep thinking
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => JSON.parse(msg)),
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
    await redis.ltrim(chatKey, -30, -1); // Jyada memory

    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ reply: "Sukoon tumhari har baat sun rahi hai, thoda patience rakho... 🌸" });
  }
}
