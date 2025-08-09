import { Routes, Route } from 'react-router-dom'
// Minimal inline pages to unblock build in OSS template
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => <div>{children}</div>;
const HomePage: React.FC = () => <div>Home</div>;
const ConverterPage: React.FC = () => <div>Converter</div>;
const ResultsPage: React.FC = () => <div>Results</div>;
const AboutPage: React.FC = () => <div>About</div>;
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