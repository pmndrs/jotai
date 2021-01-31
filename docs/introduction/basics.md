This doc describes about jotai basic behavior.
For async behavior, refer [./async.md](async.md).

# Three basic functions

There are only three basic functions (except for bridge functions).
All other functions like in utils are
built with there three functions.

## atom

`atom` is a function to create an atom config.
The atom config is an object and the object identity is important.
It can be created from anywhere.
You shouldn't modify the object, after the initialization.

```js
const primitiveAtom = atom(initialValue)
const derivedAtomWithRead = atom(readFunction)
const derivedAtomWithReadWrite = atom(readFunction, writeFunction)
const derivedAtomWithWriteOnly = atom(null, writeFunction)
```

There are two kinds of atoms: a writable atom and a read-only atom.
Primitive atoms are always writable.
Derived atoms are writable if `writeFunction` is specified.
The `writeFunction` of primitive atoms is equivalent to the setState of React.useState.

The signature of `readFunction` is `(get) => Value | Promise<Value>`, and `get` is a function that takes an atom config and returns its value stored in Provider described below.
Dependency is tracked, so if `get` is used for an atom at least once, the readFunction will be reevaluated whenever the atom value is changed.

The signature of writeFunction is `(get, set, update) => void | Promise<void>`.
`get` is similar to the one described above, but it doesn't track the dependency. `set` is a function that takes an atom config and a new value which then updates the atom value in Provider. `update` is an arbitrary value that we receive from the updating function returned by `useAtom` described below.

## Provider

Atom configs don't hold values. Atom values are stored in a Provider. A Provider can be used like React context provider. Usually, we place one Provider at the root of the app, however you could use multiple Providers, each storing different atom values for its component tree.

```jsx
const Root = () => (
  <Provider>
    <App />
  </Provider>
)
```

## useAtom

The useAtom hook is to read an atom value stored in the Provider. It returns the atom value and an updating function as a tuple, just like useState. It takes an atom config created with `atom()`. Initially, there is no value stored in the Provider. The first time the atom is used via `useAtom`, it will add an initial value in the Provider. If the atom is a derived atom, the read function is executed to compute an initial value. When an atom is no longer used, meaning all the components using it is unmounted, and the atom config no longer exists, the value is removed from the Provider.

```js
const [value, updateValue] = useAtom(anAtom)
```

The `updateValue` takes just one argument, which will be passed to the third argument of writeFunction of the atom. The behavior totally depends on how the writeFunction is implemented.

# How atom dependency works

To begin with, let's explain this. In the current implementation, every time we invoke the "read" function, we refresh dependencies. For example, If A depends on B, it means that B is a dependency of A, and A is a dependent of B.

```js
const uppercaseAtom = atom((get) => get(textAtom).toUpperCase())
```

The read function is the first parameter of the atom.
The dependency will initially be empty. On first use, we run the read function and know that uppercaseAtom depends on textAtom. textAtom is the dependency of uppercaseAtom. So, add uppercaseAtom to the dependents of textAtom.
When we re-run the read function (because its dependency (=textAtom) is updated),
the dependency is built again, which is the same in this case. We then remove stale dependents and replace with the latest one.

# Atoms can be created on demand

Basic examples in readme only show defining atoms globally outside components.
There is no restrictions about when we create an atom.
As long as we know atoms are identified by their object referential identity,
it's okay to create them at anytime.

If you create atoms in render functions, you would typically want to use
some hooks like `useRef` or `useMemo`.

You can create an atom and store it wth `useState` or even in another atom.
See an example in [issue #5](https://github.com/pmndrs/jotai/issues/5).

You can cache atoms somewhere globally.
See [this example](https://twitter.com/dai_shi/status/1317653548314718208) or
[that example](https://github.com/pmndrs/jotai/issues/119#issuecomment-706046321).

Check [`atomFamily`](../api/utils.md#atomfamily) in utils too.

# Some more notes about atoms

- If you create a primitive atom, it will use predefined read/write functions to emulate `useState` behavior.
- If you create an atom with read/write functions, they can provide any behavior with some restrictions as follows.
- `read` function will be invoked during React render phase, so the function has to be pure. What is pure in React is described [here](https://gist.github.com/sebmarkbage/75f0838967cd003cd7f9ab938eb1958f).
- `write` function will be invoked where you called initially and in useEffect for following invocations. So, you shouldn't call `write` in render.
- When an atom is initially used with `useAtom`, it will invoke `read` function to get the initial value, this is recursive process. If an atom value exists in Provider, it will be used instead of invoking `read` function.
- Once an atom is used (and stored in Provider), it's value is only updated if its dependencies are updated (including updating directly with useAtom).
