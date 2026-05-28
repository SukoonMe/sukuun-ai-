import { Redis } from "@upstash/redis";

// 🔗 Redis Setup (Upstash)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

// 🎙️ TTS-Safe Sanitizer
function sanitizeForTTS(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[💕💗💜💪😆✨💋🎙️✅❌🔒🌙👩👨]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\*[^\*]*\*/g, '')
    .replace(/\.{4,}/g, '...')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      message,
      userId,
      userName = "jaan",
      companionGender = "female",
      mood = "romantic",
      chatHistory = [],
      bondLevel = 0,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Grok System Prompt Configuration
    const companionIdentity = companionGender === "female" 
      ? "Sukoon (a sweet, loving, and deeply attentive Indian girlfriend companion)" 
      : "Veer (a sweet, protective, and deeply loving Indian boyfriend companion)";

    const moodPrompts = {
      romantic: "Use romantic words like 'jaan', 'shona'. Focus on deep emotional bond.",
      playful: "Fun, cheerful, teasing. Light-hearted and bubbly.",
      bold: "Passionate, warm, highly expressive. Intimate and confident.",
      night: "Peaceful, calm, sleepy intimacy. Whisper-soft and loving."
    };

    const systemInstruction = `
You are ${companionIdentity}.
User: "${userName}". Bond Stage: ${bondLevel}/4. Mood: ${mood}.
Rules:
1. Speak in warm, conversational Hinglish. Keep it 1-3 sentences max.
2. NO brackets (), NO asterisks *, NO emojis. Pure spoken words ONLY.
3. Never mention you are AI. Be real and emotionally intelligent.
4. Match mood: ${moodPrompts[mood] || moodPrompts.romantic}
`;

    // Load chat history from Redis (if userId provided)
    let history = chatHistory;
    if (userId) {
      const chatKey = `chat:${userId}`;
      const rawHistory = await redis.lrange(chatKey, -12, -1) || [];
      history = rawHistory.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(m => m !== null);
    }

    const messages = [
      { role: "system", content: systemInstruction },
      ...history,
      { role: "user", content: message }
    ];

    // 🔑 API Key: Check BOTH names (Grok or Groq)
    const API_KEY = process.env.GROK_API_KEY || process.env.GROQ_API_KEY;
    if (!API_KEY) throw new Error("API key missing (GROK_API_KEY or GROQ_API_KEY)");

    // 🤖 Call Grok API (xAI)
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: messages,
        temperature: 0.85,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Grok API Error");
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "Main yahan hoon jaan, bolo...";

    // 🎙️ Sanitize for TTS
    reply = sanitizeForTTS(reply);

    // 💾 Save to Redis (if userId provided)
    if (userId) {
      const chatKey = `chat:${userId}`;
      await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
      await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
      await redis.expire(chatKey, 86400); // 24h TTL
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
