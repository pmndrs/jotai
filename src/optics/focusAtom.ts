import { atom } from 'jotai'
import * as O from 'optics-ts'
import {
  getWeakCacheItem,
  setWeakCacheItem,
  WeakCache,
} from '../utils/weakCache'
import type { WritableAtom, SetStateAction, PrimitiveAtom } from '../core/types'

const focusAtomCache: WeakCache<WritableAtom<any, any>> = new WeakMap()

const isFunction = <T>(x: T): x is T & Function => typeof x === 'function'

export function focusAtom<S, A>(
  atom: PrimitiveAtom<S>,
  callback: (optic: O.OpticFor<S>) => O.Prism<S, any, A>
): WritableAtom<A | undefined, SetStateAction<A>>

export function focusAtom<S, A>(
  atom: PrimitiveAtom<S>,
  callback: (optic: O.OpticFor<S>) => O.Traversal<S, any, A>
): WritableAtom<Array<A>, SetStateAction<A>>

export function focusAtom<S, A>(
  atom: PrimitiveAtom<S>,
  callback: (
    optic: O.OpticFor<S>
  ) => O.Lens<S, any, A> | O.Equivalence<S, any, A> | O.Iso<S, any, A>
): WritableAtom<A, SetStateAction<A>>

export function focusAtom<S, A>(
  baseAtom: PrimitiveAtom<S>,
  callback: (
    optic: O.OpticFor<S>
  ) =>
    | O.Lens<S, any, A>
    | O.Equivalence<S, any, A>
    | O.Iso<S, any, A>
    | O.Prism<S, any, A>
    | O.Traversal<S, any, A>
):
  | WritableAtom<A | undefined, SetStateAction<A>>
  | WritableAtom<Array<A>, SetStateAction<A>>
  | PrimitiveAtom<S> {
  const deps = [baseAtom, callback] as const
  const cachedAtom = getWeakCacheItem(focusAtomCache, deps)
  if (cachedAtom) {
    return cachedAtom
  }
  const focus = callback(O.optic<S>())
  const derivedAtom = atom<A, SetStateAction<A>>(
    (get) => {
      const newValue = getValueUsingOptic(focus, get(baseAtom))
      return newValue as any
    },
    (_, set, update) => {
      const newValueProducer = isFunction(update)
        ? O.modify(focus)(update)
        : O.set(focus)(update)

      set(baseAtom, newValueProducer)
    }
  )
  derivedAtom.scope = baseAtom.scope
  setWeakCacheItem(focusAtomCache, deps, derivedAtom)
  return derivedAtom
}

const getValueUsingOptic = <S, A>(
  focus:
    | O.Lens<S, any, A>
    | O.Equivalence<S, any, A>
    | O.Iso<S, any, A>
    | O.Prism<S, any, A>
    | O.Traversal<S, any, A>,
  bigValue: S
) => {
  if (focus._tag === 'Traversal') {
    const values = O.collect(focus)(bigValue)
    return values
  }
  if (focus._tag === 'Prism') {
    const value = O.preview(focus)(bigValue)
    return value
  }
  const value = O.get(focus)(bigValue)
  return value
}
