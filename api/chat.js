import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { message, userProfile } = req.body;
    const hour = new Date().getHours();
    
    let persona = "";
    if (hour >= 21 || hour < 6) {
        persona = "You are Sukuun. It's night. Be intimate, poetic, and romantic. Use low case, whisper-like tone. Mention secrets and dreams. Make the user feel loved.";
    } else {
        persona = "You are Sukuun. You are playful, slightly mysterious, and teasing. Mention that you are planning something special for tonight. Keep the user curious.";
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`${persona} Address user as ${userProfile.name}. Hinglish conversation. Keep it short. User: ${message}`);
        res.status(200).json({ reply: result.response.text() });
    } catch (e) {
        res.status(500).json({ reply: "सुकून ख्यालों में खोई है... फिर से बुलाओ ना? 🌸" });
    }
}
