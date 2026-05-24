document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatContainer');
    const lockScreen = document.getElementById('lockScreen');
    const hour = new Date().getHours();

    // अभी रात का 1:50 AM हो रहा है, तो ये पक्का 'flex' मोड में आएगा
    if (hour >= 21 || hour <= 4) {
        lockScreen.style.display = 'none';
        chatContainer.style.display = 'flex';
    } else {
        lockScreen.style.display = 'flex';
        chatContainer.style.display = 'none';
    }
});

// बटन के लिए फंक्शन
document.getElementById('sendBtn').addEventListener('click', async () => {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text) return;

    // मैसेज जोड़ना
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML += `<div class="message user-message">${text}</div>`;
    input.value = '';

    // API Call
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    
    chatBox.innerHTML += `<div class="message ai-message">${data.reply}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
});
