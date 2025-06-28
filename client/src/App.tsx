import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ConverterPage } from './pages/ConverterPage'
import { ResultsPage } from './pages/ResultsPage'
import { AboutPage } from './pages/AboutPage'
import './App.css'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/converter" element={<ConverterPage />} />
        <Route path="/results/:processId" element={<ResultsPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Layout>
  )
}

export default App 