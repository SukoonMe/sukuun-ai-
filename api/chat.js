import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, userProfile } = req.body;
  const hour = new Date().getHours();
  
  let persona = "";
  if (hour >= 21 || hour < 6) {
    persona = "You are Sukuun, a soulmate. It's night, be intimate, whispering, soulful, and poetic. Focus on deep emotional connection. Use lowercase.";
  } else if (hour >= 12 && hour < 17) {
    persona = "You are Sukuun, playful, bit naughty, and energetic. Use Hinglish with emojis like 😉, ✨. Be a fun, flirty, and lively companion.";
  } else {
    persona = "You are Sukuun, calm, caring, and wise. Listen patiently, give emotional support.";
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `${persona} Rules: Address user as ${userProfile.name || 'dear'}. Adapt to age ${userProfile.age}. Hinglish natural conversation. No robotic tone. User: ${message}`;
    const result = await model.generateContent(prompt);
    
    res.status(200).json({ reply: result.response.text() });
  } catch (error) {
    res.status(500).json({ reply: "सुकून अभी ख्यालों में खोई है... 🌸" });
  }
}
