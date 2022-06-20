import { atom } from 'jotai'
import type { Atom } from 'jotai'
import { createMemoizeAtom } from './weakCache'

type Awaited<T> =
    T extends null | undefined ? T : // special case for `null | undefined` when not in `--strictNullChecks` mode
        T extends object & { then(onfulfilled: infer F): any } ? // `await` only unwraps object types with a callable `then`. Non-object types are not unwrapped
            F extends ((value: infer V, ...args: any) => any) ? // if the argument to `then` is callable, extracts the first argument
                Awaited<V> : // recursively unwrap the value
                never : // the argument to `then` was not callable
        T; // non-object or non-thenable

const memoizeAtom = createMemoizeAtom()

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Awaited<Value>) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
): Atom<Slice> {
  return memoizeAtom(() => {
    // TODO we should revisit this for a better solution than refAtom
    const refAtom = atom(() => ({} as { prev?: Slice }))
    const derivedAtom = atom((get) => {
      const slice = selector(get(anAtom) as Awaited<Value>)
      const ref = get(refAtom)
      if ('prev' in ref && equalityFn(ref.prev as Slice, slice)) {
        return ref.prev as Slice
      }
      ref.prev = slice
      return slice
    })
    return derivedAtom
  }, [anAtom, selector, equalityFn])
}
