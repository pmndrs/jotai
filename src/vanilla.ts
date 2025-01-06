export { atom } from './vanilla/atom.ts'
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom.ts'

export {
  createStore,
  getDefaultStore,

  // Internal functions (subject to change without notice)
  INTERNAL_getInternalStoreMethods,
  INTERNAL_buildStore,
} from './vanilla/store.ts'

export type {
  Getter,
  Setter,
  ExtractAtomValue,
  ExtractAtomArgs,
  ExtractAtomResult,
  SetStateAction,
} from './vanilla/typeUtils.ts'
