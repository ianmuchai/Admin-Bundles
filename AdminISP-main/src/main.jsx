import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Restore dark mode from localStorage before first render (prevents white flash on dark mode)
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark')
}

createRoot(document.getElementById('root')).render(
  <App />
)
