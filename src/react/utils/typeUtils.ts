import { useStore } from '../../react.ts'
import { WritableAtom } from '../../vanilla.ts'

export type Options = Parameters<typeof useStore>[0]
export type AnyWritableAtom = WritableAtom<unknown, any[], any>
export type AtomMap<A = AnyWritableAtom, V = unknown> = Map<A, V>
export type AtomTuple<A = AnyWritableAtom, V = unknown> = readonly [A, V]
export type InferAtoms<T extends Iterable<AtomTuple>> = {
  [K in keyof T]: T[K] extends AtomTuple<infer A>
    ? A extends AnyWritableAtom
      ? AtomTuple<A, ReturnType<A['read']>>
      : T[K]
    : never
}
