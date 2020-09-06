import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './style.css'

ReactDOM.render(
  <div className="container mx-auto px-8">
    <header className="mt-12 mb-12">
      <h1 className="text-6xl font-bold">Jōtai</h1>
      <h2
        className="
        text-3xl font-weight-500 text-gray-400 
        lg:flex justify-between items-center
        ">
        <div>Primitive and flexible state management for React.</div>
        <div className="text-xl font-weight-300 text-gray-900">状態 </div>
      </h2>
    </header>
    <App />
  </div>,
  document.getElementById('root')
)
