import { useCallback, useContext, useMemo } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import { AtomState, State, subscribeAtom } from '../core/vanilla'
import { useMutableSource } from '../core/useMutableSource'
import { AnyAtom } from '../core/types'

type AtomsSnapshot = Map<AnyAtom, unknown>

export function useAtomsSnapshot(): AtomsSnapshot {
  const StoreContext = getStoreContext()
  const [mutableSource, , atomsMutableSource, subscribeAtoms] = useContext(
    StoreContext
  )

  if (atomsMutableSource === undefined && subscribeAtoms === undefined) {
    throw Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const atoms: AnyAtom[] = useMutableSource(
    atomsMutableSource,
    (atoms: AnyAtom[]) => atoms,
    subscribeAtoms
  )

  const subscribe = useCallback(
    (state: State, callback: () => void) => {
      // FIXME we don't need to resubscribe, just need to subscribe for new one
      const unsubs = atoms.map((atom) => subscribeAtom(state, atom, callback))
      return () => {
        unsubs.forEach((unsub) => unsub())
      }
    },
    [atoms]
  )
  const state: State = useMutableSource(mutableSource, getState, subscribe)

  return useMemo(() => {
    const atomToAtomValueTuples = atoms
      .filter((atom) => !!state.m.get(atom))
      .map<[AnyAtom, unknown]>((atom) => {
        const atomState = state.a.get(atom) ?? ({} as AtomState)
        return [atom, atomState.e || atomState.p || atomState.w || atomState.v]
      })
    return new Map(atomToAtomValueTuples)
  }, [atoms, state])
}

const getState = (state: State) => ({ ...state }) // shallow copy
