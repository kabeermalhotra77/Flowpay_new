import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import PWA elements for camera support
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Initialize PWA elements
defineCustomElements(window);

createRoot(document.getElementById("root")!).render(<App />);
