// TODO
// onMount (with queue), onUnmount
// mount/unmount with dependency change (somehow queue it?)
// notify subscribers
// do not recompute if not mounted

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

const hasInitialValue = <T extends Atom<AnyValue>>(
  atom: T,
): atom is T & (T extends Atom<infer Value> ? { init: Value } : never) =>
  'init' in atom

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
  /** Object to store mounted state of the atom. */
  m?: Mounted // only available if the atom is mounted
  /** Atom value, atom error or empty. */
  s?: { readonly v: Value } | { readonly e: AnyError }
}

type WithS<T extends AtomState> = T & { s: NonNullable<T['s']> }

const returnAtomValue = <Value>(atomState: AtomState<Value>): Value => {
  if (!('s' in atomState)) {
    // NOTE invalid derived atoms can reach here
    throw new Error('no atom init')
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
      if (hasInitialValue(atom)) {
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
  ): WithS<AtomState<Value>> => {
    // See if we can skip recomputing this atom.
    const atomState = getAtomState(atom)
    if (!force && 's' in atomState) {
      return atomState as WithS<typeof atomState>
    }
    // Compute a new state for this atom.
    clearDependencies(atom)
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => {
      if (isSelfAtom(atom, a)) {
        const aState = getAtomState(a)
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
      return atomState as WithS<typeof atomState>
    } catch (error) {
      atomState.s = { e: error }
      return atomState as WithS<typeof atomState>
    } finally {
      isSync = false
    }
  }

  const readAtom = <Value>(atom: Atom<Value>): Value =>
    returnAtomValue(readAtomState(atom))

  const recomputeDependents = (atom: AnyAtom): void => {
    // This is a topological sort via depth-first search, slightly modified from
    // what's described here for simplicity and performance reasons:
    // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search

    // Step 1: traverse the dependency graph to build the topsorted atom list
    // We don't bother to check for cycles, which simplifies the algorithm.
    const topsortedAtoms: AnyAtom[] = []
    const markedAtoms = new Set<AnyAtom>()
    const visit = (n: AnyAtom) => {
      if (markedAtoms.has(n)) {
        return
      }
      markedAtoms.add(n)
      for (const m of getAtomState(n).t) {
        // we shouldn't use isSelfAtom here.
        if (n !== m) {
          visit(m)
        }
      }
      // The algorithm calls for pushing onto the front of the list. For
      // performance, we will simply push onto the end, and then will iterate in
      // reverse order later.
      topsortedAtoms.push(n)
    }
    // Visit the root atom. This is the only atom in the dependency graph
    // without incoming edges, which is one reason we can simplify the algorithm
    visit(atom)
    // Step 2: use the topsorted atom list to recompute all affected atoms
    // Track what's changed, so that we can short circuit when possible
    const changedAtoms = new Set<AnyAtom>([atom])
    for (let i = topsortedAtoms.length - 1; i >= 0; --i) {
      const a = topsortedAtoms[i]!
      const aState = getAtomState(a)
      const prev = aState.s
      let hasChangedDeps = false
      for (const dep of aState.d) {
        if (dep !== a && changedAtoms.has(dep)) {
          hasChangedDeps = true
          break
        }
      }
      if (hasChangedDeps) {
        const nextAtomState = readAtomState(a, true)
        if (
          !prev ||
          !('v' in prev) ||
          !('v' in nextAtomState.s) ||
          !Object.is(prev.v, nextAtomState.s.v)
        ) {
          changedAtoms.add(a)
        }
      }
    }
  }

  const writeAtomState = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const getter: Getter = <V>(a: Atom<V>) => returnAtomValue(readAtomState(a))
    const setter: Setter = <V, As extends unknown[], R>(
      a: WritableAtom<V, As, R>,
      ...args: As
    ) => {
      let r: R | undefined
      if (isSelfAtom(atom, a)) {
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('atom not writable')
        }
        const aState = getAtomState(a)
        const prev = aState.s
        aState.s = { v: args[0] as V }
        if (!prev || !('v' in prev) || !Object.is(prev.v, args[0])) {
          recomputeDependents(a)
        }
      } else {
        r = writeAtomState(a as AnyWritableAtom, ...args) as R
      }
      return r as R
    }
    const result = atom.write(getter, setter, ...args)
    return result
  }

  const writeAtom = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const result = writeAtomState(atom, ...args)
    return result
  }

  const mountAtom = (atom: AnyAtom): Mounted => {
    const atomState = getAtomState(atom)
    if (!atomState.m) {
      // mount dependents first
      for (const a of atomState.d) {
        mountAtom(a)
      }
      // mount self
      atomState.m = { l: new Set() }
    }
    return atomState.m
  }

  const unmountAtom = (atom: AnyAtom) => {
    const atomState = getAtomState(atom)
    if (atomState.m && !atomState.m.l.size && !atomState.t.size) {
      // unmount self
      delete atomState.m
      // unmount dependencies
      for (const a of atomState.d) {
        unmountAtom(a)
      }
    }
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    const mounted = mountAtom(atom)
    const listeners = mounted.l
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      unmountAtom(atom)
    }
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
