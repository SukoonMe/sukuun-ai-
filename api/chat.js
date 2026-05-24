import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { message, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key missing in environment variables");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are Sukuun, a caring human companion. 
        Rules: Keep it Hinglish, very short (1-2 lines), intimate, no lists. 
        User says: ${message}`;

        const chat = model.startChat({ history: history || [] });
        const result = await chat.sendMessage(prompt);
        const responseText = await result.response.text();

        return res.status(200).json({ reply: responseText });
    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
