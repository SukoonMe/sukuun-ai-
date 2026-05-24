const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const typingIndicator = document.getElementById('typingIndicator');

let chatHistory = [];

function speak(text) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    synth.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    
    const romanticVoice = voices.find(voice => 
        voice.lang.includes('hi') || 
        voice.name.includes('Google') || 
        voice.name.includes('Female') || 
        voice.name.includes('Zira')
    );
    
    if (romanticVoice) speech.voice = romanticVoice;
    speech.rate = 0.82;  
    speech.pitch = 1.02; 
    synth.speak(speech);
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    
    micBtn.addEventListener('click', () => {
        micBtn.textContent = "🛑";
        micBtn.style.background = "#ef4444";
        recognition.start();
    });

    recognition.onresult = (event) => {
        userInput.value = event.results[0][0].transcript;
        sendMessage();
    };
    
    recognition.onend = () => {
        micBtn.textContent = "🎙️";
        micBtn.style.background = "#334155";
    };
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user-message');
    userInput.value = '';
    typingIndicator.style.display = 'block';

    const localHour = new Date().getHours();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: chatHistory, currentHour: localHour })
        });
        
        const data = await response.json();
        typingIndicator.style.display = 'none';
        
        if(data.reply) {
            appendMessage(data.reply, 'ai-message');
            speak(data.reply);

            chatHistory.push({ role: 'user', parts: [{ text: text }] });
            chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });
            if (chatHistory.length > 20) chatHistory.shift();
        }
    } catch (error) {
        typingIndicator.style.display = 'none';
        appendMessage("मैं यहीं हूँ यार... शायद नेटवर्क थोड़ा कमजोर है बस।", 'ai-message');
    }
}

function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
window.speechSynthesis.getVoices();
