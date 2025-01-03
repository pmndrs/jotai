export { atom } from './vanilla/atom.ts'
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom.ts'

export {
  createStore,
  getDefaultStore,
  unstable_deriveDevStoreRev5,
} from './vanilla/store.ts'

export type {
  Getter,
  Setter,
  ExtractAtomValue,
  ExtractAtomArgs,
  ExtractAtomResult,
  SetStateAction,
} from './vanilla/typeUtils.ts'
