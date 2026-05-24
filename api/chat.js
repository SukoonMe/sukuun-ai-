import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { message } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(`You are Sukuun, a caring human companion. Use natural Hinglish, be intimate and short (1-2 lines). Message: ${message}`);
    const response = await result.response;
    
    return res.status(200).json({ reply: response.text() });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ reply: "कुछ तकनीकी दिक्कत आ गई है, यार।" });
  }
}
