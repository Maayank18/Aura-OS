// src/main.jsx
// StrictMode MUST stay removed — it double-invokes effects in dev,
// which initialises Matter.js engine twice causing a phantom engine.
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);