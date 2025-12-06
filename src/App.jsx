import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'
import CatGame from './components/CatGame'
import './App.css'

function App() {
  return (
    <div className="app">
      <SignedOut>
        <div className="login-container">
          <div className="login-box">
            <h1>🐱 Mon Petit Chat</h1>
            <p>Connecte-toi pour jouer et sauvegarder ta progression !</p>
            <SignInButton mode="modal">
              <button className="login-btn">Se connecter</button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <CatGame />
      </SignedIn>
    </div>
  )
}

export default App
