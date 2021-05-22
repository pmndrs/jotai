import { atom } from 'jotai'
import type { WritableAtom, SetStateAction } from 'jotai'
import * as O from 'optics-ts'
import {
  getWeakCacheItem,
  setWeakCacheItem,
  WeakCache,
} from '../utils/weakCache'

const focusAtomCache: WeakCache<WritableAtom<any, any>> = new WeakMap()

const isFunction = <T>(x: T): x is T & Function => typeof x === 'function'

type NonFunction<T> = [T] extends [Function] ? never : T

export function focusAtom<S, A>(
  baseAtom: WritableAtom<S, NonFunction<S>>,
  callback: (optic: O.OpticFor<S>) => O.Prism<S, any, A>
): WritableAtom<A | undefined, SetStateAction<A>>

export function focusAtom<S, A>(
  baseAtom: WritableAtom<S, NonFunction<S>>,
  callback: (optic: O.OpticFor<S>) => O.Traversal<S, any, A>
): WritableAtom<A[], SetStateAction<A>>

export function focusAtom<S, A>(
  baseAtom: WritableAtom<S, NonFunction<S>>,
  callback: (
    optic: O.OpticFor<S>
  ) => O.Lens<S, any, A> | O.Equivalence<S, any, A> | O.Iso<S, any, A>
): WritableAtom<A, SetStateAction<A>>

export function focusAtom<S, A>(
  baseAtom: WritableAtom<S, NonFunction<S>>,
  callback: (
    optic: O.OpticFor<S>
  ) =>
    | O.Lens<S, any, A>
    | O.Equivalence<S, any, A>
    | O.Iso<S, any, A>
    | O.Prism<S, any, A>
    | O.Traversal<S, any, A>
) {
  const deps = [baseAtom, callback] as const
  const cachedAtom = getWeakCacheItem(focusAtomCache, deps)
  if (cachedAtom) {
    return cachedAtom
  }
  const focus = callback(O.optic<S>())
  const derivedAtom = atom(
    (get) => getValueUsingOptic(focus, get(baseAtom)),
    (get, set, update: SetStateAction<A>) => {
      const newValueProducer = isFunction(update)
        ? O.modify(focus)(update)
        : O.set(focus)(update)
      set(baseAtom, newValueProducer(get(baseAtom)) as NonFunction<S>)
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
