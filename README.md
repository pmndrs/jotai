<p align="center">
  <!--<img width="500" src="ghost.png" />-->
  <h1>Jotai</h1>
</p>

![Bundle Size](https://badgen.net/bundlephobia/minzip/jotai) [![Build Status](https://travis-ci.org/react-spring/jotai.svg?branch=master)](https://travis-ci.org/react-spring/jotai) [![npm version](https://badge.fury.io/js/jotai.svg)](https://badge.fury.io/js/jotai) ![npm](https://img.shields.io/npm/dt/jotai.svg)

👻 Next gen state management that will spook you

    npm install jotai

#### 1. Create a primitive atom

An atom represents a piece of state. All you need is to specify an initial value, which can be primitive values like strings and numbers, objects and arrays.

```jsx
import { create } from 'jotai'

const countAtom = create({
  initialValue: 0,
})

const colorsAtom = create({
  initialValue: ["#ff0000"],
})
```

👉 You can create as many primitive atoms as you want.

#### 2. Wrap any component tree with Jotai's Provider

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

```jsx
import { create } from 'jotai'

const doubledCountAtom = create({
  read: ({ get }) => get(countAtom) * 2,
})

function DoubleCounter() {
  const [doubledCount] = useAtom(doubledCountAtom);

  return <h2>{doubledCount}</h2>
}
```

#### You can create a write only atom

A write only atom doesn't need an initial value or a read method.

```jsx
import { create } from 'jotai'
import countAtom from './countAtom'

const multiplyCountAtom = create({
  write: ({ get, set }, multiplicator) => {
    set(countAtom, get(countAtom) * multiplicator)
  },
})

function Controls() {
  const [, multiply] = useAtom(multiplyCountAtom)
  return <button onClick={() => multiply(3)}>triple</button>
}
```

#### You can create a writeable derived atom

Just define both read and write methods.

```jsx
import { create } from 'jotai'
import countAtom from './countAtom'

const decrementCountAtom = create({
  read: ({ get }) => get(countAtom),
  write: ({ get, set }, _unused) => {
    set(countAtom, get(countAtom) - 1)
  },
})

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
* Requires React Suspense for loading state
* No persistence nor URL encoded state

---

# Recipes

## Async actions

Just make `write` async function and call `set` when you're ready.

```jsx
const fetchCountAtom = create({
  read: ({ get }) => get(countAtom),
  write: async ({ set }, url) => {
    const response = await fetch(url)
    set(countAtom, await response.json().count)
  }
})
```
