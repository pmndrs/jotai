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

## reducerAtom

Ref: https://github.com/react-spring/jotai/issues/38

```js
import { reducerAtom } from 'jotai/utils'

const countReducer = (prev, action) => {
  if (action.type === 'inc') {
    return prev + 1
  } else if (action.type === 'dec') {
    return prev - 1
  } else {
    throw new Error('unknown action type')
  }
}

const countReducerAtom = reducerAtom(0, countReducer)
```
