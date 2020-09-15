import {
  useCallback,
  useRef,
  useLayoutEffect,
  useEffect,
  useDebugValue,
} from 'react'
import { useContext, useContextSelector } from 'use-context-selector'

import {
  StateContext,
  ActionsContext,
  AtomState,
  PartialState,
} from './Provider'
import { Atom, WritableAtom, AnyWritableAtom, NonPromise } from './types'

const isClient =
  typeof window !== 'undefined' &&
  !/ServerSideRendering/.test(window.navigator && window.navigator.userAgent)

const useIsoLayoutEffect = isClient ? useLayoutEffect : useEffect

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

type SetAtom<Update> = Update extends undefined
  ? () => void
  : (update: Update) => void

export function useAtom<Value, Update>(
  atom: WritableAtom<Value, Update>
): [NonPromise<Value>, (update: Update) => void]

export function useAtom<Value>(atom: Atom<Value>): [NonPromise<Value>, never]

export function useAtom<Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
) {
  const actions = useContext(ActionsContext)

  const pendingListRef = useRef<{ v: Value; p: PartialState }[]>([])
  const value = useContextSelector(
    StateContext,
    useCallback(
      (state) => {
        let atomState = state.get(atom) as AtomState<Value> | undefined
        if (!atomState) {
          const [initialAtomState, pendingPartialState] = actions.read(
            state,
            atom
          )
          atomState = initialAtomState as AtomState<Value>
          if (
            !atomState.error &&
            !atomState.promise &&
            pendingPartialState.size
          ) {
            pendingListRef.current.unshift({
              v: initialAtomState.value as Value,
              p: pendingPartialState,
            })
          }
        }
        if (atomState.error) {
          throw atomState.error
        }
        if (atomState.promise) {
          throw atomState.promise
        }
        return atomState.value
      },
      [atom, actions]
    )
  )

  const pendingPartialStateRef = useRef<PartialState>()
  useIsoLayoutEffect(() => {
    const pendingList = pendingListRef.current
    const found = pendingList.find(({ v }) => v === value)
    if (found) {
      pendingPartialStateRef.current = found.p
    }
    pendingList.splice(0, pendingList.length)
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
  ) as SetAtom<Update>

  useDebugValue(value)
  return [value, setAtom]
}
