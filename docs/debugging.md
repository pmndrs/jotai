# Debugging

We use [useDebugValue](https://reactjs.org/docs/hooks-reference.html#usedebugvalue) to see some values.

## useAtom

useAtom has useDebugValue for atom values.

## Provider

Provider uses a custom hook to see all atom states,
which is a map of atom config and atom values & dependents.

atom config can have `debugLabel` to distinguish easily.

```js
const countAtom = atom(0)
if (process.env.NODE_ENV !== 'production') {
  countAtom.debugLabel = 'count'
}
```
