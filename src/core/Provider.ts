import { createElement, useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Atom, Scope } from './atom'
import { createScopeContainer, getScopeContext } from './contexts'
import type { ScopeContainer } from './contexts'
import { COMMIT_ATOM, createStoreForExport } from './store'
import type { VersionObject } from './store'

export const Provider = ({
  children,
  initialValues,
  scope,
  unstable_createStore,
  unstable_enableVersionedWrite,
}: PropsWithChildren<{
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
  scope?: Scope
  /**
   * This is an unstable feature to use exported createStore.
   */
  unstable_createStore?: typeof createStoreForExport
  /**
   * This is an unstable experimental feature for React 18.
   * When this is enabled, a) write function must be pure
   * (read function must be pure regardless of this),
   * b) React will show warning in DEV mode,
   * c) then state branching works.
   */
  unstable_enableVersionedWrite?: boolean
}>) => {
  const [version, setVersion] = useState<VersionObject>({})
  useEffect(() => {
    const scopeContainer = scopeContainerRef.current as ScopeContainer
    if (scopeContainer.w) {
      scopeContainer.s[COMMIT_ATOM](null, version)
      delete version.p
      scopeContainer.v = version
    }
  }, [version])

  const scopeContainerRef = useRef<ScopeContainer>()
  if (!scopeContainerRef.current) {
    // lazy initialization
    const scopeContainer = createScopeContainer(
      initialValues,
      unstable_createStore
    )
    if (unstable_enableVersionedWrite) {
      let retrying = 0
      scopeContainer.w = (write) => {
        setVersion((parentVersion) => {
          const nextVersion = retrying ? parentVersion : { p: parentVersion }
          write(nextVersion)
          return nextVersion
        })
      }
      scopeContainer.v = version
      scopeContainer.r = (fn) => {
        ++retrying
        fn()
        --retrying
      }
    }
    scopeContainerRef.current = scopeContainer
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
