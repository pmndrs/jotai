export { atom } from './vanilla/atom.js'
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom.js'

export {
  createStore,
  getDefaultStore,
  INTERNAL_overrideCreateStore,
} from './vanilla/store.js'

export type {
  Getter,
  Setter,
  ExtractAtomValue,
  ExtractAtomArgs,
  ExtractAtomResult,
  SetStateAction,
} from './vanilla/typeUtils.js'
