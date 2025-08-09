import { Link } from 'react-router-dom'

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-white text-gray-900">
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Screen‑to‑Deck</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/">Accueil</Link>
          <Link to="/converter">Convertir</Link>
          <Link to="/about">À propos</Link>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
  </div>
)
