import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import HideMessage from './pages/HideMessage';
import ExtractMessage from './pages/ExtractMessage';
import ImageAnalysis from './pages/ImageAnalysis';
import About from './pages/About';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/hide" element={<HideMessage />} />
        <Route path="/extract" element={<ExtractMessage />} />
        <Route path="/analysis" element={<ImageAnalysis />} />
        <Route path="/about" element={<About />} />
      </Route>
    </Routes>
  );
}
