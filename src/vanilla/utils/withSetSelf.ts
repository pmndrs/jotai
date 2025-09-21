import { atom as createAtom } from '../../vanilla.ts'
import type { Atom, WritableAtom, PrimitiveAtom } from '../../vanilla.ts'
import {
  INTERNAL_getBuildingBlocksRev2 as getBuildingBlocks,
  INTERNAL_isActuallyWritableAtom as isActuallyWritableAtom,
  type INTERNAL_Store as Store,
} from '../internals.ts'

type SetSelf<Args extends unknown[], Result> = (...args: Args) => Result

type ReadWithSetSelf<Value, SetSelfType = never> = (
  get: <V>(atom: Atom<V>) => V,
  options: { setSelf: SetSelfType },
) => Value

type WriteFunction<Args extends unknown[], Result> = (
  get: <V>(atom: Atom<V>) => V,
  set: <V, A extends unknown[], R>(
    atom: WritableAtom<V, A, R>,
    ...args: A
  ) => R,
  ...args: Args
) => Result

// This is an internal type and not part of public API.
// Do not depend on it as it can change without notice.
type WithInitialValue<Value> = {
  init: Value
}

// writable derived atom
export function withSetSelf<Value, Args extends unknown[], Result>(
  atomConstructor: typeof createAtom,
): (
  read: ReadWithSetSelf<Value, SetSelf<Args, Result>>,
  write: WriteFunction<Args, Result>,
) => WritableAtom<Value, Args, Result>

// read-only derived atom
export function withSetSelf<Value>(
  atomConstructor: typeof createAtom,
): (read: ReadWithSetSelf<Value>) => Atom<Value>

// write-only derived atom
export function withSetSelf<Value, Args extends unknown[], Result>(
  atomConstructor: typeof createAtom,
): (
  initialValue: Value,
  write: WriteFunction<Args, Result>,
) => WritableAtom<Value, Args, Result> & WithInitialValue<Value>

// primitive atom without initial value
export function withSetSelf<Value>(
  atomConstructor: typeof createAtom,
): () => PrimitiveAtom<Value | undefined> & WithInitialValue<Value | undefined>

// primitive atom
export function withSetSelf<Value>(
  atomConstructor: typeof createAtom,
): (initialValue: Value) => PrimitiveAtom<Value> & WithInitialValue<Value>

export function withSetSelf(atomConstructor: typeof createAtom): any {
  const atomWithSetSelf = <Value, Args extends unknown[], Result>(
    read: ReadWithSetSelf<Value, SetSelf<Args, Result>>,
    write?: WriteFunction<Args, Result>,
  ) => {
    const refAtom = createAtom(() => ({}) as { store?: Store })
    const atom = atomConstructor(
      (get, options = {} as { setSelf: SetSelf<Args, Result> }) => {
        let isSync = true
        let setSelf: ((...args: unknown[]) => unknown) | undefined
        try {
          Object.defineProperty(options, 'setSelf', {
            get() {
              if (
                import.meta.env?.MODE !== 'production' &&
                !isActuallyWritableAtom(atom)
              ) {
                console.warn(
                  'setSelf function cannot be used with read-only atom',
                )
              }
              if (!setSelf && isActuallyWritableAtom(atom)) {
                const store = get(refAtom).store!
                const buildingBlocks = getBuildingBlocks(store)
                const flushCallbacks = buildingBlocks[12]
                const recomputeInvalidatedAtoms = buildingBlocks[13]
                const writeAtomState = buildingBlocks[16]
                setSelf = (...args) => {
                  if (import.meta.env?.MODE !== 'production' && isSync) {
                    console.warn('setSelf function cannot be called in sync')
                  }
                  if (!isSync) {
                    try {
                      return writeAtomState(store, atom, ...args)
                    } finally {
                      recomputeInvalidatedAtoms(store)
                      flushCallbacks(store)
                    }
                  }
                }
              }
              return setSelf
            },
          })
          return read(get, options as never)
        } finally {
          isSync = false
        }
      },
    )
    if (write) {
      const writableAtom = atom as WritableAtom<Value, Args, Result>
      writableAtom.write = write
    }
    atom.unstable_onInit = (store) => {
      store.get(refAtom).store = store
    }
    return atom
  }
  return atomWithSetSelf
}
