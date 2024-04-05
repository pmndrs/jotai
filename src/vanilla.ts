export { atom } from './vanilla/atom.ts'
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom.ts'

// export { createStore, getDefaultStore } from './vanilla/store.ts'
import * as store from './vanilla/store.ts'
import * as store2 from './vanilla/store2.ts'
type CreateStore = typeof store.createStore
type GetDefaultStore = typeof store.getDefaultStore
export const createStore: CreateStore = import.meta.env?.USE_STORE2
  ? store2.createStore
  : store.createStore
export const getDefaultStore: GetDefaultStore = import.meta.env?.USE_STORE2
  ? store2.getDefaultStore
  : store.getDefaultStore

export type {
  INTERNAL_DevStoreRev2,
  INTERNAL_DevStoreRev3,
  INTERNAL_PrdStore,
} from './vanilla/store.ts'

export type {
  Getter,
  Setter,
  ExtractAtomValue,
  ExtractAtomArgs,
  ExtractAtomResult,
  SetStateAction,
} from './vanilla/typeUtils.ts'
