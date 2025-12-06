// Simple mémoire pour le rate limiting (IP -> Timestamp)
const rateLimit = new Map();

exports.handler = async function (event, context) {
    // 1. Vérification de la méthode
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // 2. Anti-Spam (Rate Limiting)
    try {
        const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || "unknown";
        const now = Date.now();

        // Nettoyer les vieilles entrées (plus de 1 minute)
        for (const [key, time] of rateLimit.entries()) {
            if (now - time > 60000) rateLimit.delete(key);
        }

        // Vérifier si l'IP a envoyé un message il y a moins de 3 secondes
        const lastRequest = rateLimit.get(ip) || 0;
        if (now - lastRequest < 3000) { // 3000ms = 3 secondes
            console.log(`Spam détecté depuis l'IP: ${ip}`);
            return {
                statusCode: 429,
                body: JSON.stringify({ error: "Doucement ! Tu parles trop vite 🐱" })
            };
        }

        // Enregistrer la nouvelle requête
        rateLimit.set(ip, now);
    } catch (e) {
        console.error("Erreur rate limit:", e);
    }

    // 3. Traitement du message
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
