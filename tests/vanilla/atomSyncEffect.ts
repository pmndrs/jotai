import type { Atom, Getter, Setter } from 'jotai/vanilla'
import { atom, createStore } from 'jotai/vanilla'

type Store = ReturnType<typeof createStore>
type AtomState = NonNullable<
  ReturnType<Parameters<Parameters<Store['unstable_derive']>[0]>[0]>
>
type AnyAtom = Atom<unknown>
type GetterWithPeek = Getter & { peek: Getter }
type SetterWithRecurse = Setter & { recurse: Setter }
type Cleanup = () => void
type Effect = (get: GetterWithPeek, set: SetterWithRecurse) => void | Cleanup
type Ref = {
  get?: GetterWithPeek
  set?: SetterWithRecurse
  cleanup?: Cleanup | null
  fromCleanup?: boolean
  inProgress: number
  init?: () => void
  atomState: AtomState
  unsub?: () => void
}

export function atomSyncEffect(effect: Effect) {
  const refAtom = atom(
    () => ({ inProgress: 0 }) as Ref,
    (get) => {
      const ref = get(refAtom)
      return () => {
        ref.cleanup?.()
        ref.cleanup = null
      }
    },
  )
  refAtom.debugLabel = 'ref'
  refAtom.onMount = (mount) => mount()
  const runAtom = atom({ runEffect: () => {} })
  runAtom.debugLabel = 'run'
  const internalAtom = atom(function internalAtomRead(get) {
    const ref = get(refAtom)
    ref.get = ((a) => {
      return get(a)
    }) as Getter & { peek: Getter }
    ref.init!()
    if (ref.inProgress > 0) {
      return
    }
    const runEffect = () => {
      ref.cleanup?.()
      const cleanup = effectAtom.effect(ref.get!, ref.set!)
      ref.cleanup = () => {
        try {
          ref.fromCleanup = true
          cleanup?.()
        } finally {
          ref.fromCleanup = false
        }
      }
    }
    const tmp = atom(undefined)
    tmp.debugLabel = 'tmp'
    tmp.unstable_onInit = (store) => {
      store.set(runAtom, { runEffect })
    }
    get(tmp)
  })
  internalAtom.debugLabel = 'internal'
  internalAtom.unstable_onInit = (store) => {
    const ref = store.get(refAtom)
    ref.unsub = store.sub(runAtom, () => {
      const { runEffect } = store.get(runAtom)
      runEffect()
    })
    if (!ref.atomState) {
      ref.atomState = getAtomState(store, internalAtom)!
      const originalHook = ref.atomState.h
      ref.atomState.h = () => {
        if (ref.atomState.m) {
          // TODO - schedule effect
        } else {
          // TODO - schedule cleanup
        }
        originalHook?.()
      }
    }
    const get = store.get
    const set = store.set
    ref.init = () => {
      if (!ref.get!.peek) {
        ref.get!.peek = get
      }
      if (!ref.set) {
        const setter: Setter = (a, ...args) => {
          try {
            ++ref.inProgress
            return set(a, ...args)
          } finally {
            --ref.inProgress
            ref.get!(a) // FIXME why do we need this?
          }
        }
        const recurse: Setter = (a, ...args) => {
          if (ref.fromCleanup) {
            if (import.meta.env?.MODE !== 'production') {
              throw new Error('set.recurse is not allowed in cleanup')
            }
            return undefined as never
          }
          return set(a, ...args)
        }
        ref.set = Object.assign(setter, { recurse })
      }
    }
  }
  const effectAtom = Object.assign(
    atom(function effectAtomRead(get) {
      return get(internalAtom)
    }),
    { effect },
  )
  return effectAtom
}

/**
 * HACK: steal atomState to synchronously determine if
 * the atom is mounted
 * We return void 0 to cause the buildStore(...args) to throw
 * to abort creating a derived store
 */
function getAtomState(store: Store, atom: AnyAtom): AtomState {
  let atomState: AtomState
  try {
    store.unstable_derive(function deriveExtractAtomState(getAtomState) {
      atomState = getAtomState(atom)!
      return null as any
    })
  } catch {
    // expect error
  }
  return atomState!
}
