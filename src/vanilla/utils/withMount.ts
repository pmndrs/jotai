import type { WritableAtom } from '../atom.ts'
import {
  INTERNAL_getBuildingBlocksRev2 as getBuildingBlocks,
  INTERNAL_initializeStoreHooksRev2 as initializeStoreHooks,
  INTERNAL_isActuallyWritableAtom as isActuallyWritableAtom,
} from '../internals.ts'

type OnUnmount = () => void

type OnMount<Args extends unknown[], Result> = <
  S extends (...args: Args) => Result,
>(
  setAtom: S,
) => OnUnmount | void

export function withMount<Value, Args extends unknown[], Result>(
  baseAtom: WritableAtom<Value, Args, Result>,
  onMount: OnMount<Args, Result>,
): WritableAtom<Value, Args, Result> {
  if (!isActuallyWritableAtom<Value, Args, Result>(baseAtom)) {
    return baseAtom
  }
  baseAtom.unstable_onInit = (store) => {
    const buildingBlocks = getBuildingBlocks(store)
    const mountedMap = buildingBlocks[1]
    const mountCallbacks = buildingBlocks[4]
    const storeHooks = initializeStoreHooks(buildingBlocks[6])
    const flushCallbacks = buildingBlocks[12]
    const recomputeInvalidatedAtoms = buildingBlocks[13]
    const writeAtomState = buildingBlocks[16]
    storeHooks.m.add(baseAtom, () => {
      const mounted = mountedMap.get(baseAtom)
      const processOnMount = () => {
        let isSync = true
        const setAtom = (...args: Args): Result => {
          try {
            return writeAtomState(store, baseAtom, ...args)
          } finally {
            if (!isSync) {
              recomputeInvalidatedAtoms(store)
              flushCallbacks(store)
            }
          }
        }
        try {
          const onUnmount = onMount(setAtom)
          if (onUnmount) {
            mounted!.u = () => {
              isSync = true
              try {
                onUnmount()
              } finally {
                isSync = false
              }
            }
          }
        } finally {
          isSync = false
        }
      }
      mountCallbacks.add(processOnMount)
    })
  }
  return baseAtom
}
