# Async

Async support is first class in jotai. It fully leverages React Suppense.

> Technically, Suspense usage other than React.lazy is still unsupported / undocumented in React 17. If this is blocking, check out [guides/no-suspense](../guides/no-suspense.md).

## Suspense

To use async atoms, you need to wrap your component tree with `<Suspense>`.
If you have `<Provider>` at least one `<Suspense>` is placed inside the `<Provider>`.

```jsx
const App = () => (
  <Provider>
    <Suspense fallback="Loading...">
      <Layout />
    </Suspense>
  </Provider>
)
```

Having more `<Suspense>`s in the component tree is possible.

## Async read atom

The `read` function of an atom can return a promise.
It will suspend and re-render when the promise is fulfilled.

Most importantly, useAtom only returns a resolved value.

```js
const countAtom = atom(1)
const asyncCountAtom = atom(async (get) => get(countAtom) * 2)
// even though the read function returns a promise,

const Component = () => {
  const [num] = useAtom(asyncCountAtom)
  // `num` is guaranteed to be a number.
}
```

An atom becomes async not only if the atom read function is async,
but also one or more of its dependencies are async.

```js
const anotherAtom = atom((get) => get(asyncCountAtom) / 2)
// even though this atom doesn't return a promise,
// it is a read async atom because `asyncCountAtom` is async.
```

## Async write atom

There are another kind of async atoms, called async write atom.
When `write` function of atom returns a promise, it may suspend.
This happens only if the atom is used directly with useAtom,
regardless of its value. (The atom value can be just `null`.)

```js
const countAtom = atom(1)
const asyncIncrementAtom = atom(null, async (get, set) => {
  // await something
  set(countAtom, get(countAtom) + 1)
})

const Component = () => {
  const [, increment] = useAtom(asyncIncrementAtom)
  // it will suspend while `increment` is pending.
}
```

> There's no way to know as of now if an atom suspends because of `read` or `write`.
