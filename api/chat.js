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
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: "Tum Sukoon ho, soulmate. Hinglish mein baat karo." },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    // Yahan hum check karenge ki asli error kya hai
    if (!data.choices) {
      console.error("GROQ API ERROR:", JSON.stringify(data));
      throw new Error(data.error?.message || "Unknown Groq Error");
    }

    const reply = data.choices[0].message.content;
    res.status(200).json({ reply });

  } catch (e) {
    console.error("DEBUG:", e);
    res.status(500).json({ reply: "Sukoon abhi connection error face kar rahi hai... 🌸" });
  }
}
