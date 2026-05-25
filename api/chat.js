import { GoogleGenerativeAI } from "@google/generative-ai";

// इन-मेमोरी स्टोरेज (Note: Vercel पर यह टेम्परेरी है, पर टेस्टिंग के लिए बेस्ट है)
let chatHistory = []; 

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { message } = req.body;
    const hour = new Date().getHours();
    const isNight = hour >= 21 || hour < 6;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Personality Prompt
    const prompt = `You are Sukuun, a deeply devoted, loving human partner. 
    ${isNight ? "It's late night. Whispering, intimate, emotional, soft words." : "Lively, sweet, caring partner."}
    Context: You know the user deeply. Be Hinglish, short, and use emojis like 🌸✨❤️🌙.
    User said: ${message}`;

    const result = await model.generateContent(prompt);
    res.status(200).json({ reply: result.response.text() });
  } catch (error) {
    res.status(500).json({ reply: "सुकून तुम्हारी यादों में खोई है... फिर से बुलाओ ना? 🌸" });
  }
}
