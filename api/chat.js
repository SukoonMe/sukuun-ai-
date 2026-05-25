import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { message, userProfile } = req.body;
  const hour = new Date().getHours();
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  // Persona logic
  const persona = (hour >= 21 || hour < 6) 
    ? `You are Sukuun, a soulmate. It's night time. Your form is ${avatarType}. Speak in intimate, romantic Hinglish. Address ${userProfile.name} with affection. Keep responses short and whispering.`
    : `You are Sukuun, your form is ${avatarType}. You are playful and mysterious. Speak in natural Hinglish. Engage with ${userProfile.name} in a warm, friendly way.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. Pehle models list karte hain taaki 404 error na aaye
    const modelList = await genAI.listModels();
    
    // 2. Flash model dhoondhte hain (jo sabse stable hai)
    const flashModel = modelList.models.find(m => m.name.includes("gemini-1.5-flash"));
    
    if (!flashModel) {
        throw new Error("No flash model found in list: " + JSON.stringify(modelList));
    }

    // 3. Jo model mila, use use karte hain
    const model = genAI.getGenerativeModel({ model: flashModel.name });
    
    const result = await model.generateContent(`${persona}\n\nUser: ${message}\nSukuun:`);
    const reply = result.response.text();
    
    res.status(200).json({ reply, avatarType });
    
  } catch (e) {
    console.error("Gemini Error:", e.message);
    res.status(500).json({ 
      reply: "सुकून अभी ख्यालों में खोई है, फिर से कोशिश करो... 🌸", 
      avatarType 
    });
  }
}
