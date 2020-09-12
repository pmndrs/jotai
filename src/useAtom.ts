import { useCallback, useRef, useDebugValue } from 'react'
import { useContext, useContextSelector } from 'use-context-selector'

import { StateContext, ActionsContext, AtomState } from './Provider'
import { Atom, WritableAtom, AnyWritableAtom, NonPromise } from './types'
import { useIsoLayoutEffect } from './utils'

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

export function useAtom<Value, Update>(
  atom: WritableAtom<Value, Update>
): [NonPromise<Value>, (update: Update) => void]

export function useAtom<Value>(atom: Atom<Value>): [NonPromise<Value>, never]

export function useAtom<Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
) {
  const actions = useContext(ActionsContext)
  type PendingPartialState = ReturnType<typeof actions.read>[2]

  const pendingListRef = useRef<{ v: Value; p: PendingPartialState }[]>([])
  const value = useContextSelector(
    StateContext,
    useCallback(
      (state) => {
        const atomState = state.get(atom) as AtomState<Value> | undefined
        if (atomState) {
          if (atomState.promise) {
            throw atomState.promise
          }
          return atomState.value
        }
        const [
          initialPromise,
          initialValue,
          pendingPartialState,
        ] = actions.read(state, atom)
        if (initialPromise) {
          throw initialPromise
        }
        if (pendingPartialState.size) {
          pendingListRef.current.unshift({
            v: initialValue as Value,
            p: pendingPartialState,
          })
        }
        return initialValue
      },
      [atom, actions]
    )
  )

  const pendingPartialStateRef = useRef<PendingPartialState>()
  useIsoLayoutEffect(() => {
    const found = pendingListRef.current.find(({ v }) => v === value)
    if (found) {
      pendingPartialStateRef.current = found.p
    }
  })

  useIsoLayoutEffect(() => {
    const id = Symbol()
    actions.add(id, atom, pendingPartialStateRef.current)
    return () => {
      actions.del(id)
    }
  }, [actions, atom])

  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        actions.write(atom as AnyWritableAtom, update)
      } else {
        throw new Error('not writable atom')
      }
    },
    [atom, actions]
  )

  useDebugValue(value)
  return [value, setAtom]
}
