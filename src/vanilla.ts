export { atom } from './vanilla/atom.ts'
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom.ts'
// export { createStore, getDefaultStore } from './vanilla/store.ts'
import * as store from './vanilla/store.ts'
import * as store2 from './vanilla/store2.ts'
export const createStore: typeof store.createStore = import.meta.env?.USE_STORE2
  ? store2.createStore
  : store.createStore
export const getDefaultStore: typeof store.getDefaultStore = import.meta.env
  ?.USE_STORE2
  ? store2.getDefaultStore
  : store.getDefaultStore
export type {
  Getter,
  Setter,
  ExtractAtomValue,
  ExtractAtomArgs,
  ExtractAtomResult,
  SetStateAction,
} from './vanilla/typeUtils.ts'
