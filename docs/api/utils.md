This doc describes `jotai/utils` bundle.

## useUpdateAtom

Ref: https://github.com/pmndrs/jotai/issues/26

```jsx
import { atom, useAtom } from 'jotai'
import { useUpdateAtom } from 'jotai/utils'

const countAtom = atom(0)

const Counter = () => {
  const [count] = useAtom(countAtom)
  return <div>count: {count}</div>
}

const Controls = () => {
  const setCount = useUpdateAtom(countAtom)
  const inc = () => setCount((c) => c + 1)
  return <button onClick={inc}>+1</button>
}
```

https://codesandbox.io/s/react-typescript-forked-3q11k

## useAtomValue

Ref: https://github.com/pmndrs/jotai/issues/212

```jsx
import { atom, Provider, useAtom } from 'jotai'
import { useAtomValue } from 'jotai/utils'

const countAtom = atom(0)

const Counter = () => {
  const setCount = useUpdateAtom(countAtom)
  const count = useAtomValue(countAtom)
  return (
    <>
      <div>count: {count}</div>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </>
  )
}
```

https://codesandbox.io/s/react-typescript-forked-1x90m

## atomWithReset

Ref: https://github.com/pmndrs/jotai/issues/41

```ts
function atomWithReset<Value>(
  initialValue: Value
): WritableAtom<Value, SetStateAction<Value> | typeof RESET>
```

Creates an atom that could be reset to its `initialValue` with
[`useResetAtom`](./utils.md#useResetAtom) hook. It works exactly the same
way as primitive atom would, but you are also able to set it to a special value
[`RESET`](./utils.md#RESET). See examples in [Resettable atoms](../guides/resettable.md).

### Example

```js
import { atomWithReset } from 'jotai/utils'

const dollarsAtom = atomWithReset(0)
const todoListAtom = atomWithReset([
  { description: 'Add a todo', checked: false },
])
```

## useResetAtom

```ts
function useResetAtom<Value>(
  anAtom: WritableAtom<Value, typeof RESET>
): () => void | Promise<void>
```

Resets a [Resettable atom](../guides/resettable.md) to its initial value.

### Example

```jsx
import { useResetAtom } from 'jotai/utils'
import { todoListAtom } from './store'

const TodoResetButton = () => {
  const resetTodoList = useResetAtom(todoListAtom)
  return <button onClick={resetTodoList}>Reset</button>
}
```

## RESET

Ref: https://github.com/pmndrs/jotai/issues/217

```ts
const RESET: unique symbol
```

Special value that is accepted by [Resettable atoms](../guides/resettable.md)
created with [`atomWithReset`](./utils.md#atomWithReset) or writable atom created
with `atom` if it accepts `RESET` symbol.

### Example

```jsx
import { atom } from 'jotai'
import { atomWithReset, useResetAtom, RESET } from 'jotai/utils'

const dollarsAtom = atomWithReset(0)
const centsAtom = atom(
  (get) => get(dollarsAtom) * 100,
  (get, set, newValue: number | typeof RESET) =>
    set(dollarsAtom, newValue === RESET ? newValue : newValue / 100)
)

const ResetExample: React.FC = () => {
  const setDollars = useUpdateAtom(dollarsAtom)
  const resetCents = useResetAtom(centsAtom)

  return (
    <>
      <button onClick={() => setDollars(RESET)}>Reset dollars</button>
      <button onClick={resetCents}>Reset cents</button>
    </>
  )
}
```

## useReducerAtom

```jsx
import { atom } from 'jotai'
import { useReducerAtom } from 'jotai/utils'

const countReducer = (prev, action) => {
  if (action.type === 'inc') return prev + 1
  if (action.type === 'dec') return prev - 1
  throw new Error('unknown action type')
}

const countAtom = atom(0)

const Counter = () => {
  const [count, dispatch] = useReducerAtom(countAtom, countReducer)
  return (
    <div>
      {count}
      <button onClick={() => dispatch({ type: 'inc' })}>+1</button>
      <button onClick={() => dispatch({ type: 'dec' })}>-1</button>
    </div>
  )
}
```

https://codesandbox.io/s/react-typescript-forked-eg0mw

## atomWithReducer

Ref: https://github.com/pmndrs/jotai/issues/38

```js
import { atomWithReducer } from 'jotai/utils'

const countReducer = (prev, action) => {
  if (action.type === 'inc') return prev + 1
  if (action.type === 'dec') return prev - 1
  throw new Error('unknown action type')
}

const countReducerAtom = atomWithReducer(0, countReducer)
```

https://codesandbox.io/s/react-typescript-forked-g3tsx

## atomFamily

Ref: https://github.com/pmndrs/jotai/issues/23

### Usage

```js
atomFamily(initializeRead, initializeWrite, areEqual): (param) => Atom
```

This will create a function that takes `param` and returns an atom.
If it's already created, it will return it from the cache.
`initializeRead` and `initializeWrite` are functions and return
`read` and `write` respectively that are fed into `atom()`.
Note that `initializeWrite` is optional.
The third argument `areEqual` is also optional, which tell
if two params are equal (defaults to `Object.is`.)

To reproduce the similar behavior to [Recoil's atomFamily/selectorFamily](https://recoiljs.org/docs/api-reference/utils/atomFamily),
specify a deepEqual function to `areEqual`. For example:

```js
import deepEqual from 'fast-deep-equal'

const fooFamily = atomFamily((param) => param, null, deepEqual)
```

### Examples

```js
import { atomFamily } from 'jotai/utils'

const todoFamily = atomFamily((name) => name)

todoFamily('foo')
// this will create a new atom('foo'), or return the one if already created
```

```js
import { atomFamily } from 'jotai/utils'

const todoFamily = atomFamily(
  (name) => (get) => get(todosAtom)[name],
  (name) => (get, set, arg) => {
    const prev = get(todosAtom)
    return { ...prev, [name]: { ...prev[name], ...arg } }
  }
)
```

```js
import { atomFamily } from 'jotai/utils'

const todoFamily = atomFamily(
  ({ id, name }) => ({ name }),
  null,
  (a, b) => a.id === b.id
)
```

### Codesandbox

https://codesandbox.io/s/react-typescript-forked-8zfrn

## selectAtom

Ref: https://github.com/pmndrs/jotai/issues/36

```js
function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Value) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
): Atom<Slice>
```

This function creates a derived atom whose value is a function of the original atom's value,
determined by `selector.`
The selector function runs whenever the original atom changes; it updates the derived atom
only if `equalityFn` reports that the derived value has changed.
By default, `equalityFn` is reference equality, but you can supply your favorite deep-equals
function to stabilize the derived value where necessary.

### Examples

```js
const defaultPerson = {
  name: {
    first: 'Jane',
    last: 'Doe',
  },
  birth: {
    year: 2000,
    month: 'Jan',
    day: 1,
    time: {
      hour: number,
      minute: number,
    },
  },
}

// Original atom.
const personAtom = atom(defaultPerson)

// Tracks person.name. Updated when person.name object changes, even
// if neither name.first nor name.last actually change.
const nameAtom = selectAtom(personAtom, (person) => person.name)

// Tracks person.birth. Updated when year, month, day, hour, or minute changes.
// Use of deepEquals means that this atom doesn't update if birth field is
// replaced with a new object containing the same data. E.g., if person is re-read
// from a database.
const birthAtom = selectAtom(personAtom, (person) => person.birth, deepEquals)
```

Ref: https://codesandbox.io/s/react-typescript-forked-8czek

## useAtomCallback

Ref: https://github.com/pmndrs/jotai/issues/60

### Usage

```js
useAtomCallback(
  callback: (get: Getter, set: Setter, arg: Arg) => Result
): (arg: Arg) => Promise<Result>
```

This hook allows to interact with atoms imperatively.
It takes a callback function that works like atom write function,
and returns a function that returns a promise.

The callback to pass in the hook must be stable (should be wrapped with useCallback).

### Examples

```jsx
import { useEffect, useState, useCallback } from 'react'
import { Provider, atom, useAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'

const countAtom = atom(0)

const Counter = () => {
  const [count, setCount] = useAtom(countAtom)
  return (
    <>
      {count} <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </>
  )
}

const Monitor = () => {
  const [count, setCount] = useState(0)
  const readCount = useAtomCallback(
    useCallback((get) => {
      const currCount = get(countAtom)
      setCount(currCount)
      return currCount
    }, [])
  )
  useEffect(() => {
    const timer = setInterval(async () => {
      console.log(await readCount())
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [readCount])
  return <div>current count: {count}</div>
}
```

### Codesandbox

https://codesandbox.io/s/react-typescript-forked-6ur43

## freezeAtom

```js
import { atom } from 'jotai'
import { freezeAtom } from 'jotai/utils'

const countAtom = freezeAtom(atom(0))
```

`freezeAtom` take an existing atom and return a new derived atom.
The returned atom is "frozen" which means when you use the atom
with `useAtom` in components or `get` in other atoms,
the atom value will be deeply freezed with Object.freeze.
It would be useful to find bugs where you accidentally tried
to mutate objects which can lead to unexpected behavior.

## atomFrozenInDev

```js
import { atomFrozenInDev as atom } from 'jotai/utils'

const countAtom = atom(0)
```

`atomFrozenInDev` is another function to create a frozen atom.
The atom is frozen only in the development mode.
In production, it works as the normal `atom`.

## splitAtom

The `splitAtom` utility is useful for when you want to get an atom for each element in a list.
It works for read/write atoms that contain a list. When used on such an atom, it returns an atom
which itself contains a list of atoms, each corresponding to the respective item in the original list.

A simplified type signature would be:

```ts
type SplitAtom = <Item>(arrayAtom: PrimitiveAtom<Array<Item>>): Atom<Array<PrimitiveAtom<Item>>>
```

Additionally, the atom returned by `splitAtom` contains a removal function in the `write` direction,
this is useful for when you want a simple way to remove each element in the original atom.

See the below example for usage.

### codesandbox

https://codesandbox.io/s/react-typescript-forked-7nir9?file=/src/App.tsx

```tsx
import * as React from 'react'
import { Provider, atom, useAtom, PrimitiveAtom } from 'jotai'
import { splitAtom } from 'jotai/utils'
import './styles.css'

const initialState = [
  {
    task: 'help the town',
    done: false,
  },
  {
    task: 'feed the dragon',
    done: false,
  },
]

const todosAtom = atom(initialState)
const todoAtomsAtom = splitAtom(todosAtom)

const TodoList = () => {
  const [todoAtoms, removeTodoAtom] = useAtom(todoAtomsAtom)
  return (
    <ul>
      {todoAtoms.map((todoAtom) => (
        <TodoItem todoAtom={todoAtom} remove={() => removeTodoAtom(todoAtom)} />
      ))}
    </ul>
  )
}

type TodoType = typeof initialState[number]

const TodoItem = ({
  todoAtom,
  remove,
}: {
  todoAtom: PrimitiveAtom<TodoType>
  remove: () => void
}) => {
  const [todo, setTodo] = useAtom(todoAtom)
  return (
    <div>
      <input
        value={todo.task}
        onChange={(e) => {
          setTodo((oldValue) => ({ ...oldValue, task: e.target.value }))
        }}
      />
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => {
          setTodo((oldValue) => ({ ...oldValue, done: !oldValue.done }))
        }}
      />
      <button onClick={remove}>remove</button>
    </div>
  )
}

const App = () => (
  <Provider>
    <TodoList />
  </Provider>
)

export default App
```
