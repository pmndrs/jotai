# Getting Started

State in jotai is a set of atoms.
An atom is a piece of state.
Unlike useState in React, atoms are not tied to specific components.
Let's see how to define and use atoms.

## atom

There's an exported function called `atom`, which is to create
an atom config. We call it "config" as it's just a definition
and it doesn't hold a value. We may just call it "atom" if the context is clear.

To create a primitive atom (config), all you need is pass an initial value.

```js
import { atom } from 'jotai'

const priceAtom = atom(10)
const messageAtom = atom('hello')
const productAtom = atom({ id: 12, name: 'good stuff' })
```

You can also create derived atoms. We have three patterns.

- Read-only atom
- Write-only atom
- Read-Write atom

To create derived atoms, we pass a read function and an optional write function.

```js
const readOnlyAtom = atom((get) => get(priceAtom) * 2)
const writeOnlyAtom = atom(
  null, // it's a convention to pass `null` for the first argument
  (get, set, update) => {
    // `update` is any single value we receive for updating this atom
    set(priceAtom, get(priceAtom) - update.discount)
  }
)
const readWriteAtom = atom(
  (get) => get(priceAtom) * 2,
  (get, set, newPrice) => {
    set(priceAtom, newPrice / 2)
    // you can set as many atoms as you want at the same time
  }
)
```

`get` in the read function is to read atom value.
It's reactive and read dependencies are tracked.

`get` in the write function is also to read atom value, and it's not tracked.
Furthermore, it can't read unresolved async values.
For async behavior, please refer [./async.md](async.md).

`set` in the write function is to write atom value.
It will invoke the write function of the target atom.

Atom configs can be created anywhere, but referential equality important.
They can be created dynamically too.
To create an atom in render function, you need to `useMemo` to get a stable reference.

```jsx
const Component = ({ value }) => {
  const valueAtom = useMemo(() => atom({ value }), [value])
  // ...
}
```

## useAtom

The useAtom hook is to read an atom value stored in the Provider. It returns the atom value and an updating function as a tuple, just like useState. It takes an atom config created with `atom()`. Initially, there is no value stored in the Provider. The first time the atom is used via `useAtom`, it will add an initial value in the Provider. If the atom is a derived atom, the read function is executed to compute an initial value. When an atom is no longer used, meaning all the components using it is unmounted, and the atom config no longer exists, the value is removed from the Provider.

```js
const [value, updateValue] = useAtom(anAtom)
```

The `updateValue` takes just one argument, which will be passed to the third argument of writeFunction of the atom. The behavior totally depends on how the writeFunction is implemented.

## Provider

Atom configs don't hold values. Atom values are stored in a Provider. A Provider can be used like React context provider. Usually, we place one Provider at the root of the app, however you could use multiple Providers, each storing different atom values for its component tree.

```jsx
const Root = () => (
  <Provider>
    <App />
  </Provider>
)
```
