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
  unstable_enableVersionedWrite?: boolean
}>) => {
  const scopeContainerRef = useRef<ScopeContainer>()
  if (!scopeContainerRef.current) {
    // lazy initialization
    scopeContainerRef.current = createScopeContainer(initialValues)
    if (unstable_enableVersionedWrite) {
      scopeContainerRef.current.w = (write) => {
        setVersion((prevVersion) => {
          const nextVersion = prevVersion ? { p: prevVersion } : {}
          write(nextVersion)
          return nextVersion
        })
      }
    }
  }
  const scopeContainer = scopeContainerRef.current

  const [version, setVersion] = useState<VersionObject>()
  useEffect(() => {
    if (version) {
      scopeContainer.s[COMMIT_ATOM](null, version)
      delete version.p
    }
  }, [version])

  if (
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test'
  ) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebugState(scopeContainer)
  }

  const ScopeContainerContext = getScopeContext(scope)
  return createElement(
    ScopeContainerContext.Provider,
    {
      value: scopeContainer,
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
      const dependents = mounted.d
      const atomState = store[DEV_GET_ATOM_STATE]?.(atom) || ({} as AtomState)
      return [
        [
          atomToPrintable(atom),
          {
            value: atomState.e || atomState.p || atomState.v,
            dependents: Array.from(dependents).map(atomToPrintable),
          },
        ],
      ]
    })
  )

// We keep a reference to the atoms in Provider's registeredAtoms in dev mode,
// so atoms aren't garbage collected by the WeakMap of mounted atoms
const useDebugState = (scopeContainer: ScopeContainer) => {
  const store = scopeContainer.s
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
