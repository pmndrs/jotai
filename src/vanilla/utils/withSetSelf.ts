import { atom } from '../../vanilla.ts'
import {
  INTERNAL_getBuildingBlocksRev2 as getBuildingBlocks,
  INTERNAL_isActuallyWritableAtom as isActuallyWritableAtom,
} from '../internals.ts'
import type { Store } from '../store.ts'
import type { AtomFactory, JoinOptions } from '../typeUtils.ts'

type SetSelf<Args extends unknown[], Result> = (...args: Args) => Result

export function withSetSelf<Opts extends Record<string, unknown> | never>(
  base: AtomFactory<Opts>,
): AtomFactory<JoinOptions<Opts, { setSelf: SetSelf<unknown[], unknown> }>> {
  function atomWithSetSelf(...args: [unknown?, unknown?]): unknown {
    const [read, write] = args
    if (typeof read === 'function') {
      const refAtom = atom(() => ({}) as { store?: Store })
      const derived = base((get, options: Record<string, unknown> = {}) => {
        let isSync = true
        let setSelf: SetSelf<unknown[], unknown> | undefined
        try {
          if (!('setSelf' in options)) {
            Object.defineProperty(options, 'setSelf', {
              get: () => {
                if (
                  import.meta.env?.MODE !== 'production' &&
                  !isActuallyWritableAtom(derived)
                ) {
                  console.warn(
                    'setSelf function cannot be used with read-only atom',
                  )
                }
                if (!setSelf && isActuallyWritableAtom(derived)) {
                  const store = get(refAtom).store!
                  const buildingBlocks = getBuildingBlocks(store)
                  const flushCallbacks = buildingBlocks[12]
                  const recomputeInvalidatedAtoms = buildingBlocks[13]
                  const writeAtomState = buildingBlocks[16]

                  setSelf = (...args: unknown[]) => {
                    if (import.meta.env?.MODE !== 'production' && isSync) {
                      console.warn('setSelf function cannot be called in sync')
                    }
                    if (!isSync) {
                      try {
                        // write to *this* atom with provided args
                        return writeAtomState(store, derived, ...args)
                      } finally {
                        recomputeInvalidatedAtoms(store)
                        flushCallbacks(store)
                      }
                    }
                    return undefined
                  }
                }
                return setSelf
              },
            })
          }
          return (read as any)(get, options)
        } finally {
          isSync = false
        }
      }, write as any)
      derived.unstable_onInit = (store) => {
        store.get(refAtom).store = store
      }
      return derived
    }
    return base(...(args as Parameters<typeof base>))
  }
  return atomWithSetSelf as any
}
