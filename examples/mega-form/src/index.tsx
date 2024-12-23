import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

const rootElement = document.getElementById('root')
createRoot(rootElement!).render(<App />)
