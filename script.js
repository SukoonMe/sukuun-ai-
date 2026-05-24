async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    appendMessage(text, 'user-message');
    userInput.value = '';
    typingIndicator.style.display = 'block';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: chatHistory, currentHour: new Date().getHours() })
        });
        const data = await res.json();
        typingIndicator.style.display = 'none';
        if(data.reply) {
            appendMessage(data.reply, 'ai-message');
            // यहाँ पक्का करो कि speak फंक्शन कॉल हो रहा है
            speak(data.reply); 
            chatHistory.push({ role: 'user', parts: [{ text: text }] }, { role: 'model', parts: [{ text: data.reply }] });
        }
    } catch (e) { typingIndicator.style.display = 'none'; }
}
