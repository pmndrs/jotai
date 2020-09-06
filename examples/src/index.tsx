import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './prism.css'
import './style.css'

ReactDOM.render(
  <div className="max-w-4xl mx-auto px-8 pb-8">
    <header className="mt-12 mb-12">
      <h1 className="text-6xl font-bold">Jōtai</h1>
      <h2
        className="
        text-3xl font-medium text-gray-400 
        lg:flex justify-between items-center
        ">
        <div>Primitive and flexible state management for React.</div>
        <div className="text-xl font-medium text-gray-900">状態 </div>
      </h2>
    </header>
    <App />
  </div>,
  document.getElementById('root')
)
