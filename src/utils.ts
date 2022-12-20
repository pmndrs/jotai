export { RESET } from './utils/constants'
export { atomWithReset } from './utils/atomWithReset'
export { useResetAtom } from './utils/useResetAtom'
export { useReducerAtom } from './utils/useReducerAtom'
export { atomWithReducer } from './utils/atomWithReducer'
export { atomFamily } from './utils/atomFamily'
export { selectAtom } from './utils/selectAtom'
export { useAtomCallback } from './utils/useAtomCallback'
export { freezeAtom, freezeAtomCreator } from './utils/freezeAtom'
export { splitAtom } from './utils/splitAtom'
export { atomWithDefault } from './utils/atomWithDefault'
export { waitForAll } from './utils/waitForAll'
export {
  NO_STORAGE_VALUE as unstable_NO_STORAGE_VALUE,
  atomWithStorage,
  atomWithHash,
  createJSONStorage,
} from './utils/atomWithStorage'
export { atomWithObservable } from './utils/atomWithObservable'
export { useHydrateAtoms } from './utils/useHydrateAtoms'
export { loadable } from './utils/loadable'
export { abortableAtom } from './utils/abortableAtom'

import * as Jotai from 'jotai'

/**
 * @deprecated use `useAtomValue` from `jotai` instead
 */
export const useAtomValue: typeof Jotai.useAtomValue = (...args: any[]) => {
  console.warn('[DEPRECATED]: use `useAtomValue` from `jotai` instead.')
  return (Jotai.useAtomValue as any)(...args)
}

/**
 * @deprecated use `useSetAtom` from `jotai` instead
 */
export const useUpdateAtom: typeof Jotai.useSetAtom = (...args: any[]) => {
  console.warn('[DEPRECATED]: use `useSetAtom` from `jotai` instead.')
  return (Jotai.useSetAtom as any)(...args)
}
