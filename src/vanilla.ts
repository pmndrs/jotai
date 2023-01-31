export { atom } from './vanilla/atom'
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom'
export { createStore, getDefaultStore } from './vanilla/store'
export type {
  Getter,
  Setter,
  ExtractAtomValue,
  ExtractAtomArgs,
  ExtractAtomResult,
  SetStateAction,
} from './vanilla/typeUtils'
