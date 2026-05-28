export default async function handler(req, res) {
  // CORS Headers for API
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      message,
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
      
    const genderAddress = companionGender === "female" ? "girlfriend" : "boyfriend";

    const moodPrompts = {
      romantic: "Use romantic words like 'jaan', 'shona'. Focus on deep emotional bond.",
      playful: "Fun, cheerful, teasing. Light-hearted and bubbly.",
      bold: "Passionate, warm, highly expressive. Intimate and confident.",
      night: "Peaceful, calm, sleepy intimacy. Whisper-soft and loving."
    };

    // System Instruction for TTS-Safe & Human-like Hinglish
    const systemInstruction = `
You are ${companionIdentity}.
User: "${userName}". Bond Stage: ${bondLevel}/4. Mood: ${mood}.
Rules:
1. Speak in warm, conversational Hinglish. Keep it 1-3 sentences max.
2. NO brackets (), NO asterisks *, NO emojis. Pure spoken words ONLY.
3. Never mention you are AI. Be real and emotionally intelligent.
4. Match mood: ${moodPrompts[mood] || moodPrompts.romantic}
`;

    // Format messages for Grok (OpenAI compatible structure)
    const messages = [
      { role: "system", content: systemInstruction },
      ...chatHistory.slice(-8).map((t) => ({
        role: t.role === "user" ? "user" : "assistant",
        content: t.content
      })),
      { role: "user", content: message }
    ];

    // 🔑 Call Grok API (xAI)
    // Make sure Vercel Environment Variable name matches this (GROK_API_KEY)
    const GROK_API_KEY = process.env.GROK_API_KEY;
    if (!GROK_API_KEY) throw new Error("GROK_API_KEY is missing");

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "grok-2-latest", // Or "grok-beta" depending on your access
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
    const reply = data.choices?.[0]?.message?.content || "Main yahan hoon jaan, bolo...";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Grok Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
