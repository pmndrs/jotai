import {
  createElement,
  useDebugValue,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { PropsWithChildren } from 'react'
import type { Atom, Scope } from './atom'
import { createScopeContainer, getScopeContext } from './contexts'
import type { ScopeContainer } from './contexts'
import {
  COMMIT_ATOM,
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
} from './store'
import type { AtomState, Store, VersionObject } from './store'

export const Provider = ({
  children,
  initialValues,
  scope,
  unstable_enableVersionedWrite,
}: PropsWithChildren<{
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
  scope?: Scope
  /**
   * This is an unstable experimental feature for React 18.
   * When this is enabled, a) write function must be pure
   * (read function must be pure regardless of this),
   * b) React will show warning in DEV mode,
   * c) then state branching works.
   */
  unstable_enableVersionedWrite?: boolean
}>) => {
  const [version, setVersion] = useState<VersionObject>()
  useEffect(() => {
    if (version) {
      ;(scopeContainerRef.current as ScopeContainer).s[COMMIT_ATOM](
        null,
        version
      )
      delete version.p
    }
  }, [version])

  const scopeContainerRef = useRef<ScopeContainer>()
  if (!scopeContainerRef.current) {
    // lazy initialization
    scopeContainerRef.current = createScopeContainer(initialValues)
    if (unstable_enableVersionedWrite) {
      scopeContainerRef.current.w = (write) => {
        setVersion((parentVersion) => {
          const nextVersion = parentVersion ? { p: parentVersion } : {}
          write(nextVersion)
          return nextVersion
        })
      }
    }
  }

  if (__DEV__) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebugState(scopeContainerRef.current)
  }

  const ScopeContainerContext = getScopeContext(scope)
  return createElement(
    ScopeContainerContext.Provider,
    {
      value: scopeContainerRef.current,
    },
    children
  )
}

const atomToPrintable = (atom: Atom<unknown>) =>
  atom.debugLabel || atom.toString()

const stateToPrintable = ([store, atoms]: [Store, Atom<unknown>[]]) =>
  Object.fromEntries(
    atoms.flatMap((atom) => {
      const mounted = store[DEV_GET_MOUNTED]?.(atom)
      if (!mounted) {
        return []
      }
      const dependents = mounted.t
      const atomState = store[DEV_GET_ATOM_STATE]?.(atom) || ({} as AtomState)
      return [
        [
          atomToPrintable(atom),
          {
            ...('e' in atomState && { error: atomState.e }),
            ...('p' in atomState && { promise: atomState.p }),
            ...('v' in atomState && { value: atomState.v }),
            dependents: Array.from(dependents).map(atomToPrintable),
          },
        ],
      ]
    })
  )

// We keep a reference to the atoms in Provider's registeredAtoms in dev mode,
// so atoms aren't garbage collected by the WeakMap of mounted atoms
const useDebugState = (scopeContainer: ScopeContainer) => {
  const { s: store } = scopeContainer
  const [atoms, setAtoms] = useState<Atom<unknown>[]>([])
  useEffect(() => {
    const callback = () => {
      setAtoms(Array.from(store[DEV_GET_MOUNTED_ATOMS]?.() || []))
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [store])
  useDebugValue([store, atoms], stateToPrintable)
}
