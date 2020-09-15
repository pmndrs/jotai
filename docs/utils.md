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
