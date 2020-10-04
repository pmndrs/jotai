This doc describes about jotai core behavior.
For async behavior, refer [./async.md](async.md).

# API

## atom

`atom` is a function to create an atom config. It's an object and the object identity is important. You can create it from everywhere. Once created, you shouldn't modify the object. (Note: There might be an advanced use case to mutate atom configs after creation. At the moment, it's not officially supported though.)

```js
const primitiveAtom = atom(initialValue)
const derivedAtomWithRead = atom(readFunction)
const derivedAtomWithReadWrite = atom(readFunction, writeFunction)
const derivedAtomWithWriteOnly = atom(null, writeFunction)
```

There are two kinds of atoms:  a writable atom and a read-only atom
Primitive atoms are always writable. Derived atoms are writable if writeFunction is specified.
The writeFunction of primitive atoms is equivalent to the setState of React.useState.

The signature of readFunction is `(get) => Value | Promise<Value>`, and `get` is a function that takes an atom config and returns its value stored in Provider described below.
Dependency is tracked, so if `get` is used for an atom at least once, then whenever the atom value is changed, the readFunction will be reevaluated.

The signature of writeFunction is `(get, set, update) => void | Promise<void>`.
`get` is similar to the one described above, but it doesn't track the dependency. `set` is a function that takes an atom config and a new value, and update the atom value in Provider. `update` is an arbitrary value that we receive from the updating function returned by useAtom described below.

## Provider

Atom configs don't hold values. Atom values are stored in a Provider. A Provider can be used like React context provider. Usually, we place one Provider at the root of the app, however you could use multiple Providers, each storing different atom values for its component tree.

```js
const Root = () => (
  <Provider>
    <App />
  </Provider>
)
```

## useAtom

The useAtom hook is to read an atom value stored in the Provider. It returns the atom value and an updating function as a tuple, just like useState. It takes an atom config created with `atom()`. Initially, there is no value stored in the Provider. At the first time the atom is used via `useAtom`, it will add an initial value in the Provider. If the atom is a derived atom, the read function is executed to compute an initial value. When an atom is no longer used, meaning the component using it is unmounted, the value is removed from the Provider.

```js
const [value, updateValue] = useAtom(anAtom)
```

The `updateValue` takes just one argument, which will be passed to the third argument of writeFunction of the atom. The behavior totally depends on how the writeFunction is implemented.

## useBridge/Bridge

This will allow using accross multiple roots.
You get a bridge value with `useBridge` in the outer component
and pass it to `Bridge` in the inner component.

```jsx
const Component = ({ children }) => {
  const brigeValue = useBridge()
  return (
    <AnotherRerender>
      <Bridge value={bridgeValue}>
        {children}
      </Bridge>
    </AnotherRerender>
  )
}
```

A working example: https://codesandbox.io/s/jotai-r3f-fri9d

# How atom dependency works

To begin with, let's explain this. In the current implementation, every time we invoke the "read" function, we refresh dependents.

```js
const uppercaseAtom = atom(get => get(textAtom).toUpperCase())
```

The read function is the first parameter of the atom.
Initially dependency is empty. At the first use, we run the read function, and know uppercaseAtom depends on textAtom. textAtom is the dependency of uppercaseAtom. So, add uppercaseAtom to the dependents of textAtom.
Next time, when we re-run the read function (because its dependency (=textAtom) is updated),
we build the dependency again, which is the same in this case. we then remove stale dependents and replace with the latest one.

# Some more notes about atoms

- If you create a primitive atom, it will use predefined read/write functions to emulate `useState` behavior.
- If you create an atom with read/write functions, they can provide any behavior with some restrictions as follows.
- `read` function will be invoked during React render phase, so the function has to be pure. What is pure in React is described [here](https://gist.github.com/sebmarkbage/75f0838967cd003cd7f9ab938eb1958f).
- `write` function will be invoked where you called initially and in useEffect for following invocations. So, you shouldn't call `write` in render.
- When an atom is initially used with `useAtom`, it will invoke `read` function to get the initial value, this is recursive process. If an atom value exists in Provider, it will be used instead of invoking `read` function.
- Once an atom is used (and stored in Provider), it's value is only updated if its dependencies are updated (including updating directly with useAtom).
