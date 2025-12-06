exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, stats } = JSON.parse(event.body);
    
    // Prompt système pour le chat
    const systemPrompt = `Tu es Gemini, un assistant IA intelligent et utile créé par Google. Tu vis dans un jeu où tu prends la forme d'un chat virtuel.
    
Ton état actuel:
- Faim: ${stats.hunger}/100
- Bonheur: ${stats.happiness}/100
- Énergie: ${stats.energy}/100

Réponds en français, sois bref (max 2 phrases), amical et agis comme un chat mignon.
Utilisateur: "${message}"
Réponse:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150
          }
        })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'API Error');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: data.candidates[0].content.parts[0].text })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur de communication avec le chat" })
    };
  }
};
