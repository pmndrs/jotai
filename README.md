<p align="center">
  <img width="500" src="jotai.png" />
</p>

![Bundle Size](https://badgen.net/bundlephobia/minzip/jotai) [![Build Status](https://travis-ci.org/react-spring/jotai.svg?branch=master)](https://travis-ci.org/react-spring/jotai) [![npm version](https://badge.fury.io/js/jotai.svg)](https://badge.fury.io/js/jotai) ![npm](https://img.shields.io/npm/dt/jotai.svg)

Primitive and flexible state management for React. No extra re-renders, state resides within React and you get full benefits from suspense, and concurrent mode. It's scalable from a simple React.useState replacement up to a large appplication with complex requirements.

You can try a live demo soon.

```bash
npm install jotai
```    

Jotai is pronounced "jaw-tie" and means "state" in Japanese.

### First create a primitive atom

An atom represents a piece of state. All you need is to specify an initial value, which can be primitive values like strings and numbers, objects and arrays. You can create as many primitive atoms as you want.

```jsx
import { atom } from 'jotai'

const countAtom = atom(0)
const countryAtom = atom("Japan")
const citiesAtom = atom(["Tokyo", "Kyoto", "Osaka"])
const mangaAtom = atom({ "Dragon Ball": 1984, "One Piece": 1997, "Naruto": 1999 })
```

### Wrap your component tree with Jotai's Provider

You can only use atoms under this component tree.

```jsx
import { Provider } from 'jotai'

const Root = () => (
  <Provider>
    <App />
  </Provider>
)
```

### Use the atom in your components

It can be used just like `React.useState`:

```jsx
import { useAtom } from 'jotai'

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  return (
    <h1>
      {count}
      <button onClick={() => setCount(c => c + 1)}>one up</button>
```

### Create derived atoms with computed values

A new read-only atom can be created from existing atoms by passing a function. `get` allows you to fetch the contextual value of any atom.

```jsx
const doubledCountAtom = atom(get => get(countAtom) * 2)

function DoubleCounter() {
  const [doubledCount] = useAtom(doubledCountAtom)
  return <h2>{doubledCount}</h2>
```

#### Why Jotai over Recoil?

* Minimalistic API
* No string keys
* TypeScript oriented

---

# Recipes

### Creating an atom from multiple atoms

You can combine multiple atoms to create a derived atom.

```jsx
const count1 = atom(0)
const count2 = atom(0)
const count3 = atom(0)

const sum = atom(get => get(count1) + get(count2) + get(count3))
```

Or if you like fp patterns ... 

```jsx
const atoms = [count1, count1, count3, ...]
const sum = atom(get => atoms.map(get).reduce((acc, count) => acc + count))
```

### Derived async atoms ![](https://img.shields.io/badge/-needs_suspense-brightgreen)

You can make the first argument an async function, too.

```jsx
const urlAtom = create("https://json.host.com")
const fetchUrlAtom = create(
  async get => {
    const response = await fetch(get(urlAtom))
    return await response.json()
  }
)

function Status() {
  // Re-renders the component after urlAtom changed and the async function above concludes
  const [json] = useAtom(fetchUrlAtom)
```

### You can create a writable derived atom

`get` will return the current value of an atom, `set` will update an atoms value.

```jsx
const decrementCountAtom = atom(
  get => get(countAtom),
  (get, set, _arg) => set(countAtom, get(countAtom) - 1),
)

function Counter() {
  const [count, decrement] = useAtom(decrementCountAtom)
  return (
    <h1>
      {count}
      <button onClick={decrement}>Decrease</button>
```

### Write-only atoms

Just do not define a read method.

```jsx
const multiplyCountAtom = atom(null, (get, set, by) => set(countAtom, get(countAtom) * by))

function Controls() {
  const [, multiply] = useAtom(multiplyCountAtom)
  return <button onClick={() => multiply(3)}>triple</button>
```

### Async actions ![](https://img.shields.io/badge/-needs_suspense-brightgreen)

Just make the second argument `write` async function and call `set` when you're ready.

```jsx
const fetchCountAtom = create(
  get => get(countAtom),
  async (_get, set, url) => {
    const response = await fetch(url)
    set(countAtom, (await response.json()).count)
  }
)

function Controls() {
  const [count, compute] = useAtom(fetchCountAtom)
  return <button onClick={() => compute("http://count.host.com")}>compute</button>
```
