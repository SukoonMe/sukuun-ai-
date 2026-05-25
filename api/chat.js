import { GoogleGenerativeAI } from "@google/generative-ai";
import { Redis } from "@upstash/redis"; // Memory plugin

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  const hour = new Date().getHours();
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  // 1. Memory fetch karo
  const history = await redis.lrange(`chat:${userProfile.name}`, 0, 10) || [];
  const context = history.reverse().map(m => `${m.role}: ${m.content}`).join("\n");

  // 2. Tumhara Persona Logic
  let persona = (hour >= 21 || hour < 6) 
    ? `You are Sukuun, a soulmate. It's night time. Your form is ${avatarType}. Speak in conversational, intimate, romantic Hinglish. Address ${userProfile.name} with affection. Keep responses short, whispering.`
    : `You are Sukuun. Your form is ${avatarType}. Be playful, mysterious, and teasing. Speak in natural Hinglish. Engage with ${userProfile.name}.`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
   // Bas model ka naam likho, "models/" prefix hata do
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // 3. Prompt mein Context (Memory) daalo
    const prompt = `${persona}\n\nChat History:\n${context}\n\nUser: ${message}\nSukuun:`;
    
    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    
    // 4. Nayi baatein memory mein save karo
    await redis.rpush(`chat:${userProfile.name}`, { role: "user", content: message });
    await redis.rpush(`chat:${userProfile.name}`, { role: "Sukuun", content: reply });
    
    res.status(200).json({ reply, avatarType });
    
  } catch (e) {
    console.error("DEBUG ERROR:", e);
    res.status(500).json({ reply: "सुकून अभी ख्यालों में खोई है...", avatarType });
  }
}
