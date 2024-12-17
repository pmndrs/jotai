import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { atom, useAtom } from 'jotai';

import mascot from './assets/jotai-mascot.png';

import './index.css';

const countAtom = atom(0);

const Counter = () => {
  const [count, setCount] = useAtom(countAtom);
  const inc = () => setCount((c) => c + 1);

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <span className="text-3xl leading-none">{count}</span>
      <button
        className="bg-blue-200 text-black font-bold py-2 px-4 rounded"
        onClick={inc}
      >
        +1
      </button>
    </div>
  );
};

function App() {
  return (
    <div className="grid place-items-center gap-4">
      <a href="https://jotai.org/" target="_blank" rel="noreferrer">
        <img
          src={mascot}
          alt="Jotai mascot"
          className="w-32"
          style={{
            filter: 'drop-shadow(0 0 2em #bfdbfe)',
          }}
        />
      </a>

      <h1 className="text-5xl font-bold">Jotai Starter</h1>

      <Counter />
    </div>
  );
}

const root = document.getElementById('app');

createRoot(root!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
