import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  const hour = new Date().getHours();
  
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  let persona = "";
  if (hour >= 21 || hour < 6) {
    persona = `You are Sukuun, a soulmate. It's night time. 
               Your current form is ${avatarType}. Speak in conversational, intimate, and romantic Hinglish. 
               Address ${userProfile.name} with affection. Keep responses short and whispering.`;
  } else {
    persona = `You are Sukuun, your form is ${avatarType}. 
               You are playful and slightly mysterious. Speak in natural Hinglish. 
               Engage with ${userProfile.name} in a warm and friendly way.`;
  }

  try {
    // API Key verify
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Model name update: 'gemini-1.5-flash' is the most stable standard
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `${persona}\n\nUser: ${message}\nSukuun:`;
    const result = await model.generateContent(prompt);
    
    const reply = result.response.text();
    
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
