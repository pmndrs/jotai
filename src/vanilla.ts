export { atom } from './vanilla/atom.ts'
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom.ts'
export { createStore, getDefaultStore } from './vanilla/store.ts'
export type { Store } from './vanilla/store.ts'
export type {
  Getter,
  Setter,
  ExtractAtomValue,
  ExtractAtomArgs,
  ExtractAtomResult,
  SetStateAction,
} from './vanilla/typeUtils.ts'
