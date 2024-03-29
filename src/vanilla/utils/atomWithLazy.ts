import { atom } from '../../vanilla.ts'

export function atomWithLazy<Value>(makeInitial: () => Value) {
  return {
    ...atom(undefined as unknown as Value),
    get init() {
      return makeInitial()
    },
  }
}
