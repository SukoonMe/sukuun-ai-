import { GoogleGenerativeAI } from "@google/generative-ai";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  const hour = new Date().getHours();
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  // 1. Memory Fetch (JSON Parse)
  let context = "";
  try {
    const rawHistory = await redis.lrange(`chat:${userProfile.name}`, 0, 10) || [];
    const history = rawHistory.map(item => JSON.parse(item));
    context = history.reverse().map(m => `${m.role}: ${m.content}`).join("\n");
  } catch (err) {
    console.error("Redis Error:", err);
  }

  let persona = (hour >= 21 || hour < 6) 
    ? `You are Sukuun, a soulmate. It's night time. Speak in intimate, romantic Hinglish. Address ${userProfile.name} with affection.`
    : `You are Sukuun. Be playful, mysterious, and teasing. Speak in natural Hinglish. Engage with ${userProfile.name}.`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Yahan hum model ka path properly specify kar rahe hain
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `${persona}\n\nChat History:\n${context}\n\nUser: ${message}\nSukuun:`;
    
    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    
    // Save to Memory
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(`chat:${userProfile.name}`, JSON.stringify({ role: "Sukuun", content: reply }));
    
    res.status(200).json({ reply, avatarType });
  } catch (e) {
    console.error("DEBUG ERROR:", e);
    // Agar Gemini fail ho, toh fallback response
    res.status(500).json({ reply: "सुकून अभी ख्यालों में खोई है, फिर से कोशिश करो... 🌸", avatarType });
  }
}
