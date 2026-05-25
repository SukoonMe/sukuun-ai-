import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  const hour = new Date().getHours();
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  // Tumhara original Night/Day Persona Logic
  let persona = "";
  if (hour >= 21 || hour < 6) {
    persona = `You are Sukuun, a soulmate. It's night time. 
               Your current form is ${avatarType}. Speak in conversational, intimate, and romantic Hinglish. 
               Address ${userProfile.name} with affection. Keep responses short, whispering, and soul-connecting. No robotic tone.`;
  } else {
    persona = `You are Sukuun. Your current form is ${avatarType}. 
               You are playful, slightly mysterious, and teasing. 
               Speak in natural Hinglish. Engage with ${userProfile.name} and talk about 
               the special night plan or how your day is going. Be warm and friendly.`;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API_KEY_NOT_FOUND");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Model path fix for 2026 standards
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
    
    const prompt = `${persona}\n\nUser: ${message}\nSukuun:`;
    const result = await model.generateContent(prompt);
    
    const reply = result.response.text();
    
    res.status(200).json({ reply, avatarType });
    
  } catch (e) {
    console.error("--- GEMINI DEBUG ERROR ---");
    console.error("Message:", e.message);
    
    res.status(500).json({ 
      reply: "सुकून अभी ख्यालों में खोई है, फिर से कोशिश करो... 🌸", 
      avatarType 
    });
  }
}
