This doc describes `jotai/redux` bundle.

Jotai's state resides in React, but sometimes it would be nice
to intract with the world outside React.
Redux provides a store interface that can be used to store some values
and sync with atoms in jotai.

## Install

You have to install `redux` to access this bundle and its functions.

```
npm install redux
# or
yarn add redux
```

## atomWithStore

`atomWithStore` creates a new atom with redux store.
It's two-way binding and you can change the value from both ends.

```js
import { useAtom } from 'jotai'
import { atomWithStore } from 'jotai/redux'
import { createStore } from 'redux'

const initialState = { count: 0 }
const reducer = (state = initialState, action: { type: 'INC' }) => {
  if (action.type === 'INC') {
    return { ...state, count: state.count + 1 }
  }
  return state
}
const store = createStore(reducer)
const storeAtom = atomWithStore(store)

const Counter: React.FC = () => {
  const [state, dispatch] = useAtom(storeAtom)

  return (
    <>
      count: {state.count}
      <button onClick={() => dispatch({ type: 'INC' })}>button</button>
    </>
  )
}
```

### Examples

https://codesandbox.io/s/react-typescript-forked-cmlu5
