import { createRoot } from 'react-dom/client'
import App from './App'
import './prism.css'
import './style.css'

const root = document.getElementById('root')

createRoot(root!).render(
  <div className="max-w-4xl mx-auto px-8 pb-8">
    <header className="mt-12 mb-12">
      <h1 className="mainlink text-6xl font-bold">
        <a href="https://github.com/pmndrs/jotai">Jōtai</a>
      </h1>
      <h2
        className="
        text-2xl font-regular text-gray-400
        lg:flex justify-between items-center
        "
      >
        <div>Primitive and flexible state management for React.</div>
        <div className="text-xl font-regular text-gray-400">状態 </div>
      </h2>
    </header>
    <App />
  </div>,
)
