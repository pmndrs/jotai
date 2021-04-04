This doc describes `jotai/xstate` bundle.

Jotai's state management is privimite and flexible,
but that sometimes means too free.
XState is a sophisticated library to provide
a better and safer abstraction for state management.

## Install

You have to install `xstate` to access this bundle and its functions.

```
npm install xstate
# or
yarn add xstate
```

## atomWithMachine

`atomWithMachine` creates a new atom with XState machine.
It receives a function `getMachine` to create a new machine.
`getMachine` is invoked at the first use with `get` argument,
with which you can read other atom values.

```js
import { useAtom } from 'jotai'
import { atomWithMachine } from 'jotai/xstate'
import { assign, createMachine } from 'xstate'

const createEditableMachine = (value: string) =>
  createMachine <
  { value: string } >
  {
    id: 'editable',
    initial: 'reading',
    context: {
      value,
    },
    states: {
      reading: {
        on: {
          dblclick: 'editing',
        },
      },
      editing: {
        on: {
          cancel: 'reading',
          commit: {
            target: 'reading',
            actions: assign({
              value: (_, { value }) => value,
            }),
          },
        },
      },
    },
  }

const defaultTextAtom = atom('edit me')
const editableMachineAtom = atomWithMachine((get) =>
  // `get` is available only for initializing a machine
  createEditableMachine(get(defaultTextAtom))
)

const Toggle: React.FC = () => {
  const [state, send] = useAtom(editableMachineAtom)

  return (
    <div>
      {state.matches('reading') && (
        <strong onDoubleClick={send}>{state.context.value}</strong>
      )}
      {state.matches('editing') && (
        <input
          autoFocus
          defaultValue={state.context.value}
          onBlur={(e) => send({ type: 'commit', value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              send({ type: 'commit', value: e.target.value })
            }
            if (e.key === 'Escape') {
              send('cancel')
            }
          }}
        />
      )}
      <br />
      <br />
      <div>
        Double-click to edit. Blur the input or press <code>enter</code> to
        commit. Press <code>esc</code> to cancel.
      </div>
    </div>
  )
}
```

### Examples

Check examples with atomWithMachine:

- https://codesandbox.io/s/react-typescript-forked-gxwnx
