<p align="center">
  <!--<img width="500" src="ghost.png" />-->
  <h1>Jotai</h1>
  <h3>👻 Next gen state management that will spook you</h3>
</p>

![Bundle Size](https://badgen.net/bundlephobia/minzip/jotai) [![Build Status](https://travis-ci.org/react-spring/jotai.svg?branch=master)](https://travis-ci.org/react-spring/jotai) [![npm version](https://badge.fury.io/js/jotai.svg)](https://badge.fury.io/js/jotai) ![npm](https://img.shields.io/npm/dt/jotai.svg)

Primitive and flexible state management for React.

No extra re-renders even with React Context.
State resides within React. You can get full benefit from
React Suspense, and Concurrent Mode in the future.
It's scalable from a simple React.useState replacement
to a large app with complicated state.

You can try a live demo soon.

    npm install jotai

#### 1. Create a primitive atom

An atom represents a piece of state. All you need is to specify an initial value, which can be primitive values like strings and numbers, objects and arrays.

```jsx
import { atom } from 'jotai'

const countAtom = atom(0)

const colorsAtom = atom(["#ff0000"])
```

👉 You can create as many primitive atoms as you want.

#### 2. Wrap any component tree with Jotai's Provider

You can only use atoms under this component tree.

```jsx
import { Provider } from 'jotai'

const Root = () => (
  <Provider>
    <App />
  </Provider>
)
```

#### 3. Use the atom in your components

It can be used just like `React.useState`:

```jsx
import { useAtom } from 'jotai'

function Counter() {
  const [count, setCount] = useAtom(countAtom)

  return (
    <h1>
      {count}
      <button onClick={() => setCount(c => c + 1)}>Increase</button>
    </h1>
  )
}
```

#### You can create a derived atom with computed value

A new atom can be created from existing atoms with a read method.
`get` will return current value of atom.

```jsx
import { atom, useAtom } from 'jotai'

const doubledCountAtom = atom(get => get(countAtom) * 2)

function DoubleCounter() {
  const [doubledCount] = useAtom(doubledCountAtom);

  return <h2>{doubledCount}</h2>
}
```

#### You can create a writable derived atom

Define both read and write methods.
`get` will return current value of atom.
`set` will update value of atom.

```jsx
import { atom, useAtom } from 'jotai'

const decrementCountAtom = atom(
  get => get(countAtom),
  (get, set, _unused) => {
    set(countAtom, get(countAtom) - 1)
  },
)

function Counter() {
  const [count, decrement] = useAtom(decrementCountAtom)

  return (
    <h1>
      {count}
      <button onClick={decrement}>Decrease</button>
    </h1>
  )
}
```

### Why Jotai over Recoil?

* Minimalistic API
* No string keys
* TypeScript oriented

Limitations:
* No persistence nor URL encoded state
* No loading state (prefer using React Suspense)

---

# Recipes

## Creating an atom from multiple atoms

You can combine multiple atoms to create a derived atom.

```jsx
const count1 = atom(0)
const count2 = atom(0)
const count3 = atom(0)

const sum = atom(get => get(count1) + get(count2) + get(count3))
```

## Write-only atoms

Just do not define a read method.

```jsx
const multiplyCountAtom = atom(
  null, // no read
  (get, set, multiplicator) => {
    set(countAtom, get(countAtom) * multiplicator)
  },
)

function Controls() {
  const [, multiply] = useAtom(multiplyCountAtom)
  return <button onClick={() => multiply(3)}>triple</button>
}
```

## Async actions

Just make the second argument `write` async function and call `set` when you're ready.

```jsx
const fetchCountAtom = create(
  get => get(countAtom),
  async (_get, set, url) => {
    const response = await fetch(url)
    set(countAtom, (await response.json()).count)
  }
)
```
## Async read

You can make the first argument `read` async function too.

```jsx
const delayedCountAtom = create(
  async get => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    get(countAtom);
  }
)
```
