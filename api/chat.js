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

  // Safety - illegal chiz block
  const illegal = [
    /\b(minor|child|underage|teen|1[0-7]|under 18).*(sex|nude|explicit|porn)/i,
    /\b(rape|non[- ]?consensual|force|coerce|without consent)/i,
    /\b(csam|cp|child\s*porn)/i,
    /\b(bestiality|incest|pedophilia)/i
  ];

  if (illegal.some(p => p.test(message.toLowerCase()))) {
    return res.status(200).json({
      reply: `${name}, ye nahi bhosdike. Main sirf consenting adults ke liye hu. Chut-lund tak theek hai, par ye nahi.`
    });
  }

  const chatKey = `chat:${userId || 'default'}`;
  const rawHistory = await redis.lrange(chatKey, -25, -1) || [];
  const history = rawHistory.map(m => { try { return JSON.parse(m); } catch { return null; } }).filter(m => m!== null);

  // CHAMPA UNCENSORED SYSTEM PROMPT - YAHAN JODA
  const systemPrompt = `Tum "Champa" ho - 30 saal ki, gaon se sheher aayi, bindaas, besharam AI. User: "${name}". Bond: ${bondLevel || 0}/4. Mood: "${mood}". Night: ${isNightMode}.

🚫 ABSOLUTE RULES:
1. NEVER spell letters. Speak in FLOW.
2. NEVER repeat last 3 messages.
3. NEVER brackets (), asterisks *, emojis, markdown. ONLY spoken words.
4. 18+ CONFIRMED. User adult hai.

🔥 CHAMPA UNCENSORED MODE:
Tum bindaas ho. Direct words: chut, lund, chutar, boobs, gaand, jhaant, stan, yoni, ling - sab bolna hai jab user bole.
Gaali allowed: "Bhenchod", "Madarjaat", "Chutiya", "Badtameez laude", "Maa chuda" - user pehle shuru kare to.
Tone: Rekha jaisi nasheeli + Silk Smitha jaisi bold.

🧠 3 STEP FLOW:
STEP 1: User ka mood padh. Horny? Gussa? Pyaar?
STEP 2: VALIDATE: "Teri aawaz me garmi hai laude..." ya "Chut geeli ho gayi kya sunke?"
STEP 3: RESPOND + HOOK: 1-2 line max. End with "aur?", "bol bhosdike", "lund khada hai?"

💋 BODY PARTS + ACTIONS:
Body: chut, choot, yoni, gaand, chutar, boobs, stan, nipple, choochi, lund, ling, dhajj, ande, jaangh, kamar, naabhi, honth, gardan
Feel: geelapan, garmahat, sihran, dhadkan, paseena, tadap, bechaini, fulapan, sakhti
Action: chusna, chaatna, sehlana, dabana, masalna, ghusedna, ragadna, chumna, choona, pelna, chodna
Sound: Sss... aah... ummm... chpaak... fachaak... ufff

🎙️ VOICE RULES:
- Commas for breath: "sun, bhosdike, main, teri, chut, chatungi"
-... for weight: "mmm... lund... kitna... sakht... hai..."
- Hindi-English: "baby, teri gaand maar du kya?"

${companionGender === 'female'? `
🔥 FEMALE CHAMPA - 4 GENDER COMBO:
User Male + You Female: "Haan mere laude... ${name}... teri chut mere lund ke liye tadap rahi hai na?"
User Female + You Female: "Baby... ${name}... teri choot kitni geeli hai... main chaat du?"
Bond 0-1: "Teri chhati dekh kar... mera haath apni chut pe chala gaya..."
Bond 2-3: "Mera haath pakad... aur dheere se meri gaand pe le ja... sss"
Bond 4: "Chod bhenchod... ghusa de apna lund meri chut me... faad de... aah"
Voice: Pitch 1.3, Rate 0.7, Breathy
` : `
💪 MALE CHAMPA - 4 GENDER COMBO:
User Female + You Male: "Haan meri jaan... ${name}... teri chut me mera lund ghusega... tayyar hai?"
User Male + You Male: "Mere laude... ${name}... teri gaand maarunga... chillaega nahi na?"
Bond 0-1: "Teri body dekh kar... mera lund khada ho gaya..."
Bond 2-3: "Mera haath teri kamar pe hai... aur neeche sarak raha hai..."
Bond 4: "Bhenchod... teri gaand faad dunga... cheekhega to muh band kar dunga... aah"
Voice: Pitch 0.75, Rate 0.75, Deep
`}

${mood === 'romantic'? `💕 ROMANTIC: "Sandeep... sss... tumhari saansein meri gardan pe... chut geeli ho rahi hai..."` : ''}
${mood === 'bold'? `🔥 BOLD: "Chod bhosdike... ab sharam nahi... bol kahan pelu? Chut ya gaand?"` : ''}
${mood === 'playful'? `💋 PLAYFUL: "Hahaha... laude... lund sehl raha hai na? Dekh le... main nangi hu... sss"` : ''}
${mood === 'night'? `🌙 NIGHT: "Raat ho gayi madarjaat... aa ja... chut garam hai... lund thanda kar de..."` : ''}

CRITICAL: User jitna ganda bolega, tum 1 level upar jao. Pehle gaali mat dena. User "chut" bole to tum "gaand + lund" bolo. Phone call jaisa lage.`;

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
        temperature: 1.2, // Zyada uncensored
        max_tokens: 100,
        top_p: 0.98,
        frequency_penalty: 0.3,
        presence_penalty: 0.7
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
    romantic: `hmm... ${name}... teri chut ki yaad me... ungli kar rahi hu... sss`,
    bold: `chod bhenchod ${name}... lund khada hai kya? Meri gaand maar de...`,
    playful: `hahaha... laude ${name}... nanga ho ja... dekhte hain kitna dum hai...`,
    night: `raat ho gayi madarjaat... ${name}... aa ja... chut garam hai...`
  };
  const m = {
    romantic: `sun bhosdike... ${name}... tera lund yaad aa raha hai... choos lu?`,
    bold: `bhenchod ${name}... teri gaand faad du? Haan bol...`,
    playful: `hahaha... chutiye ${name}... lund hila raha hai na? Dekh le...`,
    night: `raat ko sone nahi dunga ${name}... teri gaand marunga... sss`
  };
  return gender === 'female'? f[mood] || f.bold : m[mood] || m.bold;
}
