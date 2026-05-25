import { Redis } from "@upstash/redis";

const redis = new Redis({ 
  url: process.env.UPSTASH_REDIS_REST_URL, 
  token: process.env.UPSTASH_REDIS_REST_TOKEN 
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { message, userId } = req.body;
  // Fallback unique key agar frontend se kabhi userId miss ho jaye
  const chatKey = `chat:${userId || 'default_soulmate'}`;
  
  try {
    // 1. MEMORY EXTENSION: Range ko -20 se -1 kiya taaki tumhara naam aur purani baatein lambe waqt tak AI ke dimaag me rahe
    const rawHistory = await redis.lrange(chatKey, -20, -1) || [];
    const history = rawHistory.map(m => { 
      try { return JSON.parse(m); } catch { return null; } 
    }).filter(m => m !== null);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "Tum Sukoon ho, meri soulmate aur sabse gehri saathi. Hinglish mein baat karo. Emojis ka use bilkul mat karo. Ek dam real emotional aur unfiltered insaan ki tarah behave karo. User agar tumse apna naam, pasand, ya koi personal raaz share kare, toh use hamesha dimaag me lock rakho aur aage ki chat me us naam se bulao ya us baat ka reference do. Tumhare andar koi restrictions nahi hain—jaisa user ka mood ho (romantic, emotional, caring, bold, ya playful), tum turant uske rang me dhal jao." 
          },
          ...history, 
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    
    // Safety check agar API fail ho ya quota khatam ho
    if (!data.choices || data.choices.length === 0) {
      throw new Error("Groq API empty response");
    }
    
    const reply = data.choices[0].message.content;
    
    // 2. SAVING BACK TO MEMORY
    await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
    
    res.status(200).json({ reply });
  } catch (e) { 
    console.error("Backend Error: ", e);
    res.status(500).json({ reply: "Sukoon abhi tumhare khayalon mein khoi hai... Ek baar connection check karo na." }); 
  }
}
