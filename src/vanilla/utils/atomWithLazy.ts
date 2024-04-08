import { PrimitiveAtom, atom } from '../../vanilla.ts'

const lazyMap = new WeakMap<() => unknown, unknown>()

export function atomWithLazy<Value>(
  makeInitial: () => Value,
): PrimitiveAtom<Value> {
  const a = atom(undefined as unknown as Value)
  delete (a as { init?: Value }).init
  Object.defineProperty(a, 'init', {
    get(): Value {
      if (lazyMap.has(makeInitial)) {
        return lazyMap.get(makeInitial) as Value
      }
      const initResult = makeInitial()
      lazyMap.set(makeInitial, initResult)
      return initResult
    },
  })
  return a
}
