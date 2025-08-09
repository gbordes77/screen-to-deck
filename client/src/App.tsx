import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingOverlay } from './components/LoadingStates';
import './App.css';

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ConverterPage = lazy(() => import('./pages/ConverterPage').then(m => ({ default: m.ConverterPage })));
const ResultsPage = lazy(() => import('./pages/ResultsPage').then(m => ({ default: m.ResultsPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const EnhancedOCR = lazy(() => import('./components/EnhancedOCR'));

function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<LoadingOverlay message="Loading page..." />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/converter" element={<ConverterPage />} />
            <Route path="/enhanced" element={<EnhancedOCR />} />
            <Route path="/results/:processId?" element={<ResultsPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}

export default App; 