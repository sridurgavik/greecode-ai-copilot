
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize the React app in the extension popup
createRoot(document.getElementById("root")!).render(<App />);

