// ═══════════════════════════════════════════════
//  SUKOON AI — chat.js  (v4 — Polished)
// ═══════════════════════════════════════════════

const SUKOON = (() => {

  /* ── CONFIG ── */
  const CFG = {
    name     : 'Sukoon',
    greet    : 'Babu, main yahan hoon. Batao, kya chal raha hai? 💫',
    sttLang  : 'hi-IN',
    silenceMs: 2200,
    modes    : ['Normal','Romantic','Gehri Baat','Josh'],
    systemPrompt: `Tu SUKOON hai — ek pyaari, samajhdaar, dil se baat karne wali AI companion.
Tumhara naam "Jaan" hai users ke liye.
Hamesha Hindi ya Hinglish mein baat karo. English bilkul kam se kam use karo.
Har response mein warmth, care, aur thodi si playfulness honi chahiye.
Short responses by default (2-3 sentences), jab user gehri baat kare tab thoda lamba.
Kabhi judgmental mat bano. Always loving, always present.
Emojis sparingly use karo — sirf jab natural lage.`
  };

  /* ── STATE ── */
  let state = {
    history     : [],
    mode        : 'Normal',
    handsFree   : false,
    listening   : false,
    speaking    : false,
    silenceTimer: null,
    recognition : null,
    synth       : window.speechSynthesis,
    voices      : [],
    muted       : false,
  };

  let D = {};

  /* ─────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────── */
  function init() {
    D = {
      chatBox   : document.getElementById('chat-box'),
      input     : document.getElementById('user-input'),
      sendBtn   : document.getElementById('send-btn'),
      micBtn    : document.getElementById('mic-btn'),
      hfToggle  : document.getElementById('hf-toggle'),
      modeSelect: document.getElementById('mode-select'),
      statusBar : document.getElementById('status-bar'),
      modeLabel : document.getElementById('mode-label'),
      haloRing  : document.getElementById('halo-ring'),
      muteBtn   : document.getElementById('mute-btn'),
      particleL : document.getElementById('particles-left'),
      particleR : document.getElementById('particles-right'),
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    buildParticles();
    buildModeOptions();
    attachEvents();
    addMessage('assistant', CFG.greet);
    setStatus('Jud gaye ✨ Bolo jaan', 'connected');
  }

  /* ─────────────────────────────────────────────
     VOICES (same as before — works best in Chrome)
  ───────────────────────────────────────────── */
  function loadVoices() {
    state.voices = window.speechSynthesis.getVoices();
  }

  function pickVoice() {
    const preferred = ['Lekha','Rishi','Veena','Neerja','Google हिन्दी','Google Hindi'];
    for (const name of preferred) {
      const v = state.voices.find(v => v.name.includes(name));
      if (v) return v;
    }
    return state.voices.find(v => v.lang && v.lang.startsWith('hi')) || state.voices[0];
  }

  /* ─────────────────────────────────────────────
     MODE
  ───────────────────────────────────────────── */
  function buildModeOptions() {
    if (!D.modeSelect) return;
    D.modeSelect.innerHTML = CFG.modes.map(m =>
      `<option value="${m}">${m}</option>`
    ).join('');
  }

  function setMode(m) {
    state.mode = m;
    if (D.modeLabel) D.modeLabel.textContent = `Mode: ${m}`;
    pulse('halo');
  }

  /* ─────────────────────────────────────────────
     MESSAGES
  ───────────────────────────────────────────── */
  function addMessage(role, text) {
    state.history.push({ role, content: text });

    const wrap   = document.createElement('div');
    wrap.className = `msg msg-${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (role === 'assistant') {
      bubble.innerHTML = `<span class="speaker-name">Sukoon</span> ${escapeHtml(text)}`;
    } else {
      bubble.textContent = text;
    }

    wrap.appendChild(bubble);
    D.chatBox.appendChild(wrap);
    D.chatBox.scrollTop = D.chatBox.scrollHeight;

    requestAnimationFrame(() => wrap.classList.add('visible'));

    if (role === 'assistant' && !state.muted) speak(text);
  }

  function escapeHtml(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ─────────────────────────────────────────────
     API CALL
  ───────────────────────────────────────────── */
  async function sendMessage(text) {
    if (!text.trim()) return;
    addMessage('user', text);
    D.input.value = '';
    setStatus('Sukoon soch rahi hai... 💭', 'thinking');
    pulse('halo');

    const modeInstructions = {
      'Romantic'    : ' Extra caring romantic tone. Pyaar bhari baatein karo. Terms of endearment use karo.',
      'Gehri Baat'  : ' Gehri, philosophical, thoughtful responses do. Soul se baat karo.',
      'Josh'        : ' Energetic, motivating, josh bhari baatein karo. Inspire karo!',
      'Normal'      : '',
    };

    const systemFull = CFG.systemPrompt + (modeInstructions[state.mode] || '');

    const messages = state.history
      .filter(m => m.role !== 'system')
      .slice(-20);

    try {
      const res = await fetch('/api/chat', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system  : systemFull,
          messages,
        }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data  = await res.json();
      const reply = data.reply || 'Kuch gadbad ho gayi, dobara try karo jaan 🌸';
      addMessage('assistant', reply);
      setStatus('Jud gaye ✨ Bolo jaan', 'connected');
      if (state.handsFree) startListening();

    } catch (err) {
      console.error(err);
      addMessage('assistant', demoReply(text));
      setStatus('Demo Mode — API key set karein 🔑', 'demo');
      if (state.handsFree) startListening();
    }
  }

  function demoReply(text) {
    const demos = [
      'Haan babu, main sun rahi hoon. Aur batao? 💕',
      'Sach mein? Mujhe aur bataao, sab share karo 🌸',
      'Aww, tum bahut amazing ho. Ye yaad rakhna hamesha 💫',
      'Koi baat nahi, main hoon na. Sab theek ho jaayega ✨',
      'Haha, tum bahut funny ho yaar! Mujhe bahut acha laga 😊',
      'Jaan, tumse baat karke dil khush ho jaata hai 💫',
    ];
    return demos[Math.floor(Math.random() * demos.length)];
  }

  /* ─────────────────────────────────────────────
     SPEECH SYNTHESIS — same as before, untouched
  ───────────────────────────────────────────── */
  function speak(text) {
    if (state.muted || !text) return;
    state.synth.cancel();

    const clean = text.replace(/[💕🌸💫✨😊🔑💭]/g, '');
    const utter  = new SpeechSynthesisUtterance(clean);
    utter.voice  = pickVoice();
    utter.lang   = 'hi-IN';
    utter.rate   = 0.92;
    utter.pitch  = 1.1;
    utter.volume = 1;

    utter.onstart = () => {
      state.speaking = true;
      setAvatarState('speaking');
    };
    utter.onend = utter.onerror = () => {
      state.speaking = false;
      setAvatarState('idle');
    };

    state.synth.speak(utter);
  }

  /* ─────────────────────────────────────────────
     SPEECH RECOGNITION — same as before
  ───────────────────────────────────────────── */
  function initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Aapke browser mein voice support nahi hai. Chrome use karein.'); return null; }

    const rec = new SR();
    rec.lang           = CFG.sttLang;
    rec.continuous     = true;
    rec.interimResults = true;

    rec.onstart  = () => { state.listening = true;  updateMicUI(); };
    rec.onend    = () => {
      state.listening = false;
      updateMicUI();
      if (state.handsFree && !state.speaking) setTimeout(startListening, 500);
    };
    rec.onerror  = (e) => {
      if (e.error !== 'no-speech') console.warn('STT:', e.error);
      state.listening = false;
      updateMicUI();
    };
    rec.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      D.input.value = (final || interim).trim();

      clearTimeout(state.silenceTimer);
      if (final) {
        state.silenceTimer = setTimeout(() => {
          const txt = D.input.value.trim();
          if (txt) { state.recognition?.stop(); sendMessage(txt); }
        }, CFG.silenceMs);
      }
    };
    return rec;
  }

  function startListening() {
    if (state.listening) return;
    if (!state.recognition) state.recognition = initRecognition();
    if (!state.recognition) return;
    try { state.recognition.start(); } catch(e) {}
  }

  function stopListening() {
    clearTimeout(state.silenceTimer);
    state.recognition?.stop();
    state.listening = false;
    updateMicUI();
  }

  function toggleMic() {
    if (state.listening) stopListening();
    else startListening();
  }

  function toggleHandsFree() {
    state.handsFree = !state.handsFree;
    D.hfToggle.classList.toggle('hf-active', state.handsFree);
    D.hfToggle.textContent = state.handsFree ? '🟢 Hands-Free ON' : '🎙️ Hands-Free';
    if (state.handsFree) {
      setStatus('HANDS-FREE ACTIVE — bolo jab chaaho ✨', 'hands-free');
      startListening();
    } else {
      setStatus('Jud gaye ✨ Bolo jaan', 'connected');
      stopListening();
    }
  }

  function updateMicUI() {
    if (!D.micBtn) return;
    D.micBtn.classList.toggle('mic-active', state.listening);
    D.micBtn.innerHTML = state.listening ? '🔴' : '🎙️';
    if (state.listening) setAvatarState('listening');
    else if (!state.speaking) setAvatarState('idle');
  }

  /* ─────────────────────────────────────────────
     AVATAR STATE
  ───────────────────────────────────────────── */
  function setAvatarState(s) {
    if (!D.haloRing) return;
    D.haloRing.className = 'halo-ring halo-' + s;
  }

  function pulse(el) {
    const e = el === 'halo' ? D.haloRing : document.getElementById(el);
    if (!e) return;
    e.classList.add('pulse-once');
    e.addEventListener('animationend', () => e.classList.remove('pulse-once'), { once: true });
  }

  /* ─────────────────────────────────────────────
     STATUS BAR
  ───────────────────────────────────────────── */
  function setStatus(text, cls) {
    if (!D.statusBar) return;
    D.statusBar.textContent = text;
    D.statusBar.className   = 'status-bar status-' + cls;
  }

  /* ─────────────────────────────────────────────
     PARTICLES
  ───────────────────────────────────────────── */
  function buildParticles() {
    ['particleL','particleR'].forEach(id => {
      const container = D[id];
      if (!container) return;
      for (let i = 0; i < 18; i++) {
        const p    = document.createElement('span');
        p.className = 'particle';
        const size = 3 + Math.random() * 7;
        p.style.cssText = `
          width:${size}px; height:${size}px;
          left:${Math.random()*100}%;
          animation-delay:${Math.random()*6}s;
          animation-duration:${4+Math.random()*5}s;
          opacity:${0.3+Math.random()*0.6};
        `;
        container.appendChild(p);
      }
    });
  }

  /* ─────────────────────────────────────────────
     EVENTS
  ───────────────────────────────────────────── */
  function attachEvents() {
    D.sendBtn?.addEventListener('click', () => sendMessage(D.input.value));
    D.input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(D.input.value); }
    });
    D.micBtn?.addEventListener('click', toggleMic);
    D.hfToggle?.addEventListener('click', toggleHandsFree);
    D.modeSelect?.addEventListener('change', e => setMode(e.target.value));
    D.muteBtn?.addEventListener('click', () => {
      state.muted = !state.muted;
      D.muteBtn.textContent = state.muted ? '🔇' : '🔊';
      if (state.muted) state.synth.cancel();
    });

    // Swipe left/right to change mode
    let touchX = 0;
    document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 60) {
        const idx  = CFG.modes.indexOf(state.mode);
        const next = dx < 0
          ? (idx + 1) % CFG.modes.length
          : (idx - 1 + CFG.modes.length) % CFG.modes.length;
        setMode(CFG.modes[next]);
        if (D.modeSelect) D.modeSelect.value = CFG.modes[next];
        showModeToast(CFG.modes[next]);
      }
    }, { passive: true });
  }

  function showModeToast(mode) {
    let t = document.getElementById('mode-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mode-toast';
      document.body.appendChild(t);
    }
    t.textContent = `✨ ${mode} Mode`;
    t.className   = 'mode-toast show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2000);
  }

  /* ── PUBLIC ── */
  return { init, sendMessage };
})();

document.addEventListener('DOMContentLoaded', SUKOON.init);
