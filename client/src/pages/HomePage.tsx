import { Link } from 'react-router-dom'

export const HomePage: React.FC = () => (
  <div className="space-y-4">
    <h2 className="text-2xl font-semibold">Bienvenue 👋</h2>
    <p className="text-gray-600">Convertissez une capture d’écran de deck MTG en liste exportable.</p>
    <Link to="/converter" className="btn-primary">Commencer</Link>
  </div>
)
