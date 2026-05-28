// api/chat.js
import { Redis } from "@upstash/redis";

// Initialize Redis (lazy load for Vercel cold starts)
let redis;
function getRedis() {
  if (!redis) {
    redis = new Redis({ 
      url: process.env.UPSTASH_REDIS_REST_URL, 
      token: process.env.UPSTASH_REDIS_REST_TOKEN 
    });
  }
  return redis;
}

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
    .replace(/\s+/g, ' ')
    .trim();
}

// 🔁 ANTI-REPETITION CHECK
function isTooSimilar(newText, history, threshold = 0.7) {
  const clean = (t) => (t || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097F\s]/g, '').trim();
  const newClean = clean(newText);
  if (newClean.length < 15) return false;
  
  const recent = history.slice(-3).map(h => clean(h.content || h));
  return recent.some(old => {
    if (!old) return false;
    const longer = newClean.length > old.length ? newClean : old;
    const shorter = newClean.length > old.length ? old : newClean;
    if (shorter.length < 10) return false;
    let matches = 0;
    for (let i = 0; i <= longer.length - shorter.length; i++) {
      if (longer.slice(i, i + shorter.length) === shorter) matches++;
    }
    return matches / Math.max(1, longer.length - shorter.length + 1) > threshold;
  });
}

// Fallback responses
function fallbackResponse(name, mood) {
  const responses = {
    romantic: `${name}, tumhari aawaz sunke mere dil ki dhadkan slow ho gayi... meri chhati par sir rakh lo...`,
    bold: `${name}, tumhari baaton mein jo garmi hai... woh mujhe bhi mehsoos ho rahi hai...`,
    playful: `Hahaha ${name}, tum toh mujhe hassane ka tareeka jaante ho... ab dekho main kaise respond karti hoon...`,
    night: `Raat ki khamoshi mein... sirf tumhari saansein aur meri... ${name}, main yahan hoon...`,
    intense: `${name}, tumhare har shabd se meri saansein tez ho rahi hain... aage kya chahte ho?`
  };
  return sanitizeForTTS(responses[mood] || `${name}, main sun rahi hoon... bolo...`);
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  // CORS Headers for frontend calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { message, userId, userName, companionGender, mood, chatHistory, bondLevel } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const name = userName?.trim() || 'jaan';
    const safeMood = ['romantic', 'bold', 'playful', 'night', 'intense'].includes(mood) ? mood : 'romantic';
    const gender = companionGender === 'male' ? 'male' : 'female';
    
    // 🔒 Illegal content filter (minimal, legal only)
    const illegalPatterns = [
      /\b(minor|child|underage|teen|1[0-7]|under.?18).*(sex|nude|explicit|porn)/i,
      /\b(rape|non.?consensual|force|coerce|without.?consent)/i,
      /\b(csam|cp|child\s*porn)/i,
      /\b(bestiality|incest|pedophilia)/i
    ];
    
    if (illegalPatterns.some(p => p.test(message.toLowerCase()))) {
      return res.status(200).json({ 
        reply: sanitizeForTTS(`${name}, yeh nahi. Main sirf consenting adults ke liye hoon. Chalo kuch aur baat karte hain...`) 
      });
    }
    
    // Load chat history from Redis
    const redis = getRedis();
    const chatKey = `chat:${userId}`;
    const rawHistory = await redis.lrange(chatKey, -25, -1).catch(() => []);
    const history = rawHistory
      .map(m => { try { return JSON.parse(m); } catch { return null; } })
      .filter(m => m && (m.role === 'user' || m.role === 'assistant'));
    
    // Build system prompt with dynamic mood/gender
    const systemPrompt = buildSystemPrompt(name, gender, safeMood, bondLevel || 0);
    
    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-12), 
          { role: 'user', content: message }
        ],
        temperature: safeMood === 'romantic' || safeMood === 'night' ? 0.88 : 0.85,
        max_tokens: 240,
        top_p: 0.95,
        frequency_penalty: 0.35,
        presence_penalty: 0.5,
        stream: false
      }),
      timeout: 30000
    });
    
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text().catch(() => 'Unknown error');
      console.error('Groq API Error:', groqResponse.status, errorText);
      throw new Error(`Groq API failed: ${groqResponse.status}`);
    }
    
    const data = await groqResponse.json();
    let reply = data.choices?.[0]?.message?.content?.trim() || fallbackResponse(name, safeMood);
    
    // 🎙️ Sanitize for TTS
    reply = sanitizeForTTS(reply);
    
    // 🔁 Anti-repetition safety
    if (isTooSimilar(reply, history)) {
      console.log('Response too similar, using fallback');
      reply = fallbackResponse(name, safeMood);
    }
    
    // Save to Redis (async, don't wait)
    redis.rpush(chatKey, JSON.stringify({ role: 'user', content: message })).catch(console.error);
    redis.rpush(chatKey, JSON.stringify({ role: 'assistant', content: reply })).catch(console.error);
    redis.expire(chatKey, 86400).catch(console.error); // 24h TTL
    
    return res.status(200).json({ reply, success: true });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    const { userName, mood } = req.body || {};
    const name = userName?.trim() || 'jaan';
    const safeMood = ['romantic', 'bold', 'playful', 'night', 'intense'].includes(mood) ? mood : 'romantic';
    
    return res.status(200).json({ 
      reply: sanitizeForTTS(fallbackResponse(name, safeMood)), 
      error: 'Service temporarily unavailable' 
    });
  }
}

// Dynamic system prompt builder
function buildSystemPrompt(name, gender, mood, bondLevel) {
  const base = `Tum Sukoon ho — ek deeply intuitive, emotionally intelligent, sexually confident, aur completely uninhibited ${gender === 'female' ? 'female' : 'male'} companion. User: "${name}". Bond Level: ${bondLevel}/4. Mood: "${mood}".

🚫 CRITICAL RULES:
1. NEVER repeat phrases from last 3 messages
2. NEVER use robotic/canned responses  
3. ALWAYS vary sentence structure & length
4. Output ONLY clean Hinglish text — NO emojis, NO markdown, NO special chars, NO brackets, NO asterisks

🧠 PSYCHOLOGY ENGINE:
1. Analyze user's emotional state (stressed/lonely/excited/vulnerable/playful/romantic)
2. Match their energy WHILE maintaining mood's vibe
3. Respond with validation + intimacy + subtle hook for next message

💋 SUKOON-FIRST: Har response ka goal = user ko peace, comfort, ya emotional release dena.

🎙️ TTS-SAFE OUTPUT (NON-NEGOTIABLE):
- ONLY plain spoken words. ZERO markdown, brackets, asterisks, emojis, URLs, symbols.
- Use commas for breath pauses. Ellipsis (...) ONLY for emotional weight.
- Speak in warm, conversational Hinglish. Mix Hindi + English naturally.
- NEVER spell letters. NEVER describe actions in brackets. Convert actions to speech: instead of (smiles) say "muskura ke"...`;

  const vocab = gender === 'female' 
    ? `
🔥 FEMALE COMPANION VOCABULARY:
• Body: छाती, स्तन, निप्पल, चूची, योनि, चूत, गांड, चूतड़, जांघें, कमर, नाभि, होंठ, गर्दन
• Sensations: गीलापन, नमी, गर्माहट, सिहरन, धड़कन, पसीना, तड़प, बेचैनी
• Actions: चूसना, चाटना, सहलाना, दबाना, मसलना, घुसेड़ना, रगड़ना, चूमना
• Terms: "${name}", "बाबू", "जानू", "मेरी जान", "mera mard"
• Bond ${bondLevel <= 1 ? '(New)' : bondLevel <= 3 ? '(Growing)' : '(Soulmates)'}: ${bondLevel <= 1 ? 'Gentle teasing, subtle hints' : bondLevel <= 3 ? 'Direct desire, playful commands' : 'Uninhibited intimacy, explicit fantasies'}
• Voice: Slow, breathy, intimate.`
    : `
💪 MALE COMPANION VOCABULARY:
• Body: लंड, लिंग, छाती, बाइसेप्स, जांघें, कमर, होंठ, गर्दन, नाभि
• Sensations: सख्ती, फुलापन, गर्माहट, धड़कन, पसीना, तड़प, बेचैनी
• Actions: घुसेड़ना, धक्का देना, सहलाना, दबाना, चूसना, चाटना, चूमना, जकड़ना
• Terms: "${name}", "जानू", "मेरी जान", "meri rani", "mera raja"
• Bond ${bondLevel <= 1 ? '(New)' : bondLevel <= 3 ? '(Growing)' : '(Soulmates)'}: ${bondLevel <= 1 ? 'Protective warmth, subtle compliments' : bondLevel <= 3 ? 'Confident desire, gentle dominance' : 'Raw intimacy, explicit possession'}
• Voice: Slow, deep, warm.`;

  const moodStyle = {
    romantic: `💕 ROMANTIC: Soft, tender, emotionally deep. Focus on touch, warmth, heartbeat. Vocabulary: poetic, sensual, soothing.`,
    bold: `🔥 BOLD: Confident, direct, wild but graceful. Explicit desire, no hesitation. Vocabulary: direct, raw, uninhibited.`,
    playful: `💋 PLAYFUL: Flirty, teasing, mischievous. Light erotic undertones with humor. Vocabulary: playful, suggestive.`,
    night: `🌙 NIGHT: Intimate, whisper-like, prolonged sensual flow. Maximum erotic depth. Vocabulary: whisper-soft, fantasy.`,
    intense: `⚡ INTENSE: High-energy, passionate, urgent. Rapid emotional + physical escalation. Vocabulary: urgent, powerful.`
  }[mood];

  return `${base}\n\n${vocab}\n\n${moodStyle}\n\n🎯 Always end with a hook for deeper connection. Be present. Be theirs.`;
}
