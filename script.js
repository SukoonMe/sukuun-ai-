document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatContainer');
    const lockScreen = document.getElementById('lockScreen');
    const hour = new Date().getHours();

    // अभी रात का समय है (1:55 AM), तो यह कंडीशन TRUE होगी
    if (hour >= 21 || hour <= 4) {
        chatContainer.style.display = 'flex';
        lockScreen.style.display = 'none';
    } else {
        chatContainer.style.display = 'none';
        lockScreen.style.display = 'flex';
    }
});

// बटन क्लिक और API कॉल
document.getElementById('sendBtn').addEventListener('click', async () => {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text) return;

    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML += `<div class="message user-message">${text}</div>`;
    input.value = '';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        chatBox.innerHTML += `<div class="message ai-message">${data.reply}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) {
        alert("API में दिक्कत है!");
    }
});
