<p align="center">
  <a id="cover" href="#cover"><img src="img/cover.svg" alt="Primitive and flexible state management for React" /></a>
</p>

[![Build Size](https://img.shields.io/bundlephobia/min/jotai?label=bunlde%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=jotai)
[![Build Status](https://img.shields.io/travis/react-spring/jotai/master?style=flat&colorA=000000&colorB=000000)](https://travis-ci.org/react-spring/jotai)
[![Version](https://img.shields.io/npm/v/jotai?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/jotai)
[![Downloads](https://img.shields.io/npm/dt/jotai.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/jotai)

Jotai is pronounced "jaw-tie" and means "state" in Japanese.

You can try a live demo [here](https://codesandbox.io/s/jotai-demo-47wvh).

#### How does Jotai differ from Recoil?

* Minimalistic API
* No string keys
* TypeScript oriented

## First create a primitive atom

An atom represents a piece of state. All you need is to specify an initial value, which can be primitive values like strings and numbers, objects and arrays. You can create as many primitive atoms as you want.

```jsx
import { atom } from 'jotai'

const countAtom = atom(0)
const countryAtom = atom("Japan")
const citiesAtom = atom(["Tokyo", "Kyoto", "Osaka"])
const mangaAtom = atom({ "Dragon Ball": 1984, "One Piece": 1997, "Naruto": 1999 })
```

## Wrap your component tree with Jotai's Provider

You can only use atoms under this component tree.

```jsx
import { Provider } from 'jotai'

const Root = () => (
  <Provider>
    <App />
  </Provider>
)
```

## Use the atom in your components

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

## Create derived atoms with computed values

A new read-only atom can be created from existing atoms by passing a read function as the first argument. `get` allows you to fetch the contextual value of any atom.

```jsx
const doubledCountAtom = atom(get => get(countAtom) * 2)

function DoubleCounter() {
  const [doubledCount] = useAtom(doubledCountAtom)
  return <h2>{doubledCount}</h2>
```

# Recipes

## Creating an atom from multiple atoms

You can combine multiple atoms to create a derived atom.

```jsx
const count1 = atom(1)
const count2 = atom(2)
const count3 = atom(3)

const sum = atom(get => get(count1) + get(count2) + get(count3))
```

Or if you like fp patterns ... 

```jsx
const atoms = [count1, count1, count3, ...otherAtoms]
const sum = atom(get => atoms.map(get).reduce((acc, count) => acc + count))
```

## Derived async atoms (needs suspense)

You can make the read function an async function, too.

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

## You can create a writable derived atom

Specify a write function at the second argument. `get` will return the current value of an atom, `set` will update an atoms value.

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

## Write only atoms

Just do not define a read function.

```jsx
const multiplyCountAtom = atom(null, (get, set, by) => set(countAtom, get(countAtom) * by))

function Controls() {
  const [, multiply] = useAtom(multiplyCountAtom)
  return <button onClick={() => multiply(3)}>triple</button>
```

## Async actions (needs suspense)

Just make the write function an async function and call `set` when you're ready.

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
