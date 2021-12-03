<p align="center">
  <img src="img/title.svg" alt="jotai" />
</p>

Primitive and flexible state management for React

`npm i jotai`

[![Build Status](https://img.shields.io/github/workflow/status/pmndrs/jotai/Lint?style=flat&colorA=000000&colorB=000000)](https://github.com/pmndrs/jotai/actions?query=workflow%3ALint)
[![Build Size](https://img.shields.io/bundlephobia/minzip/jotai?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=jotai)
[![Version](https://img.shields.io/npm/v/jotai?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/jotai)
[![Downloads](https://img.shields.io/npm/dt/jotai.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/jotai)
[![Discord Shield](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=ffffff)](https://discord.gg/poimandres)
[![Open Collective](https://img.shields.io/opencollective/all/jotai?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/jotai)

Jotai is pronounced "joe-tie" and means "state" in Japanese.

You can try live demos in the following:
[Demo 1](https://codesandbox.io/s/jotai-demo-47wvh) |
[Demo 2](https://codesandbox.io/s/jotai-demo-forked-x2g5d).

#### How does Jotai differ from Recoil?

- Minimalistic API
- No string keys
- TypeScript oriented

### First create a primitive atom

An atom represents a piece of state. All you need is to specify an initial
value, which can be primitive values like strings and numbers, objects and
arrays. You can create as many primitive atoms as you want.

```jsx
import { atom } from 'jotai'

const countAtom = atom(0)
const countryAtom = atom('Japan')
const citiesAtom = atom(['Tokyo', 'Kyoto', 'Osaka'])
const mangaAtom = atom({ 'Dragon Ball': 1984, 'One Piece': 1997, Naruto: 1999 })
```

### Use the atom in your components

It can be used like `React.useState`:

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

A new read-only atom can be created from existing atoms by passing a read
function as the first argument. `get` allows you to fetch the contextual value
of any atom.

```jsx
const doubledCountAtom = atom((get) => get(countAtom) * 2)

function DoubleCounter() {
  const [doubledCount] = useAtom(doubledCountAtom)
  return <h2>{doubledCount}</h2>
```

## Recipes

### Creating an atom from multiple atoms

You can combine multiple atoms to create a derived atom.

```jsx
const count1 = atom(1)
const count2 = atom(2)
const count3 = atom(3)

const sum = atom((get) => get(count1) + get(count2) + get(count3))
```

Or if you like fp patterns ...

```jsx
const atoms = [count1, count2, count3, ...otherAtoms]
const sum = atom((get) => atoms.map(get).reduce((acc, count) => acc + count))
```

### Derived async atoms <img src="https://img.shields.io/badge/-needs_suspense-black" alt="needs suspense" />

You can make the read function an async function too.

```jsx
const urlAtom = atom("https://json.host.com")
const fetchUrlAtom = atom(
  async (get) => {
    const response = await fetch(get(urlAtom))
    return await response.json()
  }
)

function Status() {
  // Re-renders the component after urlAtom changed and the async function above concludes
  const [json] = useAtom(fetchUrlAtom)
```

### You can create a writable derived atom

Specify a write function at the second argument. `get` will return the current
value of an atom. `set` will update an atoms value.

```jsx
const decrementCountAtom = atom(
  (get) => get(countAtom),
  (get, set, _arg) => set(countAtom, get(countAtom) - 1),
)

function Counter() {
  const [count, decrement] = useAtom(decrementCountAtom)
  return (
    <h1>
      {count}
      <button onClick={decrement}>Decrease</button>
```

### Write only atoms

Just do not define a read function.

```jsx
const multiplyCountAtom = atom(null, (get, set, by) => set(countAtom, get(countAtom) * by))

function Controls() {
  const [, multiply] = useAtom(multiplyCountAtom)
  return <button onClick={() => multiply(3)}>triple</button>
```

### Async actions

Just make the write function an async function and call `set` when you're ready.

```jsx
const fetchCountAtom = atom(
  (get) => get(countAtom),
  async (_get, set, url) => {
    const response = await fetch(url)
    set(countAtom, (await response.json()).count)
  }
)

function Controls() {
  const [count, compute] = useAtom(fetchCountAtom)
  return <button onClick={() => compute("http://count.host.com")}>compute</button>
```

## Installation notes

This package requires some peer dependencies, which you need to install by
yourself.

```bash
yarn add jotai react
```

## Learn Jotai

[![free egghead Jotai introduction course by Daishi](https://res.cloudinary.com/dg3gyk0gu/image/upload/v1636388460/egghead-next-pages/jotai/github--jotai-atoms.png)](https://egghead.io/courses/manage-application-state-with-jotai-atoms-2c3a29f0?utm_source=github&utm_medium=cta&utm_term=jotai)

## More documents

- Basics
  - [Concepts](./docs/basics/concepts.mdx)
  - [Primitives](./docs/basics/primitives.mdx)
  - [Async](./docs/basics/async.mdx)
  - [Comparison](./docs/basics/comparison.mdx)
  - [Showcase](./docs/basics/showcase.mdx)
- Guides
  - [TypeScript](./docs/guides/typescript.mdx)
  - [Debugging](./docs/guides/debugging.mdx)
  - [Testing](./docs/guides/testing.mdx)
  - [Persistence](./docs/guides/persistence.mdx)
  - [Next.js](./docs/guides/nextjs.mdx)
  - [Resettable](./docs/guides/resettable.mdx)
  - [No Suspense](./docs/guides/no-suspense.mdx)
  - [Atoms in atom](./docs/guides/atoms-in-atom.mdx)
- API
  - [Core](./docs/api/core.mdx)
  - [Utils](./docs/api/utils.mdx)
  - [Devtools](./docs/api/devtools.mdx)
  - [Babel](./docs/api/babel.mdx)
- Integrations
  - [Immer](./docs/integrations/immer.mdx)
  - [Optics](./docs/integrations/optics.mdx)
  - [Query](./docs/integrations/query.mdx)
  - [XState](./docs/integrations/xstate.mdx)
  - [Valtio](./docs/integrations/valtio.mdx)
  - [Zustand](./docs/integrations/zustand.mdx)
  - [Redux](./docs/integrations/redux.mdx)
  - [URQL](./docs/integrations/urql.mdx)
- Advanced Recipes
  - [Large Objects](./docs/advanced-recipes/large-objects.mdx)
  - [Atom Creators](./docs/advanced-recipes/atom-creators.mdx)
