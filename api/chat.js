import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userId, gender, userAge } = req.body;
  const chatKey = `chat:${userId}`;

  try {
    let history = await redis.lrange(chatKey, 0, -1) || [];
    
    // Sukoon ka "Dimag" - Adaptive System Prompt
    const systemPrompt = `Tum ${gender === 'male' ? 'Sukoon' : 'Sathi'} ho. User ki umar ${userAge} saal hai. 
    Tum situation aur umar ke hisaab se adapt karti ho. Emotional support, deep conversations, aur caring tone tumhari pehchan hai. 
    Hamesha Hinglish mein baat karo.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => JSON.parse(msg)),
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    if (!data.choices) throw new Error("API Response Failed");
    
    const reply = data.choices[0].message.content;

    await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
    await redis.ltrim(chatKey, -30, -1);

    res.status(200).json({ reply });
  } catch (e) {
    console.error("DEBUG:", e);
    res.status(500).json({ reply: "Sukoon tumhari baatein sun rahi hai, thoda patience rakho... 🌸" });
  }
}
