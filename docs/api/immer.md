This doc describes `jotai/immer` bundle.

## Install

You have to install `immer` to access this bundle and its functions.

```
npm install immer
# or
yarn add immer
```

## atomWithImmer

`atomWithImmer` creates a new atom similar to the regular [`atom`](../api/core.md#atom) [atom] with a different `writeFunction`. In this bundle, we don't have read-only atoms, because the point of these functions is the immer produce(mutability) function.
The signature of writeFunction is `(get, set, update: (draft: Draft<Value>) => void) => void`.

```js
import { useAtom } from 'jotai'
import { atomWithImmer } from 'jotai/immer'

const countAtom = atomWithImmer(0)

const Counter = () => {
  const [count] = useAtom(countAtom)
  return <div>count: {count}</div>
}

const Controls = () => {
  const [, setCount] = useAtom(setCountAtom)
  // setCount === update : (draft: Draft<Value>) => void
  const inc = () => setCount((c) => (c = c + 1))
  return <button onClick={inc}>+1</button>
}
```

### Examples

Check examples with atomWithImmer:

- https://codesandbox.io/s/jotai-immer-example-8zrqs

## withImmer

`withImmer` takes an atom and returns a derived atom, same as `atomWithImmer` it has a different `writeFunction`.

```js
import { useAtom, atom } from 'jotai'
import { withImmer } from 'jotai/immer'

const primitiveAtom = atom(0)
const countAtom = withImmer(primitiveAtom)

const Counter = () => {
  const [count] = useAtom(countAtom)
  return <div>count: {count}</div>
}

const Controls = () => {
  const [, setCount] = useAtom(setCountAtom)
  // setCount === update : (draft: Draft<Value>) => void
  const inc = () => setCount((c) => (c = c + 1))
  return <button onClick={inc}>+1</button>
}
```

## useImmerAtom

This hook takes an atom and replaces the atom's `writeFunction` with the new immer-like `writeFunction` like the previous helpers.

```jsx
import { useAtom } from 'jotai'
import { useImmerAtom } from 'jotai/immer'

const primitiveAtom = atom(0)

const Counter = () => {
  const [count] = useImmerAtom(primitiveAtom)
  return <div>count: {count}</div>
}

const Controls = () => {
  const [, setCount] = useImmerAtom(primitiveAtom)
  // setCount === update : (draft: Draft<Value>) => void
  const inc = () => setCount((c) => (c = c + 1))
  return <button onClick={inc}>+1</button>
}
```

It would be better if you don't use `withImmer` and `atomWithImmer` with `useImmerAtom` because they provide the immer-like `writeFunction` and we don't need to create a new one.

## Codesandbox

A good example of this bundle in [codesandbox](https://codesandbox.io/s/immer-jotai-doc-ms9pv?file=/src/App.tsx).
