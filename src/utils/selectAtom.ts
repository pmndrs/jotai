import { atom } from 'jotai'
import type { Atom } from 'jotai'
import { createMemoizeAtom } from './weakCache'

type ResolveType<T> = T extends Promise<infer V> ? V : T

const memoizeAtom = createMemoizeAtom()

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: ResolveType<Value>) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
): Atom<Slice> {
  return memoizeAtom(() => {
    type State = { slice: Slice }
    const stateAtom: Atom<State> = atom((get) => {
      let state: { slice: Slice } | undefined = undefined
      try {
        state = get(stateAtom)
      } catch (error) {
        // initial state
        state = undefined
      }

      const slice = selector(get(anAtom) as ResolveType<Value>)
      if (state && equalityFn(state.slice, slice)) {
        return state
      }

      return { slice }
    })
    const derivedAtom = atom((get) => get(stateAtom).slice)
    return derivedAtom
  }, [anAtom, selector, equalityFn])
}
