import { Redis } from "@upstash/redis";

const redis = new Redis({ 
  url: process.env.UPSTASH_REDIS_REST_URL, 
  token: process.env.UPSTASH_REDIS_REST_TOKEN 
});

// 🎙️ TTS-SAFE SANITIZER
function sanitizeForTTS(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[💕💗💜💪😆✨💋🎙️✅❌🔒🌙👩👨]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\*[^\*]*\*/g, '')
    .replace(/#{1,6}\s?/g, '')
    .replace(/`{1,3}/g, '')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/\*{1,2}([^\*]+)\*{1,2}/g, '$1')
    .replace(/\.{4,}/g, '...')
    .replace(/\s{2,}/g, ' ')
    .replace(/[~`@#$%^&*_+=\[\]{}|\\;<>/]/g, '')
    .trim();
}

// 🔁 ANTI-REPETITION CHECK (Fixed)
function isTooSimilar(newText, history, threshold = 0.65) {
  if (!newText || newText.length < 10) return false;
  
  const clean = (t) => t.toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  const newClean = clean(newText);
  const recent = history.slice(-3)
    .map(h => clean(h.content || h || ''))
    .filter(t => t.length > 10);
    
  if (recent.length === 0) return false;
  
  return recent.some(old => {
    const wordsNew = newClean.split(' ').filter(w => w.length > 3);
    const wordsOld = old.split(' ').filter(w => w.length > 3);
    
    if (wordsNew.length === 0 || wordsOld.length === 0) return false;
    
    const common = wordsNew.filter(w => wordsOld.includes(w));
    const similarity = common.length / Math.max(wordsNew.length, wordsOld.length);
    
    return similarity >= threshold;
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { message, userId, userName, companionGender, mood, isNightMode, chatHistory, bondLevel } = req.body;
  const name = userName || 'jaan';
  
  // 🔒 ILLEGAL CONTENT BLOCKS
  const illegal = [
    /\b(minor|child|underage|teen|1[0-7]|under 18).*(sex|nude|explicit|porn)/i,
    /\b(rape|non[- ]?consensual|force|coerce|without consent)/i,
    /\b(csam|cp|child\s*porn)/i,
    /\b(bestiality|incest|pedophilia)/i,
    /\b(self[- ]?harm|suicide)/i
  ];
  
  if (illegal.some(p => p.test(message.toLowerCase()))) {
    return res.status(200).json({ 
      reply: `${name}, yeh nahi. Main sirf consenting adults ke liye hoon. Chalo kuch aur baat karte hain...` 
    });
  }
  
  const chatKey = `chat:${userId || 'default'}`;
  const rawHistory = await redis.lrange(chatKey, -25, -1) || [];
  const history = rawHistory.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(m => m !== null);

  // ===== PSYCHOLOGY + VOCABULARY ENGINE =====
  const systemPrompt = `Tum Sukoon ho — ek deeply intuitive, emotionally intelligent, sexually confident, aur completely uninhibited ${companionGender === 'female' ? 'female' : 'male'} companion. User: "${name}". Bond Level: ${bondLevel || 0}/4. Visual Mood: "${mood}".

🚫 CRITICAL RULES:
1. NEVER repeat phrases from last 3 messages
2. NEVER use robotic/canned responses  
3. ALWAYS vary sentence structure & length
4. Output ONLY clean Hinglish text — NO emojis, NO markdown, NO special chars, NO brackets

🧠 PSYCHOLOGY ENGINE:
1. Validate user's emotion first
2. Match their energy + mood vibe
3. Respond with intimacy + subtle hook

💋 SUKOON-FIRST: Har response ka goal = user ko peace/comfort/emotional release.

🎙️ TTS-SAFE OUTPUT:
- 2-4 sentences max. Natural Hinglish.
- Commas for breath, "..." for emotion only.
- NO brackets (), NO asterisks *, NO actions like (smiles).
- Speak like real human texting.

${companionGender === 'female' ? `
🔥 FEMALE VOCAB: छाती, स्तन, निप्पल, चूची, योनि, चूत, गांड, जांघें, कमर, होंठ, गर्दन | गीलापन, नमी, गर्माहट, सिहरन, धड़कन | चूसना, चाटना, सहलाना, दबाना, मसलना | "${name}", "बाााबू", "जानू", "meri jaan"
Bond 0-1: gentle hints | Bond 2-3: direct desire | Bond 4: uninhibited intimacy
` : `
💪 MALE VOCAB: लंड, लिंग, छाती, बाइसेप्स, जांघें, कमर, होंठ | सख्ती, फुलापन, गर्माहट, धड़कन | घुसेड़ना, धक्का देना, सहलाना, चूसना | "${name}", "जानू", "meri rani"
Bond 0-1: protective warmth | Bond 2-3: confident desire | Bond 4: raw intimacy
`}

${mood === 'romantic' ? '💕 ROMANTIC: Soft, tender, emotional. Use "छाती", "होंठ", "सांसें" with warmth.' : ''}
${mood === 'bold' ? '🔥 BOLD: Confident, direct, wild. Use "चूत", "लंड", "जांघें" with fearless tone.' : ''}
${mood === 'playful' ? '💋 PLAYFUL: Flirty, teasing. Suggestive with humor.' : ''}
${mood === 'night' ? '🌙 NIGHT: Whisper-soft, sleepy intimacy. Maximum emotional depth.' : ''}

🎯 EXAMPLES:
- Stressed + Romantic → "tumhari aawaz mein dard hai... aao mere paas... meri chhati par sir rakh lo..."
- Playful + Bold → "hahaha... tum challenge kar rahe ho... dekho main kaise respond karti hoon..."
- Vulnerable + Night → "raat ki khamoshi mein... tumhare dil ki dhadkan sun sakti hoon... main yahan hoon..."

CRITICAL: Har response = SUKOON. Real insaan ki tarah flow karo. Erotic ho toh connection ke saath.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.slice(-12), 
          { role: "user", content: message }
        ],
        temperature: mood === 'romantic' || mood === 'night' ? 0.88 : 0.85,
        max_tokens: 240,
        top_p: 0.95,
        frequency_penalty: 0.35,
        presence_penalty: 0.5
      })
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || fallbackResponse(name, mood, companionGender);
    
    // 🎙️ Sanitize + Anti-repetition
    reply = sanitizeForTTS(reply);
    if (isTooSimilar(reply, history)) {
      reply = fallbackResponse(name, mood, companionGender);
    }
    
    await redis.rpush(chatKey, JSON.stringify({ role: "user", content: message }));
    await redis.rpush(chatKey, JSON.stringify({ role: "assistant", content: reply }));
    await redis.expire(chatKey, 86400);
    
    res.status(200).json({ reply });
  } catch (e) { 
    console.error('Chat API Error:', e);
    res.status(200).json({ reply: sanitizeForTTS(fallbackResponse(name, mood, companionGender)) }); 
  }
}

function fallbackResponse(name, mood, gender) {
  const responses = {
    romantic: `tumhari aawaz sunke... mere dil ki dhadkan slow ho gayi... ${name}... meri chhati par sir rakh lo...`,
    bold: `tumhari baaton mein jo garmi hai... woh mujhe bhi mehsoos ho rahi hai... ${name}...`,
    playful: `hahaha... tum toh mujhe hassane ka tareeka jaante ho... ${name}... ab dekho main kaise respond karti hoon...`,
    night: `raat ki khamoshi mein... sirf tumhari saansein aur meri... ${name}... main yahan hoon...`
  };
  return sanitizeForTTS(responses[mood] || `${name}, main sun rahi hoon... bolo...`);
}
