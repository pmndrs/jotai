This doc describes `jotai/valtio` bundle.

Jotai's state resides in React, but sometimes it would be nice
to intract with the world outside React.
Valtio provides a proxy interface that can be used to store some values
and sync with atoms in jotai.
This only uses the vanilla api of valtio.

## Install

You have to install `valtio` to access this bundle and its functions.

```
npm install valtio
# or
yarn add valtio
```

## atomWithProxy

`atomWithProxy` creates a new atom with valtio proxy.
It's two-way binding and you can change the value from both ends.

```js
import { useAtom } from 'jotai'
import { atomWithProxy } from 'jotai/valtio'
import { proxy } from 'valtio/vanilla'

const proxyState = proxy({ count: 0 })
const stateAtom = atomWithProxy(proxyState)
const Counter: React.FC = () => {
  const [state, setState] = useAtom(stateAtom)

  return (
    <>
      count: {state.count}
      <button
        onClick={() =>
          setState((prev) => ({ ...prev, count: prev.count + 1 }))
        }>
        button
      </button>
    </>
  )
}
```

### Examples

https://codesandbox.io/s/react-typescript-forked-f5u4l
