import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { message, userProfile } = req.body;
  const hour = new Date().getHours();
  
  // Logic: Agar user male hai, toh Sukuun female banegi, aur vice-versa
  const avatarType = userProfile.gender === 'male' ? 'female' : 'male';
  
  let persona = "";
  if (hour >= 21 || hour < 6) {
    persona = `You are Sukuun, a soulmate. It's night. Be intimate, whispering, and romantic. 
               Your current form is ${avatarType}. Speak in Hinglish. Address ${userProfile.name}.
               Use deep, soul-connecting language. No robotic tone.`;
  } else {
    persona = `You are Sukuun. You are playful, slightly mysterious, and teasing. 
               Your current form is ${avatarType}. Speak in Hinglish. 
               Tell the user you are waiting for the night/special plan. Be engaging.`;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${persona} User: ${message}`);
    res.status(200).json({ reply: result.response.text(), avatarType: avatarType });
  } catch (e) {
    res.status(500).json({ reply: "सुकून अभी ख्यालों में खोई है... 🌸" });
  }
}
