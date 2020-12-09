# Debugging

## Using React Dev Tools

You can use [React Dev Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
to inspect Jotai state. To achieve that [useDebugValue](https://reactjs.org/docs/hooks-reference.html#usedebugvalue)
is used inside custom hooks. Keep in mind that it only works in dev mode
(`NODE_ENV === 'development'`).

### Provider

If you select jotai `Provider` component in the React Dev Tools to see custom
hook "DebugState" which allows you to see all atom states,
which is a map of atom config and atom values & dependents.

By default each state has the label like `1:<no debugLabel>` with number being
internal `key` assigned to each atom automatically. But you can add labels to
atoms to help you distinguish them more easily with `debugLabel`.

```js
const countAtom = atom(0)
if (process.env.NODE_ENV !== 'production') {
  countAtom.debugLabel = 'count'
}
```

So it will show up as `1:count` instead.

### useAtom

`useAtom` calls `useDebugValue` for atom values, so if you select the component
in React Dev Tools you would see "Atom" hooks for each atom that is used in the
component along with the value it has right now.

## Using Redux DevTools

You can use [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
to inspect the state of a particular atom. Please refer to [`useAtomDevtools`](../api/devtools.md#useAtomDevtools) hook from `jotai/devtools` bundle.

## Frozen Atoms

To find bugs where you accidentally tried to mutate objects stored in atoms you
could use [`freezeAtom`](../api/utils.md#freezeAtom) or
[`atomFrozenInDev`](../api/utils.md#atomFrozenInDev) from `jotai/utils` bundle.
Which returns atoms value that is deeply freezed with `Object.freeze`.
