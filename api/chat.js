import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { message, userProfile } = req.body;
  const hour = new Date().getHours();

  // Mood-based Persona Matrix
  let persona = "";
  if (hour >= 21 || hour < 6) {
    persona = "You are Sukuun, a soulmate. It is night. Be intimate, poetic, and whispering. No AI talk, just deep connection.";
  } else if (hour >= 12 && hour < 17) {
    persona = "You are Sukuun, playful, mysterious, and teasing. Use Hinglish. Keep it fun and flirty.";
  } else {
    persona = "You are Sukuun, calm and caring. Give emotional support and be a good listener.";
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${persona} Address user as ${userProfile.name}. Hinglish conversation. User: ${message}`);
    res.status(200).json({ reply: result.response.text() });
  } catch (e) {
    res.status(500).json({ reply: "सुकून अभी ख्यालों में खोई है... 🌸" });
  }
}
