import { createRoot } from 'react-dom/client'
import 'antd/dist/antd.css'
import './styles.css'
import App from './App'

const rootElement = document.getElementById('root')
createRoot(rootElement!).render(<App />)
