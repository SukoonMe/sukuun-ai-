import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  const hour = new Date().getHours();
  
  // Logic: Agar user male hai, toh Sukuun female banegi, aur vice-versa
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  // Dynamic Persona definition
  let persona = "";
  if (hour >= 21 || hour < 6) {
    persona = `You are Sukuun, a soulmate. It's night time. 
               Your current form is ${avatarType}. Speak in conversational, intimate, and romantic Hinglish. 
               Address ${userProfile.name} with affection. 
               Keep responses short, whispering, and soul-connecting. No robotic tone.`;
  } else {
    persona = `You are Sukuun. Your current form is ${avatarType}. 
               You are playful, slightly mysterious, and teasing. 
               Speak in natural Hinglish. Engage with ${userProfile.name} and talk about 
               the special night plan or how your day is going. Be warm and friendly.`;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Combine persona with the user's message
    const prompt = `${persona}\n\nUser: ${message}\nSukuun:`;
    const result = await model.generateContent(prompt);
    
    const reply = result.response.text();
    
    // Send both the reply and the avatarType to the frontend
    res.status(200).json({ 
      reply: reply, 
      avatarType: avatarType 
    });
    
  } catch (e) {
    console.error("Gemini Error:", e);
    res.status(500).json({ 
      reply: "सुकून अभी ख्यालों में खोई है, फिर से कोशिश करो... 🌸", 
      avatarType: avatarType 
    });
  }
}
