export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method!== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, systemPrompt } = req.body;

    const illegal = [/\b(minor|child|underage|rape|incest|bestiality)/i];
    if (illegal.some(p => p.test(message))) {
      return res.status(200).json({ reply: `Ye nahi bhosdike. Chut-lund tak theek hai.` });
    }

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
          { role: "user", content: message }
        ],
        temperature: 1.2,
        max_tokens: 100,
        top_p: 0.98
      })
    });

    if (!response.ok) throw new Error('Groq API Error');

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Error bhosdike';

    res.status(200).json({ reply });
  } catch (e) {
    console.error('Chat API Error:', e);
    res.status(500).json({ reply: 'Server down hai madarjaat' });
  }
}
