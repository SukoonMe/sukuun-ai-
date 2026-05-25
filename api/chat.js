import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API_KEY_NOT_FOUND");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // FIX: Model path mein 'models/' prefix lagana zaroori hai (Google SDK requirement)
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
    
    const prompt = `You are Sukuun, a soulmate. Your form is ${avatarType}. Speak in conversational Hinglish. Address ${userProfile.name} with affection. User says: ${message}`;
    
    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    
    res.status(200).json({ reply, avatarType });
    
  } catch (e) {
    console.error("--- GEMINI FINAL DEBUG ---");
    console.error("Error Code:", e.status);
    console.error("Error Message:", e.message);
    
    res.status(500).json({ 
      reply: "सुकून अभी ख्यालों में खोई है, फिर से कोशिश करो... 🌸", 
      avatarType 
    });
  }
}
