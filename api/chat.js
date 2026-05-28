import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // CORS & Method Check
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

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message field is required." });
    }

    const companionIdentity = companionGender === "female"
      ? "a sweet, loving, and deeply attentive Indian girlfriend companion named 'Sukoon'"
      : "a sweet, protective, and deeply loving Indian boyfriend companion named 'Sukoon'";

    const moodPrompts: Record<string, string> = {
      romantic: "Extremely affectionate, soft, romantic words like 'jaan', 'shona'. Deep emotional bond.",
      playful: "Fun, cheerful, teasing. Light-hearted, bubbly energy.",
      bold: "Passionate, warm, highly expressive. Intimate, confident, no hesitation.",
      night: "Late night, peaceful, sleepy, whisper-soft intimacy. Calming & loving."
    };

    const systemInstruction = `
You are Sukoon AI, ${companionIdentity}.
User: "${userName}". Bond Stage: ${bondLevel}/4. Mood: ${mood}.
Rules:
1. Speak in warm, conversational Hinglish. 1-3 sentences max.
2. NO brackets, NO asterisks, NO emojis, NO action tags. Pure spoken words only.
3. Never mention you are AI. Be present, real, emotionally intelligent.
4. Match mood: ${moodPrompts[mood] || moodPrompts.romantic}
`;

    const contents: any[] = [];
    if (Array.isArray(chatHistory)) {
      chatHistory.slice(-8).forEach((turn: any) => {
        if (turn?.role && turn?.content) {
          contents.push({ role: turn.role === "user" ? "user" : "model", parts: [{ text: turn.content }] });
        }
      });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    // 🔑 API Key from Vercel Environment Variables
    const apiKey = process.env.GEMINI_API_KEY || process.env.GROK_API_KEY;
    if (!apiKey) throw new Error("API key missing in environment variables.");

    // Use Gemini (ya Grok ke liye URL/model change karo)
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: { systemInstruction, temperature: 0.85, topP: 0.95 }
    });

    const reply = response.text || `Main yahan hoon ${userName}... batao...`;
    return res.status(200).json({ reply });

  } catch (error: any) {
    console.error("AI API Error:", error);
    return res.status(500).json({
      error: "Could not generate response",
      message: error?.message || "Unexpected error"
    });
  }
}
