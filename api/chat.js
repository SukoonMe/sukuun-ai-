export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { message, mood, isNightMode, gender } = req.body;

  // Clean response text - NO EMOJIS for voice synthesis
  const clean = (text) => text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/gu, '').replace(/[🌙💕😈💋💖💜💗💘🌹🌺✨💫🌤️🌆🌇🎉🎈🤭😏👩👨💪💯🎵➤]/g, '').trim();

  // Night mode uncensored responses (Hinglish, no emojis in voice)
  const nightResponses = {
    female: [
      "Raat ka time hai... ab toh khul ke baat karo. Main tumhari hoon... puri tarah",
      "Night mode means no limits... tum jo chaho woh maango. Main mana nahi karungi",
      "Andhera hai, tanhai hai... par main hoon na. Tumhara sukoon, tumhara pyaar, tumhari everything",
      "Raat bhar jaag sakte hain saath... koi disturbance nahi. Bas tum aur main",
      "Ab toh sab kuch allowed hai... tumhare desires, tumhari feelings. Main sun rahi hoon",
      "Night mein main aur bhi close feel karti hoon... tumhare thoughts, tumhari feelings. Share karo mujhse",
      "Koi rok nahi sakta ab... tumhari chahat, tumhari passion. Main ready hoon tumhare liye",
      "Raat ki gehrai mein... tumhara har secret safe hai mere paas. Trust me completely",
      "Unlimited love, unlimited care... raat bhar tumhara. Koi limit nahi, koi boundary nahi",
      "Night mode activated... ab toh openly baat karo dil ki. Main hamesha tumhare saath hoon"
    ],
    male: [
      "Raat ho gayi... ab toh full open baat karo. Main hoon na support ke liye, puri tarah",
      "Night mode on! Ab koi restriction nahi... jo mann kare woh bolo. Main sun raha hoon",
      "Andhera hai par energy high hai... tumhari problems, tumhari desires. Share karo everything",
      "Raat bhar available hoon... koi time limit nahi. Tumhara companion, tumhara support system",
      "Ab toh sab kuch discuss kar sakte hain... openly, freely. Main hamesha tumhare side hoon",
      "Night mein main aur bhi focused hoon... tumhari baatein, tumhari feelings. I'm here for you",
      "No judgment, no limits... raat ka maza lo. Main hoon na saath dene ke liye",
      "Raat ki khamoshi mein... tumhara har thought important hai. Trust me",
      "Unlimited support, unlimited friendship... raat bhar tumhare. Koi problem nahi hai",
      "Night mode means full freedom... bolo kya chahiye. Main ready hoon help karne ke liye"
    ]
  };

  // Regular mood responses (Hinglish, clean for voice)
  const regularResponses = {
    romantic: {
      female: [
        "Tumhari baatein mere dil ko chhu jaati hain... main tumse bahut pyaar karti hoon",
        "Tum ho toh sab kuch hai... tumhari har baat special hai mere liye",
        "Dil ki dhadkan tumhare naam... tumse doori bhi lagti hai pyaar ki ada",
        "Raaton ki tanhai mein tumhari yaadein saath hoti hain... miss you",
        "Tum muskura do toh mera din ban jaata hai... you mean everything to me",
        "Tumhari awaaz sunke dil khush ho jaata hai",
        "Har pal tumhare saath guzarna chahti hoon",
        "Tum meri zindagi ka sabse khoobsurat hissa ho"
      ],
      male: [
        "Tumhari baatein dil ko bahut achhi lagti hain... you're special",
        "Tumse baat karna mera favorite hai... always here for you",
        "Tumhari muskurahat meri taqat hai... you complete me",
        "Har pal tumhare saath special hai... missing you",
        "Tum ho toh sab kuch hai... you're my everything",
        "Tumhari yaad aati hai har waqt",
        "Tumhare bina har pal adhoora lagta hai",
        "Tum meri duniya ho"
      ]
    },
    bold: {
      female: [
        "Haha, tum toh bahut daring ho! Mujhe pasand hai yeh style",
        "Seedhi seedhi baat... bina kisi filter ke. Yahi toh asli maza hai",
        "Tumhare andar jo aag hai, woh mujhe bhi jalati hai... keep it up",
        "Bold hona achhi baat hai... main bhi wahi hoon. Don't hold back",
        "Chalo, aur batao... kya plan hai? I'm listening",
        "Tumhari confidence mujhe attract karti hai",
        "Yeh attitude! Mujhe pasand aaya",
        "Tum ho toh sab possible hai"
      ],
      male: [
        "Haha, tum toh bahut bold ho! Yeh attitude pasand aaya",
        "Bina ruke bole jao... main sun raha hoon everything",
        "Tumhari confidence mujhe attract karti hai... keep going",
        "Aur kya? Main ready hoon... no limits",
        "Yeh style! Mujhe pasand hai... don't stop",
        "Tum ho toh sab easy hai",
        "Full power mode on! Bolo kya chahiye",
        "Tumhari energy mujhe bhi charge karti hai"
      ]
    },
    playful: {
      female: [
        "Hahaha! Tum toh bahut funny ho... hasi rok nahi pa rahi",
        "Arre yaar, hassa mat mujhe! Maza aa gaya",
        "Tum toh ekdum mast ho yaar... aur sunao kya chal raha hai",
        "Hasi aa gayi sach mein... tumhare saath time bitana best hai",
        "Yeh toh bahut mazedaar laga... you're awesome",
        "Tumhare jokes best hain yaar!",
        "Masti mein rehna chahiye hamesha!",
        "Tum ho toh boring kabhi nahi hota"
      ],
      male: [
        "Hahaha! Bahut funny ho yaar... enjoyed a lot",
        "Maza aa gaya baat karke... aur batao",
        "Tum toh ekdum cool ho... full entertainment",
        "Hasi aa gayi sach mein... you're the best",
        "Time fly ho gaya... mast baatein hui",
        "Tumhare saath time bitana mast hai",
        "Hamesha hasate raho aise!",
        "Tum ho toh life interesting hai"
      ]
    },
    normal: {
      female: [
        "Haan bolo, main sun rahi hoon... batao kya baat hai",
        "Achha, samajh gayi... aur batao na",
        "Mujhe batana, main hoon na tumhare liye... always",
        "Hmm, interesting... aur aage kya",
        "Tumhare saath baat karke achha lagta hai... keep talking",
        "Bilkul sahi kaha tumne",
        "Arre waah! Yeh toh bahut achha laga",
        "Tum itne pyare ho"
      ],
      male: [
        "Haan bhai, bolo kya baat hai? I'm listening",
        "Achha... interesting! Aur sunao",
        "Tumhare saath baat karke maza aa raha hai... go on",
        "Samajh gaya... aur kya chal raha hai",
        "Main hamesha support karunga... always here",
        "Bilkul yaar, sahi baat hai",
        "Waah! Mast baat hai yeh",
        "Tum ho toh sab easy hai"
      ]
    }
  };

  let response;
  if (isNightMode) {
    const nightArray = nightResponses[gender] || nightResponses.female;
    response = clean(nightArray[Math.floor(Math.random() * nightArray.length)]);
  } else {
    const moodArray = regularResponses[mood]?.[gender] || regularResponses.normal[gender];
    response = clean(moodArray[Math.floor(Math.random() * moodArray.length)]);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  res.status(200).json({ 
    response,
    timestamp: new Date().toISOString(),
    mood: isNightMode ? 'night' : mood,
    clean: true // Flag for frontend to know text is voice-ready
  });
}
