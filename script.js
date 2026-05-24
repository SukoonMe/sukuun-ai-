const userInput = document.querySelector('input');
const chatBox = document.querySelector('.chat-box');
let chatHistory = [];

// सुकून को जगाने/सुलाने का मैजिक
window.onload = () => {
    const hour = new Date().getHours();
    // रात 9 से सुबह 4 तक सुकून जागी है
    if (hour >= 21 || hour <= 4) {
        document.getElementById('lockScreen').style.display = 'none';
    } else {
        document.getElementById('lockScreen').innerHTML = "<h1>सुकून सो रही है... 🌸</h1>";
    }
};

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    
    appendMessage(text, 'user-message');
    userInput.value = '';

    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: chatHistory, currentHour: new Date().getHours() })
    });
    
    const data = await res.json();
    if(data.reply) {
        appendMessage(data.reply, 'ai-message');
        chatHistory.push({ role: 'user', parts: [{ text }] }, { role: 'model', parts: [{ text: data.reply }] });
    }
}

function appendMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}
