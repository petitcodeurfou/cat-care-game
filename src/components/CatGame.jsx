import { useState, useEffect, useRef } from 'react'
import { UserButton, useUser } from '@clerk/clerk-react'
import './CatGame.css'

// Images du chat
const CAT_IMAGES = {
    happy: '/cat_happy.png',
    sad: '/cat_sad.png',
    eating: '/cat_eating.png',
    sleeping: '/cat_sleeping.png',
    playing: '/cat_happy.png'
}

export default function CatGame() {
    const { user } = useUser()

    const [stats, setStats] = useState({ hunger: 80, happiness: 80, energy: 80 })
    const [coins, setCoins] = useState(10)
    const [catState, setCatState] = useState('happy')
    const [statusMessage, setStatusMessage] = useState('Je suis heureux !')
    const [isSleeping, setIsSleeping] = useState(false)

    const [messages, setMessages] = useState([
        { sender: 'cat', text: "Salut ! Je suis Gemini. Pose-moi des questions !" }
    ])
    const [inputMessage, setInputMessage] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)
    const [messageTimestamps, setMessageTimestamps] = useState([])

    // Load saved data
    useEffect(() => {
        if (user?.unsafeMetadata?.gameData) {
            const saved = user.unsafeMetadata.gameData
            if (saved.stats) setStats(saved.stats)
            if (saved.coins !== undefined) setCoins(saved.coins)
        }
    }, [user])

    // Save data
    const saveGameData = async () => {
        if (user) {
            try {
                await user.update({
                    unsafeMetadata: { ...user.unsafeMetadata, gameData: { stats, coins } }
                })
            } catch (e) { console.error(e) }
        }
    }

    useEffect(() => {
        const interval = setInterval(saveGameData, 30000)
        return () => clearInterval(interval)
    }, [stats, coins, user])

    // Game loop
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => {
                const newStats = { ...prev }
                if (isSleeping) {
                    newStats.energy = Math.min(100, prev.energy + 5)
                    newStats.hunger = Math.max(0, prev.hunger - 1)
                    newStats.happiness = Math.max(0, prev.happiness - 0.5)
                } else {
                    newStats.hunger = Math.max(0, prev.hunger - 1)
                    newStats.happiness = Math.max(0, prev.happiness - 0.5)
                    newStats.energy = Math.max(0, prev.energy - 0.5)
                }
                return newStats
            })
        }, 2000)
        return () => clearInterval(interval)
    }, [isSleeping])

    useEffect(() => {
        if (isSleeping) {
            setCatState('sleeping')
            setStatusMessage('Zzz... Bonne nuit...')
        } else {
            updateCatState()
        }
    }, [stats, isSleeping])

    const updateCatState = () => {
        const avg = (stats.hunger + stats.happiness + stats.energy) / 3
        if (avg < 40 || stats.hunger < 20 || stats.happiness < 20) {
            setCatState('sad')
            if (stats.hunger < 20) setStatusMessage("J'ai faim...")
            else if (stats.happiness < 20) setStatusMessage("Je m'ennuie...")
            else setStatusMessage("Je ne me sens pas bien...")
        } else {
            setCatState('happy')
            setStatusMessage("Je me sens bien !")
        }
    }

    const feed = () => {
        if (isSleeping || coins < 1) {
            setStatusMessage(coins < 1 ? "Plus de pièces !" : "Il dort...")
            return
        }
        setCoins(c => c - 1)
        setStats(s => ({ ...s, hunger: Math.min(100, s.hunger + 25), energy: Math.min(100, s.energy + 5) }))
        setCatState('eating')
        setStatusMessage("Miam ! (-1 pièce)")
        setTimeout(updateCatState, 2000)
    }

    const play = () => {
        if (isSleeping || stats.energy < 20) {
            setStatusMessage(stats.energy < 20 ? "Trop fatigué..." : "Il dort...")
            return
        }
        setStats(s => ({ ...s, happiness: Math.min(100, s.happiness + 20), hunger: Math.max(0, s.hunger - 10), energy: Math.max(0, s.energy - 15) }))
        setCatState('playing')
        setStatusMessage("C'est amusant !")
        setTimeout(updateCatState, 2000)
    }

    const sleep = () => {
        setIsSleeping(!isSleeping)
        if (!isSleeping) {
            setCatState('sleeping')
            setStatusMessage("Zzz... Bonne nuit...")
        }
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const sendMessage = async () => {
        if (!inputMessage.trim()) return

        if (stats.hunger <= 0) {
            setMessages(m => [...m, { sender: 'user', text: inputMessage }, { sender: 'cat', text: "Le chat a trop faim pour parler..." }])
            setInputMessage('')
            return
        }

        const now = Date.now()
        const recent = messageTimestamps.filter(t => now - t < 60000)
        if (recent.length >= 3) {
            setMessages(m => [...m, { sender: 'cat', text: "Attends un peu avant d'envoyer d'autres messages." }])
            return
        }

        const msg = inputMessage
        setInputMessage('')
        setMessages(m => [...m, { sender: 'user', text: msg }])
        setMessageTimestamps([...recent, now])
        setIsTyping(true)

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `Tu es un assistant IA amical dans un jeu de chat virtuel. Réponds en français, de manière concise.\n\nUtilisateur: "${msg}"\n\nRéponds:` }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
                    })
                }
            )
            const data = await response.json()
            setMessages(m => [...m, { sender: 'cat', text: data.candidates[0].content.parts[0].text }])
        } catch {
            setMessages(m => [...m, { sender: 'cat', text: "Erreur, réessaye !" }])
        }
        setIsTyping(false)
    }

    return (
        <div className="game-container">
            <header className="game-header">
                <h1>🐱 Mon Petit Chat</h1>
                <div className="header-actions">
                    <span className="coins">🪙 {coins}</span>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            <div className="game-content">
                <div className="panel left-panel">
                    <div className="stats">
                        <div className="stat-row">
                            <span>Faim</span>
                            <div className="bar"><div className="fill hunger" style={{ width: `${stats.hunger}%` }}></div></div>
                        </div>
                        <div className="stat-row">
                            <span>Bonheur</span>
                            <div className="bar"><div className="fill happiness" style={{ width: `${stats.happiness}%` }}></div></div>
                        </div>
                        <div className="stat-row">
                            <span>Énergie</span>
                            <div className="bar"><div className="fill energy" style={{ width: `${stats.energy}%` }}></div></div>
                        </div>
                    </div>

                    <div className="cat-area">
                        <img src={CAT_IMAGES[catState]} alt="Chat" className="cat-img" />
                        <p className="status">{statusMessage}</p>
                    </div>

                    <div className="buttons">
                        <button onClick={feed}>🐟 Manger</button>
                        <button onClick={play}>🧶 Jouer</button>
                        <button onClick={sleep}>{isSleeping ? '☀️ Réveiller' : '💤 Dormir'}</button>
                    </div>
                    <button className="save-btn" onClick={saveGameData}>💾 Sauvegarder</button>
                </div>

                <div className="panel right-panel">
                    <h2>💬 Chat Gemini</h2>
                    <div className="messages">
                        {messages.map((m, i) => (
                            <div key={i} className={`msg ${m.sender}`}>{m.text}</div>
                        ))}
                        {isTyping && <div className="msg cat typing"><span></span><span></span><span></span></div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="input-row">
                        <input
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Écris un message..."
                        />
                        <button onClick={sendMessage} disabled={isTyping}>Envoyer</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
