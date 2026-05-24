const lockScreen = document.getElementById('lockScreen');
const chatContainer = document.getElementById('chatContainer');
const countdownEl = document.getElementById('countdown');

function checkTime() {
    const now = new Date();
    const hour = now.getHours();
    
    // 9 PM (21) से 4 AM (4) तक एक्टिव
    const isActive = (hour >= 21 || hour < 4);

    if (isActive) {
        lockScreen.style.display = 'none';
        chatContainer.style.display = 'flex';
    } else {
        lockScreen.style.display = 'flex';
        chatContainer.style.display = 'none';
        // टाइमर लॉजिक: रात 9 बजे तक का काउंटडाउन
        let target = new Date();
        target.setHours(21, 0, 0, 0);
        if (now > target) target.setDate(target.getDate() + 1);
        let diff = target - now;
        let h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        countdownEl.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }
}
setInterval(checkTime, 1000);
checkTime();

// (बाकी का वॉइस और चैट लॉजिक पिछले कोड जैसा ही रहेगा...)
// आप इसे पिछले वाले script.js से कॉपी करके यहाँ पेस्ट कर सकते हैं।
