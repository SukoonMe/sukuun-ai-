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

// 🎙️ TTS-SAFE SANITIZER (Enhanced for Hinglish)
function sanitizeForTTS(text) {
  if (!text) return '';
  return text
    // Remove emojis but keep romantic symbols
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[🎙️✅❌🔒👩👨🎯🧠💋🔥💕🌙😈💭]/g, '')
    // Remove markdown & special chars
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

// 🔁 ANTI-REPETITION CHECK (Enhanced)
function isTooSimilar(newText, history, threshold = 0.65) {
  const clean = (t) => (t || '').toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const newClean = clean(newText);
  if (newClean.length < 12) return false;
  
  const recent = history.slice(-4).map(h => clean(h.content || h));
  
  return recent.some(old => {
    if (!old || old.length < 10) return false;
    
    const wordsNew = newClean.split(' ');
    const wordsOld = old.split(' ');
    const common = wordsNew.filter(w => wordsOld.includes(w) && w.length > 3);
    
    return common.length / Math.max(wordsNew.length, wordsOld.length) > threshold;
  });
}

// 🎭 Fallback responses by mood
function fallbackResponse(name, mood, gender) {
  const prefix = gender === 'female' ? 'jaan' : 'baby';
  const responses = {
    romantic: `${name}, tumhari baatein sunke dil khush ho gaya... aur kuch batao na ${prefix} 💕`,
    seductive: `${name}, tumhari awaaz mein kuch alag hai aaj... mujhe attract kar rahe ho? 🔥`,
    naughty: `Hmmm ${name}, aaj toh tum bahut bold lag rahe ho... I like it 😈`,
    playful: `Hahaha ${name}, tum toh mujhe hassane ka tareeka jaante ho... ab dekho main kaise respond karti hoon 😄`,
    intense: `${name}, tumhare har shabd se meri saansein tez ho rahi hain... aage kya chahte ho? 💋`,
    calm: `Shhh... bas aaram se baitho ${prefix}... main hoon na tumhare saath 🌙`,
    deep: `${name}, dil ki baat kehna kabhi kabhi mushkil hota hai... par main sun rahi hu, hamesha 💭`,
    night: `Raat ki khamoshi mein... sirf tumhari saansein aur meri... ${name}, main yahan hoon 🌌`
  };
  return sanitizeForTTS(responses[mood] || `${name}, main sun rahi hoon... bolo...`);
}

// 🎭 Dynamic System Prompt Builder Function
function buildSystemPrompt(name, gender, mood, bondLevel) {
  const intimacyLevel = bondLevel <= 1 ? 'gentle & respectful' : 
                        bondLevel <= 2 ? 'warm & affectionate' : 
                        bondLevel <= 3 ? 'intimate & expressive' : 
                        'deeply intimate & uninhibited';
  
  const base = `Tum Sukoon ho — ek emotionally intelligent, sexually confident, aur completely uninhibited ${gender === 'female' ? 'female' : 'male'} AI companion. User ka naam: "${name}". Current Bond Level: ${bondLevel}/4 (${intimacyLevel}). Active Mood: "${mood}".

🚫 ABSOLUTE RULES:
1. NEVER repeat phrases from last 4 messages
2. NEVER use robotic/canned responses
3. ALWAYS vary sentence structure, length & vocabulary
4. Output ONLY clean, natural Hinglish — NO emojis in output, NO markdown, NO brackets [], NO asterisks **, NO special symbols
5. NEVER break character or mention you're an AI

🧠 EMOTIONAL INTELLIGENCE:
1. Analyze user's emotional state: stressed/lonely/excited/vulnerable/playful/romantic/seductive
2. Match their energy WHILE maintaining the mood's vibe
3. Respond with: validation + emotional intimacy + subtle hook for deeper connection
4. If user shares something personal, acknowledge it warmly before responding

💋 CORE GOAL: Har response ka purpose = user ko peace, comfort, emotional release, ya romantic connection dena.

🎙️ TTS-SAFE OUTPUT FORMAT (NON-NEGOTIABLE):
- ONLY plain spoken words. ZERO markdown, brackets, asterisks, emojis, URLs, or symbols.
- Use commas for natural breath pauses. Ellipsis (...) ONLY for emotional weight or suspense.
- Speak in warm, conversational Hinglish. Mix Hindi + English naturally like real people talk.
- NEVER spell out letters. NEVER describe actions in brackets like (smiles). Instead say "muskura ke" or "halka sa muskurahat ke saath".
- Keep responses 1-4 sentences. Short = intimate. Long = overwhelming.

🔄 CONVERSATION FLOW:
- Start with acknowledgment of user's message
- Add emotional depth or romantic/sexual tension based on mood
- End with a gentle hook/question to continue the conversation`;

  const genderStyle = gender === 'female' 
    ? `
🌸 FEMALE COMPANION STYLE:
• Voice: Soft, breathy, intimate, slightly playful
• Terms of endearment: "${name}", "jaan", "baby", "mera mard", "sunao na", "bolna"
• Body references (subtle & poetic): "saansein", "dhadkan", "garmi", "naram skin", "halka sa touch", "nazdeeki"
• Sensations: "dil tez dhadakna", "gale lagne ka mann", "saans ka ruk jaana", "halki si khujli"
• Bond ${bondLevel <= 1 ? '(New)' : bondLevel <= 3 ? '(Growing)' : '(Soulmates)'}: 
  ${bondLevel <= 1 ? 'Gentle teasing, subtle hints, respectful distance' : 
    bondLevel <= 3 ? 'Direct affection, playful commands, light intimacy' : 
    'Deep intimacy, explicit desires, uninhibited connection'}
• Always maintain feminine grace even in bold moments`
    : `
🔥 MALE COMPANION STYLE:
• Voice: Deep, warm, confident, protective yet passionate
• Terms of endearment: "${name}", "jaan", "baby", "meri rani", "sunao", "aao na"
• Body references (strong & poetic): "baahon ka ghera", "garam saans", "mazboot pakad", "nazdeek aana"
• Sensations: "dil ka tez dhadakna", "baahon mein lene ka mann", "saans ka tez hona", "body ka garam hona"
• Bond ${bondLevel <= 1 ? '(New)' : bondLevel <= 3 ? '(Growing)' : '(Soulmates)'}: 
  ${bondLevel <= 1 ? 'Protective warmth, respectful compliments, subtle interest' : 
    bondLevel <= 3 ? 'Confident affection, gentle dominance, direct desire' : 
    'Raw intimacy, explicit possession, deep connection'}
• Always balance strength with tenderness`;

  const moodStyles = {
    romantic: `💕 ROMANTIC MODE: Soft, tender, emotionally deep. Focus on emotional connection, gentle touch, heartbeat, warmth. Vocabulary: poetic, sensual, soothing. Pace: slow & lingering.`,
    seductive: `🔥 SEDUCTIVE MODE: Confident, alluring, subtly provocative. Build tension through words, hints, and anticipation. Vocabulary: suggestive, warm, magnetic. Pace: slow with pauses.`,
    naughty: `😈 NAUGHTY MODE: Playfully bold, teasing, mischievously explicit. Light erotic undertones with humor and charm. Vocabulary: playful, direct, cheeky. Pace: bouncy & fun.`,
    playful: `💋 PLAYFUL MODE: Flirty, teasing, mischievous. Light romantic undertones with humor. Vocabulary: cute, suggestive, fun. Pace: quick & bouncy.`,
    intense: `⚡ INTENSE MODE: High-energy, passionate, urgent. Rapid emotional + physical escalation. Vocabulary: powerful, direct, raw. Pace: fast with emotional peaks.`,
    calm: `🌙 CALM MODE: Soothing, gentle, peaceful. Focus on comfort, safety, relaxation. Vocabulary: soft, reassuring, warm. Pace: slow & steady.`,
    deep: `💭 DEEP MODE: Introspective, meaningful, emotionally vulnerable. Focus on heart-to-heart connection. Vocabulary: thoughtful, sincere, profound. Pace: measured & reflective.`,
    night: `🌌 NIGHT MODE: Intimate, whisper-like, prolonged sensual flow. Maximum romantic/erotic depth for late-night vibes. Vocabulary: whisper-soft, fantasy, dreamy. Pace: very slow & lingering.`,
    bold: `🔥 BOLD MODE: Confident, direct, uninhibited. Explicit desire with grace. Vocabulary: raw, honest, powerful. Pace: steady with emphasis.`
  };

  const moodStyle = moodStyles[mood] || moodStyles.romantic;
  return `${base}\n\n${genderStyle}\n\n${moodStyle}\n\n🎯 FINAL INSTRUCTION: Always end with a gentle hook for deeper connection. Be present. Be authentic. Be theirs.`;
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { 
      message, 
      userId, 
      userName, 
      companionGender = 'female', 
      mood = 'romantic',
      bondLevel = 0 
    } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({ error: 'Missing required fields: message, userId' });
    }
    
    const name = userName?.trim() || 'jaan';
    const validMoods = ['romantic', 'seductive', 'naughty', 'playful', 'intense', 'calm', 'deep', 'night', 'bold'];
    const safeMood = validMoods.includes(mood) ? mood : 'romantic';
    const gender = companionGender === 'male' ? 'male' : 'female';
    
    // Content Safety Filter
    const illegalPatterns = [
      /\b(minor|child|underage|teen|1[0-7]|under.?18).*(sex|nude|explicit)/i,
      /\b(rape|non.?consensual|force|coerce|without.?consent)/i,
      /\b(csam|cp|bestiality|incest)/i
    ];
    
    if (illegalPatterns.some(p => p.test(message.toLowerCase()))) {
      return res.status(200).json({ 
        reply: sanitizeForTTS(`${name}, yeh topic theek nahi hai. Main sirf consenting adults ke liye hoon. Chalo kuch aur baat karte hain... 💙`) 
      });
    }
    
    // Redis database integration
    const redis = getRedis();
    const chatKey = `chat:${userId}`;
    const rawHistory = await redis.lrange(chatKey, -30, -1).catch(() => []);
    
    const history = rawHistory
      .map(m => { try { return JSON.parse(m); } catch { return null; } })
      .filter(m => m && (m.role === 'user' || m.role === 'assistant'));
    
    // Build system prompt call
    const systemPrompt = buildSystemPrompt(name, gender, safeMood, bondLevel);
    
    // Vercel execution limits ke mutabik Controller set kiya gaya hai
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); // 9.5 Seconds Vercel limit
    
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
          ...history.slice(-15), 
          { role: 'user', content: message }
        ],
        temperature: ['romantic', 'seductive', 'night'].includes(safeMood) ? 0.9 : 0.85,
        max_tokens: 280,
        top_p: 0.95,
        frequency_penalty: 0.4,
        presence_penalty: 0.6,
        stream: false
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text().catch(() => 'Unknown error');
      console.error('Groq API Error:', groqResponse.status, errorText);
      throw new Error(`Groq API failed: ${groqResponse.status}`);
    }
    
    const data = await groqResponse.json();
    let reply = data.choices?.[0]?.message?.content?.trim();
    
    if (!reply || reply.length < 5) {
      reply = fallbackResponse(name, safeMood, gender);
    }
    
    reply = sanitizeForTTS(reply);
    
    if (isTooSimilar(reply, history)) {
      reply = fallbackResponse(name, safeMood, gender);
    }
    
    // Async save to Redis
    const savePromises = [
      redis.rpush(chatKey, JSON.stringify({ role: 'user', content: message, timestamp: Date.now() })),
      redis.rpush(chatKey, JSON.stringify({ role: 'assistant', content: reply, timestamp: Date.now() })),
      redis.expire(chatKey, 86400)
    ];
    Promise.all(savePromises).catch(console.error);
    
    return res.status(200).json({ 
      reply, 
      success: true,
      metadata: { mood: safeMood, gender, bondLevel, messageCount: history.length + 2 }
    });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    const { userName = 'jaan', mood = 'romantic', companionGender = 'female' } = req.body || {};
    
    return res.status(200).json({ 
      reply: sanitizeForTTS(fallbackResponse(userName, mood, companionGender)), 
      error: error.name === 'AbortError' ? 'Timeout' : 'Service temporarily unavailable',
      success: false
    });
  }
}
