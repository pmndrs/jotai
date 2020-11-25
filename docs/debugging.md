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

## useAtomDevtools

`useAtomDevtools` is a React hook that manages ReduxDevTools integration for a particular atom.


### Call Signature:

```typescript
useAtomDevtools<Value>(
  anAtom: WritableAtom<Value, Value>,
  name?: string
)
```

The `useAtomDevtools` hook accepts a generic type parameter (mirroring the type stored in the atom). Additionally, the hook accepts two invocation parameters, `anAtom` and `name`.
`anAtom` is the atom that will be attached to the devtools instance. `name` is an optional parameter that defines the debug label for the devtools instance. If `name` is undefined, `atom.debugLabel` will be used instead.

### Usage:

```typescript
import { useAtomDevtools } from 'jotai/devtools'

// The interface for the type stored in the atom.
export interface Task {
    label: string
    complete: boolean
}

// The atom to debug.
export const tasksAtom = atom<Task[]>([])

// If the useAtomDevtools name parameter is undefined, this value will be used instead.
tasksAtom.debugLabel = 'Tasks'

export const useTasksDevtools = () => {

    // The hook can be called simply by passing an atom for debugging.
    useAtomDevtools(tasksAtom)

    // Specify a custom type parameter
    useAtomDevtools<Task[]>(tasksAtom)

    // You can attach two devtools instances to the same atom and differentiate them with custom names.
    useAtomDevtools(tasksAtom, 'Tasks (Instance 1)')
    useAtomDevtools(tasksAtom, 'Tasks (Instance 2)')
}
```

## freezeAtom

```js
import { atom } from 'jotai'
import { freezeAtom } from 'jotai/utils'

const countAtom = freezeAtom(atom(0))
```

`freezeAtom` take an existing atom and return a new derived atom.
The returned atom is "frozen" which means when you use the atom
with `useAtom` in components or `get` in other atoms,
the atom value will be deeply freezed with Object.freeze.
It would be useful to find bugs where you accidentally tried
to mutate objects which can lead to unexpected behavior.

## atomFrozenInDev

```js
import { atomFrozenInDev as atom } from 'jotai/utils'

const countAtom = atom(0)
```

`atomFrozenInDev` is another function to create a frozen atom.
The atom is frozen only in the development mode.
In production, it works as the normal `atom`.
