<p align="center">
  <!--<img width="500" src="ghost.png" />-->
  <h1>Jotai</h1>
</p>

![Bundle Size](https://badgen.net/bundlephobia/minzip/jotai) [![Build Status](https://travis-ci.org/react-spring/jotai.svg?branch=master)](https://travis-ci.org/react-spring/jotai) [![npm version](https://badge.fury.io/js/jotai.svg)](https://badge.fury.io/js/jotai) ![npm](https://img.shields.io/npm/dt/jotai.svg)

👻 ...

    npm install jotai

### Create a primitive atom

An atom represents a piece of state. All you need is to specify a default value, which can be atomics, objects and arrays.

```jsx
import { create } from 'jotai'

const countAtom = create({
  default: {
    count: 0,
  },
})
```

You can create as many primitive atoms as you want.

### Wrap entire component with Provider

```jsx
import { Provider } from 'jotai'

const Root = () => (
  <Provider>
    <App />
  </Provider>
)
```

### Then use the atom in your components

It can be used just like React.useState.

```jsx
import { useAtom } from 'jotai'

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const increment = () => setCount(c => c + 1)
  return <h1>{count} <button onClick={increment}>up</button></h1>
}
```

### You can create a derived atom with computed value

A new atom can be created from existing atoms.

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

### A write only atom can be created

Just like an action.

```jsx
import { create } from 'jotai'

const multiplyCountAtom = create({
  write: ({ get, set }, multiplicator) => set(countAtom, get(countAtom) * multiplicator),
})

function Controls() {
  const [, multiply] = useAtom(decrementCountAtom)
  return <button onClick={() => multiply(3)}>triple</button>
}
```

Having both `read` and `write` is also possible.

#### Why Jotai over Recoil?

* Minimalistic API
* No string keys
* TypeScript oriented

Limitations:
* Requires React Suspense for loading state
* No persistence nor URL encoded state

---

# Recipes

## Async actions

Just call `set` when you're ready, it doesn't care if your actions are async or not.

```jsx
const delayedCountAtom = create({
  read: ({ get }) => get(countAtom),
  write: ({ set }, newValue) => setTimeout(() => set(countAtom, newValue), 1000),
})
```
