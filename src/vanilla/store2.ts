import type { Atom, WritableAtom } from './atom.ts'

type AnyValue = unknown
type AnyError = unknown
type AnyAtom = Atom<AnyValue>
type AnyWritableAtom = WritableAtom<AnyValue, unknown[], unknown>
type OnUnmount = () => void
type Getter = Parameters<AnyAtom['read']>[0]
type Setter = Parameters<AnyWritableAtom['write']>[1]

const isSelfAtom = (atom: AnyAtom, a: AnyAtom) =>
  atom.unstable_is ? atom.unstable_is(a) : a === atom

const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
  !!(atom as AnyWritableAtom).write

//
// Continuable Promise
//

const CONTINUE_PROMISE = Symbol(
  import.meta.env?.MODE !== 'production' ? 'CONTINUE_PROMISE' : '',
)

const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

type ContinuePromise<T> = (
  nextPromise: PromiseLike<T>,
  nextAbort: () => void,
) => void

type ContinuablePromise<T> = Promise<T> &
  (
    | { status: typeof PENDING }
    | { status: typeof FULFILLED; value?: T }
    | { status: typeof REJECTED; reason?: AnyError }
  ) & {
    [CONTINUE_PROMISE]: ContinuePromise<T>
  }

const isContinuablePromise = (
  promise: unknown,
): promise is ContinuablePromise<AnyValue> =>
  !!promise && CONTINUE_PROMISE in (promise as object)

const continuablePromiseMap = new WeakMap<
  PromiseLike<AnyValue>,
  ContinuablePromise<AnyValue>
>()

/**
 * Create a continuable promise from a regular promise.
 */
const createContinuablePromise = <T>(
  promise: PromiseLike<T>,
  abort: () => void,
): ContinuablePromise<T> => {
  if (!continuablePromiseMap.has(promise)) {
    let continuePromise: ContinuePromise<T>
    const p: any = new Promise((resolve, reject) => {
      let orig = promise
      promise.then(
        (v) => {
          if (orig === promise) {
            p.status = FULFILLED
            p.value = v
            resolve(v)
          }
        },
        (e) => {
          if (orig === promise) {
            p.status = REJECTED
            p.reason = e
            reject(e)
          }
        },
      )
      continuePromise = (nextPromise, nextAbort) => {
        orig = nextPromise
        continuablePromiseMap.set(nextPromise, p)
        nextPromise.then(
          (v) => {
            if (orig === nextPromise) {
              p.status = FULFILLED
              p.value = v
            }
          },
          (e) => {
            if (orig === nextPromise) {
              p.status = REJECTED
              p.reason = e
            }
          },
        )
        resolve(nextPromise)
        abort()
        abort = nextAbort
      }
    })
    p.status = PENDING
    p[CONTINUE_PROMISE] = continuePromise!
    continuablePromiseMap.set(promise, p)
  }
  return continuablePromiseMap.get(promise) as ContinuablePromise<T>
}

const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as any)?.then === 'function'

/**
 * State tracked for mounted atoms. An atom is considered "mounted" if it has a
 * subscriber, or is a transitive dependency of another atom that has a
 * subscriber.
 *
 * The mounted state of an atom is freed once it is no longer mounted.
 */
type Mounted = {
  /** Set of listeners to notify when the atom value changes. */
  readonly l: Set<() => void>
  /** Function to run when the atom is unmounted. */
  u?: OnUnmount
}

/**
 * Mutable atom state,
 * tracked for both mounted and unmounted atoms in a store.
 */
type AtomState<Value = AnyValue> = {
  /** Set of atoms that the atom depends on. */
  readonly d: Set<AnyAtom>
  /** Set of atoms that depends on the atom. */
  readonly t: Set<AnyAtom>
  /** Object to store mounted state of the atom. */ // TODO nested mounted
  m?: Mounted // only available if the atom is mounted
  /** Atom value, atom error or empty. */
  s?: { v: Value } | { e: AnyError }
}

const returnAtomValue = <Value>(atomState: AtomState<Value>): Value => {
  if (!('s' in atomState)) {
    throw new Error('[Bug] atom state is not initialized')
  }
  if ('e' in atomState.s) {
    throw atomState.s.e
  }
  return atomState.s.v
}

export const createStore = () => {
  const atomStateMap = new WeakMap<AnyAtom, AtomState>()

  const getAtomState = <Value>(atom: Atom<Value>) => {
    if (!atomStateMap.has(atom)) {
      const atomState: AtomState<Value> = { d: new Set(), t: new Set() }
      if ('init' in atom) {
        atomState.s = { v: atom.init as Value }
      }
      atomStateMap.set(atom, atomState)
    }
    return atomStateMap.get(atom) as AtomState<Value>
  }

  const clearDependencies = <Value>(atom: Atom<Value>) => {
    const atomState = getAtomState(atom)
    atomState.d.forEach((a) => {
      getAtomState(a).t.delete(atom)
    })
    atomState.d.clear()
  }

  const addDependency = <Value>(atom: Atom<Value>, a: AnyAtom) => {
    const atomState = getAtomState(atom)
    atomState.d.add(a)
    getAtomState(a).t.add(atom)
  }

  const readAtomState = <Value>(
    atom: Atom<Value>,
    force?: boolean,
  ): AtomState<Value> => {
    // See if we can skip recomputing this atom.
    const atomState = getAtomState(atom)
    if (!force && 's' in atomState) {
      return atomState
    }
    // Compute a new state for this atom.
    clearDependencies(atom)
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => {
      if (isSelfAtom(atom, a)) {
        const aState = getAtomState(a)
        if (!('s' in aState)) {
          // NOTE invalid derived atoms can reach here
          throw new Error('no atom init')
        }
        return returnAtomValue(aState)
      }
      // a !== atom
      addDependency(atom, a)
      const aState = readAtomState(a)
      return returnAtomValue(aState)
    }
    let controller: AbortController | undefined
    let setSelf: ((...args: unknown[]) => unknown) | undefined
    const options = {
      get signal() {
        if (!controller) {
          controller = new AbortController()
        }
        return controller.signal
      },
      get setSelf() {
        if (
          import.meta.env?.MODE !== 'production' &&
          !isActuallyWritableAtom(atom)
        ) {
          console.warn('setSelf function cannot be used with read-only atom')
        }
        if (!setSelf && isActuallyWritableAtom(atom)) {
          setSelf = (...args) => {
            if (import.meta.env?.MODE !== 'production' && isSync) {
              console.warn('setSelf function cannot be called in sync')
            }
            if (!isSync) {
              return writeAtom(atom, ...args)
            }
          }
        }
        return setSelf
      },
    }
    try {
      const valueOrPromise = atom.read(getter, options as any)
      if (isPromiseLike(valueOrPromise)) {
        const prev: unknown = (atomState as any).s?.v
        if (isContinuablePromise(prev) && prev.status === PENDING) {
          prev[CONTINUE_PROMISE](valueOrPromise, () => controller?.abort())
        } else {
          atomState.s = {
            v: createContinuablePromise(valueOrPromise, () =>
              controller?.abort(),
            ) as Value,
          }
        }
      } else {
        atomState.s = { v: valueOrPromise }
      }
      return atomState
    } catch (error) {
      atomState.s = { e: error }
      return atomState
    } finally {
      isSync = false
    }
  }

  const readAtom = <Value>(atom: Atom<Value>): Value =>
    returnAtomValue(readAtomState(atom))

  const writeAtom = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    // TODO
    return null as any
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    // TODO
  }

  return {
    get: readAtom,
    set: writeAtom,
    sub: subscribeAtom,
  }
}

type Store = ReturnType<typeof createStore>

let defaultStore: Store | undefined

if (import.meta.env?.MODE !== 'production') {
  if (typeof (globalThis as any).__NUMBER_OF_JOTAI_INSTANCES__ === 'number') {
    ++(globalThis as any).__NUMBER_OF_JOTAI_INSTANCES__
  } else {
    ;(globalThis as any).__NUMBER_OF_JOTAI_INSTANCES__ = 1
  }
}

export const getDefaultStore = () => {
  if (!defaultStore) {
    if (
      import.meta.env?.MODE !== 'production' &&
      (globalThis as any).__NUMBER_OF_JOTAI_INSTANCES__ !== 1
    ) {
      console.warn(
        'Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044',
      )
    }
    defaultStore = createStore()
  }
  return defaultStore
}
