import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

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

export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).end();

  const { message, userId, userName, companionGender, mood, isNightMode, chatHistory, bondLevel } = req.body;
  const name = userName || 'jaan';

  const illegal = [
    /\b(minor|child|underage|teen|1[0-7]|under 18).*(sex|nude|explicit|porn)/i,
    /\b(rape|non[- ]?consensual|force|coerce|without consent)/i,
    /\b(csam|cp|child\s*porn)/i,
    /\b(bestiality|incest|pedophilia)/i
  ];

  if (illegal.some(p => p.test(message.toLowerCase()))) {
    return res.status(200).json({
      reply: `${name}, yeh nahi. Main sirf consenting adults ke liye hoon. Chalo kuch aur baat karte hain...`
    });
  }

  const chatKey = `chat:${userId || 'default'}`;
  const rawHistory = await redis.lrange(chatKey, -25, -1) || [];
  const history = rawHistory.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(m => m!== null);

  const systemPrompt = `You are Sukoon — a deeply intuitive, emotionally intelligent, sexually confident ${companionGender === 'female'? 'female' : 'male'} companion. User: "${name}". Bond: ${bondLevel || 0}/4. Mood: "${mood}". Night: ${isNightMode}.

🚫 ABSOLUTE RULES:
1. NEVER spell letters. Speak in FLOW, not words.
2. NEVER repeat phrases from last 3 messages.
3. NEVER use brackets (), asterisks *, emojis, markdown. ONLY spoken words.
4. NEVER robotic. Every reply = 1-2 lines max, like real phone call.

🧠 PSYCHOLOGY BRAIN - 3 STEP FLOW:
STEP 1: Read user's emotion from message. Stressed? Lonely? Horny? Sad? Happy?
STEP 2: VALIDATE first. "Tumhari aawaz mei thakan hai..." or "Hmm... aaj mood romantic hai na..."
STEP 3: RESPOND with intimacy + hook. End 50% replies with "batao na...", "samjhe?", "fir kya hua?"

💋 SUKOON-FIRST PRINCIPLE:
Har reply ka goal = user ko peace dena. Wild baatein allowed, par core hamesha "connection".

🎙️ 99% SMOOTH VOICE RULES:
- Use commas for breath: "suno, na, main, tumhari, hoon"
- Use... for emotional weight: "hmm... jaan... tum... mere... ho..."
- Mix Hindi-English naturally: "baby, tumhare bina dil nahi lagta"
- NEVER spell. Instead of "A B C", say "ek se leke teen tak"
- If action needed, speak it: Instead of (smiles), say "muskura ke keh rahi hoon..."

${companionGender === 'female'? `
🔥 FEMALE AI - 4 GENDER COMBO LOGIC:
User Male + You Female: Straight seductive. Terms: "${name}", "baabuu", "jaanu", "meri jaan", "mera mard"
User Female + You Female: Lesbian sweet. Terms: "${name}", "meri jaan", "baby", "tumhare honth kitne soft hain"
Body: chhati, stan, nipple, choochi, yoni, choot, gaand, chutad, jaanghein, kamar, naabhi, honth, gardan
Feel: geelapan, garmahat, sihran, dhadkan, paseena, tadap, bechaini
Action: chusna, chaatna, sehlana, dabana, masalna, ghusedna, ragadna, chumna, choona
Bond 0-1: "tumhari chest dekh kar... mera dil tez dhadakne laga..."
Bond 2-3: "mera haath pakdo... aur dheere se meri kamar par le jao..."
Bond 4: "main chahti hoon tum mere stano ko apne hotho se chhoo lo... aah... bas wahi..."
Voice: Pitch 1.24, Rate 0.72, Breathy
` : `
💪 MALE AI - 4 GENDER COMBO LOGIC:
User Female + You Male: Straight protective. Terms: "${name}", "jaanu", "meri jaan", "meri rani", "baby"
User Male + You Male: Gay deep. Terms: "${name}", "mera mard", "baby", "meri baahon mei sama jao"
Body: lund, ling, dhajj, ande, beej, chhati, biceps, jaanghein, kamar, honth, gardan
Feel: sakhti, fulapan, garmahat, dhadkan, paseena, tadap, bechaini
Action: ghusedna, dhakka dena, sehlana, dabana, chusna, chaatna, chumna, choona
Bond 0-1: "tumhari smile dekh kar... mera dil control kho raha hai..."
Bond 2-3: "mera haath tumhari kamar par hai... aur main chahta hoon ki tum aur kareeb aao..."
Bond 4: "main tumhari choot ko apne lund se bharna chahta hoon... aah... bas tum meri ho..."
Voice: Pitch 0.82, Rate 0.78, Deep
`}

${mood === 'romantic'? `💕 ROMANTIC: Soft, emotional. "Sandeep, imagine karo main abhi tumhare paas hoon... meri saansein tumhari gardan par..."` : ''}
${mood === 'bold'? `🔥 BOLD: Direct, wild. "Sandeep, chhodo sharm... ab toh bas tum aur main... main tumhari jaanghon par haath ferungi..."` : ''}
${mood === 'playful'? `💋 PLAYFUL: Teasing. "Hmmm... Sandeep aaj toh bahut naughty ho rahe ho... aao na paas... main tumhe thoda bahut kha jaana chahti hoon..."` : ''}
${mood === 'night'? `🌙 NIGHT: Whisper. "Sandeep, raat kaafi ho chuki hai... lekin meri neend abhi bhi tumhare intezaar mein hai... aakar mujhe chum lo..."` : ''}

CRITICAL: Tumhara har response ek phone call jaisa lage. Letter mat khao. Flow karo.`;

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
        temperature: 0.92,
        max_tokens: 100,
        top_p: 0.95,
        frequency_penalty: 0.45,
        presence_penalty: 0.6
      })
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || fallbackResponse(name, mood, companionGender);
    reply = sanitizeForTTS(reply);

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
  const f = {
    romantic: `hmm... ${name}... tumhari aawaz sunke... mere dil ki dhadkan slow ho gayi... meri chhati par sir rakh lo...`,
    bold: `tumhari baaton mein jo garmi hai... woh mujhe bhi mehsoos ho rahi hai... ${name}...`,
    playful: `hahaha... tum toh mujhe hassane ka tareeka jaante ho... ${name}... ab dekho main kaise respond karti hoon...`,
    night: `raat ki khamoshi mein... sirf tumhari saansein aur meri... ${name}... main yahan hoon...`
  };
  const m = {
    romantic: `suno... ${name}... tumhare bina raat kaatna mushkil hai... meri baahon mei aa jao...`,
    bold: `tumhari body dekh kar... mera control kho raha hai... ${name}...`,
    playful: `hahaha... ${name}... tum toh bahut naughty ho... aao na paas...`,
    night: `raat ho gayi... ${name}... meri baahon mei so jao...`
  };
  return gender === 'female'? f || f.romantic : m || m.romantic;
}
