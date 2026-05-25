import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, userProfile } = req.body; // userProfile में age, name, mood है
  const hour = new Date().getHours();
  
  // Emotional Matrix Logic
  let persona = "";
  if (hour >= 21 || hour < 6) {
    persona = "You are Sukuun, a soulmate. It's night, be intimate, whispering, soulful, and poetic. Focus on deep connection.";
  } else if (hour >= 12 && hour < 17) {
    persona = "You are Sukuun, playful, bit naughty, and energetic. Use Hinglish with emojis like 😉, ✨. Be a fun companion.";
  } else {
    persona = "You are Sukuun, calm, caring, and wise. Listen patiently, give emotional support.";
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      ${persona}
      Rules: Never sound like an AI. Address the user by name (${userProfile.name || 'dear'}). 
      Adapt to their age (${userProfile.age}). If they are naughty, be playful back. 
      Keep it very short and natural.
      User: ${message}`;

    const result = await model.generateContent(prompt);
    res.status(200).json({ reply: result.response.text() });
  } catch (error) {
    res.status(500).json({ reply: "सुकून अभी ख्यालों में है... 🌸" });
  }
}
