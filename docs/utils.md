This describes about `jotai/utils` bundle

## useUpdateAtom

Ref: https://github.com/react-spring/jotai/issues/26

```js
import { atom, useAtom } from 'jotai'
import { useUpdateAtom } from 'jotai/utils'

const countAtom = atom(0)

const Counter = () => {
  const [count] = useAtom(countAtom)
  return <div>count: {count}</div>
}

const Controls = () => {
  const setCount = useUpdateAtom(countAtom)
  const inc = () => setCount(c => c + 1)
  return <button onClick={inc}>+1</button>
}
```

https://codesandbox.io/s/react-typescript-forked-3q11k

## atomWithReset / useResetAtom

Ref: https://github.com/react-spring/jotai/issues/41

```js
import { useAtom } from 'jotai'
import { atomWithReset, useResetAtom } from 'jotai/utils'

const todoListAtom = atomWithReset([{
  description: "Add a todo",
  checked: false
}])

const TodoList = () => {
  const [todoList, setTodoList] = useAtom(todoListAtom)
  const resetTodoList = useResetAtom(todoListAtom)

  return (
    <>
      <ul>
        {todoList.map((todo) => (
          <li>{todo.description}</li>
        ))}
      </ul>

      <button
        onClick={() => setTodoList((l) => [ ...l, {
          description: `New todo ${new Date().toDateString()}`,
          checked: false
        }])}
      >
        Add todo
      </button>
      <button onClick={resetTodoList}>Reset</button>
    </>
  )
}
```

https://codesandbox.io/s/react-typescript-forked-w91cq

## useReducerAtom

```js
import { atom } from 'jotai'
import { useReducerAtom } from 'jotai/utils'

const countReducer = (prev, action) => {
  if (action.type === 'inc') return prev + 1
  if (action.type === 'dec') return prev - 1
  throw new Error('unknown action type')
}

const countAtom = atom(0)

const Counter = () => {
  const [count, dispatch] = useReducerAtom(countAtom, countReducer);
  return (
    <div>
      {count}
      <button onClick={() => dispatch({ type: "inc" })}>+1</button>
      <button onClick={() => dispatch({ type: "dec" })}>-1</button>
    </div>
  );
};
```

https://codesandbox.io/s/react-typescript-forked-eg0mw

## atomWithReducer

Ref: https://github.com/react-spring/jotai/issues/38

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
